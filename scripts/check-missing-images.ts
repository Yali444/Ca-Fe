#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';

class ImageChecker {
  private jsonPath: string;
  private imagesPath: string;

  constructor() {
    this.jsonPath = path.join(process.cwd(), 'public', 'data', 'cafes.json');
    this.imagesPath = path.join(process.cwd(), 'public', 'images');
  }

  checkMissingImages(): void {
    console.log('🔍 Checking for missing images...\n');

    try {
      // Read the JSON file
      const jsonData = fs.readFileSync(this.jsonPath, 'utf8');
      const cafes = JSON.parse(jsonData);

      // Get all available image files
      const availableImages = new Set<string>();
      const imageFiles = fs.readdirSync(this.imagesPath);
      
      imageFiles.forEach(file => {
        if (file.endsWith('.avif')) {
          availableImages.add(file);
        }
      });

      let missingCount = 0;
      let foundCount = 0;
      const missingImages: string[] = [];

      // Check each cafe's heroImage
      cafes.forEach((cafe: any) => {
        if (cafe.heroImage && typeof cafe.heroImage === 'string') {
          const imageName = path.basename(cafe.heroImage);
          
          if (!availableImages.has(imageName)) {
            missingCount++;
            missingImages.push(`${cafe.name}: ${imageName}`);
            console.log(`❌ Missing: ${cafe.name} -> ${imageName}`);
          } else {
            foundCount++;
            if (foundCount <= 10) {
              console.log(`✅ Found: ${cafe.name} -> ${imageName}`);
            }
          }
        }
      });

      console.log(`\n📊 Summary:`);
      console.log('='.repeat(50));
      console.log(`✅ Found: ${foundCount} images`);
      console.log(`❌ Missing: ${missingCount} images`);
      
      if (missingCount > 0) {
        console.log(`\n🚨 Missing images list:`);
        missingImages.forEach(missing => console.log(`  - ${missing}`));
      }

    } catch (error) {
      console.error('❌ Error checking images:', error);
      process.exit(1);
    }
  }
}

// Run the checker
async function main() {
  const checker = new ImageChecker();
  checker.checkMissingImages();
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { ImageChecker };
