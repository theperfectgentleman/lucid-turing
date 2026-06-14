import React, { useState, useEffect } from 'react';
import { Search, Filter, Volume2, Compass, Layers, ArrowLeft, ArrowRight, BookOpen, UserCheck, HelpCircle } from 'lucide-react';
import { formatFullDateTime, formatShortDate } from '../utils/dateFormatter';

export default function WordExplorer({ currentUser, authState, setView }) {
  const isAdmin = authState === 'admin';
  
  // Selection states
  const [selectedWord, setSelectedWord] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(currentUser?.id || '');
  const [studentProfiles, setStudentProfiles] = useState([]);
  
  // Words list states
  const [words, setWords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoSelectAction, setAutoSelectAction] = useState(null); // null, 'first', 'last'
  
  // Audio source settings
  const [audioSource, setAudioSource] = useState(() => {
    return localStorage.getItem('bee_speller_audio_source') || 'ai';
  });

  useEffect(() => {
    // If admin, load all student profiles so they can filter progress stats
    if (isAdmin) {
      fetchStudentProfiles();
    }
    fetchTags();
  }, [isAdmin]);

  // Refetch words list whenever page, category, tag, search query, or student profile changes
  useEffect(() => {
    if (!autoSelectAction) {
      setSelectedWord(null);
    }
    fetchWords();
  }, [page, category, tag, selectedStudentId]);

  const fetchStudentProfiles = async () => {
    try {
      const res = await fetch('/api/auth/profiles');
      if (res.ok) {
        const data = await res.json();
        setStudentProfiles(data.profiles || []);
      }
    } catch (e) {
      console.error('Error fetching student profiles:', e);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/words/tags');
      if (res.ok) {
        const data = await res.json();
        setTags(data.tags || []);
      }
    } catch (e) {
      console.error('Error fetching tags:', e);
    }
  };

  const fetchWords = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page,
        limit,
        search,
        category,
        tag,
        userId: selectedStudentId || ''
      });
      const res = await fetch(`/api/words/explorer?${queryParams}`);
      if (res.ok) {
        const data = await res.json();
        setWords(data.words || []);
        setTotal(data.total || 0);
        
        // Auto-select first word if none is selected
        if (autoSelectAction === 'first' && data.words && data.words.length > 0) {
          setSelectedWord(data.words[0]);
          setAutoSelectAction(null);
        } else if (autoSelectAction === 'last' && data.words && data.words.length > 0) {
          setSelectedWord(data.words[data.words.length - 1]);
          setAutoSelectAction(null);
        } else if (data.words && data.words.length > 0 && !selectedWord) {
          setSelectedWord(data.words[0]);
        }
      }
    } catch (e) {
      console.error('Error loading words:', e);
    } finally {
      setLoading(false);
    }
  };

  // When search is submitted
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchWords();
  };

  // Pronunciation logic
  const speakWord = (wordText) => {
    speakWordWithSource(wordText, audioSource);
  };

  const recordPronunciation = async (wordId) => {
    const studentId = currentUser?.id || selectedStudentId;
    if (!studentId || !wordId) return;
    try {
      await fetch(`/api/words/${wordId}/pronounce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: studentId })
      });
    } catch (e) {
      console.error('Error recording pronunciation:', e);
    }
  };

  const speakWordWithSource = async (wordText, source) => {
    if (source === 'ai') {
      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(wordText.toLowerCase())}`);
        if (res.ok) {
          const data = await res.json();
          const phonetic = data[0]?.phonetics?.find(p => p.audio && p.audio.trim() !== '');
          if (phonetic && phonetic.audio) {
            let audioUrl = phonetic.audio;
            if (audioUrl.startsWith('//')) {
              audioUrl = 'https:' + audioUrl;
            }
            const audio = new Audio(audioUrl);
            await audio.play();
            return;
          }
        }
      } catch (err) {
        console.warn('AI Pronunciation failed, falling back to System TTS:', err);
      }
    }
    
    speakSystemTTS(wordText);
  };

  const speakSystemTTS = (wordText) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(wordText);
      utterance.rate = 0.85;
      
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(voice => 
        voice.lang.startsWith('en-US') || voice.lang.startsWith('en-GB')
      );
      if (englishVoice) utterance.voice = englishVoice;
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const changeAudioSource = (newSource) => {
    setAudioSource(newSource);
    localStorage.setItem('bee_speller_audio_source', newSource);
    if (selectedWord) {
      speakWordWithSource(selectedWord.word, newSource);
    }
  };

  // Sync selected word's stats when student query changes
  useEffect(() => {
    if (selectedWord) {
      const updated = words.find(w => w.id === selectedWord.id);
      if (updated) {
        setSelectedWord(updated);
      }
    }
  }, [words]);

  const currentIndex = selectedWord ? words.findIndex(w => w.id === selectedWord.id) : -1;
  const hasPrev = currentIndex > 0 || page > 1;
  const hasNext = currentIndex < words.length - 1 || page < Math.ceil(total / limit);

  const handlePrevWord = () => {
    if (currentIndex > 0) {
      setSelectedWord(words[currentIndex - 1]);
    } else if (page > 1) {
      setAutoSelectAction('last');
      setPage(prev => prev - 1);
    }
  };

  const handleNextWord = () => {
    if (currentIndex < words.length - 1) {
      setSelectedWord(words[currentIndex + 1]);
    } else if (page < Math.ceil(total / limit)) {
      setAutoSelectAction('first');
      setPage(prev => prev + 1);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '26px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass style={{ color: 'var(--accent)' }} /> Word Explorer
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Search spelling lists, explore origin details, inspect morpheme syllables, and follow study progress.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => setView('dashboard')}>
          <ArrowLeft size={16} /> Dashboard
        </button>
      </div>

      {/* Grid Layout: Top details, Bottom word list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* TOP Display: Detailed Selected Word Inspect Card */}
        <div className="card" style={{ padding: '32px', borderTop: '4px solid var(--accent)' }}>
          {selectedWord ? (
            <div>
              {/* Word header, pronunciation & audio controls */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '20px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '38px', fontWeight: '900', margin: 0, color: 'var(--text-primary)' }}>
                    {selectedWord.word}
                  </h1>
                  <button 
                    className="audio-btn" 
                    onClick={() => {
                      speakWord(selectedWord.word);
                      recordPronunciation(selectedWord.id);
                    }} 
                    title="Pronounce word"
                    style={{ width: '52px', height: '52px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Volume2 size={24} />
                  </button>
                  <select 
                    value={audioSource} 
                    onChange={(e) => changeAudioSource(e.target.value)}
                    className="audio-source-select"
                    style={{ height: '36px' }}
                  >
                    <option value="ai" style={{ background: 'var(--bg-main)' }}>🔊 AI Voice</option>
                    <option value="system" style={{ background: 'var(--bg-main)' }}>🎙️ System TTS</option>
                  </select>

                  {/* Word list traversal navigation */}
                  <div style={{ display: 'flex', gap: '8px', borderLeft: '1px solid var(--border-color)', paddingLeft: '16px', marginLeft: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handlePrevWord}
                      disabled={!hasPrev}
                      style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', height: '36px' }}
                      title="Previous Word"
                    >
                      <ArrowLeft size={14} /> Prev
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleNextWord}
                      disabled={!hasNext}
                      style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', height: '36px' }}
                      title="Next Word"
                    >
                      Next <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
                
                {/* Meta details (Origin, POS, Tag) */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="origin-badge">
                    🌍 {selectedWord.category || 'Other'}
                  </span>
                  {selectedWord.part_of_speech && (
                    <span className="origin-badge" style={{ borderColor: 'var(--primary)', color: 'var(--primary-hover)' }}>
                      📝 {selectedWord.part_of_speech}
                    </span>
                  )}
                  {selectedWord.tag && (
                    <span className="origin-badge" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                      🏷️ {selectedWord.tag}
                    </span>
                  )}
                </div>
              </div>

              {/* Grid content for Word Details & Progress Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                
                {/* Details Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Lego Blocks Morpheme Breakdown */}
                  <div>
                    <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '8px' }}>
                      🧩 Lego Block Structure:
                    </h4>
                    <div className="lego-container" style={{ justifyContent: 'flex-start', margin: 0, gap: '8px' }}>
                      {selectedWord.morphemes && selectedWord.morphemes.length > 0 ? (
                        selectedWord.morphemes.map((m, idx) => (
                          <div key={idx} className={`lego-block ${m.type || 'syllable'}`} style={{ padding: '10px 16px', fontSize: '16px', minWidth: '80px', borderRadius: '8px' }}>
                            <span style={{ fontWeight: '800' }}>{m.text}</span>
                            {m.meaning && (
                              <span style={{ fontSize: '10px', marginTop: '2px', opacity: 0.8 }}>({m.meaning})</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="lego-block syllable" style={{ padding: '10px 16px', fontSize: '16px', minWidth: '80px', borderRadius: '8px' }}>
                          {selectedWord.word}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Definition & Sentence Box */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                    <div style={{ background: 'rgba(79, 70, 229, 0.04)', borderLeft: '4px solid var(--primary)', padding: '16px', borderRadius: '4px' }}>
                      <strong style={{ fontSize: '12px', color: 'var(--primary-hover)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Definition</strong>
                      <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.4' }}>{selectedWord.definition}</p>
                    </div>
                    {selectedWord.sentence && (
                      <div style={{ background: 'rgba(234, 179, 8, 0.04)', borderLeft: '4px solid var(--accent)', padding: '16px', borderRadius: '4px' }}>
                        <strong style={{ fontSize: '12px', color: 'var(--accent)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Example Sentence</strong>
                        <p style={{ margin: 0, fontSize: '15px', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: '1.4' }}>"{selectedWord.sentence}"</p>
                      </div>
                    )}
                  </div>

                  {/* Spelling Hint / Origin Rules */}
                  {selectedWord.spelling_tip && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.04)', borderLeft: '4px solid var(--success)', padding: '16px', borderRadius: '4px' }}>
                      <strong style={{ fontSize: '12px', color: 'var(--success)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>💡 Spelling Tip</strong>
                      <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.4' }}>{selectedWord.spelling_tip}</p>
                    </div>
                  )}
                </div>

                {/* Progress Details box */}
                {(selectedStudentId || currentUser?.id) && (
                  <div style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px dashed var(--border-color)',
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    marginTop: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <UserCheck size={18} style={{ color: 'var(--accent)' }} />
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Spelling Learning Stats</span>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>
                          For {isAdmin ? (studentProfiles.find(p => p.id === parseInt(selectedStudentId))?.name || 'Selected Student') : currentUser?.name}:
                        </h4>
                      </div>
                    </div>
                    
                    {/* Stats details */}
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Attempts</span>
                        <strong style={{ fontSize: '18px' }}>{selectedWord.attempts || 0}</strong>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Accuracy</span>
                        <strong style={{ fontSize: '18px', color: (selectedWord.attempts > 0 && selectedWord.correct_attempts / selectedWord.attempts >= 0.7) ? 'var(--success)' : 'var(--text-primary)' }}>
                          {selectedWord.attempts > 0 ? `${Math.round((selectedWord.correct_attempts / selectedWord.attempts) * 100)}%` : '—'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SRS Box</span>
                        <strong style={{ fontSize: '18px', color: 'var(--accent)' }}>Box {selectedWord.box || 1}</strong>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Next Review</span>
                        <strong 
                          style={{ fontSize: '13px', color: 'var(--text-secondary)' }}
                          title={selectedWord.next_review_date ? formatFullDateTime(selectedWord.next_review_date) : undefined}
                        >
                          {selectedWord.next_review_date ? formatShortDate(selectedWord.next_review_date) : 'New Word'}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-secondary)' }}>
              <HelpCircle size={36} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
              <h3>No word selected</h3>
              <p>Choose a word from the table below to view its details</p>
            </div>
          )}
        </div>

        {/* BOTTOM: Search and Paginated Word List Table */}
        <div className="card" style={{ padding: '24px' }}>
          
          {/* Filters Form */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div style={{ position: 'relative', flexGrow: 1, minWidth: '200px' }}>
              <input 
                type="text" 
                placeholder="Search database words..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '36px' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
            </div>
            
            <select 
              value={category} 
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="form-control"
              style={{ width: '150px' }}
            >
              <option value="">All Origins</option>
              <option value="Afrikaans">Afrikaans</option>
              <option value="French">French</option>
              <option value="Greek">Greek</option>
              <option value="Latin">Latin</option>
              <option value="German">German</option>
              <option value="Dutch">Dutch</option>
              <option value="Italian">Italian</option>
              <option value="Other">Other</option>
            </select>
            
            <select 
              value={tag} 
              onChange={(e) => { setTag(e.target.value); setPage(1); }}
              className="form-control"
              style={{ width: '140px' }}
            >
              <option value="">All Tags</option>
              {tags.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Admin student selection dropdown */}
            {isAdmin && (
              <select
                value={selectedStudentId}
                onChange={(e) => { setSelectedStudentId(e.target.value); setPage(1); }}
                className="form-control"
                style={{ width: '180px', borderColor: 'var(--accent)', fontWeight: 'bold' }}
              >
                <option value="">No Progress Joined</option>
                {studentProfiles.map(p => (
                  <option key={p.id} value={p.id}>👤 {p.name}'s Stats</option>
                ))}
              </select>
            )}

            <button type="submit" className="btn btn-secondary">
              Search
            </button>
          </form>

          {/* Words table wrapper */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
              Loading dictionary database...
            </div>
          ) : words.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
              No words match the selected filters.
            </div>
          ) : (
            <div>
              <div className="words-table-wrapper" style={{ margin: 0, borderRadius: 'var(--radius-sm)' }}>
                <table className="words-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>No.</th>
                      <th>Word</th>
                      <th>Part of Speech</th>
                      <th>Origin Language</th>
                      <th>Booklet Tag</th>
                      {selectedStudentId && <th>Srs Progress</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {words.map((w, idx) => {
                      const isSelected = selectedWord && w.id === selectedWord.id;
                      const globalIndex = (page - 1) * limit + idx + 1;
                      
                      let accuracyText = '—';
                      let boxText = 'Box 1';
                      if (selectedStudentId) {
                        if (w.attempts > 0) {
                          accuracyText = `${Math.round((w.correct_attempts / w.attempts) * 100)}% (${w.correct_attempts}/${w.attempts})`;
                        }
                        boxText = `Box ${w.box}`;
                      }
                      
                      return (
                        <tr 
                          key={w.id} 
                          onClick={() => setSelectedWord(w)}
                          style={{ 
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(79, 70, 229, 0.08)' : '',
                            borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent'
                          }}
                        >
                          <td style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>{globalIndex}</td>
                          <td>
                            <strong style={{ fontSize: '15px', color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                              {w.word}
                            </strong>
                          </td>
                          <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{w.part_of_speech}</td>
                          <td>
                            <span className="origin-badge" style={{ fontSize: '11px', padding: '3px 8px' }}>
                              {w.category || 'Other'}
                            </span>
                          </td>
                          <td>
                            {w.tag ? (
                              <span className="origin-badge" style={{ fontSize: '11px', padding: '3px 8px', borderColor: 'var(--primary)' }}>
                                {w.tag}
                              </span>
                            ) : '—'}
                          </td>
                          {selectedStudentId && (
                            <td style={{ fontSize: '13px' }}>
                              <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{boxText}</span>
                              <span style={{ marginLeft: '10px', color: 'var(--text-secondary)' }}>Accuracy: {accuracyText}</span>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Showing <strong>{(page - 1) * limit + 1}</strong> to <strong>{Math.min(page * limit, total)}</strong> of <strong>{total}</strong> words
                </span>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '8px 12px' }}
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                  >
                    <ArrowLeft size={14} /> Prev
                  </button>
                  <span style={{ padding: '8px 12px', fontSize: '14px', fontWeight: 'bold' }}>
                    Page {page} of {Math.ceil(total / limit) || 1}
                  </span>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '8px 12px' }}
                    onClick={() => setPage(prev => Math.min(prev + 1, Math.ceil(total / limit)))}
                    disabled={page >= Math.ceil(total / limit)}
                  >
                    Next <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
