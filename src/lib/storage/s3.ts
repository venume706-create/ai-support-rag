import { AwsClient } from "aws4fetch";
import { isSafeKey, type StorageProvider } from "./types";

/**
 * S3-совместимое облако: Amazon S3, Cloudflare R2, Supabase Storage, Backblaze B2, MinIO.
 * Запросы подписываются AWS Signature V4 (aws4fetch), без тяжёлого AWS SDK.
 * Настройка: STORAGE_DRIVER=s3, S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION.
 */
export class S3Storage implements StorageProvider {
  private readonly client: AwsClient;

  constructor(
    private readonly endpoint: string,
    private readonly bucket: string,
    accessKeyId: string,
    secretAccessKey: string,
    region: string,
  ) {
    this.client = new AwsClient({ accessKeyId, secretAccessKey, region, service: "s3" });
  }

  private url(key: string): string {
    if (!isSafeKey(key)) throw new Error("Недопустимый ключ файла");
    return `${this.endpoint.replace(/\/$/, "")}/${this.bucket}/${key}`;
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    const res = await this.client.fetch(this.url(key), {
      method: "PUT",
      body: new Uint8Array(data),
      headers: { "content-type": contentType },
    });
    if (!res.ok) throw new Error(`Хранилище: не удалось сохранить файл (${res.status})`);
  }

  async get(key: string) {
    const res = await this.client.fetch(this.url(key), { method: "GET" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Хранилище: не удалось прочитать файл (${res.status})`);
    return { data: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get("content-type") ?? "image/webp" };
  }

  async delete(key: string): Promise<void> {
    const res = await this.client.fetch(this.url(key), { method: "DELETE" });
    if (!res.ok && res.status !== 404) throw new Error(`Хранилище: не удалось удалить файл (${res.status})`);
  }
}
