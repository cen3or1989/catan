// Trading System for Catan
export const TRADING_RATIOS = {
  BANK: 4,
  GENERIC_PORT: 3,
  SPECIALIZED_PORT: 2
}

export const PORT_TYPES = {
  GENERIC: 'generic',
  WOOD: 'wood',
  BRICK: 'brick', 
  SHEEP: 'sheep',
  WHEAT: 'wheat',
  ORE: 'ore'
}

// Standard port configuration
const STANDARD_PORTS = [
  { type: PORT_TYPES.GENERIC, tiles: [0, 1], icon: "🏪" },
  { type: PORT_TYPES.WOOD, tiles: [3, 4], icon: "🌲" },
  { type: PORT_TYPES.BRICK, tiles: [7, 8], icon: "🧱" },
  { type: PORT_TYPES.GENERIC, tiles: [12, 13], icon: "🏪" },
  { type: PORT_TYPES.SHEEP, tiles: [16, 17], icon: "🐑" },
  { type: PORT_TYPES.GENERIC, tiles: [18, 19], icon: "🏪" },
  { type: PORT_TYPES.WHEAT, tiles: [15, 11], icon: "🌾" },
  { type: PORT_TYPES.ORE, tiles: [6, 2], icon: "⚒️" },
  { type: PORT_TYPES.GENERIC, tiles: [5, 9], icon: "🏪" }
]

export class TradingSystem {
  constructor() {
    this.portAccess = new Map()
  }

  initializePorts(boardSetup) {
    // Add ports to board
    boardSetup.ports = STANDARD_PORTS.map((port, index) => ({
      id: index,
      type: port.type,
      ratio: port.type === PORT_TYPES.GENERIC ? TRADING_RATIOS.GENERIC_PORT : TRADING_RATIOS.SPECIALIZED_PORT,
      tiles: port.tiles,
      icon: port.icon
    }))
    return boardSetup
  }

  calculatePortAccess(boardSetup, playerPositions) {
    const access = new Map()
    
    // For each player, check which ports they can access
    for (let playerId = 0; playerId < 4; playerId++) {
      const playerPorts = []
      
      // Check if player has settlements near ports
      boardSetup.ports?.forEach(port => {
        // Simplified: assume players have access based on starting positions
        if (Math.random() < 0.3) { // 30% chance of port access
          playerPorts.push(port)
        }
      })
      
      access.set(playerId, playerPorts)
    }
    
    this.portAccess = access
    return access
  }

  getBestTradingRatio(playerId, resource) {
    const playerPorts = this.portAccess.get(playerId) || []
    
    // Check for specialized port
    const specializedPort = playerPorts.find(port => port.type === resource)
    if (specializedPort) return TRADING_RATIOS.SPECIALIZED_PORT
    
    // Check for generic port
    const genericPort = playerPorts.find(port => port.type === PORT_TYPES.GENERIC)
    if (genericPort) return TRADING_RATIOS.GENERIC_PORT
    
    // Default bank trading
    return TRADING_RATIOS.BANK
  }

  getPortAdvantage(playerId) {
    const playerPorts = this.portAccess.get(playerId) || []
    return {
      totalPorts: playerPorts.length,
      genericPorts: playerPorts.filter(p => p.type === PORT_TYPES.GENERIC).length,
      specializedPorts: playerPorts.filter(p => p.type !== PORT_TYPES.GENERIC).length,
      tradingBonus: playerPorts.length > 0 ? 0.2 : 0
    }
  }

  // Calculate trade efficiency for a player
  calculateTradeEfficiency(playerId, giveResource, receiveResource) {
    const ratio = this.getBestTradingRatio(playerId, giveResource)
    const baseRatio = TRADING_RATIOS.BANK
    
    // Efficiency is how much better this trade is compared to bank
    const efficiency = baseRatio / ratio
    
    // Factor in resource scarcity and need
    const resourceValue = this.getResourceValue(receiveResource)
    const resourceCost = this.getResourceValue(giveResource)
    
    return efficiency * (resourceValue / resourceCost)
  }

  getResourceValue(resource) {
    const baseValues = {
      wood: 1.0,
      brick: 1.0,
      sheep: 0.9,
      wheat: 1.1,
      ore: 1.2
    }
    return baseValues[resource] || 1.0
  }

  // Execute bank trade
  executeBankTrade(gameState, playerId, giveResource, receiveResource, amount = 1) {
    const player = gameState.players[playerId]
    const ratio = this.getBestTradingRatio(playerId, giveResource)
    const requiredAmount = ratio * amount

    // Validate trade
    if (player.resources[giveResource] < requiredAmount) {
      return {
        success: false,
        error: `Insufficient ${giveResource} resources. Need ${requiredAmount}, have ${player.resources[giveResource]}`
      }
    }

    // Execute trade
    player.resources[giveResource] -= requiredAmount
    player.resources[receiveResource] += amount

    return {
      success: true,
      trade: {
        type: 'bank',
        playerId,
        give: { [giveResource]: requiredAmount },
        receive: { [receiveResource]: amount },
        ratio,
        timestamp: Date.now()
      },
      newResources: { ...player.resources }
    }
  }
}