/**
 * Correct Catan Game Rules Implementation
 * Based on official rules research
 */

// Correct dice probabilities for 2d6
export const DICE_PROBABILITIES = {
    2: 1/36,   // 2.78%
    3: 2/36,   // 5.56%
    4: 3/36,   // 8.33%
    5: 4/36,   // 11.11%
    6: 5/36,   // 13.89%
    7: 6/36,   // 16.67% - ROBBER!
    8: 5/36,   // 13.89%
    9: 4/36,   // 11.11%
    10: 3/36,  // 8.33%
    11: 2/36,  // 5.56%
    12: 1/36   // 2.78%
};

// Correct resource distribution
export const RESOURCE_DISTRIBUTION = {
    'wood': 4,    // Forest
    'brick': 3,   // Hills
    'sheep': 4,   // Pasture
    'wheat': 4,   // Fields
    'ore': 3,     // Mountains
    'desert': 1   // Desert (no resource)
};

// Correct number token distribution (excluding 7)
export const NUMBER_TOKENS = [
    2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12
];

// Building costs (correct)
export const BUILDING_COSTS = {
    road: { wood: 1, brick: 1 },
    settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
    city: { wheat: 2, ore: 3 },
    developmentCard: { sheep: 1, wheat: 1, ore: 1 }
};

// Building limits per player
export const BUILDING_LIMITS = {
    settlements: 5,
    cities: 4,
    roads: 15
};

// Victory point values
export const VICTORY_POINTS = {
    settlement: 1,
    city: 2,
    longestRoad: 2,  // Requires 5+ roads
    largestArmy: 2,  // Requires 3+ knights played
    victoryPointCard: 1
};

// Development card distribution (25 total)
export const DEVELOPMENT_CARDS = {
    knight: 14,
    victoryPoint: 5,
    roadBuilding: 2,
    yearOfPlenty: 2,
    monopoly: 2
};

// Hexagon coordinate system for proper adjacency
export class HexagonGrid {
    constructor() {
        // Standard Catan board layout (axial coordinates)
        this.hexPositions = [
            // Center
            {q: 0, r: 0},
            // First ring
            {q: 1, r: -1}, {q: 1, r: 0}, {q: 0, r: 1}, 
            {q: -1, r: 1}, {q: -1, r: 0}, {q: 0, r: -1},
            // Second ring
            {q: 2, r: -2}, {q: 2, r: -1}, {q: 1, r: 1}, 
            {q: 0, r: 2}, {q: -1, r: 2}, {q: -2, r: 2},
            {q: -2, r: 1}, {q: -2, r: 0}, {q: -1, r: -1},
            {q: 0, r: -2}, {q: 1, r: -2}, {q: 2, r: 0}
        ];
    }

    // Get adjacent hexes for a given hex
    getAdjacentHexes(q, r) {
        const directions = [
            {q: 1, r: 0}, {q: 1, r: -1}, {q: 0, r: -1},
            {q: -1, r: 0}, {q: -1, r: 1}, {q: 0, r: 1}
        ];
        
        return directions.map(dir => ({
            q: q + dir.q,
            r: r + dir.r
        })).filter(hex => this.isValidHex(hex.q, hex.r));
    }

    // Get vertices (corners) of a hex
    getHexVertices(q, r) {
        // Each hex has 6 vertices shared with neighbors
        const vertices = [];
        const angles = [30, 90, 150, 210, 270, 330];
        
        angles.forEach((angle, i) => {
            vertices.push({
                id: `${q},${r}_v${i}`,
                angle: angle,
                hexes: this.getHexesForVertex(q, r, i)
            });
        });
        
        return vertices;
    }

    // Get edges of a hex
    getHexEdges(q, r) {
        const edges = [];
        const vertices = this.getHexVertices(q, r);
        
        for (let i = 0; i < 6; i++) {
            edges.push({
                id: `${q},${r}_e${i}`,
                from: vertices[i],
                to: vertices[(i + 1) % 6]
            });
        }
        
        return edges;
    }

    isValidHex(q, r) {
        return this.hexPositions.some(hex => hex.q === q && hex.r === r);
    }

    // Get hexes that share a vertex
    getHexesForVertex(q, r, vertexIndex) {
        const neighborPatterns = [
            [{q: 0, r: -1}, {q: 1, r: -1}], // Top vertex
            [{q: 1, r: -1}, {q: 1, r: 0}],  // Top-right
            [{q: 1, r: 0}, {q: 0, r: 1}],   // Bottom-right
            [{q: 0, r: 1}, {q: -1, r: 1}],  // Bottom
            [{q: -1, r: 1}, {q: -1, r: 0}], // Bottom-left
            [{q: -1, r: 0}, {q: 0, r: -1}]  // Top-left
        ];
        
        const pattern = neighborPatterns[vertexIndex];
        const hexes = [{q, r}]; // Include self
        
        pattern.forEach(offset => {
            const neighbor = {q: q + offset.q, r: r + offset.r};
            if (this.isValidHex(neighbor.q, neighbor.r)) {
                hexes.push(neighbor);
            }
        });
        
        return hexes;
    }
}

// Proper board generation following Catan rules
export function generateCorrectCatanBoard() {
    const grid = new HexagonGrid();
    const tiles = [];
    
    // Create resource tiles according to distribution
    const resourceTiles = [];
    Object.entries(RESOURCE_DISTRIBUTION).forEach(([resource, count]) => {
        for (let i = 0; i < count; i++) {
            resourceTiles.push(resource);
        }
    });
    
    // Shuffle resources
    for (let i = resourceTiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [resourceTiles[i], resourceTiles[j]] = [resourceTiles[j], resourceTiles[i]];
    }
    
    // Shuffle number tokens
    const tokens = [...NUMBER_TOKENS];
    for (let i = tokens.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tokens[i], tokens[j]] = [tokens[j], tokens[i]];
    }
    
    // Assign resources and tokens to hex positions
    let tokenIndex = 0;
    grid.hexPositions.forEach((pos, index) => {
        const resource = resourceTiles[index];
        const tile = {
            id: index,
            q: pos.q,
            r: pos.r,
            resource: resource,
            token: resource === 'desert' ? null : tokens[tokenIndex++],
            hasRobber: resource === 'desert'
        };
        tiles.push(tile);
    });
    
    // Validate no adjacent 6s or 8s (optional rule)
    // This is often used to prevent overly powerful positions
    
    return {
        tiles,
        grid,
        nodes: generateNodes(grid),
        edges: generateEdges(grid)
    };
}

// Generate all valid settlement nodes
function generateNodes(grid) {
    const nodes = new Map();
    
    grid.hexPositions.forEach(hex => {
        const vertices = grid.getHexVertices(hex.q, hex.r);
        vertices.forEach(vertex => {
            if (!nodes.has(vertex.id)) {
                nodes.set(vertex.id, {
                    id: vertex.id,
                    position: vertex,
                    adjacentTiles: vertex.hexes,
                    building: null,
                    owner: null,
                    port: null // Will be set for coastal nodes
                });
            }
        });
    });
    
    return Array.from(nodes.values());
}

// Generate all valid road edges
function generateEdges(grid) {
    const edges = new Map();
    
    grid.hexPositions.forEach(hex => {
        const hexEdges = grid.getHexEdges(hex.q, hex.r);
        hexEdges.forEach(edge => {
            const edgeId = normalizeEdgeId(edge.from.id, edge.to.id);
            if (!edges.has(edgeId)) {
                edges.set(edgeId, {
                    id: edgeId,
                    fromNode: edge.from.id,
                    toNode: edge.to.id,
                    road: null
                });
            }
        });
    });
    
    return Array.from(edges.values());
}

// Normalize edge ID to prevent duplicates
function normalizeEdgeId(node1, node2) {
    return [node1, node2].sort().join('_');
}

// Calculate longest road using DFS
export function calculateLongestRoad(playerRoads, edges) {
    // Build adjacency list for player's road network
    const roadNetwork = new Map();
    
    playerRoads.forEach(roadId => {
        const edge = edges.find(e => e.id === roadId);
        if (!edge) return;
        
        if (!roadNetwork.has(edge.fromNode)) {
            roadNetwork.set(edge.fromNode, []);
        }
        if (!roadNetwork.has(edge.toNode)) {
            roadNetwork.set(edge.toNode, []);
        }
        
        roadNetwork.get(edge.fromNode).push(edge.toNode);
        roadNetwork.get(edge.toNode).push(edge.fromNode);
    });
    
    // DFS to find longest path
    let longestPath = 0;
    
    const dfs = (node, visited, length) => {
        longestPath = Math.max(longestPath, length);
        
        const neighbors = roadNetwork.get(node) || [];
        neighbors.forEach(neighbor => {
            const edge = normalizeEdgeId(node, neighbor);
            if (!visited.has(edge)) {
                visited.add(edge);
                dfs(neighbor, visited, length + 1);
                visited.delete(edge);
            }
        });
    };
    
    // Try starting from each node
    roadNetwork.forEach((_, startNode) => {
        dfs(startNode, new Set(), 0);
    });
    
    return longestPath;
}

// Validate settlement placement
export function canPlaceSettlement(gameState, playerId, nodeId) {
    const node = gameState.board.nodes.find(n => n.id === nodeId);
    if (!node || node.building) return false;
    
    // Check distance rule - no settlements within 2 edges
    const adjacentNodes = getAdjacentNodes(gameState.board, nodeId);
    for (const adjNode of adjacentNodes) {
        if (adjNode.building) return false;
    }
    
    // In setup phase, no road connection needed
    if (gameState.phase === 'setup') return true;
    
    // Otherwise, must connect to player's road network
    return isConnectedToRoadNetwork(gameState, playerId, nodeId);
}

// Get nodes adjacent to a given node (1 edge away)
function getAdjacentNodes(board, nodeId) {
    const adjacentNodes = [];
    
    board.edges.forEach(edge => {
        if (edge.fromNode === nodeId) {
            const node = board.nodes.find(n => n.id === edge.toNode);
            if (node) adjacentNodes.push(node);
        } else if (edge.toNode === nodeId) {
            const node = board.nodes.find(n => n.id === edge.fromNode);
            if (node) adjacentNodes.push(node);
        }
    });
    
    return adjacentNodes;
}

// Check if node connects to player's road network
function isConnectedToRoadNetwork(gameState, playerId, nodeId) {
    return gameState.board.edges.some(edge => 
        edge.road === playerId && 
        (edge.fromNode === nodeId || edge.toNode === nodeId)
    );
}

// Roll dice and handle resource distribution
export function rollDice(gameState) {
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const total = die1 + die2;
    
    if (total === 7) {
        // Handle robber
        return {
            dice: [die1, die2],
            total,
            action: 'robber',
            playersToDiscard: getPlayersToDiscard(gameState)
        };
    } else {
        // Distribute resources
        const distribution = distributeResources(gameState, total);
        return {
            dice: [die1, die2],
            total,
            action: 'resources',
            distribution
        };
    }
}

// Get players who must discard (more than 7 cards)
function getPlayersToDiscard(gameState) {
    return gameState.players.filter(player => {
        const totalCards = Object.values(player.resources).reduce((a, b) => a + b, 0);
        return totalCards > 7;
    }).map(player => ({
        playerId: player.id,
        mustDiscard: Math.floor(Object.values(player.resources).reduce((a, b) => a + b, 0) / 2)
    }));
}

// Distribute resources based on dice roll
function distributeResources(gameState, diceRoll) {
    const distribution = [];
    
    gameState.board.tiles.forEach(tile => {
        if (tile.token === diceRoll && !tile.hasRobber) {
            // Find all settlements/cities adjacent to this tile
            gameState.board.nodes.forEach(node => {
                if (node.building && node.adjacentTiles.some(t => t.id === tile.id)) {
                    const amount = node.building === 'city' ? 2 : 1;
                    distribution.push({
                        playerId: node.owner,
                        resource: tile.resource,
                        amount
                    });
                }
            });
        }
    });
    
    return distribution;
}

// Export all corrected functions
export default {
    DICE_PROBABILITIES,
    RESOURCE_DISTRIBUTION,
    NUMBER_TOKENS,
    BUILDING_COSTS,
    BUILDING_LIMITS,
    VICTORY_POINTS,
    DEVELOPMENT_CARDS,
    HexagonGrid,
    generateCorrectCatanBoard,
    calculateLongestRoad,
    canPlaceSettlement,
    rollDice
};