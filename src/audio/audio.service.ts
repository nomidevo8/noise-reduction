/// <reference types="multer" />

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

@Injectable()
export class AudioService {
  async removeNoise(file: Express.Multer.File): Promise<string> {
    // Save storage directories relative to root folder
    const uploadDir = path.join(process.cwd(), 'storage', 'uploads');
    const enhancedDir = path.join(process.cwd(), 'storage', 'enhanced');

    // Create directories if they do not exist
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    if (!fs.existsSync(enhancedDir)) fs.mkdirSync(enhancedDir, { recursive: true });

    // Generate unique names to prevent filename collisions
    const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const inputExt = path.extname(file.originalname) || '.wav';
    
    const inputPath = path.join(uploadDir, `${uniqueId}${inputExt}`);
    const finalOutputPath = path.join(enhancedDir, `${uniqueId}_enhanced.wav`);

    try {
      // 1. Write the uploaded buffer memory onto the hard disk
      await fs.promises.writeFile(inputPath, file.buffer);

      // 2. Call the DeepFilterNet AI CLI command
      // DeepFilterNet maps the processed file name to match the input filename
    await execAsync(`deepFilter "${inputPath}" --output-dir "${enhancedDir}"`);

      // 3. Locate DeepFilterNet's output file and rename it cleanly
      const aiDefaultOutputPath = path.join(enhancedDir, `${uniqueId}${inputExt}`);
      
      if (!fs.existsSync(aiDefaultOutputPath)) {
        throw new Error('AI engine executed but failed to generate an output file.');
      }
      
      await fs.promises.rename(aiDefaultOutputPath, finalOutputPath);

      // 4. Safely clean up raw noisy audio in background
      fs.promises.unlink(inputPath).catch(() => null);

      return finalOutputPath;

    } catch (error) {
      // Clear files if execution fails halfway
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      throw new InternalServerErrorException(`AI Denoising Engine Error: ${error.message}`);
    }
  }
}
