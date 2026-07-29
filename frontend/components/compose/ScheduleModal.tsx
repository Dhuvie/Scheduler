'use client';

import { useState } from 'react';
import { X, Clock } from 'lucide-react';

interface ScheduleModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (startTime: Date) => void;
  loading?: boolean;
}

export function ScheduleModal({ open, onClose, onConfirm, loading }: ScheduleModalProps) {
  const minDateTime = new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16);
  const [startTime, setStartTime] = useState(minDateTime);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-sm p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Clock size={16} className="text-green-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Schedule Send</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="mb-5">
          <label className="text-xs font-medium text-gray-500 block mb-1.5">
            Start sending at
          </label>
          <input
            id="schedule-start-time"
            type="datetime-local"
            value={startTime}
            min={minDateTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-400"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="confirm-schedule-btn"
            onClick={() => onConfirm(new Date(startTime))}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Scheduling…' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
