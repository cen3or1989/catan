/**
 * Enhanced Trading System for Catan
 * Supports: Bank 4:1, Generic Ports 3:1, Specialized Ports 2:1
 */

// Trading constants
export const TRADING_RATIOS = {
    BANK: 4, // 4:1 for any resource
    GENERIC_PORT: 3, // 3:1 for any resource
    SPECIALIZED_PORT: 2 // 2:1 for specific resource
};

export const PORT_TYPES = {
    GENERIC: 'generic',
    WOOD: 'wood',
    BRICK: 'brick',
    SHEEP: 'sheep',
    WHEAT: 'wheat',
    ORE: 'ore'
};

// Standard Catan port configuration
export const STANDARD_PORTS = [
    { type: PORT_TYPES.GENERIC, position: [0, 1] }, // Top edge
    { type: PORT_TYPES.WOOD, position: [3, 4] }, // Left edge
    { type: PORT_TYPES.BRICK, position: [7, 8] }, // Left edge
    { type: PORT_TYPES.GENERIC, position: [12, 13] }, // Bottom left
    { type: PORT_TYPES.SHEEP, position: [16, 17] }, // Bottom edge
    { type: PORT_TYPES.GENERIC, position: [18, 19] }, // Bottom right
    { type: PORT_TYPES.WHEAT, position: [15, 11] }, // Right edge
    { type: PORT_TYPES.ORE, position: [6, 2] }, // Top right
    { type: PORT_TYPES.GENERIC, position: [5, 9] } // Left middle
];

export class EnhancedTradingSystem {
    constructor() {
        this.activeOffers = new Map();
        this.tradeHistory = [];
        this.portAccess = new Map(); // playerId -> accessible ports
    }

    // Initialize port access for all players based on settlements
    initializePortAccess(gameState) {
        this.portAccess.clear();
        
        gameState.players.forEach((player, playerId) => {
            const accessiblePorts = this.calculatePortAccess(gameState, playerId);
            this.portAccess.set(playerId, accessiblePorts);
        });
    }

    // Calculate which ports a player has access to
    calculatePortAccess(gameState, playerId) {
        const player = gameState.players[playerId];
        const accessiblePorts = [];

        // Check each settlement/city for port access
        [...player.settlements, ...player.cities].forEach(buildingNodeId => {
            const node = gameState.board.nodes[buildingNodeId];
            if (node && node.port) {
                accessiblePorts.push(node.port);
            }
        });

        return accessiblePorts;
    }

    // Get best trading ratio for a resource
    getBestTradingRatio(playerId, resourceType) {
        const playerPorts = this.portAccess.get(playerId) || [];
        
        // Check for specialized port for this resource
        const specializedPort = playerPorts.find(port => port.type === resourceType);
        if (specializedPort) {
            return TRADING_RATIOS.SPECIALIZED_PORT;
        }

        // Check for generic port
        const genericPort = playerPorts.find(port => port.type === PORT_TYPES.GENERIC);
        if (genericPort) {
            return TRADING_RATIOS.GENERIC_PORT;
        }

        // Default to bank trading
        return TRADING_RATIOS.BANK;
    }

    // Execute bank trade
    executeBankTrade(gameState, playerId, giveResource, receiveResource, amount = 1) {
        const player = gameState.players[playerId];
        const ratio = this.getBestTradingRatio(playerId, giveResource);
        const requiredAmount = ratio * amount;

        // Validate trade
        if (!this.validateBankTrade(player, giveResource, requiredAmount)) {
            return {
                success: false,
                error: `Insufficient ${giveResource} resources. Need ${requiredAmount}, have ${player.resources[giveResource]}`
            };
        }

        // Execute trade
        player.resources[giveResource] -= requiredAmount;
        player.resources[receiveResource] += amount;

        // Record trade
        const trade = {
            type: 'bank',
            playerId,
            give: { [giveResource]: requiredAmount },
            receive: { [receiveResource]: amount },
            ratio,
            timestamp: Date.now()
        };

        this.tradeHistory.push(trade);

        return {
            success: true,
            trade,
            newResources: { ...player.resources }
        };
    }

    // Validate bank trade
    validateBankTrade(player, giveResource, requiredAmount) {
        return player.resources[giveResource] >= requiredAmount;
    }

    // Calculate trade efficiency for AI
    calculateTradeEfficiency(playerId, giveResource, receiveResource) {
        const ratio = this.getBestTradingRatio(playerId, giveResource);
        const baseRatio = TRADING_RATIOS.BANK;
        
        // Efficiency is how much better this trade is compared to bank
        const efficiency = baseRatio / ratio;
        
        // Factor in resource scarcity and need
        const resourceValue = this.getResourceValue(receiveResource);
        const resourceCost = this.getResourceValue(giveResource);
        
        return efficiency * (resourceValue / resourceCost);
    }

    // Get resource value for AI calculations
    getResourceValue(resource) {
        const baseValues = {
            wood: 1.0,
            brick: 1.0,
            sheep: 0.9,
            wheat: 1.1,
            ore: 1.2
        };
        return baseValues[resource] || 1.0;
    }

    // Get all possible trades for a player
    getAvailableTrades(gameState, playerId) {
        const player = gameState.players[playerId];
        const trades = [];

        Object.keys(player.resources).forEach(giveResource => {
            if (player.resources[giveResource] > 0) {
                const ratio = this.getBestTradingRatio(playerId, giveResource);
                
                if (player.resources[giveResource] >= ratio) {
                    Object.keys(player.resources).forEach(receiveResource => {
                        if (giveResource !== receiveResource) {
                            trades.push({
                                give: giveResource,
                                receive: receiveResource,
                                ratio,
                                efficiency: this.calculateTradeEfficiency(playerId, giveResource, receiveResource),
                                cost: ratio,
                                benefit: 1
                            });
                        }
                    });
                }
            }
        });

        // Sort by efficiency
        return trades.sort((a, b) => b.efficiency - a.efficiency);
    }

    // AI trading decision
    shouldAITrade(gameState, playerId, targetResource = null) {
        const player = gameState.players[playerId];
        const availableTrades = this.getAvailableTrades(gameState, playerId);
        
        if (availableTrades.length === 0) return null;

        // If targeting specific resource
        if (targetResource) {
            const targetTrades = availableTrades.filter(trade => trade.receive === targetResource);
            if (targetTrades.length > 0) {
                return targetTrades[0]; // Best efficiency for target resource
            }
        }

        // General trading strategy
        const bestTrade = availableTrades[0];
        
        // Only trade if efficiency is good and we have excess resources
        if (bestTrade.efficiency > 1.2 && player.resources[bestTrade.give] > bestTrade.cost + 2) {
            return bestTrade;
        }

        return null;
    }

    // Execute AI trade
    executeAITrade(gameState, playerId, targetResource = null) {
        const tradeDecision = this.shouldAITrade(gameState, playerId, targetResource);
        
        if (tradeDecision) {
            return this.executeBankTrade(
                gameState, 
                playerId, 
                tradeDecision.give, 
                tradeDecision.receive
            );
        }

        return { success: false, error: 'No beneficial trades available' };
    }

    // Player-to-player trading (for future expansion)
    proposePlayerTrade(fromPlayerId, toPlayerId, giveResources, receiveResources) {
        const tradeId = this.generateTradeId();
        const offer = {
            id: tradeId,
            fromPlayerId,
            toPlayerId,
            give: giveResources,
            receive: receiveResources,
            status: 'pending',
            timestamp: Date.now(),
            expiresAt: Date.now() + 60000 // 1 minute expiry
        };

        this.activeOffers.set(tradeId, offer);
        return offer;
    }

    // Accept player trade
    acceptPlayerTrade(gameState, tradeId) {
        const offer = this.activeOffers.get(tradeId);
        if (!offer || offer.status !== 'pending') {
            return { success: false, error: 'Invalid or expired trade offer' };
        }

        const fromPlayer = gameState.players[offer.fromPlayerId];
        const toPlayer = gameState.players[offer.toPlayerId];

        // Validate both players have required resources
        if (!this.validatePlayerTradeResources(fromPlayer, offer.give) ||
            !this.validatePlayerTradeResources(toPlayer, offer.receive)) {
            return { success: false, error: 'Insufficient resources for trade' };
        }

        // Execute trade
        this.transferResources(fromPlayer, toPlayer, offer.give, offer.receive);
        
        offer.status = 'completed';
        this.tradeHistory.push({
            type: 'player',
            ...offer,
            completedAt: Date.now()
        });

        return { success: true, trade: offer };
    }

    // Validate player has required resources
    validatePlayerTradeResources(player, resources) {
        return Object.keys(resources).every(resource => 
            player.resources[resource] >= resources[resource]
        );
    }

    // Transfer resources between players
    transferResources(fromPlayer, toPlayer, giveResources, receiveResources) {
        // Remove resources from giver
        Object.keys(giveResources).forEach(resource => {
            fromPlayer.resources[resource] -= giveResources[resource];
        });

        // Add resources to receiver
        Object.keys(receiveResources).forEach(resource => {
            toPlayer.resources[resource] += receiveResources[resource];
        });

        // Remove resources from receiver (they're giving these)
        Object.keys(receiveResources).forEach(resource => {
            toPlayer.resources[resource] -= receiveResources[resource];
        });

        // Add resources to giver (they're receiving these)
        Object.keys(giveResources).forEach(resource => {
            fromPlayer.resources[resource] += giveResources[resource];
        });
    }

    // Generate unique trade ID
    generateTradeId() {
        return 'trade_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Get trading statistics for a player
    getTradingStats(playerId) {
        const playerTrades = this.tradeHistory.filter(trade => 
            trade.playerId === playerId || trade.fromPlayerId === playerId || trade.toPlayerId === playerId
        );

        const stats = {
            totalTrades: playerTrades.length,
            bankTrades: playerTrades.filter(trade => trade.type === 'bank').length,
            playerTrades: playerTrades.filter(trade => trade.type === 'player').length,
            resourcesTraded: {},
            averageEfficiency: 0,
            portAdvantage: 0
        };

        // Calculate port advantage
        const playerPorts = this.portAccess.get(playerId) || [];
        stats.portAdvantage = playerPorts.length;

        // Calculate resource trading patterns
        playerTrades.forEach(trade => {
            if (trade.give) {
                Object.keys(trade.give).forEach(resource => {
                    stats.resourcesTraded[resource] = (stats.resourcesTraded[resource] || 0) + trade.give[resource];
                });
            }
        });

        return stats;
    }

    // Clean up expired offers
    cleanupExpiredOffers() {
        const now = Date.now();
        for (const [tradeId, offer] of this.activeOffers.entries()) {
            if (offer.expiresAt < now && offer.status === 'pending') {
                offer.status = 'expired';
                this.activeOffers.delete(tradeId);
            }
        }
    }

    // Get port information for UI display
    getPortInfo(gameState, playerId) {
        const playerPorts = this.portAccess.get(playerId) || [];
        const portInfo = {
            hasGenericPort: playerPorts.some(port => port.type === PORT_TYPES.GENERIC),
            specializedPorts: playerPorts.filter(port => port.type !== PORT_TYPES.GENERIC),
            tradingRatios: {}
        };

        // Calculate trading ratios for each resource
        Object.keys(gameState.players[playerId].resources).forEach(resource => {
            portInfo.tradingRatios[resource] = this.getBestTradingRatio(playerId, resource);
        });

        return portInfo;
    }

    // Evaluate trade value for AI decision making
    evaluateTradeValue(gameState, playerId, trade) {
        const player = gameState.players[playerId];
        let value = 0;

        // Base efficiency value
        value += trade.efficiency * 10;

        // Resource need assessment
        const giveResourceCount = player.resources[trade.give];
        const receiveResourceCount = player.resources[trade.receive];

        // Prefer trading away excess resources
        if (giveResourceCount > 5) value += 5;
        if (giveResourceCount > 8) value += 10;

        // Prefer getting scarce resources
        if (receiveResourceCount < 2) value += 8;
        if (receiveResourceCount === 0) value += 15;

        // Port advantage bonus
        if (trade.ratio < TRADING_RATIOS.BANK) {
            value += (TRADING_RATIOS.BANK - trade.ratio) * 5;
        }

        return value;
    }
}

// Port generation for board setup
export function generatePortsForBoard(tiles) {
    const ports = [];
    const portPositions = STANDARD_PORTS;

    portPositions.forEach((portConfig, index) => {
        const port = {
            id: `port_${index}`,
            type: portConfig.type,
            ratio: portConfig.type === PORT_TYPES.GENERIC ? 
                   TRADING_RATIOS.GENERIC_PORT : 
                   TRADING_RATIOS.SPECIALIZED_PORT,
            nodeIds: portConfig.position, // Adjacent node IDs
            position: {
                x: 100 + (index % 3) * 200,
                y: 50 + Math.floor(index / 3) * 100
            }
        };
        ports.push(port);
    });

    return ports;
}

// Attach ports to board nodes
export function attachPortsToNodes(nodes, ports) {
    ports.forEach(port => {
        port.nodeIds.forEach(nodeId => {
            if (nodes[nodeId]) {
                nodes[nodeId].port = port;
            }
        });
    });
}

// Export trading system factory
export function createTradingSystem() {
    return new EnhancedTradingSystem();
}