import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader, Play, Check, X, RefreshCw } from 'lucide-react';

export default function HistoryView({ setView, currentUser, startCustomSession }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/words/history?userId=${currentUser.id}&limit=${limit}&page=${page}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.words || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRetestAll = () => {
    // Launch a session using history words, randomly sorted, limit 20
    startCustomSession({
      source: 'history',
      category: 'all',
      orderWords: 'random',
      orderCategories: 'random',
      limit: 20,
      mode: 'study'
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>Your Practice History</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Review your spelling record and retest your memory.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-accent" 
            onClick={handleRetestAll}
            disabled={total === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Play size={15} /> Retest Practiced Words (Mix)
          </button>
          <button className="btn btn-secondary" onClick={() => setView('dashboard')}>
            <ArrowLeft size={16} /> Dashboard
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Loader className="spinner" size={24} /> Loading practice history...
          </div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>No words practiced yet.</p>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Start learning spelling lists from the dashboard to populate your history!
            </span>
          </div>
        ) : (
          <div>
            <div className="words-table-wrapper">
              <table className="words-table">
                <thead>
                  <tr>
                    <th>Word</th>
                    <th>Origin</th>
                    <th>Tag</th>
                    <th>Part of Speech</th>
                    <th>Box Level</th>
                    <th>Attempts</th>
                    <th>Success Rate</th>
                    <th>Last Score</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(w => {
                    const rate = w.attempts > 0 ? Math.round((w.correct_attempts / w.attempts) * 100) : 0;
                    return (
                      <tr key={w.id}>
                        <td style={{ fontWeight: '700', fontSize: '15px' }}>{w.word}</td>
                        <td>
                          <span className="origin-badge" style={{ fontSize: '12px', padding: '3px 8px' }}>
                            {w.category}
                          </span>
                        </td>
                        <td>
                          {w.tag ? (
                            <span className="origin-badge" style={{ fontSize: '12px', padding: '3px 8px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                              {w.tag}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>-</span>
                          )}
                        </td>
                        <td style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{w.part_of_speech}</td>
                        <td>
                          <span style={{ fontWeight: 'bold', color: w.box === 5 ? 'var(--success)' : 'var(--text-primary)' }}>
                            Box {w.box}
                          </span>
                        </td>
                        <td>{w.attempts} times</td>
                        <td style={{ fontWeight: '600', color: rate > 75 ? 'var(--success)' : rate > 40 ? 'var(--warning)' : 'var(--error)' }}>
                          {rate}%
                        </td>
                        <td>
                          {w.last_quality >= 3 ? (
                            <span style={{ color: 'var(--success)', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={12} /> Correct
                            </span>
                          ) : (
                            <span style={{ color: 'var(--error)', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <X size={12} /> Wrong
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} practiced words
              </span>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  Prev
                </button>
                <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setPage(p => p + 1)} disabled={page * limit >= total}>
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
