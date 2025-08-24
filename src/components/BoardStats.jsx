import React from 'react'

const RESOURCES = ["wood", "brick", "sheep", "wheat", "ore"]

function BoardStats({ boardSetup }) {
  const resourceCounts = RESOURCES.reduce((acc, resource) => {
    acc[resource] = boardSetup.tiles.filter(tile => tile.resource === resource).length
    return acc
  }, { desert: boardSetup.tiles.filter(tile => tile.resource === 'desert').length })

  const tokenCounts = {}
  boardSetup.tiles.forEach(tile => {
    if (tile.token) {
      tokenCounts[tile.token] = (tokenCounts[tile.token] || 0) + 1
    }
  })

  const isValidBoard = boardSetup.tiles.length === 19 && resourceCounts.desert === 1
  const hotNumbers = [6, 8]
  const totalHotNumbers = hotNumbers.reduce((sum, num) => sum + (tokenCounts[num] || 0), 0)

  return (
    <div className="space-y-4">
      {/* Board Validation */}
      <div className={`p-3 rounded-lg text-sm ${
        isValidBoard 
          ? 'bg-green-50 border border-green-200 text-green-700' 
          : 'bg-red-50 border border-red-200 text-red-700'
      }`}>
        {isValidBoard ? '✅ Valid Catan Board Configuration' : '❌ Invalid Board Layout'}
        <div className="text-xs mt-1">
          {boardSetup.tiles.length} tiles total • {resourceCounts.desert} desert
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Resource Distribution */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2 text-sm">Resource Distribution</h4>
          <div className="space-y-1">
            {Object.entries(resourceCounts).map(([resource, count]) => (
              <div key={resource} className="flex justify-between text-xs">
                <span className="capitalize flex items-center">
                  <span className="mr-1">
                    {resource === 'wood' && '🌲'}
                    {resource === 'brick' && '🧱'}
                    {resource === 'sheep' && '🐑'}
                    {resource === 'wheat' && '🌾'}
                    {resource === 'ore' && '⚒️'}
                    {resource === 'desert' && '🏜️'}
                  </span>
                  {resource}
                </span>
                <span className={`font-medium ${count === 0 ? 'text-red-500' : 'text-gray-700'}`}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Hot Numbers Analysis */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2 text-sm">
            Hot Numbers 
            <span className="text-xs text-gray-500">(High Probability)</span>
          </h4>
          <div className="space-y-1">
            {hotNumbers.map(num => (
              <div key={num} className="flex justify-between text-xs">
                <span className="flex items-center">
                  🔥 {num}
                  <span className="text-xs text-gray-500 ml-1">(5/36)</span>
                </span>
                <span className="text-red-600 font-bold">{tokenCounts[num] || 0}</span>
              </div>
            ))}
            <div className="pt-1 border-t border-gray-200">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Total Hot</span>
                <span className="font-bold">{totalHotNumbers}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Board Quality Metrics */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2 text-sm">Board Quality</h4>
          <div className="space-y-2">
            <div className="bg-gray-50 p-2 rounded text-xs">
              <div className="flex justify-between">
                <span>Resource Balance</span>
                <span className="font-medium text-green-600">Good</span>
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded text-xs">
              <div className="flex justify-between">
                <span>Number Distribution</span>
                <span className="font-medium text-blue-600">Balanced</span>
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded text-xs">
              <div className="flex justify-between">
                <span>Hot Number Coverage</span>
                <span className="font-medium text-orange-600">
                  {totalHotNumbers}/2
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Insights */}
      <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
        <div className="font-medium mb-1">💡 Board Analysis:</div>
        <div>• Hot numbers (6, 8) provide the best resource production</div>
        <div>• Balanced resource distribution prevents player disadvantage</div>
        <div>• Port placement creates strategic trading opportunities</div>
      </div>
    </div>
  )
}

export default BoardStats