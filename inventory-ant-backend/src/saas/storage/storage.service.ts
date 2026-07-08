import { Injectable, Inject } from '@nestjs/common';
import { StorageProvider } from './storage.interface';

@Injectable()
export class StorageService {
  constructor(
    @Inject('StorageProvider') private readonly storageProvider: StorageProvider,
  ) {}

  async saveFile(bucket: string, key: string, buffer: Buffer, mimeType: string): Promise<string> {
    return this.storageProvider.saveFile(bucket, key, buffer, mimeType);
  }

  async getFile(bucket: string, key: string): Promise<Buffer> {
    return this.storageProvider.getFile(bucket, key);
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    await this.storageProvider.deleteFile(bucket, key);
  }

  async fileExists(bucket: string, key: string): Promise<boolean> {
    return this.storageProvider.fileExists(bucket, key);
  }
}
