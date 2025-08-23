import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import CatanWinSim from './components/CatanWinSim.jsx'

function App() {
  const [count, setCount] = useState(0)

  return (
    <CatanWinSim />
  )
}

export default App
