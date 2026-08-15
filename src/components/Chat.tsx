'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

interface ChatProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  conversationId: string | null;
  onConversationCreated: (id: string, title: string) => void;
  onDocumentUploaded?: () => void;
}

export default function Chat({ sidebarOpen, onToggleSidebar, conversationId, onConversationCreated, onDocumentUploaded }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (conversationId) {
      setCurrentConversationId(conversationId);
      loadConversation(conversationId);
    } else {
      setMessages([]);
      setUploadedFiles([]);
      setChatStarted(false);
      setCurrentConversationId(null);
    }
  }, [conversationId]);

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages.map((m: any) => ({ role: m.role, content: m.content })));
        setChatStarted(true);
      }
      if (data.documents) setUploadedFiles(data.documents.map((d: any) => d.filename));
    } catch {}
  };

  const createConversation = async (): Promise<string> => {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Chat' }),
    });
    const data = await res.json();
    return data.conversation.id;
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      let convId = currentConversationId;
      if (!convId) {
        convId = await createConversation();
        setCurrentConversationId(convId);
        onConversationCreated(convId, file.name.replace(/\.[^/.]+$/, ''));
      }
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', convId);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setUploadedFiles(prev => [...prev, file.name]);
        setChatStarted(true);
        onDocumentUploaded?.();
      }
    } catch {
      alert('Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history: messages, conversationId: currentConversationId }),
      });
      const data = await res.json();
      setMessages([...newMessages, {
        role: 'assistant',
        content: data.reply || 'Sorry, I could not get a response.',
        sources: data.sources?.length > 0 ? data.sources : undefined,
      }]);
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Something went wrong. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          {!sidebarOpen && (
            <button onClick={onToggleSidebar}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2.5"/><line x1="9.5" y1="4" x2="9.5" y2="20"/>
              </svg>
            </button>
          )}
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: '15.5px', fontFamily: 'var(--font-display)', letterSpacing: '0.01em' }}>
              {chatStarted ? (uploadedFiles[0]?.replace(/\.[^/.]+$/, '') || 'Document Chat') : 'DocuMind'}
            </h2>
            {chatStarted && (
              <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', marginTop: '1px' }}>
                {uploadedFiles.length} document{uploadedFiles.length !== 1 ? 's' : ''} loaded
              </p>
            )}
          </div>
        </div>
        <span style={{
          fontSize: '12px', fontWeight: 500,
          padding: '4px 12px', borderRadius: '999px',
          background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
          border: '1px solid var(--border)'
        }}>
          GPT-4o mini
        </span>
      </div>

      {/* Upload Screen */}
      {!chatStarted && (
        <div
          className="flex-1 flex flex-col items-center justify-center px-8"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="w-full max-w-lg text-center">
            {/* Logo */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
              ✦
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', fontFamily: 'var(--font-display)', letterSpacing: '0.01em' }}>
              What can I help you with?
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
              Upload a document and start asking questions
            </p>

            <label
              className="flex flex-col items-center justify-center gap-4 w-full py-14 rounded-3xl cursor-pointer transition-all duration-150"
              style={{
                border: dragOver ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                background: dragOver ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
              }}
            >
              {uploading ? (
                <>
                  <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                  <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Processing your document...</p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Drop your file here</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>or click to browse</p>
                  </div>
                  <div className="flex gap-2">
                    {['PDF', 'DOCX', 'TXT', 'CSV', 'PPTX'].map(t => (
                      <span key={t} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '6px', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{t}</span>
                    ))}
                  </div>
                </>
              )}
              <input type="file" className="hidden" accept=".pdf,.docx,.txt,.csv,.pptx" onChange={handleFileInput} disabled={uploading} />
            </label>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      {chatStarted && (
        <>
          <div className="flex-1 overflow-y-auto py-8">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-6 px-8">
                <p style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)' }}>Document ready — ask anything below.</p>
                <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-xl">
                  {['What is this document about?', 'Summarize the key points', 'What are the main topics?'].map((s) => (
                    <button key={s} onClick={() => setInput(s)}
                      className="px-4 py-2.5 rounded-full transition-colors"
                      style={{ fontSize: '13.5px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-8" style={{ maxWidth: '768px', margin: '0 auto', padding: '0 32px' }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 items-start ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  style={msg.role === 'user' && i > 0 ? { borderTop: '1px solid var(--border)', paddingTop: '24px' } : undefined}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent)', color: 'var(--on-accent)', fontSize: '16px', fontWeight: 700, lineHeight: '1', marginTop: '1px' }}>✦</div>
                  )}
                  <div className={`flex flex-col ${msg.role === 'user' ? 'max-w-xl items-end' : 'max-w-2xl items-start'}`}>
                    {msg.role === 'user' ? (
                      <div
                        className="leading-relaxed"
                        style={{
                          fontSize: '15px',
                          padding: '11px 18px',
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-primary)',
                          borderRadius: '20px',
                        }}
                      >
                        {msg.content}
                      </div>
                    ) : (
                      <div className="md-content" style={{ padding: '2px 0', width: '100%' }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                    {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {msg.sources.map((source, j) => (
                          <span key={j} className="flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ fontSize: '12px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                            </svg>
                            {source}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)', marginTop: '1px' }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 items-start justify-start">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent)', color: 'var(--on-accent)', fontSize: '16px', fontWeight: 700, lineHeight: '1', marginTop: '1px' }}>✦</div>
                  <div className="flex items-center gap-1.5 py-2">
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          <div className="px-8 pb-6 pt-3 flex-shrink-0">
            <div style={{ maxWidth: '768px', margin: '0 auto' }}>
              <div className="flex gap-2 items-end px-4 py-3" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '28px' }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-30"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Add document"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {uploading ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  )}
                </button>
                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.docx,.txt,.csv,.pptx" onChange={handleFileInput} />
                <textarea
                  ref={textareaRef}
                  className="flex-1 bg-transparent resize-none focus:outline-none leading-relaxed"
                  placeholder="Ask a question about your documents..."
                  rows={1}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  style={{ maxHeight: '160px', color: 'var(--text-primary)', fontSize: '15px', paddingTop: '6px', paddingBottom: '6px' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30"
                  style={{ background: input.trim() ? 'var(--accent)' : 'var(--bg-hover)', color: input.trim() ? 'var(--on-accent)' : 'var(--text-muted)' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                  </svg>
                </button>
              </div>
              <p className="text-center mt-2.5" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Enter to send · Shift+Enter for new line</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}