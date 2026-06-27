import { PrismaService } from './src/prisma.service';

const prisma = new PrismaService();

async function main() {
  const lastScan = await prisma.scanHistory.findFirst({
    orderBy: { timestamp: 'desc' }
  });

  if (!lastScan) {
    console.log('No scans found in database.');
    return;
  }

  console.log('LAST SCAN DETAILS:');
  console.log(`ID: ${lastScan.id}`);
  console.log(`User: ${lastScan.userId}`);
  console.log(`Timestamp: ${lastScan.timestamp}`);
  console.log(`Action: ${lastScan.actionType}`);
  console.log('ITEMS:', JSON.stringify(lastScan.items, null, 2));
  console.log('AUDIT LOGS:', JSON.stringify(lastScan.auditLog, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
