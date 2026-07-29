import { PaginatedResponse, Email, CreateCampaignRequest, CreateCampaignResponse } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `API error ${res.status}`);
  }

  return res.json();
}

export async function fetchEmails(params: {
  status?: string;
  campaignId?: string;
  sender?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Email>> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.campaignId) query.set('campaignId', params.campaignId);
  if (params.sender) query.set('sender', params.sender);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  return apiFetch<PaginatedResponse<Email>>(`/api/emails?${query.toString()}`);
}

export async function createCampaign(data: CreateCampaignRequest): Promise<CreateCampaignResponse> {
  return apiFetch<CreateCampaignResponse>('/api/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
