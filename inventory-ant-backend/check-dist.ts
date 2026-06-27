import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, 'dist', 'products', 'products.service.js');
try {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log('File size:', content.length);
  const index = content.indexOf('incomingCleanId && dbCleanId && dbCleanId !== incomingCleanId');
  if (index !== -1) {
    console.log('✅ Found new logic in dist file!');
  } else {
    console.log('❌ Logic NOT found in dist file.');
    // Print snippet of forEach in updateSingleItem
    const forEachIndex = content.indexOf('userItems.forEach');
    if (forEachIndex !== -1) {
      console.log('Snippet around userItems.forEach:\n', content.substring(forEachIndex, forEachIndex + 500));
    }
  }
} catch (e: any) {
  console.error('Error reading dist file:', e.message);
}
