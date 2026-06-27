import { Injectable, NotFoundException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../prisma.service';

export interface Product {
  id: string;
  userId: string;
  productId?: string;
  name?: string;
  details?: string;
  mrp?: string;
  paket?: string;
  quantity?: string;
  [key: string]: any;
}

export interface PendingAction {
  action: 'IN' | 'OUT' | 'WIPE' | 'BULK';
  productId?: string;
  itemName?: string;
  qty: number;
  mrp?: string;
  details?: string;
  expiry?: string;
  dynamicData?: any;
  timestamp: number;
}

export interface UserSession {
  lastProductId?: string;
  lastProductName?: string;
  pendingAction?: PendingAction;
}

@Injectable()
export class ProductsService {
  private readonly userSessions = new Map<string, UserSession>();

  constructor(
    private readonly prisma: PrismaService
  ) {}

  private getOrCreateSession(userId: string): UserSession {
    const cleanId = userId.trim().toLowerCase();
    if (!this.userSessions.has(cleanId)) {
      this.userSessions.set(cleanId, {});
    }
    return this.userSessions.get(cleanId)!;
  }

  private generateId(index = 0): string {
    return Math.random().toString(36).substring(2, 10) + 
           Date.now().toString(36) + 
           index.toString(36);
  }

  private async getNextNumericProductId(userId: string): Promise<string> {
    const products = await this.prisma.product.findMany({
      where: { userId }
    });
    let maxId = 0;
    products.forEach(p => {
      const n = parseInt(p.productId || '0', 10);
      if (!isNaN(n) && n > maxId) maxId = n;
    });
    return (maxId + 1).toString();
  }

  private async generateRandomNumericProductId(userId: string): Promise<string> {
    const products = await this.prisma.product.findMany({
      where: { userId }
    });
    const existingIds = new Set(products.map(p => p.productId));
    let randomId = '';
    while (true) {
      randomId = Math.floor(100000 + Math.random() * 900000).toString();
      if (!existingIds.has(randomId)) {
        break;
      }
    }
    return randomId;
  }

  private async logInventoryChange(
    userId: string,
    actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'STOCK_IN' | 'STOCK_OUT' | 'BULK_IMPORT',
    productName: string,
    productId: string | null,
    beforeQty: string | null,
    afterQty: string | null,
    details: string | null,
    operatorName = 'Owner'
  ): Promise<void> {
    try {
      const id = 'HIST-' + Math.random().toString(36).substring(2, 10).toUpperCase() + Date.now().toString(36);
      await (this.prisma as any).$executeRawUnsafe(
        `INSERT INTO "InventoryHistory" (id, "userId", timestamp, "productId", "productName", "actionType", "operatorName", "beforeQty", "afterQty", details) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        id, userId, Date.now(), productId, productName, actionType, operatorName, beforeQty, afterQty, details
      );
    } catch (err) {
      console.error('Failed to log inventory change:', err);
    }
  }

  async getInventoryHistory(userId: string): Promise<any[]> {
    const cleanUserId = userId.trim().toLowerCase();
    try {
      return await (this.prisma as any).$queryRawUnsafe(
        `SELECT * FROM "InventoryHistory" WHERE "userId" = $1 ORDER BY timestamp DESC`,
        cleanUserId
      );
    } catch (err) {
      console.error('Failed to fetch inventory history:', err);
      return [];
    }
  }

  async createBulk(userId: string, items: any[]): Promise<{ count: number }> {
    console.log(`🚀 [BULK START]: Received ${items.length} items for user "${userId}"`);
    const cleanUserId = userId.trim().toLowerCase();
    
    let addedCount = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const { id, userId: uId, productId, name, details, mrp, quantity, _timestamp, ...extra } = item;
      await this.prisma.product.create({
        data: {
          id: this.generateId(i),
          userId: cleanUserId,
          productId: productId ? String(productId) : null,
          name: name || null,
          details: details || null,
          mrp: mrp ? String(mrp) : null,
          quantity: quantity ? String(quantity) : null,
          timestamp: _timestamp || Date.now(),
          extraAttributes: extra
        }
      });
      await this.logInventoryChange(
        cleanUserId,
        'BULK_IMPORT',
        name || 'Unknown Item',
        productId ? String(productId) : null,
        '0',
        quantity ? String(quantity) : '0',
        'Bulk imported via CSV file'
      );
      addedCount++;
    }
    
    console.log(`✅ [BULK SUCCESS]: Saved ${addedCount} items.`);
    return { count: addedCount };
  }

  private async updateSingleItem(userId: string, item: any, actionType: 'IN' | 'OUT', source?: string, operatorName = 'Owner'): Promise<string> {
    console.log(`🔍 [PROCESS]: "${item.name}" qty=${item.qty} action=${actionType}`);

    if (item.description && !item.details) {
      item.details = item.description;
    }

    const userItems = await this.findAll(userId);

    const billName = (item.name || '').toLowerCase();
    const billDetails = (item.details || '').toLowerCase();
    const billWords = `${billName} ${billDetails}`.split(/\s+/).filter(w => w.length >= 2);

    let bestIndices: number[] = [];
    let high = 0;

    const sanitizeId = (id: any) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const incomingCleanId = sanitizeId(item.productId);

    userItems.forEach((p, i) => {
      const dbCleanId = sanitizeId(p.productId);

      // If both have product IDs and they do not match, they cannot be the same product
      if (incomingCleanId && dbCleanId && dbCleanId !== incomingCleanId) {
        return;
      }

      let score = 0;
      
      // Strict Item Code Match
      if (incomingCleanId && dbCleanId === incomingCleanId) {
         score += 10000;
      }
      
      const dbName = (p.name || '').toLowerCase();
      const dbDetails = (p.details || '').toLowerCase();

      // Safely search extra/dynamic attributes instead of using Object.values(p)
      let extraText = '';
      if (p.extraAttributes && typeof p.extraAttributes === 'object') {
        try {
          extraText = Object.values(p.extraAttributes as object)
            .map(v => String(v || ''))
            .join(' ');
        } catch (e) {
          // ignore
        }
      }
      const dbFullText = `${dbName} ${dbDetails} ${extraText}`.toLowerCase();
      
      // If no SKU code is provided, check for precise name and description match
      if (!incomingCleanId) {
        if (dbName === billName && (!billDetails || dbDetails === billDetails)) {
          score += 5000; // Strong match based on name & description
        } else {
          // Name doesn't match exactly, or description differs. Do not match this item!
          return;
        }
      } else {
        // Strict Name Match (only for when SKU is provided or we are doing standard match)
        if (item.name && dbName === billName) score += 100;
        else if (item.name && dbName.includes(billName)) score += 50;

        // Match extra details (like 80 page, 100ml) from the spoken text
        const matchWords = billWords.filter(w => dbFullText.includes(w));
        if (billWords.length > 0) score += (matchWords.length / billWords.length) * 80;
      }

      if (score > 0) {
        if (score > high) {
          high = score;
          bestIndices = [i];
        } else if (score === high && score < 10000) {
          bestIndices.push(i);
        }
      }
    });

    if (high < 30) bestIndices = [];

    const qty = parseInt(item.qty, 10) || 1;

    // AMBIGUITY CHECK
    if (bestIndices.length > 1) {
       console.log(`⚠️ [AMBIGUOUS]: Found ${bestIndices.length} items for "${item.name}"`);
       return `Maaf kijiye, mujhe "${item.name}" ke ${bestIndices.length} alag items mile hain. Kripya iska Item Code batayein ya details dein taaki main sahi item select kar saku.`;
    }

    let bestIdx = bestIndices.length === 1 ? bestIndices[0] : -1;

    if (bestIdx !== -1) {
      const p = userItems[bestIdx];
      const cur = parseInt(p.quantity || '0', 10);
      const display = p.productId ? `[${p.productId}] ${p.name}` : p.name;
      console.log(`✅ [MATCH]: "${item.name}" → "${p.name}" score=${high.toFixed(0)}`);
      
      const updateData: any = {};
      if (item.mrp && parseFloat(item.mrp) > 0) {
        updateData.mrp = item.mrp.toString();
      }
      
      let newQtyStr: string;
      if (actionType === 'IN') {
        newQtyStr = (cur + qty).toString();
      } else {
        newQtyStr = Math.max(0, cur - qty).toString();
      }
      updateData.quantity = newQtyStr;

      // Extract dynamic / extra fields
      const extraAttributes = { ...(p.extraAttributes as any || {}) };
      Object.keys(item).forEach(k => {
         if (!['name', 'qty', 'productId', 'mrp'].includes(k) && item[k] !== undefined) {
             extraAttributes[k] = item[k];
         }
      });
      updateData.extraAttributes = extraAttributes;

      await this.prisma.product.update({
        where: { id: p.id },
        data: updateData
      });

      let detailsStr = '';
      if (source === 'SCANNER_IN') {
        detailsStr = `Stock added via Inbound Scanner`;
      } else if (source === 'SCANNER_OUT') {
        detailsStr = `Stock deducted via Outbound Scanner`;
      } else if (source === 'VOICE') {
        detailsStr = `Stock ${actionType === 'IN' ? 'added' : 'deducted'} via Voice Command`;
      } else if (source === 'BILLING') {
        detailsStr = `Stock sold via Sales Terminal`;
      } else {
        detailsStr = `Stock ${actionType === 'IN' ? 'added' : 'deducted'} via Smart Scanner / Voice Command`;
      }

      await this.logInventoryChange(
        userId,
        actionType === 'IN' ? 'STOCK_IN' : 'STOCK_OUT',
        p.name || 'Unknown Item',
        p.productId || null,
        cur.toString(),
        newQtyStr,
        detailsStr,
        operatorName
      );

      return `SUCCESS: ${display} ${actionType === 'IN' ? '+' : '-'}${qty} (Total: ${newQtyStr})`;
    } else {
      console.log(`❌ [NO_MATCH]: "${item.name}"`);
      const pid = incomingCleanId || item.productId || await this.generateRandomNumericProductId(userId);
      const newQtyStr = actionType === 'IN' ? qty.toString() : '0';
       const extra: any = {};
      Object.keys(item).forEach(k => {
         if (!['name', 'qty', 'productId', 'mrp', 'details'].includes(k) && item[k] !== undefined) {
             extra[k] = item[k];
         }
      });

      const newItem = await this.prisma.product.create({
        data: {
          id: this.generateId(),
          userId,
          productId: pid,
          name: item.name || 'Unknown Item',
          details: item.details || null,
          quantity: newQtyStr,
          mrp: item.mrp ? String(item.mrp) : '0',
          timestamp: Date.now(),
          extraAttributes: extra
        }
      });

      let detailsStr = '';
      if (source === 'SCANNER_IN') {
        detailsStr = `New item registered and stock initialized via Inbound Scanner`;
      } else if (source === 'SCANNER_OUT') {
        detailsStr = `New item registered and stock initialized via Outbound Scanner`;
      } else if (source === 'VOICE') {
        detailsStr = `New item registered and stock initialized via Voice Command`;
      } else {
        detailsStr = `New item registered and stock initialized via Smart Scanner / Voice Command`;
      }

      await this.logInventoryChange(
        userId,
        'CREATE',
        newItem.name || 'Unknown Item',
        newItem.productId,
        '0',
        newQtyStr,
        detailsStr,
        operatorName
      );

      if (actionType === 'IN') {
        return `NEW: ${newItem.name} (qty: ${qty})`;
      } else {
        return `NEW_OUTBOUND: ${newItem.name} (qty deducted below 0, recorded as 0)`;
      }
    }
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
      const userItems = await this.findAll(userId);
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
              const msg = await this.updateSingleItem(userId, itemPayload, action.action, 'VOICE', operatorName);
              
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
              await this.removeAll(userId);
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
      } catch (e) {
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
        const msg = await this.updateSingleItem(userId, itemPayload, data.action, 'VOICE', operatorName);
        
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
      
      For each item, extract:
      1. productId: Extract ONLY the alphanumeric code. If it says "CODE: 14", extract ONLY "14". Strip all prefixes.
      2. name: The core product name.
      3. details: Any product description, attributes like size, color, weight, page count, or packaging details. If there is a separate description column in the invoice, extract its value into details.
      4. qty: The exact quantity count.
      5. mrp: The unit price or rate per item (without currency symbols).

      Return JSON ONLY as a list of objects:
      [
        { "productId": "14", "name": "...", "details": "...", "qty": 100, "mrp": "105" }
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

    const log: string[] = [];
    const source = payload.actionType === 'IN' ? 'SCANNER_IN' : 'SCANNER_OUT';
    for (const i of items) {
      if (!i.qty || i.qty < 1) i.qty = 1;
      log.push(await this.updateSingleItem(userId, i, payload.actionType, source, operatorName));
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

  async sellProducts(userId: string, payload: any, operatorName = 'Owner'): Promise<any> {
    let cart: any[] = [];
    let buyerName = '';
    let buyerPhone = '';
    let buyerAddress = '';

    if (Array.isArray(payload)) {
      cart = payload;
    } else if (payload && Array.isArray(payload.cart)) {
      cart = payload.cart;
      buyerName = payload.buyerName || '';
      buyerPhone = payload.buyerPhone || '';
      buyerAddress = payload.buyerAddress || '';
    }

    const billedItems: any[] = [];
    let subtotal = 0;
    const billId = 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    for (const c of cart) {
      const product = await this.prisma.product.findFirst({
        where: { userId, id: c.id }
      });
      if (product) {
        const qtyToSell = parseInt(c.quantity, 10) || 1;
        const cur = parseInt(product.quantity || '0', 10);
        const newQtyStr = Math.max(0, cur - qtyToSell).toString();

        await this.prisma.product.update({
          where: { id: product.id },
          data: { quantity: newQtyStr }
        });

        await this.logInventoryChange(
          userId,
          'STOCK_OUT',
          product.name || 'Unknown Item',
          product.productId,
          cur.toString(),
          newQtyStr,
          `Stock sold via Sales Terminal (Billing ID: ${billId})`,
          operatorName
        );

        const rate = parseFloat(product.mrp || '0');
        subtotal += rate * qtyToSell;

        billedItems.push({
          id: product.id,
          name: product.name || 'Unknown Item',
          mrp: product.mrp || '0',
          quantity: qtyToSell
        });
      }
    }

    const hasGst = payload && payload.hasGst !== undefined ? !!payload.hasGst : true;
    const gstRate = 0.18;
    const gst = hasGst ? subtotal * gstRate : 0;
    const total = subtotal + gst;

    const newBill = await this.prisma.bill.create({
      data: {
        id: billId,
        userId,
        date: Date.now(),
        items: billedItems,
        subtotal,
        gst,
        total,
        buyerName,
        buyerPhone,
        buyerAddress,
        hasGst,
        hasBuyerInfo: !!(buyerName || buyerPhone || buyerAddress),
        operatorName
      }
    });

    return { success: true, bill: newBill };
  }

  async getBills(userId: string): Promise<any[]> {
    const cleanUserId = userId.trim().toLowerCase();
    return this.prisma.bill.findMany({
      where: { userId: cleanUserId },
      orderBy: { date: 'desc' }
    });
  }

  async findAll(userId: string): Promise<Product[]> {
    const cleanUserId = userId.trim().toLowerCase();
    const list = await this.prisma.product.findMany({
      where: { userId: cleanUserId }
    });
    return list.map(p => {
      const { paket, ...rest } = p as any;
      return {
        ...rest,
        ...(rest.extraAttributes as any || {})
      };
    });
  }

  async findOne(userId: string, id: string): Promise<Product> {
    const cleanUserId = userId.trim().toLowerCase();
    const p = await this.prisma.product.findFirst({
      where: { userId: cleanUserId, id }
    });
    if (!p) throw new NotFoundException();
    const { paket, ...rest } = p as any;
    return {
      ...rest,
      ...(rest.extraAttributes as any || {})
    };
  }

  async create(userId: string, data: any): Promise<Product> {
    const { id, userId: uId, productId, name, details, mrp, quantity, _timestamp, ...extra } = data;
    const p = await this.prisma.product.create({
      data: {
        id: this.generateId(),
        userId,
        productId: productId ? String(productId) : null,
        name: name || null,
        details: details || null,
        mrp: mrp ? String(mrp) : null,
        quantity: quantity ? String(quantity) : null,
        timestamp: Date.now(),
        extraAttributes: extra
      }
    });

    await this.logInventoryChange(
      userId,
      'CREATE',
      p.name || 'Unknown Item',
      p.productId,
      '0',
      p.quantity || '0',
      'Manual registration via Quick Register'
    );

    const { paket, ...rest } = p as any;
    return {
      ...rest,
      ...(rest.extraAttributes as any || {})
    };
  }

  async update(userId: string, id: string, data: any): Promise<Product> {
    const existing = await this.prisma.product.findFirst({
      where: { id, userId }
    });
    if (!existing) throw new NotFoundException();

    const { id: dId, userId: uId, productId, name, details, mrp, quantity, _timestamp, ...extra } = data;
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        productId: productId !== undefined ? (productId ? String(productId) : null) : undefined,
        name: name !== undefined ? name : undefined,
        details: details !== undefined ? details : undefined,
        mrp: mrp !== undefined ? (mrp ? String(mrp) : null) : undefined,
        quantity: quantity !== undefined ? (quantity ? String(quantity) : null) : undefined,
        extraAttributes: Object.keys(extra).length > 0 ? { ...(existing.extraAttributes as any || {}), ...extra } : undefined
      }
    });

    const changes: string[] = [];
    if (name !== undefined && name !== existing.name) changes.push(`Name: "${existing.name || ''}" -> "${name}"`);
    if (details !== undefined && details !== existing.details) changes.push(`Details: "${existing.details || ''}" -> "${details}"`);
    if (mrp !== undefined && mrp !== existing.mrp) changes.push(`MRP: "${existing.mrp || ''}" -> "${mrp}"`);
    if (quantity !== undefined && quantity !== existing.quantity) changes.push(`Stock: "${existing.quantity || '0'}" -> "${quantity}"`);
    
    const detailsStr = changes.length > 0 ? changes.join(', ') : 'Manual update details';

    await this.logInventoryChange(
      userId,
      'UPDATE',
      updated.name || 'Unknown Item',
      updated.productId,
      existing.quantity || '0',
      updated.quantity || '0',
      detailsStr
    );

    const { paket, ...rest } = updated as any;
    return {
      ...rest,
      ...(rest.extraAttributes as any || {})
    };
  }

  async remove(userId: string, id: string): Promise<{ message: string }> {
    const existing = await this.prisma.product.findFirst({
      where: { id, userId }
    });
    if (!existing) throw new NotFoundException();

    await this.prisma.product.delete({
      where: { id }
    });

    await this.logInventoryChange(
      userId,
      'DELETE',
      existing.name || 'Unknown Item',
      existing.productId,
      existing.quantity || '0',
      '0',
      `Manual delete (deleted item with stock ${existing.quantity || '0'})`
    );

    return { message: 'Deleted' };
  }

  async removeAll(userId: string): Promise<{ message: string }> {
    const cleanUserId = userId.trim().toLowerCase();
    await this.prisma.product.deleteMany({
      where: { userId: cleanUserId }
    });
    return { message: 'Wiped' };
  }

  async processBillMock(userId: string, payload: any): Promise<any> {
    return { success: true, parsedItems: [] };
  }

  async getScanHistory(userId: string): Promise<any[]> {
    const cleanUserId = userId.trim().toLowerCase();
    return this.prisma.scanHistory.findMany({
      where: { userId: cleanUserId },
      orderBy: { timestamp: 'desc' }
    });
  }
}
