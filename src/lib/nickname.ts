import { db } from "@/lib/db";
import { checkNicknameFormat, nicknameKey, type NicknameProblem } from "@/lib/profile";

export type NicknameStatus =
  | { available: true; own: boolean }
  | { available: false; reason: NicknameProblem | "taken" };

/** Можно ли взять этот ник. Свой собственный ник считается свободным. */
export async function nicknameStatus(nickname: string, exceptUserId?: string): Promise<NicknameStatus> {
  const problem = checkNicknameFormat(nickname);
  if (problem) return { available: false, reason: problem };
  const owner = await db.user.findUnique({ where: { nicknameKey: nicknameKey(nickname) }, select: { id: true } });
  if (owner && owner.id !== exceptUserId) return { available: false, reason: "taken" };
  return { available: true, own: owner?.id === exceptUserId };
}
