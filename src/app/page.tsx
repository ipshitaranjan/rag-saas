'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Chat from '@/components/Chat';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [refreshDocuments, setRefreshDocuments] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  return (
    <main className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onSelectConversation={(id) => setActiveConversationId(id)}
        onNewChat={() => setActiveConversationId(null)}
        activeConversationId={activeConversationId}
        conversations={conversations}
        onConversationsChange={fetchConversations}
        refreshDocuments={refreshDocuments}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
      />
      <Chat
        key={activeConversationId || 'new'}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        conversationId={activeConversationId}
        onConversationCreated={(id) => {
          setActiveConversationId(id);
          fetchConversations();
        }}
        onDocumentUploaded={() => setRefreshDocuments(p => p + 1)}
      />
    </main>
  );
}
