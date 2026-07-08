export abstract class StorageProvider {
  abstract saveFile(bucket: string, key: string, buffer: Buffer, mimeType: string): Promise<string>;
  abstract getFile(bucket: string, key: string): Promise<Buffer>;
  abstract deleteFile(bucket: string, key: string): Promise<void>;
  abstract fileExists(bucket: string, key: string): Promise<boolean>;
}
