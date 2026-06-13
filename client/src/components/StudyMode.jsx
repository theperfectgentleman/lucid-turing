import React, { useState, useEffect, useRef } from 'react';
import { Volume2, ChevronRight, HelpCircle, Check, X, ArrowLeft, RefreshCw, Layers } from 'lucide-react';

export default function StudyMode({ setView, currentUser, customWords }) {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Spell checking state
  const [inputSpelling, setInputSpelling] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // Hints state
  const [showDefinition, setShowDefinition] = useState(false);
  const [showSentence, setShowSentence] = useState(false);
  const [showPOS, setShowPOS] = useState(false);
  const [showLego, setShowLego] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(false);
  
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
      // Reset hints
      setShowDefinition(false);
      setShowSentence(false);
      setShowPOS(false);
      setShowLego(false);
      setHintsUsed(false);
      
      // Focus input field
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 300);
    }
  }, [currentIndex, words]);

  const speakWord = (wordText) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(wordText);
      utterance.rate = 0.85; // Speak slightly slower for spelling clarity
      utterance.pitch = 1;
      
      // Try to find a high quality English voice (preferably UK or US)
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(voice => 
        voice.lang.startsWith('en-US') || voice.lang.startsWith('en-GB')
      );
      if (englishVoice) utterance.voice = englishVoice;
      
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-speech is not supported on this browser.");
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

    // Determine quality rating for SuperMemo-2
    // 5 = Perfect, no hints
    // 3 = Correct, with hints
    // 1 = Incorrect
    let quality = 1;
    if (match) {
      quality = hintsUsed ? 3 : 5;
    } else {
      quality = 1;
    }

    // Speak result
    if (match) {
      speakWord("Correct!");
    } else {
      speakWord(`Incorrect. The correct spelling is ${currentWord.word}`);
    }

    // Save progress to database
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
      // Out of words
      setWords([]);
      setCurrentIndex(0);
    }
  };

  const activateHint = (hintType) => {
    setHintsUsed(true);
    if (hintType === 'def') setShowDefinition(true);
    if (hintType === 'sent') setShowSentence(true);
    if (hintType === 'pos') setShowPOS(true);
    if (hintType === 'lego') {
      setShowLego(true);
      // If we show Lego hint, auto reveal origin and tip
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <p>Loading your review stack...</p>
      </div>
    );
  }

  // Completed study session or no words
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

  // Progress percentage
  const progressPct = ((currentIndex) / words.length) * 100;

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
      <div className="card" style={{ padding: '32px', position: 'relative' }}>
        {/* Box label */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span className="origin-badge">
            🌍 {currentWord.category || 'Other'}
          </span>
          <span className="origin-badge" style={{ borderColor: 'rgba(234, 179, 8, 0.2)', color: 'var(--accent)' }}>
            <Layers size={13} style={{ marginRight: '4px' }} /> Box {currentWord.box}
          </span>
        </div>

        {/* Audio Button */}
        <div className="word-player-container">
          <button className="audio-btn" onClick={() => speakWord(currentWord.word)} title="Listen to word">
            <Volume2 size={36} />
          </button>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Click to play spelling pronunciation</p>
        </div>

        {/* Form Input */}
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
              Check Spelling
            </button>
          ) : (
            <button type="button" className="btn btn-accent" style={{ width: '100%', maxWidth: '300px', display: 'block', margin: '0 auto 24px' }} onClick={handleNext}>
              Next Word <ChevronRight size={18} />
            </button>
          )}
        </form>

        {/* Post-Check Answer reveals */}
        {isChecked && (
          <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
            {isCorrect ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--success)', fontWeight: '700', fontSize: '20px' }}>
                <Check size={24} /> Perfect! Correct Spelling.
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--error)', fontWeight: '700', fontSize: '20px', marginBottom: '8px' }}>
                  <X size={24} /> Incorrect Spelling.
                </div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Correct: <span style={{ color: 'var(--success)' }}>{currentWord.word}</span>
                </div>
                <div style={{ fontSize: '16px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Your spelling: <span style={{ color: 'var(--error)', textDecoration: 'line-through' }}>{inputSpelling}</span>
                </div>
              </div>
            )}
            
            {/* Spelling Tip */}
            {currentWord.spelling_tip && (
              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontSize: '14px', textAlign: 'left', color: 'var(--accent)' }}>
                💡 <strong>Spelling Rule:</strong> {currentWord.spelling_tip}
              </div>
            )}
          </div>
        )}

        {/* Hints Section */}
        <div className="hints-container">
          <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HelpCircle size={14} /> Lifelines & Hints (Using hints caps score for this card)
          </h4>

          {/* Definition Hint */}
          <div className="hint-item">
            <div className="hint-header" onClick={() => !showDefinition && activateHint('def')}>
              <span>Definition</span>
              <span>{!showDefinition && "Reveal"}</span>
            </div>
            {showDefinition && (
              <div className="hint-content">
                <strong>[{currentWord.part_of_speech}]</strong>: {currentWord.definition}
              </div>
            )}
          </div>

          {/* Sentence Hint */}
          <div className="hint-item">
            <div className="hint-header" onClick={() => !showSentence && activateHint('sent')}>
              <span>Sentence Example</span>
              <span>{!showSentence && "Reveal"}</span>
            </div>
            {showSentence && (
              <div className="hint-content" style={{ fontStyle: 'italic' }}>
                "{currentWord.sentence}"
              </div>
            )}
          </div>

          {/* Part of Speech Hint */}
          <div className="hint-item">
            <div className="hint-header" onClick={() => !showPOS && activateHint('pos')}>
              <span>Part of Speech</span>
              <span>{!showPOS && "Reveal"}</span>
            </div>
            {showPOS && (
              <div className="hint-content">
                This word is a <strong>{currentWord.part_of_speech}</strong>.
              </div>
            )}
          </div>

          {/* Lego Blocks (Morphological Breakdown) Hint */}
          <div className="hint-item">
            <div className="hint-header" onClick={() => !showLego && activateHint('lego')}>
              <span>Lego Blocks (Syllable Breakdown)</span>
              <span>{!showLego && "Reveal"}</span>
            </div>
            {(showLego || (isChecked && !isCorrect)) && (
              <div className="hint-content" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Words are built from blocks. Learn the block structure to make spelling easier:
                </p>
                <div className="lego-container">
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
