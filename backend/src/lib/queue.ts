import { Queue, QueueEvents } from 'bullmq';
import { getRedis } from './redis';

export const EMAIL_QUEUE_NAME = 'email-send';

let emailQueue: Queue | null = null;
let queueEvents: QueueEvents | null = null;

export function getEmailQueue(): Queue {
  if (!emailQueue) {
    emailQueue = new Queue(EMAIL_QUEUE_NAME, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, 
        },
        removeOnComplete: {
          count: 1000,
          age: 60 * 60 * 24 * 7, 
        },
        removeOnFail: {
          count: 500,
          age: 60 * 60 * 24 * 30, 
        },
      },
    });

    console.log(`[Queue] ${EMAIL_QUEUE_NAME} queue initialized`);
  }

  return emailQueue;
}

export function getQueueEvents(): QueueEvents {
  if (!queueEvents) {
    queueEvents = new QueueEvents(EMAIL_QUEUE_NAME, {
      connection: getRedis(),
    });
  }
  return queueEvents;
}

export async function closeQueue(): Promise<void> {
  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
  }
  if (queueEvents) {
    await queueEvents.close();
    queueEvents = null;
  }
}
