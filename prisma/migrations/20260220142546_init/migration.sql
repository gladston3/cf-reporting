-- CreateEnum
CREATE TYPE "ConnectionType" AS ENUM ('ZONE', 'ACCOUNT');

-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "cloudflare_connections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ConnectionType" NOT NULL,
    "zoneId" TEXT,
    "accountId" TEXT,
    "tokenEncrypted" BYTEA NOT NULL,
    "tokenIv" BYTEA NOT NULL,
    "tokenAuthTag" BYTEA NOT NULL,
    "email" TEXT,
    "permissions" TEXT[],
    "lastUsed" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cloudflare_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "frequency" "ScheduleFrequency" NOT NULL,
    "cronExpression" TEXT,
    "timeframeDays" INTEGER NOT NULL DEFAULT 7,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "emailRecipients" TEXT[],
    "webhookUrl" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "lastRun" TIMESTAMP(3),
    "nextRun" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "connectionId" TEXT NOT NULL,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_reports" (
    "id" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "templateId" TEXT NOT NULL,
    "timeframeStart" TIMESTAMP(3) NOT NULL,
    "timeframeEnd" TIMESTAMP(3) NOT NULL,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "connectionId" TEXT NOT NULL,
    "scheduleId" TEXT,

    CONSTRAINT "generated_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generated_reports_status_idx" ON "generated_reports"("status");

-- CreateIndex
CREATE INDEX "generated_reports_connectionId_idx" ON "generated_reports"("connectionId");

-- CreateIndex
CREATE INDEX "generated_reports_scheduleId_idx" ON "generated_reports"("scheduleId");

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "cloudflare_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "cloudflare_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "report_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
