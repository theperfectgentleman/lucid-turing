import { useState } from 'react'
import Dashboard from './components/Dashboard'
import StudyMode from './components/StudyMode'
import StandardRound from './components/StandardRound'
import SpeedRound from './components/SpeedRound'
import AdminConfig from './components/AdminConfig'
import { LayoutGrid, Brain, Zap, Settings, Award } from 'lucide-react'
import './App.css'

function App() {
  const [view, setView] = useState('dashboard')

  return (
    <>
      <header className="navbar">
        <a href="#" className="logo" onClick={() => setView('dashboard')}>
          🐝 <span>BeeSpeller</span> AI
        </a>
        <nav className="nav-links">
          <button 
            className={`nav-button ${view === 'dashboard' ? 'active' : ''}`} 
            onClick={() => setView('dashboard')}
          >
            <LayoutGrid size={16} /> Dashboard
          </button>
          <button 
            className={`nav-button ${view === 'study' ? 'active' : ''}`} 
            onClick={() => setView('study')}
          >
            <Brain size={16} /> Study
          </button>
          <button 
            className={`nav-button ${view === 'standard' ? 'active' : ''}`} 
            onClick={() => setView('standard')}
          >
            <Award size={16} /> Standard Round
          </button>
          <button 
            className={`nav-button ${view === 'speed' ? 'active' : ''}`} 
            onClick={() => setView('speed')}
          >
            <Zap size={16} /> Speed Round
          </button>
          <button 
            className={`nav-button ${view === 'admin' ? 'active' : ''}`} 
            onClick={() => setView('admin')}
          >
            <Settings size={16} /> Admin
          </button>
        </nav>
      </header>

      <main className="app-container">
        {view === 'dashboard' && <Dashboard setView={setView} />}
        {view === 'study' && <StudyMode setView={setView} />}
        {view === 'standard' && <StandardRound setView={setView} />}
        {view === 'speed' && <SpeedRound setView={setView} />}
        {view === 'admin' && <AdminConfig setView={setView} />}
      </main>
    </>
  )
}

export default App

