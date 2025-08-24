/**
 * Neural Network-like Predictor for Advanced Catan AI
 * Implements mathematical functions that simulate neural network behavior
 * for position evaluation, move prediction, and strategic analysis
 * 
 * PHASE 1 FIXES:
 * - Added memory limits to prevent leaks
 * - Fixed activation function derivatives
 * - Improved error handling
 */

// Activation functions with proper derivatives
const ActivationFunctions = {
    sigmoid: (x) => 1 / (1 + Math.exp(-x)),
    sigmoidDerivative: (x) => {
        const s = 1 / (1 + Math.exp(-x));
        return s * (1 - s);
    },
    tanh: (x) => Math.tanh(x),
    tanhDerivative: (x) => 1 - Math.tanh(x) ** 2,
    relu: (x) => Math.max(0, x),
    reluDerivative: (x) => x > 0 ? 1 : 0,
    leakyRelu: (x, alpha = 0.01) => x > 0 ? x : alpha * x,
    leakyReluDerivative: (x, alpha = 0.01) => x > 0 ? 1 : alpha,
    softmax: (arr) => {
        const maxVal = Math.max(...arr);
        const exp = arr.map(x => Math.exp(x - maxVal));
        const sum = exp.reduce((a, b) => a + b, 0);
        return exp.map(x => x / sum);
    }
};

// Neural Network Layer with memory management
class NeuralLayer {
    constructor(inputSize, outputSize, activationFunction = 'relu') {
        this.inputSize = inputSize;
        this.outputSize = outputSize;
        this.activation = ActivationFunctions[activationFunction];
        this.activationDerivative = ActivationFunctions[activationFunction + 'Derivative'] || (() => 1);
        
        // Initialize weights and biases with Xavier initialization
        this.weights = this.initializeWeights(inputSize, outputSize);
        this.biases = new Array(outputSize).fill(0).map(() => Math.random() * 0.1 - 0.05);
        
        // For learning
        this.learningRate = 0.001;
        this.momentum = 0.9;
        this.weightVelocity = this.weights.map(row => row.map(() => 0));
        this.biasVelocity = new Array(outputSize).fill(0);
        
        // Cache for forward pass (needed for backprop)
        this.lastInput = null;
        this.lastOutput = null;
        this.lastPreActivation = null;
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
        this.lastInput = inputs;
        const outputs = [];
        const preActivations = [];
        
        for (let i = 0; i < this.outputSize; i++) {
            let sum = this.biases[i];
            for (let j = 0; j < this.inputSize; j++) {
                sum += inputs[j] * this.weights[i][j];
            }
            preActivations.push(sum);
            outputs.push(this.activation(sum));
        }
        
        this.lastPreActivation = preActivations;
        this.lastOutput = outputs;
        return outputs;
    }

    backward(outputGradients) {
        // Calculate gradients with respect to inputs
        const inputGradients = new Array(this.inputSize).fill(0);
        
        for (let j = 0; j < this.inputSize; j++) {
            for (let i = 0; i < this.outputSize; i++) {
                const activationGrad = this.activationDerivative(this.lastPreActivation[i]);
                inputGradients[j] += outputGradients[i] * activationGrad * this.weights[i][j];
            }
        }
        
        return inputGradients;
    }

    updateWeights(outputGradients) {
        for (let i = 0; i < this.outputSize; i++) {
            const activationGrad = this.activationDerivative(this.lastPreActivation[i]);
            const deltaGrad = outputGradients[i] * activationGrad;
            
            // Update biases with momentum
            this.biasVelocity[i] = this.momentum * this.biasVelocity[i] - 
                                   this.learningRate * deltaGrad;
            this.biases[i] += this.biasVelocity[i];
            
            // Update weights with momentum
            for (let j = 0; j < this.inputSize; j++) {
                const gradient = deltaGrad * this.lastInput[j];
                this.weightVelocity[i][j] = this.momentum * this.weightVelocity[i][j] - 
                                           this.learningRate * gradient;
                this.weights[i][j] += this.weightVelocity[i][j];
            }
        }
    }
    
    // Clean up method to free memory
    cleanup() {
        this.lastInput = null;
        this.lastOutput = null;
        this.lastPreActivation = null;
    }
}

// Advanced Position Evaluator Neural Network with memory management
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
        this.maxHistorySize = 1000; // Prevent memory leak
        this.maxTrainingDataSize = 500; // Limit training data
    }

    evaluatePosition(gameState, playerId) {
        try {
            // Extract features from game state
            const features = this.featureExtractor.extractFeatures(gameState, playerId);
            
            // Forward pass through network
            const hidden1 = this.layer1.forward(features);
            const hidden2 = this.layer2.forward(hidden1);
            const output = this.outputLayer.forward(hidden2);
            
            // Store for potential learning (with memory limit)
            this.evaluationHistory.push({
                features,
                playerId,
                evaluation: output[0],
                timestamp: Date.now()
            });
            
            // Prevent memory leak by limiting history size
            if (this.evaluationHistory.length > this.maxHistorySize) {
                this.evaluationHistory.shift(); // Remove oldest entry
            }
            
            return output[0];
        } catch (error) {
            console.error('Error in position evaluation:', error);
            return 0.5; // Return neutral score on error
        }
    }

    trainFromGameResult(gameResult) {
        try {
            // Use game outcome to train the network
            const winner = gameResult.winnerId;
            
            // Create training examples from evaluation history
            this.evaluationHistory.forEach((evaluation, index) => {
                const target = evaluation.playerId === winner ? 1.0 : 0.0;
                const features = evaluation.features;
                
                // Store training data with limit
                this.trainingData.push({ features, target });
                if (this.trainingData.length > this.maxTrainingDataSize) {
                    this.trainingData.shift();
                }
                
                // Perform backpropagation
                this.backpropagate(features, target);
            });
            
            // Clear history for next game
            this.evaluationHistory = [];
            
            // Clean up layer caches
            this.layer1.cleanup();
            this.layer2.cleanup();
            this.outputLayer.cleanup();
        } catch (error) {
            console.error('Error in training:', error);
        }
    }

    backpropagate(features, target) {
        // Forward pass to get current prediction
        const hidden1 = this.layer1.forward(features);
        const hidden2 = this.layer2.forward(hidden1);
        const output = this.outputLayer.forward(hidden2);
        
        // Calculate loss gradient (mean squared error derivative)
        const outputGradient = [2 * (output[0] - target)];
        
        // Backward pass through layers
        const hidden2Gradient = this.outputLayer.backward(outputGradient);
        const hidden1Gradient = this.layer2.backward(hidden2Gradient);
        const inputGradient = this.layer1.backward(hidden1Gradient);
        
        // Update weights
        this.outputLayer.updateWeights(outputGradient);
        this.layer2.updateWeights(hidden2Gradient);
        this.layer1.updateWeights(hidden1Gradient);
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
    
    // Clean up method to free all memory
    cleanup() {
        this.evaluationHistory = [];
        this.trainingData = [];
        this.layer1.cleanup();
        this.layer2.cleanup();
        this.outputLayer.cleanup();
    }
}

// Feature Extractor for Game State with validation
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
        
        try {
            const player = gameState.players[playerId];
            if (!player) {
                console.error('Invalid player ID:', playerId);
                return features;
            }
            
            let featureIndex = 0;

            // Resource features (5 features)
            const resources = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
            resources.forEach(resource => {
                features[featureIndex++] = Math.min(1, (player.resources[resource] || 0) / 10); // Normalize and cap
            });

            // Production features (5 features)
            const productionRates = this.calculateProductionRates(gameState, playerId);
            resources.forEach(resource => {
                features[featureIndex++] = Math.min(1, productionRates[resource] || 0);
            });

            // Building features (3 features)
            features[featureIndex++] = Math.min(1, player.settlements.length / 5); // Max 5 settlements
            features[featureIndex++] = Math.min(1, player.cities.length / 4); // Max 4 cities
            features[featureIndex++] = Math.min(1, player.roads.length / 15); // Max 15 roads

            // Development card features (5 features)
            const devCards = ['knight', 'roadBuilding', 'monopoly', 'yearOfPlenty', 'victoryPoint'];
            devCards.forEach(card => {
                features[featureIndex++] = Math.min(1, (player.developmentCards[card] || 0) / 5); // Normalize
            });

            // Victory point features (1 feature)
            features[featureIndex++] = Math.min(1, player.victoryPoints / 10); // Normalize

            // Board position features (10 features)
            const positionFeatures = this.extractPositionFeatures(gameState, playerId);
            positionFeatures.forEach(feature => {
                features[featureIndex++] = Math.min(1, Math.max(0, feature)); // Clamp to [0,1]
            });

            // Opponent analysis features (15 features)
            const opponentFeatures = this.extractOpponentFeatures(gameState, playerId);
            opponentFeatures.forEach(feature => {
                features[featureIndex++] = Math.min(1, Math.max(0, feature)); // Clamp to [0,1]
            });

            // Strategic features (6 features)
            const strategicFeatures = this.extractStrategicFeatures(gameState, playerId);
            strategicFeatures.forEach(feature => {
                features[featureIndex++] = Math.min(1, Math.max(0, feature)); // Clamp to [0,1]
            });
            
        } catch (error) {
            console.error('Error extracting features:', error);
        }

        return features;
    }

    calculateProductionRates(gameState, playerId) {
        const player = gameState.players[playerId];
        const rates = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
        
        const diceProbs = {
            2: 1/36, 3: 2/36, 4: 3/36, 5: 4/36, 6: 5/36,
            8: 5/36, 9: 4/36, 10: 3/36, 11: 2/36, 12: 1/36
        };

        if (!player || !player.settlements) return rates;

        player.settlements.forEach(settlementId => {
            const settlement = gameState.board?.nodes?.[settlementId];
            if (settlement && settlement.adjacentTiles) {
                settlement.adjacentTiles.forEach(tileId => {
                    const tile = gameState.board?.tiles?.[tileId];
                    if (tile && tile.resource !== 'desert' && tile.token) {
                        const prob = diceProbs[tile.token] || 0;
                        const multiplier = settlement.isCity ? 2 : 1;
                        rates[tile.resource] = (rates[tile.resource] || 0) + prob * multiplier;
                    }
                });
            }
        });

        return rates;
    }

    extractPositionFeatures(gameState, playerId) {
        const features = [];
        const player = gameState.players[playerId];

        if (!player) return new Array(10).fill(0);

        // Port access
        let portAccess = 0;
        if (player.settlements) {
            player.settlements.forEach(settlementId => {
                const settlement = gameState.board?.nodes?.[settlementId];
                if (settlement && settlement.port) {
                    portAccess += settlement.port.type === 'generic' ? 0.3 : 0.5;
                }
            });
        }
        features.push(Math.min(1, portAccess));

        // Expansion potential (simplified for Phase 1)
        features.push(0.5); // Placeholder

        // Longest road potential
        const roadLength = Math.min(15, player.roads?.length || 0);
        features.push(roadLength / 15);

        // Resource diversity (entropy)
        const resourceCounts = Object.values(player.resources || {});
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

        // Fill remaining features with placeholders
        while (features.length < 10) {
            features.push(0.5);
        }

        return features;
    }

    extractOpponentFeatures(gameState, playerId) {
        const features = [];
        const opponents = gameState.players?.filter((_, id) => id !== playerId) || [];

        opponents.forEach((opponent, index) => {
            if (index < 3 && opponent) { // Max 3 opponents
                // Opponent victory points
                features.push((opponent.victoryPoints || 0) / 10);
                
                // Opponent resource count
                const opponentResources = Object.values(opponent.resources || {}).reduce((a, b) => a + b, 0);
                features.push(opponentResources / 20);
                
                // Opponent development cards
                const opponentDevCards = Object.values(opponent.developmentCards || {}).reduce((a, b) => a + b, 0);
                features.push(opponentDevCards / 10);
                
                // Threat level (simplified)
                features.push(0.5);
                
                // Blocking opportunities (simplified)
                features.push(0.5);
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

        // Win probability (simplified)
        const winProb = this.estimateWinProbability(gameState, playerId);
        features.push(winProb);

        return features;
    }

    determineGamePhase(gameState) {
        const totalBuildings = gameState.players?.reduce((total, player) => 
            total + (player.settlements?.length || 0) + (player.cities?.length || 0), 0
        ) || 0;
        
        if (totalBuildings < 12) return { early: 1, mid: 0, late: 0 };
        if (totalBuildings < 24) return { early: 0, mid: 1, late: 0 };
        return { early: 0, mid: 0, late: 1 };
    }

    calculateResourceScarcity(gameState) {
        const totalResources = gameState.players?.reduce((total, player) => 
            total + Object.values(player.resources || {}).reduce((a, b) => a + b, 0), 0
        ) || 0;
        
        return Math.max(0, 1 - totalResources / 100); // Normalize
    }

    calculateCompetitivePressure(gameState, playerId) {
        const player = gameState.players?.[playerId];
        if (!player) return 0;
        
        const maxOpponentVP = Math.max(...(gameState.players || [])
            .filter((_, id) => id !== playerId)
            .map(p => p?.victoryPoints || 0)
        );
        
        return Math.max(0, Math.min(1, (maxOpponentVP - (player.victoryPoints || 0)) / 10));
    }

    estimateWinProbability(gameState, playerId) {
        const player = gameState.players?.[playerId];
        if (!player) return 0.25;
        
        const totalVP = gameState.players?.reduce((sum, p) => sum + (p?.victoryPoints || 0), 0) || 0;
        
        if (totalVP === 0) return 0.25; // Equal probability at start
        
        return Math.min(1, Math.max(0, (player.victoryPoints || 0) / totalVP));
    }

    adjustWeight(featureName, adjustment) {
        if (this.featureWeights[featureName] !== undefined) {
            this.featureWeights[featureName] += adjustment;
            this.featureWeights[featureName] = Math.max(0.1, Math.min(2.0, this.featureWeights[featureName]));
        }
    }
}

// Move Predictor Neural Network with memory management
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
        
        this.moveHistory = [];
        this.maxHistorySize = 100;
    }

    predictBestMoves(gameState, playerId, possibleMoves) {
        try {
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
        } catch (error) {
            console.error('Error predicting moves:', error);
            return possibleMoves.map(move => ({ move, score: 0.5 }));
        }
    }

    extractMoveFeatures(gameState, playerId, possibleMoves) {
        const features = new Array(this.inputSize).fill(0);
        let index = 0;
        
        try {
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
        } catch (error) {
            console.error('Error extracting move features:', error);
        }
        
        return features;
    }

    trainFromMoveOutcome(gameState, playerId, move, outcome) {
        try {
            // Store move history with limit
            this.moveHistory.push({ gameState, playerId, move, outcome });
            if (this.moveHistory.length > this.maxHistorySize) {
                this.moveHistory.shift();
            }
            
            // Train the network based on move outcomes
            const features = this.extractMoveFeatures(gameState, playerId, [move]);
            const target = new Array(this.outputSize).fill(0);
            
            const moveTypeIndex = this.moveTypes.indexOf(move.type);
            if (moveTypeIndex >= 0) {
                target[moveTypeIndex] = outcome > 0 ? 1 : 0; // Binary outcome
            }
            
            // Perform training
            this.updateNetworkWeights(features, target);
        } catch (error) {
            console.error('Error in move training:', error);
        }
    }

    updateNetworkWeights(features, target) {
        // Forward pass
        const hidden1 = this.layer1.forward(features);
        const hidden2 = this.layer2.forward(hidden1);
        const output = this.outputLayer.forward(hidden2);
        
        // Calculate error
        const outputGradient = target.map((t, i) => t - output[i]);
        
        // Backward pass
        const hidden2Gradient = this.outputLayer.backward(outputGradient);
        const hidden1Gradient = this.layer2.backward(hidden2Gradient);
        
        // Update weights
        this.outputLayer.updateWeights(outputGradient);
        this.layer2.updateWeights(hidden2Gradient);
        this.layer1.updateWeights(hidden1Gradient);
    }
    
    // Clean up method
    cleanup() {
        this.moveHistory = [];
        this.layer1.cleanup();
        this.layer2.cleanup();
        this.outputLayer.cleanup();
    }
}

// Export the neural network components
export { NeuralPositionEvaluator, MovePredictorNetwork, GameStateFeatureExtractor };