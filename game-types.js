// Game State Architecture for Full Catan Implementation
// =====================================================

// Game Constants
export const RESOURCES = ["wood", "brick", "sheep", "wheat", "ore"];
export const TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
export const DICE_PROBABILITIES = {
  2: 1/36, 3: 2/36, 4: 3/36, 5: 4/36, 6: 5/36, 7: 6/36, 
  8: 5/36, 9: 4/36, 10: 3/36, 11: 2/36, 12: 1/36
};

export const BUILDING_COSTS = {
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
  city: { ore: 3, wheat: 2 },
  road: { wood: 1, brick: 1 },
  developmentCard: { ore: 1, sheep: 1, wheat: 1 }
};

export const BUILDING_LIMITS = {
  settlements: 5,
  cities: 4,
  roads: 15
};

export const VICTORY_POINT_VALUES = {
  settlement: 1,
  city: 2,
  longestRoad: 2,
  largestArmy: 2,
  victoryPointCard: 1
};

export const GAME_PHASES = {
  SETUP: 'setup',
  MAIN_GAME: 'main_game',
  GAME_OVER: 'game_over'
};

export const TURN_PHASES = {
  DICE_ROLL: 'dice_roll',
  ROBBER_PLACEMENT: 'robber_placement',
  ACTIONS: 'actions',
  END_TURN: 'end_turn'
};

export const DEV_CARD_TYPES = {
  KNIGHT: 'knight',
  ROAD_BUILDING: 'road_building',
  MONOPOLY: 'monopoly',
  YEAR_OF_PLENTY: 'year_of_plenty',
  VICTORY_POINT: 'victory_point'
};

export const PORT_TYPES = {
  GENERIC: 'generic', // 3:1
  WOOD: 'wood',       // 2:1
  BRICK: 'brick',     // 2:1
  SHEEP: 'sheep',     // 2:1
  WHEAT: 'wheat',     // 2:1
  ORE: 'ore'          // 2:1
};

export const PLAYER_COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f"];

// Development Card Deck (25 total)
export const DEV_CARD_DECK = [
  ...Array(14).fill(DEV_CARD_TYPES.KNIGHT),
  ...Array(2).fill(DEV_CARD_TYPES.ROAD_BUILDING),
  ...Array(2).fill(DEV_CARD_TYPES.MONOPOLY),
  ...Array(2).fill(DEV_CARD_TYPES.YEAR_OF_PLENTY),
  ...Array(5).fill(DEV_CARD_TYPES.VICTORY_POINT)
];

// Game State Structure
export const createInitialGameState = (numPlayers = 4) => ({
  // Game Meta
  gameId: generateGameId(),
  phase: GAME_PHASES.SETUP,
  turnPhase: TURN_PHASES.DICE_ROLL,
  currentPlayer: 0,
  setupRound: 1, // 1 or 2
  setupDirection: 1, // 1 for forward, -1 for backward
  turnNumber: 0,
  lastDiceRoll: null,
  gameWinner: null,
  
  // Board State
  board: {
    tiles: [], // Will be populated with hex tiles
    nodes: [], // Settlement/city placement points
    edges: [], // Road placement edges
    ports: [], // Trading ports
    robberPosition: null // Hex ID where robber is located
  },
  
  // Players
  players: Array.from({ length: numPlayers }, (_, i) => createPlayer(i)),
  
  // Game Resources
  developmentCardDeck: [...DEV_CARD_DECK].sort(() => Math.random() - 0.5),
  developmentCardDiscardPile: [],
  
  // Special Achievements
  longestRoadPlayer: null,
  longestRoadLength: 0,
  largestArmyPlayer: null,
  largestArmySize: 0,
  
  // Game Settings
  settings: {
    victoryPointsToWin: 10,
    enableTrading: true,
    enablePorts: true,
    robberDiscardLimit: 7
  }
});

export const createPlayer = (id) => ({
  id,
  name: `Player ${id + 1}`,
  color: PLAYER_COLORS[id],
  
  // Resources
  resources: {
    wood: 0,
    brick: 0,
    sheep: 0,
    wheat: 0,
    ore: 0
  },
  
  // Buildings on Board
  settlements: [], // Array of node IDs
  cities: [], // Array of node IDs (upgraded from settlements)
  roads: [], // Array of edge IDs
  
  // Development Cards
  developmentCards: {
    knight: 0,
    roadBuilding: 0,
    monopoly: 0,
    yearOfPlenty: 0,
    victoryPoint: 0
  },
  developmentCardsPlayedThisTurn: [],
  knightsPlayed: 0,
  
  // Victory Points
  victoryPoints: 0,
  publicVictoryPoints: 0, // Visible to all players
  
  // Game State
  hasPlayedDevCard: false,
  mustDiscardCards: 0,
  
  // Building Counts (for limits)
  buildingsRemaining: {
    settlements: BUILDING_LIMITS.settlements,
    cities: BUILDING_LIMITS.cities,
    roads: BUILDING_LIMITS.roads
  }
});

// Tile Structure
export const createTile = (id, q, r, resource, token = null) => ({
  id,
  q, // Axial coordinate
  r, // Axial coordinate
  resource, // 'wood', 'brick', 'sheep', 'wheat', 'ore', 'desert'
  token, // 2-12 (null for desert)
  hasRobber: false,
  isBlocked: false // When robber is present
});

// Node Structure (for settlements/cities)
export const createNode = (id, x, y, adjacentTiles, neighborNodes) => ({
  id,
  x, // Pixel coordinate
  y, // Pixel coordinate
  adjacentTiles, // Array of tile IDs this node touches
  neighborNodes, // Array of node IDs connected by edges
  building: null, // null, 'settlement', or 'city'
  owner: null, // Player ID
  port: null // Port type if this node is a port
});

// Edge Structure (for roads)
export const createEdge = (id, fromNode, toNode, x1, y1, x2, y2) => ({
  id,
  fromNode, // Node ID
  toNode, // Node ID
  x1, y1, x2, y2, // Line coordinates
  road: null, // null or player ID
  isCoastal: false // For port connections
});

// Port Structure
export const createPort = (nodeIds, type, ratio = 3) => ({
  id: `port_${nodeIds.join('_')}`,
  nodeIds, // Array of 2 node IDs
  type, // PORT_TYPES
  ratio // 2 for specific resource, 3 for generic
});

// Utility Functions
export const generateGameId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const calculateVictoryPoints = (player) => {
  let points = 0;
  
  // Buildings
  points += player.settlements.length * VICTORY_POINT_VALUES.settlement;
  points += player.cities.length * VICTORY_POINT_VALUES.city;
  
  // Development Cards (Victory Point cards)
  points += player.developmentCards.victoryPoint * VICTORY_POINT_VALUES.victoryPointCard;
  
  return points;
};

export const calculatePublicVictoryPoints = (player, gameState) => {
  let points = calculateVictoryPoints(player);
  
  // Remove hidden victory point cards
  points -= player.developmentCards.victoryPoint * VICTORY_POINT_VALUES.victoryPointCard;
  
  // Add special achievements
  if (gameState.longestRoadPlayer === player.id) {
    points += VICTORY_POINT_VALUES.longestRoad;
  }
  if (gameState.largestArmyPlayer === player.id) {
    points += VICTORY_POINT_VALUES.largestArmy;
  }
  
  return points;
};

export const canAffordBuilding = (player, buildingType) => {
  const cost = BUILDING_COSTS[buildingType];
  if (!cost) return false;
  
  return Object.entries(cost).every(([resource, amount]) => 
    (player.resources[resource] || 0) >= amount
  );
};

export const payForBuilding = (player, buildingType) => {
  const cost = BUILDING_COSTS[buildingType];
  const newResources = { ...player.resources };
  
  Object.entries(cost).forEach(([resource, amount]) => {
    newResources[resource] -= amount;
  });
  
  return newResources;
};

export const getTotalResources = (player) => {
  return Object.values(player.resources).reduce((sum, count) => sum + count, 0);
};

export const canPlaceSettlement = (gameState, playerId, nodeId) => {
  const node = gameState.board.nodes[nodeId];
  const player = gameState.players[playerId];
  
  // Check if node is empty
  if (node.building !== null) return false;
  
  // Check distance rule (no settlement within 2 edges)
  const hasNearbyBuilding = node.neighborNodes.some(neighborId => {
    const neighbor = gameState.board.nodes[neighborId];
    return neighbor.building !== null;
  });
  
  if (hasNearbyBuilding) return false;
  
  // Check if player has settlements remaining
  if (player.buildingsRemaining.settlements <= 0) return false;
  
  // In main game, must be connected to player's road network
  if (gameState.phase === GAME_PHASES.MAIN_GAME) {
    return isConnectedToRoadNetwork(gameState, playerId, nodeId);
  }
  
  return true;
};

export const canPlaceRoad = (gameState, playerId, edgeId) => {
  const edge = gameState.board.edges[edgeId];
  const player = gameState.players[playerId];
  
  // Check if edge is empty
  if (edge.road !== null) return false;
  
  // Check if player has roads remaining
  if (player.buildingsRemaining.roads <= 0) return false;
  
  // Must connect to player's existing network (settlement, city, or road)
  return isConnectedToPlayerNetwork(gameState, playerId, edgeId);
};

export const isConnectedToRoadNetwork = (gameState, playerId, nodeId) => {
  const node = gameState.board.nodes[nodeId];
  
  // Check if any connected edge has player's road
  return node.neighborNodes.some(neighborId => {
    const edge = gameState.board.edges.find(e => 
      (e.fromNode === nodeId && e.toNode === neighborId) ||
      (e.fromNode === neighborId && e.toNode === nodeId)
    );
    return edge && edge.road === playerId;
  });
};

export const isConnectedToPlayerNetwork = (gameState, playerId, edgeId) => {
  const edge = gameState.board.edges[edgeId];
  
  // Check both endpoints
  const fromNode = gameState.board.nodes[edge.fromNode];
  const toNode = gameState.board.nodes[edge.toNode];
  
  // Connected if either endpoint has player's building
  const fromHasBuilding = fromNode.building !== null && fromNode.owner === playerId;
  const toHasBuilding = toNode.building !== null && toNode.owner === playerId;
  
  if (fromHasBuilding || toHasBuilding) return true;
  
  // Connected if either endpoint connects to player's road (not blocked by opponent)
  const fromHasRoad = fromNode.neighborNodes.some(neighborId => {
    if (neighborId === edge.toNode) return false; // Don't check the edge we're trying to place
    
    const connectingEdge = gameState.board.edges.find(e => 
      (e.fromNode === edge.fromNode && e.toNode === neighborId) ||
      (e.fromNode === neighborId && e.toNode === edge.fromNode)
    );
    
    return connectingEdge && connectingEdge.road === playerId;
  });
  
  const toHasRoad = toNode.neighborNodes.some(neighborId => {
    if (neighborId === edge.fromNode) return false; // Don't check the edge we're trying to place
    
    const connectingEdge = gameState.board.edges.find(e => 
      (e.fromNode === edge.toNode && e.toNode === neighborId) ||
      (e.fromNode === neighborId && e.toNode === edge.toNode)
    );
    
    return connectingEdge && connectingEdge.road === playerId;
  });
  
  return fromHasRoad || toHasRoad;
};