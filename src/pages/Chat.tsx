import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

const BACKEND_URL = 'https://ai-helpdesk-bqkv.onrender.com';

export default function Chat() {
  const { user, logout, isAdmin } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load previous chat history on mount
  useEffect(() => {
    if (!user?.email) return;
    const userId = user.email;
    fetch(`${BACKEND_URL}/history/${encodeURIComponent(userId)}/full`)
      .then(res => res.json())
      .then(data => {
        if (data.history && Array.isArray(data.history) && data.history.length > 0) {
          setMessages(data.history.map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: String(m.content || ''),
            timestamp: m.timestamp || null,
          })));
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, { role: 'user', content: question }, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch(`${BACKEND_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          user_id: user?.email || 'default'
        })
      });
      const data = await res.json();
      if (data.error) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: `Error: ${data.error}` };
          return updated;
        });
      } else {
        const answer = (data.answer || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: answer };
          return updated;
        });
      }
    } catch (err: any) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: `Network error: ${err.message}` };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  // Strip think tags and ensure content is a string
  const cleanContent = (content: string): string => {
    const stripped = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    return stripped;
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
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>Ask a question about IT procedures, KB articles, or troubleshooting.</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg, i) => (
              <div key={i} className={`message-row ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="message-label assistant-label">AI</div>
                )}
                <div className={`message-text ${msg.role}`}>
                  {msg.content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {cleanContent(msg.content)}
                    </ReactMarkdown>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
        {loading && (
          <div className="message-row assistant">
            <div className="message-label assistant-label">AI</div>
            <div className="message-text assistant thinking">Thinking...</div>
          </div>
        )}
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