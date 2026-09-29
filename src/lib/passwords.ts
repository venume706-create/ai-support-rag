import { randomInt } from "node:crypto";

const TEMP_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Читаемый временный пароль без похожих символов (0/o, 1/l/i). */
export function generateTempPassword(length = 8): string {
  return Array.from({ length }, () => TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)]).join("");
}
