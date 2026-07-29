'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Paperclip, Clock, Upload, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { createCampaign } from '@/lib/api';
import { ScheduleModal } from '@/components/compose/ScheduleModal';


function EmailChips({
  emails,
  onAdd,
  onRemove,
  placeholder,
}: {
  emails: string[];
  onAdd: (email: string) => void;
  onRemove: (email: string) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addEmail = (val: string) => {
    const trimmed = val.trim().toLowerCase();
    if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      onAdd(trimmed);
      setInput('');
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addEmail(input);
    } else if (e.key === 'Backspace' && !input && emails.length > 0) {
      onRemove(emails[emails.length - 1]);
    }
  };

  const VISIBLE = 3;
  const visible = showAll ? emails : emails.slice(0, VISIBLE);
  const extra = emails.length - VISIBLE;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 flex-1 cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {visible.map((e) => (
        <span
          key={e}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-green-500 text-green-700 text-xs"
        >
          {e}
          <button
            onClick={(ev) => { ev.stopPropagation(); onRemove(e); }}
            className="hover:text-red-500 transition-colors cursor-pointer"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      {!showAll && extra > 0 && (
        <button
          onClick={(ev) => { ev.stopPropagation(); setShowAll(true); }}
          className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-green-500 text-green-700 text-xs hover:bg-green-50 cursor-pointer transition-colors"
          title={`Show ${extra} more`}
        >
          +{extra}
        </button>
      )}
      {showAll && emails.length > VISIBLE && (
        <button
          onClick={(ev) => { ev.stopPropagation(); setShowAll(false); }}
          className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-gray-300 text-gray-500 text-xs hover:bg-gray-50 cursor-pointer transition-colors"
        >
          Show less
        </button>
      )}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => addEmail(input)}
        placeholder={emails.length === 0 ? (placeholder ?? 'recipient@example.com') : ''}
        className="flex-1 min-w-24 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none bg-transparent"
      />
    </div>
  );
}

// ─── Toolbar Button ───────────────────────────────────────────────────────────
function ToolBtn({
  label,
  onClick,
  active = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors cursor-pointer
        ${active ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
    >
      {children}
    </button>
  );
}

// ─── Rich Text Editor ─────────────────────────────────────────────────────────
function RichEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  // Sync content on mount
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  return (
    <div className="flex-1 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Type Your Reply..."
        onInput={handleInput}
        className="flex-1 p-4 text-sm text-gray-800 min-h-[160px] focus:outline-none"
      />

      {/* Toolbar */}
      <div className="border-t border-gray-100 px-3 py-2 flex items-center gap-0.5 flex-wrap">
        <ToolBtn label="Undo" onClick={() => exec('undo')}>↩</ToolBtn>
        <ToolBtn label="Redo" onClick={() => exec('redo')}>↪</ToolBtn>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn label="Font" onClick={() => {}}>
          <span className="text-xs font-medium">Tr</span>
        </ToolBtn>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn label="Bold" onClick={() => exec('bold')}>
          <span className="font-bold text-xs">B</span>
        </ToolBtn>
        <ToolBtn label="Italic" onClick={() => exec('italic')}>
          <span className="italic text-xs">I</span>
        </ToolBtn>
        <ToolBtn label="Underline" onClick={() => exec('underline')}>
          <span className="underline text-xs">U</span>
        </ToolBtn>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn label="Align Left" onClick={() => exec('justifyLeft')}>
          <svg viewBox="0 0 14 14" width="13" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="1" y1="3" x2="13" y2="3"/><line x1="1" y1="7" x2="9" y2="7"/><line x1="1" y1="11" x2="13" y2="11"/></svg>
        </ToolBtn>
        <ToolBtn label="Align Center" onClick={() => exec('justifyCenter')}>
          <svg viewBox="0 0 14 14" width="13" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="1" y1="3" x2="13" y2="3"/><line x1="3" y1="7" x2="11" y2="7"/><line x1="1" y1="11" x2="13" y2="11"/></svg>
        </ToolBtn>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn label="Ordered List" onClick={() => exec('insertOrderedList')}>
          <svg viewBox="0 0 14 14" width="13" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="5" y1="4" x2="13" y2="4"/><line x1="5" y1="8" x2="13" y2="8"/><line x1="5" y1="12" x2="13" y2="12"/><text x="1" y="5" fontSize="4" fill="currentColor" stroke="none">1.</text><text x="1" y="9" fontSize="4" fill="currentColor" stroke="none">2.</text></svg>
        </ToolBtn>
        <ToolBtn label="Bullet List" onClick={() => exec('insertUnorderedList')}>
          <svg viewBox="0 0 14 14" width="13" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="2" cy="4" r="1" fill="currentColor"/><circle cx="2" cy="8" r="1" fill="currentColor"/><circle cx="2" cy="12" r="1" fill="currentColor"/><line x1="5" y1="4" x2="13" y2="4"/><line x1="5" y1="8" x2="13" y2="8"/><line x1="5" y1="12" x2="13" y2="12"/></svg>
        </ToolBtn>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn label="Blockquote" onClick={() => exec('formatBlock', 'blockquote')}>
          <svg viewBox="0 0 14 14" width="13" fill="currentColor"><path d="M2 3h3v3H3l1-3H2zm5 0h3v3H8l1-3H7z" opacity="0.6"/></svg>
        </ToolBtn>
        <ToolBtn label="Strikethrough" onClick={() => exec('strikeThrough')}>
          <span className="line-through text-xs">S</span>
        </ToolBtn>
      </div>
    </div>
  );
}

// ─── Compose Page ─────────────────────────────────────────────────────────────
export default function ComposePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

  const [toEmails, setToEmails] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delayBetween, setDelayBetween] = useState('');
  const [hourlyLimit, setHourlyLimit] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const senderEmail = session?.user?.email ?? 'sender@example.com';

  const addEmail = (email: string) => {
    if (!toEmails.includes(email)) setToEmails((p) => [...p, email]);
  };
  const removeEmail = (email: string) => setToEmails((p) => p.filter((e) => e !== email));

  // CSV/TXT upload for recipients
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const found = [...new Set((text.match(emailRegex) ?? []).map((e) => e.toLowerCase()))];
      found.forEach(addEmail);
      toast.success(`${found.length} emails added from ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Attachment upload (non-functional for now, just stores file list)
  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setAttachments((prev) => {
      const names = new Set(prev.map((f) => f.name));
      const newFiles = files.filter((f) => !names.has(f.name));
      return [...prev, ...newFiles];
    });
    toast.info(`${files.length} file${files.length > 1 ? 's' : ''} attached`);
    e.target.value = '';
  };

  const removeAttachment = (name: string) =>
    setAttachments((prev) => prev.filter((f) => f.name !== name));

  const handleSendLater = async (startTime: Date) => {
    if (!subject.trim()) { toast.error('Subject is required'); return; }
    if (!body.trim() && !document.querySelector('[contenteditable]')?.innerHTML) {
      toast.error('Body is required'); return;
    }
    if (toEmails.length === 0) { toast.error('Add at least one recipient'); return; }

    const actualBody = document.querySelector('[contenteditable]')?.innerHTML || body || '<p>No content</p>';

    setLoading(true);
    try {
      const campaign = await createCampaign({
        subject: subject.trim(),
        bodyTemplate: actualBody,
        recipients: toEmails,
        startTime: startTime.toISOString(),
        delayBetweenMs: parseInt(delayBetween || '2', 10) * 1000,
        hourlyLimit: parseInt(hourlyLimit || '100', 10),
        sender: senderEmail,
      });
      toast.success('Campaign scheduled!', `${campaign.recipientCount} emails queued.`);
      router.push('/dashboard');
    } catch (err) {
      toast.error('Failed to schedule', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setScheduleOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {}
      <div className="px-6 py-2 border-b border-gray-100">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          Homepage
        </button>
      </div>

      {}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <button
          id="back-btn"
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-base font-semibold text-gray-800 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} />
          Compose New Email
        </button>

        <div className="flex items-center gap-3">
          {}
          <input
            ref={attachInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleAttachment}
          />
          <button
            id="attach-btn"
            onClick={() => attachInputRef.current?.click()}
            title="Attach file"
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-gray-500"
          >
            <Paperclip size={18} />
            {attachments.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gray-800 text-white text-[9px] rounded-full flex items-center justify-center">
                {attachments.length}
              </span>
            )}
          </button>

          {}
          <button
            id="clock-btn"
            onClick={() => setScheduleOpen(true)}
            title="Schedule send time"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-gray-500"
          >
            <Clock size={18} />
          </button>

          {}
          <button
            id="send-later-btn"
            onClick={() => {
              if (!subject.trim()) { toast.error('Subject is required'); return; }
              if (toEmails.length === 0) { toast.error('Add at least one recipient'); return; }
              setScheduleOpen(true);
            }}
            disabled={loading}
            className="px-5 py-2 rounded-full border border-green-500 text-green-600 text-sm font-medium hover:bg-green-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Scheduling…' : 'Send Later'}
          </button>
        </div>
      </div>

      {}
      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-6 flex flex-col gap-0">
        {}
        <div className="flex items-center gap-4 py-3 border-b border-gray-100">
          <span className="text-sm text-gray-500 w-16 shrink-0">From</span>
          <div className="flex items-center gap-2 px-3 py-1 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700">
            {senderEmail}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 5l3 3 3-3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
        </div>

        {}
        <div className="flex items-center gap-4 py-3 border-b border-gray-100">
          <span className="text-sm text-gray-500 w-16 shrink-0">To</span>
          <EmailChips
            emails={toEmails}
            onAdd={addEmail}
            onRemove={removeEmail}
            placeholder="recipient@example.com"
          />
          <input
            ref={fileInputRef as React.RefObject<HTMLInputElement>}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            id="upload-list-btn"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-green-600 text-xs font-medium hover:text-green-700 transition-colors cursor-pointer shrink-0"
          >
            <Upload size={13} />
            Upload List
          </button>
        </div>

        {}
        <div className="flex items-center gap-4 py-3 border-b border-gray-100">
          <span className="text-sm text-gray-500 w-16 shrink-0">Subject</span>
          <input
            id="subject-input"
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none bg-transparent"
          />
        </div>

        {}
        <div className="flex items-center gap-8 py-3 border-b border-gray-100">
          <span className="text-sm text-gray-500 shrink-0">Delay between 2 emails</span>
          <input
            id="delay-input"
            type="number"
            min={0}
            value={delayBetween}
            onChange={(e) => setDelayBetween(e.target.value)}
            placeholder="00"
            className="w-14 border border-gray-200 rounded px-2 py-1 text-sm text-gray-700 text-center focus:outline-none focus:border-green-400"
          />
          <span className="text-sm text-gray-500 shrink-0 -ml-4">Hourly Limit</span>
          <input
            id="hourly-limit-input"
            type="number"
            min={1}
            value={hourlyLimit}
            onChange={(e) => setHourlyLimit(e.target.value)}
            placeholder="00"
            className="w-14 border border-gray-200 rounded px-2 py-1 text-sm text-gray-700 text-center focus:outline-none focus:border-green-400"
          />
        </div>

        {}
        <div className="flex flex-col mt-3 flex-1">
          <RichEditor value={body} onChange={setBody} />
        </div>

        {}
        {attachments.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 py-3 border-t border-gray-100 mt-2">
            <span className="text-xs text-gray-400 shrink-0">Attached:</span>
            {attachments.map((f) => (
              <span
                key={f.name}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-600"
              >
                <Paperclip size={10} className="text-gray-400" />
                {f.name}
                <button
                  onClick={() => removeAttachment(f.name)}
                  className="hover:text-red-500 transition-colors cursor-pointer ml-0.5"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {}
      <ScheduleModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onConfirm={handleSendLater}
        loading={loading}
      />
    </div>
  );
}
