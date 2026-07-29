export type EmailStatus =
  | 'pending'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'rescheduled';

export interface Email {
  id: string;
  campaignId: string;
  emailAddress: string;
  subject: string;
  body: string;
  scheduledTime: string;
  status: EmailStatus;
  sender: string;
  bullmqJobId: string | null;
  attemptCount: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateCampaignRequest {
  subject: string;
  bodyTemplate: string;
  recipients: string[];
  startTime: string;
  delayBetweenMs?: number;
  hourlyLimit?: number;
  sender: string;
}

export interface CreateCampaignResponse {
  id: string;
  recipientCount: number;
  startTime: string;
}
