-- CreateTable
CREATE TABLE "TeacherNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherNote_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentAchievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "earnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seen" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "StudentAchievement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "actorLabel" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL DEFAULT '',
    "targetId" TEXT NOT NULL DEFAULT '',
    "targetLabel" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "login" TEXT NOT NULL,
    "userId" TEXT,
    "success" BOOLEAN NOT NULL,
    "device" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SecurityAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "firstAt" DATETIME NOT NULL,
    "lastAt" DATETIME NOT NULL,
    "device" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "link" TEXT NOT NULL DEFAULT '',
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "fullName" TEXT NOT NULL,
    "nickname" TEXT,
    "nicknameKey" TEXT,
    "searchKey" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "birthDate" DATETIME,
    "avatarKey" TEXT,
    "avatarVersion" INTEGER NOT NULL DEFAULT 0,
    "avatarFrame" TEXT NOT NULL DEFAULT 'none',
    "cardColor" TEXT NOT NULL DEFAULT 'cream',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Имя и фамилия берём из fullName; дата рождения переезжает из Student в User
INSERT INTO "new_User" ("createdAt", "fullName", "firstName", "lastName", "birthDate", "id", "isActive", "login", "passwordHash", "phone", "role", "searchKey")
SELECT "createdAt", "fullName",
  CASE WHEN instr("fullName", ' ') > 0 THEN substr("fullName", 1, instr("fullName", ' ') - 1) ELSE "fullName" END,
  CASE WHEN instr("fullName", ' ') > 0 THEN trim(substr("fullName", instr("fullName", ' ') + 1)) ELSE '' END,
  (SELECT "birthDate" FROM "Student" WHERE "Student"."userId" = "User"."id"),
  "id", "isActive", "login", "passwordHash", "phone", "role", "searchKey"
FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");
CREATE UNIQUE INDEX "User_nicknameKey_key" ON "User"("nicknameKey");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_searchKey_idx" ON "User"("searchKey");
CREATE TABLE "new_Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "parentPhone" TEXT NOT NULL DEFAULT '',
    "showInLeaderboard" BOOLEAN NOT NULL DEFAULT true,
    "seenRank" INTEGER,
    CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Student" ("id", "parentPhone", "userId") SELECT "id", "parentPhone", "userId" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TeacherNote_studentId_teacherId_idx" ON "TeacherNote"("studentId", "teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAchievement_studentId_code_key" ON "StudentAchievement"("studentId", "code");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "LoginAttempt_userId_createdAt_idx" ON "LoginAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_login_createdAt_idx" ON "LoginAttempt"("login", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAlert_status_createdAt_idx" ON "SecurityAlert"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAlert_userId_idx" ON "SecurityAlert"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

