// Development Card System for Catan
// ==================================

import { DEV_CARD_TYPES, BUILDING_COSTS } from './game-types.js';

export class DevelopmentCardManager {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
  }

  // Check if player can play a development card
  canPlayDevelopmentCard(playerId, cardType) {
    const gameState = this.gameEngine.getGameState();
    const player = gameState.players[playerId];

    // Must be current player
    if (gameState.currentPlayer !== playerId) {
      return { canPlay: false, reason: 'Not your turn' };
    }

    // Must be in actions phase
    if (gameState.turnPhase !== 'actions') {
      return { canPlay: false, reason: 'Not in actions phase' };
    }

    // Player must have the card
    if (player.developmentCards[cardType] <= 0) {
      return { canPlay: false, reason: 'Player does not have this card' };
    }

    // Cannot play development card bought this turn (except Victory Point)
    if (cardType !== DEV_CARD_TYPES.VICTORY_POINT && player.hasPlayedDevCard) {
      return { canPlay: false, reason: 'Already played a development card this turn' };
    }

    // Cannot play if bought this turn (check against cards played this turn)
    const cardsBoughtThisTurn = player.developmentCardsPlayedThisTurn || [];
    if (cardsBoughtThisTurn.includes(cardType)) {
      return { canPlay: false, reason: 'Cannot play card bought this turn' };
    }

    return { canPlay: true };
  }

  // Play a Knight card
  playKnight(playerId, targetTileId, stealFromPlayerId = null) {
    const canPlay = this.canPlayDevelopmentCard(playerId, DEV_CARD_TYPES.KNIGHT);
    if (!canPlay.canPlay) {
      throw new Error(canPlay.reason);
    }

    const gameState = this.gameEngine.getGameState();
    const player = gameState.players[playerId];

    // Move robber
    this.gameEngine.moveRobber(targetTileId, stealFromPlayerId);

    // Use the card
    player.developmentCards[DEV_CARD_TYPES.KNIGHT]--;
    player.knightsPlayed++;
    player.hasPlayedDevCard = true;

    // Check for Largest Army
    this.checkLargestArmy();

    this.gameEngine.emit('developmentCardPlayed', {
      playerId,
      cardType: DEV_CARD_TYPES.KNIGHT,
      targetTileId,
      stealFromPlayerId
    });

    return true;
  }

  // Play Road Building card
  playRoadBuilding(playerId, edgeIds) {
    const canPlay = this.canPlayDevelopmentCard(playerId, DEV_CARD_TYPES.ROAD_BUILDING);
    if (!canPlay.canPlay) {
      throw new Error(canPlay.reason);
    }

    if (!Array.isArray(edgeIds) || edgeIds.length > 2 || edgeIds.length === 0) {
      throw new Error('Must specify 1 or 2 roads to build');
    }

    const gameState = this.gameEngine.getGameState();
    const player = gameState.players[playerId];

    // Check if player can place roads at specified locations
    edgeIds.forEach(edgeId => {
      if (!this.gameEngine.canPlaceRoad(gameState, playerId, edgeId)) {
        throw new Error(`Cannot place road at edge ${edgeId}`);
      }
    });

    // Check if player has enough roads remaining
    if (player.buildingsRemaining.roads < edgeIds.length) {
      throw new Error('Not enough roads remaining');
    }

    // Place roads without paying cost
    edgeIds.forEach(edgeId => {
      player.roads.push(edgeId);
      player.buildingsRemaining.roads--;
      gameState.board.edges[edgeId].road = playerId;
    });

    // Use the card
    player.developmentCards[DEV_CARD_TYPES.ROAD_BUILDING]--;
    player.hasPlayedDevCard = true;

    // Check longest road
    this.gameEngine.checkLongestRoad();

    this.gameEngine.emit('developmentCardPlayed', {
      playerId,
      cardType: DEV_CARD_TYPES.ROAD_BUILDING,
      edgeIds
    });

    return true;
  }

  // Play Monopoly card
  playMonopoly(playerId, resourceType) {
    const canPlay = this.canPlayDevelopmentCard(playerId, DEV_CARD_TYPES.MONOPOLY);
    if (!canPlay.canPlay) {
      throw new Error(canPlay.reason);
    }

    const validResources = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
    if (!validResources.includes(resourceType)) {
      throw new Error('Invalid resource type');
    }

    const gameState = this.gameEngine.getGameState();
    const player = gameState.players[playerId];
    
    let totalStolen = 0;
    const stolenFrom = {};

    // Take all cards of specified type from other players
    gameState.players.forEach(otherPlayer => {
      if (otherPlayer.id !== playerId) {
        const stolen = otherPlayer.resources[resourceType] || 0;
        if (stolen > 0) {
          totalStolen += stolen;
          stolenFrom[otherPlayer.id] = stolen;
          otherPlayer.resources[resourceType] = 0;
        }
      }
    });

    // Give to current player
    player.resources[resourceType] = (player.resources[resourceType] || 0) + totalStolen;

    // Use the card
    player.developmentCards[DEV_CARD_TYPES.MONOPOLY]--;
    player.hasPlayedDevCard = true;

    this.gameEngine.emit('developmentCardPlayed', {
      playerId,
      cardType: DEV_CARD_TYPES.MONOPOLY,
      resourceType,
      totalStolen,
      stolenFrom
    });

    return { totalStolen, stolenFrom };
  }

  // Play Year of Plenty card
  playYearOfPlenty(playerId, resources) {
    const canPlay = this.canPlayDevelopmentCard(playerId, DEV_CARD_TYPES.YEAR_OF_PLENTY);
    if (!canPlay.canPlay) {
      throw new Error(canPlay.reason);
    }

    if (!Array.isArray(resources) || resources.length !== 2) {
      throw new Error('Must choose exactly 2 resources');
    }

    const validResources = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
    resources.forEach(resource => {
      if (!validResources.includes(resource)) {
        throw new Error(`Invalid resource: ${resource}`);
      }
    });

    const gameState = this.gameEngine.getGameState();
    const player = gameState.players[playerId];

    // Grant resources
    resources.forEach(resource => {
      player.resources[resource] = (player.resources[resource] || 0) + 1;
    });

    // Use the card
    player.developmentCards[DEV_CARD_TYPES.YEAR_OF_PLENTY]--;
    player.hasPlayedDevCard = true;

    this.gameEngine.emit('developmentCardPlayed', {
      playerId,
      cardType: DEV_CARD_TYPES.YEAR_OF_PLENTY,
      resources
    });

    return true;
  }

  // Reveal Victory Point card (happens automatically when checking victory)
  revealVictoryPointCard(playerId) {
    const gameState = this.gameEngine.getGameState();
    const player = gameState.players[playerId];

    if (player.developmentCards[DEV_CARD_TYPES.VICTORY_POINT] <= 0) {
      throw new Error('Player has no Victory Point cards to reveal');
    }

    // Victory Point cards are automatically counted in victory calculation
    // This method is just for explicit revelation if needed

    this.gameEngine.emit('victoryPointCardRevealed', {
      playerId,
      totalVictoryPointCards: player.developmentCards[DEV_CARD_TYPES.VICTORY_POINT]
    });

    return true;
  }

  // Check for Largest Army achievement
  checkLargestArmy() {
    const gameState = this.gameEngine.getGameState();
    let largestArmyPlayer = null;
    let largestArmySize = 0;

    gameState.players.forEach(player => {
      if (player.knightsPlayed >= 3 && player.knightsPlayed > largestArmySize) {
        largestArmySize = player.knightsPlayed;
        largestArmyPlayer = player.id;
      }
    });

    if (largestArmyPlayer !== gameState.largestArmyPlayer) {
      gameState.largestArmyPlayer = largestArmyPlayer;
      gameState.largestArmySize = largestArmySize;

      this.gameEngine.emit('largestArmyChanged', {
        playerId: largestArmyPlayer,
        armySize: largestArmySize
      });

      // Update victory points for all players
      gameState.players.forEach(player => {
        this.gameEngine.updateVictoryPoints(player);
      });
    }
  }

  // Get development card effects for UI display
  getCardEffect(cardType) {
    switch (cardType) {
      case DEV_CARD_TYPES.KNIGHT:
        return {
          name: 'Knight',
          description: 'Move the robber and steal a card from an adjacent player',
          playable: true,
          immediate: true
        };

      case DEV_CARD_TYPES.ROAD_BUILDING:
        return {
          name: 'Road Building',
          description: 'Build 2 roads for free',
          playable: true,
          immediate: true
        };

      case DEV_CARD_TYPES.MONOPOLY:
        return {
          name: 'Monopoly',
          description: 'Take all cards of one resource type from all other players',
          playable: true,
          immediate: true
        };

      case DEV_CARD_TYPES.YEAR_OF_PLENTY:
        return {
          name: 'Year of Plenty',
          description: 'Take any 2 resource cards from the bank',
          playable: true,
          immediate: true
        };

      case DEV_CARD_TYPES.VICTORY_POINT:
        return {
          name: 'Victory Point',
          description: 'Adds 1 victory point (revealed when you reach 10 points)',
          playable: false,
          immediate: false
        };

      default:
        return null;
    }
  }

  // Get all playable cards for a player
  getPlayableCards(playerId) {
    const gameState = this.gameEngine.getGameState();
    const player = gameState.players[playerId];
    const playableCards = [];

    Object.entries(player.developmentCards).forEach(([cardType, count]) => {
      if (count > 0 && cardType !== DEV_CARD_TYPES.VICTORY_POINT) {
        const canPlay = this.canPlayDevelopmentCard(playerId, cardType);
        if (canPlay.canPlay) {
          playableCards.push({
            type: cardType,
            count,
            effect: this.getCardEffect(cardType)
          });
        }
      }
    });

    return playableCards;
  }

  // Development card deck management
  shuffleDeck() {
    const gameState = this.gameEngine.getGameState();
    
    // Combine deck and discard pile
    const allCards = [
      ...gameState.developmentCardDeck,
      ...gameState.developmentCardDiscardPile
    ];

    // Shuffle
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }

    // Reset deck and discard pile
    gameState.developmentCardDeck = allCards;
    gameState.developmentCardDiscardPile = [];

    this.gameEngine.emit('developmentDeckShuffled', {
      deckSize: allCards.length
    });
  }

  // Get development card statistics
  getDeckInfo() {
    const gameState = this.gameEngine.getGameState();
    
    return {
      cardsRemaining: gameState.developmentCardDeck.length,
      cardsInDiscard: gameState.developmentCardDiscardPile.length,
      totalCardsInPlay: gameState.players.reduce((total, player) => {
        return total + Object.values(player.developmentCards).reduce((sum, count) => sum + count, 0);
      }, 0)
    };
  }
}

// Export for use with game engine
export function createDevelopmentCardManager(gameEngine) {
  return new DevelopmentCardManager(gameEngine);
}

