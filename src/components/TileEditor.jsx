import React from 'react'

const RESOURCE_ICONS = {
  wood: "🌲", 
  brick: "🧱", 
  sheep: "🐑", 
  wheat: "🌾", 
  ore: "⚒️", 
  desert: "🏜️"
}

function TileEditor({ tile, tileIndex, onUpdate, onClose, disabled }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Edit Tile {tileIndex}</h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          disabled={disabled}
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Resource
          </label>
          <select 
            value={tile.resource}
            onChange={(e) => onUpdate({ 
              resource: e.target.value,
              token: e.target.value === 'desert' ? null : tile.token
            })}
            disabled={disabled}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            {Object.entries(RESOURCE_ICONS).map(([resource, icon]) => (
              <option key={resource} value={resource}>
                {icon} {resource.charAt(0).toUpperCase() + resource.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {tile.resource !== 'desert' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number Token
            </label>
            <select 
              value={tile.token || ''}
              onChange={(e) => onUpdate({ 
                token: e.target.value ? Number(e.target.value) : null 
              })}
              disabled={disabled}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">No Token</option>
              {[2,3,4,5,6,8,9,10,11,12].map(num => (
                <option key={num} value={num}>
                  {num} {num === 6 || num === 8 ? '🔥 Hot!' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          💡 Tip: Hot numbers (6, 8) are rolled more frequently and provide better resource production.
        </div>
      </div>
    </div>
  )
}

export default TileEditor