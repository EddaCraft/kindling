import { Node } from 'pocketflow';
import { SharedData } from '../types';
import fs from 'fs';
import path from 'path';

/**
 * Completion Report Node
 * Generates a report of all processed images
 */
export class CompletionReportNode extends Node<SharedData> {
  /**
   * Read processedImages from shared store
   */
  async prep(shared: SharedData): Promise<SharedData> {
    // Pass the entire shared data to include timing information
    return shared;
  }

  /**
   * Generate a summary report of all images and filters applied
   */
  async exec(shared: SharedData): Promise<string> {
    const { processedImages, startTime, endTime, processingTimes } = shared;
    
    // Calculate overall processing time
    const totalProcessingTimeMs = endTime && startTime ? endTime - startTime : 0;
    const totalProcessingTimeSec = (totalProcessingTimeMs / 1000).toFixed(2);
    
    // Calculate average processing time per image/filter
    const avgProcessingTimeMs = processingTimes && processingTimes.length > 0 
      ? processingTimes.reduce((sum, item) => sum + item.timeMs, 0) / processingTimes.length
      : 0;
    
    // Calculate theoretical sequential time (sum of all processing times)
    const sequentialTimeMs = processingTimes 
      ? processingTimes.reduce((sum, item) => sum + item.timeMs, 0) 
      : 0;
    const sequentialTimeSec = (sequentialTimeMs / 1000).toFixed(2);
    
    // Calculate speedup factor
    const speedupFactor = sequentialTimeMs > 0 && totalProcessingTimeMs > 0
      ? (sequentialTimeMs / totalProcessingTimeMs).toFixed(2) 
      : 'N/A';
    
    const reportLines = [
      '===================================================',
      '         IMAGE PROCESSING COMPLETION REPORT        ',
      '===================================================',
      '',
      `Report generated on: ${new Date().toLocaleString()}`,
      `Total images processed: ${processedImages.length}`,
      '',
      'PROCESSING TIME SUMMARY:',
      `Total processing time: ${totalProcessingTimeSec} seconds`,
      `Theoretical sequential time: ${sequentialTimeSec} seconds`,
      `Speedup factor (parallel vs sequential): ${speedupFactor}x`,
      `Average processing time per task: ${(avgProcessingTimeMs / 1000).toFixed(3)} seconds`,
      '',
      'PROCESSED IMAGES:',
      ''
    ];
    
    // Add details for each processed image
    for (const image of processedImages) {
      const imageName = path.basename(image.imagePath);
      reportLines.push(`- ${imageName}`);
      reportLines.push(`  Filters applied: ${image.appliedFilters.join(', ')}`);
      
      // Add processing times for this image
      if (processingTimes) {
        const imageTimes = processingTimes.filter(t => t.imagePath === imageName);
        if (imageTimes.length > 0) {
          reportLines.push('  Processing times:');
          for (const time of imageTimes) {
            reportLines.push(`    - ${time.filter}: ${(time.timeMs / 1000).toFixed(3)} seconds`);
          }
        }
      }
      
      reportLines.push('');
    }
    
    reportLines.push('===================================================');
    reportLines.push('                 END OF REPORT                     ');
    reportLines.push('===================================================');
    
    return reportLines.join('\n');
  }

  /**
   * Write report to output folder
   */
  async post(shared: SharedData, _: SharedData, execRes: string): Promise<string | undefined> {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(shared.outputFolder)) {
      fs.mkdirSync(shared.outputFolder, { recursive: true });
    }
    
    // Write report to file
    const reportPath = path.join(shared.outputFolder, 'report.txt');
    fs.writeFileSync(reportPath, execRes);
    
    // Log summary of timing information to console
    const totalTime = shared.endTime && shared.startTime 
      ? (shared.endTime - shared.startTime) / 1000 
      : 0;
    
    console.log(`Report generated at ${reportPath}`);
    console.log(`Total processing time: ${totalTime.toFixed(2)} seconds`);
    
    if (shared.processingTimes && shared.processingTimes.length > 0) {
      const sequentialTime = shared.processingTimes.reduce((sum, item) => sum + item.timeMs, 0) / 1000;
      const speedup = (sequentialTime / totalTime).toFixed(2);
      console.log(`Sequential processing would have taken approximately ${sequentialTime.toFixed(2)} seconds`);
      console.log(`Parallel processing achieved a ${speedup}x speedup`);
    }
    
    return undefined; // End of flow
  }
} 