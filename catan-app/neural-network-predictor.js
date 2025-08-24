/**
 * Neural Network-like Predictor for Advanced Catan AI
 * Implements mathematical functions that simulate neural network behavior
 * for position evaluation, move prediction, and strategic analysis
 */

// Activation functions
const ActivationFunctions = {
    sigmoid: (x) => 1 / (1 + Math.exp(-x)),
    tanh: (x) => Math.tanh(x),
    relu: (x) => Math.max(0, x),
    leakyRelu: (x, alpha = 0.01) => x > 0 ? x : alpha * x,
    softmax: (arr) => {
        const maxVal = Math.max(...arr);
        const exp = arr.map(x => Math.exp(x - maxVal));
        const sum = exp.reduce((a, b) => a + b, 0);
        return exp.map(x => x / sum);
    }
};

// Neural Network Layer
class NeuralLayer {
    constructor(inputSize, outputSize, activationFunction = 'relu') {
        this.inputSize = inputSize;
        this.outputSize = outputSize;
        this.activation = ActivationFunctions[activationFunction];
        
        // Initialize weights and biases with Xavier initialization
        this.weights = this.initializeWeights(inputSize, outputSize);
        this.biases = new Array(outputSize).fill(0).map(() => Math.random() * 0.1 - 0.05);
        
        // For learning
        this.learningRate = 0.001;
        this.momentum = 0.9;
        this.weightVelocity = this.weights.map(row => row.map(() => 0));
        this.biasVelocity = new Array(outputSize).fill(0);
    }

    initializeWeights(inputSize, outputSize) {
        const limit = Math.sqrt(6 / (inputSize + outputSize));
        return Array(outputSize).fill(null).map(() =>
            Array(inputSize).fill(null).map(() =>
                Math.random() * 2 * limit - limit
            )
        );
    }

    forward(inputs) {
        const outputs = [];
        for (let i = 0; i < this.outputSize; i++) {
            let sum = this.biases[i];
            for (let j = 0; j < this.inputSize; j++) {
                sum += inputs[j] * this.weights[i][j];
            }
            outputs.push(this.activation(sum));
        }
        return outputs;
    }

    updateWeights(inputs, gradients) {
        for (let i = 0; i < this.outputSize; i++) {
            // Update biases with momentum
            this.biasVelocity[i] = this.momentum * this.biasVelocity[i] + 
                                   this.learningRate * gradients[i];
            this.biases[i] -= this.biasVelocity[i];
            
            // Update weights with momentum
            for (let j = 0; j < this.inputSize; j++) {
                const gradient = gradients[i] * inputs[j];
                this.weightVelocity[i][j] = this.momentum * this.weightVelocity[i][j] + 
                                           this.learningRate * gradient;
                this.weights[i][j] -= this.weightVelocity[i][j];
            }
        }
    }
}

// Advanced Position Evaluator Neural Network
export class NeuralPositionEvaluator {
    constructor() {
        // Network architecture: Input -> Hidden1 -> Hidden2 -> Output
        this.inputSize = 50; // Feature vector size
        this.hiddenSize1 = 64;
        this.hiddenSize2 = 32;
        this.outputSize = 1; // Position score
        
        // Create layers
        this.layer1 = new NeuralLayer(this.inputSize, this.hiddenSize1, 'relu');
        this.layer2 = new NeuralLayer(this.hiddenSize1, this.hiddenSize2, 'relu');
        this.outputLayer = new NeuralLayer(this.hiddenSize2, this.outputSize, 'sigmoid');
        
        // Feature extractors
        this.featureExtractor = new GameStateFeatureExtractor();
        this.trainingData = [];
        this.evaluationHistory = [];
    }

    evaluatePosition(gameState, playerId) {
        // Extract features from game state
        const features = this.featureExtractor.extractFeatures(gameState, playerId);
        
        // Forward pass through network
        const hidden1 = this.layer1.forward(features);
        const hidden2 = this.layer2.forward(hidden1);
        const output = this.outputLayer.forward(hidden2);
        
        // Store for potential learning
        this.evaluationHistory.push({
            features,
            gameState: JSON.parse(JSON.stringify(gameState)),
            playerId,
            evaluation: output[0],
            timestamp: Date.now()
        });
        
        return output[0];
    }

    trainFromGameResult(gameResult) {
        // Use game outcome to train the network
        const winner = gameResult.winnerId;
        
        // Create training examples from evaluation history
        this.evaluationHistory.forEach((evaluation, index) => {
            const target = evaluation.playerId === winner ? 1.0 : 0.0;
            const features = evaluation.features;
            
            // Perform backpropagation
            this.backpropagate(features, target);
        });
        
        // Clear history for next game
        this.evaluationHistory = [];
    }

    backpropagate(features, target) {
        // Forward pass to get current prediction
        const hidden1 = this.layer1.forward(features);
        const hidden2 = this.layer2.forward(hidden1);
        const output = this.outputLayer.forward(hidden2);
        
        // Calculate loss (mean squared error)
        const loss = Math.pow(target - output[0], 2);
        
        // Backward pass (simplified gradient calculation)
        const outputGradient = 2 * (output[0] - target);
        const hidden2Gradient = this.calculateLayerGradient(this.outputLayer, [outputGradient], hidden2);
        const hidden1Gradient = this.calculateLayerGradient(this.layer2, hidden2Gradient, hidden1);
        
        // Update weights
        this.outputLayer.updateWeights(hidden2, [outputGradient]);
        this.layer2.updateWeights(hidden1, hidden2Gradient);
        this.layer1.updateWeights(features, hidden1Gradient);
    }

    calculateLayerGradient(layer, nextGradient, layerOutput) {
        const gradient = new Array(layer.inputSize).fill(0);
        
        for (let i = 0; i < layer.outputSize; i++) {
            for (let j = 0; j < layer.inputSize; j++) {
                // Simplified gradient calculation (derivative of ReLU)
                const derivative = layerOutput[j] > 0 ? 1 : 0;
                gradient[j] += nextGradient[i] * layer.weights[i][j] * derivative;
            }
        }
        
        return gradient;
    }

    adaptToOpponent(opponentMoves, gameOutcome) {
        // Analyze opponent patterns and adapt evaluation
        const opponentPatterns = this.analyzeOpponentPatterns(opponentMoves);
        
        // Adjust evaluation weights based on what worked against this opponent
        this.adjustEvaluationWeights(opponentPatterns, gameOutcome);
    }

    analyzeOpponentPatterns(moves) {
        const patterns = {
            aggressiveness: 0,
            defensiveness: 0,
            tradingFrequency: 0,
            expansionRate: 0,
            blockingTendency: 0
        };
        
        moves.forEach(move => {
            switch (move.type) {
                case 'build_settlement':
                    patterns.expansionRate += 1;
                    break;
                case 'build_road':
                    if (move.isBlocking) patterns.blockingTendency += 1;
                    else patterns.expansionRate += 0.5;
                    break;
                case 'trade':
                    patterns.tradingFrequency += 1;
                    break;
                case 'play_knight':
                    patterns.aggressiveness += 1;
                    break;
            }
        });
        
        // Normalize patterns
        const totalMoves = moves.length;
        Object.keys(patterns).forEach(key => {
            patterns[key] /= Math.max(1, totalMoves);
        });
        
        return patterns;
    }

    adjustEvaluationWeights(patterns, gameOutcome) {
        // If we won, reinforce current strategy
        // If we lost, adjust based on opponent patterns
        const adjustment = gameOutcome === 'win' ? 0.05 : -0.05;
        
        if (patterns.aggressiveness > 0.3) {
            // Opponent is aggressive, increase defensive evaluation
            this.featureExtractor.adjustWeight('defensive_positions', adjustment);
        }
        
        if (patterns.blockingTendency > 0.2) {
            // Opponent blocks a lot, value expansion more
            this.featureExtractor.adjustWeight('expansion_potential', adjustment);
        }
    }
}

// Feature Extractor for Game State
class GameStateFeatureExtractor {
    constructor() {
        this.featureWeights = {
            resource_production: 1.0,
            resource_diversity: 0.8,
            expansion_potential: 0.9,
            blocking_opportunities: 0.7,
            development_cards: 0.6,
            longest_road: 0.5,
            largest_army: 0.5,
            port_access: 0.4,
            defensive_positions: 0.6,
            victory_points: 1.2,
            opponent_threats: 0.8
        };
    }

    extractFeatures(gameState, playerId) {
        const features = new Array(50).fill(0);
        const player = gameState.players[playerId];
        let featureIndex = 0;

        // Resource features (5 features)
        const resources = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
        resources.forEach(resource => {
            features[featureIndex++] = (player.resources[resource] || 0) / 10; // Normalize
        });

        // Production features (5 features)
        const productionRates = this.calculateProductionRates(gameState, playerId);
        resources.forEach(resource => {
            features[featureIndex++] = productionRates[resource] || 0;
        });

        // Building features (3 features)
        features[featureIndex++] = player.settlements.length / 5; // Max 5 settlements
        features[featureIndex++] = player.cities.length / 4; // Max 4 cities
        features[featureIndex++] = player.roads.length / 15; // Max 15 roads

        // Development card features (5 features)
        const devCards = ['knight', 'roadBuilding', 'monopoly', 'yearOfPlenty', 'victoryPoint'];
        devCards.forEach(card => {
            features[featureIndex++] = (player.developmentCards[card] || 0) / 5; // Normalize
        });

        // Victory point features (1 feature)
        features[featureIndex++] = player.victoryPoints / 10; // Normalize

        // Board position features (10 features)
        const positionFeatures = this.extractPositionFeatures(gameState, playerId);
        positionFeatures.forEach(feature => {
            features[featureIndex++] = feature;
        });

        // Opponent analysis features (15 features)
        const opponentFeatures = this.extractOpponentFeatures(gameState, playerId);
        opponentFeatures.forEach(feature => {
            features[featureIndex++] = feature;
        });

        // Strategic features (6 features)
        const strategicFeatures = this.extractStrategicFeatures(gameState, playerId);
        strategicFeatures.forEach(feature => {
            features[featureIndex++] = feature;
        });

        return features;
    }

    calculateProductionRates(gameState, playerId) {
        const player = gameState.players[playerId];
        const rates = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
        
        const diceProbs = {
            2: 1/36, 3: 2/36, 4: 3/36, 5: 4/36, 6: 5/36,
            8: 5/36, 9: 4/36, 10: 3/36, 11: 2/36, 12: 1/36
        };

        player.settlements.forEach(settlementId => {
            const settlement = gameState.board.nodes[settlementId];
            if (settlement) {
                settlement.adjacentTiles.forEach(tileId => {
                    const tile = gameState.board.tiles[tileId];
                    if (tile && tile.resource !== 'desert' && tile.token) {
                        const prob = diceProbs[tile.token] || 0;
                        const multiplier = settlement.isCity ? 2 : 1;
                        rates[tile.resource] += prob * multiplier;
                    }
                });
            }
        });

        return rates;
    }

    extractPositionFeatures(gameState, playerId) {
        const features = [];
        const player = gameState.players[playerId];

        // Port access
        let portAccess = 0;
        player.settlements.forEach(settlementId => {
            const settlement = gameState.board.nodes[settlementId];
            if (settlement && settlement.port) {
                portAccess += settlement.port.type === 'generic' ? 0.3 : 0.5;
            }
        });
        features.push(Math.min(1, portAccess));

        // Expansion potential
        const availableNodes = gameState.board.nodes.filter(node => 
            !node.building && this.canPlaceSettlement(gameState, playerId, node.id)
        );
        features.push(Math.min(1, availableNodes.length / 10));

        // Longest road potential
        const roadLength = this.calculateLongestRoad(gameState, playerId);
        features.push(roadLength / 15);

        // Resource diversity (entropy)
        const resourceCounts = Object.values(player.resources);
        const total = resourceCounts.reduce((a, b) => a + b, 0);
        let entropy = 0;
        if (total > 0) {
            resourceCounts.forEach(count => {
                if (count > 0) {
                    const p = count / total;
                    entropy -= p * Math.log2(p);
                }
            });
        }
        features.push(entropy / Math.log2(5)); // Normalize by max entropy

        // Blocking potential
        const blockingScore = this.calculateBlockingPotential(gameState, playerId);
        features.push(blockingScore);

        // Corner control
        const cornerControl = this.calculateCornerControl(gameState, playerId);
        features.push(cornerControl);

        // Robber impact
        const robberImpact = this.calculateRobberImpact(gameState, playerId);
        features.push(robberImpact);

        // Trade efficiency
        const tradeEfficiency = this.calculateTradeEfficiency(gameState, playerId);
        features.push(tradeEfficiency);

        // Development card potential
        const devCardPotential = this.calculateDevCardPotential(player);
        features.push(devCardPotential);

        // Largest army potential
        const armyPotential = (player.playedKnights || 0) / 5;
        features.push(armyPotential);

        return features;
    }

    extractOpponentFeatures(gameState, playerId) {
        const features = [];
        const opponents = gameState.players.filter((_, id) => id !== playerId);

        opponents.forEach((opponent, index) => {
            if (index < 3) { // Max 3 opponents
                // Opponent victory points
                features.push(opponent.victoryPoints / 10);
                
                // Opponent resource count
                const opponentResources = Object.values(opponent.resources).reduce((a, b) => a + b, 0);
                features.push(opponentResources / 20);
                
                // Opponent development cards
                const opponentDevCards = Object.values(opponent.developmentCards).reduce((a, b) => a + b, 0);
                features.push(opponentDevCards / 10);
                
                // Threat level from this opponent
                const threatLevel = this.calculateThreatLevel(gameState, playerId, index);
                features.push(threatLevel);
                
                // Blocking opportunities against this opponent
                const blockingOpp = this.calculateBlockingOpportunities(gameState, playerId, index);
                features.push(blockingOpp);
            }
        });

        // Pad with zeros if fewer than 3 opponents
        while (features.length < 15) {
            features.push(0);
        }

        return features;
    }

    extractStrategicFeatures(gameState, playerId) {
        const features = [];

        // Game phase (early, mid, late)
        const gamePhase = this.determineGamePhase(gameState);
        features.push(gamePhase.early, gamePhase.mid, gamePhase.late);

        // Resource scarcity
        const scarcity = this.calculateResourceScarcity(gameState);
        features.push(scarcity);

        // Competitive pressure
        const pressure = this.calculateCompetitivePressure(gameState, playerId);
        features.push(pressure);

        // Win probability (based on current position)
        const winProb = this.estimateWinProbability(gameState, playerId);
        features.push(winProb);

        return features;
    }

    // Helper methods for feature extraction
    canPlaceSettlement(gameState, playerId, nodeId) {
        // Simplified settlement placement check
        const node = gameState.board.nodes[nodeId];
        return node && !node.building;
    }

    calculateLongestRoad(gameState, playerId) {
        // Simplified longest road calculation
        const player = gameState.players[playerId];
        return player.roads.length; // Simplified
    }

    calculateBlockingPotential(gameState, playerId) {
        // Calculate how well positioned the player is to block opponents
        return Math.random() * 0.5; // Placeholder
    }

    calculateCornerControl(gameState, playerId) {
        // Calculate control over key board positions
        return Math.random() * 0.3; // Placeholder
    }

    calculateRobberImpact(gameState, playerId) {
        // Calculate how much the robber affects this player
        return Math.random() * 0.2; // Placeholder
    }

    calculateTradeEfficiency(gameState, playerId) {
        // Calculate how efficiently the player can trade
        const player = gameState.players[playerId];
        let efficiency = 0.25; // Base 4:1 trading
        
        player.settlements.forEach(settlementId => {
            const settlement = gameState.board.nodes[settlementId];
            if (settlement && settlement.port) {
                efficiency += settlement.port.type === 'generic' ? 0.08 : 0.17; // 3:1 or 2:1
            }
        });
        
        return Math.min(1, efficiency);
    }

    calculateDevCardPotential(player) {
        const totalCards = Object.values(player.developmentCards).reduce((a, b) => a + b, 0);
        return Math.min(1, totalCards / 10);
    }

    calculateThreatLevel(gameState, playerId, opponentId) {
        const opponent = gameState.players[opponentId];
        let threat = 0;
        
        // VP threat
        threat += opponent.victoryPoints / 10;
        
        // Resource threat
        const opponentResources = Object.values(opponent.resources).reduce((a, b) => a + b, 0);
        threat += opponentResources / 20;
        
        return Math.min(1, threat);
    }

    calculateBlockingOpportunities(gameState, playerId, opponentId) {
        // Calculate opportunities to block specific opponent
        return Math.random() * 0.4; // Placeholder
    }

    determineGamePhase(gameState) {
        const totalBuildings = gameState.players.reduce((total, player) => 
            total + player.settlements.length + player.cities.length, 0
        );
        
        if (totalBuildings < 12) return { early: 1, mid: 0, late: 0 };
        if (totalBuildings < 24) return { early: 0, mid: 1, late: 0 };
        return { early: 0, mid: 0, late: 1 };
    }

    calculateResourceScarcity(gameState) {
        // Calculate overall resource scarcity in the game
        const totalResources = gameState.players.reduce((total, player) => 
            total + Object.values(player.resources).reduce((a, b) => a + b, 0), 0
        );
        
        return Math.max(0, 1 - totalResources / 100); // Normalize
    }

    calculateCompetitivePressure(gameState, playerId) {
        const player = gameState.players[playerId];
        const maxOpponentVP = Math.max(...gameState.players
            .filter((_, id) => id !== playerId)
            .map(p => p.victoryPoints)
        );
        
        return Math.max(0, (maxOpponentVP - player.victoryPoints) / 10);
    }

    estimateWinProbability(gameState, playerId) {
        const player = gameState.players[playerId];
        const totalVP = gameState.players.reduce((sum, p) => sum + p.victoryPoints, 0);
        
        if (totalVP === 0) return 0.25; // Equal probability at start
        
        return player.victoryPoints / totalVP;
    }

    adjustWeight(featureName, adjustment) {
        if (this.featureWeights[featureName] !== undefined) {
            this.featureWeights[featureName] += adjustment;
            this.featureWeights[featureName] = Math.max(0.1, Math.min(2.0, this.featureWeights[featureName]));
        }
    }
}

// Move Predictor Neural Network
export class MovePredictorNetwork {
    constructor() {
        this.inputSize = 60; // Game state + move features
        this.hiddenSize = 128;
        this.outputSize = 20; // Different move types
        
        this.layer1 = new NeuralLayer(this.inputSize, this.hiddenSize, 'relu');
        this.layer2 = new NeuralLayer(this.hiddenSize, this.hiddenSize, 'relu');
        this.outputLayer = new NeuralLayer(this.hiddenSize, this.outputSize, 'sigmoid');
        
        this.moveTypes = [
            'build_settlement', 'build_city', 'build_road', 'buy_dev_card',
            'play_knight', 'play_road_building', 'play_monopoly', 'play_year_of_plenty',
            'trade_bank_wood', 'trade_bank_brick', 'trade_bank_sheep', 'trade_bank_wheat', 'trade_bank_ore',
            'trade_port', 'trade_player', 'move_robber', 'discard_cards', 'end_turn',
            'aggressive_move', 'defensive_move'
        ];
    }

    predictBestMoves(gameState, playerId, possibleMoves) {
        const features = this.extractMoveFeatures(gameState, playerId, possibleMoves);
        
        // Forward pass
        const hidden1 = this.layer1.forward(features);
        const hidden2 = this.layer2.forward(hidden1);
        const output = this.outputLayer.forward(hidden2);
        
        // Apply softmax to get probabilities
        const probabilities = ActivationFunctions.softmax(output);
        
        // Map probabilities to moves
        const moveScores = possibleMoves.map(move => {
            const moveTypeIndex = this.moveTypes.indexOf(move.type);
            const score = moveTypeIndex >= 0 ? probabilities[moveTypeIndex] : 0;
            return { move, score };
        });
        
        // Sort by score and return top moves
        return moveScores.sort((a, b) => b.score - a.score);
    }

    extractMoveFeatures(gameState, playerId, possibleMoves) {
        const features = new Array(this.inputSize).fill(0);
        let index = 0;
        
        // Game state features (first 50)
        const featureExtractor = new GameStateFeatureExtractor();
        const gameFeatures = featureExtractor.extractFeatures(gameState, playerId);
        gameFeatures.slice(0, 50).forEach(feature => {
            features[index++] = feature;
        });
        
        // Move availability features (10)
        this.moveTypes.slice(0, 10).forEach(moveType => {
            const hasMove = possibleMoves.some(move => move.type === moveType);
            features[index++] = hasMove ? 1 : 0;
        });
        
        return features;
    }

    trainFromMoveOutcome(gameState, playerId, move, outcome) {
        // Train the network based on move outcomes
        const features = this.extractMoveFeatures(gameState, playerId, [move]);
        const target = new Array(this.outputSize).fill(0);
        
        const moveTypeIndex = this.moveTypes.indexOf(move.type);
        if (moveTypeIndex >= 0) {
            target[moveTypeIndex] = outcome > 0 ? 1 : 0; // Binary outcome
        }
        
        // Simplified training (would need proper backpropagation)
        this.updateNetworkWeights(features, target);
    }

    updateNetworkWeights(features, target) {
        // Simplified weight update
        const learningRate = 0.001;
        
        // Forward pass
        const hidden1 = this.layer1.forward(features);
        const hidden2 = this.layer2.forward(hidden1);
        const output = this.outputLayer.forward(hidden2);
        
        // Calculate error
        const error = target.map((t, i) => t - output[i]);
        
        // Update output layer (simplified)
        for (let i = 0; i < this.outputSize; i++) {
            for (let j = 0; j < this.hiddenSize; j++) {
                this.outputLayer.weights[i][j] += learningRate * error[i] * hidden2[j];
            }
            this.outputLayer.biases[i] += learningRate * error[i];
        }
    }
}

// Export the neural network components
export { NeuralPositionEvaluator, MovePredictorNetwork, GameStateFeatureExtractor };

