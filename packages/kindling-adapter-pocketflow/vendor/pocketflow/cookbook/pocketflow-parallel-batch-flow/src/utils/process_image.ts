import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Applies a filter to an image
 * @param imagePath Path to the image file
 * @param filter Filter to apply (blur, grayscale, sepia)
 * @returns Path to the processed image
 */
export async function processImage(imagePath: string, filter: string): Promise<string> {
  try {
    // Create a sharp instance with the input image
    let sharpImage = sharp(imagePath);
    
    // Apply the filter
    switch (filter) {
      case 'blur':
        sharpImage = sharpImage.blur(5);
        break;
      case 'grayscale':
        sharpImage = sharpImage.grayscale();
        break;
      case 'sepia':
        // Sepia is implemented using a color matrix
        sharpImage = sharpImage.recomb([
          [0.393, 0.769, 0.189],
          [0.349, 0.686, 0.168],
          [0.272, 0.534, 0.131]
        ]);
        break;
      default:
        console.warn(`Unknown filter: ${filter}`);
    }
    
    // Generate output path
    const { dir, name, ext } = path.parse(imagePath);
    const outputDir = path.join(process.cwd(), 'output');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, `${name}_${filter}${ext}`);
    
    // Save the processed image
    await sharpImage.toFile(outputPath);
    
    return outputPath;
  } catch (error) {
    console.error(`Error processing image ${imagePath} with filter ${filter}:`, error);
    throw error;
  }
} 