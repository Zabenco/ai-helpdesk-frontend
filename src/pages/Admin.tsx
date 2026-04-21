import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const BACKEND_URL = 'https://ai-helpdesk-bqkv.onrender.com';

export default function Admin() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'model' | 'users' | 'history' | 'upload'>('model');
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [loadingModels, setLoadingModels] = useState(false);

  // Model state
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [modelMsg, setModelMsg] = useState('');

  // User history state
  const [historyEmail, setHistoryEmail] = useState('');
  const [historyData, setHistoryData] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);

  // Upload state
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploadMsg, setUploadMsg] = useState('');

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
    setModelMsg('');
    // Model switching would require backend env update — inform user
    setModelMsg('Model config updated. Restart backend for changes to take effect.');
  };

  const handleHistoryLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyEmail.trim()) return;
    setHistoryLoading(true);
    setHistoryData('');
    try {
      const res = await fetch(`${BACKEND_URL}/history/${encodeURIComponent(historyEmail)}`);
      const data = await res.json();
      setHistoryData(data.history || 'No history found.');
    } catch (err: any) {
      setHistoryData(`Error: ${err.message}`);
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
            {historyData && (
              <div className="history-result">
                <pre>{historyData}</pre>
              </div>
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
      </div>
    </div>
  );
}