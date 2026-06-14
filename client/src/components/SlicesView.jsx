import React, { useState } from 'react';
import { Layers, ArrowLeft, Play, Eye, X, HelpCircle, LayoutGrid, CheckCircle } from 'lucide-react';

export default function SlicesView({ words, mode, setView, onStartSlice }) {
  const [sliceSize, setSliceSize] = useState(10);
  const [distributionMode, setDistributionMode] = useState('top-down'); // 'top-down' or 'side-to-side'
  const [selectedSliceIndex, setSelectedSliceIndex] = useState(null);

  const getModeTitle = () => {
    if (mode === 'study') return 'Learning & Practice';
    if (mode === 'standard') return 'Standard Round';
    if (mode === 'speed') return '90s Speed Round';
    return 'Practice Session';
  };

  // Slicing Logic
  const W = words.length;
  const S = sliceSize;
  const N = Math.ceil(W / S); // Number of slices

  // Generate the slices
  const slicesArray = Array.from({ length: N }, () => []);

  if (distributionMode === 'top-down') {
    // Sequentially fill slices
    for (let i = 0; i < N; i++) {
      slicesArray[i] = words.slice(i * S, (i + 1) * S);
    }
  } else {
    // Side-to-side (round-robin) distribution
    for (let j = 0; j < W; j++) {
      const sliceIndex = j % N;
      slicesArray[sliceIndex].push(words[j]);
    }
  }

  // Handle starting a slice session
  const handleStartSlice = (sliceWords) => {
    // Unlock Speech Synthesis on user gesture
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const unlockUtterance = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(unlockUtterance);
    }
    onStartSlice(sliceWords);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '20px auto', width: '100%' }}>
      {/* Top Navigation / Breadcrumbs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '26px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers style={{ color: 'var(--accent)' }} /> Practice Slices
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            We found {words.length} words. Choose a card slice below to inspect and start your {getModeTitle()} session.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => setView('config')}>
          <ArrowLeft size={16} /> Reconfigure
        </button>
      </div>

      {/* Control Panel (Count and Slice size) */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {/* Count Toggle (Top-Down / Side-to-Side) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)' }}>Count:</span>
          <div style={{
            display: 'inline-flex',
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)'
          }}>
            <button
              onClick={() => setDistributionMode('top-down')}
              style={{
                background: distributionMode === 'top-down' ? 'var(--primary)' : 'transparent',
                color: distributionMode === 'top-down' ? 'white' : 'var(--text-secondary)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'var(--transition)'
              }}
            >
              ↓ Top-Down
            </button>
            <button
              onClick={() => setDistributionMode('side-to-side')}
              style={{
                background: distributionMode === 'side-to-side' ? 'var(--primary)' : 'transparent',
                color: distributionMode === 'side-to-side' ? 'white' : 'var(--text-secondary)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'var(--transition)'
              }}
            >
              → Side-to-Side
            </button>
          </div>
        </div>

        {/* Slice Size Toggle (10 / 15 / 20) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)' }}>Slice size:</span>
          <div style={{
            display: 'inline-flex',
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)'
          }}>
            {[10, 15, 20].map(size => (
              <button
                key={size}
                onClick={() => setSliceSize(size)}
                style={{
                  background: sliceSize === size ? 'var(--primary)' : 'transparent',
                  color: sliceSize === size ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Slices Cards Grid */}
      {slicesArray.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <HelpCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3>No words available</h3>
          <p style={{ color: 'var(--text-secondary)' }}>No words matching configuration were found. Go back and select different filters.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {slicesArray.map((sliceWords, idx) => (
            <div
              key={idx}
              className="card"
              onClick={() => setSelectedSliceIndex(idx)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '36px 24px',
                cursor: 'pointer',
                textAlign: 'center',
                border: '1px solid var(--border-color)',
                transition: 'var(--transition)'
              }}
            >
              {/* Brain icon with circular glow */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(79, 70, 229, 0.1)',
                border: '1.5px solid rgba(79, 70, 229, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                color: 'var(--primary-hover)'
              }}>
                <LayoutGrid size={28} />
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '6px' }}>
                Slice {idx + 1}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                {sliceWords.length} Words
              </p>

              <span style={{
                color: 'var(--primary-hover)',
                fontWeight: '700',
                fontSize: '14px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                borderBottom: '1px solid transparent',
                transition: 'var(--transition)'
              }} className="slices-tap-link">
                Tap to view
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Slice Details Modal */}
      {selectedSliceIndex !== null && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setSelectedSliceIndex(null)}>
          <div
            className="round-words-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              width: '100%',
              maxWidth: '550px',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '85vh',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>📋 Slice {selectedSliceIndex + 1} Words</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  {slicesArray[selectedSliceIndex].length} Words in Collection
                </span>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setSelectedSliceIndex(null)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content - List of words */}
            <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '8px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {slicesArray[selectedSliceIndex].map((w, idx) => (
                  <div
                    key={w.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent)' }}>
                        {idx + 1}.
                      </span>
                      <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
                        {w.word}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span className="origin-badge" style={{ fontSize: '11px', padding: '3px 8px' }}>
                        {w.category || 'Other'}
                      </span>
                      {w.tag && (
                        <span className="origin-badge" style={{ fontSize: '11px', padding: '3px 8px', borderColor: 'var(--primary)' }}>
                          {w.tag}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Action Button */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setSelectedSliceIndex(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-accent"
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '800' }}
                onClick={() => {
                  const selectedWords = slicesArray[selectedSliceIndex];
                  setSelectedSliceIndex(null);
                  handleStartSlice(selectedWords);
                }}
              >
                <Play size={16} /> Proceed to Practice 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
