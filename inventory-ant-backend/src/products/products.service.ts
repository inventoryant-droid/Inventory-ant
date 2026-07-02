import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';
import PDFDocument from 'pdfkit';

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
      const cleanQuantity = quantity ? String(quantity).replace(/,/g, '').trim() : null;
      const cleanMrp = mrp ? String(mrp).replace(/,/g, '').trim() : null;
      const cleanCostPrice = costPrice ? String(costPrice).replace(/,/g, '').trim() : null;

      await this.prisma.product.create({
        data: {
          id: this.generateId(i),
          userId: cleanUserId,
          productId: productId ? String(productId) : null,
          hsnSac: hsnSac ? String(hsnSac) : null,
          name: name || null,
          details: details || null,
          mrp: cleanMrp,
          costPrice: cleanCostPrice, // keep null if missing, do not default to mrp
          quantity: cleanQuantity,
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
        cleanQuantity || '0',
        'Bulk imported via CSV file'
      );
      addedCount++;
    }
    
    console.log(`✅ [BULK SUCCESS]: Saved ${addedCount} items.`);
    return { count: addedCount };
  }

  public async updateSingleItem(userId: string, item: any, actionType: 'IN' | 'OUT', source?: string, operatorName = 'Owner'): Promise<any> {
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

      return {
        status: 'SUCCESS',
        productId: p.productId || '',
        name: p.name || '',
        qty,
        newQty: newQtyStr,
        csvRow: (p.extraAttributes as any)?.csv_row || null,
        message: `SUCCESS: ${display} ${actionType === 'IN' ? '+' : '-'}${qty} (Total: ${newQtyStr})`
      };
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
        return {
          status: 'NEW',
          productId: newItem.productId || '',
          name: newItem.name || '',
          qty,
          newQty: newQtyStr,
          csvRow: null,
          message: `NEW: ${newItem.name} (qty: ${qty})`
        };
      } else {
        return {
          status: 'NEW_OUTBOUND',
          productId: newItem.productId || '',
          name: newItem.name || '',
          qty,
          newQty: newQtyStr,
          csvRow: null,
          message: `NEW_OUTBOUND: ${newItem.name} (qty deducted below 0, recorded as 0)`
        };
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
    const cleanUserId = userId.trim().toLowerCase();
    const billId = 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    const now = new Date();
    const yyyy = now.getFullYear().toString();
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    const yyyymmdd = `${yyyy}${mm}${dd}`;

    // Generate Order ID sequence: ORD-YYYYMMDD-Sequence
    const prefixOrder = `ORD-${yyyymmdd}-`;
    const billsForDay = await this.prisma.bill.findMany({
      where: {
        userId: cleanUserId,
        orderId: {
          startsWith: prefixOrder
        }
      },
      select: { orderId: true }
    });

    let nextOrderSeq = 1;
    if (billsForDay && billsForDay.length > 0) {
      const sequences = billsForDay.map(b => {
        if (!b.orderId) return 0;
        const parts = b.orderId.split('-');
        const seqStr = parts[parts.length - 1];
        const seq = parseInt(seqStr, 10);
        return isNaN(seq) ? 0 : seq;
      });
      nextOrderSeq = Math.max(...sequences) + 1;
    }
    const orderId = `${prefixOrder}${nextOrderSeq.toString().padStart(4, '0')}`;

    // Generate Invoice ID sequence: INV-YYYY-Sequence
    const prefixInvoice = `INV-${yyyy}-`;
    const billsForYear = await this.prisma.bill.findMany({
      where: {
        userId: cleanUserId,
        invoiceId: {
          startsWith: prefixInvoice
        }
      },
      select: { invoiceId: true }
    });

    let nextInvoiceSeq = 1;
    if (billsForYear && billsForYear.length > 0) {
      const sequences = billsForYear.map(b => {
        if (!b.invoiceId) return 0;
        const parts = b.invoiceId.split('-');
        const seqStr = parts[parts.length - 1];
        const seq = parseInt(seqStr, 10);
        return isNaN(seq) ? 0 : seq;
      });
      nextInvoiceSeq = Math.max(...sequences) + 1;
    }
    const invoiceId = `${prefixInvoice}${nextInvoiceSeq.toString().padStart(4, '0')}`;

    for (const c of cart) {
      const product = await this.prisma.product.findFirst({
        where: { userId: cleanUserId, id: c.id }
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
          cleanUserId,
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
        userId: cleanUserId,
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
        operatorName,
        orderId,
        invoiceId
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
        mrp: mrp ? String(mrp).replace(/,/g, '').trim() : null,
        costPrice: costPrice ? String(costPrice).replace(/,/g, '').trim() : null,
        quantity: quantity ? String(quantity).replace(/,/g, '').trim() : null,
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
        mrp: mrp !== undefined ? (mrp ? String(mrp).replace(/,/g, '').trim() : null) : undefined,
        costPrice: costPrice !== undefined ? (costPrice ? String(costPrice).replace(/,/g, '').trim() : null) : undefined,
        quantity: quantity !== undefined ? (quantity ? String(quantity).replace(/,/g, '').trim() : null) : undefined,
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

  private formatDate(timestamp: number): string {
    const d = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const date = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${date < 10 ? '0' + date : date} ${month} ${year}, ${hours}:${minutesStr} ${ampm}`;
  }

  async generateInvoicePdf(userId: string, billId: string): Promise<Buffer> {
    const cleanUserId = userId.trim().toLowerCase();
    const bill = await this.prisma.bill.findFirst({
      where: { id: billId, userId: cleanUserId }
    });
    if (!bill) throw new NotFoundException('Bill not found');

    let seller = await this.prisma.user.findUnique({
      where: { email: cleanUserId }
    });
    if (!seller) throw new NotFoundException('Seller not found');

    if (seller.role === 'staff' && seller.parentEmail) {
      const parent = await this.prisma.user.findUnique({
        where: { email: seller.parentEmail.toLowerCase() }
      });
      if (parent) {
        seller = parent;
      }
    }

    const userProducts = await this.prisma.product.findMany({
      where: { userId: seller.email }
    });
    const productsMap = new Map(userProducts.map(p => [p.id, p]));

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

      const showGst = bill.hasGst !== undefined ? !!bill.hasGst : !!seller.gstNumber;

      // Header section
      doc.fillColor('#1e3a8a')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text(seller.businessName || 'Warehouse', { align: 'center' });
      
      doc.moveDown(0.2);

      const contactDetails = [
        seller.businessAddress || '',
        (seller.phone && seller.showPhoneOnBills !== false) ? `Phone: ${seller.phone}` : '',
        (seller.email && seller.showEmailOnBills !== false) ? `Email: ${seller.email}` : ''
      ].filter(Boolean).join(' | ');

      doc.fillColor('#475569')
         .fontSize(9)
         .font('Helvetica')
         .text(contactDetails, { align: 'center' });

      if (seller.businessNote) {
        doc.moveDown(0.3);
        doc.fillColor('#475569')
           .fontSize(8.5)
           .font('Helvetica-Oblique')
           .text(`"${seller.businessNote}"`, { align: 'center' });
      }

      if (showGst && seller.gstNumber) {
        doc.moveDown(0.3);
        doc.fillColor('#1e293b')
           .fontSize(9.5)
           .font('Helvetica-Bold')
           .text(`GSTIN: ${seller.gstNumber}`, { align: 'center' });
      }

      doc.moveDown(0.5);

      // Solid blue line separator
      let y = doc.y + 2;
      doc.strokeColor('#1e3a8a')
         .lineWidth(1.5)
         .moveTo(30, y)
         .lineTo(812, y)
         .stroke();

      y += 10;

      // Invoice Details Grid
      doc.fillAndStroke('#f8fafc', '#e2e8f0')
         .lineWidth(1)
         .roundedRect(30, y, 782, 45, 6)
         .fillAndStroke();

      doc.fillColor('#1e3a8a')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(showGst ? 'TAX INVOICE' : 'INVOICE', 45, y + 10);
      
      doc.fillColor('#64748b')
         .fontSize(6.5)
         .font('Helvetica-Bold')
         .text('ORIGINAL FOR RECIPIENT', 45, y + 27);

      doc.fillColor('#475569').fontSize(8).font('Helvetica');
      
      doc.text('Order ID:', 400, y + 10);
      doc.fillColor('#1e293b').font('Helvetica-Bold').text(bill.orderId || bill.id, 460, y + 10);
      
      doc.fillColor('#475569').font('Helvetica').text('Order Date:', 400, y + 25);
      doc.fillColor('#1e293b').font('Helvetica-Bold').text(this.formatDate(bill.date), 460, y + 25);

      doc.fillColor('#475569').font('Helvetica').text('Invoice No:', 620, y + 10);
      doc.fillColor('#1e293b').font('Helvetica-Bold').text(bill.invoiceId || bill.id, 680, y + 10);
      
      if (showGst && seller.gstNumber) {
        doc.fillColor('#475569').font('Helvetica').text('GSTIN:', 620, y + 25);
        doc.fillColor('#1e293b').font('Helvetica-Bold').text(seller.gstNumber, 680, y + 25);
      }

      y += 55;

      // Sold By Card
      doc.fillAndStroke('#ffffff', '#e2e8f0')
         .roundedRect(30, y, 381, 75, 6)
         .fillAndStroke();

      doc.fillColor('#1e3a8a')
         .fontSize(6.5)
         .font('Helvetica-Bold')
         .text('SOLD BY', 42, y + 10);

      doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(42, y + 19).lineTo(399, y + 19).stroke();

      doc.fillColor('#1e293b')
         .fontSize(9.5)
         .font('Helvetica-Bold')
         .text(seller.businessName || 'Warehouse', 42, y + 24);

      doc.fillColor('#475569')
         .fontSize(8)
         .font('Helvetica')
         .text(seller.businessAddress || '', 42, y + 37, { width: 350 });

      let soldContactY = doc.y + 2;
      let soldContactStr = '';
      if (seller.phone && seller.showPhoneOnBills !== false) soldContactStr += `Phone: ${seller.phone}`;
      if (seller.email && seller.showEmailOnBills !== false) soldContactStr += (soldContactStr ? ' | ' : '') + `Email: ${seller.email}`;
      if (soldContactStr) {
         doc.text(soldContactStr, 42, soldContactY);
      }

      // Billed To Card
      doc.fillAndStroke('#ffffff', '#e2e8f0')
         .roundedRect(431, y, 381, 75, 6)
         .fillAndStroke();

      doc.fillColor('#1e3a8a')
         .fontSize(6.5)
         .font('Helvetica-Bold')
         .text('BILLED TO', 443, y + 10);

      doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(443, y + 19).lineTo(800, y + 19).stroke();

      if (bill.buyerName || bill.buyerPhone || bill.buyerAddress) {
        doc.fillColor('#1e293b')
           .fontSize(9.5)
           .font('Helvetica-Bold')
           .text(bill.buyerName || 'Walk-in Customer', 443, y + 24);

        let billContactY = y + 37;
        if (bill.buyerAddress) {
          doc.fillColor('#475569')
             .fontSize(8)
             .font('Helvetica')
             .text(bill.buyerAddress, 443, billContactY, { width: 350 });
          billContactY = doc.y + 2;
        }
        if (bill.buyerPhone) {
          doc.fillColor('#475569')
             .fontSize(8)
             .font('Helvetica')
             .text(`Phone: ${bill.buyerPhone}`, 443, billContactY);
        }
      } else {
        doc.fillColor('#1e293b')
           .fontSize(9.5)
           .font('Helvetica-Bold')
           .text('Walk-in Customer', 443, y + 24);
        
        doc.fillColor('#64748b')
           .fontSize(8)
           .font('Helvetica-Oblique')
           .text('Retail Invoice', 443, y + 37);
        doc.text('Counter Sale', 443, y + 49);
      }

      y += 85;

      const drawTableHeader = (currentY: number) => {
        doc.fillColor('#1e3a8a')
           .rect(30, currentY, 782, 22)
           .fill();

        doc.fillColor('#ffffff')
           .fontSize(7)
           .font('Helvetica-Bold');
        
        doc.text('PRODUCT', 40, currentY + 7, { width: 280, align: 'left' });
        doc.text('SKU', 325, currentY + 7, { width: 100, align: 'left' });
        doc.text('QTY', 435, currentY + 7, { width: 60, align: 'center' });
        doc.text('RATE (Rs.)', 505, currentY + 7, { width: 90, align: 'right' });
        if (showGst) {
          doc.text(`GST (${bill.subtotal > 0 ? Math.round((bill.gst / bill.subtotal) * 100) : 18}%)`, 605, currentY + 7, { width: 90, align: 'right' });
        }
        doc.text('TOTAL', 705, currentY + 7, { width: 97, align: 'right' });
      };

      // Table Header row (First Page)
      drawTableHeader(y);

      let rowY = y + 22;

      // Table rows
      const items = (bill.items as any[]) || [];
      items.forEach((item, idx) => {
        // If rowY exceeds printable table boundary (480px), insert page break
        if (rowY > 480) {
          doc.strokeColor('#cbd5e1')
             .lineWidth(0.5)
             .moveTo(30, rowY)
             .lineTo(812, rowY)
             .stroke();

          // Create new landscape A4 page
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
          
          // Print continuation header
          doc.fillColor('#475569')
             .fontSize(8)
             .font('Helvetica-Oblique')
             .text(`Invoice No: ${bill.invoiceId || bill.id} (Continued)`, 30, 20);

          // Draw table header at y = 35 on new page
          drawTableHeader(35);
          rowY = 57; // 35 + 22
        }

        const rate = parseFloat(item.salePrice || item.manualPrice || item.mrp || '0');
        const qty = item.quantity || 1;
        const gross = rate * qty;
        const gstRateFactor = showGst && bill.subtotal > 0 ? (bill.gst / bill.subtotal) : 0;
        const itemGst = gross * gstRateFactor;
        const itemTotal = gross + itemGst;
        const matchingProduct = productsMap.get(item.id);
        const skuCode = item.productId || matchingProduct?.productId || '---';

        if (idx % 2 === 1) {
           doc.fillColor('#f8fafc').rect(30, rowY, 782, 20).fill();
        }

        doc.fillColor('#1e293b')
           .fontSize(8)
           .font('Helvetica-Bold')
           .text(item.name || 'Unnamed Item', 40, rowY + 6, { width: 280, align: 'left', height: 10, ellipsis: true });

        doc.fillColor('#1e293b')
           .fontSize(8)
           .font('Helvetica-Bold')
           .text(skuCode, 325, rowY + 6, { width: 100, align: 'left', height: 10, ellipsis: true });

        doc.fillColor('#1e293b')
           .fontSize(8)
           .font('Helvetica-Bold')
           .text(String(qty), 435, rowY + 6, { width: 60, align: 'center' });

        doc.fillColor('#475569')
           .fontSize(8)
           .font('Helvetica')
           .text(`Rs. ${rate.toFixed(2)}`, 505, rowY + 6, { width: 90, align: 'right' });

        if (showGst) {
          doc.fillColor('#10b981')
             .fontSize(8)
             .font('Helvetica')
             .text(`Rs. ${itemGst.toFixed(2)}`, 605, rowY + 6, { width: 90, align: 'right' });
        }

        doc.fillColor('#1e293b')
           .fontSize(8)
           .font('Helvetica-Bold')
           .text(`Rs. ${itemTotal.toFixed(2)}`, 705, rowY + 6, { width: 97, align: 'right' });

        doc.strokeColor('#cbd5e1')
           .lineWidth(0.5)
           .moveTo(30, rowY + 20)
           .lineTo(812, rowY + 20)
           .stroke();

        rowY += 20;
      });

      const totalQty = items.reduce((acc, it) => acc + (it.quantity || 0), 0);

      // Check if totals + signatory (approx 130px height) fit on current page.
      // If not, push summary details and signature cards to a clean next page.
      if (rowY + 130 > 540) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
        doc.fillColor('#475569')
           .fontSize(8)
           .font('Helvetica-Oblique')
           .text(`Invoice No: ${bill.invoiceId || bill.id} (Summary & Signature)`, 30, 20);
        rowY = 40;
      }

      if (showGst) {
         doc.fillColor('#f8fafc').rect(30, rowY, 782, 18).fill();
         doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('Subtotal:', 30, rowY + 5, { width: 665, align: 'right' });
         doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text(`Rs. ${bill.subtotal.toFixed(2)}`, 705, rowY + 5, { width: 97, align: 'right' });
         doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(30, rowY + 18).lineTo(812, rowY + 18).stroke();
         rowY += 18;

         doc.fillColor('#f8fafc').rect(30, rowY, 782, 18).fill();
         doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text(`GST (${bill.subtotal > 0 ? Math.round((bill.gst / bill.subtotal) * 100) : 18}%):`, 30, rowY + 5, { width: 665, align: 'right' });
         doc.fillColor('#10b981').fontSize(8).font('Helvetica-Bold').text(`+Rs. ${bill.gst.toFixed(2)}`, 705, rowY + 5, { width: 97, align: 'right' });
         doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(30, rowY + 18).lineTo(812, rowY + 18).stroke();
         rowY += 18;
      }

      doc.fillColor('#1e3a8a').rect(30, rowY, 782, 22).fill();
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
      doc.text(`TOTAL QTY: ${totalQty}`, 40, rowY + 7);
      
      const grandTotal = showGst ? bill.total : bill.subtotal;
      doc.text(`TOTAL: Rs. ${grandTotal.toFixed(2)}`, 605, rowY + 7, { width: 197, align: 'right' });
      
      rowY += 27;

      const operatorDisplay = (bill.operatorName && bill.operatorName !== 'Owner') ? bill.operatorName : (seller.name || 'Owner');

      // Left Side Credits with Brand Logo
      let logoDrawn = false;
      try {
         const logoPath = path.resolve(__dirname, '../../../../inventory-ant-frontend/public/logo.png');
         const fsSync = require('fs');
         if (fsSync.existsSync(logoPath)) {
            doc.image(logoPath, 30, rowY + 9, { width: 11, height: 11 });
            logoDrawn = true;
         }
      } catch (e) {
         console.error("Failed to draw brand logo in PDF:", e);
      }

      const textX = logoDrawn ? 45 : 30;
      doc.fillColor('#1e3a8a').fontSize(8.5).font('Helvetica-Bold').text('Powered by Inventory Ant', textX, rowY + 10);
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Oblique').text('Smart Warehouse Intelligence & Inventory System', 30, rowY + 20);

      // Right Side Signatory
      const sigY = rowY + 25;
      const sigX = 670;
      const sigWidth = 140;

      // Draw signature image if present in seller profile
      if (seller.businessSignature) {
         try {
            const matches = seller.businessSignature.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
               const buffer = Buffer.from(matches[2], 'base64');
               doc.image(buffer, sigX, sigY - 24, { fit: [sigWidth, 22], align: 'center', valign: 'bottom' });
            }
         } catch (e) {
            console.error("Failed to render signature in PDF:", e);
         }
      }

      doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(sigX, sigY).lineTo(sigX + sigWidth, sigY).stroke();
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text('Authorized Signatory', sigX, sigY + 5, { width: sigWidth, align: 'center' });
      doc.fillColor('#1e293b').fontSize(8).font('Helvetica-Bold').text(`Billed By: ${operatorDisplay}`, sigX, sigY + 15, { width: sigWidth, align: 'center' });

      doc.end();
    });
  }
}
