import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { getRedis } from './lib/redis';
import { prisma } from './lib/prisma';
import { sendEmail } from './lib/mailer';
import { checkAndConsumeRateLimit } from './lib/rateLimiter';
import { EMAIL_QUEUE_NAME } from './lib/queue';
import { getEmailQueue } from './lib/queue';
import { getJobId } from './services/scheduler';
import { config } from './config';

interface EmailJobData {
  emailId: string;
}

const worker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job: Job<EmailJobData>) => {
    const { emailId } = job.data;
    console.log(`[Worker] Processing job ${job.id} for email ${emailId}`);

    
    const email = await prisma.email.findUnique({
      where: { id: emailId },
      include: { campaign: true },
    });

    if (!email) {
      console.error(`[Worker] Email ${emailId} not found in DB. Skipping.`);
      return;
    }

    
    if (email.status === 'sent') {
      console.log(`[Worker] Email ${emailId} already sent. Skipping (idempotency guard).`);
      return;
    }

    
    const rateLimitResult = await checkAndConsumeRateLimit(
      email.campaignId,
      email.sender,
      email.campaign.hourlyLimit,
    );

    if (!rateLimitResult.allowed) {
      const retryAfterMs = rateLimitResult.retryAfterMs ?? 3600000;
      console.log(
        `[Worker] Rate limit hit for campaign ${email.campaignId}. ` +
        `Rescheduling email ${emailId} by ${Math.ceil(retryAfterMs / 1000)}s.`
      );

      
      const queue = getEmailQueue();
      const newJobId = getJobId(emailId);
      await queue.add(
        'send-email',
        { emailId },
        {
          jobId: `${newJobId}_retry_${Date.now()}`, 
          delay: retryAfterMs,
        },
      );

      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'rescheduled',
          lastError: `Rate limit exceeded. Rescheduled by ${Math.ceil(retryAfterMs / 1000)}s.`,
        },
      });

      return; 
    }

    
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'sending',
        attemptCount: { increment: 1 },
      },
    });

    
    try {
      const { messageId, previewUrl } = await sendEmail({
        to: email.emailAddress,
        from: email.sender,
        subject: email.subject,
        html: email.body,
      });

      
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'sent',
          sentAt: new Date(),
          lastError: null,
        },
      });

      console.log(
        `[Worker] ✓ Email ${emailId} sent. messageId=${messageId}` +
        (previewUrl ? ` preview=${previewUrl}` : '')
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Worker] ✗ Failed to send email ${emailId}: ${errorMsg}`);

      // Mark as failed — BullMQ will retry based on attempts config
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'failed',
          lastError: errorMsg,
        },
      });

      
      throw err;
    }
  },
  {
    connection: getRedis(),
    concurrency: config.worker.concurrency,
    
    
    
    limiter: {
      max: 1,
      duration: config.rateLimits.minDelayBetweenSendsMs,
    },
  },
);

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed.`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
});

worker.on('error', (err) => {
  console.error('[Worker] Worker error:', err);
});

console.log(
  `[Worker] Started. concurrency=${config.worker.concurrency}, ` +
  `minDelay=${config.rateLimits.minDelayBetweenSendsMs}ms`
);


async function shutdown() {
  console.log('[Worker] Shutting down gracefully...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
