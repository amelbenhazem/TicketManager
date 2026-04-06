import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';
import { v2 as cloudinary } from 'cloudinary';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

@Injectable()
export class TicketsAttachmentsService {
  constructor(private readonly config: ConfigService) {
    const cloudName = this.config.get<string>('cloudinary.cloudName');
    const apiKey = this.config.get<string>('cloudinary.apiKey');
    const apiSecret = this.config.get<string>('cloudinary.apiSecret');
    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    }
  }

  /**
   * Upload a single file buffer to Cloudinary. Returns the secure_url to store in ticket.attachments.
   */
  async uploadOne(buffer: Buffer, mimetype: string): Promise<string> {
    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} Mo)`,
      );
    }
    if (ALLOWED_MIMES.length > 0 && !ALLOWED_MIMES.includes(mimetype)) {
      throw new BadRequestException(
        `Type de fichier non autorisé. Autorisés : ${ALLOWED_MIMES.join(', ')}`,
      );
    }

    const cloudName = this.config.get<string>('cloudinary.cloudName');
    if (!cloudName) {
      throw new BadRequestException(
        'Cloudinary n’est pas configuré. Définir CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
      );
    }

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'ticketmanager',
          resource_type: 'auto',
        },
        (err, result) => {
          if (err) {
            reject(
              new BadRequestException(
                `Upload Cloudinary échoué: ${err.message}`,
              ),
            );
            return;
          }
          if (!result?.secure_url) {
            reject(
              new BadRequestException(
                'Upload Cloudinary n’a pas retourné d’URL',
              ),
            );
            return;
          }
          resolve(result.secure_url);
        },
      );
      Readable.from(buffer).pipe(stream);
    });
  }

  /**
   * Upload multiple files; returns array of Cloudinary secure_url in the same order.
   */
  async uploadMany(
    files: Array<{ buffer: Buffer; mimetype: string; originalname?: string }>,
  ): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const url = await this.uploadOne(file.buffer, file.mimetype);
      urls.push(url);
    }
    return urls;
  }
}
