// Trading System for Catan
// ========================

import { PORT_TYPES } from './game-types.js';

export class TradingManager {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.activeTrades = new Map(); // Track active trade offers
  }

  // Bank Trading (4:1 ratio)
  tradeWithBank(playerId, giveResources, receiveResource) {
    const gameState = this.gameEngine.getGameState();
    const player = gameState.players[playerId];

    // Must be current player
    if (gameState.currentPlayer !== playerId) {
      throw new Error('Not your turn');
    }

    // Must be in actions phase
    if (gameState.turnPhase !== 'actions') {
      throw new Error('Not in actions phase');
    }

    // Validate give resources (must be exactly 4 of same type)
    if (!giveResources || typeof giveResources !== 'object') {
      throw new Error('Invalid give resources');
    }

    const giveEntries = Object.entries(giveResources);
    if (giveEntries.length !== 1) {
      throw new Error('Can only trade one resource type at a time');
    }

    const [giveResourceType, giveAmount] = giveEntries[0];
    if (giveAmount !== 4) {
      throw new Error('Must trade exactly 4 resources to bank');
    }

    // Validate receive resource
    const validResources = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
    if (!validResources.includes(receiveResource)) {
      throw new Error('Invalid receive resource');
    }

    // Check player has enough resources
    if ((player.resources[giveResourceType] || 0) < giveAmount) {
      throw new Error(`Not enough ${giveResourceType} to trade`);
    }

    // Execute trade
    player.resources[giveResourceType] -= giveAmount;
    player.resources[receiveResource] = (player.resources[receiveResource] || 0) + 1;

    this.gameEngine.emit('bankTradeCompleted', {
      playerId,
      gave: { [giveResourceType]: giveAmount },
      received: { [receiveResource]: 1 },
      ratio: '4:1'
    });

    return true;
  }

  // Port Trading
  tradeWithPort(playerId, portType, giveResources, receiveResource) {
    const gameState = this.gameEngine.getGameState();
    const player = gameState.players[playerId];

    // Must be current player
    if (gameState.currentPlayer !== playerId) {
      throw new Error('Not your turn');
    }

    // Must be in actions phase
    if (gameState.turnPhase !== 'actions') {
      throw new Error('Not in actions phase');
    }

    // Check if player has access to this port
    if (!this.playerHasAccessToPort(playerId, portType)) {
      throw new Error('Player does not have access to this port');
    }

    // Validate trade based on port type
    const tradeRatio = this.getPortTradeRatio(portType, giveResources);
    if (!tradeRatio.valid) {
      throw new Error(tradeRatio.error);
    }

    // Validate receive resource
    const validResources = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
    if (!validResources.includes(receiveResource)) {
      throw new Error('Invalid receive resource');
    }

    // Check player has enough resources
    const giveEntries = Object.entries(giveResources);
    for (const [resourceType, amount] of giveEntries) {
      if ((player.resources[resourceType] || 0) < amount) {
        throw new Error(`Not enough ${resourceType} to trade`);
      }
    }

    // Execute trade
    giveEntries.forEach(([resourceType, amount]) => {
      player.resources[resourceType] -= amount;
    });
    player.resources[receiveResource] = (player.resources[receiveResource] || 0) + 1;

    this.gameEngine.emit('portTradeCompleted', {
      playerId,
      portType,
      gave: giveResources,
      received: { [receiveResource]: 1 },
      ratio: tradeRatio.ratio
    });

    return true;
  }

  // Player-to-Player Trading
  proposePlayerTrade(fromPlayerId, toPlayerId, offerResources, requestResources) {
    const gameState = this.gameEngine.getGameState();
    const fromPlayer = gameState.players[fromPlayerId];
    const toPlayer = gameState.players[toPlayerId];

    // Must be current player proposing
    if (gameState.currentPlayer !== fromPlayerId) {
      throw new Error('Only current player can propose trades');
    }

    // Must be in actions phase
    if (gameState.turnPhase !== 'actions') {
      throw new Error('Not in actions phase');
    }

    // Validate players exist
    if (!fromPlayer || !toPlayer) {
      throw new Error('Invalid player IDs');
    }

    if (fromPlayerId === toPlayerId) {
      throw new Error('Cannot trade with yourself');
    }

    // Validate offer and request
    if (!this.validateTradeResources(offerResources) || !this.validateTradeResources(requestResources)) {
      throw new Error('Invalid trade resources');
    }

    // Check if offering player has enough resources
    const offerEntries = Object.entries(offerResources);
    for (const [resourceType, amount] of offerEntries) {
      if ((fromPlayer.resources[resourceType] || 0) < amount) {
        throw new Error(`Not enough ${resourceType} to offer`);
      }
    }

    // Create trade offer
    const tradeId = this.generateTradeId();
    const trade = {
      id: tradeId,
      fromPlayerId,
      toPlayerId,
      offerResources,
      requestResources,
      status: 'pending',
      timestamp: Date.now()
    };

    this.activeTrades.set(tradeId, trade);

    this.gameEngine.emit('playerTradeProposed', trade);

    return tradeId;
  }

  // Accept a player trade
  acceptPlayerTrade(tradeId, acceptingPlayerId) {
    const trade = this.activeTrades.get(tradeId);
    
    if (!trade) {
      throw new Error('Trade not found');
    }

    if (trade.toPlayerId !== acceptingPlayerId) {
      throw new Error('Only the target player can accept this trade');
    }

    if (trade.status !== 'pending') {
      throw new Error('Trade is no longer available');
    }

    const gameState = this.gameEngine.getGameState();
    const fromPlayer = gameState.players[trade.fromPlayerId];
    const toPlayer = gameState.players[trade.toPlayerId];

    // Revalidate both players still have required resources
    const offerEntries = Object.entries(trade.offerResources);
    for (const [resourceType, amount] of offerEntries) {
      if ((fromPlayer.resources[resourceType] || 0) < amount) {
        throw new Error(`Offering player no longer has enough ${resourceType}`);
      }
    }

    const requestEntries = Object.entries(trade.requestResources);
    for (const [resourceType, amount] of requestEntries) {
      if ((toPlayer.resources[resourceType] || 0) < amount) {
        throw new Error(`You don't have enough ${resourceType} to complete this trade`);
      }
    }

    // Execute trade
    // From player gives offer, receives request
    offerEntries.forEach(([resourceType, amount]) => {
      fromPlayer.resources[resourceType] -= amount;
      toPlayer.resources[resourceType] = (toPlayer.resources[resourceType] || 0) + amount;
    });

    requestEntries.forEach(([resourceType, amount]) => {
      toPlayer.resources[resourceType] -= amount;
      fromPlayer.resources[resourceType] = (fromPlayer.resources[resourceType] || 0) + amount;
    });

    // Update trade status
    trade.status = 'accepted';
    trade.completedAt = Date.now();

    this.gameEngine.emit('playerTradeAccepted', trade);

    // Clean up trade after a delay
    setTimeout(() => {
      this.activeTrades.delete(tradeId);
    }, 5000);

    return true;
  }

  // Reject a player trade
  rejectPlayerTrade(tradeId, rejectingPlayerId) {
    const trade = this.activeTrades.get(tradeId);
    
    if (!trade) {
      throw new Error('Trade not found');
    }

    if (trade.toPlayerId !== rejectingPlayerId) {
      throw new Error('Only the target player can reject this trade');
    }

    if (trade.status !== 'pending') {
      throw new Error('Trade is no longer available');
    }

    trade.status = 'rejected';
    trade.rejectedAt = Date.now();

    this.gameEngine.emit('playerTradeRejected', trade);

    // Clean up trade after a delay
    setTimeout(() => {
      this.activeTrades.delete(tradeId);
    }, 5000);

    return true;
  }

  // Cancel a trade offer
  cancelPlayerTrade(tradeId, cancelingPlayerId) {
    const trade = this.activeTrades.get(tradeId);
    
    if (!trade) {
      throw new Error('Trade not found');
    }

    if (trade.fromPlayerId !== cancelingPlayerId) {
      throw new Error('Only the offering player can cancel this trade');
    }

    if (trade.status !== 'pending') {
      throw new Error('Trade is no longer available');
    }

    trade.status = 'cancelled';
    trade.cancelledAt = Date.now();

    this.gameEngine.emit('playerTradeCancelled', trade);

    this.activeTrades.delete(tradeId);

    return true;
  }

  // Helper Methods
  playerHasAccessToPort(playerId, portType) {
    const gameState = this.gameEngine.getGameState();
    const player = gameState.players[playerId];

    // Check if player has a settlement or city adjacent to this port type
    const hasPortAccess = gameState.board.ports.some(port => {
      if (port.type !== portType) return false;

      return port.nodeIds.some(nodeId => {
        const node = gameState.board.nodes[nodeId];
        return node.owner === playerId && node.building !== null;
      });
    });

    return hasPortAccess;
  }

  getPortTradeRatio(portType, giveResources) {
    const giveEntries = Object.entries(giveResources);
    
    if (giveEntries.length !== 1) {
      return { valid: false, error: 'Can only trade one resource type at a time' };
    }

    const [giveResourceType, giveAmount] = giveEntries[0];

    if (portType === PORT_TYPES.GENERIC) {
      // Generic port: 3:1 for any resource
      if (giveAmount !== 3) {
        return { valid: false, error: 'Generic port requires exactly 3 resources' };
      }
      return { valid: true, ratio: '3:1' };
    } else {
      // Specific port: 2:1 for matching resource
      if (giveResourceType !== portType) {
        return { valid: false, error: `This port only accepts ${portType}` };
      }
      if (giveAmount !== 2) {
        return { valid: false, error: 'Specific port requires exactly 2 resources' };
      }
      return { valid: true, ratio: '2:1' };
    }
  }

  validateTradeResources(resources) {
    if (!resources || typeof resources !== 'object') {
      return false;
    }

    const validResources = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
    const entries = Object.entries(resources);

    // Must have at least one resource
    if (entries.length === 0) {
      return false;
    }

    // All resources must be valid and amounts positive
    return entries.every(([resourceType, amount]) => {
      return validResources.includes(resourceType) && 
             Number.isInteger(amount) && 
             amount > 0;
    });
  }

  generateTradeId() {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get available trading options for a player
  getAvailableTradeOptions(playerId) {
    const gameState = this.gameEngine.getGameState();
    const player = gameState.players[playerId];

    const options = {
      bank: [],
      ports: [],
      players: []
    };

    // Bank trading options (4:1)
    Object.entries(player.resources).forEach(([resourceType, amount]) => {
      if (amount >= 4) {
        options.bank.push({
          give: { [resourceType]: 4 },
          ratio: '4:1',
          available: Math.floor(amount / 4)
        });
      }
    });

    // Port trading options
    gameState.board.ports.forEach(port => {
      if (this.playerHasAccessToPort(playerId, port.type)) {
        if (port.type === PORT_TYPES.GENERIC) {
          // Generic port: 3:1 for any resource
          Object.entries(player.resources).forEach(([resourceType, amount]) => {
            if (amount >= 3) {
              options.ports.push({
                portType: port.type,
                give: { [resourceType]: 3 },
                ratio: '3:1',
                available: Math.floor(amount / 3)
              });
            }
          });
        } else {
          // Specific port: 2:1 for matching resource
          const amount = player.resources[port.type] || 0;
          if (amount >= 2) {
            options.ports.push({
              portType: port.type,
              give: { [port.type]: 2 },
              ratio: '2:1',
              available: Math.floor(amount / 2)
            });
          }
        }
      }
    });

    // Available players to trade with
    gameState.players.forEach(otherPlayer => {
      if (otherPlayer.id !== playerId) {
        const totalResources = Object.values(otherPlayer.resources).reduce((sum, count) => sum + count, 0);
        options.players.push({
          playerId: otherPlayer.id,
          name: otherPlayer.name,
          color: otherPlayer.color,
          totalResources,
          hasResources: totalResources > 0
        });
      }
    });

    return options;
  }

  // Get active trades for a player
  getActiveTradesForPlayer(playerId) {
    const playerTrades = [];

    this.activeTrades.forEach(trade => {
      if ((trade.fromPlayerId === playerId || trade.toPlayerId === playerId) && 
          trade.status === 'pending') {
        playerTrades.push(trade);
      }
    });

    return playerTrades;
  }

  // Get all active trades (for UI display)
  getAllActiveTrades() {
    const activeTrades = [];

    this.activeTrades.forEach(trade => {
      if (trade.status === 'pending') {
        activeTrades.push(trade);
      }
    });

    return activeTrades;
  }

  // Clean up expired trades
  cleanupExpiredTrades(maxAgeMs = 300000) { // 5 minutes default
    const now = Date.now();
    
    this.activeTrades.forEach((trade, tradeId) => {
      if (now - trade.timestamp > maxAgeMs) {
        trade.status = 'expired';
        this.gameEngine.emit('playerTradeExpired', trade);
        this.activeTrades.delete(tradeId);
      }
    });
  }

  // Calculate trade efficiency (for AI or suggestions)
  calculateTradeEfficiency(giveResources, receiveResources) {
    const giveValue = this.calculateResourceValue(giveResources);
    const receiveValue = this.calculateResourceValue(receiveResources);
    
    return receiveValue - giveValue;
  }

  calculateResourceValue(resources) {
    // Simple resource valuation (can be made more sophisticated)
    const baseValues = {
      wood: 1,
      brick: 1,
      sheep: 1,
      wheat: 1.1, // Slightly more valuable
      ore: 1.2    // Most valuable
    };

    return Object.entries(resources).reduce((total, [resourceType, amount]) => {
      return total + (baseValues[resourceType] || 1) * amount;
    }, 0);
  }
}

// Export for use with game engine
export function createTradingManager(gameEngine) {
  return new TradingManager(gameEngine);
}