/**
 * Advanced AI Engine for Catan Prediction System
 * Features: Multiple AI personalities, MCTS, Neural network-like evaluation, Advanced strategies
 */

// AI Strategy Types
export const AI_PERSONALITIES = {
    AGGRESSIVE: 'aggressive',
    BALANCED: 'balanced',
    DEFENSIVE: 'defensive',
    ADAPTIVE: 'adaptive'
};

// Advanced evaluation weights for different game aspects
const EVALUATION_WEIGHTS = {
    RESOURCE_PRODUCTION: 0.25,
    RESOURCE_DIVERSITY: 0.15,
    EXPANSION_POTENTIAL: 0.20,
    BLOCKING_OPPORTUNITIES: 0.10,
    DEVELOPMENT_CARDS: 0.10,
    LONGEST_ROAD_POTENTIAL: 0.08,
    LARGEST_ARMY_POTENTIAL: 0.07,
    PORT_ACCESS: 0.05
};

// Neural Network-like Position Evaluator
export class PositionEvaluator {
    constructor() {
        this.weights = this.initializeWeights();
        this.learningRate = 0.01;
    }

    initializeWeights() {
        return {
            // Resource production weights
            resourceProduction: {
                wood: 1.0, brick: 1.0, sheep: 0.9, wheat: 1.1, ore: 1.2
            },
            // Dice probability weights
            diceNumbers: {
                2: 0.1, 3: 0.2, 4: 0.3, 5: 0.4, 6: 0.5,
                8: 0.5, 9: 0.4, 10: 0.3, 11: 0.2, 12: 0.1
            },
            // Strategic position weights
            strategic: {
                cornerControl: 0.8,
                roadBlocking: 0.6,
                portAccess: 0.4,
                expansionPotential: 0.7,
                resourceDiversity: 0.5
            }
        };
    }

    evaluatePosition(gameState, playerId) {
        const player = gameState.players[playerId];
        let score = 0;

        // Resource production evaluation
        score += this.evaluateResourceProduction(gameState, playerId) * EVALUATION_WEIGHTS.RESOURCE_PRODUCTION;
        
        // Resource diversity evaluation
        score += this.evaluateResourceDiversity(player) * EVALUATION_WEIGHTS.RESOURCE_DIVERSITY;
        
        // Expansion potential
        score += this.evaluateExpansionPotential(gameState, playerId) * EVALUATION_WEIGHTS.EXPANSION_POTENTIAL;
        
        // Blocking opportunities
        score += this.evaluateBlockingOpportunities(gameState, playerId) * EVALUATION_WEIGHTS.BLOCKING_OPPORTUNITIES;
        
        // Development card potential
        score += this.evaluateDevelopmentCards(player) * EVALUATION_WEIGHTS.DEVELOPMENT_CARDS;
        
        // Longest road potential
        score += this.evaluateLongestRoadPotential(gameState, playerId) * EVALUATION_WEIGHTS.LONGEST_ROAD_POTENTIAL;
        
        // Largest army potential
        score += this.evaluateLargestArmyPotential(player) * EVALUATION_WEIGHTS.LARGEST_ARMY_POTENTIAL;
        
        // Port access
        score += this.evaluatePortAccess(gameState, playerId) * EVALUATION_WEIGHTS.PORT_ACCESS;

        return Math.max(0, Math.min(1, score));
    }

    evaluateResourceProduction(gameState, playerId) {
        const player = gameState.players[playerId];
        let totalProduction = 0;
        let weightedProduction = 0;

        // Calculate expected resource production
        player.settlements.forEach(settlementId => {
            const settlement = gameState.board.nodes[settlementId];
            if (settlement) {
                settlement.adjacentTiles.forEach(tileId => {
                    const tile = gameState.board.tiles[tileId];
                    if (tile && tile.resource !== 'desert' && tile.token) {
                        const diceProb = this.weights.diceNumbers[tile.token] || 0;
                        const resourceWeight = this.weights.resourceProduction[tile.resource] || 1;
                        const production = diceProb * resourceWeight;
                        
                        totalProduction += production;
                        weightedProduction += production * (settlement.isCity ? 2 : 1);
                    }
                });
            }
        });

        return Math.min(1, weightedProduction / 3); // Normalize to 0-1
    }

    evaluateResourceDiversity(player) {
        const resources = Object.values(player.resources);
        const nonZeroResources = resources.filter(r => r > 0).length;
        const totalResources = resources.reduce((a, b) => a + b, 0);
        
        if (totalResources === 0) return 0;
        
        // Calculate entropy-like measure for diversity
        let diversity = 0;
        resources.forEach(count => {
            if (count > 0) {
                const p = count / totalResources;
                diversity -= p * Math.log2(p);
            }
        });
        
        return Math.min(1, (diversity / Math.log2(5)) * (nonZeroResources / 5));
    }

    evaluateExpansionPotential(gameState, playerId) {
        const availableNodes = gameState.board.nodes.filter(node => 
            !node.building && this.canPlaceSettlement(gameState, playerId, node.id)
        );
        
        let expansionScore = 0;
        availableNodes.forEach(node => {
            let nodeValue = 0;
            node.adjacentTiles.forEach(tileId => {
                const tile = gameState.board.tiles[tileId];
                if (tile && tile.resource !== 'desert' && tile.token) {
                    const diceProb = this.weights.diceNumbers[tile.token] || 0;
                    const resourceWeight = this.weights.resourceProduction[tile.resource] || 1;
                    nodeValue += diceProb * resourceWeight;
                }
            });
            expansionScore += nodeValue;
        });
        
        return Math.min(1, expansionScore / 5);
    }

    evaluateBlockingOpportunities(gameState, playerId) {
        let blockingScore = 0;
        
        // Evaluate potential to block opponents
        gameState.players.forEach((opponent, opponentId) => {
            if (opponentId !== playerId) {
                // Check if we can block their expansion
                const opponentThreats = this.identifyOpponentThreats(gameState, opponentId);
                opponentThreats.forEach(threat => {
                    if (this.canBlockThreat(gameState, playerId, threat)) {
                        blockingScore += threat.severity;
                    }
                });
            }
        });
        
        return Math.min(1, blockingScore / 3);
    }

    evaluateDevelopmentCards(player) {
        const totalCards = Object.values(player.developmentCards).reduce((a, b) => a + b, 0);
        const knightCount = player.developmentCards.knight || 0;
        const vpCards = player.developmentCards.victoryPoint || 0;
        
        let score = totalCards * 0.1; // Base value for having cards
        score += knightCount * 0.15; // Knights are valuable for largest army
        score += vpCards * 0.2; // VP cards are direct points
        
        return Math.min(1, score);
    }

    evaluateLongestRoadPotential(gameState, playerId) {
        const player = gameState.players[playerId];
        const currentLength = this.calculateLongestRoad(gameState, playerId);
        const potentialLength = this.calculatePotentialRoadExtension(gameState, playerId);
        
        const roadScore = (currentLength + potentialLength * 0.5) / 15; // Max roads is 15
        return Math.min(1, roadScore);
    }

    evaluateLargestArmyPotential(player) {
        const knightCount = player.playedKnights || 0;
        const knightCards = player.developmentCards.knight || 0;
        const totalPotential = knightCount + knightCards;
        
        return Math.min(1, totalPotential / 5); // Need 3+ for largest army
    }

    evaluatePortAccess(gameState, playerId) {
        const player = gameState.players[playerId];
        let portScore = 0;
        
        player.settlements.forEach(settlementId => {
            const settlement = gameState.board.nodes[settlementId];
            if (settlement && settlement.port) {
                const port = settlement.port;
                if (port.type === 'generic') {
                    portScore += 0.3; // 3:1 port
                } else {
                    portScore += 0.5; // 2:1 specific resource port
                }
            }
        });
        
        return Math.min(1, portScore);
    }

    // Helper methods
    canPlaceSettlement(gameState, playerId, nodeId) {
        // Implement settlement placement rules
        const node = gameState.board.nodes[nodeId];
        if (!node || node.building) return false;
        
        // Check distance rule (2 edges away from other settlements)
        const adjacentNodes = this.getAdjacentNodes(gameState, nodeId);
        for (let adjNodeId of adjacentNodes) {
            const adjNode = gameState.board.nodes[adjNodeId];
            if (adjNode && adjNode.building) return false;
        }
        
        // Check if connected to player's road network
        return this.isConnectedToRoadNetwork(gameState, playerId, nodeId);
    }

    identifyOpponentThreats(gameState, opponentId) {
        const threats = [];
        const opponent = gameState.players[opponentId];
        
        // Identify high-value expansion opportunities for opponent
        const availableNodes = gameState.board.nodes.filter(node => 
            !node.building && this.canPlaceSettlement(gameState, opponentId, node.id)
        );
        
        availableNodes.forEach(node => {
            let threatLevel = 0;
            node.adjacentTiles.forEach(tileId => {
                const tile = gameState.board.tiles[tileId];
                if (tile && tile.resource !== 'desert' && tile.token) {
                    const diceProb = this.weights.diceNumbers[tile.token] || 0;
                    threatLevel += diceProb;
                }
            });
            
            if (threatLevel > 0.3) { // High-value position
                threats.push({
                    type: 'expansion',
                    nodeId: node.id,
                    severity: threatLevel,
                    playerId: opponentId
                });
            }
        });
        
        return threats;
    }

    canBlockThreat(gameState, playerId, threat) {
        // Check if we can place a settlement to block the threat
        return this.canPlaceSettlement(gameState, playerId, threat.nodeId);
    }

    calculateLongestRoad(gameState, playerId) {
        // Implement longest road calculation using DFS
        const player = gameState.players[playerId];
        const roadNetwork = this.buildRoadNetwork(gameState, playerId);
        
        let maxLength = 0;
        roadNetwork.forEach(startNode => {
            const length = this.dfsLongestPath(roadNetwork, startNode, new Set());
            maxLength = Math.max(maxLength, length);
        });
        
        return maxLength;
    }

    calculatePotentialRoadExtension(gameState, playerId) {
        // Calculate how many roads could potentially be built
        const player = gameState.players[playerId];
        const availableEdges = gameState.board.edges.filter(edge => 
            !edge.road && this.canPlaceRoad(gameState, playerId, edge.id)
        );
        
        return Math.min(availableEdges.length, player.roads);
    }

    // Additional helper methods would be implemented here...
    getAdjacentNodes(gameState, nodeId) { return []; }
    isConnectedToRoadNetwork(gameState, playerId, nodeId) { return true; }
    buildRoadNetwork(gameState, playerId) { return []; }
    dfsLongestPath(network, start, visited) { return 0; }
    canPlaceRoad(gameState, playerId, edgeId) { return true; }
}

// Monte Carlo Tree Search Implementation
export class MCTSNode {
    constructor(gameState, move = null, parent = null) {
        this.gameState = gameState;
        this.move = move;
        this.parent = parent;
        this.children = [];
        this.visits = 0;
        this.wins = 0;
        this.untriedMoves = this.getPossibleMoves();
    }

    getPossibleMoves() {
        // Generate all possible moves for current game state
        const moves = [];
        const currentPlayer = this.gameState.currentPlayer;
        
        // Building moves
        if (this.canAffordSettlement(currentPlayer)) {
            const availableNodes = this.getAvailableSettlementNodes();
            availableNodes.forEach(nodeId => {
                moves.push({ type: 'build_settlement', nodeId });
            });
        }
        
        if (this.canAffordCity(currentPlayer)) {
            const upgradeableSettlements = this.getUpgradeableSettlements(currentPlayer);
            upgradeableSettlements.forEach(nodeId => {
                moves.push({ type: 'build_city', nodeId });
            });
        }
        
        if (this.canAffordRoad(currentPlayer)) {
            const availableEdges = this.getAvailableRoadEdges(currentPlayer);
            availableEdges.forEach(edgeId => {
                moves.push({ type: 'build_road', edgeId });
            });
        }
        
        // Development card moves
        if (this.canAffordDevelopmentCard(currentPlayer)) {
            moves.push({ type: 'buy_development_card' });
        }
        
        // Trading moves
        const tradingMoves = this.generateTradingMoves(currentPlayer);
        moves.push(...tradingMoves);
        
        // End turn move
        moves.push({ type: 'end_turn' });
        
        return moves;
    }

    isFullyExpanded() {
        return this.untriedMoves.length === 0;
    }

    isTerminal() {
        return this.gameState.winner !== null || this.gameState.turn > 200; // Max turns limit
    }

    expand() {
        if (this.untriedMoves.length === 0) return null;
        
        const move = this.untriedMoves.pop();
        const newGameState = this.applyMove(this.gameState, move);
        const childNode = new MCTSNode(newGameState, move, this);
        this.children.push(childNode);
        
        return childNode;
    }

    simulate() {
        let currentState = { ...this.gameState };
        const evaluator = new PositionEvaluator();
        
        // Run simulation until game end or max turns
        while (!this.isGameOver(currentState) && currentState.turn < 200) {
            const possibleMoves = this.getPossibleMovesForState(currentState);
            if (possibleMoves.length === 0) break;
            
            // Use evaluation-guided random selection
            const move = this.selectMoveWithEvaluation(currentState, possibleMoves, evaluator);
            currentState = this.applyMove(currentState, move);
        }
        
        return this.evaluateGameResult(currentState);
    }

    selectMoveWithEvaluation(gameState, moves, evaluator) {
        // Weight moves by their evaluation scores
        const moveScores = moves.map(move => {
            const tempState = this.applyMove(gameState, move);
            const score = evaluator.evaluatePosition(tempState, gameState.currentPlayer);
            return { move, score };
        });
        
        // Softmax selection with temperature
        const temperature = 0.5;
        const expScores = moveScores.map(ms => Math.exp(ms.score / temperature));
        const sumExp = expScores.reduce((a, b) => a + b, 0);
        
        const rand = Math.random() * sumExp;
        let cumulative = 0;
        
        for (let i = 0; i < moveScores.length; i++) {
            cumulative += expScores[i];
            if (rand <= cumulative) {
                return moveScores[i].move;
            }
        }
        
        return moveScores[0].move; // Fallback
    }

    backpropagate(result) {
        this.visits++;
        this.wins += result;
        
        if (this.parent) {
            this.parent.backpropagate(result);
        }
    }

    ucb1Score(explorationConstant = Math.sqrt(2)) {
        if (this.visits === 0) return Infinity;
        
        const exploitation = this.wins / this.visits;
        const exploration = explorationConstant * Math.sqrt(Math.log(this.parent.visits) / this.visits);
        
        return exploitation + exploration;
    }

    selectBestChild() {
        return this.children.reduce((best, child) => 
            child.ucb1Score() > best.ucb1Score() ? child : best
        );
    }

    // Helper methods for move generation and game state manipulation
    canAffordSettlement(player) {
        return player.resources.wood >= 1 && player.resources.brick >= 1 && 
               player.resources.sheep >= 1 && player.resources.wheat >= 1;
    }

    canAffordCity(player) {
        return player.resources.wheat >= 2 && player.resources.ore >= 3;
    }

    canAffordRoad(player) {
        return player.resources.wood >= 1 && player.resources.brick >= 1;
    }

    canAffordDevelopmentCard(player) {
        return player.resources.sheep >= 1 && player.resources.wheat >= 1 && 
               player.resources.ore >= 1;
    }

    getAvailableSettlementNodes() { return []; }
    getUpgradeableSettlements(player) { return []; }
    getAvailableRoadEdges(player) { return []; }
    generateTradingMoves(player) { return []; }
    applyMove(gameState, move) { return gameState; }
    isGameOver(gameState) { return false; }
    getPossibleMovesForState(gameState) { return []; }
    evaluateGameResult(gameState) { return 0; }
}

// Advanced AI Strategy Engine
export class AdvancedAIEngine {
    constructor(personality = AI_PERSONALITIES.BALANCED) {
        this.personality = personality;
        this.evaluator = new PositionEvaluator();
        this.mctsIterations = 1000;
        this.strategyWeights = this.getStrategyWeights(personality);
    }

    getStrategyWeights(personality) {
        const weights = {
            [AI_PERSONALITIES.AGGRESSIVE]: {
                expansion: 0.4,
                blocking: 0.3,
                development: 0.2,
                trading: 0.1
            },
            [AI_PERSONALITIES.BALANCED]: {
                expansion: 0.3,
                blocking: 0.2,
                development: 0.3,
                trading: 0.2
            },
            [AI_PERSONALITIES.DEFENSIVE]: {
                expansion: 0.2,
                blocking: 0.4,
                development: 0.2,
                trading: 0.2
            },
            [AI_PERSONALITIES.ADAPTIVE]: {
                expansion: 0.25,
                blocking: 0.25,
                development: 0.25,
                trading: 0.25
            }
        };
        
        return weights[personality] || weights[AI_PERSONALITIES.BALANCED];
    }

    selectBestMove(gameState, playerId) {
        // Use MCTS to find the best move
        const rootNode = new MCTSNode(gameState);
        
        for (let i = 0; i < this.mctsIterations; i++) {
            let node = rootNode;
            
            // Selection phase
            while (!node.isTerminal() && node.isFullyExpanded()) {
                node = node.selectBestChild();
            }
            
            // Expansion phase
            if (!node.isTerminal()) {
                const expandedNode = node.expand();
                if (expandedNode) {
                    node = expandedNode;
                }
            }
            
            // Simulation phase
            const result = node.simulate();
            
            // Backpropagation phase
            node.backpropagate(result);
        }
        
        // Select move with highest visit count (most promising)
        const bestChild = rootNode.children.reduce((best, child) => 
            child.visits > best.visits ? child : best
        );
        
        return bestChild ? bestChild.move : { type: 'end_turn' };
    }

    evaluateTradeOpportunity(gameState, playerId, tradeOffer) {
        const player = gameState.players[playerId];
        const currentScore = this.evaluator.evaluatePosition(gameState, playerId);
        
        // Simulate the trade
        const tempGameState = this.simulateTrade(gameState, playerId, tradeOffer);
        const newScore = this.evaluator.evaluatePosition(tempGameState, playerId);
        
        return newScore - currentScore;
    }

    planOptimalBuildingSequence(gameState, playerId) {
        const player = gameState.players[playerId];
        const sequence = [];
        
        // Use dynamic programming to find optimal building sequence
        const availableResources = { ...player.resources };
        const buildingOptions = this.generateBuildingOptions(gameState, playerId);
        
        // Sort by value/cost ratio
        buildingOptions.sort((a, b) => b.valueRatio - a.valueRatio);
        
        for (const option of buildingOptions) {
            if (this.canAffordBuilding(availableResources, option.cost)) {
                sequence.push(option);
                this.subtractResources(availableResources, option.cost);
            }
        }
        
        return sequence;
    }

    adaptStrategy(gameState, playerId, gameHistory) {
        if (this.personality !== AI_PERSONALITIES.ADAPTIVE) return;
        
        // Analyze game history to adapt strategy
        const performanceMetrics = this.analyzePerformance(gameHistory, playerId);
        
        // Adjust strategy weights based on what's working
        if (performanceMetrics.expansionSuccess > 0.7) {
            this.strategyWeights.expansion += 0.05;
        }
        
        if (performanceMetrics.blockingEffectiveness > 0.6) {
            this.strategyWeights.blocking += 0.05;
        }
        
        // Normalize weights
        const totalWeight = Object.values(this.strategyWeights).reduce((a, b) => a + b, 0);
        Object.keys(this.strategyWeights).forEach(key => {
            this.strategyWeights[key] /= totalWeight;
        });
    }

    // Advanced helper methods
    simulateTrade(gameState, playerId, tradeOffer) {
        // Create a copy of game state with trade applied
        const newGameState = JSON.parse(JSON.stringify(gameState));
        const player = newGameState.players[playerId];
        
        // Apply trade
        Object.keys(tradeOffer.give).forEach(resource => {
            player.resources[resource] -= tradeOffer.give[resource];
        });
        
        Object.keys(tradeOffer.receive).forEach(resource => {
            player.resources[resource] += tradeOffer.receive[resource];
        });
        
        return newGameState;
    }

    generateBuildingOptions(gameState, playerId) {
        const options = [];
        
        // Settlement options
        const settlementNodes = this.getAvailableSettlementNodes(gameState, playerId);
        settlementNodes.forEach(nodeId => {
            const value = this.evaluateSettlementValue(gameState, nodeId);
            options.push({
                type: 'settlement',
                nodeId,
                cost: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
                value,
                valueRatio: value / 4 // Total cost is 4 resources
            });
        });
        
        // City options
        const cityNodes = this.getUpgradeableSettlements(gameState, playerId);
        cityNodes.forEach(nodeId => {
            const value = this.evaluateCityValue(gameState, nodeId);
            options.push({
                type: 'city',
                nodeId,
                cost: { wheat: 2, ore: 3 },
                value,
                valueRatio: value / 5 // Total cost is 5 resources
            });
        });
        
        // Road options
        const roadEdges = this.getAvailableRoadEdges(gameState, playerId);
        roadEdges.forEach(edgeId => {
            const value = this.evaluateRoadValue(gameState, playerId, edgeId);
            options.push({
                type: 'road',
                edgeId,
                cost: { wood: 1, brick: 1 },
                value,
                valueRatio: value / 2 // Total cost is 2 resources
            });
        });
        
        return options;
    }

    evaluateSettlementValue(gameState, nodeId) {
        const node = gameState.board.nodes[nodeId];
        let value = 0;
        
        // Production value
        node.adjacentTiles.forEach(tileId => {
            const tile = gameState.board.tiles[tileId];
            if (tile && tile.resource !== 'desert' && tile.token) {
                const diceProb = this.evaluator.weights.diceNumbers[tile.token] || 0;
                const resourceWeight = this.evaluator.weights.resourceProduction[tile.resource] || 1;
                value += diceProb * resourceWeight;
            }
        });
        
        // Port access bonus
        if (node.port) {
            value += node.port.type === 'generic' ? 0.3 : 0.5;
        }
        
        // Strategic position bonus
        value += this.evaluateStrategicPosition(gameState, nodeId);
        
        return value;
    }

    evaluateCityValue(gameState, nodeId) {
        // City doubles production, so base value is 2x settlement value
        return this.evaluateSettlementValue(gameState, nodeId) * 2;
    }

    evaluateRoadValue(gameState, playerId, edgeId) {
        let value = 0;
        
        // Connection value - enables new settlement locations
        const newSettlementOptions = this.getNewSettlementOptionsFromRoad(gameState, playerId, edgeId);
        newSettlementOptions.forEach(nodeId => {
            value += this.evaluateSettlementValue(gameState, nodeId) * 0.3; // Potential value
        });
        
        // Longest road contribution
        const roadContribution = this.calculateRoadContributionToLongestRoad(gameState, playerId, edgeId);
        value += roadContribution * 0.2;
        
        // Blocking value
        const blockingValue = this.calculateRoadBlockingValue(gameState, playerId, edgeId);
        value += blockingValue * 0.1;
        
        return value;
    }

    evaluateStrategicPosition(gameState, nodeId) {
        let strategicValue = 0;
        
        // Corner control - positions that control multiple high-value intersections
        const controlledIntersections = this.getControlledIntersections(gameState, nodeId);
        strategicValue += controlledIntersections.length * 0.1;
        
        // Chokepoint control - positions that can block opponent expansion
        if (this.isChokepoint(gameState, nodeId)) {
            strategicValue += 0.3;
        }
        
        return strategicValue;
    }

    analyzePerformance(gameHistory, playerId) {
        // Analyze historical performance to adapt strategy
        let expansionSuccess = 0;
        let blockingEffectiveness = 0;
        let tradingSuccess = 0;
        
        // Calculate metrics from game history
        gameHistory.forEach(game => {
            const playerData = game.players[playerId];
            if (playerData) {
                expansionSuccess += playerData.settlementsBuilt / 5; // Normalize by max settlements
                blockingEffectiveness += playerData.opponentsBlocked / game.totalPlayers;
                tradingSuccess += playerData.successfulTrades / (playerData.tradeAttempts || 1);
            }
        });
        
        const gameCount = gameHistory.length;
        return {
            expansionSuccess: expansionSuccess / gameCount,
            blockingEffectiveness: blockingEffectiveness / gameCount,
            tradingSuccess: tradingSuccess / gameCount
        };
    }

    // Additional helper methods would be implemented here...
    canAffordBuilding(resources, cost) { return true; }
    subtractResources(resources, cost) { }
    getAvailableSettlementNodes(gameState, playerId) { return []; }
    getUpgradeableSettlements(gameState, playerId) { return []; }
    getAvailableRoadEdges(gameState, playerId) { return []; }
    getNewSettlementOptionsFromRoad(gameState, playerId, edgeId) { return []; }
    calculateRoadContributionToLongestRoad(gameState, playerId, edgeId) { return 0; }
    calculateRoadBlockingValue(gameState, playerId, edgeId) { return 0; }
    getControlledIntersections(gameState, nodeId) { return []; }
    isChokepoint(gameState, nodeId) { return false; }
}

// Export factory function
export function createAdvancedAI(personality = AI_PERSONALITIES.BALANCED) {
    return new AdvancedAIEngine(personality);
}