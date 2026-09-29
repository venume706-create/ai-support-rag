import http from "node:http";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AvatarError, processAvatar, sniffImageType } from "@/lib/avatar";
import { createStorage } from "@/lib/storage";
import { LocalStorage } from "@/lib/storage/local";
import { isSafeKey } from "@/lib/storage/types";

const png = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: "#b8893a" } }).png().toBuffer();

describe("ключ файла", () => {
  it("принимает только avatars/<id>.webp", () => {
    expect(isSafeKey("avatars/abc123-1.webp")).toBe(true);
    for (const bad of ["../etc/passwd", "avatars/../x.webp", "avatars/a/b.webp", "avatars/a.png", "/avatars/a.webp", "avatars/.webp", ""]) {
      expect(isSafeKey(bad)).toBe(false);
    }
  });
});

describe("локальное хранилище", () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "edu-storage-"));
  });
  afterAll(() => rm(dir, { recursive: true, force: true }));

  it("сохраняет, читает и удаляет файл", async () => {
    const s = new LocalStorage(dir);
    await s.put("avatars/u1-1.webp", Buffer.from("data"));
    expect((await s.get("avatars/u1-1.webp"))?.data.toString()).toBe("data");
    await s.delete("avatars/u1-1.webp");
    expect(await s.get("avatars/u1-1.webp")).toBeNull();
    await s.delete("avatars/u1-1.webp"); // повторное удаление — не ошибка
  });

  it("отказывается писать за пределы папки", async () => {
    const s = new LocalStorage(dir);
    await expect(s.put("../evil.webp", Buffer.from("x"))).rejects.toThrow();
    expect((await readdir(path.dirname(dir))).includes("evil.webp")).toBe(false);
  });
});

describe("выбор хранилища по .env", () => {
  it("по умолчанию — локальное, s3 требует настроек, неизвестный драйвер — ошибка", () => {
    expect(createStorage({})).toBeInstanceOf(LocalStorage);
    expect(() => createStorage({ STORAGE_DRIVER: "s3" })).toThrow(/S3_ENDPOINT/);
    expect(() => createStorage({ STORAGE_DRIVER: "ftp" })).toThrow(/Неизвестный/);
  });
});

describe("S3-хранилище (эмулятор на локальном сервере)", () => {
  const objects = new Map<string, Buffer>();
  const seen: { method: string; url: string; auth: string }[] = [];
  let server: http.Server;
  let endpoint = "";

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        seen.push({ method: req.method!, url: req.url!, auth: String(req.headers.authorization ?? "") });
        if (req.method === "PUT") {
          objects.set(req.url!, Buffer.concat(chunks));
          res.writeHead(200).end();
        } else if (req.method === "GET") {
          const o = objects.get(req.url!);
          if (!o) return void res.writeHead(404).end();
          res.writeHead(200, { "content-type": "image/webp" }).end(o);
        } else if (req.method === "DELETE") {
          objects.delete(req.url!);
          res.writeHead(204).end();
        }
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    endpoint = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it("PUT/GET/DELETE идут с подписью AWS SigV4 в нужный бакет", async () => {
    const s = createStorage({ STORAGE_DRIVER: "s3", S3_ENDPOINT: endpoint, S3_BUCKET: "edu", S3_ACCESS_KEY_ID: "AK", S3_SECRET_ACCESS_KEY: "SK", S3_REGION: "auto" });
    await s.put("avatars/u1-1.webp", Buffer.from("hello"), "image/webp");
    expect((await s.get("avatars/u1-1.webp"))?.data.toString()).toBe("hello");
    await s.delete("avatars/u1-1.webp");
    expect(await s.get("avatars/u1-1.webp")).toBeNull();
    expect(seen.map((r) => r.method)).toEqual(["PUT", "GET", "DELETE", "GET"]);
    for (const r of seen) {
      expect(r.url).toBe("/edu/avatars/u1-1.webp");
      expect(r.auth).toMatch(/^AWS4-HMAC-SHA256 Credential=AK\/\d{8}\/auto\/s3\/aws4_request/);
    }
  });
});

describe("обработка фото", () => {
  it("приводит к квадрату 512×512 WebP", async () => {
    const out = await processAvatar(await png(1200, 800));
    const meta = await sharp(out).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["webp", 512, 512]);
  });

  it("принимает jpg, png и webp", async () => {
    const jpg = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#123456" } }).jpeg().toBuffer();
    const webp = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#123456" } }).webp().toBuffer();
    for (const f of [jpg, webp, await png(64, 64)]) expect((await sharp(await processAvatar(f)).metadata()).format).toBe("webp");
  });

  it("убирает EXIF (геолокация и т. п.)", async () => {
    const withExif = await sharp(await png(64, 64)).withExif({ IFD0: { Copyright: "secret-geo" } }).jpeg().toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();
    expect((await sharp(await processAvatar(withExif)).metadata()).exif).toBeUndefined();
  });

  it("отклоняет SVG, GIF, текст и подделку под картинку", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const gif = Buffer.from("GIF89a\x01\x00\x01\x00\x00\x00\x00;", "binary");
    for (const bad of [svg, gif, Buffer.from("just text")]) await expect(processAvatar(bad)).rejects.toMatchObject({ code: "type" });
    // правильные первые байты PNG, но внутри мусор
    const fake = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("garbage")]);
    await expect(processAvatar(fake)).rejects.toMatchObject({ code: "invalid" });
  });

  it("отклоняет пустой файл и файл больше 5 МБ", async () => {
    await expect(processAvatar(Buffer.alloc(0))).rejects.toBeInstanceOf(AvatarError);
    const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(5 * 1024 * 1024)]);
    await expect(processAvatar(big)).rejects.toMatchObject({ code: "size" });
  });

  it("sniffImageType определяет формат по содержимому, а не по имени", () => {
    expect(sniffImageType(Buffer.from("<svg/>"))).toBeNull();
  });
});
