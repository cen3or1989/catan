#!/usr/bin/env python3
"""
اسکریپت برای اضافه کردن Super Bot به کد اصلی بدون خراب کردن
این فایل Super Bot را به catan_plus.py اضافه می‌کند
"""

def integrate_super_bot():
    """
    اضافه کردن کلاس SuperBot به انتهای فایل catan_plus.py
    """
    
    # کد Super Bot که باید اضافه شود
    super_bot_code = '''

# ============= SUPER BOT ADDITION =============
# این کد در تاریخ {date} اضافه شد
# Super Bot: یک AI تهاجمی که برای برد هر کاری می‌کند

class SuperBot(HeuristicBot):
    """Ultra-aggressive bot that plays to win at any cost"""
    
    def __init__(self, player_id: int, name: str = "SuperBot"):
        super().__init__(player_id, name)
        self.aggression_level = 1.0
        self.risk_tolerance = 0.8
    
    def turn_actions(self, game, player, others):
        """Execute aggressive turn strategy"""
        
        # 1. Check for winning moves first
        if self.check_winning_move(game, player):
            return super().turn_actions(game, player, others)
        
        # 2. Identify and target the leader
        leader = self.identify_leader(others)
        if leader and leader.vp >= game.target_vp - 2:
            self.aggressive_mode = True
        
        # 3. Execute base strategy with aggression
        result = super().turn_actions(game, player, others)
        
        # 4. Additional aggressive actions
        self.aggressive_trades(game, player, others)
        self.block_leader(game, player, leader)
        
        return result
    
    def identify_leader(self, others):
        """Identify current leader including hidden VP estimate"""
        if not others:
            return None
        return max(others, key=lambda p: (
            p.vp + p.hidden_vp + int(sum(p.dev_hand.values()) * 0.2),
            sum(p.hand.values())
        ))
    
    def check_winning_move(self, game, player):
        """Check if we can win this turn"""
        target_vp = game.target_vp
        current_vp = player.vp + player.hidden_vp
        
        # Can we win with a city?
        if player.settlements and current_vp + 1 >= target_vp:
            if can_afford(player.hand, BUILD_COST["city"]):
                return True
        
        # Can we win with a settlement?
        if current_vp + 1 >= target_vp:
            spots = game.legal_settlement_spots(player, [], True)
            if spots and can_afford(player.hand, BUILD_COST["settlement"]):
                return True
        
        return False
    
    def choose_robber_target_hex(self, game, player, others):
        """Aggressively target the leader with robber"""
        
        leader = self.identify_leader(others)
        if not leader:
            return super().choose_robber_target_hex(game, player, others)
        
        # If leader is close to winning, ALWAYS target them
        if leader.vp >= game.target_vp - 2:
            best_hex = None
            max_damage = -1
            
            for hid, h in game.board.hexes.items():
                if hid == game.board.robber_hex or h.number is None:
                    continue
                
                damage = 0
                leader_presence = False
                
                for nid in h.nodes:
                    if nid in leader.cities:
                        damage += 2 * DICE_WEIGHTS.get(h.number, 0)
                        leader_presence = True
                    elif nid in leader.settlements:
                        damage += DICE_WEIGHTS.get(h.number, 0)
                        leader_presence = True
                
                # Prioritize 6 and 8
                if h.number in [6, 8] and leader_presence:
                    damage *= 1.5
                
                if damage > max_damage:
                    max_damage = damage
                    best_hex = hid
            
            if best_hex:
                return best_hex
        
        # Otherwise use parent strategy
        return super().choose_robber_target_hex(game, player, others)
    
    def aggressive_trades(self, game, player, others):
        """Make aggressive trades to catch up"""
        # Try desperate trades if behind
        leader = self.identify_leader(others)
        if leader and player.vp < leader.vp - 2:
            # Accept worse trade rates
            for other in others:
                if other.id != leader.id:
                    # Try to trade even at bad rates
                    game.p2p_trade(player, other)
    
    def block_leader(self, game, player, leader):
        """Try to block leader's expansion"""
        if not leader or leader.vp < game.target_vp - 2:
            return
        
        # Find leader's likely settlement spots
        leader_spots = game.legal_settlement_spots(leader, others, True)
        our_spots = game.legal_settlement_spots(player, others, True)
        
        # Find overlap - spots we can both build
        blocking_spots = set(leader_spots) & set(our_spots)
        
        if blocking_spots and can_afford(player.hand, BUILD_COST["settlement"]):
            # Prioritize blocking over our own best spot
            best_block = max(blocking_spots, key=lambda n: game.node_expectation(n))
            # This will be built in the normal turn_actions
            self.priority_settlement = best_block
    
    def best_trade_to_target(self, game, player, target_cost):
        """More aggressive trading - accept worse rates"""
        need = Counter({r:max(0, c - player.hand[r]) for r,c in target_cost.items()})
        if sum(need.values()) == 0:
            return False
        
        # Try up to 3 trades (more aggressive)
        for _ in range(3):
            wants = [r for r,c in need.items() for _ in range(c)]
            if not wants:
                break
            want = wants[0]
            
            best_give = None
            best_score = -1
            best_rate = None
            
            for r,c in list(player.hand.items()):
                if r == want:
                    continue
                rate = game.best_trade_rate(player, r)
                
                # SUPER BOT: Accept even 4:1 trades if desperate
                if hasattr(self, 'aggressive_mode') and self.aggressive_mode:
                    rate = min(rate, 4)  # Cap at 4:1
                
                if c >= rate and rate <= 4:
                    score = (10 - rate) * 10 + c
                    if score > best_score:
                        best_score = score
                        best_give = r
                        best_rate = rate
            
            if best_give is None:
                break
            
            player.hand[best_give] -= best_rate
            if player.hand[best_give] == 0:
                del player.hand[best_give]
            player.hand[want] += 1
            game.log(f"{player.name} [SUPER] trades {best_rate}:1 - gives {best_rate} {best_give} for 1 {want}")
            game.snapshot(f"{player.name} aggressive trade")
            
            need = Counter({r:max(0, target_cost[r] - player.hand[r]) for r in target_cost})
            if sum(need.values()) == 0:
                return True
        
        return sum(need.values()) == 0

# ============= END OF SUPER BOT =============
'''
    
    # خواندن فایل اصلی
    with open('catan_plus.py', 'r', encoding='utf-8') as f:
        original_code = f.read()
    
    # چک کردن که آیا قبلاً اضافه شده
    if 'class SuperBot' in original_code:
        print("⚠️  SuperBot قبلاً به کد اضافه شده است!")
        return False
    
    # اضافه کردن به انتهای فایل
    from datetime import datetime
    super_bot_code = super_bot_code.format(date=datetime.now().strftime("%Y-%m-%d %H:%M"))
    
    # ذخیره نسخه backup
    with open('catan_plus_backup.py', 'w', encoding='utf-8') as f:
        f.write(original_code)
    print("💾 Backup saved to: catan_plus_backup.py")
    
    # اضافه کردن SuperBot
    with open('catan_plus.py', 'w', encoding='utf-8') as f:
        f.write(original_code)
        f.write(super_bot_code)
    
    print("✅ SuperBot به catan_plus.py اضافه شد!")
    return True


def create_example_usage():
    """ساخت فایل نمونه برای استفاده از SuperBot"""
    
    example_code = '''#!/usr/bin/env python3
"""
نمونه استفاده از SuperBot در کد اصلی
"""

from catan_plus import Game, HeuristicBot, MCTSBot, SuperBot

def example_with_super_bot():
    """مثال: بازی با یک SuperBot"""
    
    # ساخت بازی معمولی
    game = Game(
        seed=42,
        target_vp=10,
        max_turns=300,
        num_players=4
    )
    
    # جایگزینی یکی از bot ها با SuperBot
    game.bots[0] = SuperBot(0, "🔥 Aggressive Bot")
    
    # بقیه bot ها معمولی می‌مانند
    # game.bots[1] = HeuristicBot(1, "Normal Bot 1")
    # game.bots[2] = HeuristicBot(2, "Normal Bot 2")
    # game.bots[3] = HeuristicBot(3, "Normal Bot 3")
    
    # اجرای بازی
    game.play()
    
    # نمایش نتایج
    print("\\n📊 Game Results:")
    for p in game.players:
        print(f"{p.name}: {p.vp} VP (+{p.hidden_vp} hidden)")
    
    winner = max(game.players, key=lambda p: p.vp + p.hidden_vp)
    print(f"\\n🏆 Winner: {winner.name}!")


def example_all_super_bots():
    """مثال: همه bot ها SuperBot باشند"""
    
    game = Game(seed=99, target_vp=10, max_turns=300, num_players=4)
    
    # همه را SuperBot کن!
    for i in range(4):
        game.bots[i] = SuperBot(i, f"SuperBot_{i+1}")
    
    game.play()
    
    print("\\n⚔️ Super Bot Battle Results:")
    for p in game.players:
        print(f"{p.name}: {p.vp} VP")


def example_mixed_bots():
    """مثال: ترکیب انواع bot ها"""
    
    game = Game(seed=123, target_vp=10, max_turns=300, num_players=4, use_mcts_bot=False)
    
    # ترکیب مختلف
    game.bots[0] = SuperBot(0, "Super Aggressive")
    game.bots[1] = MCTSBot(1, "MCTS Smart")
    game.bots[2] = HeuristicBot(2, "Normal Bot")
    game.bots[3] = SuperBot(3, "Super Fighter")
    
    game.play()
    
    print("\\n🎮 Mixed Battle Results:")
    for p in game.players:
        total = p.vp + p.hidden_vp
        print(f"{p.name}: {total} total VP")


if __name__ == "__main__":
    print("=" * 60)
    print("🎮 SUPER BOT EXAMPLES")
    print("=" * 60)
    
    # اجرای مثال‌ها
    print("\\n1️⃣ Example 1: One SuperBot vs Normal Bots")
    example_with_super_bot()
    
    print("\\n" + "=" * 60)
    print("\\n2️⃣ Example 2: All SuperBots Battle")
    example_all_super_bots()
    
    print("\\n" + "=" * 60)
    print("\\n3️⃣ Example 3: Mixed Bot Types")
    example_mixed_bots()
'''
    
    with open('use_super_bot_example.py', 'w', encoding='utf-8') as f:
        f.write(example_code)
    
    print("📝 Example file created: use_super_bot_example.py")


def main():
    print("""
╔══════════════════════════════════════════════════════════╗
║         🔧 SUPER BOT INTEGRATION TOOL 🔧                 ║
╚══════════════════════════════════════════════════════════╝

این ابزار SuperBot را به فایل catan_plus.py اضافه می‌کند
بدون اینکه کد اصلی خراب شود!
    """)
    
    print("\n⚙️  شروع فرآیند integration...")
    print("-" * 40)
    
    # اضافه کردن SuperBot
    success = integrate_super_bot()
    
    if success:
        # ساخت فایل مثال
        create_example_usage()
        
        print("\n" + "=" * 60)
        print("✅ SUCCESS! SuperBot آماده استفاده است!")
        print("-" * 40)
        
        print("\n📖 نحوه استفاده:")
        print("""
# در کد خودتان:
from catan_plus import Game, SuperBot

game = Game(seed=42, target_vp=10, num_players=4)
game.bots[0] = SuperBot(0, "Aggressive Bot")  # جایگزینی bot اول
game.play()
        """)
        
        print("\n🎯 ویژگی‌های SuperBot:")
        print("  • حمله تهاجمی به leader")
        print("  • تشخیص winning moves")
        print("  • trading استراتژیک")
        print("  • blocking حریفان")
        
        print("\n📂 فایل‌های ایجاد شده:")
        print("  • catan_plus.py (updated with SuperBot)")
        print("  • catan_plus_backup.py (backup of original)")
        print("  • use_super_bot_example.py (usage examples)")
        
    else:
        print("\n⚠️  SuperBot قبلاً اضافه شده بود!")
        print("برای استفاده:")
        print("  from catan_plus import SuperBot")


if __name__ == "__main__":
    main()
'''