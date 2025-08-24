// Complete Catan Game - React Interface
// ====================================

const { useState, useEffect, useRef, useMemo, useCallback } = React;

import { createCatanGame } from './game-engine.js';
import { createDevelopmentCardManager } from './development-cards.js';
import { createTradingManager } from './trading-system.js';
import { BoardImageDetector, createManualBoardEditor } from './board-generator.js';
import { GAME_PHASES, TURN_PHASES, RESOURCES } from './game-types.js';

function CatanGame() {
  // Core game state
  const [game, setGame] = useState(() => createCatanGame(4));
  const [gameState, setGameState] = useState(() => game.getGameState());
  
  // Managers
  const [devCardManager] = useState(() => createDevelopmentCardManager(game));
  const [tradingManager] = useState(() => createTradingManager(game));
  
  // UI state
  const [selectedAction, setSelectedAction] = useState(null);
  const [showTradePanel, setShowTradePanel] = useState(false);
  const [showDevCardPanel, setShowDevCardPanel] = useState(false);
  const [showGameLog, setShowGameLog] = useState(false);
  const [gameLog, setGameLog] = useState([]);
  
  // Board interaction state
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [hoveredTile, setHoveredTile] = useState(null);
  
  // Dice animation
  const [diceRolling, setDiceRolling] = useState(false);
  const [lastDiceRoll, setLastDiceRoll] = useState(null);

  // Set up event listeners
  useEffect(() => {
    const updateGameState = () => setGameState(game.getGameState());
    
    // Game events
    game.addEventListener('settlementPlaced', (data) => {
      updateGameState();
      addToGameLog(`Player ${data.playerId + 1} placed a settlement`);
    });
    
    game.addEventListener('roadPlaced', (data) => {
      updateGameState();
      addToGameLog(`Player ${data.playerId + 1} built a road`);
    });
    
    game.addEventListener('cityBuilt', (data) => {
      updateGameState();
      addToGameLog(`Player ${data.playerId + 1} built a city`);
    });
    
    game.addEventListener('diceRolled', (data) => {
      updateGameState();
      setLastDiceRoll(data);
      setDiceRolling(false);
      addToGameLog(`Player ${gameState.currentPlayer + 1} rolled ${data.total} (${data.dice1}, ${data.dice2})`);
    });
    
    game.addEventListener('resourcesProduced', (data) => {
      updateGameState();
      addToGameLog(`Resources produced for roll ${data.diceRoll}`);
    });
    
    game.addEventListener('robberMoved', (data) => {
      updateGameState();
      addToGameLog(`Robber moved to tile ${data.tileId}`);
    });
    
    game.addEventListener('gameWon', (data) => {
      updateGameState();
      addToGameLog(`🎉 Player ${data.winnerId + 1} wins with ${data.victoryPoints} victory points!`);
    });
    
    game.addEventListener('mainGameStarted', () => {
      updateGameState();
      addToGameLog('Main game started!');
    });

    return () => {
      // Cleanup if needed
    };
  }, [game]);

  const addToGameLog = useCallback((message) => {
    setGameLog(prev => [...prev.slice(-19), {
      id: Date.now(),
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  }, []);

  // Action handlers
  const handleNodeClick = useCallback((nodeId) => {
    if (gameState.phase === GAME_PHASES.SETUP) {
      const setupInfo = game.getSetupPhaseInfo();
      if (setupInfo.nextAction === 'place_settlement') {
        try {
          game.placeInitialSettlement(nodeId);
        } catch (error) {
          alert(error.message);
        }
      }
    } else if (gameState.phase === GAME_PHASES.MAIN_GAME) {
      if (selectedAction === 'build_settlement') {
        try {
          game.buildSettlement(nodeId);
          setSelectedAction(null);
        } catch (error) {
          alert(error.message);
        }
      } else if (selectedAction === 'build_city') {
        try {
          game.buildCity(nodeId);
          setSelectedAction(null);
        } catch (error) {
          alert(error.message);
        }
      }
    }
  }, [game, gameState, selectedAction]);

  const handleEdgeClick = useCallback((edgeId) => {
    if (gameState.phase === GAME_PHASES.SETUP) {
      const setupInfo = game.getSetupPhaseInfo();
      if (setupInfo.nextAction === 'place_road') {
        try {
          game.placeInitialRoad(edgeId);
        } catch (error) {
          alert(error.message);
        }
      }
    } else if (gameState.phase === GAME_PHASES.MAIN_GAME) {
      if (selectedAction === 'build_road') {
        try {
          game.buildRoad(edgeId);
          setSelectedAction(null);
        } catch (error) {
          alert(error.message);
        }
      }
    }
  }, [game, gameState, selectedAction]);

  const handleDiceRoll = useCallback(() => {
    if (gameState.turnPhase === TURN_PHASES.DICE_ROLL) {
      setDiceRolling(true);
      setTimeout(() => {
        try {
          game.rollDice();
        } catch (error) {
          setDiceRolling(false);
          alert(error.message);
        }
      }, 1000);
    }
  }, [game, gameState]);

  const handleEndTurn = useCallback(() => {
    try {
      game.endTurn();
      setSelectedAction(null);
    } catch (error) {
      alert(error.message);
    }
  }, [game]);

  const handleBuyDevCard = useCallback(() => {
    try {
      game.buyDevelopmentCard();
    } catch (error) {
      alert(error.message);
    }
  }, [game]);

  const currentPlayer = gameState.players[gameState.currentPlayer];
  const isMyTurn = true; // In single-player mode, always your turn

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-amber-500">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold text-gray-800">🏝️ Catan</h1>
              <div className="text-sm text-gray-600">
                {gameState.phase === GAME_PHASES.SETUP ? 'Setup Phase' : 
                 gameState.phase === GAME_PHASES.MAIN_GAME ? `Turn ${gameState.turnNumber}` :
                 'Game Over'}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowGameLog(!showGameLog)}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium"
              >
                📜 Game Log
              </button>
              <div className="text-sm font-medium text-gray-700">
                Current: <span style={{color: currentPlayer.color}}>Player {gameState.currentPlayer + 1}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Game Board */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <GameBoard
              gameState={gameState}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onTileClick={(tileId) => setHoveredTile(tileId)}
              hoveredNode={hoveredNode}
              hoveredEdge={hoveredEdge}
              selectedAction={selectedAction}
            />
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          
          {/* Current Player Panel */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <div 
                className="w-4 h-4 rounded-full mr-2" 
                style={{backgroundColor: currentPlayer.color}}
              />
              Player {gameState.currentPlayer + 1}
            </h2>
            
            <PlayerDashboard 
              player={currentPlayer}
              gameState={gameState}
              isCurrentPlayer={isMyTurn}
            />
          </div>

          {/* Actions Panel */}
          {gameState.phase === GAME_PHASES.MAIN_GAME && isMyTurn && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4">Actions</h3>
              <ActionPanel
                gameState={gameState}
                currentPlayer={currentPlayer}
                selectedAction={selectedAction}
                onActionSelect={setSelectedAction}
                onDiceRoll={handleDiceRoll}
                onEndTurn={handleEndTurn}
                onBuyDevCard={handleBuyDevCard}
                onShowTrade={() => setShowTradePanel(true)}
                onShowDevCards={() => setShowDevCardPanel(true)}
                diceRolling={diceRolling}
                lastDiceRoll={lastDiceRoll}
              />
            </div>
          )}

          {/* Setup Instructions */}
          {gameState.phase === GAME_PHASES.SETUP && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
              <SetupInstructions gameState={gameState} game={game} />
            </div>
          )}

          {/* Victory Points */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4">Victory Points</h3>
            <VictoryPointsPanel gameState={gameState} />
          </div>

        </div>
      </div>

      {/* Modals */}
      {showTradePanel && (
        <TradeModal
          gameState={gameState}
          tradingManager={tradingManager}
          currentPlayerId={gameState.currentPlayer}
          onClose={() => setShowTradePanel(false)}
        />
      )}

      {showDevCardPanel && (
        <DevCardModal
          gameState={gameState}
          devCardManager={devCardManager}
          currentPlayerId={gameState.currentPlayer}
          onClose={() => setShowDevCardPanel(false)}
        />
      )}

      {showGameLog && (
        <GameLogModal
          gameLog={gameLog}
          onClose={() => setShowGameLog(false)}
        />
      )}
    </div>
  );
}

// Game Board Component
function GameBoard({ gameState, onNodeClick, onEdgeClick, onTileClick, selectedAction }) {
  const svgRef = useRef(null);
  
  const boardWidth = 600;
  const boardHeight = 600;
  
  return (
    <div className="relative">
      <svg 
        ref={svgRef}
        width={boardWidth} 
        height={boardHeight}
        viewBox="0 0 600 600"
        className="border rounded-lg bg-blue-50"
      >
        {/* Render tiles */}
        {gameState.board.tiles.map(tile => (
          <HexTile 
            key={tile.id}
            tile={tile}
            onClick={() => onTileClick(tile.id)}
            hasRobber={gameState.board.robberPosition === tile.id}
          />
        ))}
        
        {/* Render edges (roads) */}
        {gameState.board.edges.map(edge => (
          <RoadEdge
            key={edge.id}
            edge={edge}
            gameState={gameState}
            onClick={() => onEdgeClick(edge.id)}
            canPlace={selectedAction === 'build_road'}
          />
        ))}
        
        {/* Render nodes (settlements/cities) */}
        {gameState.board.nodes.map(node => (
          <SettlementNode
            key={node.id}
            node={node}
            gameState={gameState}
            onClick={() => onNodeClick(node.id)}
            canPlaceSettlement={selectedAction === 'build_settlement'}
            canPlaceCity={selectedAction === 'build_city'}
          />
        ))}
        
        {/* Render ports */}
        {gameState.board.ports.map(port => (
          <PortIndicator
            key={port.id}
            port={port}
            nodes={gameState.board.nodes}
          />
        ))}
      </svg>
    </div>
  );
}

// Individual game components would go here...
// (HexTile, RoadEdge, SettlementNode, PortIndicator, PlayerDashboard, ActionPanel, etc.)

// Mount the React app
if (typeof document !== 'undefined') {
  const rootEl = document.getElementById('root');
  if (rootEl && window.ReactDOM && ReactDOM.createRoot) {
    const root = ReactDOM.createRoot(rootEl);
    root.render(React.createElement(CatanGame));
  }
}