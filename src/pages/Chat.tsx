import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Link } from 'react-router-dom';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
}

const BACKEND_URL = 'https://ai-helpdesk-bqkv.onrender.com';

export default function Chat() {
  const { user, logout, isAdmin } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, { role: 'user', content: question }]);

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
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
      } else {
        let answer = data.answer || '';
        // Strip <think> tags and their content
        answer = answer.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: answer,
          sources: data.sources || []
        }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Network error: ${err.message}` }]);
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

  const formatContent = (text: string) => {
    return text
      .replace(/\n/g, '\n')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  };

  return (
    <div className="chat-page">
      <header className="chat-header">
        <div className="header-left">
          <h2>AI Helpdesk</h2>
        </div>
        <div className="header-right">
          {isAdmin && (
            <Link to="/admin" className="admin-btn">Admin Console</Link>
          )}
          <div className="user-info">
            <span>{user?.email}</span>
            <button onClick={logout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <div className="chat-body">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>Ask me anything about IT procedures, KB articles, or troubleshooting steps.</p>
          </div>
        ) : (
          <div className="messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                <div className="message-content" dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
                {msg.sources && msg.sources.length > 0 && (
                  <div className="sources">
                    <span className="sources-label">Sources:</span>
                    {msg.sources.map((s: any, j: number) => (
                      <span key={j} className="source-tag">{s.file_name}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="message assistant">
                <div className="message-content typing">Thinking...</div>
              </div>
            )}
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