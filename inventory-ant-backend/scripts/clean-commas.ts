import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('🔄 Starting comma cleanup migration in PostgreSQL...');
  
  const products = await prisma.product.findMany();
  console.log(`Fetched ${products.length} products to check.`);
  
  let cleanedCount = 0;
  for (const p of products) {
    let needsUpdate = false;
    const updateData: any = {};

    if (p.quantity && p.quantity.includes(',')) {
      updateData.quantity = p.quantity.replace(/,/g, '').trim();
      needsUpdate = true;
      console.log(`🧹 Cleaning quantity for Product ID ${p.id} (${p.name}): "${p.quantity}" -> "${updateData.quantity}"`);
    }

    if (p.mrp && p.mrp.includes(',')) {
      updateData.mrp = p.mrp.replace(/,/g, '').trim();
      needsUpdate = true;
      console.log(`🧹 Cleaning mrp for Product ID ${p.id} (${p.name}): "${p.mrp}" -> "${updateData.mrp}"`);
    }

    if (p.costPrice && p.costPrice.includes(',')) {
      updateData.costPrice = p.costPrice.replace(/,/g, '').trim();
      needsUpdate = true;
      console.log(`🧹 Cleaning costPrice for Product ID ${p.id} (${p.name}): "${p.costPrice}" -> "${updateData.costPrice}"`);
    }

    if (needsUpdate) {
      await prisma.product.update({
        where: { id: p.id },
        data: updateData,
      });
      cleanedCount++;
    }
  }

  console.log(`✅ Comma cleanup complete! Cleaned ${cleanedCount} products.`);
}

run()
  .catch((e) => {
    console.error('❌ Error during cleanup script execution:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
