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
              const msg = await this.productsService.updateSingleItem(userId, itemPayload, action.action, 'VOICE', operatorName);
              
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
      const lowStockItems = userItems.filter(p => parseInt(p.quantity || '0', 10) < 20).length;
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
        model: 'gemini-2.5-flash',
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
        console.error("⚠️ Ant X Neural Backup Triggered:", e.message);
        const text = payload.text.toLowerCase();
        data = { success: true, action: 'CHAT', speechText: "Theek hai! Main samajh gayi.", shouldUpdateUI: false };

        // Parse Code and Qty for Stock Updates (prioritize code keyword)
        const codeMatch = text.match(/code\s+(?:number\s+|no\s+)?[:\-]?\s*([0-9a-zA-Z-]+)/i) || text.match(/(?:item|id)\s+(?:number\s+|no\s+)?[:\-]?\s*([0-9a-zA-Z-]+)/i);
        let parsedCode = codeMatch ? codeMatch[1] : null;

        const qtyMatch = text.match(/(?:qty|quantity|kitna|ty|count)\s*(\d+)/i) || text.match(/(\d+)\s*(?:item|piece|unit|pc|quantity|qty)/i);
        let parsedQty = qtyMatch ? parseInt(qtyMatch[1]) : null;
        
        // If no explicit qty match, just find the first number that isn't the code
        if (!parsedQty) {
           const allNumbers = text.match(/\b\d+\b/g);
           if (allNumbers) {
             const nums = allNumbers.filter(n => n !== parsedCode);
             if (nums.length > 0) parsedQty = parseInt(nums[0]);
           }
        }
        
        // Handle Hindi transcription errors for "100" (sau -> sai)
        if (!parsedQty && (text.toLowerCase().includes('sai') || text.toLowerCase().includes('sau'))) {
           parsedQty = 100;
        }

        parsedQty = parsedQty || 1; // Default to 1

        if (text.includes('add') || text.includes('plus') || text.includes('dalo') || text.includes('jama')) {
          data.action = 'IN';
          data.qty = parsedQty;
          if (parsedCode) {
            data.productId = parsedCode;
            data.speechText = `Theek hai! Code ${data.productId} ke ${data.qty} items add kar diye hain. Kuch aur update karna hai?`;
          } else {
            const match = text.match(/add\s+(?:karo\s+)?([a-zA-Z0-9\s]+)/i);
            data.itemName = match ? match[1].trim() : 'unknown';
            data.speechText = `Theek hai! ${data.itemName} ke ${data.qty} items add kar diye hain. Kuch aur update karna hai?`;
          }
          data.shouldUpdateUI = true;
        } else if (text.includes('remove') || text.includes('minus') || text.includes('nikalo') || text.includes('kam')) {
          data.action = 'OUT';
          data.qty = parsedQty;
          if (parsedCode) {
            data.productId = parsedCode;
            data.speechText = `Ok! Code ${data.productId} ke ${data.qty} items kam kar diye hain. Inventory check karu?`;
          } else {
            const match = text.match(/remove\s+(?:karo\s+)?([a-zA-Z0-9\s]+)/i);
            data.itemName = match ? match[1].trim() : 'unknown';
            data.speechText = `Ok! ${data.itemName} ke ${data.qty} items kam kar diye hain. Inventory check karu?`;
          }
          data.shouldUpdateUI = true;
        } else if (text.includes('hi') || text.includes('hello') || text.includes('namaste')) {
          const nameMatch = text.match(/(?:main|naam|hun|am|is)\s+([a-zA-Z]+)/i);
          const name = nameMatch ? nameMatch[1] : '';
          data.speechText = name 
            ? `Namaste ${name} ji! Aapka swagat hai. Main Ant X hoon, aapki smart warehouse assistant. Aaj kya help karu?`
            : "Namaste! Main Ant X hoon. Aapka warehouse engine ekdum ready hai. Aaj kya kaam karein?";
        } else if (text.includes('kaun ho') || text.includes('who are you') || text.includes('tera naam')) {
          data.speechText = "Main Ant X hoon, Inventory Ant ki highly intelligent Neural AI! Main aapka warehouse manage karne mein madad karti hoon. Aapko kya jaanna hai?";
        } else if (text.includes('owner') || text.includes('creator') || text.includes('kisne banaya') || text.includes('malik') || text.includes('deepak')) {
          data.speechText = "Inventory Ant ke malik aur mere creator Deepak Raj hain! Unhone mujhe aapke warehouse ko smart banane ke liye banaya hai. Kya aapko inventory check karni hai?";
        } else if (text.includes('dost') || text.includes('friend')) {
          const nameMatch = text.match(/(?:dost|sahil|friend|is)\s+([a-zA-Z]+)/i);
          const name = nameMatch ? nameMatch[1] : 'Sahil';
          data.speechText = `Hello ${name}! Aapka bhi swagat hai. Aap mere host ke saath warehouse visit kar sakte hain. Kuch jaanna hai?`;
        } else if (text.includes('inventory') || text.includes('stock') || text.includes('maal')) {
          data.action = 'NAVIGATE'; data.page = 'inventory';
          data.speechText = "Theek hai, Inventory page khul gaya hai! Yahan aap pura stock dekh sakte hain aur edit kar sakte hain. Kuch search karna hai?";
        } else if (text.includes('billing') || text.includes('sale') || text.includes('becho') || text.includes('bill')) {
          data.action = 'NAVIGATE'; data.page = 'billing';
          data.speechText = "Billing screen active ho gayi hai! Bas items select kijiye aur checkout dabaiye. POS mode start karein?";
        } else if (text.includes('dashboard') || text.includes('overview') || text.includes('stats') || text.includes('home')) {
          data.action = 'NAVIGATE'; data.page = 'dashboard';
          data.speechText = "Dashboard ready hai! Yahan aapka total stock aur alerts dikh rahe hain. Kya main koi specific stats dikhau?";
        } else if (text.includes('about') || text.includes('tumhare baare mein') || text.includes('mission')) {
          if (text.includes('open') || text.includes('page') || text.includes('kholo')) {
            data.action = 'NAVIGATE'; data.page = 'about';
            data.speechText = "About Us page open kar diya hai! Yahan aap Inventory Ant ki story aur features dekh sakte hain.";
          } else {
            data.speechText = "Inventory Ant ek smart warehouse system hai jo stock tracking, POS billing, aur AI automation handle karta hai. Iska main mission expiry alerts dekar wastage kam karna hai. Aur main, Ant X, aapki neural assistant hoon. Kya main aapko apne owner ke baare mein batau, ya inventory check karein?";
          }
        } else if (text.includes('scanner') || text.includes('scan') || text.includes('lab') || text.includes('ai')) {
          data.action = 'NAVIGATE'; data.page = 'ai_lab';
          data.speechText = "Smart Scanner open kar diya hai! Bill upload kijiye, main saara stock auto-add kar dungi. Ready?";
        } else if (text.includes('about') || text.includes('mission') || text.includes('vision')) {
          data.action = 'NAVIGATE'; data.page = 'about';
          data.speechText = "About Us page khul gaya hai. Yahan hamari team aur mission ke baare mein jaankari hai. Aur kuch jaanna hai?";
        } else if (text.includes('guide') || text.includes('help') || text.includes('madad')) {
          data.action = 'NAVIGATE'; data.page = 'guide';
          data.speechText = "User Guide open ho gayi hai. Ismein app use karne ka pura tareeka hai. Kya main help karu?";
        } else if (text.includes('setting') || text.includes('config')) {
          data.action = 'NAVIGATE'; data.page = 'settings';
          data.speechText = "Settings page active hai. Yahan se aap profile aur inventory settings change kar sakte hain. Kya badalna hai?";
        } else if (text.includes('terminal') || text.includes('ant x') || text.includes('core')) {
          data.action = 'NAVIGATE'; data.page = 'ant_x';
          data.speechText = "Neural Terminal active! Main aapke direct voice commands ke liye ready hoon. Kya help chahiye?";
        } else {
          // Context fallback support in backup regex
          if (session.lastProductName && (text.includes('usmein') || text.includes('iska') || text.includes('ispe') || text.includes('wo'))) {
            data.itemName = session.lastProductName;
            data.productId = session.lastProductId;
          }
          data.speechText = `Theek hai! Aapne "${payload.text}" bola, main samajh gayi. Kya main Inventory page dikhau ya Billing start karein?`;
        }
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
        const msg = await this.productsService.updateSingleItem(userId, itemPayload, data.action, 'VOICE', operatorName);
        
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

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
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
      const responseText = result.response.text().trim();
      console.log(">>> [GEMINI BILL ANALYSIS RESULT]:", responseText);
      const parsed = JSON.parse(responseText);
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
      console.error('⚠️ [GEMINI BILL PARSE FAILED, FALLING BACK TO OCR]:', geminiError.message);
    }

    if (items.length === 0) {
      // ── STEP 1: Tesseract.js OCR (FREE, No API!) ──
      try {
        const { createWorker } = require('tesseract.js');
        const worker = await createWorker('eng');
        const imageBuffer = Buffer.from(payload.base64Image, 'base64');
        const { data } = await worker.recognize(imageBuffer);
        ocrText = data.text || '';
        await worker.terminate();
        console.log(`>>> [OCR] ${ocrText.length} chars extracted`);
        console.log(`>>> [OCR TEXT]:\n${ocrText}`);
      } catch (e: any) {
        console.error('!!! [OCR FAILED]:', e.message);
      }

      // ── STEP 2: Smart Bill Parser (No API needed!) ──
      if (ocrText.length > 10) {
        const SKIP_PATTERNS = [
          /^(billing|receipt|invoice|date|to:|from:|address|phone|total|subtotal|gst|sgst|cgst|tax|amount|rate|item\s*code|item\s*name|qty|quantity|sl\.?\s*no|grand|discount|payment|thank|www\.|@)/i,
          /^\s*[-=*#]+\s*$/,
        ];

        const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 2);

        for (const line of lines) {
          if (SKIP_PATTERNS.some(p => p.test(line))) continue;

          const numbers = [...line.matchAll(/\b(\d+(?:\.\d+)?)\b/g)].map(m => ({ val: parseFloat(m[1]), idx: m.index }));
          
          if (numbers.length === 0) continue;

          let namePart = line.replace(/\b\d+(?:[.,]\d+)?\b/g, '').replace(/[|\\\/]/g, ' ').replace(/\s+/g, ' ').trim();
          namePart = namePart.replace(/[^a-zA-Z0-9 ()]/g, '').trim();

          if (namePart.length < 3) continue;

          if (/^(total|sub|gst|tax|amt|amount|rate|qty|no|sno|sr|sl|item|code|name|rs|inr|date|time|bill|inv)/i.test(namePart)) continue;

          let qty = 1;
          let productId = '';

          if (numbers.length >= 2 && numbers[0].val < 1000 && Number.isInteger(numbers[0].val)) {
            productId = String(Math.round(numbers[0].val));
            for (let i = 1; i < numbers.length; i++) {
              if (numbers[i].val < 1000 && numbers[i].val >= 1 && Number.isInteger(numbers[i].val)) {
                qty = Math.round(numbers[i].val);
                break;
              }
            }
          } else {
            for (const n of numbers) {
              if (n.val >= 1 && n.val < 1000 && Number.isInteger(n.val)) {
                qty = Math.round(n.val);
                break;
              }
            }
          }

          const mrpNum = numbers.find(n => n.val.toString().includes('.') || n.val > 50);
          const mrp = mrpNum ? mrpNum.val.toString() : '0';

          if (namePart.length > 2 && qty > 0) {
            items.push({ productId, name: namePart, qty, mrp });
            console.log(`>>> [PARSED]: code="${productId}" name="${namePart}" qty=${qty}`);
          }
        }

        console.log(`>>> [PARSER] Total ${items.length} items found`);
      }
    }

    if (items.length === 0) {
      return {
        success: false,
        message: ocrText.length < 10 && !process.env.GEMINI_API_KEY
          ? 'Bill image clear nahi hai. Zyada close-up photo lein.'
          : 'Bill se koi product nahi nikla. Bill format check karein.',
        parsedItems: [],
        ocrText
      };
    }

    if (payload.parseOnly) {
      return { success: true, action: payload.actionType, parsedItems: items };
    }

    const log: string[] = [];
    const source = payload.actionType === 'IN' ? 'SCANNER_IN' : 'SCANNER_OUT';
    for (const i of items) {
      if (!i.qty || i.qty < 1) i.qty = 1;
      log.push(await this.productsService.updateSingleItem(userId, i, payload.actionType, source, operatorName));
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

    return { success: true, action: payload.actionType, parsedItems: items, auditLog: log };
  }

  async confirmBillScan(userId: string, payload: any, operatorName = 'Owner'): Promise<any> {
    const { actionType, items } = payload;
    const log: string[] = [];
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
      log.push(await this.productsService.updateSingleItem(userId, mappedItem, actionType, source, operatorName));
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

    return { success: true, action: actionType, parsedItems: items, auditLog: log };
  }
}
