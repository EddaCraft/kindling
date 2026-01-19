import { ParallelBatchNode } from 'pocketflow';
import { SharedData } from '../types';
import { processImage } from '../utils';
import path from 'path';

/**
 * Image Processing Input
 * Structure for each batch item in the ParallelBatchNode
 */
interface ImageProcessingInput {
  imagePath: string;
  filter: string;
}

/**
 * Image Processing Result
 * Structure for the output of processing each image
 */
interface ImageProcessingResult {
  originalPath: string;
  processedPath: string;
  filter: string;
  success: boolean;
  processingTimeMs: number; // Time taken to process
}

/**
 * Image Processing Node
 * Uses ParallelBatchFlow to apply filters to images in parallel
 */
export class ImageProcessingNode extends ParallelBatchNode<SharedData> {
  // Set default batch parameters
  constructor() {
    super();
    this.setParams({
      itemsPerBatch: 5,
      concurrency: 3
    });
  }

  /**
   * Create a batch of image processing tasks
   * Each task consists of an image and a filter to apply
   */
  async prep(shared: SharedData): Promise<ImageProcessingInput[]> {
    const tasks: ImageProcessingInput[] = [];
    
    // For each image, create a task for each filter
    for (const imagePath of shared.inputImages) {
      for (const filter of shared.filters) {
        tasks.push({
          imagePath,
          filter
        });
      }
    }
    
    console.log(`Created ${tasks.length} image processing tasks`);
    return tasks;
  }

  /**
   * Process a single image with the specified filter
   */
  async exec(input: ImageProcessingInput): Promise<ImageProcessingResult> {
    console.log(`Processing ${path.basename(input.imagePath)} with ${input.filter} filter`);
    
    const startTime = Date.now();
    try {
      const processedPath = await processImage(input.imagePath, input.filter);
      const endTime = Date.now();
      const processingTimeMs = endTime - startTime;
      
      return {
        originalPath: input.imagePath,
        processedPath,
        filter: input.filter,
        success: true,
        processingTimeMs
      };
    } catch (error) {
      console.error(`Failed to process ${input.imagePath} with ${input.filter}:`, error);
      const endTime = Date.now();
      const processingTimeMs = endTime - startTime;
      
      return {
        originalPath: input.imagePath,
        processedPath: '',
        filter: input.filter,
        success: false,
        processingTimeMs
      };
    }
  }

  /**
   * Update the shared store with the results of all processed images
   */
  async post(
    shared: SharedData, 
    _: ImageProcessingInput[], 
    results: ImageProcessingResult[]
  ): Promise<string | undefined> {
    // Group results by original image path
    const imageMap = new Map<string, string[]>();
    
    // Record processing times and update processed images
    for (const result of results) {
      // Store processing time
      if (!shared.processingTimes) {
        shared.processingTimes = [];
      }
      
      shared.processingTimes.push({
        imagePath: path.basename(result.originalPath),
        filter: result.filter,
        timeMs: result.processingTimeMs
      });
      
      if (result.success) {
        const appliedFilters = imageMap.get(result.originalPath) || [];
        appliedFilters.push(result.filter);
        imageMap.set(result.originalPath, appliedFilters);
      }
    }
    
    // Update processedImages in shared store
    for (const [imagePath, appliedFilters] of imageMap.entries()) {
      shared.processedImages.push({
        imagePath,
        appliedFilters
      });
    }
    
    console.log(`Successfully processed ${shared.processedImages.length} images`);
    
    // Set the end time
    shared.endTime = Date.now();
    
    return 'default'; // Go to the next node
  }
} 