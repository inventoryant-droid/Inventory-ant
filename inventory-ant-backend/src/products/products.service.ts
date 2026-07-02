import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';

export interface Product {
  id: string;
  userId: string;
  productId?: string;
  hsnSac?: string;
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
  hsnSac?: string;
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
  constructor(
    private readonly prisma: PrismaService
  ) {}

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

  public async logInventoryChange(
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
      await this.prisma.inventoryHistory.create({
        data: {
          id,
          userId,
          timestamp: Date.now(),
          productId,
          productName,
          actionType,
          operatorName,
          beforeQty,
          afterQty,
          details
        }
      });
    } catch (err) {
      console.error('Failed to log inventory change:', err);
    }
  }

  async getInventoryHistory(userId: string): Promise<any[]> {
    const cleanUserId = userId.trim().toLowerCase();
    try {
      return await this.prisma.inventoryHistory.findMany({
        where: { userId: cleanUserId },
        orderBy: { timestamp: 'desc' }
      });
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
      const { id, userId: uId, productId, hsnSac, name, details, mrp, costPrice, quantity, _timestamp, _headers, csv_row, ...extra } = item;
      await this.prisma.product.create({
        data: {
          id: this.generateId(i),
          userId: cleanUserId,
          productId: productId ? String(productId) : null,
          hsnSac: hsnSac ? String(hsnSac) : null,
          name: name || null,
          details: details || null,
          mrp: mrp ? String(mrp) : null,
          costPrice: costPrice ? String(costPrice) : null, // keep null if missing, do not default to mrp
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

  public async updateSingleItem(userId: string, item: any, actionType: 'IN' | 'OUT', source?: string, operatorName = 'Owner'): Promise<string> {
    console.log(`🔍 [PROCESS]: "${item.name}" qty=${item.qty} action=${actionType}`);

    if (item.description && !item.details) {
      item.details = item.description;
    }

    const userItems = await this.findAll(userId);

    const sanitizeId = (id: any) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
    const isSerialNumber = (id: string) => /^\d{1,2}$/.test(id);

    const incomingRawId = sanitizeId(item.productId);
    const isIncomingSerial = isSerialNumber(incomingRawId);
    // Never use short serial numbers (1-99) as real SKUs during matching
    const incomingCleanId = isIncomingSerial ? '' : incomingRawId;
    const incomingCleanHsn = sanitizeId(item.hsnSac);

    const billName = (item.name || '').toLowerCase().trim();
    const billDetails = (item.details || '').toLowerCase().trim();
    // Full description = name + details combined (primary matching surface)
    const billFullDesc = billDetails ? `${billName} ${billDetails}` : billName;
    const billWords = billFullDesc.split(/\s+/).filter((w: string) => w.length >= 2);

    let bestIdx = -1;
    let high = 0;

    userItems.forEach((p, i) => {
      const dbCleanId = sanitizeId(p.productId);
      const dbCleanHsn = sanitizeId(p.hsnSac);
      const dbName = (p.name || '').toLowerCase().trim();
      const dbDetails = (p.details || '').toLowerCase().trim();
      const dbFullDesc = dbDetails ? `${dbName} ${dbDetails}` : dbName;
      const dbWords = dbFullDesc.split(/\s+/).filter((w: string) => w.length >= 2);

      // --- Hard exclusion: non-serial SKU present on BOTH sides but they differ → skip ---
      if (incomingCleanId && dbCleanId && !isSerialNumber(dbCleanId) && dbCleanId !== incomingCleanId) {
        return;
      }
      // Hard exclusion: HSN present on BOTH sides but different → skip
      if (incomingCleanHsn && dbCleanHsn && dbCleanHsn !== incomingCleanHsn) {
        return;
      }

      let score = 0;

      // ── Exact full description match (highest priority) ──
      if (dbFullDesc === billFullDesc) {
        score += 50000;
      } else {
        // Word-level Jaccard similarity across the full description
        const overlapWords = dbWords.filter((w: string) => billWords.includes(w));
        const unionWords = Array.from(new Set([...dbWords, ...billWords]));
        const jaccard = unionWords.length > 0 ? overlapWords.length / unionWords.length : 0;

        // Require at least 30% Jaccard overlap to be a candidate
        if (jaccard < 0.3) return;
        score += jaccard * 30000;

        // Bonus: bill name is a substring of db description or vice-versa
        if (dbFullDesc.includes(billName) || billFullDesc.includes(dbName)) {
          score += 8000;
        }
      }

      // Secondary boost: real (non-serial) SKU match
      if (incomingCleanId && dbCleanId && dbCleanId === incomingCleanId) {
        score += 10000;
      }
      // Secondary boost: HSN match
      if (incomingCleanHsn && dbCleanHsn && dbCleanHsn === incomingCleanHsn) {
        score += 3000;
      }

      if (score > high) {
        high = score;
        bestIdx = i;
      }
    });

    // Minimum threshold: must have at least 30% word overlap (score >= 9000)
    if (high < 9000) bestIdx = -1;

    const qty = parseInt(String(item.qty || '1').replace(/,/g, ''), 10) || 1;

    // No ambiguity check needed – we always pick the single best match

    if (bestIdx !== -1) {
      const p = userItems[bestIdx];
      const cur = parseInt(String(p.quantity || '0').replace(/,/g, ''), 10);
      const display = p.productId ? `[${p.productId}] ${p.name}` : p.name;
      console.log(`✅ [MATCH]: "${item.name}" → "${p.name}" score=${high.toFixed(0)}`);
      
      const updateData: any = {};
      // Pricing update rules:
      // - Inbound (IN): update costPrice from item.costPrice or item.mrp (supplier rate). NEVER touch mrp.
      // - Outbound (OUT): update quantity only. Do NOT update mrp or costPrice.
      if (actionType === 'IN') {
        // Prefer explicit costPrice field, otherwise use mrp as the incoming rate (supplier invoice price)
        const incomingRate = item.costPrice && parseFloat(item.costPrice) > 0
          ? item.costPrice.toString()
          : (item.mrp && parseFloat(item.mrp) > 0 ? item.mrp.toString() : null);
        if (incomingRate) {
          updateData.costPrice = incomingRate;
        }
      }
      // For OUT: no pricing update — quantity only
      
      let newQtyStr: string;
      if (actionType === 'IN') {
        newQtyStr = (cur + qty).toString();
      } else {
        newQtyStr = Math.max(0, cur - qty).toString();
      }
      updateData.quantity = newQtyStr;

      // Keep the item details section updated if the DB doesn't have it or has less descriptive text
      if (item.details && (!p.details || p.details.trim().length < item.details.trim().length)) {
        updateData.details = item.details;
      }
      // Update HSN/SAC if database is missing it but scanned item has it
      if (item.hsnSac && !p.hsnSac) {
        updateData.hsnSac = item.hsnSac;
      }

      // Extract dynamic / extra fields
      const extraAttributes = { ...(p.extraAttributes as any || {}) };
      Object.keys(item).forEach(k => {
         if (!['name', 'qty', 'productId', 'hsnSac', 'mrp', 'details'].includes(k) && item[k] !== undefined) {
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
      const isRawSerial = isSerialNumber(incomingRawId);
      const pid = (!isRawSerial && incomingRawId) ? incomingRawId : await this.generateRandomNumericProductId(userId);
      const newQtyStr = actionType === 'IN' ? qty.toString() : '0';
      const extra: any = {};
      Object.keys(item).forEach(k => {
         if (!['name', 'qty', 'productId', 'hsnSac', 'mrp', 'details'].includes(k) && item[k] !== undefined) {
             extra[k] = item[k];
         }
      });

      const newItem = await this.prisma.product.create({
        data: {
          id: this.generateId(),
          userId,
          productId: pid,
          hsnSac: item.hsnSac || null,
          name: item.name || 'Unknown Item',
          details: item.details || null,
          quantity: newQtyStr,
          mrp: item.sellingPrice ? String(item.sellingPrice) : (actionType === 'OUT' && item.mrp ? String(item.mrp) : null),
          costPrice: item.costPrice ? String(item.costPrice) : (actionType === 'IN' && item.mrp ? String(item.mrp) : null),
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

        // Use manualPrice if provided, otherwise fall back to catalog mrp
        const rate = parseFloat(c.manualPrice !== undefined ? c.manualPrice : (product.mrp || '0'));
        subtotal += rate * qtyToSell;

        billedItems.push({
          id: product.id,
          name: product.name || 'Unknown Item',
          mrp: product.mrp || '0',
          salePrice: rate.toString(),
          quantity: qtyToSell
        });
      }
    }

    const hasGst = payload && payload.hasGst !== undefined ? !!payload.hasGst : true;
    const gstRatePct = payload && payload.gstRate !== undefined ? parseFloat(payload.gstRate) : 18;
    const gst = hasGst ? subtotal * (gstRatePct / 100) : 0;
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
      // Strip internal metadata from extraAttributes before spreading
      const { _headers, csv_row, ...rawExtra } = (rest.extraAttributes as any || {});
      // Also strip phantom col_N keys from empty trailing Excel columns
      const safeExtra = Object.fromEntries(
        Object.entries(rawExtra).filter(([k]) => !/^col_\d+$/.test(k))
      );
      return {
        ...rest,
        extraAttributes: safeExtra,
        ...safeExtra
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
    const { _headers, csv_row, ...safeExtra } = (rest.extraAttributes as any || {});
    return {
      ...rest,
      extraAttributes: safeExtra,
      ...safeExtra
    };
  }

  async create(userId: string, data: any): Promise<Product> {
    const { id, userId: uId, productId, hsnSac, name, details, mrp, costPrice, quantity, _timestamp, ...extra } = data;
    const p = await this.prisma.product.create({
      data: {
        id: this.generateId(),
        userId,
        productId: productId ? String(productId) : null,
        hsnSac: hsnSac ? String(hsnSac) : null,
        name: name || null,
        details: details || null,
        mrp: mrp ? String(mrp) : null,
        costPrice: costPrice ? String(costPrice) : null,
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

    const { id: dId, userId: uId, productId, hsnSac, name, details, mrp, costPrice, quantity, _timestamp, ...extra } = data;
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        productId: productId !== undefined ? (productId ? String(productId) : null) : undefined,
        hsnSac: hsnSac !== undefined ? (hsnSac ? String(hsnSac) : null) : undefined,
        name: name !== undefined ? name : undefined,
        details: details !== undefined ? details : undefined,
        mrp: mrp !== undefined ? (mrp ? String(mrp) : null) : undefined,
        costPrice: costPrice !== undefined ? (costPrice ? String(costPrice) : null) : undefined,
        quantity: quantity !== undefined ? (quantity ? String(quantity) : null) : undefined,
        extraAttributes: Object.keys(extra).length > 0 ? { ...(existing.extraAttributes as any || {}), ...extra } : undefined
      }
    });

    const changes: string[] = [];
    if (name !== undefined && name !== existing.name) changes.push(`Name: "${existing.name || ''}" -> "${name}"`);
    if (hsnSac !== undefined && hsnSac !== (existing as any).hsnSac) changes.push(`HSN/SAC: "${(existing as any).hsnSac || ''}" -> "${hsnSac}"`);
    if (details !== undefined && details !== existing.details) changes.push(`Details: "${existing.details || ''}" -> "${details}"`);
    if (mrp !== undefined && mrp !== existing.mrp) changes.push(`Sale Price (MRP): "${existing.mrp || ''}" -> "${mrp}"`);
    if (costPrice !== undefined && costPrice !== (existing as any).costPrice) changes.push(`Cost Price: "${(existing as any).costPrice || ''}" -> "${costPrice}"`);
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

  async removeAll(userId: string, password?: string): Promise<{ message: string }> {
    const cleanUserId = userId.trim().toLowerCase();
    
    const user = await this.prisma.user.findUnique({
      where: { email: cleanUserId }
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    if (!password) {
      throw new BadRequestException('Password is required to delete the catalog');
    }
    
    const passMatch = await bcrypt.compare(password, user.password || '');
    if (!passMatch) {
      throw new UnauthorizedException('Incorrect password. Access denied.');
    }

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
