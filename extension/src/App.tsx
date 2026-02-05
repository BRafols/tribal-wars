import { WorldInfoCard } from './components'
import { useGameState } from './hooks'
import './App.css'

function App() {
  const { isConnected, worldInfo, lastUpdated, loading } = useGameState()

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Tribal Wars Bot</h1>
        <span className="app-version">v0.1.0</span>
      </header>
      <main className="app-content">
        <WorldInfoCard worldInfo={worldInfo} isConnected={isConnected} lastUpdated={lastUpdated} />
      </main>
    </div>
  )
}

export default App
