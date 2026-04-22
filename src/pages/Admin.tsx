import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { auth } from '../firebase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const BACKEND_URL = 'https://ai-helpdesk-bqkv.onrender.com';

interface MessageItem {
  role: string;
  content: string;
  timestamp?: string;
}

export default function Admin() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'model' | 'history' | 'upload' | 'index-upload' | 'clear'>('model');
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [loadingModels, setLoadingModels] = useState(false);

  // Model state
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [modelMsg, setModelMsg] = useState('');

  // User history state
  const [historyEmail, setHistoryEmail] = useState('');
  const [historyMessages, setHistoryMessages] = useState<MessageItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<MessageItem | null>(null);

  // Upload state
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploadMsg, setUploadMsg] = useState('');

  // Index zip upload state
  const [indexZip, setIndexZip] = useState<FileList | null>(null);
  const [indexZipMsg, setIndexZipMsg] = useState('');

  // Clear index state
  const [confirmPassword, setConfirmPassword] = useState('');
  const [clearMsg, setClearMsg] = useState('');
  const [clearing, setClearing] = useState(false);

  if (!isAdmin) {
    navigate('/');
    return null;
  }

  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const res = await fetch(`${BACKEND_URL}/models`);
      const data = await res.json();
      setModelStatus(data);
      setProvider(data.current?.provider || '');
      setModel(data.current?.model || '');
    } catch (err: any) {
      setModelStatus({ error: err.message });
    } finally {
      setLoadingModels(false);
    }
  };

  const handleModelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModelMsg('Model config updated. Restart backend for changes to take effect.');
  };

  const handleHistoryLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyEmail.trim()) return;
    setHistoryLoading(true);
    setHistoryMessages([]);
    try {
      const res = await fetch(`${BACKEND_URL}/history/${encodeURIComponent(historyEmail)}`);
      const data = await res.json();
      if (data.history && Array.isArray(data.history)) {
        setHistoryMessages(data.history.map((item: any) => {
          let content = '';
          if (typeof item.content === 'string') {
            content = item.content;
          } else if (Array.isArray(item.blocks)) {
            content = item.blocks.map((b: any) => b.text || '').join('\n');
          }
          return {
            role: item.role || 'user',
            content: String(content),
            timestamp: item.timestamp || null,
          };
        }));
      }
    } catch (err: any) {
      console.error('History fetch error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) return;
    setUploadMsg('Uploading...');

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await fetch(`${BACKEND_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setUploadMsg(data.message || 'Upload complete.');
    } catch (err: any) {
      setUploadMsg(`Error: ${err.message}`);
    }
  };

  const handleClearIndex = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmPassword.trim()) {
      setClearMsg('Please enter your password to confirm.');
      return;
    }
    setClearing(true);
    setClearMsg('');
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const email = user?.email;
      if (!email) throw new Error('Not logged in');
      await signInWithEmailAndPassword(auth, email, confirmPassword);

      const res = await fetch(`${BACKEND_URL}/clear-index`, { method: 'POST' });
      const data = await res.json();
      setClearMsg(data.message || 'Index cleared.');
      setConfirmPassword('');
    } catch (err: any) {
      setClearMsg(`Failed: ${err.message}`);
    } finally {
      setClearing(false);
    }
  };

  const handleIndexZipUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!indexZip || indexZip.length === 0) return;
    setIndexZipMsg('Uploading and extracting index zip...');

    const formData = new FormData();
    formData.append('file', indexZip[0]);

    try {
      const res = await fetch(`${BACKEND_URL}/upload-index-zip`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.error) {
        setIndexZipMsg(`Error: ${data.error}`);
      } else {
        setIndexZipMsg(`Extracted ${data.extracted?.length || 0} index files. ${data.errors?.length ? 'Errors: ' + data.errors.join(', ') : 'No errors.'}`);
      }
    } catch (err: any) {
      setIndexZipMsg(`Error: ${err.message}`);
    }
  };

  const extractThinkTag = (content: string): string | null => {
    const match = content.match(/<think>([\s\S]*?)<\/think>/);
    return match ? match[1].trim() : null;
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h2>Admin Console</h2>
        <button onClick={() => navigate('/')} className="back-btn">← Back to Chat</button>
      </header>

      <div className="admin-tabs">
        <button className={tab === 'model' ? 'active' : ''} onClick={() => setTab('model')}>Model Config</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>User History</button>
        <button className={tab === 'upload' ? 'active' : ''} onClick={() => setTab('upload')}>Upload Files</button>
        <button className={tab === 'index-upload' ? 'active' : ''} onClick={() => setTab('index-upload')}>Upload Index Zip</button>
        <button className={tab === 'clear' ? 'active' : ''} onClick={() => setTab('clear')}>Clear Index</button>
      </div>

      <div className="admin-content">
        {tab === 'model' && (
          <div className="tab-panel">
            <h3>LLM Model Configuration</h3>
            <button onClick={fetchModels} className="fetch-btn" disabled={loadingModels}>
              {loadingModels ? 'Loading...' : 'Fetch Current Config'}
            </button>
            {modelStatus && (
              <div className="model-status">
                <p><strong>Current Provider:</strong> {modelStatus.current?.provider}</p>
                <p><strong>Current Model:</strong> {modelStatus.current?.model}</p>
                <p><strong>Available:</strong> {JSON.stringify(modelStatus.available)}</p>
              </div>
            )}
            <form onSubmit={handleModelSubmit} className="model-form">
              <div className="form-group">
                <label>Provider</label>
                <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                  <option value="ollama">Ollama (Local)</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="minimax">MiniMax</option>
                </select>
              </div>
              <div className="form-group">
                <label>Model</label>
                <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. llama3, gpt-4o-mini, MiniMax-M2.7" />
              </div>
              <button type="submit" className="save-btn">Save Config</button>
              {modelMsg && <p className="info-msg">{modelMsg}</p>}
            </form>
          </div>
        )}

        {tab === 'history' && (
          <div className="tab-panel">
            <h3>View User Chat History</h3>
            <form onSubmit={handleHistoryLookup} className="history-form">
              <div className="form-group">
                <label>User Email</label>
                <input
                  type="email"
                  value={historyEmail}
                  onChange={(e) => setHistoryEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <button type="submit" className="fetch-btn" disabled={historyLoading}>
                {historyLoading ? 'Loading...' : 'Lookup History'}
              </button>
            </form>
            {historyMessages.length > 0 && (
              <div className="history-result">
                {historyMessages.map((msg, i) => (
                  <div key={i} className="history-message" style={{ marginBottom: '1.2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', gap: '0.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, background: msg.role === 'assistant' ? 'rgba(0,208,132,0.15)' : 'rgba(139,148,158,0.15)', color: msg.role === 'assistant' ? 'var(--accent)' : 'var(--text-secondary)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                          {msg.role === 'assistant' ? 'AI' : 'USER'}
                        </span>
                        {msg.role === 'assistant' ? (
                          <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', borderRadius: '3px', background: extractThinkTag(msg.content) ? 'rgba(210,166,0,0.2)' : 'transparent', color: extractThinkTag(msg.content) ? '#d2a600' : 'transparent', border: extractThinkTag(msg.content) ? '1px solid rgba(210,166,0,0.4)' : '1px solid transparent' }}>
                          {extractThinkTag(msg.content) ? 'think+raw' : 'clean only'}
                          </span>
                        ) : null}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {msg.timestamp && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {new Date(msg.timestamp).toLocaleString()}
                          </span>
                        )}
                        {msg.role === 'assistant' && extractThinkTag(msg.content) && (
                          <button
                            onClick={() => setSelectedMsg(msg)}
                            style={{ background: 'rgba(210,166,0,0.15)', border: '1px solid rgba(210,166,0,0.5)', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: '#d2a600', cursor: 'pointer' }}
                          >
                            View AI Think
                          </button>
                        )}
                      </div>
                    </div>
                    {msg.role === 'assistant' ? (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                        {msg.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!historyLoading && historyMessages.length === 0 && historyEmail && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '1rem' }}>No history found for this user.</p>
            )}
          </div>
        )}

        {tab === 'upload' && (
          <div className="tab-panel">
            <h3>Upload Documents to Index</h3>
            <p className="upload-info">Files will be re-indexed by the backend. Supported: .txt, .pdf, .md, .csv, .docx, .pptx, .xlsx</p>
            <form onSubmit={handleFileUpload} className="upload-form">
              <div className="form-group">
                <label>Select Files</label>
                <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
              </div>
              <button type="submit" className="upload-btn">Upload & Re-Index</button>
              {uploadMsg && <p className="info-msg">{uploadMsg}</p>}
            </form>
          </div>
        )}

        {tab === 'index-upload' && (
          <div className="tab-panel">
            <h3>Upload Pre-Built Index (Zip)</h3>
            <p className="upload-info">Upload a .zip of a pre-built index folder. Extracts directly to the index directory. Use this to transfer a locally-built index to the server.</p>
            <form onSubmit={handleIndexZipUpload} className="upload-form">
              <div className="form-group">
                <label>Select Index .zip</label>
                <input type="file" accept=".zip" onChange={(e) => setIndexZip(e.target.files)} />
              </div>
              <button type="submit" className="upload-btn">Extract to Index</button>
              {indexZipMsg && <p className="info-msg">{indexZipMsg}</p>}
            </form>
          </div>
        )}

        {tab === 'clear' && (
          <div className="tab-panel">
            <h3>Clear Index & Docs</h3>
            <p className="upload-info">This will delete all indexed files and all documents in the docs folder. The backend will stop answering until new docs are uploaded.</p>
            <form onSubmit={handleClearIndex} className="upload-form">
              <div className="form-group">
                <label>Enter your password to confirm</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Your account password"
                />
              </div>
              <button type="submit" className="upload-btn" disabled={clearing} style={{ background: '#f85149' }}>
                {clearing ? 'Clearing...' : 'Delete All Index Files'}
              </button>
              {clearMsg && <p className="info-msg" style={{ color: clearMsg.startsWith('Failed') ? '#f85149' : '#00d084' }}>{clearMsg}</p>}
            </form>
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedMsg && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}
          onClick={() => setSelectedMsg(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px',
              maxWidth: '800px', width: '100%', maxHeight: '85vh', overflow: 'auto', padding: '1.5rem'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: 'var(--accent)', margin: 0 }}>
                {selectedMsg.role === 'assistant' ? 'AI Response Detail' : 'User Message'}
              </h3>
              <button
                onClick={() => setSelectedMsg(null)}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ✕ Close
              </button>
            </div>

            {selectedMsg.role === 'assistant' && extractThinkTag(selectedMsg.content) && (
              <div style={{ marginBottom: '1.2rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--accent)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  AI Reasoning ({'<think>'})
                </div>
                <div style={{ background: 'rgba(0,208,132,0.08)', border: '1px solid rgba(0,208,132,0.25)', borderRadius: '8px', padding: '0.85rem', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                  {extractThinkTag(selectedMsg.content)}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--accent)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Clean Response
              </div>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.85rem', fontSize: '0.85rem', lineHeight: '1.7' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedMsg.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()}
                </ReactMarkdown>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--accent)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Raw Output (with {'<think>'} tags)
              </div>
              <pre style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.85rem', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '250px' }}>
                {selectedMsg.content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}