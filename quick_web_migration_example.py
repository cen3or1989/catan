"""
Quick example of how to wrap your existing Catan game in a modern web API
This shows how you can keep your core Python code and add a web interface
"""

# pip install fastapi uvicorn python-multipart

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import json
import asyncio
from typing import Dict, List
from dataclasses import asdict
import uuid

# Import your existing game engine
# from catan_plus import Game, HeuristicBot, MCTSBot

app = FastAPI(title="Catan Plus Online")

# Enable CORS for web frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class GameManager:
    """Manages multiple game instances"""
    def __init__(self):
        self.games: Dict[str, Game] = {}
        self.connections: Dict[str, List[WebSocket]] = {}
    
    def create_game(self, game_id: str = None) -> str:
        """Create a new game instance"""
        if not game_id:
            game_id = str(uuid.uuid4())
        
        # Use your existing Game class
        self.games[game_id] = Game(
            seed=42,
            target_vp=10,
            num_players=2,
            use_mcts_bot=True
        )
        self.connections[game_id] = []
        return game_id
    
    async def broadcast_state(self, game_id: str):
        """Send game state to all connected clients"""
        if game_id not in self.games:
            return
        
        game = self.games[game_id]
        state = self.get_game_state(game)
        
        # Send to all connected websockets
        dead_connections = []
        for websocket in self.connections.get(game_id, []):
            try:
                await websocket.send_json(state)
            except:
                dead_connections.append(websocket)
        
        # Clean up dead connections
        for ws in dead_connections:
            self.connections[game_id].remove(ws)
    
    def get_game_state(self, game) -> dict:
        """Convert game to JSON-serializable format"""
        # Adapt this to your Game class structure
        return {
            "turn": game.turn,
            "current_player": game.current,
            "board": {
                "hexes": {
                    hid: {
                        "resource": h.resource,
                        "number": h.number,
                        "has_robber": hid == game.board.robber_hex
                    }
                    for hid, h in game.board.hexes.items()
                },
                "nodes": game.board.nodes,
            },
            "players": [
                {
                    "id": p.id,
                    "name": p.name,
                    "vp": p.vp,
                    "settlements": list(p.settlements),
                    "cities": list(p.cities),
                    "roads": [list(r) for r in p.roads],
                    "resources": dict(p.hand) if p.id == 0 else len(p.hand),  # Hide opponent cards
                }
                for p in game.players
            ]
        }

game_manager = GameManager()

# REST API Endpoints

@app.post("/api/games")
async def create_game():
    """Create a new game"""
    game_id = game_manager.create_game()
    return {"game_id": game_id, "status": "created"}

@app.get("/api/games/{game_id}")
async def get_game(game_id: str):
    """Get current game state"""
    if game_id not in game_manager.games:
        return {"error": "Game not found"}, 404
    
    game = game_manager.games[game_id]
    return game_manager.get_game_state(game)

@app.post("/api/games/{game_id}/actions")
async def perform_action(game_id: str, action: dict):
    """Perform a game action"""
    if game_id not in game_manager.games:
        return {"error": "Game not found"}, 404
    
    game = game_manager.games[game_id]
    
    # Handle different action types
    # Adapt this to your game's action system
    if action["type"] == "build_settlement":
        # game.build_settlement(action["player_id"], action["node_id"])
        pass
    elif action["type"] == "build_road":
        # game.build_road(action["player_id"], action["edge"])
        pass
    elif action["type"] == "end_turn":
        # game.end_turn()
        pass
    
    # Broadcast updated state to all clients
    await game_manager.broadcast_state(game_id)
    
    return {"status": "success"}

# WebSocket for real-time updates

@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    """WebSocket connection for real-time game updates"""
    await websocket.accept()
    
    # Add to connections
    if game_id not in game_manager.connections:
        game_manager.connections[game_id] = []
    game_manager.connections[game_id].append(websocket)
    
    try:
        # Send initial state
        if game_id in game_manager.games:
            game = game_manager.games[game_id]
            await websocket.send_json(game_manager.get_game_state(game))
        
        # Keep connection alive and handle messages
        while True:
            data = await websocket.receive_json()
            
            # Handle incoming actions
            if data.get("type") == "action":
                await perform_action(game_id, data["action"])
            
    except WebSocketDisconnect:
        # Remove from connections
        if game_id in game_manager.connections:
            game_manager.connections[game_id].remove(websocket)

# Serve static files (HTML/JS/CSS)
@app.get("/")
async def get_index():
    """Serve the main game page"""
    return HTMLResponse(content="""
<!DOCTYPE html>
<html>
<head>
    <title>Catan Plus Online</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        #game-container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 20px;
            backdrop-filter: blur(10px);
        }
        #board-canvas {
            width: 100%;
            height: 600px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            margin: 20px 0;
        }
        .controls {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        button {
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid white;
            color: white;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s;
        }
        button:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }
        #status {
            margin-top: 20px;
            padding: 15px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
        }
    </style>
</head>
<body>
    <div id="game-container">
        <h1>🎲 Catan Plus Online</h1>
        
        <div class="controls">
            <button onclick="createGame()">New Game</button>
            <button onclick="joinGame()">Join Game</button>
            <button onclick="rollDice()">Roll Dice</button>
            <button onclick="endTurn()">End Turn</button>
        </div>
        
        <canvas id="board-canvas"></canvas>
        
        <div id="status">
            <h3>Game Status</h3>
            <p id="status-text">Click "New Game" to start...</p>
        </div>
    </div>

    <script>
        let ws = null;
        let gameId = null;
        let gameState = null;
        
        async function createGame() {
            const response = await fetch('/api/games', { method: 'POST' });
            const data = await response.json();
            gameId = data.game_id;
            connectWebSocket();
            updateStatus('Game created! ID: ' + gameId);
        }
        
        function connectWebSocket() {
            if (ws) ws.close();
            
            ws = new WebSocket(`ws://localhost:8000/ws/${gameId}`);
            
            ws.onmessage = (event) => {
                gameState = JSON.parse(event.data);
                renderBoard();
                updateStatus(`Turn ${gameState.turn} - Player ${gameState.current_player}'s turn`);
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                updateStatus('Connection error!');
            };
        }
        
        function renderBoard() {
            const canvas = document.getElementById('board-canvas');
            const ctx = canvas.getContext('2d');
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (!gameState) return;
            
            // Simple hex rendering (you'd expand this)
            const hexSize = 40;
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            // Draw hexes
            Object.entries(gameState.board.hexes).forEach(([id, hex]) => {
                // Calculate hex position (simplified)
                const x = centerX + (id % 5 - 2) * hexSize * 1.5;
                const y = centerY + Math.floor(id / 5 - 2) * hexSize * 1.5;
                
                // Draw hex
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = Math.PI / 3 * i;
                    const hx = x + hexSize * Math.cos(angle);
                    const hy = y + hexSize * Math.sin(angle);
                    if (i === 0) ctx.moveTo(hx, hy);
                    else ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                
                // Color by resource
                const colors = {
                    'brick': '#e74c3c',
                    'wood': '#27ae60',
                    'wool': '#2ecc71',
                    'grain': '#f39c12',
                    'ore': '#95a5a6',
                    null: '#2c3e50'
                };
                ctx.fillStyle = colors[hex.resource] || '#2c3e50';
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.stroke();
                
                // Draw number
                if (hex.number) {
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 20px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(hex.number, x, y + 5);
                }
            });
            
            // Draw pieces (simplified)
            gameState.players.forEach((player, idx) => {
                const color = ['#3498db', '#e91e63', '#ff9800', '#4caf50'][idx];
                
                // Draw settlements
                player.settlements.forEach(nodeId => {
                    // You'd calculate actual position from node coordinates
                    const x = centerX + (nodeId % 10 - 5) * 30;
                    const y = centerY + Math.floor(nodeId / 10 - 5) * 30;
                    
                    ctx.fillStyle = color;
                    ctx.fillRect(x - 10, y - 10, 20, 20);
                });
            });
        }
        
        function updateStatus(text) {
            document.getElementById('status-text').textContent = text;
        }
        
        async function endTurn() {
            if (!gameId) return;
            
            await fetch(`/api/games/${gameId}/actions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'end_turn' })
            });
        }
        
        // Initialize canvas size
        const canvas = document.getElementById('board-canvas');
        canvas.width = canvas.offsetWidth;
        canvas.height = 600;
    </script>
</body>
</html>
    """)

if __name__ == "__main__":
    import uvicorn
    # Run with: python quick_web_migration_example.py
    # Then open: http://localhost:8000
    uvicorn.run(app, host="0.0.0.0", port=8000)