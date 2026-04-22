import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Link } from 'react-router-dom';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const BACKEND_URL = 'https://ai-helpdesk-bqkv.onrender.com';

export default function Chat() {
  const { user, logout, isAdmin } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setStreamingContent('');

    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${BACKEND_URL}/ask/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          user_id: user?.email || 'default'
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      let fullContent = '';
      const decoder = new TextDecoder();

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;

        let cleaned = fullContent
          .replace(/<think>[\s\S]*?<\/think>/g, '')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/`(.*?)`/g, '<code>$1</code>')
          .replace(/\n/g, '<br>');

        setStreamingContent(cleaned);
      }

      let finalContent = fullContent
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code>$1</code>');

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: finalContent };
        return updated;
      });

      setStreamingContent('');

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setMessages(prev => prev.slice(0, -1));
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
      setStreamingContent('');
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  return (
    <div className="chat-page">
      <header className="chat-header">
        <div className="header-left">
          <h2>AI Helpdesk</h2>
        </div>
        <div className="header-right">
          {isAdmin && (
            <Link to="/admin" className="admin-btn">Admin</Link>
          )}
          <span className="user-email">{user?.email}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="chat-body">
        {messages.length === 0 && !streamingContent ? (
          <div className="chat-empty">
            <p>Ask a question about IT procedures, KB articles, or troubleshooting.</p>
          </div>
        ) : null}

        <div className="messages-list">
          {messages.map((msg, i) => (
            <div key={i} className={`message-row ${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="message-label assistant-label">AI</div>
              )}
              <div
                className={`message-text ${msg.role}`}
                dangerouslySetInnerHTML={{ __html: msg.content }}
              />
            </div>
          ))}
          {streamingContent && (
            <div className="message-row assistant">
              <div className="message-label assistant-label">AI</div>
              <div className="message-text assistant" dangerouslySetInnerHTML={{ __html: streamingContent }} />
            </div>
          )}
          {loading && !streamingContent && (
            <div className="message-row assistant">
              <div className="message-label assistant-label">AI</div>
              <div className="message-text assistant thinking">Thinking...</div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={sendMessage}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          rows={1}
        />
        <button type="submit" disabled={loading || !input.trim()}>Send</button>
      </form>
    </div>
  );
}