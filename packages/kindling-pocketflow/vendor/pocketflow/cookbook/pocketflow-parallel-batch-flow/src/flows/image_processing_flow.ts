import { Flow } from 'pocketflow';
import { ImageScannerNode } from '../nodes/image_scanner_node';
import { ImageProcessingNode } from '../nodes/image_processing_node';
import { CompletionReportNode } from '../nodes/completion_report_node';
import { SharedData } from '../types';

/**
 * Image Processing Flow
 * Orchestrates the entire image processing pipeline
 */
export class ImageProcessingFlow extends Flow {
  /**
   * Constructor
   * @param itemsPerBatch Number of images to process in each batch
   * @param concurrency Number of parallel batches to run
   */
  constructor(itemsPerBatch: number = 5, concurrency: number = 3) {
    // Create nodes
    const scannerNode = new ImageScannerNode();
    const processingNode = new ImageProcessingNode();
    const reportNode = new CompletionReportNode();
    
    // Configure parallel batch processing if custom values are provided
    if (itemsPerBatch !== 5 || concurrency !== 3) {
      processingNode.setParams({
        itemsPerBatch,
        concurrency
      });
    }
    
    // Connect nodes
    scannerNode.next(processingNode);
    processingNode.next(reportNode);
    
    // Create flow with the scanner node as the starting point
    super(scannerNode);
  }

  /**
   * Run the flow with initial shared data
   */
  async process(): Promise<SharedData> {
    const shared: SharedData = {
      inputImages: [],
      filters: [],
      outputFolder: '',
      processedImages: []
    };
    
    await this.run(shared);
    
    return shared;
  }
} 