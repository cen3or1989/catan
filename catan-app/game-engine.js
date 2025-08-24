// Core Game Engine for Full Catan Implementation
// ================================================

import { 
  GAME_PHASES, TURN_PHASES, BUILDING_COSTS, BUILDING_LIMITS,
  VICTORY_POINT_VALUES, DEV_CARD_TYPES, DICE_PROBABILITIES,
  createInitialGameState, calculateVictoryPoints, calculatePublicVictoryPoints,
  canAffordBuilding, payForBuilding, getTotalResources,
  canPlaceSettlement, canPlaceRoad
} from './game-types.js';

import { generateRandomBoard } from './board-generator.js';

export class CatanGameEngine {
  constructor(numPlayers = 4) {
    this.gameState = createInitialGameState(numPlayers);
    this.gameState.board = generateRandomBoard();
    this.eventListeners = [];
  }

  // Event System
  addEventListener(eventType, callback) {
    if (!this.eventListeners[eventType]) {
      this.eventListeners[eventType] = [];
    }
    this.eventListeners[eventType].push(callback);
  }

  emit(eventType, data) {
    if (this.eventListeners[eventType]) {
      this.eventListeners[eventType].forEach(callback => callback(data));
    }
  }

  // Game State Access
  getGameState() {
    return { ...this.gameState };
  }

  getCurrentPlayer() {
    return this.gameState.players[this.gameState.currentPlayer];
  }

  // Setup Phase Management
  isSetupPhase() {
    return this.gameState.phase === GAME_PHASES.SETUP;
  }

  getSetupPhaseInfo() {
    if (!this.isSetupPhase()) return null;

    const { currentPlayer, setupRound, setupDirection } = this.gameState;
    const totalPlayers = this.gameState.players.length;
    
    return {
      currentPlayer,
      setupRound,
      setupDirection,
      isFirstRound: setupRound === 1,
      isSecondRound: setupRound === 2,
      nextAction: this.getNextSetupAction()
    };
  }

  getNextSetupAction() {
    const player = this.getCurrentPlayer();
    const settlementsPlaced = player.settlements.length;
    const roadsPlaced = player.roads.length;

    if (settlementsPlaced < this.gameState.setupRound) {
      return 'place_settlement';
    } else if (roadsPlaced < this.gameState.setupRound) {
      return 'place_road';
    } else {
      return 'end_turn';
    }
  }

  // Setup Phase Actions
  placeInitialSettlement(nodeId) {
    if (!this.isSetupPhase()) {
      throw new Error('Not in setup phase');
    }

    if (this.getNextSetupAction() !== 'place_settlement') {
      throw new Error('Cannot place settlement now');
    }

    if (!canPlaceSettlement(this.gameState, this.gameState.currentPlayer, nodeId)) {
      throw new Error('Cannot place settlement at this location');
    }

    const player = this.getCurrentPlayer();
    
    // Place settlement
    player.settlements.push(nodeId);
    player.buildingsRemaining.settlements--;
    
    // Update node
    this.gameState.board.nodes[nodeId].building = 'settlement';
    this.gameState.board.nodes[nodeId].owner = player.id;

    // Grant initial resources for second settlement
    if (this.gameState.setupRound === 2) {
      this.grantInitialResources(player, nodeId);
    }

    this.updateVictoryPoints(player);
    this.emit('settlementPlaced', { playerId: player.id, nodeId, isInitial: true });

    return true;
  }

  placeInitialRoad(edgeId) {
    if (!this.isSetupPhase()) {
      throw new Error('Not in setup phase');
    }

    if (this.getNextSetupAction() !== 'place_road') {
      throw new Error('Cannot place road now');
    }

    const player = this.getCurrentPlayer();
    const edge = this.gameState.board.edges[edgeId];

    // Must connect to the settlement just placed
    const lastSettlement = player.settlements[player.settlements.length - 1];
    const connectsToLastSettlement = 
      edge.fromNode === lastSettlement || edge.toNode === lastSettlement;

    if (!connectsToLastSettlement) {
      throw new Error('Road must connect to the settlement just placed');
    }

    if (edge.road !== null) {
      throw new Error('Edge already has a road');
    }

    // Place road
    player.roads.push(edgeId);
    player.buildingsRemaining.roads--;
    edge.road = player.id;

    this.emit('roadPlaced', { playerId: player.id, edgeId, isInitial: true });

    // Check if player is done with their setup turn
    if (this.getNextSetupAction() === 'end_turn') {
      this.endSetupTurn();
    }

    return true;
  }

  grantInitialResources(player, settlementNodeId) {
    const node = this.gameState.board.nodes[settlementNodeId];
    node.adjacentTiles.forEach(tileId => {
      const tile = this.gameState.board.tiles[tileId];
      if (tile.resource !== 'desert' && tile.resource) {
        player.resources[tile.resource]++;
      }
    });

    this.emit('resourcesGranted', { 
      playerId: player.id, 
      reason: 'initial_settlement',
      resources: node.adjacentTiles.map(tileId => 
        this.gameState.board.tiles[tileId].resource
      ).filter(resource => resource !== 'desert')
    });
  }

  endSetupTurn() {
    const totalPlayers = this.gameState.players.length;
    
    if (this.gameState.setupRound === 1) {
      // First round: forward order (0 -> 1 -> 2 -> 3)
      if (this.gameState.currentPlayer < totalPlayers - 1) {
        this.gameState.currentPlayer++;
      } else {
        // Start second round in reverse order
        this.gameState.setupRound = 2;
        this.gameState.setupDirection = -1;
        // Current player stays the same (last player goes first in reverse)
      }
    } else {
      // Second round: reverse order (3 -> 2 -> 1 -> 0)
      if (this.gameState.currentPlayer > 0) {
        this.gameState.currentPlayer--;
      } else {
        // Setup phase complete, start main game
        this.startMainGame();
        return;
      }
    }

    this.emit('setupTurnEnded', {
      newCurrentPlayer: this.gameState.currentPlayer,
      setupRound: this.gameState.setupRound
    });
  }

  startMainGame() {
    this.gameState.phase = GAME_PHASES.MAIN_GAME;
    this.gameState.turnPhase = TURN_PHASES.DICE_ROLL;
    this.gameState.currentPlayer = 0; // First player starts
    this.gameState.turnNumber = 1;

    this.emit('mainGameStarted', { firstPlayer: 0 });
  }

  // Main Game Phase Management
  rollDice() {
    if (this.gameState.phase !== GAME_PHASES.MAIN_GAME) {
      throw new Error('Not in main game phase');
    }

    if (this.gameState.turnPhase !== TURN_PHASES.DICE_ROLL) {
      throw new Error('Not dice roll phase');
    }

    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2;

    this.gameState.lastDiceRoll = total;

    if (total === 7) {
      this.handleRobberRoll();
    } else {
      this.produceResources(total);
      this.gameState.turnPhase = TURN_PHASES.ACTIONS;
    }

    this.emit('diceRolled', { dice1, dice2, total });

    return { dice1, dice2, total };
  }

  handleRobberRoll() {
    // Force players with >7 cards to discard
    let playersNeedToDiscard = 0;

    this.gameState.players.forEach(player => {
      const totalCards = getTotalResources(player);
      if (totalCards > 7) {
        player.mustDiscardCards = Math.floor(totalCards / 2);
        playersNeedToDiscard++;
      }
    });

    if (playersNeedToDiscard > 0) {
      this.gameState.turnPhase = 'discard_cards';
      this.emit('discardCardsRequired', { playersNeedToDiscard });
    } else {
      this.gameState.turnPhase = TURN_PHASES.ROBBER_PLACEMENT;
      this.emit('robberMustBeMoved', {});
    }
  }

  discardCards(playerId, cardsToDiscard) {
    const player = this.gameState.players[playerId];
    
    if (player.mustDiscardCards === 0) {
      throw new Error('Player does not need to discard');
    }

    const totalDiscarded = Object.values(cardsToDiscard).reduce((sum, count) => sum + count, 0);
    if (totalDiscarded !== player.mustDiscardCards) {
      throw new Error(`Must discard exactly ${player.mustDiscardCards} cards`);
    }

    // Check player has enough cards
    Object.entries(cardsToDiscard).forEach(([resource, count]) => {
      if (player.resources[resource] < count) {
        throw new Error(`Not enough ${resource} cards to discard`);
      }
    });

    // Discard cards
    Object.entries(cardsToDiscard).forEach(([resource, count]) => {
      player.resources[resource] -= count;
    });

    player.mustDiscardCards = 0;

    this.emit('cardsDiscarded', { playerId, cardsDiscarded: cardsToDiscard });

    // Check if all players are done discarding
    const playersStillDiscarding = this.gameState.players.some(p => p.mustDiscardCards > 0);
    if (!playersStillDiscarding) {
      this.gameState.turnPhase = TURN_PHASES.ROBBER_PLACEMENT;
      this.emit('robberMustBeMoved', {});
    }
  }

  moveRobber(tileId, targetPlayerId = null) {
    if (this.gameState.turnPhase !== TURN_PHASES.ROBBER_PLACEMENT) {
      throw new Error('Not robber placement phase');
    }

    const tile = this.gameState.board.tiles[tileId];
    if (!tile) {
      throw new Error('Invalid tile');
    }

    if (tileId === this.gameState.board.robberPosition) {
      throw new Error('Robber must move to a different tile');
    }

    // Clear robber from old position
    if (this.gameState.board.robberPosition !== null) {
      const oldTile = this.gameState.board.tiles[this.gameState.board.robberPosition];
      oldTile.hasRobber = false;
      oldTile.isBlocked = false;
    }

    // Place robber on new tile
    this.gameState.board.robberPosition = tileId;
    tile.hasRobber = true;
    tile.isBlocked = true;

    // Steal from adjacent player if specified
    if (targetPlayerId !== null) {
      this.stealRandomCard(this.gameState.currentPlayer, targetPlayerId);
    }

    this.gameState.turnPhase = TURN_PHASES.ACTIONS;
    this.emit('robberMoved', { tileId, targetPlayerId });
  }

  stealRandomCard(stealerPlayerId, victimPlayerId) {
    const victim = this.gameState.players[victimPlayerId];
    const stealer = this.gameState.players[stealerPlayerId];

    const availableResources = [];
    Object.entries(victim.resources).forEach(([resource, count]) => {
      for (let i = 0; i < count; i++) {
        availableResources.push(resource);
      }
    });

    if (availableResources.length === 0) {
      return null; // No cards to steal
    }

    const randomIndex = Math.floor(Math.random() * availableResources.length);
    const stolenResource = availableResources[randomIndex];

    victim.resources[stolenResource]--;
    stealer.resources[stolenResource]++;

    this.emit('cardStolen', { stealerPlayerId, victimPlayerId, resource: stolenResource });

    return stolenResource;
  }

  produceResources(diceRoll) {
    const production = {};

    this.gameState.players.forEach(player => {
      production[player.id] = {
        wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0
      };

      // Check settlements
      player.settlements.forEach(nodeId => {
        const node = this.gameState.board.nodes[nodeId];
        node.adjacentTiles.forEach(tileId => {
          const tile = this.gameState.board.tiles[tileId];
          if (tile.token === diceRoll && !tile.isBlocked) {
            production[player.id][tile.resource]++;
            player.resources[tile.resource]++;
          }
        });
      });

      // Check cities (double production)
      player.cities.forEach(nodeId => {
        const node = this.gameState.board.nodes[nodeId];
        node.adjacentTiles.forEach(tileId => {
          const tile = this.gameState.board.tiles[tileId];
          if (tile.token === diceRoll && !tile.isBlocked) {
            production[player.id][tile.resource]++;
            player.resources[tile.resource]++;
          }
        });
      });
    });

    this.emit('resourcesProduced', { diceRoll, production });
  }

  // Building Actions
  buildSettlement(nodeId) {
    if (this.gameState.turnPhase !== TURN_PHASES.ACTIONS) {
      throw new Error('Not in actions phase');
    }

    const player = this.getCurrentPlayer();

    if (!canAffordBuilding(player, 'settlement')) {
      throw new Error('Cannot afford settlement');
    }

    if (!canPlaceSettlement(this.gameState, player.id, nodeId)) {
      throw new Error('Cannot place settlement at this location');
    }

    // Pay cost
    player.resources = payForBuilding(player, 'settlement');
    
    // Place settlement
    player.settlements.push(nodeId);
    player.buildingsRemaining.settlements--;
    
    // Update node
    this.gameState.board.nodes[nodeId].building = 'settlement';
    this.gameState.board.nodes[nodeId].owner = player.id;

    this.updateVictoryPoints(player);
    this.checkLongestRoad();
    this.emit('settlementBuilt', { playerId: player.id, nodeId });

    return true;
  }

  buildCity(nodeId) {
    if (this.gameState.turnPhase !== TURN_PHASES.ACTIONS) {
      throw new Error('Not in actions phase');
    }

    const player = this.getCurrentPlayer();
    const node = this.gameState.board.nodes[nodeId];

    if (!canAffordBuilding(player, 'city')) {
      throw new Error('Cannot afford city');
    }

    if (node.building !== 'settlement' || node.owner !== player.id) {
      throw new Error('Must upgrade your own settlement');
    }

    if (player.buildingsRemaining.cities <= 0) {
      throw new Error('No cities remaining');
    }

    // Pay cost
    player.resources = payForBuilding(player, 'city');
    
    // Upgrade settlement to city
    const settlementIndex = player.settlements.indexOf(nodeId);
    player.settlements.splice(settlementIndex, 1);
    player.cities.push(nodeId);
    
    player.buildingsRemaining.settlements++;
    player.buildingsRemaining.cities--;
    
    // Update node
    node.building = 'city';

    this.updateVictoryPoints(player);
    this.emit('cityBuilt', { playerId: player.id, nodeId });

    return true;
  }

  buildRoad(edgeId) {
    if (this.gameState.turnPhase !== TURN_PHASES.ACTIONS) {
      throw new Error('Not in actions phase');
    }

    const player = this.getCurrentPlayer();

    if (!canAffordBuilding(player, 'road')) {
      throw new Error('Cannot afford road');
    }

    if (!canPlaceRoad(this.gameState, player.id, edgeId)) {
      throw new Error('Cannot place road at this location');
    }

    // Pay cost
    player.resources = payForBuilding(player, 'road');
    
    // Place road
    player.roads.push(edgeId);
    player.buildingsRemaining.roads--;
    this.gameState.board.edges[edgeId].road = player.id;

    this.checkLongestRoad();
    this.emit('roadBuilt', { playerId: player.id, edgeId });

    return true;
  }

  // Development Cards
  buyDevelopmentCard() {
    if (this.gameState.turnPhase !== TURN_PHASES.ACTIONS) {
      throw new Error('Not in actions phase');
    }

    const player = this.getCurrentPlayer();

    if (!canAffordBuilding(player, 'developmentCard')) {
      throw new Error('Cannot afford development card');
    }

    if (this.gameState.developmentCardDeck.length === 0) {
      throw new Error('No development cards remaining');
    }

    // Pay cost
    player.resources = payForBuilding(player, 'developmentCard');
    
    // Draw card
    const cardType = this.gameState.developmentCardDeck.pop();
    player.developmentCards[cardType]++;

    this.updateVictoryPoints(player);
    this.emit('developmentCardBought', { playerId: player.id, cardType });

    return cardType;
  }

  // Turn Management
  endTurn() {
    if (this.gameState.phase !== GAME_PHASES.MAIN_GAME) {
      throw new Error('Not in main game');
    }

    // Reset turn-specific flags
    const player = this.getCurrentPlayer();
    player.hasPlayedDevCard = false;
    player.developmentCardsPlayedThisTurn = [];

    // Next player
    this.gameState.currentPlayer = (this.gameState.currentPlayer + 1) % this.gameState.players.length;
    this.gameState.turnNumber++;
    this.gameState.turnPhase = TURN_PHASES.DICE_ROLL;

    this.emit('turnEnded', {
      newCurrentPlayer: this.gameState.currentPlayer,
      turnNumber: this.gameState.turnNumber
    });

    // Check for victory
    this.checkVictoryCondition();
  }

  // Victory Condition Checking
  updateVictoryPoints(player) {
    player.victoryPoints = calculateVictoryPoints(player);
    player.publicVictoryPoints = calculatePublicVictoryPoints(player, this.gameState);
  }

  checkVictoryCondition() {
    this.gameState.players.forEach(player => {
      this.updateVictoryPoints(player);
      
      if (player.victoryPoints >= this.gameState.settings.victoryPointsToWin) {
        this.gameState.phase = GAME_PHASES.GAME_OVER;
        this.gameState.gameWinner = player.id;
        this.emit('gameWon', { winnerId: player.id, victoryPoints: player.victoryPoints });
      }
    });
  }

  // Longest Road Calculation
  checkLongestRoad() {
    let longestRoadPlayer = null;
    let longestRoadLength = 0;

    this.gameState.players.forEach(player => {
      const roadLength = this.calculateLongestRoadForPlayer(player.id);
      if (roadLength >= 5 && roadLength > longestRoadLength) {
        longestRoadLength = roadLength;
        longestRoadPlayer = player.id;
      }
    });

    if (longestRoadPlayer !== this.gameState.longestRoadPlayer) {
      this.gameState.longestRoadPlayer = longestRoadPlayer;
      this.gameState.longestRoadLength = longestRoadLength;
      
      this.emit('longestRoadChanged', { 
        playerId: longestRoadPlayer, 
        length: longestRoadLength 
      });

      // Update victory points for all players
      this.gameState.players.forEach(player => this.updateVictoryPoints(player));
    }
  }

  calculateLongestRoadForPlayer(playerId) {
    const player = this.gameState.players[playerId];
    if (player.roads.length === 0) return 0;

    // Build road network graph
    const roadNetwork = new Map();
    
    player.roads.forEach(edgeId => {
      const edge = this.gameState.board.edges[edgeId];
      if (!roadNetwork.has(edge.fromNode)) roadNetwork.set(edge.fromNode, []);
      if (!roadNetwork.has(edge.toNode)) roadNetwork.set(edge.toNode, []);
      
      roadNetwork.get(edge.fromNode).push(edge.toNode);
      roadNetwork.get(edge.toNode).push(edge.fromNode);
    });

    // Find longest path using DFS
    let maxLength = 0;
    
    for (const startNode of roadNetwork.keys()) {
      const visited = new Set();
      const length = this.dfsLongestPath(roadNetwork, startNode, visited, playerId);
      maxLength = Math.max(maxLength, length);
    }

    return maxLength;
  }

  dfsLongestPath(roadNetwork, currentNode, visited, playerId) {
    visited.add(currentNode);
    
    let maxLength = 0;
    const neighbors = roadNetwork.get(currentNode) || [];
    
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      
      // Check if path is blocked by opponent settlement/city
      const node = this.gameState.board.nodes[neighbor];
      if (node.building && node.owner !== playerId) continue;
      
      const length = 1 + this.dfsLongestPath(roadNetwork, neighbor, visited, playerId);
      maxLength = Math.max(maxLength, length);
    }
    
    visited.delete(currentNode);
    return maxLength;
  }
}

// Export factory function
export function createCatanGame(numPlayers = 4) {
  return new CatanGameEngine(numPlayers);
}

