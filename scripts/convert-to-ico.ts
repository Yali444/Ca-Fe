import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import toIco from 'to-ico';

async function convertPngToIco() {
  const inputPath = 'C:\\Users\\Yali\\Downloads\\Ca Fe Logo.png';
  const outputPath = 'C:\\Users\\Yali\\OneDrive\\Documents\\Cursor Projects\\Ca fe\\cafe-guide-web\\src\\app\\favicon.ico';

  try {
    // Read and resize the PNG to multiple sizes
    // Includes sizes for: browser tabs (16, 32), Windows taskbar (48, 64), high-DPI displays (128, 256)
    const sizes = [16, 32, 48, 64, 128, 256];
    const resizedImages = await Promise.all(
      sizes.map(size => 
        sharp(inputPath)
          .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()
      )
    );
    
    // Convert to ICO
    const ico = await toIco(resizedImages);
    
    // Write the ICO file
    fs.writeFileSync(outputPath, ico);
    
    console.log(`Successfully converted ${inputPath} to ${outputPath}`);
  } catch (error) {
    console.error('Error converting PNG to ICO:', error);
    process.exit(1);
  }
}

convertPngToIco();






