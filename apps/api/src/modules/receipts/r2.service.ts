import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface PresignedUrlResult {
  presignedUrl: string;
  r2Key: string;
  expiresIn: number;
}

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'R2_SECRET_ACCESS_KEY',
    );
    this.bucket = this.configService.get<string>('R2_BUCKET_NAME') ?? '';

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket) {
      throw new Error(
        'R2 configuration is incomplete: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME must be set',
      );
    }

    const endpoint =
      this.configService.get<string>('R2_ENDPOINT') ||
      `https://${accountId}.r2.cloudflarestorage.com`;
    const forcePathStyle = !!this.configService.get<string>('R2_ENDPOINT');

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      forcePathStyle,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Generate a presigned URL for uploading a file to R2.
   * The URL expires after `expiresIn` seconds (default 300).
   */
  async generatePresignedUrl(
    key: string,
    expiresIn: number = 300,
    fileType: string = 'image/jpeg',
  ): Promise<PresignedUrlResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: fileType,
    });

    const presignedUrl = await getSignedUrl(this.client, command, {
      expiresIn,
    });

    return { presignedUrl, r2Key: key, expiresIn };
  }

  /**
   * Build the public URL for a stored object.
   * Uses the configured public URL base if available, otherwise falls back
   * to the R2.dev subdomain.
   */
  getPublicUrl(r2Key: string): string {
    const publicUrlBase = this.configService.get<string>(
      'R2_PUBLIC_URL_BASE',
    );
    if (publicUrlBase) {
      return `${publicUrlBase.replace(/\/$/, '')}/${r2Key}`;
    }
    return `https://pub-${r2Key.slice(0, 2)}.r2.dev/${r2Key}`;
  }

  /**
   * Permanently delete an object from R2.
   * Throws if the deletion fails.
   */
  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (err) {
      this.logger.error(`R2 delete failed for key ${key}`, err);
      throw err;
    }
  }

  /**
   * Fetch an object's stream from R2. Used for proxying image downloads.
   */
  async getObject(r2Key: string) {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: r2Key,
        }),
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to fetch object from R2', { error, r2Key });
      throw error;
    }
  }
}