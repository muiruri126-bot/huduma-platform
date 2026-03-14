import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { randomUUID } from 'crypto';
import { UploadType } from './dto/upload.dto';

@Injectable()
export class UploadService {
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get('CLOUDINARY_API_KEY'),
      api_secret: this.config.get('CLOUDINARY_API_SECRET'),
    });
  }

  private readonly allowedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  private readonly allowedDocTypes = [
    'image/jpeg',
    'image/png',
    'application/pdf',
  ];

  private readonly maxImageSize = 5 * 1024 * 1024; // 5MB
  private readonly maxDocSize = 10 * 1024 * 1024; // 10MB

  async uploadFile(
    file: Express.Multer.File,
    type: UploadType,
    userId: string,
  ): Promise<{ url: string; key: string }> {
    this.validateFile(file, type);

    const publicId = `huduma/${type}/${userId}/${randomUUID()}`;

    const result: UploadApiResponse = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            public_id: publicId,
            resource_type: type === UploadType.VERIFICATION_DOC ? 'raw' : 'image',
            folder: undefined,
          },
          (error, result) => {
            if (error || !result) return reject(error || new Error('Upload failed'));
            resolve(result);
          },
        )
        .end(file.buffer);
    });

    return { url: result.secure_url, key: result.public_id };
  }

  async deleteFile(key: string): Promise<void> {
    await cloudinary.uploader.destroy(key).catch(() => {});
  }

  private validateFile(file: Express.Multer.File, type: UploadType) {
    const isDoc = type === UploadType.VERIFICATION_DOC;
    const allowedTypes = isDoc ? this.allowedDocTypes : this.allowedImageTypes;
    const maxSize = isDoc ? this.maxDocSize : this.maxImageSize;

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
      );
    }

    if (file.size > maxSize) {
      throw new BadRequestException(
        `File too large. Max: ${maxSize / (1024 * 1024)}MB`,
      );
    }
  }
}
