#!/usr/bin/env tsx

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

interface ConversionResult {
  filename: string;
  originalSize: number;
  avifSize: number;
  compressionRatio: number;
  success: boolean;
  error?: string;
}

class ImageConverter {
  private imagesDir: string;
  private backupDir: string;
  private results: ConversionResult[] = [];

  constructor() {
    this.imagesDir = path.join(process.cwd(), 'public', 'images');
    this.backupDir = path.join(process.cwd(), 'public', 'images', 'backup');
  }

  async ensureBackupDir(): Promise<void> {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log('✅ Created backup directory');
    }
  }

  getJpegFiles(): string[] {
    const files = fs.readdirSync(this.imagesDir);
    return files.filter(file => 
      file.match(/\.(jpg|jpeg)$/i) && 
      !file.includes('ca_fe_logo') && // Skip logo
      !file.includes('favicon') // Skip favicon
    );
  }

  async backupOriginal(filePath: string): Promise<void> {
    const filename = path.basename(filePath);
    const backupPath = path.join(this.backupDir, filename);
    
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filePath, backupPath);
      console.log(`📋 Backed up: ${filename}`);
    }
  }

  async convertToAvif(jpegPath: string): Promise<ConversionResult> {
    const filename = path.basename(jpegPath, path.extname(jpegPath));
    const avifPath = path.join(path.dirname(jpegPath), `${filename}.avif`);
    
    try {
      // Get original size
      const originalStats = fs.statSync(jpegPath);
      const originalSize = originalStats.size;

      // Convert to AVIF with high quality
      await sharp(jpegPath)
        .avif({
          quality: 85,
          effort: 6, // Higher effort = better compression
          chromaSubsampling: '4:4:4', // Better color preservation
        })
        .toFile(avifPath);

      // Get AVIF size
      const avifStats = fs.statSync(avifPath);
      const avifSize = avifStats.size;
      const compressionRatio = ((originalSize - avifSize) / originalSize) * 100;

      return {
        filename: path.basename(jpegPath),
        originalSize,
        avifSize,
        compressionRatio,
        success: true
      };

    } catch (error) {
      return {
        filename: path.basename(jpegPath),
        originalSize: 0,
        avifSize: 0,
        compressionRatio: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async convertAll(): Promise<void> {
    console.log('🚀 Starting JPEG to AVIF conversion...\n');

    // Ensure backup directory exists
    await this.ensureBackupDir();

    // Get all JPEG files
    const jpegFiles = this.getJpegFiles();
    console.log(`📁 Found ${jpegFiles.length} JPEG files to convert\n`);

    if (jpegFiles.length === 0) {
      console.log('ℹ️  No JPEG files found for conversion');
      return;
    }

    // Convert each file
    for (const file of jpegFiles) {
      const filePath = path.join(this.imagesDir, file);
      
      console.log(`🔄 Processing: ${file}`);
      
      // Backup original
      await this.backupOriginal(filePath);
      
      // Convert to AVIF
      const result = await this.convertToAvif(filePath);
      this.results.push(result);
      
      if (result.success) {
        const originalMB = (result.originalSize / 1024 / 1024).toFixed(2);
        const avifMB = (result.avifSize / 1024 / 1024).toFixed(2);
        console.log(`✅ ${file}: ${originalMB}MB → ${avifMB}MB (${result.compressionRatio.toFixed(1)}% smaller)`);
      } else {
        console.log(`❌ ${file}: Failed - ${result.error}`);
      }
    }

    // Print summary
    this.printSummary();
  }

  printSummary(): void {
    console.log('\n📊 Conversion Summary:');
    console.log('='.repeat(50));
    
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    
    const totalOriginalSize = successful.reduce((sum, r) => sum + r.originalSize, 0);
    const totalAvifSize = successful.reduce((sum, r) => sum + r.avifSize, 0);
    const totalSavings = totalOriginalSize - totalAvifSize;
    const avgCompression = successful.length > 0 
      ? successful.reduce((sum, r) => sum + r.compressionRatio, 0) / successful.length 
      : 0;

    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    
    if (successful.length > 0) {
      console.log(`📦 Total size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)}MB → ${(totalAvifSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`💾 Space saved: ${(totalSavings / 1024 / 1024).toFixed(2)}MB (${avgCompression.toFixed(1)}% average)`);
    }

    if (failed.length > 0) {
      console.log('\n❌ Failed conversions:');
      failed.forEach(r => console.log(`   ${r.filename}: ${r.error}`));
    }

    console.log('\n🎉 Conversion complete!');
    console.log('💡 Original files are backed up in: public/images/backup/');
    console.log('📝 You can now remove the original JPEG files if everything looks good');
  }
}

// Run the converter
async function main() {
  const converter = new ImageConverter();
  await converter.convertAll();
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { ImageConverter };
