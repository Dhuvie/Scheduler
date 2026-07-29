'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { RotateCcw, SlidersHorizontal, Search, Clock, Check } from 'lucide-react';
import { EmailRow } from './EmailRow';
import { useSession } from 'next-auth/react';
import { fetchEmails } from '@/lib/api';
import { Email } from '@/types';

const POLL_INTERVAL_MS = 15000;


function daysFromNow(days: number, hours = 9, mins = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hours, mins, 0, 0);
  return d.toISOString();
}
function daysAgo(days: number, hours = 10, mins = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hours, mins, 0, 0);
  return d.toISOString();
}
const now = new Date().toISOString();


const MOCK_SCHEDULED: Email[] = [
  {
    id: 'mock-1',
    campaignId: 'camp-1',
    emailAddress: 'john.smith@acme.com',
    subject: 'Meeting follow-up - Scheduled',
    body: '<p>Hi John, just wanted to follow up on our meeting last Tuesday. Let me know if you have any questions about the proposal.</p>',
    scheduledTime: daysFromNow(1, 9, 15),
    status: 'scheduled',
    sender: 'oliver.brown@domain.io',
    bullmqJobId: 'email_send_mock-1',
    attemptCount: 0,
    lastError: null,
    sentAt: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'mock-2',
    campaignId: 'camp-1',
    emailAddress: 'olive.martinez@startup.io',
    subject: "Ramit, great to meet you - you'll love it",
    body: '<p>Hi Olive, just wanted to follow up on our meeting. Really excited about the potential collaboration!</p>',
    scheduledTime: daysFromNow(2, 20, 15),
    status: 'scheduled',
    sender: 'oliver.brown@domain.io',
    bullmqJobId: 'email_send_mock-2',
    attemptCount: 0,
    lastError: null,
    sentAt: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'mock-3',
    campaignId: 'camp-2',
    emailAddress: 'alex.chen@techcorp.com',
    subject: 'Quick intro - ReachInbox partnership',
    body: '<p>Hey Alex, I came across your work on AI tooling and thought there might be some great synergy. Want to chat for 15 mins?</p>',
    scheduledTime: daysFromNow(3, 10, 30),
    status: 'pending',
    sender: 'oliver.brown@domain.io',
    bullmqJobId: null,
    attemptCount: 0,
    lastError: null,
    sentAt: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'mock-4',
    campaignId: 'camp-2',
    emailAddress: 'priya.kapoor@ventures.vc',
    subject: 'Following up on our demo call',
    body: '<p>Hi Priya, thanks so much for the time you gave us on the demo. Attaching the one-pager as discussed.</p>',
    scheduledTime: daysFromNow(3, 14, 0),
    status: 'scheduled',
    sender: 'oliver.brown@domain.io',
    bullmqJobId: 'email_send_mock-4',
    attemptCount: 0,
    lastError: null,
    sentAt: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'mock-5',
    campaignId: 'camp-3',
    emailAddress: 'marcus.johnson@enterprise.co',
    subject: 'Your free trial is ready',
    body: '<p>Hey Marcus, your ReachInbox trial account is all set. Here is everything you need to get started and see results in the first week.</p>',
    scheduledTime: daysFromNow(4, 9, 0),
    status: 'rescheduled',
    sender: 'oliver.brown@domain.io',
    bullmqJobId: 'email_send_mock-5',
    attemptCount: 1,
    lastError: 'Rate limit exceeded. Rescheduled by 3600s.',
    sentAt: null,
    createdAt: now,
    updatedAt: now,
  },
];

const MOCK_SENT: Email[] = [
  {
    id: 'mock-s1',
    campaignId: 'camp-0',
    emailAddress: 'sarah.wilson@company.com',
    subject: 'Re: Project Update',
    body: '<p>Thanks for the update, Sarah. Looks good!</p>',
    scheduledTime: daysAgo(1, 10, 0),
    status: 'sent',
    sender: 'oliver.brown@domain.io',
    bullmqJobId: 'email_send_mock-s1',
    attemptCount: 1,
    lastError: null,
    sentAt: daysAgo(1, 10, 22),
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'mock-s2',
    campaignId: 'camp-0',
    emailAddress: 'support@helpdesk.io',
    subject: 'Issue with login',
    body: '<p>I am having trouble logging in to the dashboard...</p>',
    scheduledTime: daysAgo(1, 11, 0),
    status: 'sent',
    sender: 'oliver.brown@domain.io',
    bullmqJobId: 'email_send_mock-s2',
    attemptCount: 1,
    lastError: null,
    sentAt: daysAgo(1, 11, 5),
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'mock-s3',
    campaignId: 'camp-0',
    emailAddress: 'david.lee@marketing.agency',
    subject: 'Cold outreach - Q3 partnership',
    body: '<p>Hi David, reaching out because our tools could really complement what you are building at the agency.</p>',
    scheduledTime: daysAgo(2, 14, 30),
    status: 'sent',
    sender: 'oliver.brown@domain.io',
    bullmqJobId: 'email_send_mock-s3',
    attemptCount: 1,
    lastError: null,
    sentAt: daysAgo(2, 14, 30),
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'mock-s4',
    campaignId: 'camp-0',
    emailAddress: 'nina.patel@fintech.co',
    subject: 'Investor update - July 2026',
    body: '<p>Hi Nina, sharing our monthly investor update. ARR is up 40% MoM.</p>',
    scheduledTime: daysAgo(3, 9, 0),
    status: 'failed',
    sender: 'oliver.brown@domain.io',
    bullmqJobId: 'email_send_mock-s4',
    attemptCount: 3,
    lastError: 'SMTP connection timeout after 3 attempts',
    sentAt: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'mock-s5',
    campaignId: 'camp-0',
    emailAddress: 'tom.hardy@bigco.com',
    subject: 'Welcome to ReachInbox!',
    body: '<p>Welcome aboard Tom! We are so excited to have you with us.</p>',
    scheduledTime: daysAgo(4, 8, 0),
    status: 'sent',
    sender: 'oliver.brown@domain.io',
    bullmqJobId: 'email_send_mock-s5',
    attemptCount: 1,
    lastError: null,
    sentAt: daysAgo(4, 8, 0),
    createdAt: now,
    updatedAt: now,
  },
];


function SkeletonRow() {
  return (
    <div className="flex items-center px-6 py-3.5 border-b border-gray-100 gap-3">
      <div className="w-44 h-4 bg-gray-100 rounded animate-pulse" />
      <div className="w-36 h-5 bg-gray-100 rounded-full animate-pulse" />
      <div className="flex-1 h-4 bg-gray-100 rounded animate-pulse" />
    </div>
  );
}

function EmptyState({ type }: { type: 'scheduled' | 'sent' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
        <Clock size={22} className="text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">
          {type === 'scheduled' ? 'No scheduled emails' : 'No sent emails yet'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {type === 'scheduled'
            ? 'Compose a new email to schedule it.'
            : 'Emails will appear here once they are sent.'}
        </p>
      </div>
    </div>
  );
}


interface EmailListProps {
  type: 'scheduled' | 'sent';
  onCountsChange?: (scheduled: number, sent: number) => void;
}

export function EmailList({ type, onCountsChange }: EmailListProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [useMock, setUseMock] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const { data: session } = useSession();
  const filterRef = useRef<HTMLDivElement>(null);

  const scheduledStatuses = ['pending', 'scheduled', 'rescheduled', 'sending'];
  const sentStatuses = ['sent', 'failed'];
  const filterOptions = type === 'scheduled' ? scheduledStatuses : sentStatuses;

  const toggleFilter = (s: string) =>
    setActiveFilters((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  const clearFilters = () => setActiveFilters([]);

  const load = useCallback(async () => {
    try {
      const statusFilter =
        type === 'scheduled'
          ? 'pending,scheduled,sending,rescheduled'
          : 'sent,failed';
      const sender = session?.user?.email || undefined;
      const res = await fetchEmails({ status: statusFilter, limit: 100, sender });
      setEmails(res.data);
      setUseMock(false);

      if (onCountsChange) {
        const otherStatus =
          type === 'scheduled'
            ? 'sent,failed'
            : 'pending,scheduled,sending,rescheduled';
        const otherRes = await fetchEmails({ status: otherStatus, limit: 1, sender });
        if (type === 'scheduled') {
          onCountsChange(res.pagination.total, otherRes.pagination.total);
        } else {
          onCountsChange(otherRes.pagination.total, res.pagination.total);
        }
      }
    } catch {
      setUseMock(true);
      const mockData = type === 'scheduled' ? MOCK_SCHEDULED : MOCK_SENT;
      setEmails(mockData);
      if (onCountsChange) {
        onCountsChange(MOCK_SCHEDULED.length, MOCK_SENT.length);
      }
    } finally {
      setLoading(false);
    }
  }, [type, onCountsChange, session?.user?.email]);

  useEffect(() => {
    setLoading(true);
    setEmails([]);
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const filtered = emails.filter((e) => {
    const matchSearch =
      !search.trim() ||
      e.emailAddress.toLowerCase().includes(search.toLowerCase()) ||
      e.subject.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      activeFilters.length === 0 || activeFilters.includes(e.status);
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 shrink-0">
        {}
        <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            id="search-emails"
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter button */}
        <div className="relative" ref={filterRef}>
          <button
            id="filter-btn"
            onClick={() => setFilterOpen((p) => !p)}
            title="Filter by status"
            className={`relative p-1.5 rounded-lg transition-colors cursor-pointer
              ${
                activeFilters.length > 0
                  ? 'bg-green-100 text-green-700'
                  : 'hover:bg-gray-100 text-gray-400'
              }`}
          >
            <SlidersHorizontal size={16} />
            {activeFilters.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {activeFilters.length}
              </span>
            )}
          </button>

          {filterOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setFilterOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-40 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</span>
                  {activeFilters.length > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-green-600 hover:text-green-700 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {filterOptions.map((s) => (
                  <button
                    key={s}
                    id={`filter-${s}`}
                    onClick={() => toggleFilter(s)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer capitalize"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
                      ${
                        activeFilters.includes(s)
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {activeFilters.includes(s) && <Check size={10} className="text-white" />}
                    </span>
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {}
        <button
          id="refresh-emails"
          onClick={load}
          title="Refresh"
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-gray-400"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 px-6 py-2 border-b border-gray-100 flex-wrap">
          <span className="text-xs text-gray-400">Filtered by:</span>
          {activeFilters.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full text-xs text-green-700"
            >
              {s}
              <button onClick={() => toggleFilter(s)} className="hover:text-red-500 cursor-pointer">✕</button>
            </span>
          ))}
        </div>
      )}

      {}
      {useMock && (
        <div className="flex items-center gap-2 px-6 py-1.5 bg-amber-50 border-b border-amber-100">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          <span className="text-xs text-amber-700">
            Demo mode - backend not connected. Start the backend to see live data.
          </span>
        </div>
      )}

      {}
      {!loading && (
        <div className="px-6 py-1.5 text-xs text-gray-400 border-b border-gray-50">
          {filtered.length} email{filtered.length !== 1 ? 's' : ''}
          {activeFilters.length > 0 || search ? ' matching filters' : ''}
        </div>
      )}

      {}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : filtered.length === 0 ? (
          <EmptyState type={type} />
        ) : (
          filtered.map((email) => (
            <EmailRow key={email.id} email={email} type={type} />
          ))
        )}
      </div>
    </div>
  );
}
