import { Injectable, NotFoundException } from '@nestjs/common';
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
      const { id, userId: uId, productId, name, details, mrp, costPrice, quantity, _timestamp, _headers, csv_row, ...extra } = item;
      await this.prisma.product.create({
        data: {
          id: this.generateId(i),
          userId: cleanUserId,
          productId: productId ? String(productId) : null,
          name: name || null,
          details: details || null,
          mrp: mrp ? String(mrp) : null,
          costPrice: costPrice ? String(costPrice) : (mrp ? String(mrp) : null), // from CSV: if costPrice col exists use it, else default to mrp
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
      // Inbound scanner: mrp from scan updates costPrice (purchase price), not sale price
      if (item.mrp && parseFloat(item.mrp) > 0) {
        if (actionType === 'IN') {
          updateData.costPrice = item.mrp.toString(); // scanner inbound = cost price update
        } else {
          updateData.mrp = item.mrp.toString(); // outbound/voice: treat as sale price
        }
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
          mrp: null, // sale price — not set yet by scanner
          costPrice: item.mrp ? String(item.mrp) : null, // inbound scanner price = cost price
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
      // Strip internal metadata from extraAttributes before spreading
      const { _headers, csv_row, ...safeExtra } = (rest.extraAttributes as any || {});
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
    const { id, userId: uId, productId, name, details, mrp, costPrice, quantity, _timestamp, ...extra } = data;
    const p = await this.prisma.product.create({
      data: {
        id: this.generateId(),
        userId,
        productId: productId ? String(productId) : null,
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

    const { id: dId, userId: uId, productId, name, details, mrp, costPrice, quantity, _timestamp, ...extra } = data;
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        productId: productId !== undefined ? (productId ? String(productId) : null) : undefined,
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
