'use client';

import { useEffect, useState } from 'react';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface Document {
  id: string;
  filename: string;
  s3_key: string | null;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  activeConversationId: string | null;
  conversations: Conversation[];
  onConversationsChange: () => void;
  refreshDocuments?: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function Sidebar({
  isOpen, onToggle, onSelectConversation, onNewChat,
  activeConversationId, conversations, onConversationsChange,
  refreshDocuments, theme, onToggleTheme,
}: SidebarProps) {
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    if (activeConversationId) fetchDocuments(activeConversationId);
    else setDocuments([]);
  }, [activeConversationId, refreshDocuments]);

  const fetchDocuments = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (data.documents) setDocuments(data.documents);
    } catch {}
  };

  const handleDownload = async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}/download`);
      const data = await res.json();
      if (data.url) window.open(data.url, '_blank');
    } catch {}
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    onConversationsChange();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const SidebarToggleIcon = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <line x1="9.5" y1="4" x2="9.5" y2="20" />
    </svg>
  );

  if (!isOpen) return (
    <div className="h-screen flex flex-col items-center py-4 gap-2 flex-shrink-0" style={{ width: '60px', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}>
      <button onClick={onToggle} title="Open sidebar"
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <SidebarToggleIcon />
      </button>
      <button onClick={onNewChat} title="New chat"
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      </button>
    </div>
  );

  return (
    <aside className="h-screen flex flex-col flex-shrink-0" style={{ width: '280px', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}>

      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Header — 10% */}
        <div className="flex items-center justify-between pl-5 pr-3 overflow-hidden" style={{ height: '10%' }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md flex items-center justify-center font-bold flex-shrink-0" style={{ background: 'var(--accent)', color: 'var(--on-accent)', fontSize: '14px', lineHeight: '1', paddingBottom: '1px' }}>✦</div>
            <span style={{ fontSize: '15.5px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.01em' }}>DocuMind</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={onToggleTheme} title="Toggle theme"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {theme === 'dark' ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            <button onClick={onToggle} title="Close sidebar"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <SidebarToggleIcon size={16} />
            </button>
          </div>
        </div>

        {/* New Chat — 15% */}
        <div className="px-3 flex items-center overflow-hidden" style={{ height: '15%' }}>
          <button onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-4 rounded-xl transition-all"
            style={{ fontSize: '15px', fontWeight: 600, color: 'var(--on-accent)', background: 'var(--accent)', fontFamily: 'var(--font-display)', letterSpacing: '0.01em' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            New chat
          </button>
        </div>

        {/* Chats — 45% */}
        <div className="flex flex-col overflow-hidden pt-1" style={{ height: '45%' }}>
          <p className="px-5 pb-1.5" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>Chats</p>
          <div className="overflow-y-auto flex-1 px-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--scrollbar) transparent' }}>
            {conversations.length === 0 ? (
              <p className="text-center py-6" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No chats yet</p>
            ) : (
              <ul className="space-y-0.5 pb-2">
                {conversations.map((c) => {
                  const active = activeConversationId === c.id;
                  return (
                    <li key={c.id}>
                      <div
                        onClick={() => onSelectConversation(c.id)}
                        className="group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
                        style={{ background: active ? 'var(--bg-tertiary)' : 'transparent' }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="truncate" style={{ fontSize: '14px', color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{c.title}</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>{formatTime(c.updated_at)}</p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(e, c.id)}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-opacity"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                          </svg>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Documents — 30% */}
        <div className="flex flex-col overflow-hidden" style={{ height: '30%', borderTop: '1px solid var(--border)' }}>
          <p className="px-5 pt-3 pb-1.5" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>
            Documents{documents.length > 0 && ` (${documents.length})`}
          </p>
          {documents.length === 0 ? (
            <p className="text-center pb-3" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No documents in this chat</p>
          ) : (
            <div className="overflow-y-auto flex-1 px-3 pb-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--scrollbar) transparent' }}>
              <ul className="space-y-0.5">
                {documents.map((doc) => (
                  <li key={doc.id}
                    className="group flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span className="flex-1 truncate" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{doc.filename}</span>
                    {doc.s3_key && (
                      <button onClick={() => handleDownload(doc.id)} title="Download"
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-opacity"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Footer — natural height, sits below the 10/15/45/30 split */}
      <div className="px-5 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Powered by OpenAI + Pinecone</p>
      </div>
    </aside>
  );
}