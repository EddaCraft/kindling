/**
 * Interface for the shared memory data structure
 */
export interface SharedData {
  // Input data
  inputImages: string[]; // Paths to input images

  // Processing data
  filters: string[]; // List of filters to apply (blur, grayscale, sepia)

  // Output data
  outputFolder: string; // Path to output folder
  processedImages: {
    // Tracking processed images
    imagePath: string;
    appliedFilters: string[];
  }[];

  // Timing data
  startTime?: number; // Start time in milliseconds
  endTime?: number; // End time in milliseconds
  processingTimes?: {
    // Individual processing times for each image/filter combination
    imagePath: string;
    filter: string;
    timeMs: number;
  }[];
} 