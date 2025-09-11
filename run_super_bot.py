#!/usr/bin/env python3
"""
Script to easily run and test Super Bot
اجرای آسان Super Bot با سناریوهای مختلف
"""

import sys
import json
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from catan_plus import Game, HeuristicBot
from super_bot import SuperBot

def run_super_bot_vs_normal():
    """
    سناریو 1: یک Super Bot در مقابل 3 Bot معمولی
    """
    print("=" * 60)
    print("🎮 سناریو 1: Super Bot vs 3 Normal Bots")
    print("=" * 60)
    
    game = Game(seed=42, target_vp=10, max_turns=300, num_players=4)
    
    # Replace first bot with SuperBot
    game.bots[0] = SuperBot(0, "🔥 SUPER BOT 🔥")
    # Keep others as normal
    game.bots[1] = HeuristicBot(1, "Normal Bot 1")
    game.bots[2] = HeuristicBot(2, "Normal Bot 2") 
    game.bots[3] = HeuristicBot(3, "Normal Bot 3")
    
    print("\n🎯 Starting game...")
    game.play()
    
    print("\n📊 نتایج بازی:")
    print("-" * 40)
    for p in game.players:
        total_vp = p.vp + p.hidden_vp
        status = "👑 WINNER!" if total_vp >= game.target_vp else ""
        print(f"{p.name:20} | VP: {p.vp:2} (+{p.hidden_vp} hidden) = {total_vp:2} {status}")
    
    print(f"\n⏱️ Game lasted {game.turn} turns")
    
    # Save trace for visualization
    with open("super_bot_trace.json", "w") as f:
        json.dump(game.trace, f)
    print("💾 Trace saved to super_bot_trace.json")
    
    return game


def run_all_super_bots():
    """
    سناریو 2: همه Super Bot - جنگ تمام عیار!
    """
    print("\n" + "=" * 60)
    print("⚔️ سناریو 2: All Super Bots Battle Royale!")
    print("=" * 60)
    
    game = Game(seed=99, target_vp=10, max_turns=300, num_players=4)
    
    # All Super Bots!
    for i in range(4):
        game.bots[i] = SuperBot(i, f"💀 SUPER BOT {i+1} 💀")
    
    print("\n🔥 Starting EPIC battle...")
    game.play()
    
    print("\n📊 نتایج جنگ Super Bot ها:")
    print("-" * 40)
    for p in game.players:
        total_vp = p.vp + p.hidden_vp
        status = "👑 CHAMPION!" if total_vp >= game.target_vp else ""
        print(f"{p.name:20} | VP: {p.vp:2} (+{p.hidden_vp} hidden) = {total_vp:2} {status}")
    
    print(f"\n⏱️ Epic battle lasted {game.turn} turns")
    
    return game


def run_tournament(num_games=10):
    """
    سناریو 3: تورنمنت - چندین بازی برای آمار
    """
    print("\n" + "=" * 60)
    print(f"🏆 سناریو 3: Tournament - {num_games} Games")
    print("=" * 60)
    
    super_bot_wins = 0
    normal_bot_wins = 0
    total_turns = 0
    
    for game_num in range(num_games):
        print(f"\r🎮 Playing game {game_num+1}/{num_games}...", end="")
        
        game = Game(seed=game_num, target_vp=10, max_turns=300, num_players=4)
        
        # One Super Bot vs 3 Normal Bots
        game.bots[0] = SuperBot(0, "Super Bot")
        for i in range(1, 4):
            game.bots[i] = HeuristicBot(i, f"Normal Bot {i}")
        
        game.play()
        
        # Check winner
        winner = max(game.players, key=lambda p: p.vp + p.hidden_vp)
        if winner.id == 0:
            super_bot_wins += 1
        else:
            normal_bot_wins += 1
        
        total_turns += game.turn
    
    print("\n\n📊 نتایج تورنمنت:")
    print("-" * 40)
    print(f"🔥 Super Bot Wins:   {super_bot_wins}/{num_games} ({100*super_bot_wins/num_games:.1f}%)")
    print(f"🤖 Normal Bot Wins:  {normal_bot_wins}/{num_games} ({100*normal_bot_wins/num_games:.1f}%)")
    print(f"⏱️ Average game length: {total_turns/num_games:.1f} turns")
    
    if super_bot_wins > normal_bot_wins:
        print("\n🎉 Super Bot DOMINATES! 💪")
    else:
        print("\n🤔 Normal bots put up a good fight!")


def analyze_super_bot_behavior():
    """
    تحلیل رفتار Super Bot
    """
    print("\n" + "=" * 60)
    print("🔬 تحلیل رفتار Super Bot")
    print("=" * 60)
    
    game = Game(seed=123, target_vp=10, max_turns=300, num_players=4)
    
    # One Super Bot for analysis
    game.bots[0] = SuperBot(0, "Super Bot (Analyzed)")
    for i in range(1, 4):
        game.bots[i] = HeuristicBot(i, f"Normal Bot {i}")
    
    # Track Super Bot actions
    print("\n📝 Monitoring Super Bot decisions...")
    
    # Run game
    game.play()
    
    # Analyze logs
    super_bot_actions = {
        'aggressive_moves': 0,
        'defensive_moves': 0,
        'blocks': 0,
        'trades': 0,
        'robber_targets': 0
    }
    
    for log in game.logs:
        if "Super Bot" in log:
            if "[AGGRESSIVE]" in log:
                super_bot_actions['aggressive_moves'] += 1
            elif "[DEFENSIVE]" in log:
                super_bot_actions['defensive_moves'] += 1
            elif "[BLOCK]" in log:
                super_bot_actions['blocks'] += 1
            elif "[DESPERATE]" in log:
                super_bot_actions['aggressive_moves'] += 2
            elif "trades" in log and "Super Bot" in log:
                super_bot_actions['trades'] += 1
            elif "robber" in log.lower() and "Super Bot" in log:
                super_bot_actions['robber_targets'] += 1
    
    print("\n📊 Super Bot Behavior Analysis:")
    print("-" * 40)
    for action, count in super_bot_actions.items():
        print(f"{action:20}: {count}")
    
    # Check if Super Bot won
    winner = max(game.players, key=lambda p: p.vp + p.hidden_vp)
    if winner.id == 0:
        print("\n✅ Super Bot WON with aggressive strategy!")
    else:
        print(f"\n❌ Super Bot lost to {winner.name}")
    
    # Save detailed log
    with open("super_bot_analysis.txt", "w", encoding="utf-8") as f:
        f.write("SUPER BOT DETAILED LOG\n")
        f.write("=" * 50 + "\n\n")
        for log in game.logs:
            if "Super Bot" in log or "[SUPER]" in log:
                f.write(log + "\n")
    
    print("💾 Detailed analysis saved to super_bot_analysis.txt")


def quick_test():
    """
    تست سریع برای بررسی عملکرد
    """
    print("\n" + "=" * 60)
    print("⚡ Quick Test - 1 Game")
    print("=" * 60)
    
    game = Game(seed=42, target_vp=10, max_turns=300, num_players=2)
    
    # Super Bot vs Normal Bot (2 players for quick game)
    game.bots[0] = SuperBot(0, "🔥 Super Bot")
    game.bots[1] = HeuristicBot(1, "🤖 Normal Bot")
    
    print("\n🎮 Starting quick 1v1 game...")
    game.play()
    
    print("\n📊 Quick Test Results:")
    for p in game.players:
        total = p.vp + p.hidden_vp
        print(f"{p.name}: {total} VP")
    
    winner = max(game.players, key=lambda p: p.vp + p.hidden_vp)
    print(f"\n🏆 Winner: {winner.name}!")
    print(f"⏱️ Game took {game.turn} turns")
    
    return game


def main():
    """
    منوی اصلی برای انتخاب سناریو
    """
    print("""
╔══════════════════════════════════════════════════════════╗
║            🎮 SUPER BOT TEST SUITE 🎮                    ║
║                                                          ║
║  Super Bot: یک AI تهاجمی که برای برد هر کاری می‌کند!    ║
╚══════════════════════════════════════════════════════════╝
    """)
    
    print("لطفاً یک سناریو انتخاب کنید:\n")
    print("1️⃣  Super Bot vs Normal Bots (1 vs 3)")
    print("2️⃣  All Super Bots Battle (4 Super Bots)")
    print("3️⃣  Tournament (10 games)")
    print("4️⃣  Behavior Analysis")
    print("5️⃣  Quick Test (1v1)")
    print("6️⃣  Run All Scenarios")
    print("0️⃣  Exit")
    
    while True:
        try:
            choice = input("\n👉 انتخاب شما (0-6): ").strip()
            
            if choice == "1":
                run_super_bot_vs_normal()
            elif choice == "2":
                run_all_super_bots()
            elif choice == "3":
                num = input("تعداد بازی‌ها (default=10): ").strip()
                num_games = int(num) if num else 10
                run_tournament(num_games)
            elif choice == "4":
                analyze_super_bot_behavior()
            elif choice == "5":
                quick_test()
            elif choice == "6":
                print("\n🚀 Running ALL scenarios...")
                quick_test()
                run_super_bot_vs_normal()
                run_all_super_bots()
                run_tournament(5)
                analyze_super_bot_behavior()
                print("\n✅ All scenarios completed!")
            elif choice == "0":
                print("\n👋 Goodbye!")
                break
            else:
                print("❌ Invalid choice. Please try again.")
                continue
            
            another = input("\n🔄 Run another scenario? (y/n): ").strip().lower()
            if another != 'y':
                print("\n👋 Thanks for testing Super Bot!")
                break
                
        except KeyboardInterrupt:
            print("\n\n👋 Interrupted. Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")
            print("Please try again.")


if __name__ == "__main__":
    main()