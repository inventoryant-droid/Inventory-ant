import { Injectable } from '@nestjs/common';
import { StorageProvider } from './storage.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageProvider extends StorageProvider {
  private readonly baseDir = path.join(process.cwd(), 'uploads');

  constructor() {
    super();
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getPath(bucket: string, key: string): string {
    const bucketDir = path.join(this.baseDir, bucket);
    if (!fs.existsSync(bucketDir)) {
      fs.mkdirSync(bucketDir, { recursive: true });
    }
    return path.join(bucketDir, key);
  }

  async saveFile(bucket: string, key: string, buffer: Buffer, mimeType: string): Promise<string> {
    const filePath = this.getPath(bucket, key);
    await fs.promises.writeFile(filePath, buffer);
    // Return relative URL/filepath for simple compatibility
    return `/uploads/${bucket}/${key}`;
  }

  async getFile(bucket: string, key: string): Promise<Buffer> {
    const filePath = this.getPath(bucket, key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${bucket}/${key}`);
    }
    return fs.promises.readFile(filePath);
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    const filePath = this.getPath(bucket, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  async fileExists(bucket: string, key: string): Promise<boolean> {
    const filePath = this.getPath(bucket, key);
    return fs.existsSync(filePath);
  }
}
