import React from 'react'

function TradingAnalysis({ results }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Port Distribution */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2 text-sm">Port Distribution</h4>
          <div className="space-y-1">
            {results.tradingAnalysis?.portDistribution?.map((ports, index) => (
              <div key={index} className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                <span className="flex items-center">
                  <div 
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'][index] }}
                  />
                  Player {index + 1}
                </span>
                <span className="font-medium">{ports} ports</span>
              </div>
            )) || (
              <div className="text-xs text-gray-500">No port data available</div>
            )}
          </div>
        </div>

        {/* Trading Efficiency */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2 text-sm">Trading Efficiency</h4>
          <div className="space-y-1">
            {results.tradingAnalysis?.tradingAdvantages?.map((efficiency, index) => (
              <div key={index} className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                <span className="flex items-center">
                  <div 
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'][index] }}
                  />
                  Player {index + 1}
                </span>
                <span className="font-medium">{(efficiency * 100).toFixed(0)}%</span>
              </div>
            )) || (
              <div className="text-xs text-gray-500">No efficiency data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Trading Rules Reference */}
      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs text-blue-700">
        <div className="font-medium mb-2">🏪 Catan Trading Rules Applied:</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <div className="font-medium">Bank Trading</div>
            <div>4:1 ratio for any resource</div>
          </div>
          <div>
            <div className="font-medium">Generic Ports</div>
            <div>3:1 ratio for any resource</div>
          </div>
          <div>
            <div className="font-medium">Specialized Ports</div>
            <div>2:1 ratio for specific resource</div>
          </div>
        </div>
      </div>

      {/* Trading Advantages Breakdown */}
      <div>
        <h4 className="font-medium text-gray-700 mb-2 text-sm">Port Type Breakdown</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div className="bg-gray-50 p-2 rounded text-center">
            <div className="text-lg">🏪</div>
            <div className="font-medium">Generic</div>
            <div className="text-gray-600">3:1</div>
          </div>
          <div className="bg-gray-50 p-2 rounded text-center">
            <div className="text-lg">🌲</div>
            <div className="font-medium">Wood</div>
            <div className="text-gray-600">2:1</div>
          </div>
          <div className="bg-gray-50 p-2 rounded text-center">
            <div className="text-lg">🧱</div>
            <div className="font-medium">Brick</div>
            <div className="text-gray-600">2:1</div>
          </div>
          <div className="bg-gray-50 p-2 rounded text-center">
            <div className="text-lg">🐑</div>
            <div className="font-medium">Sheep</div>
            <div className="text-gray-600">2:1</div>
          </div>
          <div className="bg-gray-50 p-2 rounded text-center">
            <div className="text-lg">🌾</div>
            <div className="font-medium">Wheat</div>
            <div className="text-gray-600">2:1</div>
          </div>
        </div>
      </div>

      {/* AI Trading Integration */}
      <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-xs text-green-700">
        <div className="font-medium mb-1">🤖 AI Trading Integration:</div>
        <div>✅ Port access calculated for all players</div>
        <div>✅ Trading efficiency factored into win predictions</div>
        <div>✅ Resource optimization strategies applied</div>
        <div>✅ Strategic port placement analysis completed</div>
      </div>
    </div>
  )
}

export default TradingAnalysis