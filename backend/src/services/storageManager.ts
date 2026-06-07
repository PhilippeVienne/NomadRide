import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export interface IStorageManager {
  save(key: string, data: string | Buffer, contentType?: string): Promise<void>;
  get(key: string): Promise<string | Buffer>;
  exists(key: string): Promise<boolean>;
}

export class StorageManager implements IStorageManager {
  private mode: 'LOCAL' | 'S3';
  private localCacheDir: string;
  private s3Client: S3Client | null = null;
  private bucketName: string;

  constructor() {
    this.mode = (process.env.STORAGE_MODE || 'LOCAL').toUpperCase() as 'LOCAL' | 'S3';
    this.localCacheDir = path.resolve(process.env.LOCAL_CACHE_DIR || './cache/arome');
    this.bucketName = process.env.S3_BUCKET_NAME || 'nomadride-weather-cache';

    if (this.mode === 'S3') {
      const region = process.env.AWS_REGION || 'eu-west-3';
      this.s3Client = new S3Client({ region });
      console.log(`[StorageManager] Initialized in S3 mode. Bucket: ${this.bucketName}, Region: ${region}`);
    } else {
      console.log(`[StorageManager] Initialized in LOCAL mode. Directory: ${this.localCacheDir}`);
      // Ensure the local directory exists
      if (!fs.existsSync(this.localCacheDir)) {
        fs.mkdirSync(this.localCacheDir, { recursive: true });
      }
    }
  }

  /**
   * Saves data (string or Buffer) to storage.
   * In S3 mode, includes Cache-Control metadata for client-side caching.
   */
  async save(key: string, data: string | Buffer, contentType: string = 'application/json'): Promise<void> {
    if (this.mode === 'S3' && this.s3Client) {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: data,
        ContentType: contentType,
        CacheControl: 'max-age=31536000, immutable',
      });
      await this.s3Client.send(command);
      console.log(`[StorageManager] Saved to S3: s3://${this.bucketName}/${key}`);
    } else {
      const filePath = path.join(this.localCacheDir, key);
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        await fs.promises.mkdir(dirPath, { recursive: true });
      }
      await fs.promises.writeFile(filePath, data);
      console.log(`[StorageManager] Saved locally: ${filePath}`);
    }
  }

  /**
   * Retrieves data from storage.
   */
  async get(key: string): Promise<string | Buffer> {
    if (this.mode === 'S3' && this.s3Client) {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      const response = await this.s3Client.send(command);
      if (!response.Body) {
        throw new Error(`Empty body returned for S3 object: ${key}`);
      }
      return await response.Body.transformToString();
    } else {
      const filePath = path.join(this.localCacheDir, key);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found in local cache: ${filePath}`);
      }
      return await fs.promises.readFile(filePath, 'utf-8');
    }
  }

  /**
   * Checks if a file exists in storage.
   */
  async exists(key: string): Promise<boolean> {
    if (this.mode === 'S3' && this.s3Client) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });
        await this.s3Client.send(command);
        return true;
      } catch (err: any) {
        if (err.name === 'NoSuchKey') {
          return false;
        }
        throw err;
      }
    } else {
      const filePath = path.join(this.localCacheDir, key);
      return fs.existsSync(filePath);
    }
  }
}
