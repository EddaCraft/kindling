import fs from 'fs';
import path from 'path';

/**
 * Reads all files from a directory
 * @param directoryPath Path to the directory to read
 * @returns Array of file paths
 */
export function readDirectory(directoryPath: string): string[] {
  try {
    const files = fs.readdirSync(directoryPath);
    // Filter for image files (jpg, png, jpeg, gif)
    return files
      .filter(file => 
        /\.(jpg|jpeg|png|gif)$/i.test(file))
      .map(file => path.join(directoryPath, file));
  } catch (error) {
    console.error(`Error reading directory ${directoryPath}:`, error);
    return [];
  }
} 