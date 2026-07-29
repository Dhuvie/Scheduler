import 'dotenv/config';
import { createCampaign } from '../services/scheduler';
import { prisma } from '../lib/prisma';

const COUNT = parseInt(process.env.SEED_COUNT || '20', 10);
const HOURLY_LIMIT = parseInt(process.env.SEED_HOURLY_LIMIT || '5', 10);
const DELAY_MS = parseInt(process.env.SEED_DELAY_MS || '2000', 10);

async function seed() {
  console.log(`[Seed] Creating campaign with ${COUNT} recipients...`);
  console.log(`[Seed] Hourly limit: ${HOURLY_LIMIT}, Delay between emails: ${DELAY_MS}ms`);

  const recipients = Array.from({ length: COUNT }, (_, i) =>
    `test.user.${i + 1}@example.com`,
  );

  const campaign = await createCampaign({
    subject: '[LOAD TEST] Hello from ReachInbox Scheduler',
    bodyTemplate: `<h1>Hello!</h1><p>This is a load test email for {{email}}. It was sent via the ReachInbox Email Scheduler.</p>`,
    recipients,
    startTime: new Date(Date.now() + 5000), 
    delayBetweenMs: DELAY_MS,
    hourlyLimit: HOURLY_LIMIT,
    sender: 'scheduler@example.com',
  });

  console.log(`[Seed] Campaign created: ${campaign.id}`);
  console.log(`[Seed] Recipients scheduled: ${campaign.recipientCount}`);
  console.log(`[Seed] With a ${HOURLY_LIMIT}/hr limit, the rate limiter should kick in after the first ${HOURLY_LIMIT} emails.`);
  console.log(`[Seed] Start the worker with: npm run worker`);

  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error('[Seed] Error:', err);
  process.exit(1);
});
