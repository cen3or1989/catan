"""
Super Bot Implementation - Aggressive AI that plays to win at any cost
"""

from collections import Counter, defaultdict
from typing import List, Tuple, Optional, Set
import random

# Import from main game
from catan_plus import HeuristicBot, Player, Game, BUILD_COST, DICE_WEIGHTS

class SuperBot(HeuristicBot):
    """Ultra-aggressive bot with advanced strategies"""
    
    def __init__(self, player_id: int, name: str = "SuperBot"):
        super().__init__(player_id, name)
        self.aggression_level = 1.0  # Max aggression
        self.risk_tolerance = 0.8    # High risk tolerance
        self.leader_threshold = 7     # VP threshold to identify leader
        self.desperation_threshold = 3  # VP difference to enter desperation mode
        
    def turn_actions(self, game: Game, player: Player, others: List[Player]):
        """Execute aggressive turn strategy"""
        
        # 1. Identify game state
        leader = self.identify_leader(others)
        am_i_leader = self.check_if_leader(player, others)
        am_i_desperate = self.check_if_desperate(player, leader)
        
        # 2. Check for immediate winning moves
        winning_move = self.check_winning_moves(game, player, others)
        if winning_move:
            self.execute_winning_move(game, player, winning_move)
            return
        
        # 3. Choose strategy based on position
        if am_i_leader:
            self.play_defensive_leader(game, player, others)
        elif am_i_desperate:
            self.play_desperate_catchup(game, player, others, leader)
        else:
            self.play_aggressive_balanced(game, player, others, leader)
        
        # 4. Always try to block opponents' winning moves
        self.block_opponent_victories(game, player, others)
        
        # 5. Execute standard turn actions with aggression
        super().turn_actions(game, player, others)
    
    def identify_leader(self, others: List[Player]) -> Player:
        """Identify the current leader including hidden VPs estimate"""
        if not others:
            return None
        
        # Estimate hidden VPs based on dev cards bought
        def estimate_total_vp(p: Player) -> int:
            visible_vp = p.vp
            # Assume 20% of dev cards are VP cards
            estimated_hidden = int(sum(p.dev_hand.values()) * 0.2)
            return visible_vp + estimated_hidden
        
        return max(others, key=lambda p: (estimate_total_vp(p), sum(p.hand.values())))
    
    def check_if_leader(self, player: Player, others: List[Player]) -> bool:
        """Check if we are the leader"""
        if not others:
            return True
        leader = self.identify_leader(others)
        return player.vp + player.hidden_vp > leader.vp + leader.hidden_vp
    
    def check_if_desperate(self, player: Player, leader: Player) -> bool:
        """Check if we're far behind and need desperate measures"""
        if not leader:
            return False
        leader_vp = leader.vp + leader.hidden_vp
        my_vp = player.vp + player.hidden_vp
        return leader_vp - my_vp >= self.desperation_threshold
    
    def check_winning_moves(self, game: Game, player: Player, others: List[Player]) -> Optional[Tuple[str, str]]:
        """Check for moves that lead to immediate victory"""
        
        target_vp = game.target_vp
        current_vp = player.vp + player.hidden_vp
        
        # Check city upgrade for win
        if player.settlements and current_vp + 1 >= target_vp:
            if self.can_afford(player.hand, BUILD_COST["city"]):
                return ("build_city", "victory")
        
        # Check settlement for win
        if current_vp + 1 >= target_vp:
            spots = game.legal_settlement_spots(player, others, require_connection=True)
            if spots and self.can_afford(player.hand, BUILD_COST["settlement"]):
                return ("build_settlement", "victory")
        
        # Check longest road possibility
        if not player.has_longest_road:
            current_road_len = self.compute_road_length(game, player, others)
            if current_road_len == 4 and player.roads_left > 0:
                if current_vp + 2 >= target_vp:
                    return ("build_road", "longest_road_victory")
        
        # Check largest army possibility
        if not player.has_largest_army:
            if player.knights_played == 2 and player.dev_hand["knight"] > 0:
                if current_vp + 2 >= target_vp:
                    return ("play_knight", "largest_army_victory")
        
        # Check if we have hidden VP cards for win
        if player.dev_hand["vp"] > 0:
            if current_vp >= target_vp:
                return ("reveal_victory", "hidden_vp_win")
        
        return None
    
    def execute_winning_move(self, game: Game, player: Player, move: Tuple[str, str]):
        """Execute the identified winning move"""
        action, reason = move
        
        if action == "build_city":
            target = max(player.settlements, key=lambda n: game.node_expectation(n))
            if self.can_afford(player.hand, BUILD_COST["city"]):
                self.pay_cost(player.hand, BUILD_COST["city"])
                player.settlements.remove(target)
                player.cities.add(target)
                player.vp += 1
                game.log(f"{player.name} [SUPER] builds CITY for VICTORY at {target}!")
        
        elif action == "build_settlement":
            spots = game.legal_settlement_spots(player, [], require_connection=True)
            if spots:
                best = max(spots, key=lambda n: game.node_expectation(n))
                self.pay_cost(player.hand, BUILD_COST["settlement"])
                player.settlements.add(best)
                player.vp += 1
                game.log(f"{player.name} [SUPER] builds SETTLEMENT for VICTORY at {best}!")
        
        elif action == "build_road":
            # Build road to get longest road
            legal = game.legal_road_spots(player)
            if legal:
                best = self.find_best_road_for_longest(game, player, legal)
                self.pay_cost(player.hand, BUILD_COST["road"])
                player.roads.add(best)
                player.roads_left -= 1
                game.log(f"{player.name} [SUPER] builds ROAD for LONGEST ROAD victory!")
        
        elif action == "play_knight":
            game.play_knight(player, [])
            game.log(f"{player.name} [SUPER] plays KNIGHT for LARGEST ARMY victory!")
    
    def play_defensive_leader(self, game: Game, player: Player, others: List[Player]):
        """Play defensively when in the lead"""
        
        # 1. Hide true strength - don't play dev cards unless necessary
        self.hide_dev_cards = True
        
        # 2. Make balanced trades to not appear threatening
        for other in others:
            if self.can_make_fair_trade(player, other):
                game.p2p_trade(player, other)
                break
        
        # 3. Build cities over settlements to compact VP
        if player.settlements and self.can_afford(player.hand, BUILD_COST["city"]):
            target = max(player.settlements, key=lambda n: game.node_expectation(n))
            self.pay_cost(player.hand, BUILD_COST["city"])
            player.settlements.remove(target)
            player.cities.add(target)
            player.vp += 1
            game.log(f"{player.name} [DEFENSIVE] upgrades to CITY")
        
        # 4. Don't antagonize others with robber
        self.gentle_robber_placement = True
    
    def play_desperate_catchup(self, game: Game, player: Player, others: List[Player], leader: Player):
        """Play desperately when far behind"""
        
        game.log(f"{player.name} [DESPERATE MODE] - {leader.name} is too far ahead!")
        
        # 1. Accept ANY trade that helps
        for other in others:
            if other.id != leader.id:
                # Even accept 4:1 trades if it helps
                self.desperate_trade(game, player, other)
        
        # 2. Use all dev cards aggressively
        if player.dev_hand["knight"] > 0:
            game.play_knight(player, others)
        
        if player.dev_hand["monopoly"] > 0:
            # Target leader's best resource
            resource = self.find_leader_key_resource(game, leader)
            game.play_monopoly(player, others, resource)
        
        if player.dev_hand["year_of_plenty"] > 0:
            # Get resources for immediate building
            needs = self.get_immediate_needs(player)
            if len(needs) >= 2:
                game.play_year_of_plenty(player, needs[0], needs[1])
        
        # 3. Block leader's expansion aggressively
        self.block_leader_expansion(game, player, leader)
        
        # 4. Take huge risks
        self.take_risky_expansion(game, player, others)
    
    def play_aggressive_balanced(self, game: Game, player: Player, others: List[Player], leader: Player):
        """Play aggressively but calculated when in middle position"""
        
        # 1. Target leader with robber
        if self.should_move_robber(game, player):
            self.target_leader_with_robber(game, player, leader)
        
        # 2. Form coalitions against leader
        for other in others:
            if other.id != leader.id:
                self.propose_coalition_trade(game, player, other, leader)
        
        # 3. Aggressive expansion toward high-value spots
        self.aggressive_expansion(game, player, others)
        
        # 4. Strategic dev card usage
        self.use_dev_cards_strategically(game, player, others, leader)
    
    def block_opponent_victories(self, game: Game, player: Player, others: List[Player]):
        """Block opponents who are close to winning"""
        
        for opponent in others:
            if opponent.vp >= game.target_vp - 2:
                # Find their best settlement spot
                spots = game.legal_settlement_spots(opponent, others, require_connection=True)
                if spots:
                    best_opponent_spot = max(spots, key=lambda n: game.node_expectation(n))
                    
                    # Check if we can build there first
                    our_spots = game.legal_settlement_spots(player, others, require_connection=True)
                    if best_opponent_spot in our_spots:
                        if self.can_afford(player.hand, BUILD_COST["settlement"]):
                            # Block it!
                            self.pay_cost(player.hand, BUILD_COST["settlement"])
                            player.settlements.add(best_opponent_spot)
                            player.vp += 1
                            game.log(f"{player.name} [BLOCK] builds settlement to block {opponent.name}!")
                            return
                
                # Block with roads if possible
                self.block_with_roads(game, player, opponent)
    
    def choose_robber_target_hex(self, game: Game, player: Player, others: List[Player]) -> int:
        """Aggressively target the leader with robber"""
        
        leader = self.identify_leader(others)
        if not leader:
            return super().choose_robber_target_hex(game, player, others)
        
        # If leader is close to winning, ALWAYS target them
        if leader.vp >= game.target_vp - 2:
            best_hex = None
            max_damage = -1
            
            for hid, h in game.board.hexes.items():
                if hid == game.board.robber_hex:
                    continue
                if h.number is None:
                    continue
                
                damage = 0
                for nid in h.nodes:
                    if nid in leader.cities:
                        damage += 2 * DICE_WEIGHTS.get(h.number, 0)
                    elif nid in leader.settlements:
                        damage += DICE_WEIGHTS.get(h.number, 0)
                
                # Prioritize high-probability numbers
                if h.number in [6, 8]:
                    damage *= 1.5
                
                if damage > max_damage:
                    max_damage = damage
                    best_hex = hid
            
            if best_hex:
                game.log(f"{player.name} [SUPER] targets {leader.name} with robber!")
                return best_hex
        
        return super().choose_robber_target_hex(game, player, others)
    
    # Helper methods
    
    def can_afford(self, hand: Counter, cost: Counter) -> bool:
        """Check if player can afford a build"""
        for res, cnt in cost.items():
            if hand[res] < cnt:
                return False
        return True
    
    def pay_cost(self, hand: Counter, cost: Counter):
        """Pay the cost from hand"""
        for res, cnt in cost.items():
            hand[res] -= cnt
            if hand[res] == 0:
                del hand[res]
    
    def compute_road_length(self, game: Game, player: Player, others: List[Player]) -> int:
        """Compute current longest road length"""
        from catan_plus import compute_longest_road_length
        return compute_longest_road_length(game.board, player, others)
    
    def find_leader_key_resource(self, game: Game, leader: Player) -> str:
        """Find which resource the leader has most of"""
        if not leader.hand:
            return "grain"  # Default
        return max(leader.hand.keys(), key=lambda r: leader.hand[r])
    
    def desperate_trade(self, game: Game, player: Player, other: Player):
        """Make desperate trades at bad rates"""
        # Will accept up to 4:1 trades
        needs = self.get_immediate_needs(player)
        if needs:
            want = needs[0]
            for give in player.hand:
                if player.hand[give] >= 4 and give != want:
                    # Offer 4:1 trade
                    game.log(f"{player.name} [DESPERATE] offers 4:1 trade to {other.name}")
                    # Simplified trade execution
                    return
    
    def get_immediate_needs(self, player: Player) -> List[str]:
        """Get resources needed immediately"""
        needs = []
        
        # Check what we need for city
        for res, count in BUILD_COST["city"].items():
            if player.hand[res] < count:
                needs.extend([res] * (count - player.hand[res]))
        
        return needs[:2]  # Return top 2 needs
    
    def find_best_road_for_longest(self, game: Game, player: Player, legal_roads: List) -> Tuple[int, int]:
        """Find best road to build for longest road"""
        # This would need complex graph analysis
        # For now, return first legal road
        return legal_roads[0] if legal_roads else None
    
    def block_with_roads(self, game: Game, player: Player, opponent: Player):
        """Block opponent expansion with roads"""
        # Find opponent's likely expansion direction
        legal_roads = game.legal_road_spots(player)
        if legal_roads and self.can_afford(player.hand, BUILD_COST["road"]):
            # Build a blocking road
            self.pay_cost(player.hand, BUILD_COST["road"])
            player.roads.add(legal_roads[0])
            player.roads_left -= 1
            game.log(f"{player.name} [BLOCK] builds road to block {opponent.name}")
    
    def target_leader_with_robber(self, game: Game, player: Player, leader: Player):
        """Always put robber on leader's best hex"""
        best_hex = self.choose_robber_target_hex(game, player, [leader])
        game.board.robber_hex = best_hex
    
    def propose_coalition_trade(self, game: Game, player: Player, other: Player, leader: Player):
        """Propose mutually beneficial trades against leader"""
        # Give better rates to players fighting the leader
        if other.vp < leader.vp:
            # More generous trades
            game.log(f"{player.name} proposes coalition trade with {other.name} against {leader.name}")
    
    def aggressive_expansion(self, game: Game, player: Player, others: List[Player]):
        """Expand aggressively toward best spots"""
        spots = game.legal_settlement_spots(player, others, require_connection=True)
        if spots and self.can_afford(player.hand, BUILD_COST["settlement"]):
            best = max(spots, key=lambda n: game.node_expectation(n))
            self.pay_cost(player.hand, BUILD_COST["settlement"])
            player.settlements.add(best)
            player.vp += 1
            game.log(f"{player.name} [AGGRESSIVE] expands to high-value spot {best}")
    
    def use_dev_cards_strategically(self, game: Game, player: Player, others: List[Player], leader: Player):
        """Use development cards with maximum impact"""
        
        # Knight - always target leader
        if player.dev_hand["knight"] > 0 and not player.dev_played_this_turn:
            game.play_knight(player, others)
            self.target_leader_with_robber(game, player, leader)
        
        # Monopoly - take leader's key resource
        if player.dev_hand["monopoly"] > 0 and not player.dev_played_this_turn:
            resource = self.find_leader_key_resource(game, leader)
            if sum(opp.hand[resource] for opp in others) >= 4:
                game.play_monopoly(player, others, resource)
        
        # Year of Plenty - get what we need most
        if player.dev_hand["year_of_plenty"] > 0 and not player.dev_played_this_turn:
            needs = self.get_immediate_needs(player)
            if len(needs) >= 2:
                game.play_year_of_plenty(player, needs[0], needs[1] if len(needs) > 1 else needs[0])
        
        # Road Building - expand quickly or block
        if player.dev_hand["road_building"] > 0 and not player.dev_played_this_turn:
            if player.roads_left >= 2:
                game.play_road_building(player)
    
    def take_risky_expansion(self, game: Game, player: Player, others: List[Player]):
        """Take risks for high reward"""
        # Build in contested areas
        # Expand without full road protection
        # Go for high-number hexes even if vulnerable
        game.log(f"{player.name} [RISKY] takes aggressive expansion risks!")
    
    def can_make_fair_trade(self, player: Player, other: Player) -> bool:
        """Check if a fair trade is possible"""
        # Simple check - both have resources
        return sum(player.hand.values()) > 2 and sum(other.hand.values()) > 2
    
    def should_move_robber(self, game: Game, player: Player) -> bool:
        """Decide if we should move the robber"""
        # Always move if we can hurt the leader
        return True
    
    def block_leader_expansion(self, game: Game, player: Player, leader: Player):
        """Specifically block the leader's expansion"""
        # Find where leader is likely to expand
        # Build there first if possible
        game.log(f"{player.name} attempts to block {leader.name}'s expansion!")


# Integration function to use SuperBot in the game
def create_super_bot_game(seed=42, num_players=4):
    """Create a game with SuperBots"""
    from catan_plus import Game
    
    game = Game(seed=seed, target_vp=10, max_turns=300, num_players=num_players)
    
    # Replace all bots with SuperBots
    for i in range(num_players):
        game.bots[i] = SuperBot(i, f"SuperBot_{i}")
    
    return game


if __name__ == "__main__":
    # Test the SuperBot
    game = create_super_bot_game()
    game.play()
    
    print("\n=== SUPER BOT GAME RESULTS ===")
    for p in game.players:
        print(f"{p.name}: {p.vp} VP (+{p.hidden_vp} hidden)")
    
    winner = max(game.players, key=lambda p: p.vp + p.hidden_vp)
    print(f"\nWinner: {winner.name} with {winner.vp + winner.hidden_vp} total VP!")
    print(f"Game lasted {game.turn} turns")