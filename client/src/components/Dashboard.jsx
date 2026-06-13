import React, { useState, useEffect } from 'react';
import { BookOpen, AlertCircle, Award, Settings, Brain, Zap, Clock } from 'lucide-react';

export default function Dashboard({ setView, currentUser }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/words/stats?userId=${currentUser.id}`);
      if (!res.ok) throw new Error('Failed to fetch statistics');
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not connect to the database. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div className="timer-circle danger" style={{ borderWidth: '2px', width: '60px', height: '60px' }}>
          <span className="timer-value" style={{ fontSize: '16px' }}>...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ borderLeft: '4px solid var(--error)', padding: '24px', margin: '40px auto', maxWidth: '600px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)' }}>
          <AlertCircle /> Connection Error
        </h3>
        <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>{error}</p>
        <button className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={fetchStats}>
          Retry Connection
        </button>
      </div>
    );
  }

  const boxColors = [
    '#f87171', // Box 1: Red
    '#fb923c', // Box 2: Orange
    '#facc15', // Box 3: Yellow
    '#60a5fa', // Box 4: Blue
    '#34d399'  // Box 5: Green
  ];

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Welcome to BeeSpeller AI, {currentUser?.name}! 🐝</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Your personalized 4-week dashboard for Spelling Bee mastery.</p>
      </div>

      {/* Hero Stats */}
      <div className="dashboard-grid">
        <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="card-title">Due For Review</div>
          <div className="card-value" style={{ color: stats.due > 0 ? 'var(--accent)' : 'var(--success)' }}>
            {stats.due}
          </div>
          <div className="card-subtext">Words waiting for spelling practice</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
          <div className="card-title">Total Words</div>
          <div className="card-value">{stats.total}</div>
          <div className="card-subtext">Words currently in the database</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="card-title">Mastery Level</div>
          <div className="card-value">
            {stats.total > 0 
              ? Math.round(((stats.boxes.find(b => b.box === 5)?.count || 0) / stats.total) * 100) 
              : 0}%
          </div>
          <div className="card-subtext">Percentage of words in Box 5 (Mastered)</div>
        </div>
      </div>

      {/* Main Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ padding: '8px', background: 'rgba(79, 70, 229, 0.15)', borderRadius: '8px', color: 'var(--primary-hover)' }}>
                <Brain size={24} />
              </div>
              <h3 style={{ fontSize: '18px' }}>Learning & Study</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', marginBottom: '20px' }}>
              Study new words and review due words using Spaced Repetition (SRS) and the "Lego Block" morphological hints.
            </p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => setView('study')}
            disabled={stats.total === 0}
          >
            Start Learning
          </button>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '8px', color: 'var(--warning)' }}>
                <Clock size={24} />
              </div>
              <h3 style={{ fontSize: '18px' }}>Standard Round</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', marginBottom: '20px' }}>
              Practice spelling with the official 1-minute rule. Request definitions, context sentences, origin, and speech part.
            </p>
          </div>
          <button 
            className="btn btn-accent" 
            onClick={() => setView('standard')}
            disabled={stats.total === 0}
          >
            Play Standard Round
          </button>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', color: 'var(--error)' }}>
                <Zap size={24} />
              </div>
              <h3 style={{ fontSize: '18px' }}>90s Speed Round</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', marginBottom: '20px' }}>
              Race against a 90-second countdown to spell as many words as you can. Rapid-fire tests.
            </p>
          </div>
          <button 
            className="btn btn-danger" 
            onClick={() => setView('speed')}
            disabled={stats.total === 0}
          >
            Start Speed Round
          </button>
        </div>
      </div>

      {/* Progress Metrics & Origin Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        {/* SRS Boxes Progress */}
        <div className="card">
          <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>SRS Learning Progress</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3, 4, 5].map(boxNum => {
              const boxData = stats.boxes.find(b => b.box === boxNum);
              const count = boxData ? boxData.count : 0;
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={boxNum} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '60px', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Box {boxNum}
                  </div>
                  <div style={{ flexGrow: '1', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: boxColors[boxNum - 1], borderRadius: '6px' }}></div>
                  </div>
                  <div style={{ width: '40px', fontSize: '13px', fontWeight: '700', textAlign: 'right' }}>
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>Box 1: Daily Review</span>
            <span>Box 5: Fully Mastered</span>
          </div>
        </div>

        {/* Categories Breakdown */}
        <div className="card">
          <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Language of Origin</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stats.categories.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                No words in database yet. Go to Admin to upload words!
              </p>
            ) : (
              stats.categories.map(({ category, count }) => {
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ fontWeight: '500' }}>{category}</span>
                      <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>{count} ({Math.round(pct)}%)</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary-hover)', borderRadius: '2px' }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
