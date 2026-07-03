import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../prisma.service';
import { ProductsService, Product, PendingAction, UserSession } from './products.service';

@Injectable()
export class AiService {
  private readonly userSessions = new Map<string, UserSession>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService
  ) {}

  private getOrCreateSession(userId: string): UserSession {
    const cleanId = userId.trim().toLowerCase();
    if (!this.userSessions.has(cleanId)) {
      this.userSessions.set(cleanId, {});
    }
    return this.userSessions.get(cleanId)!;
  }

  async getGoogleTTS(text: string, res: any): Promise<void> {
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=hi&client=tw-ob`;
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(Buffer.from(await response.arrayBuffer()));
    } catch (e) {
      res.status(500).send('TTS Fail');
    }
  }

  async processAgentCommandV2(
    userId: string, 
    payload: { text: string; currentView?: string; role?: string; wakeWordActive?: boolean },
    operatorName = 'Owner'
  ): Promise<any> {
    try {
      const userItems = await this.productsService.findAll(userId);
      const session = this.getOrCreateSession(userId);
      const cleanText = payload.text.trim().toLowerCase();

      // --- 1. CONFIRMATION LAYER CHECK ---
      if (session.pendingAction) {
        const now = Date.now();
        if (now - session.pendingAction.timestamp > 30000) {
          session.pendingAction = undefined; // Session expired
        } else {
          const isConfirm = ['yes', 'yeah', 'yep', 'haan', 'sahi hai', 'confirm', 'karo', 'kar do', 'ha', 'add karo', 'kar'].some(word => cleanText.includes(word));
          const isCancel = ['no', 'na', 'nope', 'cancel', 'galat hai', 'rook', 'roko', 'mat karo', 'na karo'].some(word => cleanText.includes(word));

          if (isConfirm) {
            const action = session.pendingAction;
            session.pendingAction = undefined; // clear it

            if (action.action === 'IN' || action.action === 'OUT') {
              const itemPayload = { 
                name: action.itemName, 
                details: action.details, 
                qty: action.qty, 
                productId: action.productId, 
                expiry: action.expiry, 
                ...(action.dynamicData || {}) 
              };
              const updateRes = await this.productsService.updateSingleItem(userId, itemPayload, action.action, 'VOICE', operatorName);
              const msg = updateRes.message;
              
              // Resolve matching item for context sync
              let matchedP = userItems.find(p => p.productId === action.productId);
              if (!matchedP && action.itemName) {
                matchedP = userItems.find(p => (p.name || '').toLowerCase().includes(action.itemName!.toLowerCase()));
              }
              if (matchedP) {
                session.lastProductId = matchedP.productId;
                session.lastProductName = matchedP.name;
              }

              return {
                success: true,
                speechText: `Haan, confirm kar diya! ${msg}`,
                shouldUpdateUI: true
              };
            } else if (action.action === 'WIPE') {
              await this.productsService.removeAll(userId);
              return {
                success: true,
                speechText: "Theek hai, aapka saara data delete kar diya hai.",
                shouldUpdateUI: true
              };
            }
          } else if (isCancel) {
            session.pendingAction = undefined; // clear it
            return {
              success: true,
              speechText: "Theek hai, cancel kar diya. Aur kya karna hai?",
              shouldUpdateUI: false
            };
          } else {
            return {
              success: true,
              speechText: "Kripya pehle confirm karein. Kya main ye action complete karu? Haan ya Na bolein.",
              shouldUpdateUI: false
            };
          }
        }
      }

      // --- 2. REGULAR INBOUND / OUTBOUND PROCESSING ---
      const dynamicKeys = userItems.length > 0 
          ? Array.from(new Set(userItems.flatMap(p => Object.keys(p)))).filter(k => !['id', 'userId', 'quantity', 'mrp', 'productId', 'name', 'details', 'extraAttributes'].includes(k))
          : [];
      const totalItems = userItems.length;
      const dbUser = await this.prisma.user.findUnique({
        where: { email: userId.trim().toLowerCase() }
      });
      const lowStockThreshold = dbUser?.lowStockThreshold ?? 20;
      const lowStockItems = userItems.filter(p => {
        const cleanQty = String(p.quantity || '0').replace(/,/g, '');
        const q = parseInt(cleanQty, 10);
        return !isNaN(q) && q > 0 && q <= lowStockThreshold;
      }).length;
      const expKey = dynamicKeys.find(k => k.toLowerCase().includes('exp'));
      let expiredCount = 0;
      let soonCount = 0;
      if (expKey) {
        const now = new Date();
        userItems.forEach(p => {
          const val = p[expKey];
          if (val) {
            const d = new Date(String(val).replace(/\./g, '-')); 
            if (!isNaN(d.getTime())) {
              if (d < now) expiredCount++;
              else if (d <= new Date(now.getTime() + 30*24*60*60*1000)) soonCount++;
            }
          }
        });
      }

      // Context resolution for Gemini
      const lastProductContext = session.lastProductId 
        ? `Last referenced item is Code: "${session.lastProductId}", Name: "${session.lastProductName}"`
        : "None";

      // Role resolution
      const roleStr = (payload.role || 'operator').toLowerCase() === 'manager'
        ? 'You are speaking to a Manager. Your tone should be polite, professional, and you should provide detailed stats, recommendations, and expirations.'
        : 'You are speaking to an Operator/Loader. Keep your responses extremely short, snappy, fast-paced, and focus on direct confirmations (e.g. "notebook add ho gaya. Next?").';

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ 
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' }
      });
      const prompt = `
      You are ANT X, the highly intelligent and proactive Neural AI of "Inventory Ant".
      Personality: Extremely helpful, "cool" warehouse buddy, modern, and proactive.
      Language: Natural Hinglish (Mix of Hindi & English, like a WhatsApp chat). 
      NO "Shuddh Hindi". NO symbols like * or #.
      CRITICAL: NEVER use the word "Boss". Address the user directly or as "Sir/Ma'am" if needed, but "Boss" is strictly forbidden.
 
      TONE & ROLE INSTRUCTIONS:
      ${roleStr}
 
      CRITICAL RULE:
      1. ALWAYS end every response with a follow-up question to keep the conversation alive. 
      2. If you navigate to a page, describe what the user can do on that page.
      3. Be proactive: Suggest the next logical step.
 
      CONTEXT MEMORY:
      ${lastProductContext}
      Note: If the user says "usmein", "iska", "ispe", or does not mention the product name/code but implies the last referenced item, please assume they are referring to this item and fill the "itemName" or "productId" accordingly.
 
      APP KNOWLEDGE & PAGES:
      - dashboard: Stats, Low Stock alerts.
      - inventory: Product table.
      - billing: POS screen.
      - ai_lab: Scanner / AI Tools.
      - settings: CSV / Account.
      - ant_x: AI Terminal.
      - guide: Help.
      - about: About Us page, Mission, and Vision.
 
      CONTEXT:
      - Page: "${payload.currentView || 'dashboard'}"
      - Stats: Total ${totalItems}, Low Stock ${lowStockItems}, Expired Items ${expiredCount}, Soon to Expire ${soonCount}.
 
      USER: "${payload.text}"
 
      Return JSON ONLY:
      {
        "speechText": "Natural Hinglish reply + proactive question",
        "action": "NAVIGATE|CHAT|IN|OUT|QUERY|LOGIN|WIPE",
        "page": "slug",
        "itemName": "string (Product name if user mentions it)",
        "productId": "string (Product Code or ID ONLY IF user specifically provides it, else null)",
        "qty": number,
        "shouldUpdateUI": boolean
      }`;

      let data: any;
      try {
        const res = await model.generateContent(prompt);
        const raw = (await res.response).text().trim();
        data = JSON.parse(raw);
      } catch (e: any) {
        console.error("⚠️ Gemini API Command Error:", e.message);
        return {
          success: false,
          message: `Gemini API Error: ${e.message || 'Unknown Gemini Error'}`
        };
      }

      // --- 3. EXCEPTION & CONFIRMATION STAGING INTERCEPTION ---
      if (data.action === 'WIPE' || (cleanText.includes('clear') && cleanText.includes('data')) || (cleanText.includes('delete') && cleanText.includes('all'))) {
        session.pendingAction = {
          action: 'WIPE',
          qty: 0,
          timestamp: Date.now()
        };
        return {
          success: true,
          speechText: "Aapke is command se account ka saara data clear ho jayega. Kya aap sach mein data clear karna chahte hain? Haan ya Na bolein.",
          shouldUpdateUI: false
        };
      }

      // Resolve matching product to verify stock / context
      let matchingProduct: Product | undefined;
      const searchName = (data.itemName || '').toLowerCase();
      const searchCode = data.productId;
      if (searchCode) {
        matchingProduct = userItems.find(p => p.productId === searchCode);
      }
      if (!matchingProduct && searchName) {
        matchingProduct = userItems.find(p => (p.name || '').toLowerCase().includes(searchName));
      }

      // Update context memory
      if (matchingProduct) {
        session.lastProductId = matchingProduct.productId;
        session.lastProductName = matchingProduct.name;
      }

      // Exception Intelligence: OUT quantity exceeds stock
      if (matchingProduct && data.action === 'OUT') {
        const currentStock = parseInt(matchingProduct.quantity || '0', 10);
        if (currentStock < data.qty) {
          session.pendingAction = {
            action: 'OUT',
            productId: matchingProduct.productId,
            itemName: matchingProduct.name,
            qty: currentStock, // stage to zero
            timestamp: Date.now()
          };
          return {
            success: true,
            speechText: `Aapke paas ${matchingProduct.name} ke sirf ${currentStock} pieces hain. Kya main stock ko zero kar doon? Haan ya Na bolein.`,
            shouldUpdateUI: false
          };
        }
      }

      // Confirmation Layer: High quantity threshold (> 50)
      if ((data.action === 'IN' || data.action === 'OUT') && data.qty > 50) {
        session.pendingAction = {
          action: data.action,
          productId: data.productId || (matchingProduct ? matchingProduct.productId : undefined),
          itemName: data.itemName || (matchingProduct ? matchingProduct.name : undefined),
          qty: data.qty,
          details: data.details,
          dynamicData: data.dynamicData,
          expiry: data.expiry,
          timestamp: Date.now()
        };
        return {
          success: true,
          speechText: `Aap ${data.qty} units ${data.itemName || data.productId || 'item'} ke ${data.action === 'IN' ? 'add' : 'minus'} karne ja rahe hain. Kya aap isse confirm karte hain? Haan ya Na bolein.`,
          shouldUpdateUI: false
        };
      }

      // --- 4. STANDARD ACTION DISPATCH ---
      if (data.action === 'CHAT') {
        return { success: true, speechText: data.speechText, shouldUpdateUI: false };
      }

      if (data.action === 'LOGIN' && data.loginId) {
        return { success: true, action: 'LOGIN', loginId: data.loginId, speechText: data.speechText || `Logging in as ${data.loginId}...`, shouldUpdateUI: false };
      }

      if (data.action === 'IN' || data.action === 'OUT') {
        const itemPayload = { name: data.itemName, details: data.details, qty: data.qty, productId: data.productId, expiry: data.expiry, ...(data.dynamicData || {}) };
        const updateRes = await this.productsService.updateSingleItem(userId, itemPayload, data.action, 'VOICE', operatorName);
        const msg = updateRes.message;
        
        let finalSpeech = data.speechText;
        if (msg.startsWith('Maaf kijiye') || msg.startsWith('NOT_FOUND')) {
           finalSpeech = msg; // Overwrite with error if ambiguous or not found (outbound)
        } else if (finalSpeech) {
           finalSpeech = finalSpeech + "\n\n📊 **System Update:** " + msg;
        } else {
           finalSpeech = msg; // Fallback if AI didn't generate text
        }
        
        return { success: true, speechText: finalSpeech, shouldUpdateUI: true };
      }

      if (data.action === 'NAVIGATE' && data.page) {
        return { success: true, action: 'NAVIGATE', page: data.page, speechText: data.speechText || `Opening ${data.page} page...`, shouldUpdateUI: false };
      }

      if (data.action === 'QUERY' && data.itemName) {
        const search = data.itemName.toLowerCase();
        const found = userItems.find(p => 
          (p.name || '').toLowerCase().includes(search) || 
          (p.productId && p.productId.toLowerCase() === search)
        );
        if (found) {
          const qty = found.quantity || 0;
          const price = found.mrp || 0;
          const details = found.details || '';
          const reply = `Mila! ${found.name} ka current stock ${qty} hai aur MRP ₹${price} hai. ${details ? 'Details: ' + details : ''}`;
          return { success: true, speechText: reply, shouldUpdateUI: false };
        } else {
          return { success: true, speechText: `Maaf kijiye, mujhe "${data.itemName}" naam ka koi item nahi mila.`, shouldUpdateUI: false };
        }
      }

      return { success: true, speechText: data.speechText, shouldUpdateUI: false };
    } catch (e: any) {
      console.error('Agent V2 Full Error:', e);
      return { success: false, message: 'Gemini AI Error: ' + (e.message || 'Unknown Error') };
    }
  }

  async processBillWithGemini(userId: string, payload: any, operatorName = 'Owner'): Promise<any> {
    let items: any[] = [];
    let ocrText = '';
    let rawResponse = '';

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ 
        model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
        generationConfig: { responseMimeType: 'application/json' }
      });
      const prompt = `
      You are an expert invoice/receipt parser. Analyze this invoice/receipt image.
      CRITICAL INSTRUCTIONS:
      - ONLY extract actual product items from the main table rows.
      - DO NOT extract table headers (like "STOCK CODE", "ITEM DESCRIPTION").
      - DO NOT extract subtotal, tax, or total lines.
      - Each unique product variant (different color, size, type) MUST be a separate item.
      
      For each item, extract:
      1. productId: Extract ONLY the alphanumeric code/SKU from a dedicated code column. If the only numbers visible are row serial numbers (1, 2, 3...), set productId to empty string "". Strip all prefixes.
      2. hsnSac: Extract HSN or SAC code (usually a 4 to 8 digit number column, e.g. "96081019"). If not present, return "".
      3. name: The FULL product description including the base name AND all variant details (color, size, type, packaging). 
         Example: if the bill says "Hauser Xo Ballpen" with detail "10pcs Card -Blue", the name should be "Hauser Xo Ballpen 10pcs Card -Blue".
         Combine all description fields into one complete name.
      4. details: Any additional product attributes not captured in name (leave empty if already merged into name).
      5. qty: The exact shipped/billed quantity count (look for "Shipped", "Billed", or "Quantity" column).
      6. mrp: The unit price or rate per item (without currency symbols).

      Return JSON ONLY as a list of objects:
      [
        { "productId": "", "hsnSac": "96081019", "name": "Hauser Xo Ballpen 10pcs Card -Blue", "details": "", "qty": 600, "mrp": "5.60" }
      ]
      Do not wrap in backticks or markdown formatting.
      `;
      
      const imagePart = {
        inlineData: {
          data: payload.base64Image,
          mimeType: payload.fileType || 'image/jpeg'
        }
      };
      
      const result = await model.generateContent([prompt, imagePart]);
      rawResponse = result.response.text().trim();
      console.log(">>> [GEMINI BILL ANALYSIS RESULT]:", rawResponse);
      const parsed = JSON.parse(rawResponse);
      if (Array.isArray(parsed)) {
        items = parsed.map(item => ({
          productId: item.productId ? String(item.productId) : '',
          hsnSac: item.hsnSac ? String(item.hsnSac) : '',
          name: item.name || 'Unknown Item',
          details: item.details || item.description || '',
          qty: Math.max(1, parseInt(item.qty, 10) || 1),
          mrp: item.mrp ? String(item.mrp) : '0'
        }));
      }
    } catch (geminiError: any) {
      console.error('⚠️ [GEMINI BILL PARSE FAILED]:', geminiError.message);
      return {
        success: false,
        message: `Gemini API Error: ${geminiError.message || 'Unknown Error'}${rawResponse ? `. Raw Response: ${rawResponse}` : ''}`,
        parsedItems: [],
        ocrText: ''
      };
    }

    if (items.length === 0) {
      return {
        success: false,
        message: `Gemini did not find any products in this bill. Raw Response: ${rawResponse || 'No response'}`,
        parsedItems: [],
        ocrText: ''
      };
    }


    if (payload.parseOnly) {
      return { success: true, action: payload.actionType, parsedItems: items };
    }

    const log: string[] = [];
    const syncResults: any[] = [];
    const source = payload.actionType === 'IN' ? 'SCANNER_IN' : 'SCANNER_OUT';
    for (const i of items) {
      if (!i.qty || i.qty < 1) i.qty = 1;
      const updateRes = await this.productsService.updateSingleItem(userId, i, payload.actionType, source, operatorName);
      log.push(updateRes.message);
      syncResults.push(updateRes);
    }

    // Save scan to ScanHistory in database
    try {
      await this.prisma.scanHistory.create({
        data: {
          id: 'SCAN-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
          userId,
          timestamp: Date.now(),
          actionType: payload.actionType,
          operatorName,
          items: items.map(it => ({
            productId: it.productId || '',
            name: it.name || 'Unknown Item',
            qty: it.qty,
            mrp: it.mrp || '0'
          })),
          auditLog: log
        }
      });
    } catch (err) {
      console.error('Failed to write scan history:', err);
    }

    return { success: true, action: payload.actionType, parsedItems: items, auditLog: log, syncResults };
  }

  async confirmBillScan(userId: string, payload: any, operatorName = 'Owner'): Promise<any> {
    const { actionType, items } = payload;
    const log: string[] = [];
    const syncResults: any[] = [];
    const source = actionType === 'IN' ? 'SCANNER_IN' : 'SCANNER_OUT';

    for (const i of items) {
      const mappedItem = {
        productId: i.productId || '',
        hsnSac: i.hsnSac || '',
        name: i.name || 'Unknown Item',
        details: i.details || '',
        qty: Math.max(1, parseInt(i.qty, 10) || 1),
        mrp: i.mrp ? String(i.mrp) : '0'
      };
      const updateRes = await this.productsService.updateSingleItem(userId, mappedItem, actionType, source, operatorName);
      log.push(updateRes.message);
      syncResults.push(updateRes);
    }

    try {
      await this.prisma.scanHistory.create({
        data: {
          id: 'SCAN-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
          userId,
          timestamp: Date.now(),
          actionType: actionType,
          operatorName,
          items: items.map((it: any) => ({
            productId: it.productId || '',
            name: it.name || 'Unknown Item',
            qty: Math.max(1, parseInt(it.qty, 10) || 1),
            mrp: it.mrp || '0'
          })),
          auditLog: log
        }
      });
    } catch (err) {
      console.error('Failed to write scan history:', err);
    }

    return { success: true, action: actionType, parsedItems: items, auditLog: log, syncResults };
  }
}
