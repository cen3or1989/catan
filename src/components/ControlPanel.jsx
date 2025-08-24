import React from 'react'

function ControlPanel({ 
  simulationCount, 
  setSimulationCount, 
  isRunning, 
  progress, 
  runPrediction, 
  stopPrediction 
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="font-semibold text-gray-900 mb-3">Prediction Settings</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Simulations: {simulationCount.toLocaleString()}
          </label>
          <input
            type="range"
            min="100"
            max="5000"
            step="100"
            value={simulationCount}
            onChange={(e) => setSimulationCount(Number(e.target.value))}
            disabled={isRunning}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>100 (Fast)</span>
            <span>5,000 (Accurate)</span>
          </div>
        </div>
        
        {isRunning ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Running prediction...</span>
              <span className="font-medium text-blue-600">{progress.toFixed(1)}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="progress-animation bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <button
              onClick={stopPrediction}
              className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
            >
              ⏹️ Stop Prediction
            </button>
          </div>
        ) : (
          <button
            onClick={runPrediction}
            className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            ▶️ Run Prediction
          </button>
        )}
        
        <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
          🤖 AI analyzes board layout, resource production, trading advantages, and port access to predict winner
        </div>
      </div>
    </div>
  )
}

export default ControlPanel