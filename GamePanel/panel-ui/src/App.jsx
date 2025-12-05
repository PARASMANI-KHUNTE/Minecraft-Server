import { useState, useEffect } from 'react'
import Console from './components/Console'
import './App.css'

function App() {
  const [status, setStatus] = useState('OFFLINE')
  const [players, setPlayers] = useState([])
  const [logs, setLogs] = useState([])
  const [uptime, setUptime] = useState(0)
  const [startTime, setStartTime] = useState(null)

  useEffect(() => {
    // Get initial status
    window.api.getStatus().then(data => {
      setStatus(data.status)
      setPlayers(data.players || [])
      setStartTime(data.startTime)
    })

    // Register event listeners
    window.api.onStatusChanged(data => {
      setStatus(data.status)
      setPlayers(data.players || [])
      setStartTime(data.startTime)
    })

    window.api.onPlayerJoined(data => {
      console.log('Player joined:', data)
    })

    window.api.onPlayerLeft(data => {
      console.log('Player left:', data)
    })

    window.api.onLog(line => {
      setLogs(prev => [...prev.slice(-499), line]) // Keep last 500 logs
    })
  }, [])

  // Uptime counter
  useEffect(() => {
    if (status === 'ONLINE' && startTime) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - new Date(startTime).getTime()
        setUptime(elapsed)
      }, 1000)
      return () => clearInterval(interval)
    } else {
      setUptime(0)
    }
  }, [status, startTime])

  const formatUptime = (ms) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  }

  const getStatusColor = () => {
    switch (status) {
      case 'ONLINE': return '#4caf50'
      case 'STARTING': return '#ff9800'
      case 'STOPPING': return '#ff9800'
      case 'OFFLINE': return '#f44336'
      default: return '#888'
    }
  }

  return (
    <div className="container">
      <h1>Minecraft Server Control Panel</h1>

      <div className="card">
        <h2>
          Status: <span style={{ color: getStatusColor() }}>{status}</span>
        </h2>
        <p>Players Online: {players.length}</p>
        <div className="player-list">
          {players.map((player, i) => (
            <span key={i} className="player-tag">{player}</span>
          ))}
        </div>
        <p>Uptime: {formatUptime(uptime)}</p>
      </div>

      <div className="controls">
        <button
          onClick={() => window.api.startServer()}
          disabled={status !== 'OFFLINE'}
        >
          Start Server
        </button>
        <button
          onClick={() => window.api.stopServer()}
          disabled={status !== 'ONLINE' && status !== 'STARTING'}
        >
          Stop Server
        </button>
        <button
          onClick={() => window.api.restartServer()}
          disabled={status === 'OFFLINE'}
        >
          Restart
        </button>
      </div>

      <Console
        logs={logs}
        onSendCommand={(cmd) => window.api.sendCommand(cmd)}
      />
    </div>
  )
}

export default App
