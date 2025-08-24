import React, { useState } from 'react'
import Header from './components/Header'
import BoardSection from './components/BoardSection'
import ControlPanel from './components/ControlPanel'
import ResultsSection from './components/ResultsSection'
import AdvancedAnalytics from './components/AdvancedAnalytics'
import { PredictionSystem } from './services/PredictionSystem'
import { createRandomBoard } from './utils/boardUtils'

function App() {
  const [predictionSystem] = useState(() => new PredictionSystem())
  const [boardSetup, setBoardSetup] = useState(createRandomBoard())
  const [simulationCount, setSimulationCount] = useState(1000)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState(null)
  const [selectedTile, setSelectedTile] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showPorts, setShowPorts] = useState(false)

  const runPrediction = async () => {
    setIsRunning(true)
    setProgress(0)
    setResults(null)
    
    try {
      const predictionResults = await predictionSystem.predictWinner(
        boardSetup,
        simulationCount,
        {
          onProgress: (current, total) => {
            setProgress((current / total) * 100)
          }
        }
      )
      
      setResults(predictionResults)
    } catch (error) {
      console.error('Prediction failed:', error)
      alert('Prediction failed: ' + error.message)
    } finally {
      setIsRunning(false)
      setProgress(0)
    }
  }

  const stopPrediction = () => {
    predictionSystem.stop()
    setIsRunning(false)
    setProgress(0)
  }

  const resetBoard = () => {
    setBoardSetup(createRandomBoard())
    setResults(null)
    setSelectedTile(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        showPorts={showPorts}
        setShowPorts={setShowPorts}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
        resetBoard={resetBoard}
        isRunning={isRunning}
      />

      <div className="p-4 space-y-4 max-w-6xl mx-auto">
        <BoardSection 
          boardSetup={boardSetup}
          selectedTile={selectedTile}
          setSelectedTile={setSelectedTile}
          showPorts={showPorts}
          setBoardSetup={setBoardSetup}
          isRunning={isRunning}
        />

        <ControlPanel 
          simulationCount={simulationCount}
          setSimulationCount={setSimulationCount}
          isRunning={isRunning}
          progress={progress}
          runPrediction={runPrediction}
          stopPrediction={stopPrediction}
        />

        {results && (
          <ResultsSection 
            results={results}
            showAdvanced={showAdvanced}
          />
        )}

        {showAdvanced && (
          <AdvancedAnalytics 
            boardSetup={boardSetup}
            results={results}
          />
        )}
      </div>
    </div>
  )
}

export default App