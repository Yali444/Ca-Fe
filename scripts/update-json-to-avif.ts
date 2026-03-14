#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';

class JsonAvifUpdater {
  private jsonPath: string;

  constructor() {
    this.jsonPath = path.join(process.cwd(), 'public', 'data', 'cafes.json');
  }

  updateJsonToAvif(): void {
    console.log('🔄 Updating JSON paths from JPEG to AVIF...\n');

    try {
      // Read the JSON file
      const jsonData = fs.readFileSync(this.jsonPath, 'utf8');
      const cafes = JSON.parse(jsonData);

      let updatedCount = 0;
      let skippedCount = 0;

      // Update each cafe's heroImage
      cafes.forEach((cafe: any, index: number) => {
        if (cafe.heroImage && typeof cafe.heroImage === 'string') {
          const oldPath = cafe.heroImage;
          
          // Only update if it's a JPEG file
          if (oldPath.match(/\.(jpg|jpeg)$/i)) {
            // Convert to AVIF path
            const newPath = oldPath.replace(/\.(jpg|jpeg)$/i, '.avif');
            cafe.heroImage = newPath;
            updatedCount++;
            
            if (updatedCount <= 10) {
              console.log(`✅ Updated: ${oldPath} → ${newPath}`);
            }
          } else {
            skippedCount++;
          }
        }
      });

      // Write back to file
      const updatedJson = JSON.stringify(cafes, null, 2);
      fs.writeFileSync(this.jsonPath, updatedJson, 'utf8');

      console.log(`\n📊 Update Summary:`);
      console.log('='.repeat(50));
      console.log(`✅ Updated: ${updatedCount} paths`);
      console.log(`⏭️  Skipped: ${skippedCount} paths (non-JPEG)`);
      console.log('🎉 JSON update complete!');

    } catch (error) {
      console.error('❌ Error updating JSON:', error);
      process.exit(1);
    }
  }
}

// Run the updater
async function main() {
  const updater = new JsonAvifUpdater();
  updater.updateJsonToAvif();
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { JsonAvifUpdater };
