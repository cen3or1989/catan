import React from 'react'

const PLAYER_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b"]

function ResultsSection({ results, showAdvanced }) {
  if (!results || !results.playerStats) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
        ❌ Invalid prediction results
      </div>
    )
  }

  const winner = results.wins.indexOf(Math.max(...results.wins))

  return (
    <div className="slide-in bg-white rounded-lg shadow-sm p-4">
      <h2 className="text-lg font-bold text-gray-900 mb-4">🎯 Prediction Results</h2>
      
      {/* Player Results Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {results.playerStats.map((stats, index) => (
          <div 
            key={index} 
            className={`prediction-card rounded-lg p-3 border-2 ${
              index === winner ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center mb-2">
              <div 
                className="w-3 h-3 rounded-full mr-2 border border-gray-300" 
                style={{ backgroundColor: PLAYER_COLORS[index] }}
              />
              <span className="font-medium text-sm">
                Player {index + 1}
                {index === winner && <span className="ml-1">👑</span>}
              </span>
            </div>
            
            <div className="text-xl font-bold text-green-600 mb-1">
              {stats.winPercentage.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">
              {stats.wins} / {results.totalGames} wins
            </div>
            
            {showAdvanced && (
              <div className="mt-2 text-xs text-gray-500 space-y-1">
                <div>Avg VP: {stats.averageVP.toFixed(1)}</div>
                <div>Ports: {stats.portAdvantage?.totalPorts || 0}</div>
                <div>Trade Eff: {(stats.tradingEfficiency * 100).toFixed(0)}%</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Most Likely Winner:</span>
            <div className="font-medium flex items-center">
              <div 
                className="w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: PLAYER_COLORS[winner] }}
              />
              Player {winner + 1}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Win Margin:</span>
            <div className="font-medium">
              {(results.playerStats[winner].winPercentage - 
                Math.max(...results.playerStats.map((p, i) => i !== winner ? p.winPercentage : 0))
              ).toFixed(1)}%
            </div>
          </div>
          <div>
            <span className="text-gray-600">Avg Game Length:</span>
            <div className="font-medium">{results.averageGameLength.toFixed(0)} turns</div>
          </div>
        </div>
      </div>

      {/* Success indicator */}
      <div className="mt-4 flex items-center justify-center text-xs text-green-600 bg-green-50 py-2 rounded">
        ✅ Prediction completed with full trading system analysis
      </div>
    </div>
  )
}

export default ResultsSection