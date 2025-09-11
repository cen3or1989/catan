"""
STEP 1: Basic Catan Web App - Backend
Mobile-friendly, simple to run, minimal features to start
Just board display and basic game state
"""

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import json
import random
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict, field

app = FastAPI(title="Catan Mobile")

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= STEP 1: MINIMAL GAME LOGIC =============

RESOURCES = ["brick", "wood", "wool", "grain", "ore"]
DICE_PROBS = {2:1, 3:2, 4:3, 5:4, 6:5, 8:5, 9:4, 10:3, 11:2, 12:1}

@dataclass
class Hex:
    """Simple hex tile"""
    id: int
    q: int  # Axial coordinate
    r: int  # Axial coordinate
    resource: Optional[str] = None
    number: Optional[int] = None
    has_robber: bool = False

@dataclass 
class GameState:
    """Minimal game state for Step 1"""
    hexes: List[Hex] = field(default_factory=list)
    current_player: int = 0
    turn: int = 0
    last_dice: Optional[int] = None
    players: List[Dict] = field(default_factory=list)
    
    def to_dict(self):
        return {
            "hexes": [asdict(h) for h in self.hexes],
            "current_player": self.current_player,
            "turn": self.turn,
            "last_dice": self.last_dice,
            "players": self.players
        }

class SimpleGame:
    """Simplified game for Step 1 - just board and dice"""
    
    def __init__(self):
        self.state = GameState()
        self.setup_board()
        self.setup_players()
    
    def setup_board(self):
        """Create standard Catan board layout"""
        # Hexagonal grid with axial coordinates
        hex_coords = []
        for q in range(-2, 3):
            for r in range(-2, 3):
                if abs(q + r) <= 2:  # Hexagon constraint
                    hex_coords.append((q, r))
        
        # Resources for standard board (19 hexes)
        resources = (["desert"] + ["brick"]*3 + ["wood"]*4 + 
                    ["wool"]*4 + ["grain"]*4 + ["ore"]*3)
        random.shuffle(resources)
        
        # Number tokens (standard distribution)
        numbers = [5,2,6,3,8,10,9,12,11,4,8,10,9,4,5,6,3,11]
        num_idx = 0
        
        # Create hexes
        for i, (q, r) in enumerate(hex_coords):
            res = resources[i] if i < len(resources) else None
            num = None
            if res and res != "desert":
                num = numbers[num_idx] if num_idx < len(numbers) else None
                num_idx += 1
            
            self.state.hexes.append(Hex(
                id=i,
                q=q,
                r=r,
                resource=None if res == "desert" else res,
                number=num,
                has_robber=(res == "desert")
            ))
    
    def setup_players(self):
        """Initialize 2-4 players"""
        colors = ["#3498db", "#e74c3c", "#f39c12", "#27ae60"]
        names = ["Blue", "Red", "Orange", "Green"]
        
        for i in range(2):  # Start with 2 players
            self.state.players.append({
                "id": i,
                "name": names[i],
                "color": colors[i],
                "vp": 0,
                "resources": {r: 0 for r in RESOURCES},
                "settlements": [],
                "roads": []
            })
    
    def roll_dice(self) -> int:
        """Roll two dice"""
        dice1 = random.randint(1, 6)
        dice2 = random.randint(1, 6)
        total = dice1 + dice2
        self.state.last_dice = total
        
        if total == 7:
            # Handle robber (simplified for now)
            pass
        else:
            # Distribute resources (will add when we have settlements)
            pass
        
        return total
    
    def next_turn(self):
        """Move to next player"""
        self.state.current_player = (self.state.current_player + 1) % len(self.state.players)
        self.state.turn += 1

# Global game instance (for simplicity in Step 1)
game = SimpleGame()

# ============= API ENDPOINTS =============

@app.get("/api/state")
async def get_game_state():
    """Get current game state"""
    return game.state.to_dict()

@app.post("/api/roll")
async def roll_dice():
    """Roll dice and get result"""
    result = game.roll_dice()
    return {
        "dice": result,
        "state": game.state.to_dict()
    }

@app.post("/api/end_turn")
async def end_turn():
    """End current player's turn"""
    game.next_turn()
    return {"state": game.state.to_dict()}

@app.post("/api/reset")
async def reset_game():
    """Start a new game"""
    global game
    game = SimpleGame()
    return {"state": game.state.to_dict()}

# ============= SERVE HTML =============

@app.get("/")
async def get_index():
    """Serve the mobile-friendly game interface"""
    return HTMLResponse(content="""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>Catan Mobile</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            overflow: hidden;
            touch-action: none;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        #header {
            padding: 10px;
            background: rgba(0,0,0,0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        #board-container {
            flex: 1;
            position: relative;
            overflow: hidden;
        }
        
        #board {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        
        .hex {
            position: absolute;
            width: 60px;
            height: 69px;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        .hex:active {
            transform: scale(0.95);
        }
        
        .hex-inner {
            width: 100%;
            height: 100%;
            position: relative;
            transform: rotate(30deg);
        }
        
        .hex-shape {
            width: 100%;
            height: 100%;
            position: relative;
            overflow: hidden;
        }
        
        .hex-shape:before,
        .hex-shape:after {
            content: "";
            position: absolute;
            width: 100%;
            height: 100%;
            background: inherit;
        }
        
        .hex-shape:before {
            transform: rotate(60deg);
        }
        
        .hex-shape:after {
            transform: rotate(-60deg);
        }
        
        .hex-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            text-align: center;
            z-index: 10;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }
        
        .hex-number {
            font-size: 18px;
            background: rgba(255,255,255,0.9);
            color: #333;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            line-height: 30px;
            margin: 0 auto;
        }
        
        .resource-icon {
            font-size: 24px;
            margin-bottom: 2px;
        }
        
        #controls {
            padding: 15px;
            background: rgba(0,0,0,0.4);
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        button {
            padding: 12px 24px;
            background: rgba(255,255,255,0.2);
            border: 2px solid white;
            color: white;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        button:active {
            transform: scale(0.95);
            background: rgba(255,255,255,0.3);
        }
        
        #dice-result {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9);
            padding: 30px;
            border-radius: 20px;
            font-size: 48px;
            display: none;
            animation: dicePopup 0.5s ease;
        }
        
        @keyframes dicePopup {
            0% { transform: translate(-50%, -50%) scale(0); }
            50% { transform: translate(-50%, -50%) scale(1.2); }
            100% { transform: translate(-50%, -50%) scale(1); }
        }
        
        #player-info {
            font-size: 14px;
        }
        
        .robber {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 30px;
            z-index: 20;
        }
        
        /* Mobile optimizations */
        @media (max-width: 600px) {
            .hex {
                width: 50px;
                height: 58px;
            }
            .hex-number {
                font-size: 14px;
                width: 24px;
                height: 24px;
                line-height: 24px;
            }
            .resource-icon {
                font-size: 20px;
            }
            button {
                padding: 10px 20px;
                font-size: 14px;
            }
        }
    </style>
</head>
<body>
    <div id="header">
        <div id="player-info">
            <span id="current-player">Player 1</span> | 
            Turn <span id="turn-number">1</span>
        </div>
        <button onclick="resetGame()">New Game</button>
    </div>
    
    <div id="board-container">
        <div id="board"></div>
    </div>
    
    <div id="controls">
        <button onclick="rollDice()">🎲 Roll Dice</button>
        <button onclick="endTurn()">End Turn</button>
    </div>
    
    <div id="dice-result"></div>

    <script>
        // Resource colors and icons
        const RESOURCE_CONFIG = {
            'brick': { color: '#d35400', icon: '🧱' },
            'wood': { color: '#27ae60', icon: '🌲' },
            'wool': { color: '#2ecc71', icon: '🐑' },
            'grain': { color: '#f39c12', icon: '🌾' },
            'ore': { color: '#7f8c8d', icon: '⛏️' },
            null: { color: '#34495e', icon: '🏜️' }
        };
        
        let gameState = null;
        
        // Hex to pixel conversion for axial coordinates
        function hexToPixel(q, r, size = 30) {
            const x = size * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r);
            const y = size * (3/2 * r);
            return { x, y };
        }
        
        function renderBoard() {
            const board = document.getElementById('board');
            board.innerHTML = '';
            
            if (!gameState || !gameState.hexes) return;
            
            // Calculate board dimensions
            const hexSize = window.innerWidth < 600 ? 25 : 30;
            
            gameState.hexes.forEach(hex => {
                const pos = hexToPixel(hex.q, hex.r, hexSize);
                const config = RESOURCE_CONFIG[hex.resource];
                
                const hexEl = document.createElement('div');
                hexEl.className = 'hex';
                hexEl.style.left = `${pos.x}px`;
                hexEl.style.top = `${pos.y}px`;
                
                hexEl.innerHTML = `
                    <div class="hex-inner">
                        <div class="hex-shape" style="background: ${config.color}">
                            <div class="hex-content">
                                <div class="resource-icon">${config.icon}</div>
                                ${hex.number ? `<div class="hex-number">${hex.number}</div>` : ''}
                                ${hex.has_robber ? '<div class="robber">🦹</div>' : ''}
                            </div>
                        </div>
                    </div>
                `;
                
                board.appendChild(hexEl);
            });
        }
        
        async function loadGameState() {
            try {
                const response = await fetch('/api/state');
                gameState = await response.json();
                updateUI();
            } catch (error) {
                console.error('Failed to load game state:', error);
            }
        }
        
        async function rollDice() {
            try {
                const response = await fetch('/api/roll', { method: 'POST' });
                const data = await response.json();
                gameState = data.state;
                
                // Show dice result
                const diceEl = document.getElementById('dice-result');
                diceEl.textContent = `🎲 ${data.dice}`;
                diceEl.style.display = 'block';
                
                setTimeout(() => {
                    diceEl.style.display = 'none';
                }, 2000);
                
                updateUI();
            } catch (error) {
                console.error('Failed to roll dice:', error);
            }
        }
        
        async function endTurn() {
            try {
                const response = await fetch('/api/end_turn', { method: 'POST' });
                const data = await response.json();
                gameState = data.state;
                updateUI();
            } catch (error) {
                console.error('Failed to end turn:', error);
            }
        }
        
        async function resetGame() {
            if (confirm('Start a new game?')) {
                try {
                    const response = await fetch('/api/reset', { method: 'POST' });
                    const data = await response.json();
                    gameState = data.state;
                    updateUI();
                } catch (error) {
                    console.error('Failed to reset game:', error);
                }
            }
        }
        
        function updateUI() {
            renderBoard();
            
            if (gameState && gameState.players) {
                const player = gameState.players[gameState.current_player];
                document.getElementById('current-player').textContent = player.name;
                document.getElementById('current-player').style.color = player.color;
                document.getElementById('turn-number').textContent = gameState.turn + 1;
            }
        }
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (gameState) renderBoard();
        });
        
        // Prevent zoom on double tap (iOS)
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        });
        
        // Initialize game
        loadGameState();
    </script>
</body>
</html>
    """)

if __name__ == "__main__":
    import uvicorn
    print("🎮 Starting Catan Mobile Server...")
    print("📱 Open http://localhost:8000 on your phone or computer")
    print("💡 Make sure your phone is on the same WiFi network")
    print("🌐 You can also use your computer's IP address instead of localhost")
    uvicorn.run(app, host="0.0.0.0", port=8000)