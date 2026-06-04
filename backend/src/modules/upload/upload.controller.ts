import { Controller, Post, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private config: ConfigService) {}

  // Generate a signed upload signature so frontend can upload directly to Cloudinary
  // API_SECRET never leaves the backend
  @Post('sign')
  sign(@Body() body: { folder?: string; publicId?: string }) {
    const cloudName = this.config.get('CLOUDINARY_CLOUD_NAME');
    const apiKey    = this.config.get('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new BadRequestException('Cloudinary not configured on server');
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder    = body.folder || 'payrollos';

    // Build the string to sign (must match what frontend sends to Cloudinary)
    const params: Record<string, string | number> = {
      folder,
      timestamp,
    };
    if (body.publicId) params.public_id = body.publicId;

    // Sort params alphabetically and build query string
    const toSign = Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&');

    const signature = crypto
      .createHash('sha256')
      .update(toSign + apiSecret)
      .digest('hex');

    return {
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    };
  }
}
