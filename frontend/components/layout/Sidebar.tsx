'use client';

import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronDown, Clock, Send, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  scheduledCount?: number;
  sentCount?: number;
  activeView: 'scheduled' | 'sent';
  onViewChange: (view: 'scheduled' | 'sent') => void;
}

export function Sidebar({ scheduledCount = 0, sentCount = 0, activeView, onViewChange }: SidebarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <div className="w-[200px] shrink-0 h-screen bg-white border-r border-gray-100 flex flex-col py-4 px-3">
      {}
      <div className="px-2 mb-4 flex flex-col">
        <span className="text-3xl font-black tracking-tighter text-gray-900 leading-none">DNB</span>
        <span className="text-[9px] font-semibold tracking-widest text-gray-400 mt-1 uppercase">DHRUV NARAYAN BAJAJ</span>
      </div>

      {}
      <div className="relative mb-3">
        <button
          id="user-profile-btn"
          onClick={() => setShowUserMenu((p) => !p)}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
        >
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name ?? 'User'}
              width={32}
              height={32}
              className="rounded-full shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {session?.user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
          )}
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">
              {session?.user?.name ?? 'User'}
            </p>
            <p className="text-[10px] text-gray-400 truncate">
              {session?.user?.email ?? ''}
            </p>
          </div>
          {showUserMenu
            ? <ChevronUp size={14} className="text-gray-400 shrink-0" />
            : <ChevronDown size={14} className="text-gray-400 shrink-0" />
          }
        </button>

        {showUserMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
              <button
                id="sign-out-btn"
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>

      {}
      <button
        id="compose-btn"
        onClick={() => router.push('/compose')}
        className="w-full py-2 rounded-full border border-green-500 text-green-600 text-sm font-medium hover:bg-green-50 transition-colors cursor-pointer mb-5"
      >
        Compose
      </button>

      {}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
          Core
        </p>

        <nav className="flex flex-col gap-0.5">
          <button
            id="nav-scheduled"
            onClick={() => onViewChange('scheduled')}
            className={`
              w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors cursor-pointer
              ${activeView === 'scheduled'
                ? 'bg-green-50 text-green-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
              }
            `}
          >
            <Clock size={15} className={activeView === 'scheduled' ? 'text-green-600' : 'text-gray-400'} />
            <span className="flex-1 text-left">Scheduled</span>
            <span className={`text-xs ml-auto ${activeView === 'scheduled' ? 'text-green-600' : 'text-gray-400'}`}>
              {scheduledCount}
            </span>
          </button>

          <button
            id="nav-sent"
            onClick={() => onViewChange('sent')}
            className={`
              w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors cursor-pointer
              ${activeView === 'sent'
                ? 'bg-green-50 text-green-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
              }
            `}
          >
            <Send size={15} className={activeView === 'sent' ? 'text-green-600' : 'text-gray-400'} />
            <span className="flex-1 text-left">Sent</span>
            <span className={`text-xs ml-auto ${activeView === 'sent' ? 'text-green-600' : 'text-gray-400'}`}>
              {sentCount}
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
}
