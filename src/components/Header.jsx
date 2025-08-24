import React from 'react'

function Header({ 
  showPorts, 
  setShowPorts, 
  showAdvanced, 
  setShowAdvanced, 
  resetBoard, 
  isRunning 
}) {
  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-10">
      <div className="px-4 py-3 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🎯 Catan Predictor</h1>
            <p className="text-sm text-gray-500">AI-powered win prediction</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowPorts(!showPorts)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                showPorts 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🏪 Ports
            </button>
            
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                showAdvanced 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              📊 Advanced
            </button>
            
            <button 
              onClick={resetBoard}
              disabled={isRunning}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-sm rounded-md transition-colors"
            >
              🎲 New Board
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header