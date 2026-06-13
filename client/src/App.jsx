import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import StudyMode from './components/StudyMode'
import StandardRound from './components/StandardRound'
import SpeedRound from './components/SpeedRound'
import AdminConfig from './components/AdminConfig'
import HistoryView from './components/HistoryView'
import SessionConfig from './components/SessionConfig'
import { LayoutGrid, Brain, Zap, Settings, Award, LogOut, Lock, User, Clock, Sun, Moon, Menu, X } from 'lucide-react'
import './App.css'

function App() {
  const [authState, setAuthState] = useState('logged-out') // 'logged-out', 'student', 'admin'
  const [currentUser, setCurrentUser] = useState(null) // { id, name }
  const [profiles, setProfiles] = useState([])
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [pinInput, setPinInput] = useState('')
  
  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('bee_speller_theme') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('bee_speller_theme', newTheme);
  };
  
  // Custom Session Config States
  const [customWords, setCustomWords] = useState(null)
  const [activeConfigMode, setActiveConfigMode] = useState(null) // 'study', 'standard', 'speed'

  // Admin Login State
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [authError, setAuthError] = useState('')
  
  const [view, setView] = useState('dashboard')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Fetch profiles on load for student select
  useEffect(() => {
    if (authState === 'logged-out') {
      fetchProfiles()
    }
  }, [authState])

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/auth/profiles')
      if (res.ok) {
        const data = await res.json()
        setProfiles(data.profiles || [])
        if (data.profiles && data.profiles.length > 0) {
          setSelectedProfileId(data.profiles[0].id)
        }
      }
    } catch (e) {
      console.error('Error fetching user profiles:', e)
    }
  }

  const handleStudentLogin = async (e) => {
    if (e) e.preventDefault()
    setAuthError('')
    if (!selectedProfileId || !pinInput) {
      setAuthError('Please select a profile and enter PIN code.')
      return
    }

    try {
      const res = await fetch('/api/auth/user-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: selectedProfileId, pin: pinInput })
      })

      if (res.ok) {
        const data = await res.json()
        setCurrentUser(data.user)
        setAuthState('student')
        setPinInput('')
        setView('dashboard')
      } else {
        const err = await res.json()
        setAuthError(err.error || 'Invalid PIN code.')
      }
    } catch (e) {
      setAuthError('Could not connect to the authentication server.')
    }
  }

  const handleAdminLogin = async (e) => {
    if (e) e.preventDefault()
    setAuthError('')
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword })
      })

      if (res.ok) {
        setAuthState('admin')
        setAdminUsername('')
        setAdminPassword('')
        setView('admin')
      } else {
        setAuthError('Invalid admin username or password.')
      }
    } catch (e) {
      setAuthError('Could not connect to the authentication server.')
    }
  }

  const handleLogout = () => {
    setAuthState('logged-out')
    setCurrentUser(null)
    setIsAdminMode(false)
    setAuthError('')
  }

  const startCustomSession = async (config) => {
    // Unlock Speech Synthesis on user gesture
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const unlockUtterance = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(unlockUtterance);
    }

    try {
      const queryParams = new URLSearchParams({
        userId: currentUser.id,
        source: config.source,
        category: config.category,
        orderWords: config.orderWords,
        orderCategories: config.orderCategories,
        limit: config.limit
      });
      
      const res = await fetch(`/api/words/custom?${queryParams}`);
      if (res.ok) {
        const data = await res.json();
        if (data.words && data.words.length > 0) {
          setCustomWords(data.words);
          setActiveConfigMode(config.mode);
          setView(config.mode);
        } else {
          alert("No words match this custom configuration!");
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (authState === 'logged-out') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '36px', borderTop: '4px solid var(--accent)' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '6px' }}>🐝 BeeSpeller</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Junior Spelling Bee AI Learning Portal</p>
          </div>

          {authError && (
            <div className="card" style={{ background: 'var(--error-glow)', borderColor: 'var(--error)', padding: '12px', marginBottom: '20px', fontSize: '13px', color: 'red', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ {authError}
            </div>
          )}

          {!isAdminMode ? (
            /* Student Login */
            <form onSubmit={handleStudentLogin}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} /> Select Student Profile
                </label>
                <select 
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '16px' }}
                >
                  {profiles.length === 0 ? (
                    <option value="">No profiles found. Login as Admin to create one.</option>
                  ) : (
                    profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={14} /> Enter 4-Digit Access PIN
                </label>
                <input 
                  type="password" 
                  maxLength="8"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="PIN code"
                  className="form-control"
                  style={{ fontSize: '20px', letterSpacing: '0.2em', textAlign: 'center', fontWeight: 'bold' }}
                />
              </div>

              <button type="submit" className="btn btn-accent" style={{ width: '100%', marginTop: '16px' }} disabled={profiles.length === 0}>
                Enter Study Portal
              </button>

              <div style={{ textAlign: 'center', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button type="button" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => { setIsAdminMode(true); setAuthError(''); }}>
                  🔒 Admin Portal
                </button>
              </div>
            </form>
          ) : (
            /* Admin Login */
            <form onSubmit={handleAdminLogin}>
              <div className="form-group">
                <label className="form-label">Admin Username</label>
                <input 
                  type="text" 
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="Username"
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Password"
                  className="form-control"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                Verify Admin Credentials
              </button>

              <div style={{ textAlign: 'center', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button type="button" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => { setIsAdminMode(false); setAuthError(''); }}>
                  👤 Back to Student Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <header className="navbar">
        <a href="#" className="logo" onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }}>
          🐝 <span>BeeSpeller</span> AI
        </a>
        
        {/* Mobile Menu Toggle Button */}
        {authState !== 'logged-out' && (
          <button 
            className="menu-toggle nav-button" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            title="Toggle Menu"
            style={{ padding: '8px', display: 'none' }}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        {/* Desktop Navigation */}
        <nav className="nav-links">
          {authState === 'student' && (
            <>
              <button 
                className={`nav-button ${view === 'dashboard' ? 'active' : ''}`} 
                onClick={() => setView('dashboard')}
              >
                <LayoutGrid size={16} /> Dashboard
              </button>
              <button 
                className={`nav-button ${view === 'study' || (view === 'config' && activeConfigMode === 'study') ? 'active' : ''}`} 
                onClick={() => { setActiveConfigMode('study'); setView('config'); }}
              >
                <Brain size={16} /> Study
              </button>
              <button 
                className={`nav-button ${view === 'standard' || (view === 'config' && activeConfigMode === 'standard') ? 'active' : ''}`} 
                onClick={() => { setActiveConfigMode('standard'); setView('config'); }}
              >
                <Award size={16} /> Standard Round
              </button>
              <button 
                className={`nav-button ${view === 'speed' || (view === 'config' && activeConfigMode === 'speed') ? 'active' : ''}`} 
                onClick={() => { setActiveConfigMode('speed'); setView('config'); }}
              >
                <Zap size={16} /> Speed Round
              </button>
              <button 
                className={`nav-button ${view === 'history' ? 'active' : ''}`} 
                onClick={() => setView('history')}
              >
                <Clock size={16} /> History
              </button>
            </>
          )}
          {authState === 'admin' && (
            <button 
              className={`nav-button ${view === 'admin' ? 'active' : ''}`} 
              onClick={() => setView('admin')}
            >
              <Settings size={16} /> Admin Config
            </button>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '12px', borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
            <button 
              className="nav-button" 
              style={{ padding: '6px', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
              onClick={toggleTheme} 
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              {authState === 'admin' ? '👑 Admin' : `👤 ${currentUser?.name}`}
            </span>
            <button className="nav-button" style={{ color: 'var(--error)', padding: '6px 10px' }} onClick={handleLogout} title="Log Out">
              <LogOut size={15} /> Logout
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Navigation Dropdown Overlay */}
      {isMobileMenuOpen && authState !== 'logged-out' && (
        <div className="mobile-nav-overlay" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="mobile-nav-menu" onClick={(e) => e.stopPropagation()}>
            {authState === 'student' && (
              <>
                <button 
                  className={`mobile-nav-item ${view === 'dashboard' ? 'active' : ''}`} 
                  onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }}
                >
                  <LayoutGrid size={18} /> Dashboard
                </button>
                <button 
                  className={`mobile-nav-item ${view === 'study' || (view === 'config' && activeConfigMode === 'study') ? 'active' : ''}`} 
                  onClick={() => { setActiveConfigMode('study'); setView('config'); setIsMobileMenuOpen(false); }}
                >
                  <Brain size={18} /> Study
                </button>
                <button 
                  className={`mobile-nav-item ${view === 'standard' || (view === 'config' && activeConfigMode === 'standard') ? 'active' : ''}`} 
                  onClick={() => { setActiveConfigMode('standard'); setView('config'); setIsMobileMenuOpen(false); }}
                >
                  <Award size={18} /> Standard Round
                </button>
                <button 
                  className={`mobile-nav-item ${view === 'speed' || (view === 'config' && activeConfigMode === 'speed') ? 'active' : ''}`} 
                  onClick={() => { setActiveConfigMode('speed'); setView('config'); setIsMobileMenuOpen(false); }}
                >
                  <Zap size={18} /> Speed Round
                </button>
                <button 
                  className={`mobile-nav-item ${view === 'history' ? 'active' : ''}`} 
                  onClick={() => { setView('history'); setIsMobileMenuOpen(false); }}
                >
                  <Clock size={18} /> History
                </button>
              </>
            )}
            {authState === 'admin' && (
              <button 
                className={`mobile-nav-item ${view === 'admin' ? 'active' : ''}`} 
                onClick={() => { setView('admin'); setIsMobileMenuOpen(false); }}
              >
                <Settings size={18} /> Admin Config
              </button>
            )}
            
            <div className="mobile-nav-divider"></div>
            
            <div className="mobile-nav-footer">
              <button 
                className="nav-button" 
                style={{ padding: '8px', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }} 
                onClick={toggleTheme} 
                title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600', flexGrow: 1, textAlign: 'center' }}>
                {authState === 'admin' ? '👑 Admin' : `👤 ${currentUser?.name}`}
              </span>
              <button 
                className="btn btn-danger" 
                style={{ padding: '8px 12px', fontSize: '13px' }} 
                onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="app-container">
        {view === 'dashboard' && authState === 'student' && (
          <Dashboard 
            setView={(targetView) => {
              if (targetView === 'study' || targetView === 'standard' || targetView === 'speed') {
                setActiveConfigMode(targetView);
                setView('config');
              } else {
                setView(targetView);
              }
            }} 
            currentUser={currentUser} 
          />
        )}
        {view === 'config' && authState === 'student' && (
          <SessionConfig 
            mode={activeConfigMode} 
            currentUser={currentUser} 
            setView={setView} 
            onStart={(wordsList) => {
              setCustomWords(wordsList);
              setView(activeConfigMode);
            }} 
          />
        )}
        {view === 'study' && authState === 'student' && (
          <StudyMode setView={setView} currentUser={currentUser} customWords={customWords} />
        )}
        {view === 'standard' && authState === 'student' && (
          <StandardRound setView={setView} currentUser={currentUser} customWords={customWords} />
        )}
        {view === 'speed' && authState === 'student' && (
          <SpeedRound setView={setView} currentUser={currentUser} customWords={customWords} />
        )}
        {view === 'history' && authState === 'student' && (
          <HistoryView setView={setView} currentUser={currentUser} startCustomSession={startCustomSession} />
        )}
        {view === 'admin' && authState === 'admin' && <AdminConfig setView={setView} />}
      </main>
    </>
  )
}

export default App
