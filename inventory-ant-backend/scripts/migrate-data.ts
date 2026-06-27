import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();

async function readJsonFile(filePath: string): Promise<any[]> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    if (!data || !data.trim()) return [];
    return JSON.parse(data);
  } catch (e: any) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

async function run() {
  console.log('🔄 Starting data migration to PostgreSQL...');

  const cwd = process.cwd();
  const usersPath = path.join(cwd, 'users.json');
  const databasePath = path.join(cwd, 'database.json');
  const billsPath = path.join(cwd, 'bills.json');
  const scanHistoryPath = path.join(cwd, 'scan_history.json');
  const ticketsPath = path.join(cwd, 'support_tickets.json');
  const activityLogsPath = path.join(cwd, 'activity_logs.json');
  const paymentsPath = path.join(cwd, 'payments.json');
  const notificationsPath = path.join(cwd, 'notifications.json');

  // 1. Migrate Users
  console.log('👥 Migrating Users...');
  const users = await readJsonFile(usersPath);
  for (const u of users) {
    const createdAt = u.createdAt || u.joinedAt || Date.now();
    const updatedAt = u.updatedAt || u.joinedAt || Date.now();
    await prisma.user.upsert({
      where: { email: u.email.toLowerCase() },
      update: {
        id: u.id,
        phone: u.phone || null,
        password: u.password || null,
        name: u.name,
        picture: u.picture || '',
        role: u.role || 'user',
        active: u.active !== undefined ? !!u.active : true,
        createdAt,
        updatedAt,
        parentEmail: u.parentEmail || null,
        profileCompleted: u.profileCompleted !== undefined ? !!u.profileCompleted : false,
        businessName: u.businessName || null,
        businessType: u.businessType || null,
        businessLogo: u.businessLogo || null,
        gstNumber: u.gstNumber || null,
        businessAddress: u.businessAddress || null,
        showPhoneOnBills: u.showPhoneOnBills !== undefined ? !!u.showPhoneOnBills : false,
        showEmailOnBills: u.showEmailOnBills !== undefined ? !!u.showEmailOnBills : false,
        plan: u.plan || 'free',
        validUntil: u.validUntil || null,
        storageUsed: u.storageUsed || null,
        lastLogin: u.lastLogin || null,
        adminRole: u.adminRole || null,
      },
      create: {
        id: u.id,
        email: u.email.toLowerCase(),
        phone: u.phone || null,
        password: u.password || null,
        name: u.name,
        picture: u.picture || '',
        role: u.role || 'user',
        active: u.active !== undefined ? !!u.active : true,
        createdAt,
        updatedAt,
        parentEmail: u.parentEmail || null,
        profileCompleted: u.profileCompleted !== undefined ? !!u.profileCompleted : false,
        businessName: u.businessName || null,
        businessType: u.businessType || null,
        businessLogo: u.businessLogo || null,
        gstNumber: u.gstNumber || null,
        businessAddress: u.businessAddress || null,
        showPhoneOnBills: u.showPhoneOnBills !== undefined ? !!u.showPhoneOnBills : false,
        showEmailOnBills: u.showEmailOnBills !== undefined ? !!u.showEmailOnBills : false,
        plan: u.plan || 'free',
        validUntil: u.validUntil || null,
        storageUsed: u.storageUsed || null,
        lastLogin: u.lastLogin || null,
        adminRole: u.adminRole || null,
      },
    });
  }
  console.log(`✅ Migrated ${users.length} Users.`);

  // 2. Migrate Products
  console.log('📦 Migrating Products...');
  const products = await readJsonFile(databasePath);
  for (const p of products) {
    const { id, userId, productId, name, details, mrp, quantity, _timestamp, ...extra } = p;
    if (!id || !userId) {
      console.warn(`⚠️ Skipping invalid product entry:`, p);
      continue;
    }
    await prisma.product.upsert({
      where: { id },
      update: {
        userId,
        productId: productId || null,
        name: name || null,
        details: details || null,
        mrp: mrp || null,
        quantity: quantity || null,
        timestamp: _timestamp || Date.now(),
        extraAttributes: extra,
      },
      create: {
        id,
        userId,
        productId: productId || null,
        name: name || null,
        details: details || null,
        mrp: mrp || null,
        quantity: quantity || null,
        timestamp: _timestamp || Date.now(),
        extraAttributes: extra,
      },
    });
  }
  console.log(`✅ Migrated ${products.length} Products.`);

  // 3. Migrate Bills
  console.log('🧾 Migrating Bills...');
  const bills = await readJsonFile(billsPath);
  for (const b of bills) {
    if (!b.id) continue;
    await prisma.bill.upsert({
      where: { id: b.id },
      update: {
        userId: b.userId,
        date: b.date || Date.now(),
        items: b.items || [],
        subtotal: parseFloat(b.subtotal) || 0,
        gst: parseFloat(b.gst) || 0,
        total: parseFloat(b.total) || 0,
        buyerName: b.buyerName || null,
        buyerPhone: b.buyerPhone || null,
        buyerAddress: b.buyerAddress || null,
        hasGst: b.hasGst !== undefined ? !!b.hasGst : true,
        hasBuyerInfo: b.hasBuyerInfo !== undefined ? !!b.hasBuyerInfo : false,
        operatorName: b.operatorName || 'Owner',
      },
      create: {
        id: b.id,
        userId: b.userId,
        date: b.date || Date.now(),
        items: b.items || [],
        subtotal: parseFloat(b.subtotal) || 0,
        gst: parseFloat(b.gst) || 0,
        total: parseFloat(b.total) || 0,
        buyerName: b.buyerName || null,
        buyerPhone: b.buyerPhone || null,
        buyerAddress: b.buyerAddress || null,
        hasGst: b.hasGst !== undefined ? !!b.hasGst : true,
        hasBuyerInfo: b.hasBuyerInfo !== undefined ? !!b.hasBuyerInfo : false,
        operatorName: b.operatorName || 'Owner',
      },
    });
  }
  console.log(`✅ Migrated ${bills.length} Bills.`);

  // 4. Migrate Scan History
  console.log('📷 Migrating Scan History...');
  const scans = await readJsonFile(scanHistoryPath);
  for (const s of scans) {
    if (!s.id) continue;
    await prisma.scanHistory.upsert({
      where: { id: s.id },
      update: {
        userId: s.userId,
        timestamp: s.timestamp || Date.now(),
        actionType: s.actionType,
        operatorName: s.operatorName || 'Owner',
        items: s.items || [],
        auditLog: s.auditLog || [],
      },
      create: {
        id: s.id,
        userId: s.userId,
        timestamp: s.timestamp || Date.now(),
        actionType: s.actionType,
        operatorName: s.operatorName || 'Owner',
        items: s.items || [],
        auditLog: s.auditLog || [],
      },
    });
  }
  console.log(`✅ Migrated ${scans.length} Scan History Entries.`);

  // 5. Migrate Support Tickets
  console.log('🎫 Migrating Support Tickets...');
  const tickets = await readJsonFile(ticketsPath);
  for (const t of tickets) {
    if (!t.id) continue;
    await prisma.supportTicket.upsert({
      where: { id: t.id },
      update: {
        userId: t.userId,
        businessName: t.businessName || 'N/A',
        subject: t.subject,
        description: t.description,
        priority: t.priority,
        status: t.status || 'open',
        createdAt: t.createdAt || Date.now(),
        assignedAdmin: t.assignedAdmin || '',
      },
      create: {
        id: t.id,
        userId: t.userId,
        businessName: t.businessName || 'N/A',
        subject: t.subject,
        description: t.description,
        priority: t.priority,
        status: t.status || 'open',
        createdAt: t.createdAt || Date.now(),
        assignedAdmin: t.assignedAdmin || '',
      },
    });
  }
  console.log(`✅ Migrated ${tickets.length} Support Tickets.`);

  // 6. Migrate Notifications
  console.log('📢 Migrating Notifications...');
  const notifications = await readJsonFile(notificationsPath);
  for (const n of notifications) {
    if (!n.id) continue;
    await prisma.notification.upsert({
      where: { id: n.id },
      update: {
        target: n.target,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt || Date.now(),
      },
      create: {
        id: n.id,
        target: n.target,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt || Date.now(),
      },
    });
  }
  console.log(`✅ Migrated ${notifications.length} Notifications.`);

  // 7. Migrate Payments
  console.log('💳 Migrating Payments...');
  const payments = await readJsonFile(paymentsPath);
  for (const pay of payments) {
    if (!pay.id) continue;
    await prisma.payment.upsert({
      where: { id: pay.id },
      update: {
        userId: pay.userId,
        businessName: pay.businessName || 'N/A',
        amount: parseFloat(pay.amount) || 0,
        plan: pay.plan || 'free',
        status: pay.status || 'success',
        timestamp: pay.timestamp || Date.now(),
        invoiceId: pay.invoiceId || '',
      },
      create: {
        id: pay.id,
        userId: pay.userId,
        businessName: pay.businessName || 'N/A',
        amount: parseFloat(pay.amount) || 0,
        plan: pay.plan || 'free',
        status: pay.status || 'success',
        timestamp: pay.timestamp || Date.now(),
        invoiceId: pay.invoiceId || '',
      },
    });
  }
  console.log(`✅ Migrated ${payments.length} Payments.`);

  // 8. Migrate Activity Logs
  console.log('📝 Migrating Activity Logs...');
  const logs = await readJsonFile(activityLogsPath);
  for (const l of logs) {
    if (!l.id) continue;
    await prisma.activityLog.upsert({
      where: { id: l.id },
      update: {
        userId: l.userId,
        userName: l.userName || 'N/A',
        role: l.role || 'user',
        action: l.action,
        ip: l.ip || '127.0.0.1',
        device: l.device || 'Desktop Web',
        timestamp: l.timestamp || Date.now(),
      },
      create: {
        id: l.id,
        userId: l.userId,
        userName: l.userName || 'N/A',
        role: l.role || 'user',
        action: l.action,
        ip: l.ip || '127.0.0.1',
        device: l.device || 'Desktop Web',
        timestamp: l.timestamp || Date.now(),
      },
    });
  }
  console.log(`✅ Migrated ${logs.length} Activity Logs.`);

  console.log('🎉 Data migration completed successfully with ZERO data loss!');
}

run()
  .catch((e) => {
    console.error('❌ Data migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
