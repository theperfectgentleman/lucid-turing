import React, { useState, useEffect, useRef } from 'react';
import { Volume2, ChevronRight, HelpCircle, Check, X, ArrowLeft, RefreshCw, Layers } from 'lucide-react';

export default function StudyMode({ setView, currentUser, customWords }) {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Card flip state
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Spell checking state
  const [inputSpelling, setInputSpelling] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(false);
  
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

  const inputRef = useRef(null);

  useEffect(() => {
    if (customWords && customWords.length > 0) {
      setWords(customWords);
      setLoading(false);
    } else {
      fetchDueWords();
    }
  }, [customWords]);

  const fetchDueWords = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/words/due?limit=15&userId=${currentUser.id}`);
      if (!res.ok) throw new Error('Failed to fetch words');
      const data = await res.json();
      setWords(data.words || []);
    } catch (error) {
      console.error('Error fetching due words:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentWord = words[currentIndex];

  useEffect(() => {
    if (currentWord) {
      // Speak the word on new word load
      speakWord(currentWord.word);
      // Reset input states
      setInputSpelling('');
      setIsChecked(false);
      setIsCorrect(false);
      setHintsUsed(false);
      setIsFlipped(false); // Start on study front card
    }
  }, [currentIndex, words]);

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
      utterance.rate = 0.85; // Speak slightly slower for spelling clarity
      utterance.pitch = 1;
      
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(voice => 
        voice.lang.startsWith('en-US') || voice.lang.startsWith('en-GB')
      );
      if (englishVoice) utterance.voice = englishVoice;
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Text-to-speech is not supported on this browser.");
    }
  };

  const handleCheck = async (e) => {
    if (e) e.preventDefault();
    if (!inputSpelling.trim() || isChecked) return;

    const userSpelling = inputSpelling.trim().toLowerCase();
    const correctSpelling = currentWord.word.trim().toLowerCase();
    const match = userSpelling === correctSpelling;

    setIsCorrect(match);
    setIsChecked(true);

    let quality = 1;
    if (match) {
      quality = hintsUsed ? 3 : 5;
    } else {
      quality = 1;
    }

    if (match) {
      speakWord("Correct!");
    } else {
      speakWord(`Incorrect. The correct spelling is ${currentWord.word}`);
    }

    try {
      await fetch(`/api/words/${currentWord.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quality, userId: currentUser.id })
      });
    } catch (error) {
      console.error('Error saving word review:', error);
    }
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setWords([]);
      setCurrentIndex(0);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <p>Loading your review stack...</p>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="practice-container card" style={{ padding: '48px', maxWidth: '600px' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🏆</div>
        <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>Review Queue Clear!</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '32px' }}>
          Great job! There are no words due for review right now. You can check back later, or practice a standard round to test random words.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={() => setView('dashboard')}>
            <ArrowLeft size={16} /> Back to Home
          </button>
          <button className="btn btn-primary" onClick={fetchDueWords}>
            <RefreshCw size={16} /> Check Again
          </button>
        </div>
      </div>
    );
  }

  const progressPct = (currentIndex / words.length) * 100;

  return (
    <div className="practice-container">
      {/* Session Progress Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <button className="btn btn-secondary" style={{ padding: '8px 14px' }} onClick={() => setView('dashboard')}>
          <ArrowLeft size={16} /> Leave
        </button>
        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
          Review stack: {currentIndex + 1} of {words.length}
        </span>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${progressPct}%` }}></div>
      </div>

      {/* Main card */}
      <div className="card" style={{ padding: '32px', position: 'relative', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        
        {/* Card Header (Category, Box Level, Mode indicator) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <span className="origin-badge">
            🌍 {currentWord.category || 'Other'} {currentWord.tag ? `• ${currentWord.tag}` : ''}
          </span>
          <span className="origin-badge" style={{ borderColor: 'rgba(234, 179, 8, 0.2)', color: 'var(--accent)' }}>
            <Layers size={13} style={{ marginRight: '4px' }} /> Box {currentWord.box} ({!isFlipped ? 'STUDY CARD' : 'TEST CARD'})
          </span>
        </div>

        {/* Card Body */}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {!isFlipped ? (
            /* FRONT: Study/Learning view */
            <div>
              {/* Lego Blocks (Syllable Breakdown) - Primary Visual for Learning */}
              <div style={{ 
                background: 'rgba(0, 0, 0, 0.2)', 
                padding: '24px', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--border-color)', 
                marginBottom: '24px' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                        Lego Blocks (Syllable Breakdown)
                      </h2>
                      <select 
                        value={audioSource} 
                        onChange={(e) => changeAudioSource(e.target.value)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-secondary)',
                          padding: '4px 8px',
                          fontSize: '12px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="ai" style={{ background: '#0b0f19' }}>🔊 AI Voice</option>
                        <option value="system" style={{ background: '#0b0f19' }}>🎙️ System TTS</option>
                      </select>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', marginBottom: 0 }}>
                      Words are built from blocks. Learn the block structure to make spelling easier:
                    </p>
                  </div>
                  <button 
                    className="audio-btn" 
                    onClick={() => speakWord(currentWord.word)} 
                    title="Listen to word"
                    style={{ 
                      width: '56px', 
                      height: '56px', 
                      padding: '0', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      borderRadius: '50%',
                      flexShrink: 0
                    }}
                  >
                    <Volume2 size={26} />
                  </button>
                </div>

                <div className="lego-container" style={{ justifyContent: 'center', margin: '20px 0 8px', gap: '12px' }}>
                  {currentWord.morphemes && currentWord.morphemes.length > 0 ? (
                    currentWord.morphemes.map((m, idx) => (
                      <div 
                        key={idx} 
                        className={`lego-block ${m.type || 'syllable'}`}
                        style={{
                          padding: '16px 24px',
                          fontSize: '24px',
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '90px'
                        }}
                      >
                        <span style={{ fontWeight: '800', letterSpacing: '0.5px' }}>{m.text}</span>
                        {m.meaning && (
                          <span className="lego-block-meaning" style={{ fontSize: '11px', marginTop: '4px', opacity: 0.9 }}>
                            ({m.meaning})
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div 
                      className="lego-block syllable"
                      style={{
                        padding: '16px 24px',
                        fontSize: '24px',
                        borderRadius: '12px',
                        fontWeight: '800'
                      }}
                    >
                      {currentWord.word}
                    </div>
                  )}
                </div>
              </div>

              {/* Study Clues */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left', marginBottom: '32px' }}>
                {/* Definition */}
                <div style={{ borderLeft: '3px solid var(--primary-hover)', paddingLeft: '12px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '2px', letterSpacing: '0.5px' }}>
                    Definition ({currentWord.part_of_speech})
                  </span>
                  <p style={{ fontSize: '16px', margin: 0, color: 'var(--text-primary)', lineHeight: '1.4' }}>
                    {currentWord.definition}
                  </p>
                </div>

                {/* Example Sentence */}
                {currentWord.sentence && (
                  <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '12px' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '2px', letterSpacing: '0.5px' }}>
                      Example Sentence
                    </span>
                    <p style={{ fontSize: '15px', fontStyle: 'italic', margin: 0, color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      "{currentWord.sentence}"
                    </p>
                  </div>
                )}

                {/* Spelling Tip */}
                {currentWord.spelling_tip && (
                  <div style={{ borderLeft: '3px solid var(--success)', paddingLeft: '12px' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '2px', letterSpacing: '0.5px' }}>
                      Spelling Rule / Tip
                    </span>
                    <p style={{ fontSize: '14px', margin: 0, color: 'var(--accent)', lineHeight: '1.4' }}>
                      💡 {currentWord.spelling_tip}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button 
                className="btn btn-accent" 
                style={{ width: '100%', maxWidth: '300px', display: 'block', margin: '0 auto', fontSize: '16px', fontWeight: 'bold', padding: '12px 24px' }}
                onClick={() => {
                  setIsFlipped(true);
                  setTimeout(() => {
                    if (inputRef.current) inputRef.current.focus();
                  }, 150);
                }}
              >
                Test Spelling (Flip Card)
              </button>
            </div>
          ) : (
            /* BACK: Typing / Spelling test view */
            <div>
              {/* Speaker Pronunciation */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button 
                    className="audio-btn" 
                    onClick={() => speakWord(currentWord.word)} 
                    title="Listen to word" 
                    style={{ width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
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
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500', margin: 0 }}>Tap to play spelling pronunciation</p>
              </div>

              {/* Typing Input */}
              <form onSubmit={handleCheck} style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
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
                  style={{ fontSize: '24px', textAlign: 'center', padding: '12px', marginBottom: '20px', letterSpacing: '0.5px' }}
                />

                {!isChecked ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px' }} disabled={!inputSpelling.trim()}>
                      Check Spelling
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ width: '100%', padding: '10px' }}
                      onClick={() => {
                        setHintsUsed(true);
                        setIsFlipped(false);
                      }}
                    >
                      ← Flip back to Study
                    </button>
                  </div>
                ) : (
                  <button type="button" className="btn btn-accent" style={{ width: '100%', display: 'block', margin: '0 auto', padding: '10px' }} onClick={handleNext}>
                    Next Word <ChevronRight size={18} />
                  </button>
                )}
              </form>

              {/* Answers & Reviews */}
              {isChecked && (
                <div style={{ marginTop: '32px', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', textAlign: 'left', border: '1px solid var(--border-color)' }}>
                  {isCorrect ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: '700', fontSize: '20px', marginBottom: '16px' }}>
                      <Check size={24} /> Perfect! Correct Spelling.
                    </div>
                  ) : (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)', fontWeight: '700', fontSize: '20px', marginBottom: '12px' }}>
                        <X size={24} /> Incorrect Spelling.
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        Correct: <span style={{ color: 'var(--success)' }}>{currentWord.word}</span>
                      </div>
                      <div style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
                        Your spelling: <span style={{ color: 'var(--error)', textDecoration: 'line-through' }}>{inputSpelling}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Lego Blocks review */}
                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
                      🧩 Word Structure Breakdown:
                    </p>
                    <div className="lego-container" style={{ justifyContent: 'flex-start', margin: '8px 0 0' }}>
                      {currentWord.morphemes && currentWord.morphemes.length > 0 ? (
                        currentWord.morphemes.map((m, idx) => (
                          <div key={idx} className={`lego-block ${m.type || 'syllable'}`}>
                            {m.text}
                            {m.meaning && (
                              <span className="lego-block-meaning">({m.meaning})</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="lego-block syllable">
                          {currentWord.word}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Spelling Tip */}
                  {currentWord.spelling_tip && (
                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontSize: '14px', color: 'var(--accent)', lineHeight: '1.4' }}>
                      💡 <strong>Spelling Rule:</strong> {currentWord.spelling_tip}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
