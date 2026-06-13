import React, { useState, useEffect } from 'react';
import { Play, ArrowLeft, Loader, Settings, HelpCircle } from 'lucide-react';

export default function SessionConfig({ mode, currentUser, setView, onStart }) {
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Config states
  const [source, setSource] = useState(mode === 'study' ? 'srs' : 'all');
  const [category, setCategory] = useState('all');
  const [tag, setTag] = useState('all');
  const [orderWords, setOrderWords] = useState('random');
  const [orderCategories, setOrderCategories] = useState('random');
  const [limit, setLimit] = useState(mode === 'speed' ? 50 : 20);
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/words/stats?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
      
      const tagsRes = await fetch(`/api/words/tags`);
      if (tagsRes.ok) {
        const data = await tagsRes.json();
        setTags(data.tags || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (e) => {
    if (e) e.preventDefault();
    try {
      setIsLaunching(true);
      const queryParams = new URLSearchParams({
        userId: currentUser.id,
        source,
        category,
        tag,
        orderWords,
        orderCategories,
        limit
      });
      
      const res = await fetch(`/api/words/custom?${queryParams}`);
      if (!res.ok) throw new Error("Could not fetch custom words list.");
      
      const data = await res.json();
      if (!data.words || data.words.length === 0) {
        alert("No words match this configuration! Try choosing 'All Words' or a different section.");
        return;
      }
      
      onStart(data.words);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLaunching(false);
    }
  };

  const getModeTitle = () => {
    if (mode === 'study') return 'Learning & Practice';
    if (mode === 'standard') return 'Standard Round';
    if (mode === 'speed') return '90s Speed Round';
    return 'Practice Session';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Loader className="spinner" size={24} /> Loading configuration options...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '30px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>Configure {getModeTitle()}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Customize word ordering, sections, and source selection.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setView('dashboard')}>
          <ArrowLeft size={16} /> Cancel
        </button>
      </div>

      <div className="card">
        <form onSubmit={handleStart}>
          {/* Word Source */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Settings size={14} /> Word Source Selection
            </label>
            <select value={source} onChange={(e) => setSource(e.target.value)} className="form-control">
              <option value="srs">Spaced Repetition (Due & New Review Words)</option>
              <option value="history">Practice History (Retest Words Already Practiced)</option>
              <option value="all">All Available Words (Database Inventory)</option>
            </select>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Choose whether to study words scheduled by the AI, practice old spelling errors, or test all words.
            </span>
          </div>

          {/* Target Category / Section */}
          <div className="form-group">
            <label className="form-label">Language Section (Origin Category)</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="form-control">
              <option value="all">All Language Sections Mixed</option>
              {categories.map(cat => (
                <option key={cat.category} value={cat.category}>
                  {cat.category} ({cat.count} words)
                </option>
              ))}
            </select>
          </div>

          {/* Target Booklet Group / Tag */}
          <div className="form-group">
            <label className="form-label">Booklet Group / Tag</label>
            <select value={tag} onChange={(e) => setTag(e.target.value)} className="form-control">
              <option value="all">All Groups / Tags Mixed</option>
              {tags.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Randomness & Ordering Options */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Word Order (Inside Section)</label>
              <select value={orderWords} onChange={(e) => setOrderWords(e.target.value)} className="form-control">
                <option value="random">Shuffled (Random)</option>
                <option value="sequential">Sequential (Alphabetical)</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Section Mix Order (Overall)</label>
              <select value={orderCategories} onChange={(e) => setOrderCategories(e.target.value)} className="form-control">
                <option value="random">Shuffled (Random Mix)</option>
                <option value="sequential">Sequential (Category Grouped)</option>
              </select>
            </div>
          </div>

          {/* Limit */}
          <div className="form-group">
            <label className="form-label">Session Words Count Limit</label>
            <select value={limit} onChange={(e) => setLimit(parseInt(e.target.value))} className="form-control">
              <option value="10">10 Words</option>
              <option value="20">20 Words</option>
              <option value="30">30 Words</option>
              <option value="50">50 Words</option>
              <option value="100">100 Words</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="btn btn-accent" 
            style={{ width: '100%', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            disabled={isLaunching}
          >
            {isLaunching ? (
              <>
                <Loader className="spinner" size={16} /> Preparing Words list...
              </>
            ) : (
              <>
                <Play size={16} /> Start Practice Session
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
