-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "delayBetweenMs" INTEGER NOT NULL,
    "hourlyLimit" INTEGER NOT NULL,
    "sender" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emails" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sender" TEXT NOT NULL,
    "bullmqJobId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "emails_bullmqJobId_key" ON "emails"("bullmqJobId");

-- CreateIndex
CREATE INDEX "emails_status_idx" ON "emails"("status");

-- CreateIndex
CREATE INDEX "emails_campaignId_idx" ON "emails"("campaignId");

-- CreateIndex
CREATE INDEX "emails_scheduledTime_idx" ON "emails"("scheduledTime");

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
