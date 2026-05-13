/// <reference types="multer" />

import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile, 
  Res, 
  BadRequestException, 
  Get
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AudioService } from './audio.service';
import { Response } from 'express';

@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}


  @Get('/')
    async getStatus() {
      return { status: 'Audio AI Server is running' };
    }

  @Post('enhance')
  @UseInterceptors(FileInterceptor('file')) // Intercepts form-data parameter named 'file'
  async enhanceAudio(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response
  ) {
    if (!file) {
      throw new BadRequestException('Required file field "file" is missing from form-data payload.');
    }

    // Call service layer processing
    const enhancedFilePath = await this.audioService.removeNoise(file);

    // Stream the binary back with proper application attachments
    return res.sendFile(enhancedFilePath, (err) => {
      if (err) {
        // Handle stream interruptions or cancellation gracefully
        if (!res.headersSent) {
          res.status(500).send('Error downloading processed file.');
        }
      }
    });
  }
}
