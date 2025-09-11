# معماری پیشنهادی برای Catan Plus Simulation

## 🎯 اهداف معماری

1. **Separation of Concerns** - جداسازی کامل مسئولیت‌ها
2. **High Cohesion, Low Coupling** - انسجام بالا، وابستگی پایین
3. **Testability** - قابلیت تست آسان
4. **Extensibility** - قابلیت توسعه برای افزودن قابلیت‌های جدید
5. **Performance** - بهینه‌سازی و caching
6. **Clean Code** - کد تمیز و قابل نگهداری

## 📁 ساختار پیشنهادی دایرکتوری

```
catan_simulation/
│
├── src/
│   ├── __init__.py
│   │
│   ├── core/                      # هسته بازی - Pure Business Logic
│   │   ├── __init__.py
│   │   ├── models/                # Data Models
│   │   │   ├── __init__.py
│   │   │   ├── board.py          # Board, Hex, Node, Edge
│   │   │   ├── player.py         # Player state
│   │   │   ├── resources.py      # Resource types, cards
│   │   │   └── game_state.py     # Complete game state
│   │   │
│   │   ├── rules/                 # Game Rules Engine
│   │   │   ├── __init__.py
│   │   │   ├── building_rules.py # Settlement, city, road rules
│   │   │   ├── trading_rules.py  # Trade validation
│   │   │   ├── card_rules.py     # Development card rules
│   │   │   └── victory_rules.py  # Victory conditions
│   │   │
│   │   ├── mechanics/             # Game Mechanics
│   │   │   ├── __init__.py
│   │   │   ├── dice.py           # Dice rolling, probabilities
│   │   │   ├── resource_manager.py # Resource distribution
│   │   │   ├── longest_road.py   # Longest road calculation
│   │   │   └── largest_army.py   # Largest army tracking
│   │   │
│   │   └── constants.py          # Game constants
│   │
│   ├── engine/                    # Game Engine - Orchestration
│   │   ├── __init__.py
│   │   ├── game_controller.py    # Main game loop
│   │   ├── turn_manager.py       # Turn management
│   │   ├── action_processor.py   # Process player actions
│   │   └── event_system.py       # Event bus for decoupling
│   │
│   ├── ai/                        # AI Players
│   │   ├── __init__.py
│   │   ├── base_bot.py           # Abstract base class
│   │   ├── heuristic_bot.py      # Heuristic AI
│   │   ├── mcts/                 # Monte Carlo Tree Search
│   │   │   ├── __init__.py
│   │   │   ├── mcts_bot.py       # MCTS implementation
│   │   │   ├── node.py           # MCTS tree node
│   │   │   ├── evaluator.py      # State evaluation
│   │   │   └── selection.py      # UCB1 selection
│   │   │
│   │   └── strategies/           # Reusable strategies
│   │       ├── __init__.py
│   │       ├── placement.py      # Initial placement strategy
│   │       ├── trading.py        # Trading strategies
│   │       └── expansion.py      # Expansion strategies
│   │
│   ├── trading/                   # Trading System
│   │   ├── __init__.py
│   │   ├── trade_manager.py      # Trade orchestration
│   │   ├── port_trading.py       # Bank/port trades
│   │   ├── p2p_trading.py        # Player-to-player trades
│   │   └── trade_optimizer.py    # Find optimal trades
│   │
│   ├── simulation/                # Simulation Framework
│   │   ├── __init__.py
│   │   ├── simulator.py          # Run simulations
│   │   ├── parallel_sim.py       # Parallel execution
│   │   ├── statistics.py         # Stats collection
│   │   └── replay.py             # Game replay system
│   │
│   ├── visualization/             # GUI and Rendering
│   │   ├── __init__.py
│   │   ├── board_renderer.py     # Board visualization
│   │   ├── gui_app.py            # Main GUI application
│   │   ├── widgets/              # Custom widgets
│   │   │   ├── __init__.py
│   │   │   ├── board_canvas.py   # Board drawing
│   │   │   ├── player_panel.py   # Player info
│   │   │   └── control_panel.py  # Simulation controls
│   │   │
│   │   └── themes.py             # Color schemes, styles
│   │
│   ├── io/                        # Input/Output
│   │   ├── __init__.py
│   │   ├── save_load.py          # Save/load games
│   │   ├── trace_recorder.py     # Record game traces
│   │   ├── image_parser.py       # Parse board from images
│   │   └── qr_handler.py         # QR code generation/reading
│   │
│   ├── utils/                     # Utilities
│   │   ├── __init__.py
│   │   ├── geometry.py           # Hex geometry calculations
│   │   ├── graph.py              # Graph algorithms
│   │   ├── cache.py              # Caching decorators
│   │   └── logger.py             # Logging configuration
│   │
│   └── api/                       # External API (future)
│       ├── __init__.py
│       ├── rest_api.py           # REST endpoints
│       └── websocket.py          # Real-time updates
│
├── tests/                         # Test Suite
│   ├── unit/                     # Unit tests
│   │   ├── test_rules.py
│   │   ├── test_mechanics.py
│   │   ├── test_ai.py
│   │   └── test_trading.py
│   │
│   ├── integration/              # Integration tests
│   │   ├── test_game_flow.py
│   │   └── test_simulation.py
│   │
│   └── performance/              # Performance tests
│       └── benchmark.py
│
├── docs/                          # Documentation
│   ├── api/                      # API documentation
│   ├── architecture/             # Architecture diagrams
│   └── guides/                   # User guides
│
├── config/                        # Configuration
│   ├── default.yaml              # Default settings
│   ├── bot_configs/              # AI configurations
│   └── board_layouts/            # Custom board layouts
│
├── scripts/                       # Utility scripts
│   ├── run_simulation.py         # CLI for simulations
│   ├── analyze_results.py        # Analyze simulation results
│   └── profile_performance.py    # Performance profiling
│
├── requirements.txt              # Dependencies
├── setup.py                      # Package setup
├── README.md                     # Project documentation
└── .gitignore
```

## 🏗️ معماری لایه‌ای (Layered Architecture)

```
┌─────────────────────────────────────────────────┐
│              Presentation Layer                  │
│         (GUI, CLI, API endpoints)               │
├─────────────────────────────────────────────────┤
│             Application Layer                    │
│    (Game Controller, Simulation Manager)        │
├─────────────────────────────────────────────────┤
│              Business Layer                      │
│    (Game Rules, Mechanics, AI Strategies)       │
├─────────────────────────────────────────────────┤
│               Domain Layer                       │
│        (Core Models, Game State)                │
├─────────────────────────────────────────────────┤
│            Infrastructure Layer                  │
│      (I/O, Caching, Logging, Database)          │
└─────────────────────────────────────────────────┘
```

## 📋 جزئیات ماژول‌ها

### 1. Core Module (`src/core/`)

#### `models/board.py`
```python
from dataclasses import dataclass
from typing import Dict, List, Set, Tuple, Optional
from enum import Enum

class ResourceType(Enum):
    BRICK = "brick"
    WOOD = "wood"
    WOOL = "wool"
    GRAIN = "grain"
    ORE = "ore"
    DESERT = None

@dataclass(frozen=True)
class Hex:
    """Immutable hex tile representation"""
    id: int
    q: int  # Axial coordinate
    r: int  # Axial coordinate
    resource: Optional[ResourceType]
    number: Optional[int]
    
    @property
    def s(self) -> int:
        """Cube coordinate s = -q - r"""
        return -self.q - self.r

@dataclass(frozen=True)
class Node:
    """Immutable node (vertex) representation"""
    id: int
    position: Tuple[float, float]
    adjacent_hexes: Tuple[int, ...]
    
@dataclass(frozen=True)
class Edge:
    """Immutable edge representation"""
    node1: int
    node2: int
    
    def __hash__(self):
        return hash(tuple(sorted([self.node1, self.node2])))

@dataclass
class Board:
    """Complete board state"""
    hexes: Dict[int, Hex]
    nodes: Dict[int, Node]
    edges: Set[Edge]
    ports: Dict[int, 'Port']
    robber_position: int
```

#### `models/player.py`
```python
from dataclasses import dataclass, field
from typing import Set, Counter
from enum import Enum

class BuildingType(Enum):
    SETTLEMENT = "settlement"
    CITY = "city"
    ROAD = "road"

@dataclass
class PlayerState:
    """Complete player state"""
    id: int
    name: str
    color: str
    
    # Resources
    resources: Counter = field(default_factory=Counter)
    development_cards: Counter = field(default_factory=Counter)
    
    # Buildings
    settlements: Set[int] = field(default_factory=set)
    cities: Set[int] = field(default_factory=set)
    roads: Set[Edge] = field(default_factory=set)
    
    # Score
    victory_points: int = 0
    hidden_victory_points: int = 0
    
    # Special cards
    has_longest_road: bool = False
    has_largest_army: bool = False
    knights_played: int = 0
    
    # Building limits
    settlements_remaining: int = 5
    cities_remaining: int = 4
    roads_remaining: int = 15
```

### 2. Rules Engine (`src/core/rules/`)

#### `building_rules.py`
```python
from abc import ABC, abstractmethod
from typing import List, Set
from ..models import Board, PlayerState, Node, Edge

class BuildingRule(ABC):
    """Abstract base for building rules"""
    
    @abstractmethod
    def can_build(self, board: Board, player: PlayerState, 
                  location: int, all_players: List[PlayerState]) -> bool:
        pass
    
    @abstractmethod
    def get_valid_locations(self, board: Board, player: PlayerState,
                           all_players: List[PlayerState]) -> Set[int]:
        pass

class SettlementRule(BuildingRule):
    """Settlement placement rules"""
    
    def can_build(self, board: Board, player: PlayerState,
                  node_id: int, all_players: List[PlayerState]) -> bool:
        # Check distance rule (2 edges away from any settlement/city)
        # Check connection to road (except initial placement)
        # Check not occupied
        pass
    
    def get_valid_locations(self, board: Board, player: PlayerState,
                           all_players: List[PlayerState]) -> Set[int]:
        # Return all valid settlement locations
        pass

class CityRule(BuildingRule):
    """City upgrade rules"""
    
    def can_build(self, board: Board, player: PlayerState,
                  node_id: int, all_players: List[PlayerState]) -> bool:
        # Must have settlement at location
        # Must have resources
        pass

class RoadRule(BuildingRule):
    """Road placement rules"""
    
    def can_build(self, board: Board, player: PlayerState,
                  edge: Edge, all_players: List[PlayerState]) -> bool:
        # Must connect to existing road/building
        # Cannot pass through opponent settlement/city
        # Edge not already occupied
        pass
```

### 3. Game Engine (`src/engine/`)

#### `game_controller.py`
```python
from typing import List, Optional
from ..core.models import Board, PlayerState, GameState
from ..core.rules import RuleEngine
from .event_system import EventBus, GameEvent
from .turn_manager import TurnManager
from .action_processor import ActionProcessor

class GameController:
    """Main game orchestrator"""
    
    def __init__(self, config: dict):
        self.board = self._create_board(config)
        self.players = self._create_players(config)
        self.rule_engine = RuleEngine()
        self.event_bus = EventBus()
        self.turn_manager = TurnManager()
        self.action_processor = ActionProcessor(self.rule_engine)
        
        # Subscribe to events
        self._setup_event_handlers()
    
    def start_game(self):
        """Initialize and start game"""
        self.event_bus.emit(GameEvent.GAME_START)
        self._initial_placement_phase()
        self._main_game_loop()
    
    def _main_game_loop(self):
        """Main game loop"""
        while not self._check_victory():
            current_player = self.turn_manager.current_player
            
            # Roll dice
            dice_result = self._roll_dice()
            self.event_bus.emit(GameEvent.DICE_ROLLED, dice_result)
            
            if dice_result == 7:
                self._handle_robber()
            else:
                self._distribute_resources(dice_result)
            
            # Player actions
            self._process_player_turn(current_player)
            
            # Check special cards
            self._update_special_cards()
            
            # Next turn
            self.turn_manager.next_turn()
    
    def _check_victory(self) -> bool:
        """Check if any player has won"""
        for player in self.players:
            if player.victory_points >= self.config['victory_points']:
                self.event_bus.emit(GameEvent.GAME_END, player)
                return True
        return False
```

### 4. AI System (`src/ai/`)

#### `base_bot.py`
```python
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple
from ..core.models import Board, PlayerState, Action

class BaseBot(ABC):
    """Abstract base class for all AI bots"""
    
    def __init__(self, player_id: int, difficulty: str = "medium"):
        self.player_id = player_id
        self.difficulty = difficulty
    
    @abstractmethod
    def choose_initial_settlement(self, board: Board, 
                                 legal_positions: List[int]) -> int:
        """Choose initial settlement placement"""
        pass
    
    @abstractmethod
    def choose_initial_road(self, board: Board,
                           settlement: int,
                           legal_edges: List[Edge]) -> Edge:
        """Choose initial road placement"""
        pass
    
    @abstractmethod
    def take_turn(self, game_state: 'GameState') -> List[Action]:
        """Decide actions for the turn"""
        pass
    
    @abstractmethod
    def choose_discard(self, hand: Counter, count: int) -> Counter:
        """Choose cards to discard when 7 is rolled"""
        pass
    
    @abstractmethod
    def choose_robber_placement(self, board: Board,
                               legal_hexes: List[int]) -> int:
        """Choose where to place the robber"""
        pass
```

#### `mcts/mcts_bot.py`
```python
import math
from typing import List, Optional
from .node import MCTSNode
from .evaluator import StateEvaluator
from ..base_bot import BaseBot

class MCTSBot(BaseBot):
    """Monte Carlo Tree Search AI"""
    
    def __init__(self, player_id: int, 
                 iterations: int = 1000,
                 exploration_constant: float = 1.414):
        super().__init__(player_id, "expert")
        self.iterations = iterations
        self.c = exploration_constant
        self.evaluator = StateEvaluator()
    
    def take_turn(self, game_state: 'GameState') -> List[Action]:
        """Use MCTS to find best action sequence"""
        root = MCTSNode(game_state)
        
        for _ in range(self.iterations):
            # Selection
            node = self._select(root)
            
            # Expansion
            if not node.is_terminal():
                node = self._expand(node)
            
            # Simulation
            reward = self._simulate(node)
            
            # Backpropagation
            self._backpropagate(node, reward)
        
        # Choose best action
        best_child = max(root.children, 
                        key=lambda n: n.visits)
        return best_child.action_sequence
    
    def _select(self, node: MCTSNode) -> MCTSNode:
        """Select node using UCB1"""
        while node.is_fully_expanded() and not node.is_terminal():
            node = self._best_uct_child(node)
        return node
    
    def _best_uct_child(self, node: MCTSNode) -> MCTSNode:
        """Select child with highest UCB1 value"""
        best_value = -float('inf')
        best_child = None
        
        for child in node.children:
            uct_value = (child.total_reward / child.visits + 
                        self.c * math.sqrt(2 * math.log(node.visits) / child.visits))
            if uct_value > best_value:
                best_value = uct_value
                best_child = child
        
        return best_child
```

### 5. Event System (`src/engine/event_system.py`)

```python
from enum import Enum
from typing import Dict, List, Callable, Any
from dataclasses import dataclass

class GameEvent(Enum):
    GAME_START = "game_start"
    GAME_END = "game_end"
    TURN_START = "turn_start"
    TURN_END = "turn_end"
    DICE_ROLLED = "dice_rolled"
    RESOURCE_GAINED = "resource_gained"
    BUILDING_PLACED = "building_placed"
    TRADE_COMPLETED = "trade_completed"
    ROBBER_MOVED = "robber_moved"
    CARD_PLAYED = "card_played"

@dataclass
class Event:
    type: GameEvent
    data: Any
    timestamp: float

class EventBus:
    """Central event system for decoupling"""
    
    def __init__(self):
        self._handlers: Dict[GameEvent, List[Callable]] = {}
        self._history: List[Event] = []
    
    def subscribe(self, event_type: GameEvent, handler: Callable):
        """Subscribe to an event"""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)
    
    def emit(self, event_type: GameEvent, data: Any = None):
        """Emit an event"""
        import time
        event = Event(event_type, data, time.time())
        self._history.append(event)
        
        if event_type in self._handlers:
            for handler in self._handlers[event_type]:
                handler(event)
    
    def get_history(self) -> List[Event]:
        """Get event history for replay"""
        return self._history.copy()
```

### 6. Performance Optimization (`src/utils/cache.py`)

```python
from functools import wraps, lru_cache
from typing import Callable, Any
import hashlib
import pickle

class Cache:
    """Advanced caching system"""
    
    def __init__(self):
        self._cache = {}
        self._hits = 0
        self._misses = 0
    
    @staticmethod
    def memoize(maxsize: int = 128):
        """Decorator for memoization"""
        def decorator(func: Callable) -> Callable:
            cache = lru_cache(maxsize=maxsize)
            cached_func = cache(func)
            
            @wraps(func)
            def wrapper(*args, **kwargs):
                return cached_func(*args, **kwargs)
            
            wrapper.cache_info = cached_func.cache_info
            wrapper.cache_clear = cached_func.cache_clear
            return wrapper
        return decorator
    
    @staticmethod
    def cached_property(func: Callable) -> property:
        """Cached property decorator"""
        attr_name = f'_cached_{func.__name__}'
        
        @wraps(func)
        def wrapper(self):
            if not hasattr(self, attr_name):
                setattr(self, attr_name, func(self))
            return getattr(self, attr_name)
        
        return property(wrapper)

# Usage example
class Board:
    @Cache.cached_property
    def longest_possible_road(self) -> int:
        """Expensive calculation, cached after first call"""
        # Complex graph traversal
        return self._calculate_longest_road()
```

## 🔄 Dependency Injection و IoC Container

```python
# src/core/container.py
from typing import Dict, Type, Any, Callable

class DIContainer:
    """Dependency Injection Container"""
    
    def __init__(self):
        self._services: Dict[Type, Callable] = {}
        self._singletons: Dict[Type, Any] = {}
    
    def register(self, interface: Type, 
                factory: Callable, 
                singleton: bool = False):
        """Register a service"""
        self._services[interface] = (factory, singleton)
    
    def resolve(self, interface: Type) -> Any:
        """Resolve a service"""
        if interface not in self._services:
            raise ValueError(f"Service {interface} not registered")
        
        factory, is_singleton = self._services[interface]
        
        if is_singleton:
            if interface not in self._singletons:
                self._singletons[interface] = factory()
            return self._singletons[interface]
        
        return factory()

# Configuration
def configure_container() -> DIContainer:
    container = DIContainer()
    
    # Register services
    container.register(RuleEngine, 
                      lambda: RuleEngine(), 
                      singleton=True)
    container.register(EventBus, 
                      lambda: EventBus(), 
                      singleton=True)
    container.register(StateEvaluator,
                      lambda: StateEvaluator(),
                      singleton=True)
    
    return container
```

## 🧪 Testing Strategy

```python
# tests/unit/test_rules.py
import pytest
from src.core.models import Board, PlayerState
from src.core.rules import SettlementRule

class TestSettlementRule:
    @pytest.fixture
    def board(self):
        return create_test_board()
    
    @pytest.fixture
    def player(self):
        return PlayerState(id=0, name="Test")
    
    def test_distance_rule(self, board, player):
        """Test 2-edge distance requirement"""
        rule = SettlementRule()
        # Place first settlement
        player.settlements.add(10)
        
        # Adjacent node should be invalid
        assert not rule.can_build(board, player, 11, [player])
        
        # Two edges away should be valid
        assert rule.can_build(board, player, 15, [player])
    
    def test_initial_placement(self, board, player):
        """Test initial placement doesn't need road"""
        rule = SettlementRule()
        assert rule.can_build(board, player, 10, [player], 
                            initial_placement=True)
```

## 📊 Performance Monitoring

```python
# src/utils/profiler.py
import cProfile
import pstats
from contextlib import contextmanager
import time

class PerformanceMonitor:
    """Performance monitoring utilities"""
    
    @staticmethod
    @contextmanager
    def profile(sort_by='cumulative', limit=20):
        """Context manager for profiling"""
        profiler = cProfile.Profile()
        profiler.enable()
        
        try:
            yield
        finally:
            profiler.disable()
            stats = pstats.Stats(profiler)
            stats.sort_stats(sort_by)
            stats.print_stats(limit)
    
    @staticmethod
    @contextmanager
    def timer(name: str = "Operation"):
        """Context manager for timing"""
        start = time.perf_counter()
        try:
            yield
        finally:
            elapsed = time.perf_counter() - start
            print(f"{name} took {elapsed:.4f} seconds")

# Usage
with PerformanceMonitor.profile():
    game = GameController(config)
    game.run_simulation(1000)
```

## 🚀 مزایای این معماری

1. **Modularity**: هر ماژول مسئولیت مشخصی دارد
2. **Testability**: هر component به راحتی قابل تست است
3. **Extensibility**: افزودن قابلیت‌های جدید آسان است
4. **Performance**: Caching و optimization built-in
5. **Maintainability**: کد clean و قابل نگهداری
6. **Scalability**: آماده برای توسعه به سیستم‌های بزرگتر

## 📝 نحوه Migration

### Phase 1: Core Extraction (هفته 1)
1. Extract models به `src/core/models/`
2. Extract rules به `src/core/rules/`
3. Create unit tests

### Phase 2: Engine Refactoring (هفته 2)
1. Create GameController
2. Implement EventBus
3. Refactor game loop

### Phase 3: AI Modularization (هفته 3)
1. Extract bot implementations
2. Create strategy pattern
3. Implement MCTS properly

### Phase 4: GUI Separation (هفته 4)
1. Separate rendering logic
2. Create widget system
3. Implement MVC/MVP pattern

### Phase 5: Testing & Optimization (هفته 5)
1. Complete test coverage
2. Performance profiling
3. Optimization implementation

## 🎯 KPIs برای موفقیت

- Test Coverage > 80%
- Performance: 10x speedup
- Code Complexity: < 10 per method
- Module Coupling: < 0.3
- Documentation: 100% public APIs

این معماری به شما امکان می‌دهد که:
- کد را به تیم‌های مختلف تقسیم کنید
- CI/CD pipeline راه‌اندازی کنید
- به راحتی feature های جدید اضافه کنید
- Performance را monitor کنید
- کیفیت کد را تضمین کنید