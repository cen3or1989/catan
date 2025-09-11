#!/usr/bin/env python3
"""
Script to automatically refactor the monolithic catan_plus.py into modular architecture
"""

import os
import ast
import shutil
from pathlib import Path
from typing import Dict, List, Set

class CodeRefactorer:
    """Automated code refactoring tool"""
    
    def __init__(self, source_file: str, target_dir: str):
        self.source_file = source_file
        self.target_dir = Path(target_dir)
        self.source_code = open(source_file).read()
        self.tree = ast.parse(self.source_code)
        
    def analyze_dependencies(self) -> Dict[str, Set[str]]:
        """Analyze class and function dependencies"""
        dependencies = {}
        
        for node in ast.walk(self.tree):
            if isinstance(node, ast.ClassDef):
                deps = set()
                for child in ast.walk(node):
                    if isinstance(child, ast.Name):
                        deps.add(child.id)
                dependencies[node.name] = deps
        
        return dependencies
    
    def create_directory_structure(self):
        """Create the new modular directory structure"""
        
        directories = [
            "src",
            "src/core",
            "src/core/models",
            "src/core/rules", 
            "src/core/mechanics",
            "src/engine",
            "src/ai",
            "src/ai/mcts",
            "src/ai/strategies",
            "src/trading",
            "src/simulation",
            "src/visualization",
            "src/visualization/widgets",
            "src/io",
            "src/utils",
            "src/api",
            "tests",
            "tests/unit",
            "tests/integration",
            "tests/performance",
            "docs",
            "config",
            "scripts"
        ]
        
        for dir_path in directories:
            full_path = self.target_dir / dir_path
            full_path.mkdir(parents=True, exist_ok=True)
            
            # Create __init__.py files
            init_file = full_path / "__init__.py"
            if not init_file.exists():
                init_file.write_text('"""Package initialization"""\n')
    
    def extract_models(self):
        """Extract data models to separate files"""
        
        models_code = {
            'board.py': [],
            'player.py': [],
            'resources.py': [],
            'game_state.py': []
        }
        
        # Extract classes based on their purpose
        for node in self.tree.body:
            if isinstance(node, ast.ClassDef):
                if node.name in ['Hex', 'Board', 'Node', 'Edge']:
                    models_code['board.py'].append(ast.unparse(node))
                elif node.name == 'Player':
                    models_code['player.py'].append(ast.unparse(node))
                elif node.name == 'Game':
                    # This needs to be split into multiple components
                    pass
        
        # Write model files
        for filename, code_parts in models_code.items():
            if code_parts:
                file_path = self.target_dir / 'src' / 'core' / 'models' / filename
                imports = self._generate_imports(filename)
                content = imports + '\n\n' + '\n\n'.join(code_parts)
                file_path.write_text(content)
    
    def extract_rules(self):
        """Extract game rules to separate modules"""
        
        rules_template = '''"""Game rules module"""
from abc import ABC, abstractmethod
from typing import List, Set, Optional
from ..models import Board, Player

class RuleEngine:
    """Central rule validation engine"""
    
    def __init__(self):
        self.building_rules = BuildingRules()
        self.trading_rules = TradingRules()
        self.card_rules = CardRules()
    
    def validate_action(self, action, game_state):
        """Validate any game action"""
        # Implementation here
        pass

class BuildingRules:
    """Building placement and upgrade rules"""
    
    def can_build_settlement(self, board: Board, player: Player, 
                           node_id: int, all_players: List[Player]) -> bool:
        """Check if settlement can be built at location"""
        # Extract logic from original code
        pass
    
    def can_build_road(self, board: Board, player: Player,
                      edge: tuple, all_players: List[Player]) -> bool:
        """Check if road can be built on edge"""
        # Extract logic from original code
        pass
'''
        
        file_path = self.target_dir / 'src' / 'core' / 'rules' / 'rule_engine.py'
        file_path.write_text(rules_template)
    
    def extract_ai_bots(self):
        """Extract AI bot implementations"""
        
        # Base bot interface
        base_bot_template = '''"""Base AI bot interface"""
from abc import ABC, abstractmethod
from typing import List, Optional
from ..core.models import Board, Player

class BaseBot(ABC):
    """Abstract base class for AI bots"""
    
    def __init__(self, player_id: int, name: str):
        self.player_id = player_id
        self.name = name
    
    @abstractmethod
    def choose_initial_settlement(self, game, player, others):
        """Choose initial settlement placement"""
        pass
    
    @abstractmethod
    def choose_initial_road(self, game, player, others, from_node):
        """Choose initial road placement"""
        pass
    
    @abstractmethod
    def turn_actions(self, game, player, others):
        """Execute turn actions"""
        pass
'''
        
        base_path = self.target_dir / 'src' / 'ai' / 'base_bot.py'
        base_path.write_text(base_bot_template)
        
        # Extract HeuristicBot and MCTSBot
        for node in self.tree.body:
            if isinstance(node, ast.ClassDef):
                if node.name == 'HeuristicBot':
                    heuristic_path = self.target_dir / 'src' / 'ai' / 'heuristic_bot.py'
                    heuristic_path.write_text(f"from .base_bot import BaseBot\n\n{ast.unparse(node)}")
                elif node.name == 'MCTSBot':
                    mcts_path = self.target_dir / 'src' / 'ai' / 'mcts' / 'mcts_bot.py'
                    mcts_path.write_text(f"from ..base_bot import BaseBot\n\n{ast.unparse(node)}")
    
    def create_game_controller(self):
        """Create the main game controller"""
        
        controller_template = '''"""Main game controller"""
from typing import List, Optional
from ..core.models import Board, Player
from ..core.rules import RuleEngine
from .event_system import EventBus
from .turn_manager import TurnManager

class GameController:
    """Orchestrates the game flow"""
    
    def __init__(self, config: dict):
        self.config = config
        self.board = self._initialize_board()
        self.players = self._initialize_players()
        self.rule_engine = RuleEngine()
        self.event_bus = EventBus()
        self.turn_manager = TurnManager(self.players)
        
        # Game state
        self.turn = 0
        self.current_player_idx = 0
        self.game_over = False
        
    def _initialize_board(self) -> Board:
        """Initialize game board"""
        # Extract from make_standard_board function
        pass
    
    def _initialize_players(self) -> List[Player]:
        """Initialize players"""
        # Extract from Game.__init__
        pass
    
    def play_game(self):
        """Main game loop"""
        self.setup_initial_placements()
        
        while not self.game_over:
            self.play_turn()
            self.check_victory_conditions()
            self.turn += 1
        
        return self.get_winner()
    
    def play_turn(self):
        """Execute one game turn"""
        player = self.players[self.current_player_idx]
        
        # Roll dice
        dice_result = self.roll_dice()
        
        if dice_result == 7:
            self.handle_robber(player)
        else:
            self.distribute_resources(dice_result)
        
        # Player actions
        self.process_player_actions(player)
        
        # Update special cards
        self.update_special_cards()
        
        # Next player
        self.current_player_idx = (self.current_player_idx + 1) % len(self.players)
'''
        
        controller_path = self.target_dir / 'src' / 'engine' / 'game_controller.py'
        controller_path.write_text(controller_template)
    
    def create_test_suite(self):
        """Create initial test suite"""
        
        test_template = '''"""Unit tests for game rules"""
import pytest
from src.core.models import Board, Player
from src.core.rules import RuleEngine

class TestBuildingRules:
    @pytest.fixture
    def board(self):
        """Create test board"""
        # Create minimal board for testing
        pass
    
    @pytest.fixture
    def player(self):
        """Create test player"""
        return Player(id=0, name="Test Player")
    
    def test_settlement_distance_rule(self, board, player):
        """Test that settlements must be 2 edges apart"""
        rule_engine = RuleEngine()
        
        # Place first settlement
        player.settlements.add(10)
        
        # Adjacent node should be invalid
        assert not rule_engine.building_rules.can_build_settlement(
            board, player, 11, [player]
        )
        
        # Two edges away should be valid
        assert rule_engine.building_rules.can_build_settlement(
            board, player, 15, [player]
        )
    
    def test_road_cannot_pass_through_opponent_settlement(self, board):
        """Test road blocking by opponent settlements"""
        player1 = Player(id=0, name="Player 1")
        player2 = Player(id=1, name="Player 2") 
        
        # Place opponent settlement
        player2.settlements.add(10)
        
        # Road through that node should be blocked
        rule_engine = RuleEngine()
        assert not rule_engine.building_rules.can_build_road(
            board, player1, (9, 10), [player1, player2]
        )

class TestResourceDistribution:
    def test_dice_probability_weights(self):
        """Test dice roll probabilities"""
        from src.core.mechanics import DICE_WEIGHTS
        
        # Sum should be 36 (6x6 combinations)
        assert sum(DICE_WEIGHTS.values()) == 36
        
        # 7 should be most common
        assert DICE_WEIGHTS[7] == 6
        
        # 2 and 12 should be least common
        assert DICE_WEIGHTS[2] == 1
        assert DICE_WEIGHTS[12] == 1
'''
        
        test_path = self.target_dir / 'tests' / 'unit' / 'test_rules.py'
        test_path.write_text(test_template)
    
    def create_config_files(self):
        """Create configuration files"""
        
        # Default game configuration
        config_yaml = '''# Default game configuration
game:
  victory_points: 10
  max_turns: 300
  num_players: 2
  
board:
  type: standard
  seed: 42
  
ai:
  default_bot: heuristic
  mcts:
    iterations: 1000
    exploration_constant: 1.414
    beam_width: 6
    max_depth: 3
  
simulation:
  parallel_processes: 8
  batch_size: 100
  
logging:
  level: INFO
  file: game.log
'''
        
        config_path = self.target_dir / 'config' / 'default.yaml'
        config_path.write_text(config_yaml)
        
        # Requirements file
        requirements = '''# Core dependencies
dataclasses>=0.6
typing>=3.7

# GUI
tkinter>=8.6
ttkbootstrap>=1.10.0

# Image processing
Pillow>=9.0.0
opencv-python>=4.5.0
qrcode>=7.3.0

# Testing
pytest>=7.0.0
pytest-cov>=3.0.0
pytest-mock>=3.6.0

# Performance
numpy>=1.20.0
numba>=0.55.0

# Development
black>=22.0.0
flake8>=4.0.0
mypy>=0.950
'''
        
        req_path = self.target_dir / 'requirements.txt'
        req_path.write_text(requirements)
    
    def create_main_entry_point(self):
        """Create main entry point for the application"""
        
        main_template = '''#!/usr/bin/env python3
"""Main entry point for Catan simulation"""

import argparse
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.engine.game_controller import GameController
from src.simulation.simulator import Simulator
from src.visualization.gui_app import GUIApp

def main():
    parser = argparse.ArgumentParser(description='Catan Plus Simulation')
    parser.add_argument('--mode', choices=['gui', 'simulate', 'play'],
                       default='gui', help='Execution mode')
    parser.add_argument('--config', type=str, default='config/default.yaml',
                       help='Configuration file')
    parser.add_argument('--games', type=int, default=100,
                       help='Number of games to simulate')
    parser.add_argument('--seed', type=int, default=42,
                       help='Random seed')
    
    args = parser.parse_args()
    
    if args.mode == 'gui':
        app = GUIApp(config_file=args.config)
        app.run()
    elif args.mode == 'simulate':
        sim = Simulator(config_file=args.config)
        results = sim.run_simulations(args.games, seed=args.seed)
        print(f"Simulation complete: {results}")
    else:
        controller = GameController(config_file=args.config)
        controller.play_game()

if __name__ == '__main__':
    main()
'''
        
        main_path = self.target_dir / 'main.py'
        main_path.write_text(main_template)
        main_path.chmod(0o755)  # Make executable
    
    def _generate_imports(self, module_name: str) -> str:
        """Generate appropriate imports for a module"""
        
        base_imports = [
            "from dataclasses import dataclass, field",
            "from typing import Dict, List, Set, Tuple, Optional, Counter",
            "from enum import Enum",
            "import math",
            "import random"
        ]
        
        return '\n'.join(base_imports) + '\n'
    
    def refactor(self):
        """Execute the complete refactoring"""
        
        print("🚀 Starting refactoring process...")
        
        # Step 1: Create directory structure
        print("📁 Creating directory structure...")
        self.create_directory_structure()
        
        # Step 2: Analyze dependencies
        print("🔍 Analyzing code dependencies...")
        deps = self.analyze_dependencies()
        
        # Step 3: Extract components
        print("📦 Extracting models...")
        self.extract_models()
        
        print("📋 Extracting rules...")
        self.extract_rules()
        
        print("🤖 Extracting AI bots...")
        self.extract_ai_bots()
        
        print("🎮 Creating game controller...")
        self.create_game_controller()
        
        # Step 4: Create supporting files
        print("🧪 Creating test suite...")
        self.create_test_suite()
        
        print("⚙️ Creating configuration files...")
        self.create_config_files()
        
        print("🚪 Creating entry point...")
        self.create_main_entry_point()
        
        print("✅ Refactoring complete!")
        print(f"📍 New structure created at: {self.target_dir}")
        
        # Generate summary report
        self.generate_report(deps)
    
    def generate_report(self, dependencies):
        """Generate refactoring report"""
        
        report = f"""
# Refactoring Report

## Summary
- Source file: {self.source_file}
- Target directory: {self.target_dir}
- Classes found: {len([n for n in self.tree.body if isinstance(n, ast.ClassDef)])}
- Functions found: {len([n for n in self.tree.body if isinstance(n, ast.FunctionDef)])}

## Dependencies Analysis
{dependencies}

## Next Steps
1. Review generated code structure
2. Run tests: `pytest tests/`
3. Fix any import issues
4. Add missing implementations
5. Optimize performance-critical sections

## Commands
- Run tests: `pytest tests/ -v`
- Run GUI: `python main.py --mode gui`
- Run simulation: `python main.py --mode simulate --games 1000`
"""
        
        report_path = self.target_dir / 'REFACTORING_REPORT.md'
        report_path.write_text(report)
        print(f"\n📄 Report saved to: {report_path}")


if __name__ == "__main__":
    # Run the refactoring
    refactorer = CodeRefactorer(
        source_file="catan_plus.py",
        target_dir="catan_modular"
    )
    refactorer.refactor()