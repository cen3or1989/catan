import React from 'react'
import HexTile from './HexTile'

function BoardVisualization({ boardSetup, onTileClick, selectedTile, showPorts }) {
  return (
    <div className="relative overflow-hidden">
      <svg 
        width="100%" 
        height="320" 
        viewBox="0 0 600 400" 
        className="border rounded-lg bg-gradient-to-br from-blue-50 to-green-50"
      >
        {/* Render tiles */}
        {boardSetup.tiles.map((tile, index) => (
          <HexTile 
            key={index}
            tile={tile}
            index={index}
            onClick={() => onTileClick(index)}
            isSelected={selectedTile === index}
          />
        ))}
        
        {/* Render ports if enabled */}
        {showPorts && boardSetup.ports && boardSetup.ports.map((port, index) => (
          <g key={`port_${index}`}>
            <circle 
              cx={50 + (index % 6) * 90} 
              cy={50 + Math.floor(index / 6) * 60} 
              r="15" 
              fill="white" 
              stroke="#4f46e5" 
              strokeWidth="2"
              className="drop-shadow-sm"
            />
            <text 
              x={50 + (index % 6) * 90} 
              y={55 + Math.floor(index / 6) * 60} 
              textAnchor="middle" 
              fontSize="12"
            >
              {port.icon}
            </text>
            <text 
              x={50 + (index % 6) * 90} 
              y={70 + Math.floor(index / 6) * 60} 
              textAnchor="middle" 
              fontSize="8" 
              fill="#4f46e5"
              className="port-indicator"
            >
              {port.ratio}:1
            </text>
          </g>
        ))}
      </svg>
      
      {showPorts && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          🏪 Generic ports (3:1) • 🌲🧱🐑🌾⚒️ Specialized ports (2:1)
        </div>
      )}
    </div>
  )
}

export default BoardVisualization