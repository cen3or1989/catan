import React from 'react'

const TILE_COLORS = {
  wood: "#22c55e",
  brick: "#dc2626", 
  sheep: "#84cc16",
  wheat: "#eab308",
  ore: "#6b7280",
  desert: "#f59e0b"
}

function HexTile({ tile, index, onClick, isSelected }) {
  const size = 25
  const x = tile.x * 0.7 // Scale down for responsive design
  const y = tile.y * 0.7
  
  // Generate hexagon path
  const points = []
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 180 * (60 * i - 30)
    points.push([
      x + size * Math.cos(angle),
      y + size * Math.sin(angle)
    ])
  }
  const path = `M ${points.map(p => p.join(',')).join(' L ')} Z`
  
  const isHotNumber = tile.token === 6 || tile.token === 8

  return (
    <g className="hex-tile" onClick={onClick}>
      <path 
        d={path} 
        fill={TILE_COLORS[tile.resource] || "#ddd"} 
        stroke={isSelected ? "#3b82f6" : "#374151"} 
        strokeWidth={isSelected ? "3" : "1"}
        opacity="0.9"
      />
      
      {tile.token && (
        <g>
          <circle 
            cx={x} 
            cy={y} 
            r="12" 
            fill="white" 
            stroke={isHotNumber ? "#dc2626" : "#374151"} 
            strokeWidth={isHotNumber ? "2" : "1"}
            className="drop-shadow-sm"
          />
          <text 
            x={x} 
            y={y + 3} 
            textAnchor="middle" 
            fontSize="10" 
            fontWeight="700" 
            fill="#374151"
          >
            {tile.token}
          </text>
        </g>
      )}
      
      {/* Tile index for debugging */}
      <text 
        x={x} 
        y={y + 35} 
        textAnchor="middle" 
        fontSize="8" 
        fill="#6b7280"
        opacity="0.7"
      >
        {index}
      </text>
    </g>
  )
}

export default HexTile