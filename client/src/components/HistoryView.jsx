import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader, Play, Check, X, RefreshCw, UserCheck } from 'lucide-react';

export default function HistoryView({ setView, currentUser, authState, startCustomSession }) {
  const isAdmin = authState === 'admin';
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  
  // Student selection states (for Admin view)
  const [selectedStudentId, setSelectedStudentId] = useState(currentUser?.id || '');
  const [studentProfiles, setStudentProfiles] = useState([]);

  useEffect(() => {
    if (isAdmin) {
      fetchStudentProfiles();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchHistory();
    } else {
      setHistory([]);
      setTotal(0);
      setLoading(false);
    }
  }, [page, selectedStudentId]);

  const fetchStudentProfiles = async () => {
    try {
      const res = await fetch('/api/auth/profiles');
      if (res.ok) {
        const data = await res.json();
        setStudentProfiles(data.profiles || []);
        if (data.profiles && data.profiles.length > 0 && !selectedStudentId) {
          setSelectedStudentId(data.profiles[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching student profiles:', e);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/words/history?userId=${selectedStudentId}&limit=${limit}&page=${page}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.words || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error('Error fetching word history:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRetestAll = () => {
    if (!selectedStudentId) return;
    
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

  const getSelectedStudentName = () => {
    if (!isAdmin) return currentUser?.name;
    const profile = studentProfiles.find(p => p.id === parseInt(selectedStudentId));
    return profile ? profile.name : 'Selected Student';
  };

  return (
    <div>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>
            {isAdmin ? 'Student Practice History' : 'Your Practice History'}
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {isAdmin 
              ? 'Examine detailed spelling records and etymological progress metrics for students.' 
              : 'Review your spelling record and retest your memory.'
            }
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Retest option (only for active practice students) */}
          {!isAdmin && (
            <button 
              className="btn btn-accent" 
              onClick={handleRetestAll}
              disabled={total === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Play size={15} /> Retest Practiced Words (Mix)
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setView('dashboard')}>
            <ArrowLeft size={16} /> Dashboard
          </button>
        </div>
      </div>

      {/* Admin Select Student dropdown filter */}
      {isAdmin && (
        <div className="card" style={{ padding: '16px 24px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '15px', fontWeight: '700' }}>Select Student to Review:</span>
          </div>
          <select
            value={selectedStudentId}
            onChange={(e) => { setSelectedStudentId(e.target.value); setPage(1); }}
            className="form-control"
            style={{ width: '220px', borderColor: 'var(--accent)', fontWeight: 'bold' }}
          >
            <option value="">Choose Student Profile...</option>
            {studentProfiles.map(p => (
              <option key={p.id} value={p.id}>👤 {p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* History Words Table Card */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Loader className="spinner" size={24} /> Loading practice history...
          </div>
        ) : !selectedStudentId ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '16px' }}>Please select a student profile from the selector dropdown to load their practice history.</p>
          </div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>No words practiced yet.</p>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              {isAdmin 
                ? `${getSelectedStudentName()} has not attempted any spelling words yet.` 
                : 'Start learning spelling lists from the dashboard to populate your history!'
              }
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
                    <th>Last Attempt</th>
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
                        <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {w.last_attempt_date ? new Date(w.last_attempt_date).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
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
                Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} practiced words for <strong>{getSelectedStudentName()}</strong>
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
