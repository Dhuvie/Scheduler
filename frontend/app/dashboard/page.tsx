'use client';

import { useState, useCallback } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { EmailList } from '@/components/emails/EmailList';

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledCount, setScheduledCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  const handleCountsChange = useCallback((scheduled: number, sent: number) => {
    setScheduledCount(scheduled);
    setSentCount(sent);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar
        scheduledCount={scheduledCount}
        sentCount={sentCount}
        activeView={activeView}
        onViewChange={setActiveView}
      />
      <EmailList
        type={activeView}
        onCountsChange={handleCountsChange}
      />
    </div>
  );
}
