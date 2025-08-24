import { TradingSystem } from './TradingSystem'

export class PredictionSystem {
  constructor() {
    this.tradingSystem = new TradingSystem()
    this.isRunning = false
  }

  async predictWinner(boardSetup, simulationCount = 1000, options = {}) {
    this.isRunning = true
    console.log(`🎯 Starting prediction with ${simulationCount} simulations...`)
    
    // Initialize trading system
    boardSetup = this.tradingSystem.initializePorts(boardSetup)
    const portAccess = this.tradingSystem.calculatePortAccess(boardSetup)
    
    const results = {
      wins: Array(4).fill(0),
      totalGames: simulationCount,
      averageGameLength: 0,
      playerStats: Array(4).fill(null).map((_, i) => ({
        playerId: i,
        wins: 0,
        winPercentage: 0,
        averageVP: 0,
        averageResources: 0,
        portAdvantage: this.tradingSystem.getPortAdvantage(i),
        tradingEfficiency: 0
      })),
      convergenceData: [],
      tradingAnalysis: {
        portDistribution: Array(4).fill(0),
        tradingAdvantages: []
      }
    }

    let totalGameLength = 0
    const batchSize = 50

    for (let batch = 0; batch < Math.ceil(simulationCount / batchSize); batch++) {
      if (!this.isRunning) break
      
      const batchStart = batch * batchSize
      const batchEnd = Math.min((batch + 1) * batchSize, simulationCount)
      
      for (let i = batchStart; i < batchEnd; i++) {
        if (!this.isRunning) break
        
        const gameResult = this.simulateGame(boardSetup)
        
        if (gameResult) {
          results.wins[gameResult.winnerId]++
          totalGameLength += gameResult.gameLength
          
          // Update player stats with trading analysis
          gameResult.playerStats.forEach((playerStat, playerId) => {
            const stats = results.playerStats[playerId]
            stats.averageVP += playerStat.victoryPoints
            stats.averageResources += playerStat.totalResources
            stats.tradingEfficiency += playerStat.tradingEfficiency || 0
          })
        }
        
        // Progress callback
        if (options.onProgress && (i + 1) % 25 === 0) {
          options.onProgress(i + 1, simulationCount)
        }
        
        // Convergence tracking
        if ((i + 1) % 100 === 0) {
          results.convergenceData.push({
            gameNumber: i + 1,
            winRates: results.wins.map(w => w / (i + 1))
          })
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 5))
    }

    // Calculate final statistics
    if (results.wins.reduce((a, b) => a + b, 0) > 0) {
      results.averageGameLength = totalGameLength / Math.max(1, results.wins.reduce((a, b) => a + b, 0))
      
      results.playerStats.forEach((stats, playerId) => {
        stats.wins = results.wins[playerId]
        stats.winPercentage = (results.wins[playerId] / simulationCount) * 100
        stats.averageVP /= simulationCount
        stats.averageResources /= simulationCount
        stats.tradingEfficiency /= simulationCount
      })

      // Calculate trading analysis
      results.tradingAnalysis.portDistribution = results.playerStats.map(p => p.portAdvantage.totalPorts)
      results.tradingAnalysis.tradingAdvantages = results.playerStats.map(p => p.tradingEfficiency)
    }

    this.isRunning = false
    console.log(`✅ Prediction completed: ${simulationCount} simulations`)
    return results
  }

  simulateGame(boardSetup) {
    const playerProduction = this.calculatePlayerProduction(boardSetup)
    const gameLength = Math.floor(Math.random() * 50) + 30
    
    const finalVP = playerProduction.map((prod, playerId) => {
      const baseVP = 2
      const productionBonus = Math.min(6, prod.total * 8)
      const portBonus = this.tradingSystem.getPortAdvantage(playerId).tradingBonus * 2
      const randomFactor = Math.random() * 2
      const diversityBonus = Object.values(prod.resources).filter(v => v > 0).length * 0.3
      
      return Math.min(12, Math.max(2, baseVP + productionBonus + portBonus + randomFactor + diversityBonus))
    })
    
    const winnerId = finalVP.indexOf(Math.max(...finalVP))
    
    return {
      winnerId,
      gameLength,
      playerStats: finalVP.map((vp, i) => ({
        victoryPoints: vp,
        totalResources: playerProduction[i].total * gameLength / 10,
        tradingEfficiency: this.tradingSystem.getPortAdvantage(i).tradingBonus
      }))
    }
  }

  calculatePlayerProduction(boardSetup) {
    const diceProbs = {
      2: 1/36, 3: 2/36, 4: 3/36, 5: 4/36, 6: 5/36,
      8: 5/36, 9: 4/36, 10: 3/36, 11: 2/36, 12: 1/36
    }
    
    return Array(4).fill(null).map((_, playerId) => {
      let totalProduction = 0
      const resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }
      
      const availableTiles = boardSetup.tiles.filter(tile => 
        tile.resource !== 'desert' && tile.token
      )
      
      const chosenTiles = availableTiles
        .sort((a, b) => {
          const aValue = (diceProbs[a.token] || 0) * this.getResourceValue(a.resource)
          const bValue = (diceProbs[b.token] || 0) * this.getResourceValue(b.resource)
          return bValue - aValue
        })
        .slice(0, Math.min(6, availableTiles.length))
      
      chosenTiles.forEach(tile => {
        const production = (diceProbs[tile.token] || 0) * this.getResourceValue(tile.resource)
        totalProduction += production
        resources[tile.resource] += production
      })
      
      return { total: totalProduction, resources }
    })
  }

  getResourceValue(resource) {
    const values = { wood: 1, brick: 1, sheep: 0.9, wheat: 1.1, ore: 1.2 }
    return values[resource] || 1
  }

  stop() {
    this.isRunning = false
  }
}