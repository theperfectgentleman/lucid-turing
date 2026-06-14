import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Award, Zap, ArrowLeft, Check, X, AlertTriangle } from 'lucide-react';

export default function SpeedRound({ setView, currentUser, customWords }) {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Game states
  const [inputSpelling, setInputSpelling] = useState('');
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [results, setResults] = useState([]); // Array of { word, userSpelling, correct }
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showWordListModal, setShowWordListModal] = useState(false);
  
  // 90 seconds overall timer
  const [timeLeft, setTimeLeft] = useState(90);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (customWords && customWords.length > 0) {
      setWords(customWords);
      setLoading(false);
    } else {
      fetchRandomWords();
    }
    return () => clearInterval(timerRef.current);
  }, [customWords]);

  const fetchRandomWords = async () => {
    try {
      setLoading(true);
      // Fetch 100 random words so they don't run out during the 90 seconds
      const res = await fetch(`/api/words/random?limit=100&userId=${currentUser.id}`);
      if (!res.ok) throw new Error('Failed to fetch words');
      const data = await res.json();
      setWords(data.words || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const currentWord = words[currentIndex];

  useEffect(() => {
    if (hasStarted && currentWord) {
      speakWord(currentWord.word);
      setInputSpelling('');
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 150);
    }
  }, [currentIndex, hasStarted, words]);

  const startGame = () => {
    setHasStarted(true);
    // Start 90s countdown
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const speakWord = (wordText) => {
    const source = localStorage.getItem('bee_speller_audio_source') || 'ai';
    speakWordWithSource(wordText, source);
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
      utterance.rate = 1.0; // Normal rate for speed round
      
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(voice => 
        voice.lang.startsWith('en-US') || voice.lang.startsWith('en-GB')
      );
      if (englishVoice) utterance.voice = englishVoice;
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const submitReview = async (wordId, quality) => {
    try {
      await fetch(`/api/words/${wordId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quality, userId: currentUser.id })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleNextWord = (e) => {
    if (e) e.preventDefault();
    if (!inputSpelling.trim() || isGameOver) return;

    const userSpelling = inputSpelling.trim().toLowerCase();
    const correctSpelling = currentWord.word.trim().toLowerCase();
    const match = userSpelling === correctSpelling;

    // Update locally
    setAttemptsCount(prev => prev + 1);
    if (match) {
      setCorrectCount(prev => prev + 1);
    }

    setResults(prev => [...prev, {
      word: currentWord.word,
      userSpelling: inputSpelling,
      correct: match
    }]);

    // Submit SRS record in background (5 for correct, 1 for wrong)
    submitReview(currentWord.id, match ? 5 : 1);

    // Proceed to next word instantly
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Out of words
      clearInterval(timerRef.current);
      setIsGameOver(true);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <p>Loading speed round words...</p>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="practice-container card" style={{ padding: '48px', maxWidth: '600px' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚠️</div>
        <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>Database is empty!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
          Please upload some words from your spelling bee booklet in the Admin settings before attempting speed rounds.
        </p>
        <button className="btn btn-secondary" onClick={() => setView('dashboard')}>
          <ArrowLeft size={16} /> Back to Home
        </button>
      </div>
    );
  }

  // Pre-game Start screen
  if (!hasStarted) {
    return (
      <div className="practice-container card" style={{ padding: '48px', maxWidth: '600px' }}>
        <div style={{ fontSize: '64px', color: 'var(--error)', marginBottom: '24px', animation: 'pulse 1s infinite alternate' }}>⚡</div>
        <h2 style={{ fontSize: '28px', marginBottom: '16px' }}>Ready for Speed Round?</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
          Rules: You have <strong>90 seconds</strong> to spell as many words as possible. 
          The app will pronounce the word. Type your spelling and press Enter to instantly hear the next word.
          Accuracy and speed both count!
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={() => setView('dashboard')}>
            <ArrowLeft size={16} /> Cancel
          </button>
          <button className="btn btn-danger" onClick={startGame}>
            Start 90s Challenge!
          </button>
        </div>
      </div>
    );
  }

  // Game over review screen
  if (isGameOver) {
    const accuracy = attemptsCount > 0 ? Math.round((correctCount / attemptsCount) * 100) : 0;
    return (
      <div className="practice-container">
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '72px', color: 'var(--error)', marginBottom: '16px' }}>⚡</div>
          <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Speed Round Finished!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Time ran out. Here is your spelling performance:
          </p>

          <div className="stats-grid-3col">
            <div className="card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Attempted</div>
              <div style={{ fontSize: '28px', fontWeight: '800' }}>{attemptsCount}</div>
            </div>
            <div className="card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Spelled Correct</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--success)' }}>{correctCount}</div>
            </div>
            <div className="card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Accuracy</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent)' }}>{accuracy}%</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', textAlign: 'left', marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              Words History
            </h4>
            {results.map((res, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px' }}>
                <div>
                  <strong style={{ color: res.correct ? 'var(--success)' : 'var(--text-primary)' }}>{res.word}</strong>
                  <span style={{ marginLeft: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Typed: <span style={{ textDecoration: res.correct ? 'none' : 'line-through', color: res.correct ? 'var(--text-secondary)' : 'var(--error)' }}>{res.userSpelling}</span>
                  </span>
                </div>
                <div>
                  {res.correct ? (
                    <span style={{ color: 'var(--success)', fontSize: '11px', fontWeight: 'bold' }}>✓ OK</span>
                  ) : (
                    <span style={{ color: 'var(--error)', fontSize: '11px', fontWeight: 'bold' }}>✗ WRONG</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => setView('dashboard')}>
              <ArrowLeft size={16} /> Dashboard
            </button>
            <button className="btn btn-danger" onClick={() => {
              setIsGameOver(false);
              setHasStarted(false);
              setAttemptsCount(0);
              setCorrectCount(0);
              setResults([]);
              setCurrentIndex(0);
              setTimeLeft(90);
              fetchRandomWords();
            }}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const timerColor = timeLeft > 40 ? '' : timeLeft > 15 ? 'warning' : 'danger';

  return (
    <>
      <div className="practice-container">
        {/* Head section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" style={{ padding: '8px 14px' }} onClick={() => {
              clearInterval(timerRef.current);
              setView('dashboard');
            }}>
              <ArrowLeft size={16} /> Exit Round
            </button>
            <button className="btn btn-secondary" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setShowWordListModal(true)}>
              📋 Words in Round
            </button>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '14px', fontWeight: '600' }}>
            <span>Correct: <strong style={{ color: 'var(--success)' }}>{correctCount}</strong></span>
            <span>Attempted: <strong>{attemptsCount}</strong></span>
          </div>
        </div>

      <div className="card" style={{ padding: '32px' }}>
        {/* Timer UI */}
        <div className="timer-container">
          <div className={`timer-circle ${timerColor}`}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Time Left</span>
            <span className="timer-value">{timeLeft}s</span>
          </div>
        </div>

        {/* Word info / Audio Button */}
        <div className="word-player-container">
          <button className="audio-btn" onClick={() => speakWord(currentWord.word)} style={{ borderColor: 'var(--error)', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}>
            <Volume2 size={36} />
          </button>
          <span className="origin-badge" style={{ marginTop: '8px' }}>
            🌍 {currentWord.category || 'Other'}
          </span>
        </div>

        {/* Input */}
        <form onSubmit={handleNextWord}>
          <input
            ref={inputRef}
            type="text"
            className="spelling-input"
            placeholder="Type and press Enter!"
            value={inputSpelling}
            onChange={(e) => setInputSpelling(e.target.value)}
            autoFocus
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />

          <button type="submit" className="btn btn-danger" style={{ width: '100%', maxWidth: '300px', display: 'block', margin: '0 auto' }}>
            Ding! Next Word
          </button>
        </form>
      </div>

      {/* Word List Modal */}
      {showWordListModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setShowWordListModal(false)}>
          <div className="round-words-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>📋 Round Word List</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => setShowWordListModal(false)}>
                Close
              </button>
            </div>
            
            <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '4px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Words in this speed round:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {words.slice(0, 50).map((w, idx) => {
                  const res = results[idx];
                  const isCurrent = idx === currentIndex;
                  
                  let statusEmoji = '⚪';
                  let statusText = 'Not Practiced';
                  let statusColor = 'var(--text-secondary)';
                  
                  if (isCurrent) {
                    statusEmoji = '🔵';
                    statusText = 'Active';
                    statusColor = 'var(--primary-hover)';
                  } else if (res) {
                    if (res.correct) {
                      statusEmoji = '🟢';
                      statusText = 'Correct';
                      statusColor = 'var(--success)';
                    } else {
                      statusEmoji = '🔴';
                      statusText = 'Incorrect';
                      statusColor = 'var(--error)';
                    }
                  }
                  
                  return (
                    <div 
                      key={w.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: isCurrent ? 'rgba(79, 70, 229, 0.15)' : 'rgba(255,255,255,0.02)',
                        border: isCurrent ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        transition: 'var(--transition)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: isCurrent ? 'var(--primary-hover)' : 'var(--text-primary)' }}>
                          {idx + 1}. {w.word}
                        </span>
                        {isCurrent && <span style={{ fontSize: '11px', background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Active</span>}
                      </div>
                      <span style={{ fontSize: '12px', color: statusColor, fontWeight: '600' }}>
                        {statusEmoji} {statusText}
                      </span>
                    </div>
                  );
                })}
                {words.length > 50 && (
                  <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', padding: '8px' }}>
                    And {words.length - 50} more words...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
