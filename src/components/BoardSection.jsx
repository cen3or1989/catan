import React from 'react'
import BoardVisualization from './BoardVisualization'
import TileEditor from './TileEditor'

function BoardSection({ 
  boardSetup, 
  selectedTile, 
  setSelectedTile, 
  showPorts, 
  setBoardSetup, 
  isRunning 
}) {
  const updateTile = (updates) => {
    setBoardSetup(prev => ({
      ...prev,
      tiles: prev.tiles.map((tile, index) => 
        index === selectedTile ? { ...tile, ...updates } : tile
      )
    }))
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Game Board</h2>
          {selectedTile !== null && (
            <span className="text-sm text-blue-600">
              Editing tile {selectedTile}
            </span>
          )}
        </div>
        
        <BoardVisualization 
          boardSetup={boardSetup}
          onTileClick={setSelectedTile}
          selectedTile={selectedTile}
          showPorts={showPorts}
        />
      </div>

      {selectedTile !== null && (
        <div className="slide-in bg-white rounded-lg shadow-sm p-4">
          <TileEditor 
            tile={boardSetup.tiles[selectedTile]}
            tileIndex={selectedTile}
            onUpdate={updateTile}
            onClose={() => setSelectedTile(null)}
            disabled={isRunning}
          />
        </div>
      )}
    </>
  )
}

export default BoardSection