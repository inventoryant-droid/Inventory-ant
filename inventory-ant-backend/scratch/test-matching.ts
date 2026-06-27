import { PrismaService } from '../src/prisma.service';
import { ProductsService } from '../src/products/products.service';

const prisma = new PrismaService();
const service = new ProductsService(prisma);

async function runTest() {
  const testUserId = 'test-matching-user@example.com';

  console.log('--- Cleaning up existing test products ---');
  await prisma.product.deleteMany({
    where: { userId: testUserId }
  });

  console.log('--- Creating initial inventory items ---');
  // Item 1: Gold Cup Tea (100g premium)
  const item1 = await service.create(testUserId, {
    productId: '100001',
    name: 'Gold Cup Tea',
    details: '100g premium',
    quantity: '10',
    mrp: '150'
  });
  console.log('Created item 1:', item1);

  // Item 2: Silver Spoon (no details)
  const item2 = await service.create(testUserId, {
    productId: '100002',
    name: 'Silver Spoon',
    quantity: '5',
    mrp: '50'
  });
  console.log('Created item 2:', item2);

  console.log('\n--- Test Case 1: Scanning item with matching name and details, no SKU ---');
  const result1 = await (service as any).updateSingleItem(testUserId, {
    name: 'Gold Cup Tea',
    details: '100g premium',
    qty: 5,
    mrp: '150'
  }, 'IN');
  console.log('Result 1:', result1);

  const updatedItem1 = await prisma.product.findFirst({
    where: { userId: testUserId, productId: '100001' }
  });
  console.log('Updated Item 1 Qty (expected 15):', updatedItem1?.quantity);

  console.log('\n--- Test Case 2: Scanning item with matching name but DIFFERENT details, no SKU ---');
  const result2 = await (service as any).updateSingleItem(testUserId, {
    name: 'Gold Cup Tea',
    details: '200g family pack',
    qty: 20,
    mrp: '280'
  }, 'IN');
  console.log('Result 2:', result2);

  const allItems = await prisma.product.findMany({
    where: { userId: testUserId }
  });
  console.log(`Total items in DB (expected 3, since different details should create a new item): ${allItems.length}`);
  console.log('Items in DB:', JSON.stringify(allItems, null, 2));
}

runTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
