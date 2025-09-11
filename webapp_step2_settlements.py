"""
STEP 2: Add Settlement & Road Placement
Now players can place pieces on the board!
"""

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import json
import random
import math
from typing import Dict, List, Optional, Tuple, Set
from dataclasses import dataclass, asdict, field
from collections import defaultdict

app = FastAPI(title="Catan Mobile - Step 2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= STEP 2: ENHANCED GAME LOGIC =============

RESOURCES = ["brick", "wood", "wool", "grain", "ore"]
DICE_PROBS = {2:1, 3:2, 4:3, 5:4, 6:5, 8:5, 9:4, 10:3, 11:2, 12:1}

@dataclass
class Hex:
    id: int
    q: int
    r: int
    resource: Optional[str] = None
    number: Optional[int] = None
    has_robber: bool = False
    
    def get_corners(self):
        """Get the 6 corner positions of this hex"""
        corners = []
        for i in range(6):
            angle = math.pi / 3 * i
            corners.append((
                self.q + math.cos(angle),
                self.r + math.sin(angle)
            ))
        return corners

@dataclass
class Node:
    """Represents a corner/vertex where settlements can be placed"""
    id: int
    q: float  # Fractional axial coordinates
    r: float
    adjacent_hexes: List[int] = field(default_factory=list)
    owner: Optional[int] = None  # Player ID who owns settlement here
    is_city: bool = False

@dataclass
class Edge:
    """Represents an edge where roads can be placed"""
    id: int
    node1: int
    node2: int
    owner: Optional[int] = None  # Player ID who owns road here

@dataclass 
class GameState:
    hexes: List[Hex] = field(default_factory=list)
    nodes: Dict[int, Node] = field(default_factory=dict)
    edges: Dict[int, Edge] = field(default_factory=dict)
    current_player: int = 0
    turn: int = 0
    last_dice: Optional[int] = None
    players: List[Dict] = field(default_factory=list)
    phase: str = "setup"  # "setup" or "play"
    setup_round: int = 0  # 0 or 1 for setup phase
    
    def to_dict(self):
        return {
            "hexes": [asdict(h) for h in self.hexes],
            "nodes": {k: asdict(v) for k, v in self.nodes.items()},
            "edges": {k: asdict(v) for k, v in self.edges.items()},
            "current_player": self.current_player,
            "turn": self.turn,
            "last_dice": self.last_dice,
            "players": self.players,
            "phase": self.phase,
            "setup_round": self.setup_round
        }

class SimpleGame:
    def __init__(self):
        self.state = GameState()
        self.setup_board()
        self.setup_players()
        self.create_nodes_and_edges()
    
    def setup_board(self):
        """Create standard Catan board layout"""
        hex_coords = []
        for q in range(-2, 3):
            for r in range(-2, 3):
                if abs(q + r) <= 2:
                    hex_coords.append((q, r))
        
        resources = (["desert"] + ["brick"]*3 + ["wood"]*4 + 
                    ["wool"]*4 + ["grain"]*4 + ["ore"]*3)
        random.shuffle(resources)
        
        numbers = [5,2,6,3,8,10,9,12,11,4,8,10,9,4,5,6,3,11]
        num_idx = 0
        
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
    
    def create_nodes_and_edges(self):
        """Create nodes (corners) and edges for the board"""
        node_positions = {}  # (q, r) -> node_id
        node_id = 0
        edge_id = 0
        
        # Create nodes at hex corners
        for hex in self.state.hexes:
            corners = hex.get_corners()
            hex_nodes = []
            
            for corner in corners:
                # Round to avoid floating point issues
                key = (round(corner[0], 2), round(corner[1], 2))
                
                if key not in node_positions:
                    node = Node(
                        id=node_id,
                        q=key[0],
                        r=key[1],
                        adjacent_hexes=[hex.id]
                    )
                    self.state.nodes[node_id] = node
                    node_positions[key] = node_id
                    hex_nodes.append(node_id)
                    node_id += 1
                else:
                    # Node already exists, add hex to its adjacent list
                    existing_id = node_positions[key]
                    self.state.nodes[existing_id].adjacent_hexes.append(hex.id)
                    hex_nodes.append(existing_id)
            
            # Create edges between adjacent corners of this hex
            for i in range(6):
                n1 = hex_nodes[i]
                n2 = hex_nodes[(i + 1) % 6]
                
                # Check if edge already exists
                edge_exists = False
                for edge in self.state.edges.values():
                    if (edge.node1 == n1 and edge.node2 == n2) or \
                       (edge.node1 == n2 and edge.node2 == n1):
                        edge_exists = True
                        break
                
                if not edge_exists:
                    self.state.edges[edge_id] = Edge(
                        id=edge_id,
                        node1=min(n1, n2),
                        node2=max(n1, n2)
                    )
                    edge_id += 1
    
    def setup_players(self):
        """Initialize 2 players for now"""
        colors = ["#3498db", "#e74c3c", "#f39c12", "#27ae60"]
        names = ["Blue", "Red", "Orange", "Green"]
        
        for i in range(2):
            self.state.players.append({
                "id": i,
                "name": names[i],
                "color": colors[i],
                "vp": 0,
                "resources": {r: 3 for r in RESOURCES},  # Start with some resources
                "settlements": [],
                "cities": [],
                "roads": []
            })
    
    def can_place_settlement(self, player_id: int, node_id: int) -> bool:
        """Check if a settlement can be placed at this node"""
        if node_id not in self.state.nodes:
            return False
        
        node = self.state.nodes[node_id]
        
        # Node must be empty
        if node.owner is not None:
            return False
        
        # Distance rule: no settlements on adjacent nodes
        for edge in self.state.edges.values():
            if edge.node1 == node_id or edge.node2 == node_id:
                other_node = edge.node2 if edge.node1 == node_id else edge.node1
                if self.state.nodes[other_node].owner is not None:
                    return False
        
        # In setup phase, no road connection needed
        if self.state.phase == "setup":
            return True
        
        # In play phase, must connect to player's road
        for edge in self.state.edges.values():
            if edge.owner == player_id:
                if edge.node1 == node_id or edge.node2 == node_id:
                    return True
        
        return False
    
    def place_settlement(self, player_id: int, node_id: int) -> bool:
        """Place a settlement"""
        if not self.can_place_settlement(player_id, node_id):
            return False
        
        self.state.nodes[node_id].owner = player_id
        self.state.players[player_id]["settlements"].append(node_id)
        self.state.players[player_id]["vp"] += 1
        
        # In setup phase second round, give resources
        if self.state.phase == "setup" and self.state.setup_round == 1:
            node = self.state.nodes[node_id]
            for hex_id in node.adjacent_hexes:
                hex = self.state.hexes[hex_id]
                if hex.resource:
                    self.state.players[player_id]["resources"][hex.resource] += 1
        
        return True
    
    def can_place_road(self, player_id: int, edge_id: int) -> bool:
        """Check if a road can be placed on this edge"""
        if edge_id not in self.state.edges:
            return False
        
        edge = self.state.edges[edge_id]
        
        # Edge must be empty
        if edge.owner is not None:
            return False
        
        # Must connect to player's settlement or road
        node1 = self.state.nodes[edge.node1]
        node2 = self.state.nodes[edge.node2]
        
        # Check if connects to a settlement
        if node1.owner == player_id or node2.owner == player_id:
            return True
        
        # Check if connects to another road
        for other_edge in self.state.edges.values():
            if other_edge.owner == player_id:
                if other_edge.node1 in [edge.node1, edge.node2] or \
                   other_edge.node2 in [edge.node1, edge.node2]:
                    return True
        
        return False
    
    def place_road(self, player_id: int, edge_id: int) -> bool:
        """Place a road"""
        if not self.can_place_road(player_id, edge_id):
            return False
        
        self.state.edges[edge_id].owner = player_id
        self.state.players[player_id]["roads"].append(edge_id)
        return True
    
    def roll_dice(self) -> int:
        """Roll dice and distribute resources"""
        dice1 = random.randint(1, 6)
        dice2 = random.randint(1, 6)
        total = dice1 + dice2
        self.state.last_dice = total
        
        if total == 7:
            # TODO: Handle robber
            pass
        else:
            # Distribute resources
            for hex in self.state.hexes:
                if hex.number == total and not hex.has_robber and hex.resource:
                    # Find all settlements/cities on this hex
                    for node_id, node in self.state.nodes.items():
                        if node.owner is not None and hex.id in node.adjacent_hexes:
                            amount = 2 if node.is_city else 1
                            self.state.players[node.owner]["resources"][hex.resource] += amount
        
        return total
    
    def next_turn(self):
        """Move to next player"""
        if self.state.phase == "setup":
            # Setup phase logic
            num_players = len(self.state.players)
            
            if self.state.setup_round == 0:
                # First round: 0, 1, ... n-1
                self.state.current_player += 1
                if self.state.current_player >= num_players:
                    self.state.setup_round = 1
                    self.state.current_player = num_players - 1
            else:
                # Second round: n-1, n-2, ... 0
                self.state.current_player -= 1
                if self.state.current_player < 0:
                    self.state.phase = "play"
                    self.state.current_player = 0
        else:
            # Regular play
            self.state.current_player = (self.state.current_player + 1) % len(self.state.players)
            self.state.turn += 1

# Global game instance
game = SimpleGame()

# ============= API ENDPOINTS =============

@app.get("/api/state")
async def get_game_state():
    return game.state.to_dict()

@app.post("/api/place_settlement/{node_id}")
async def place_settlement(node_id: int):
    player_id = game.state.current_player
    success = game.place_settlement(player_id, node_id)
    return {
        "success": success,
        "state": game.state.to_dict()
    }

@app.post("/api/place_road/{edge_id}")
async def place_road(edge_id: int):
    player_id = game.state.current_player
    success = game.place_road(player_id, edge_id)
    return {
        "success": success,
        "state": game.state.to_dict()
    }

@app.post("/api/roll")
async def roll_dice():
    result = game.roll_dice()
    return {
        "dice": result,
        "state": game.state.to_dict()
    }

@app.post("/api/end_turn")
async def end_turn():
    game.next_turn()
    return {"state": game.state.to_dict()}

@app.post("/api/reset")
async def reset_game():
    global game
    game = SimpleGame()
    return {"state": game.state.to_dict()}

# ============= ENHANCED HTML WITH SETTLEMENTS =============

@app.get("/")
async def get_index():
    return HTMLResponse(content=open('webapp_step2_frontend.html', 'r').read() if False else """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Catan Mobile - Step 2</title>
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
        
        /* Nodes (settlement spots) */
        .node {
            position: absolute;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: rgba(255,255,255,0.3);
            border: 2px solid white;
            cursor: pointer;
            transform: translate(-50%, -50%);
            z-index: 20;
            transition: all 0.2s;
        }
        
        .node:hover {
            background: rgba(255,255,255,0.5);
            transform: translate(-50%, -50%) scale(1.2);
        }
        
        .node.occupied {
            cursor: default;
        }
        
        .node.invalid {
            opacity: 0.3;
            cursor: not-allowed;
        }
        
        /* Settlement piece */
        .settlement {
            position: absolute;
            width: 20px;
            height: 20px;
            transform: translate(-50%, -50%);
            z-index: 25;
        }
        
        .settlement-icon {
            width: 100%;
            height: 100%;
            background: currentColor;
            clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);
        }
        
        /* Roads */
        .edge {
            position: absolute;
            height: 6px;
            background: rgba(255,255,255,0.2);
            cursor: pointer;
            z-index: 15;
            transform-origin: left center;
            transition: all 0.2s;
        }
        
        .edge:hover {
            background: rgba(255,255,255,0.4);
            height: 8px;
        }
        
        .edge.occupied {
            cursor: default;
        }
        
        .road {
            position: absolute;
            height: 8px;
            transform-origin: left center;
            z-index: 18;
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
        }
        
        button:active {
            transform: scale(0.95);
        }
        
        #resources {
            padding: 10px;
            background: rgba(0,0,0,0.3);
            display: flex;
            gap: 15px;
            justify-content: center;
        }
        
        .resource-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        #phase-indicator {
            background: rgba(255,255,0,0.3);
            padding: 5px 10px;
            border-radius: 15px;
        }
        
        @media (max-width: 600px) {
            .hex {
                width: 50px;
                height: 58px;
            }
            .node {
                width: 16px;
                height: 16px;
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
            VP: <span id="vp">0</span>
        </div>
        <div id="phase-indicator">Setup Phase</div>
        <button onclick="resetGame()">New</button>
    </div>
    
    <div id="resources">
        <div class="resource-item">🧱 <span id="res-brick">0</span></div>
        <div class="resource-item">🌲 <span id="res-wood">0</span></div>
        <div class="resource-item">🐑 <span id="res-wool">0</span></div>
        <div class="resource-item">🌾 <span id="res-grain">0</span></div>
        <div class="resource-item">⛏️ <span id="res-ore">0</span></div>
    </div>
    
    <div id="board-container">
        <div id="board"></div>
    </div>
    
    <div id="controls">
        <button onclick="rollDice()" id="roll-btn">🎲 Roll</button>
        <button onclick="endTurn()">End Turn</button>
    </div>

    <script>
        const RESOURCE_CONFIG = {
            'brick': { color: '#d35400', icon: '🧱' },
            'wood': { color: '#27ae60', icon: '🌲' },
            'wool': { color: '#2ecc71', icon: '🐑' },
            'grain': { color: '#f39c12', icon: '🌾' },
            'ore': { color: '#7f8c8d', icon: '⛏️' },
            null: { color: '#34495e', icon: '🏜️' }
        };
        
        let gameState = null;
        
        function hexToPixel(q, r, size = 30) {
            const x = size * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r);
            const y = size * (3/2 * r);
            return { x, y };
        }
        
        function renderBoard() {
            const board = document.getElementById('board');
            board.innerHTML = '';
            
            if (!gameState) return;
            
            const hexSize = window.innerWidth < 600 ? 25 : 30;
            
            // Draw hexes
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
                                <div style="font-size: 20px">${config.icon}</div>
                                ${hex.number ? `<div class="hex-number">${hex.number}</div>` : ''}
                            </div>
                        </div>
                    </div>
                `;
                
                board.appendChild(hexEl);
            });
            
            // Draw edges (roads)
            Object.values(gameState.edges).forEach(edge => {
                const node1 = gameState.nodes[edge.node1];
                const node2 = gameState.nodes[edge.node2];
                
                const pos1 = hexToPixel(node1.q, node1.r, hexSize);
                const pos2 = hexToPixel(node2.q, node2.r, hexSize);
                
                const dx = pos2.x - pos1.x;
                const dy = pos2.y - pos1.y;
                const length = Math.sqrt(dx*dx + dy*dy);
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                
                if (edge.owner !== null) {
                    // Draw road
                    const roadEl = document.createElement('div');
                    roadEl.className = 'road';
                    roadEl.style.left = `${pos1.x}px`;
                    roadEl.style.top = `${pos1.y - 4}px`;
                    roadEl.style.width = `${length}px`;
                    roadEl.style.transform = `rotate(${angle}deg)`;
                    roadEl.style.background = gameState.players[edge.owner].color;
                    board.appendChild(roadEl);
                } else {
                    // Draw clickable edge
                    const edgeEl = document.createElement('div');
                    edgeEl.className = 'edge';
                    edgeEl.style.left = `${pos1.x}px`;
                    edgeEl.style.top = `${pos1.y - 3}px`;
                    edgeEl.style.width = `${length}px`;
                    edgeEl.style.transform = `rotate(${angle}deg)`;
                    edgeEl.onclick = () => placeRoad(edge.id);
                    board.appendChild(edgeEl);
                }
            });
            
            // Draw nodes and settlements
            Object.values(gameState.nodes).forEach(node => {
                const pos = hexToPixel(node.q, node.r, hexSize);
                
                if (node.owner !== null) {
                    // Draw settlement
                    const settlementEl = document.createElement('div');
                    settlementEl.className = 'settlement';
                    settlementEl.style.left = `${pos.x}px`;
                    settlementEl.style.top = `${pos.y}px`;
                    settlementEl.style.color = gameState.players[node.owner].color;
                    settlementEl.innerHTML = '<div class="settlement-icon"></div>';
                    board.appendChild(settlementEl);
                } else {
                    // Draw clickable node
                    const nodeEl = document.createElement('div');
                    nodeEl.className = 'node';
                    nodeEl.style.left = `${pos.x}px`;
                    nodeEl.style.top = `${pos.y}px`;
                    nodeEl.onclick = () => placeSettlement(node.id);
                    board.appendChild(nodeEl);
                }
            });
        }
        
        async function placeSettlement(nodeId) {
            try {
                const response = await fetch(`/api/place_settlement/${nodeId}`, { method: 'POST' });
                const data = await response.json();
                if (data.success) {
                    gameState = data.state;
                    updateUI();
                }
            } catch (error) {
                console.error('Failed to place settlement:', error);
            }
        }
        
        async function placeRoad(edgeId) {
            try {
                const response = await fetch(`/api/place_road/${edgeId}`, { method: 'POST' });
                const data = await response.json();
                if (data.success) {
                    gameState = data.state;
                    updateUI();
                }
            } catch (error) {
                console.error('Failed to place road:', error);
            }
        }
        
        async function rollDice() {
            try {
                const response = await fetch('/api/roll', { method: 'POST' });
                const data = await response.json();
                gameState = data.state;
                
                alert(`Rolled: ${data.dice}`);
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
        
        async function loadGameState() {
            try {
                const response = await fetch('/api/state');
                gameState = await response.json();
                updateUI();
            } catch (error) {
                console.error('Failed to load game state:', error);
            }
        }
        
        function updateUI() {
            renderBoard();
            
            if (gameState && gameState.players) {
                const player = gameState.players[gameState.current_player];
                document.getElementById('current-player').textContent = player.name;
                document.getElementById('current-player').style.color = player.color;
                document.getElementById('vp').textContent = player.vp;
                
                // Update resources
                document.getElementById('res-brick').textContent = player.resources.brick || 0;
                document.getElementById('res-wood').textContent = player.resources.wood || 0;
                document.getElementById('res-wool').textContent = player.resources.wool || 0;
                document.getElementById('res-grain').textContent = player.resources.grain || 0;
                document.getElementById('res-ore').textContent = player.resources.ore || 0;
                
                // Update phase indicator
                const phaseEl = document.getElementById('phase-indicator');
                phaseEl.textContent = gameState.phase === 'setup' ? 'Setup Phase' : 'Play Phase';
                
                // Enable/disable roll button
                document.getElementById('roll-btn').disabled = gameState.phase === 'setup';
            }
        }
        
        // Initialize
        loadGameState();
    </script>
</body>
</html>
    """)

if __name__ == "__main__":
    import uvicorn
    print("🎮 Catan Step 2: Settlements & Roads!")
    print("📱 Open http://localhost:8000")
    print("✨ Now you can place settlements and roads!")
    uvicorn.run(app, host="0.0.0.0", port=8000)