'use client';

import { useState } from 'react';
import { Star, Clock, AlertCircle } from 'lucide-react';
import { Email } from '@/types';

interface EmailRowProps {
  email: Email;
  type: 'scheduled' | 'sent';
  onRowClick?: (email: Email) => void;
}

function formatScheduledTime(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = days[d.getDay()];
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day} ${hours}:${mins}:${secs} ${ampm}`;
}

function getRecipientName(email: string): string {
  const local = email.split('@')[0];
  return local
    .split(/[._-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    sent: { label: 'Sent', className: 'bg-green-100 text-green-700' },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-600' },
    rescheduled: { label: 'Rescheduled', className: 'bg-purple-100 text-purple-700' },
    sending: { label: 'Sending', className: 'bg-blue-100 text-blue-700' },
    pending: { label: 'Pending', className: 'bg-gray-100 text-gray-500' },
  };
  const cfg = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-500' };
  return (
    <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium whitespace-nowrap ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}


function EmailDetail({ email, type }: { email: Email; type: 'scheduled' | 'sent' }) {

  return (
    <div className="px-6 pb-4 pt-1 bg-gray-50 border-b border-gray-200 animate-fade-in">
      <div className="max-w-2xl text-sm text-gray-700 space-y-2">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-gray-500 mb-3">
          <span><span className="text-gray-400">From:</span> {email.sender}</span>
          <span><span className="text-gray-400">To:</span> {email.emailAddress}</span>
          {type === 'scheduled' && (
            <span><span className="text-gray-400">Scheduled:</span> {new Date(email.scheduledTime).toLocaleString()}</span>
          )}
          {email.sentAt && (
            <span><span className="text-gray-400">Sent:</span> {new Date(email.sentAt).toLocaleString()}</span>
          )}
          <span><span className="text-gray-400">Attempts:</span> {email.attemptCount}</span>
        </div>

        {}
        <div 
          className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: email.body || '(no content)' }}
        />

        {}
        {email.lastError && (
          <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            {email.lastError}
          </div>
        )}
      </div>
    </div>
  );
}


export function EmailRow({ email, type }: EmailRowProps) {
  const [starred, setStarred] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const recipientName = getRecipientName(email.emailAddress);
  const preview = email.body.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);

  return (
    <>
      <div
        className={`flex items-center px-6 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors group cursor-pointer select-none ${expanded ? 'bg-gray-50' : ''}`}
        onClick={() => setExpanded((p) => !p)}
      >
        {/* Recipient */}
        <div className="w-44 shrink-0">
          <span className="text-sm font-medium text-gray-800">To: {recipientName}</span>
        </div>

        {/* Time pill + Subject + Preview */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          {type === 'scheduled' ? (
            <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-xs font-medium whitespace-nowrap">
              <Clock size={11} />
              {formatScheduledTime(email.scheduledTime)}
            </span>
          ) : (
            statusBadge(email.status)
          )}

          <span className="text-sm font-medium text-gray-800 shrink-0">{email.subject}</span>
          <span className="text-gray-400 text-sm">-</span>
          <span className="text-sm text-gray-400 truncate">{preview}</span>
        </div>

        {}
        <div className="ml-4 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            id={`star-${email.id}`}
            onClick={() => setStarred((p) => !p)}
            className="p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
            title={starred ? 'Unstar' : 'Star'}
          >
            <Star
              size={15}
              className={`transition-colors ${starred ? 'fill-amber-400 text-amber-400' : 'text-gray-300 group-hover:text-gray-400'}`}
            />
          </button>
        </div>
      </div>

      {}
      {expanded && <EmailDetail email={email} type={type} />}
    </>
  );
}
