/**
 * Simulation Engine
 * Handles game simulation logic separated from UI
 */

import { 
  rollDice, 
  canAfford, 
  payResources, 
  addResources, 
  calculateResourcesFromRoll,
  calculateWilsonCI 
} from '../utils/gameLogic.js';

export class SimulationEngine {
  constructor() {
    this.isRunning = false;
    this.currentSimulation = 0;
    this.totalSimulations = 0;
  }

  async runSimulations(boardSetup, players, simulationCount, options = {}) {
    this.isRunning = true;
    this.currentSimulation = 0;
    this.totalSimulations = simulationCount;

    console.log(`🎯 Starting ${simulationCount} simulations...`);

    const results = {
      wins: Array(players.length).fill(0),
      totalGames: simulationCount,
      averageGameLength: 0,
      playerStats: players.map((_, i) => ({
        playerId: i,
        wins: 0,
        winPercentage: 0,
        averageVP: 0,
        averageResources: 0
      })),
      convergenceData: []
    };

    let totalGameLength = 0;
    const batchSize = 50;

    try {
      for (let batch = 0; batch < Math.ceil(simulationCount / batchSize); batch++) {
        if (!this.isRunning) break;

        const batchStart = batch * batchSize;
        const batchEnd = Math.min((batch + 1) * batchSize, simulationCount);

        // Run batch of simulations
        for (let i = batchStart; i < batchEnd; i++) {
          if (!this.isRunning) break;

          const gameResult = this.simulateGame(boardSetup, players);
          
          if (gameResult) {
            results.wins[gameResult.winnerId]++;
            totalGameLength += gameResult.gameLength;

            // Update player stats
            gameResult.playerStats.forEach((playerStat, playerId) => {
              const stats = results.playerStats[playerId];
              stats.averageVP += playerStat.victoryPoints;
              stats.averageResources += playerStat.totalResources;
            });
          }

          this.currentSimulation = i + 1;

          // Progress callback
          if (options.onProgress && (i + 1) % 25 === 0) {
            options.onProgress(i + 1, simulationCount);
          }

          // Convergence tracking
          if ((i + 1) % 100 === 0) {
            results.convergenceData.push({
              gameNumber: i + 1,
              winRates: results.wins.map(w => w / (i + 1))
            });
          }
        }

        // Prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Calculate final statistics
      if (this.isRunning && results.wins.reduce((a, b) => a + b, 0) > 0) {
        const completedGames = results.wins.reduce((a, b) => a + b, 0);
        results.averageGameLength = totalGameLength / completedGames;

        results.playerStats.forEach((stats, playerId) => {
          stats.wins = results.wins[playerId];
          stats.winPercentage = (results.wins[playerId] / simulationCount) * 100;
          stats.averageVP /= simulationCount;
          stats.averageResources /= simulationCount;
        });

        // Add confidence intervals
        results.confidenceIntervals = results.wins.map(wins => 
          calculateWilsonCI(wins, simulationCount)
        );
      }

    } catch (error) {
      console.error('Simulation error:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }

    console.log(`✅ Completed ${simulationCount} simulations`);
    return results;
  }

  simulateGame(boardSetup, players) {
    try {
      // Initialize game state
      const gameState = this.initializeGameState(boardSetup, players);
      let turnCount = 0;
      const maxTurns = 200; // Prevent infinite games

      // Simulate game turns
      while (!this.isGameOver(gameState) && turnCount < maxTurns) {
        this.simulateTurn(gameState);
        turnCount++;
      }

      // Determine winner
      const winnerId = this.determineWinner(gameState);
      
      return {
        winnerId,
        gameLength: turnCount,
        playerStats: gameState.players.map(player => ({
          victoryPoints: player.victoryPoints,
          totalResources: Object.values(player.resources).reduce((a, b) => a + b, 0),
          settlements: player.settlements,
          cities: player.cities,
          roads: player.roads
        }))
      };

    } catch (error) {
      console.error('Game simulation error:', error);
      return null;
    }
  }

  initializeGameState(boardSetup, players) {
    return {
      board: boardSetup,
      players: players.map((player, index) => ({
        id: index,
        resources: this.calculateInitialResources(player, boardSetup),
        settlements: 2, // Starting settlements
        cities: 0,
        roads: 2, // Starting roads
        victoryPoints: 2, // Starting VP
        developmentCards: 0
      })),
      currentPlayer: 0,
      turnNumber: 0
    };
  }

  calculateInitialResources(player, boardSetup) {
    // Grant resources from second settlement (Catan rule)
    const resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    
    // Simulate resource production from starting positions
    // This is simplified - in reality would depend on actual settlement placement
    const resourceTypes = Object.keys(resources);
    resourceTypes.forEach(resource => {
      resources[resource] = Math.floor(Math.random() * 2); // 0-1 starting resources
    });
    
    return resources;
  }

  simulateTurn(gameState) {
    const currentPlayer = gameState.players[gameState.currentPlayer];
    
    // Roll dice
    const diceRoll = rollDice();
    
    if (diceRoll.total === 7) {
      this.handleRobber(gameState);
    } else {
      this.produceResources(gameState, diceRoll.total);
    }
    
    // Take actions
    this.simulatePlayerActions(gameState, currentPlayer);
    
    // End turn
    gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
    gameState.turnNumber++;
  }

  handleRobber(gameState) {
    // Simplified robber handling - players discard excess cards
    gameState.players.forEach(player => {
      const totalCards = Object.values(player.resources).reduce((a, b) => a + b, 0);
      if (totalCards > 7) {
        const toDiscard = Math.floor(totalCards / 2);
        this.discardRandomCards(player, toDiscard);
      }
    });
  }

  discardRandomCards(player, count) {
    const resources = Object.keys(player.resources);
    for (let i = 0; i < count; i++) {
      const availableResources = resources.filter(r => player.resources[r] > 0);
      if (availableResources.length === 0) break;
      
      const randomResource = availableResources[Math.floor(Math.random() * availableResources.length)];
      player.resources[randomResource]--;
    }
  }

  produceResources(gameState, diceRoll) {
    // Simplified resource production
    gameState.players.forEach(player => {
      // Each player gets some resources based on dice roll
      const productionChance = this.calculateProductionChance(diceRoll);
      
      if (Math.random() < productionChance) {
        const resourceTypes = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
        const randomResource = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
        player.resources[randomResource]++;
      }
    });
  }

  calculateProductionChance(diceRoll) {
    // Higher probability for more common dice rolls
    const probabilities = {
      2: 0.1, 3: 0.2, 4: 0.3, 5: 0.4, 6: 0.5,
      8: 0.5, 9: 0.4, 10: 0.3, 11: 0.2, 12: 0.1
    };
    return probabilities[diceRoll] || 0.35; // Default for 7
  }

  simulatePlayerActions(gameState, player) {
    // Simplified AI: try to build in priority order
    const actions = ['city', 'settlement', 'road', 'developmentCard'];
    
    for (const action of actions) {
      if (this.tryToBuild(player, action)) {
        break; // One action per turn
      }
    }
    
    // Try trading if can't build
    if (!this.hasAffordableActions(player)) {
      this.attemptTrading(player);
    }
  }

  tryToBuild(player, buildingType) {
    const costs = {
      settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
      city: { ore: 3, wheat: 2 },
      road: { wood: 1, brick: 1 },
      developmentCard: { ore: 1, sheep: 1, wheat: 1 }
    };

    const cost = costs[buildingType];
    if (!cost || !canAfford(player.resources, cost)) {
      return false;
    }

    // Pay cost and build
    player.resources = payResources(player.resources, cost);
    
    switch (buildingType) {
      case 'settlement':
        if (player.settlements < 5) {
          player.settlements++;
          player.victoryPoints++;
        }
        break;
      case 'city':
        if (player.cities < 4 && player.settlements > player.cities) {
          player.cities++;
          player.settlements--;
          player.victoryPoints++;
        }
        break;
      case 'road':
        if (player.roads < 15) {
          player.roads++;
        }
        break;
      case 'developmentCard':
        player.developmentCards++;
        // Chance for victory point card
        if (Math.random() < 0.2) {
          player.victoryPoints++;
        }
        break;
    }
    
    return true;
  }

  hasAffordableActions(player) {
    const costs = {
      settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
      city: { ore: 3, wheat: 2 },
      road: { wood: 1, brick: 1 },
      developmentCard: { ore: 1, sheep: 1, wheat: 1 }
    };

    return Object.values(costs).some(cost => canAfford(player.resources, cost));
  }

  attemptTrading(player) {
    // Simple trading: convert 4 of most abundant resource to 1 of most needed
    const resourceCounts = Object.entries(player.resources);
    const mostAbundant = resourceCounts.reduce((max, [resource, count]) => 
      count > max.count ? { resource, count } : max, { resource: null, count: 0 }
    );

    if (mostAbundant.count >= 4) {
      player.resources[mostAbundant.resource] -= 4;
      
      // Give most needed resource (lowest count)
      const leastAbundant = resourceCounts.reduce((min, [resource, count]) => 
        count < min.count ? { resource, count } : min, { resource: 'wood', count: Infinity }
      );
      
      player.resources[leastAbundant.resource]++;
    }
  }

  isGameOver(gameState) {
    return gameState.players.some(player => player.victoryPoints >= 10);
  }

  determineWinner(gameState) {
    let maxVP = -1;
    let winnerId = 0;
    
    gameState.players.forEach((player, index) => {
      if (player.victoryPoints > maxVP) {
        maxVP = player.victoryPoints;
        winnerId = index;
      }
    });
    
    return winnerId;
  }

  stop() {
    this.isRunning = false;
  }

  getProgress() {
    return this.totalSimulations > 0 ? (this.currentSimulation / this.totalSimulations) * 100 : 0;
  }
}