#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';

class JpegCleanup {
  private imagesDir: string;
  private backupDir: string;
  private removedFiles: string[] = [];
  private skippedFiles: string[] = [];

  constructor() {
    this.imagesDir = path.join(process.cwd(), 'public', 'images');
    this.backupDir = path.join(this.imagesDir, 'backup');
  }

  getJpegFiles(): string[] {
    const files = fs.readdirSync(this.imagesDir);
    return files.filter(file => 
      file.match(/\.(jpg|jpeg)$/i) && 
      !file.includes('ca_fe_logo') && // Skip logo
      !file.includes('favicon')      // Skip favicon
    );
  }

  hasCorrespondingAvif(jpegFile: string): boolean {
    const baseName = path.basename(jpegFile, path.extname(jpegFile));
    const avifFile = `${baseName}.avif`;
    return fs.existsSync(path.join(this.imagesDir, avifFile));
  }

  cleanupJpegs(): void {
    console.log('🧹 Starting JPEG cleanup...\n');

    const jpegFiles = this.getJpegFiles();
    console.log(`📁 Found ${jpegFiles.length} JPEG files to check\n`);

    for (const file of jpegFiles) {
      const filePath = path.join(this.imagesDir, file);
      
      if (this.hasCorrespondingAvif(file)) {
        try {
          fs.unlinkSync(filePath);
          this.removedFiles.push(file);
          console.log(`🗑️  Removed: ${file}`);
        } catch (error) {
          console.log(`❌ Failed to remove ${file}: ${error}`);
        }
      } else {
        this.skippedFiles.push(file);
        console.log(`⏭️  Skipped (no AVIF): ${file}`);
      }
    }

    this.printSummary();
  }

  printSummary(): void {
    console.log('\n📊 Cleanup Summary:');
    console.log('='.repeat(50));
    console.log(`🗑️  Removed: ${this.removedFiles.length} files`);
    console.log(`⏭️  Skipped: ${this.skippedFiles.length} files`);
    
    if (this.removedFiles.length > 0) {
      console.log('\n✅ Removed files:');
      this.removedFiles.forEach(file => console.log(`   ${file}`));
    }

    if (this.skippedFiles.length > 0) {
      console.log('\n⏭️  Skipped files (no AVIF found):');
      this.skippedFiles.forEach(file => console.log(`   ${file}`));
    }

    console.log('\n💡 Original files are safely backed up in: public/images/backup/');
    console.log('🎉 Cleanup complete!');
  }
}

// Run the cleanup
async function main() {
  const cleanup = new JpegCleanup();
  cleanup.cleanupJpegs();
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { JpegCleanup };
