import { ImageProcessingFlow } from './flows/image_processing_flow';
import fs from 'fs';
import path from 'path';

/**
 * Main function to run the image filter application
 */
async function main() {
  console.log("Starting Image Filter Application...");
  
  // Ensure the images directory exists
  const imagesDir = path.join(process.cwd(), 'src', 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log(`Created images directory at: ${imagesDir}`);
    console.log("Please add some image files to this directory and run the application again.");
    return;
  }
  
  // Check if there are any images in the directory
  const files = fs.readdirSync(imagesDir);
  const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
  
  if (imageFiles.length === 0) {
    console.log("No image files found in the images directory.");
    console.log("Please add some image files to the src/images directory and run the application again.");
    return;
  }
  
  console.log("--------------------------------------------------");
  console.log("Starting parallel image processing...");
  console.log("--------------------------------------------------");
  
  // Create and run the image processing flow
  try {
    // Start time for overall application
    const appStartTime = Date.now();
    
    // 5 images per batch, 3 parallel batches
    const processingFlow = new ImageProcessingFlow(5, 3);
    const result = await processingFlow.process();
    
    // End time for overall application
    const appEndTime = Date.now();
    const totalAppTime = (appEndTime - appStartTime) / 1000;
    
    console.log("--------------------------------------------------");
    console.log("Image processing completed successfully!");
    console.log(`Processed ${imageFiles.length} images with 3 filters (blur, grayscale, sepia).`);
    console.log(`Output files and report can be found in the 'output' directory.`);
    console.log("--------------------------------------------------");
    console.log(`Total application time: ${totalAppTime.toFixed(2)} seconds`);
    console.log("--------------------------------------------------");
  } catch (error) {
    console.error("Error processing images:", error);
  }
}

// Run the main function
main().catch(console.error); 