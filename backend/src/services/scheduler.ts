import { prisma } from '../lib/prisma';
import { getEmailQueue } from '../lib/queue';
import { Email } from '@prisma/client';

export const JOB_ID_PREFIX = 'email_send_';

export function getJobId(emailId: string): string {
  return `${JOB_ID_PREFIX}${emailId}`;
}

export async function enqueueEmailJob(email: Email): Promise<void> {
  const queue = getEmailQueue();
  const jobId = getJobId(email.id);
  const now = Date.now();
  const scheduledAt = email.scheduledTime.getTime();
  const delay = Math.max(0, scheduledAt - now);

  await queue.add(
    'send-email',
    { emailId: email.id },
    {
      jobId,
      delay,
    },
  );
}

export interface CreateCampaignInput {
  subject: string;
  bodyTemplate: string;
  recipients: string[];
  startTime: Date;
  delayBetweenMs: number;
  hourlyLimit: number;
  sender: string;
}

export async function createCampaign(input: CreateCampaignInput) {
  const { subject, bodyTemplate, recipients, startTime, delayBetweenMs, hourlyLimit, sender } = input;

  
  const uniqueRecipients = [...new Set(recipients.map((r) => r.toLowerCase().trim()))].filter(Boolean);

  
  const emailData = uniqueRecipients.map((address, index) => {
    const scheduledTime = new Date(startTime.getTime() + index * delayBetweenMs);
    
    const body = bodyTemplate.replace(/\{\{email\}\}/gi, address);
    return {
      emailAddress: address,
      subject,
      body,
      scheduledTime,
      sender,
    };
  });

  
  const campaign = await prisma.campaign.create({
    data: {
      subject,
      bodyTemplate,
      startTime,
      delayBetweenMs,
      hourlyLimit,
      sender,
      recipientCount: uniqueRecipients.length,
      emails: {
        create: emailData,
      },
    },
    include: {
      emails: true,
    },
  });

  
  const enqueuePromises = campaign.emails.map(async (email) => {
    try {
      await enqueueEmailJob(email);
      await prisma.email.update({
        where: { id: email.id },
        data: {
          status: 'scheduled',
          bullmqJobId: getJobId(email.id),
        },
      });
    } catch (err) {
      
      console.error(`[Scheduler] Failed to enqueue email ${email.id}:`, err);
    }
  });

  await Promise.all(enqueuePromises);

  return campaign;
}

export async function reconcilePendingEmails(): Promise<void> {
  console.log('[Reconciliation] Starting startup reconciliation...');

  const pendingEmails = await prisma.email.findMany({
    where: {
      status: {
        in: ['pending', 'scheduled', 'rescheduled'],
      },
    },
  });

  if (pendingEmails.length === 0) {
    console.log('[Reconciliation] No pending emails found. All clear.');
    return;
  }

  console.log(`[Reconciliation] Found ${pendingEmails.length} emails to reconcile.`);

  const queue = getEmailQueue();
  let requeued = 0;
  let skipped = 0;

  for (const email of pendingEmails) {
    const jobId = getJobId(email.id);

    
    const existingJob = await queue.getJob(jobId);

    if (existingJob) {
      
      skipped++;
      continue;
    }

    
    try {
      await enqueueEmailJob(email);
      await prisma.email.update({
        where: { id: email.id },
        data: {
          status: 'scheduled',
          bullmqJobId: jobId,
        },
      });
      requeued++;
    } catch (err) {
      console.error(`[Reconciliation] Failed to re-enqueue email ${email.id}:`, err);
    }
  }

  console.log(`[Reconciliation] Complete. Re-queued: ${requeued}, Already queued: ${skipped}.`);
}
