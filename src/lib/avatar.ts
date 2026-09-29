import sharp from "sharp";
import { AVATAR_MAX_BYTES, AVATAR_SIZE, AVATAR_TYPES } from "./avatar-shared";

export class AvatarError extends Error {
  constructor(public readonly code: "type" | "size" | "invalid") {
    super(code);
  }
}

/** По первым байтам определяет реальный формат (расширению и Content-Type верить нельзя). */
export function sniffImageType(buf: Buffer): (typeof AVATAR_TYPES)[number] | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

/**
 * Проверяет и перекодирует загруженное фото: квадрат 512×512, WebP, без EXIF (геометки и т. п.).
 * Перекодирование заодно гарантирует, что в файле нет ничего, кроме картинки (нет SVG/скриптов).
 */
export async function processAvatar(input: Buffer): Promise<Buffer> {
  if (input.length === 0 || input.length > AVATAR_MAX_BYTES) throw new AvatarError("size");
  if (!sniffImageType(input)) throw new AvatarError("type");
  try {
    return await sharp(input, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new AvatarError("invalid");
  }
}
