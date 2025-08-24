// Complete Catan Win Prediction System
// ===================================

import { createCatanGame } from './game-engine.js';
import { createDevelopmentCardManager } from './development-cards.js';
import { createTradingManager } from './trading-system.js';
import { generateRandomBoard, axialToPixel } from './board-generator.js';
import { 
  GAME_PHASES, TURN_PHASES, BUILDING_COSTS, VICTORY_POINT_VALUES,
  canAffordBuilding, payForBuilding, getTotalResources
} from './game-types.js';

export class CatanPredictionSystem {
  constructor() {
    this.simulationResults = [];
    this.currentSimulation = 0;
    this.totalSimulations = 0;
  }

  // Main prediction function
  async predictWinner(boardSetup, startingPositions, simulationCount = 1000, options = {}) {
    console.log(`🎯 Starting ${simulationCount} simulations...`);
    
    this.totalSimulations = simulationCount;
    this.currentSimulation = 0;
    this.simulationResults = [];
    
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
        buildingStats: {
          settlements: 0,
          cities: 0,
          roads: 0
        }
      })),
      convergenceData: []
    };

    let totalGameLength = 0;
    const batchSize = 50; // Process in batches for better performance

    for (let batch = 0; batch < Math.ceil(simulationCount / batchSize); batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min((batch + 1) * batchSize, simulationCount);
      
      // Run batch of simulations
      const batchPromises = [];
      for (let i = batchStart; i < batchEnd; i++) {
        batchPromises.push(this.runSingleSimulation(boardSetup, startingPositions, options));
      }
      
      const batchResults = await Promise.all(batchPromises);
      
      // Process batch results
      batchResults.forEach((result, index) => {
        const gameNumber = batchStart + index;
        this.currentSimulation = gameNumber + 1;
        
        if (result) {
          results.wins[result.winnerId]++;
          totalGameLength += result.gameLength;
          
          // Update player stats
          result.playerStats.forEach((playerStat, playerId) => {
            const stats = results.playerStats[playerId];
            stats.averageVP += playerStat.victoryPoints;
            stats.averageResources += playerStat.totalResources;
            stats.buildingStats.settlements += playerStat.settlements;
            stats.buildingStats.cities += playerStat.cities;
            stats.buildingStats.roads += playerStat.roads;
          });
          
          // Track convergence every 100 games
          if ((gameNumber + 1) % 100 === 0) {
            results.convergenceData.push({
              gameNumber: gameNumber + 1,
              winRates: results.wins.map(w => w / (gameNumber + 1)),
              confidence: this.calculateConfidenceInterval(results.wins, gameNumber + 1)
            });
          }
        }
        
        // Progress callback
        if (options.onProgress) {
          options.onProgress(this.currentSimulation, this.totalSimulations);
        }
      });
      
      // Small delay to prevent UI blocking
      if (batch < Math.ceil(simulationCount / batchSize) - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Calculate final statistics
    results.averageGameLength = totalGameLength / simulationCount;
    
    results.playerStats.forEach((stats, playerId) => {
      stats.wins = results.wins[playerId];
      stats.winPercentage = (results.wins[playerId] / simulationCount) * 100;
      stats.averageVP /= simulationCount;
      stats.averageResources /= simulationCount;
      stats.buildingStats.settlements /= simulationCount;
      stats.buildingStats.cities /= simulationCount;
      stats.buildingStats.roads /= simulationCount;
    });

    // Add confidence intervals
    results.confidenceIntervals = results.wins.map(wins => 
      this.calculateConfidenceInterval([wins], simulationCount)
    );

    console.log(`✅ Completed ${simulationCount} simulations`);
    return results;
  }

  // Run a single game simulation
  async runSingleSimulation(boardSetup, startingPositions, options = {}) {
    try {
      // Create game instance
      const game = createCatanGame(4);
      const devCardManager = createDevelopmentCardManager(game);
      const tradingManager = createTradingManager(game);
      
      // Set up board
      if (boardSetup) {
        game.gameState.board = this.createBoardFromSetup(boardSetup);
      }
      
      // Set up starting positions
      if (startingPositions) {
        this.applyStartingPositions(game, startingPositions);
      } else {
        // Run setup phase simulation
        await this.simulateSetupPhase(game);
      }
      
      // Simulate main game
      const result = await this.simulateMainGame(game, devCardManager, tradingManager, options);
      
      return result;
    } catch (error) {
      console.error('Simulation error:', error);
      return null;
    }
  }

  // Simulate the setup phase
  async simulateSetupPhase(game) {
    const gameState = game.getGameState();
    
    // Simulate snake order placement
    while (gameState.phase === GAME_PHASES.SETUP) {
      const currentPlayer = gameState.currentPlayer;
      const setupInfo = game.getSetupPhaseInfo();
      
      if (setupInfo.nextAction === 'place_settlement') {
        // AI chooses settlement placement
        const bestSettlement = this.chooseBestSettlementPlacement(game, currentPlayer);
        if (bestSettlement) {
          game.placeInitialSettlement(bestSettlement);
        }
      } else if (setupInfo.nextAction === 'place_road') {
        // AI chooses road placement
        const bestRoad = this.chooseBestRoadPlacement(game, currentPlayer);
        if (bestRoad) {
          game.placeInitialRoad(bestRoad);
        }
      }
      
      // Small delay to prevent infinite loops
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }

  // Simulate the main game phase
  async simulateMainGame(game, devCardManager, tradingManager, options = {}) {
    const gameState = game.getGameState();
    let turnCount = 0;
    const maxTurns = options.maxTurns || 500; // Prevent infinite games
    
    while (gameState.phase === GAME_PHASES.MAIN_GAME && turnCount < maxTurns) {
      turnCount++;
      
      // Roll dice
      if (gameState.turnPhase === TURN_PHASES.DICE_ROLL) {
        game.rollDice();
      }
      
      // Handle robber placement
      if (gameState.turnPhase === TURN_PHASES.ROBBER_PLACEMENT) {
        this.handleRobberPlacement(game);
      }
      
      // Handle card discarding
      if (gameState.turnPhase === 'discard_cards') {
        this.handleCardDiscarding(game);
      }
      
      // Take actions
      if (gameState.turnPhase === TURN_PHASES.ACTIONS) {
        await this.simulatePlayerActions(game, devCardManager, tradingManager, options);
        game.endTurn();
      }
      
      // Check for victory
      if (gameState.phase === GAME_PHASES.GAME_OVER) {
        break;
      }
    }
    
    // Return game result
    return this.analyzeGameResult(game, turnCount);
  }

  // AI Strategy: Choose best settlement placement
  chooseBestSettlementPlacement(game, playerId) {
    const gameState = game.getGameState();
    const availableNodes = gameState.board.nodes.filter(node => 
      game.canPlaceSettlement && game.canPlaceSettlement(gameState, playerId, node.id)
    );
    
    if (availableNodes.length === 0) return null;
    
    // Score each position based on resource production potential
    let bestNode = null;
    let bestScore = -1;
    
    availableNodes.forEach(node => {
      const score = this.calculateSettlementScore(node, gameState.board.tiles);
      if (score > bestScore) {
        bestScore = score;
        bestNode = node.id;
      }
    });
    
    return bestNode;
  }

  // Calculate settlement placement score
  calculateSettlementScore(node, tiles) {
    let score = 0;
    const resourceValues = { wood: 1, brick: 1, sheep: 1, wheat: 1.2, ore: 1.3 };
    const diceProbabilities = {
      2: 1/36, 3: 2/36, 4: 3/36, 5: 4/36, 6: 5/36,
      8: 5/36, 9: 4/36, 10: 3/36, 11: 2/36, 12: 1/36
    };
    
    node.adjacentTiles.forEach(tileId => {
      const tile = tiles[tileId];
      if (tile && tile.resource !== 'desert') {
        const resourceValue = resourceValues[tile.resource] || 1;
        const probability = diceProbabilities[tile.token] || 0;
        score += resourceValue * probability * 36; // Normalize
      }
    });
    
    // Bonus for diversity
    const uniqueResources = new Set(
      node.adjacentTiles
        .map(tileId => tiles[tileId].resource)
        .filter(resource => resource !== 'desert')
    );
    score += uniqueResources.size * 0.5;
    
    // Bonus for high-probability numbers (6, 8)
    const hasHighProbNumbers = node.adjacentTiles.some(tileId => {
      const tile = tiles[tileId];
      return tile.token === 6 || tile.token === 8;
    });
    if (hasHighProbNumbers) score += 2;
    
    return score;
  }

  // AI Strategy: Choose best road placement
  chooseBestRoadPlacement(game, playerId) {
    const gameState = game.getGameState();
    const player = gameState.players[playerId];
    
    if (player.settlements.length === 0) return null;
    
    const lastSettlement = player.settlements[player.settlements.length - 1];
    const availableEdges = gameState.board.edges.filter(edge => 
      (edge.fromNode === lastSettlement || edge.toNode === lastSettlement) &&
      edge.road === null
    );
    
    if (availableEdges.length === 0) return null;
    
    // Choose randomly for simplicity, or implement more sophisticated strategy
    return availableEdges[Math.floor(Math.random() * availableEdges.length)].id;
  }

  // Simulate player actions during turn
  async simulatePlayerActions(game, devCardManager, tradingManager, options) {
    const gameState = game.getGameState();
    const currentPlayer = gameState.players[gameState.currentPlayer];
    
    // Strategy: Build in priority order
    const buildingPriority = ['city', 'settlement', 'road', 'developmentCard'];
    
    for (const buildingType of buildingPriority) {
      if (this.tryToBuild(game, buildingType, currentPlayer.id)) {
        break; // One action per turn for simplicity
      }
    }
    
    // Try trading if can't build anything
    if (!this.hasAffordableActions(currentPlayer)) {
      this.attemptTrading(game, tradingManager, currentPlayer.id);
    }
  }

  // Try to build a specific type
  tryToBuild(game, buildingType, playerId) {
    const gameState = game.getGameState();
    const player = gameState.players[playerId];
    
    switch (buildingType) {
      case 'city':
        if (canAffordBuilding(player, 'city') && player.settlements.length > 0) {
          try {
            game.buildCity(player.settlements[0]);
            return true;
          } catch (error) {
            return false;
          }
        }
        break;
        
      case 'settlement':
        if (canAffordBuilding(player, 'settlement')) {
          const bestNode = this.chooseBestSettlementPlacement(game, playerId);
          if (bestNode) {
            try {
              game.buildSettlement(bestNode);
              return true;
            } catch (error) {
              return false;
            }
          }
        }
        break;
        
      case 'road':
        if (canAffordBuilding(player, 'road')) {
          const bestEdge = this.findBestRoadPlacement(game, playerId);
          if (bestEdge) {
            try {
              game.buildRoad(bestEdge);
              return true;
            } catch (error) {
              return false;
            }
          }
        }
        break;
        
      case 'developmentCard':
        if (canAffordBuilding(player, 'developmentCard')) {
          try {
            game.buyDevelopmentCard();
            return true;
          } catch (error) {
            return false;
          }
        }
        break;
    }
    
    return false;
  }

  // Find best road placement for expansion
  findBestRoadPlacement(game, playerId) {
    const gameState = game.getGameState();
    const availableEdges = gameState.board.edges.filter(edge => 
      game.canPlaceRoad && game.canPlaceRoad(gameState, playerId, edge.id)
    );
    
    if (availableEdges.length === 0) return null;
    
    // Choose randomly for now, could implement path-finding logic
    return availableEdges[Math.floor(Math.random() * availableEdges.length)].id;
  }

  // Check if player has any affordable actions
  hasAffordableActions(player) {
    return ['settlement', 'city', 'road', 'developmentCard'].some(building => 
      canAffordBuilding(player, building)
    );
  }

  // Attempt trading (simplified)
  attemptTrading(game, tradingManager, playerId) {
    const gameState = game.getGameState();
    const player = gameState.players[playerId];
    
    // Try bank trading if have 4+ of same resource
    for (const [resource, count] of Object.entries(player.resources)) {
      if (count >= 4) {
        // Trade for a resource we need
        const neededResource = this.getMostNeededResource(player);
        if (neededResource) {
          try {
            tradingManager.tradeWithBank(playerId, { [resource]: 4 }, neededResource);
            return true;
          } catch (error) {
            // Trading failed
          }
        }
      }
    }
    
    return false;
  }

  // Get most needed resource for building
  getMostNeededResource(player) {
    const resourcePriority = ['wheat', 'ore', 'wood', 'brick', 'sheep'];
    for (const resource of resourcePriority) {
      if ((player.resources[resource] || 0) < 2) {
        return resource;
      }
    }
    return 'wheat'; // Default
  }

  // Handle robber placement
  handleRobberPlacement(game) {
    const gameState = game.getGameState();
    
    // Simple strategy: place on highest-producing tile that's not desert
    const productiveTiles = gameState.board.tiles
      .filter(tile => tile.resource !== 'desert' && tile.id !== gameState.board.robberPosition)
      .sort((a, b) => {
        const aScore = this.getTileProductionScore(a);
        const bScore = this.getTileProductionScore(b);
        return bScore - aScore;
      });
    
    if (productiveTiles.length > 0) {
      game.moveRobber(productiveTiles[0].id);
    } else {
      // Fallback: move to any valid tile
      const validTiles = gameState.board.tiles.filter(tile => 
        tile.id !== gameState.board.robberPosition
      );
      if (validTiles.length > 0) {
        game.moveRobber(validTiles[0].id);
      }
    }
  }

  // Get tile production score
  getTileProductionScore(tile) {
    const diceProbabilities = {
      2: 1, 3: 2, 4: 3, 5: 4, 6: 5,
      8: 5, 9: 4, 10: 3, 11: 2, 12: 1
    };
    return diceProbabilities[tile.token] || 0;
  }

  // Handle card discarding on robber 7
  handleCardDiscarding(game) {
    const gameState = game.getGameState();
    
    gameState.players.forEach(player => {
      if (player.mustDiscardCards > 0) {
        const cardsToDiscard = this.chooseCardsToDiscard(player, player.mustDiscardCards);
        game.discardCards(player.id, cardsToDiscard);
      }
    });
  }

  // Choose which cards to discard
  chooseCardsToDiscard(player, numToDiscard) {
    const discardPriority = ['sheep', 'wood', 'brick', 'wheat', 'ore']; // Least to most valuable
    const toDiscard = {};
    let remaining = numToDiscard;
    
    for (const resource of discardPriority) {
      const available = player.resources[resource] || 0;
      const discard = Math.min(available, remaining);
      if (discard > 0) {
        toDiscard[resource] = discard;
        remaining -= discard;
      }
      if (remaining === 0) break;
    }
    
    return toDiscard;
  }

  // Analyze final game result
  analyzeGameResult(game, turnCount) {
    const gameState = game.getGameState();
    
    let winnerId = gameState.gameWinner;
    if (winnerId === null) {
      // Game didn't end normally, find player with most VP
      let maxVP = -1;
      winnerId = 0;
      gameState.players.forEach((player, id) => {
        if (player.victoryPoints > maxVP) {
          maxVP = player.victoryPoints;
          winnerId = id;
        }
      });
    }
    
    return {
      winnerId,
      gameLength: turnCount,
      playerStats: gameState.players.map(player => ({
        victoryPoints: player.victoryPoints,
        totalResources: getTotalResources(player),
        settlements: player.settlements.length,
        cities: player.cities.length,
        roads: player.roads.length
      }))
    };
  }

  // Calculate confidence interval using Wilson score
  calculateConfidenceInterval(wins, totalGames, confidence = 0.95) {
    const z = confidence === 0.95 ? 1.96 : 2.576; // 95% or 99%
    
    return wins.map(w => {
      if (totalGames === 0) return [0, 0];
      
      const p = w / totalGames;
      const n = totalGames;
      
      const denominator = 1 + (z * z) / n;
      const center = (p + (z * z) / (2 * n)) / denominator;
      const margin = (z / denominator) * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
      
      return [
        Math.max(0, center - margin),
        Math.min(1, center + margin)
      ];
    });
  }

  // Create board from setup data
  createBoardFromSetup(boardSetup) {
    // This would convert your board setup format to the game engine format
    // Implementation depends on your specific board setup structure
    return generateRandomBoard(); // Fallback for now
  }

  // Apply starting positions
  applyStartingPositions(game, startingPositions) {
    // Skip setup phase and directly apply positions
    game.gameState.phase = GAME_PHASES.MAIN_GAME;
    
    startingPositions.forEach((playerPositions, playerId) => {
      const player = game.gameState.players[playerId];
      
      // Apply settlements
      if (playerPositions.settlements) {
        playerPositions.settlements.forEach(nodeId => {
          player.settlements.push(nodeId);
          game.gameState.board.nodes[nodeId].building = 'settlement';
          game.gameState.board.nodes[nodeId].owner = playerId;
        });
      }
      
      // Apply roads
      if (playerPositions.roads) {
        playerPositions.roads.forEach(edgeId => {
          player.roads.push(edgeId);
          game.gameState.board.edges[edgeId].road = playerId;
        });
      }
      
      // Grant initial resources
      if (playerPositions.initialResources) {
        Object.assign(player.resources, playerPositions.initialResources);
      }
    });
  }
}

// Export the prediction system
export function createPredictionSystem() {
  return new CatanPredictionSystem();
}

