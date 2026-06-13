import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Award, Clock, ArrowLeft, ChevronRight, HelpCircle, Check, X, AlertCircle } from 'lucide-react';

export default function StandardRound({ setView, currentUser, customWords }) {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Game state
  const [inputSpelling, setInputSpelling] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState([]); // Array of { word, userSpelling, correct, hintsUsed }
  const [isGameOver, setIsGameOver] = useState(false);
  
  // Rules hints
  const [showDefinition, setShowDefinition] = useState(false);
  const [showSentence, setShowSentence] = useState(false);
  const [showOrigin, setShowOrigin] = useState(false);
  const [showPOS, setShowPOS] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(false);
  
  // Timer state (60 seconds per word)
  const [timeLeft, setTimeLeft] = useState(60);
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
      const res = await fetch(`/api/words/random?limit=10&userId=${currentUser.id}`);
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

  // Word loading side-effects
  useEffect(() => {
    if (currentWord) {
      speakWord(currentWord.word);
      setInputSpelling('');
      setIsChecked(false);
      setIsCorrect(false);
      
      // Reset hints
      setShowDefinition(false);
      setShowSentence(false);
      setShowOrigin(false);
      setShowPOS(false);
      setHintsUsed(false);
      
      // Reset timer to 60 seconds
      setTimeLeft(60);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            autoSubmitFailure(); // Out of time
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 300);
    }
  }, [currentIndex, words]);

  const [audioSource, setAudioSource] = useState(() => {
    return localStorage.getItem('bee_speller_audio_source') || 'ai';
  });

  const changeAudioSource = (newSource) => {
    setAudioSource(newSource);
    localStorage.setItem('bee_speller_audio_source', newSource);
    if (words[currentIndex]) {
      speakWordWithSource(words[currentIndex].word, newSource);
    }
  };

  const speakWord = (wordText) => {
    speakWordWithSource(wordText, audioSource);
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

  const autoSubmitFailure = () => {
    speakWord("Time is up!");
    setIsCorrect(false);
    setIsChecked(true);
    submitReview(currentWord.id, 0);
    setResults(prev => [...prev, {
      word: currentWord.word,
      userSpelling: "[OUT OF TIME]",
      correct: false,
      hintsUsed
    }]);
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

  const handleCheck = (e) => {
    if (e) e.preventDefault();
    if (!inputSpelling.trim() || isChecked) return;

    clearInterval(timerRef.current);
    const userSpelling = inputSpelling.trim().toLowerCase();
    const correctSpelling = currentWord.word.trim().toLowerCase();
    const match = userSpelling === correctSpelling;

    setIsCorrect(match);
    setIsChecked(true);

    let quality = 1;
    if (match) {
      setScore(prev => prev + 1);
      quality = hintsUsed ? 3 : 5;
      speakWord("Correct!");
    } else {
      quality = 1;
      speakWord(`Incorrect. The correct spelling is ${currentWord.word}`);
    }

    submitReview(currentWord.id, quality);

    setResults(prev => [...prev, {
      word: currentWord.word,
      userSpelling: inputSpelling,
      correct: match,
      hintsUsed
    }]);
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsGameOver(true);
    }
  };

  const requestHint = (type) => {
    setHintsUsed(true);
    if (type === 'def') setShowDefinition(true);
    if (type === 'sent') setShowSentence(true);
    if (type === 'orig') setShowOrigin(true);
    if (type === 'pos') setShowPOS(true);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <p>Loading standard round words...</p>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="practice-container card" style={{ padding: '48px', maxWidth: '600px' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚠️</div>
        <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>Database is empty!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
          Please upload some words from your spelling bee booklet in the Admin settings before attempting practice rounds.
        </p>
        <button className="btn btn-secondary" onClick={() => setView('dashboard')}>
          <ArrowLeft size={16} /> Back to Home
        </button>
      </div>
    );
  }

  if (isGameOver) {
    return (
      <div className="practice-container">
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '72px', color: 'var(--accent)', marginBottom: '16px' }}>🏆</div>
          <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Standard Round Complete!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            You scored <strong style={{ color: 'var(--accent)', fontSize: '22px' }}>{score}</strong> out of <strong style={{ fontSize: '18px' }}>{words.length}</strong>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '24px 0', maxHeight: '300px', overflowY: 'auto', textAlign: 'left' }}>
            <h4 style={{ fontSize: '15px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              Results Summary
            </h4>
            {results.map((res, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', borderLeft: `4px solid ${res.correct ? 'var(--success)' : 'var(--error)'}` }}>
                <div>
                  <strong style={{ fontSize: '16px', color: res.correct ? 'var(--success)' : 'var(--text-primary)' }}>{res.word}</strong>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Your spelling: <span style={{ textDecoration: res.correct ? 'none' : 'line-through', color: res.correct ? 'var(--text-secondary)' : 'var(--error)' }}>{res.userSpelling}</span>
                  </div>
                </div>
                <div>
                  {res.correct ? (
                    <span style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '12px' }}>CORRECT {res.hintsUsed && '(Hints)'}</span>
                  ) : (
                    <span style={{ color: 'var(--error)', fontWeight: 'bold', fontSize: '12px' }}>WRONG</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '32px' }}>
            <button className="btn btn-secondary" onClick={() => setView('dashboard')}>
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
            <button className="btn btn-primary" onClick={() => {
              setIsGameOver(false);
              setScore(0);
              setResults([]);
              setCurrentIndex(0);
              fetchRandomWords();
            }}>
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const timerColor = timeLeft > 30 ? '' : timeLeft > 10 ? 'warning' : 'danger';

  return (
    <div className="practice-container">
      {/* Session Progress Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button className="btn btn-secondary" style={{ padding: '8px 14px' }} onClick={() => setView('dashboard')}>
          <ArrowLeft size={16} /> Quit Game
        </button>
        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
          Standard Round: Word {currentIndex + 1} of {words.length}
        </span>
      </div>

      <div className="card" style={{ padding: '32px' }}>
        {/* Timer UI */}
        <div className="timer-container">
          <div className={`timer-circle ${timerColor}`}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Timer</span>
            <span className="timer-value">{timeLeft}s</span>
          </div>
        </div>

        {/* Audio Button & Source Selector */}
        <div className="word-player-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="audio-btn" onClick={() => speakWord(currentWord.word)} title="Listen to word" style={{ width: '64px', height: '64px', borderRadius: '50%' }}>
              <Volume2 size={28} />
            </button>
            <select 
              value={audioSource} 
              onChange={(e) => changeAudioSource(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                padding: '6px 12px',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
                height: '36px'
              }}
            >
              <option value="ai" style={{ background: '#0b0f19' }}>🔊 AI Voice</option>
              <option value="system" style={{ background: '#0b0f19' }}>🎙️ System TTS</option>
            </select>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Click to play spelling pronunciation</p>
        </div>

        {/* Input */}
        <form onSubmit={handleCheck}>
          <input
            ref={inputRef}
            type="text"
            className={`spelling-input ${isChecked ? (isCorrect ? 'correct' : 'incorrect') : ''}`}
            placeholder="Type your spelling here"
            value={inputSpelling}
            onChange={(e) => setInputSpelling(e.target.value)}
            disabled={isChecked}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />

          {!isChecked ? (
            <button type="submit" className="btn btn-primary" style={{ width: '100%', maxWidth: '300px', display: 'block', margin: '0 auto 24px' }}>
              Submit Spelling
            </button>
          ) : (
            <button type="button" className="btn btn-accent" style={{ width: '100%', maxWidth: '300px', display: 'block', margin: '0 auto 24px' }} onClick={handleNext}>
              Next Word <ChevronRight size={18} />
            </button>
          )}
        </form>

        {/* Review feedback */}
        {isChecked && (
          <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
            {isCorrect ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--success)', fontWeight: '700', fontSize: '20px' }}>
                <Check size={24} /> Correct! +1 Point
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--error)', fontWeight: '700', fontSize: '20px', marginBottom: '8px' }}>
                  <X size={24} /> Incorrect Spelling
                </div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Correct: <span style={{ color: 'var(--success)' }}>{currentWord.word}</span>
                </div>
                {timeLeft === 0 && (
                  <div style={{ color: 'var(--error)', fontSize: '13px', marginTop: '6px' }}>Reason: Run out of time (60 seconds)</div>
                )}
              </div>
            )}
            {currentWord.spelling_tip && (
              <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '14px', textAlign: 'left', color: 'var(--accent)' }}>
                💡 <strong>Etymology Tip:</strong> {currentWord.spelling_tip}
              </div>
            )}
          </div>
        )}

        {/* Lifelines section */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', textAlign: 'left' }}>
          <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HelpCircle size={14} /> Lifelines (Rule 9 allowed requests)
          </h4>
          
          <div className="lifelines-grid">
            <button type="button" className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '13px' }} onClick={() => requestHint('def')} disabled={showDefinition}>
              1. Definition
            </button>
            <button type="button" className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '13px' }} onClick={() => requestHint('sent')} disabled={showSentence}>
              2. Context Sentence
            </button>
            <button type="button" className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '13px' }} onClick={() => requestHint('orig')} disabled={showOrigin}>
              3. Language of Origin
            </button>
            <button type="button" className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '13px' }} onClick={() => requestHint('pos')} disabled={showPOS}>
              4. Part of Speech
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
            {showDefinition && (
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: '3px solid var(--primary)' }}>
                <strong>Definition:</strong> {currentWord.definition}
              </div>
            )}
            {showSentence && (
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: '3px solid var(--primary)', fontStyle: 'italic' }}>
                <strong>Sentence:</strong> "{currentWord.sentence}"
              </div>
            )}
            {showOrigin && (
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: '3px solid var(--accent)' }}>
                <strong>Origin:</strong> {currentWord.category || 'Unknown'}
              </div>
            )}
            {showPOS && (
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: '3px solid var(--primary)' }}>
                <strong>Part of Speech:</strong> {currentWord.part_of_speech}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
