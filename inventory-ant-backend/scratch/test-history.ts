import { PrismaService } from '../src/prisma.service';

const prisma = new PrismaService();

async function main() {
  const id = 'TEST-HIST-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  const userId = 'test-matching-user@example.com';
  const timestamp = Date.now();
  const productId = '100001';
  const productName = 'Gold Cup Tea';
  const actionType = 'CREATE';
  const operatorName = 'Owner';
  const beforeQty = '0';
  const afterQty = '10';
  const details = 'Initial manual add';

  console.log('Inserting raw history record...');
  await (prisma as any).$executeRawUnsafe(
    `INSERT INTO "InventoryHistory" (id, "userId", timestamp, "productId", "productName", "actionType", "operatorName", "beforeQty", "afterQty", details) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    id, userId, timestamp, productId, productName, actionType, operatorName, beforeQty, afterQty, details
  );

  console.log('Record inserted successfully! Fetching history...');
  const rows = await (prisma as any).$queryRawUnsafe(
    `SELECT * FROM "InventoryHistory" WHERE "userId" = $1 ORDER BY timestamp DESC`,
    userId
  );
  console.log('Fetched rows:', rows);
}

main().catch(console.error).finally(() => prisma.$disconnect());
