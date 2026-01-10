import { Node } from 'pocketflow';
import { SharedData } from '../types';
import { readDirectory } from '../utils';
import path from 'path';

/**
 * Image Scanner Node
 * Scans the src/images directory to find all input images
 */
export class ImageScannerNode extends Node<SharedData> {
  /**
   * Initialize empty inputImages array in shared store
   */
  async prep(shared: SharedData): Promise<null> {
    shared.inputImages = [];
    // Initialize timing data
    shared.startTime = Date.now();
    shared.processingTimes = [];
    return null;
  }

  /**
   * Read all files from src/images directory, filter for image files
   */
  async exec(_: null): Promise<string[]> {
    const imagesPath = path.join(process.cwd(), 'src', 'images');
    console.log(`Scanning for images in ${imagesPath}`);
    return readDirectory(imagesPath);
  }

  /**
   * Write image paths to inputImages in shared store and initialize filters array
   */
  async post(shared: SharedData, _: null, execRes: string[]): Promise<string | undefined> {
    shared.inputImages = execRes;
    shared.filters = ['blur', 'grayscale', 'sepia'];
    shared.outputFolder = path.join(process.cwd(), 'output');
    shared.processedImages = [];
    
    console.log(`Found ${shared.inputImages.length} images to process`);
    
    return 'default'; // Go to the next node
  }
} 