import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ALLOWED_CV_MIMES = ['application/pdf'];
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

export interface SignedUploadParams {
  bucket: 'cv' | 'logo';
  key: string;
  contentType: string;
  maxBytes: number;
}

@Injectable()
export class StorageService {
  private client?: S3Client;

  private getClient(): S3Client {
    if (this.client) return this.client;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    return this.client;
  }

  async getSignedUploadUrl(params: SignedUploadParams): Promise<{ uploadUrl: string; publicUrl: string }> {
    const allowed = params.bucket === 'cv' ? ALLOWED_CV_MIMES : ALLOWED_IMAGE_MIMES;
    if (!allowed.includes(params.contentType)) {
      throw new BadRequestException(`Content type ${params.contentType} not allowed for bucket ${params.bucket}`);
    }
    if (params.maxBytes <= 0 || params.maxBytes > 10_000_000) {
      throw new BadRequestException('maxBytes must be in [1, 10_000_000]');
    }

    if (process.env.STORAGE_PROVIDER === 'mock') {
      return {
        uploadUrl: `mock://upload/${params.bucket}/${params.key}`,
        publicUrl: `mock://public/${params.bucket}/${params.key}`,
      };
    }

    const bucketName = process.env.R2_BUCKET!;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `${params.bucket}/${params.key}`,
      ContentType: params.contentType,
    });
    const uploadUrl = await getSignedUrl(this.getClient(), command, { expiresIn: 600 });
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${params.bucket}/${params.key}`;
    return { uploadUrl, publicUrl };
  }
}
