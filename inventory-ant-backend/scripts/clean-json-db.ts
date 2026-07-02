import * as fs from 'fs/promises';
import * as path from 'path';

async function run() {
  console.log('🔄 Checking local JSON database files for commas...');
  
  const cwd = process.cwd();
  const databasePath = path.join(cwd, 'database.json');
  
  try {
    const dataStr = await fs.readFile(databasePath, 'utf8');
    if (!dataStr || !dataStr.trim()) {
      console.log('database.json is empty or not found.');
      return;
    }
    
    const products = JSON.parse(dataStr);
    let cleanedCount = 0;
    
    for (const p of products) {
      let updated = false;
      
      if (p.quantity && String(p.quantity).includes(',')) {
        console.log(`🧹 database.json: Cleaning quantity for ${p.name || p.id}: "${p.quantity}"`);
        p.quantity = String(p.quantity).replace(/,/g, '').trim();
        updated = true;
      }
      
      if (p.mrp && String(p.mrp).includes(',')) {
        console.log(`🧹 database.json: Cleaning mrp for ${p.name || p.id}: "${p.mrp}"`);
        p.mrp = String(p.mrp).replace(/,/g, '').trim();
        updated = true;
      }
      
      if (p.costPrice && String(p.costPrice).includes(',')) {
        console.log(`🧹 database.json: Cleaning costPrice for ${p.name || p.id}: "${p.costPrice}"`);
        p.costPrice = String(p.costPrice).replace(/,/g, '').trim();
        updated = true;
      }
      
      if (updated) {
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      await fs.writeFile(databasePath, JSON.stringify(products, null, 2), 'utf8');
      console.log(`✅ Cleaned ${cleanedCount} products in database.json.`);
    } else {
      console.log('No commas found in database.json.');
    }
  } catch (e) {
    console.error('Error reading/updating database.json:', e);
  }
}

run();
