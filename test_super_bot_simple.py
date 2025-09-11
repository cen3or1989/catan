#!/usr/bin/env python3
"""
تست ساده و سریع Super Bot
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from catan_plus import Game, HeuristicBot
from super_bot import SuperBot

def quick_demo():
    """یک بازی سریع 2 نفره برای دمو"""
    
    print("=" * 60)
    print("🎮 SUPER BOT DEMO - Quick 2-Player Game")
    print("=" * 60)
    
    # بازی 2 نفره برای سرعت بیشتر
    game = Game(
        seed=42, 
        target_vp=7,  # VP کمتر برای بازی سریع‌تر
        max_turns=50,  # حداکثر 50 turn
        num_players=2
    )
    
    # یک Super Bot و یک Normal Bot
    game.bots[0] = SuperBot(0, "🔥 SUPER BOT")
    game.bots[1] = HeuristicBot(1, "🤖 Normal Bot")
    
    print("\n🎯 شروع بازی...")
    print("Super Bot (تهاجمی) vs Normal Bot (معمولی)")
    print("-" * 40)
    
    # نمایش تصمیمات مهم
    original_log = game.log
    important_actions = []
    
    def track_log(msg):
        original_log(msg)
        if any(keyword in msg for keyword in ["SUPER", "AGGRESSIVE", "BLOCK", "DESPERATE", "wins"]):
            important_actions.append(msg)
    
    game.log = track_log
    
    # اجرای بازی
    try:
        game.play()
    except Exception as e:
        print(f"⚠️ Game stopped: {e}")
    
    print("\n" + "=" * 60)
    print("📊 نتایج نهایی:")
    print("-" * 40)
    
    for p in game.players:
        total_vp = p.vp + p.hidden_vp
        resources = sum(p.hand.values())
        
        print(f"\n{p.name}")
        print(f"  Victory Points: {p.vp} (+ {p.hidden_vp} hidden) = {total_vp} total")
        print(f"  Resources: {resources}")
        print(f"  Settlements: {len(p.settlements)}")
        print(f"  Cities: {len(p.cities)}")
        print(f"  Roads: {len(p.roads)}")
        print(f"  Knights: {p.knights_played}")
    
    # تعیین برنده
    winner = max(game.players, key=lambda p: p.vp + p.hidden_vp)
    print("\n" + "=" * 60)
    print(f"🏆 برنده: {winner.name} با {winner.vp + winner.hidden_vp} VP!")
    print(f"⏱️  بازی در {game.turn} turn تمام شد")
    
    # نمایش اقدامات مهم Super Bot
    if important_actions:
        print("\n📝 اقدامات کلیدی Super Bot:")
        print("-" * 40)
        for action in important_actions[:10]:  # فقط 10 مورد اول
            if "SUPER" in action or "AGGRESSIVE" in action or "BLOCK" in action:
                print(f"  • {action[:80]}...")
    
    return winner.id == 0  # آیا Super Bot برد؟


def compare_strategies():
    """مقایسه سریع استراتژی‌ها"""
    
    print("\n" + "=" * 60)
    print("📊 مقایسه Super Bot vs Normal Bot")
    print("=" * 60)
    
    super_wins = 0
    games_to_play = 3  # فقط 3 بازی برای سرعت
    
    print(f"\n🎮 اجرای {games_to_play} بازی...")
    
    for i in range(games_to_play):
        print(f"\rGame {i+1}/{games_to_play}...", end="", flush=True)
        
        game = Game(
            seed=100+i,
            target_vp=7,
            max_turns=50,
            num_players=2
        )
        
        game.bots[0] = SuperBot(0, "Super")
        game.bots[1] = HeuristicBot(1, "Normal")
        
        # بدون log برای سرعت
        game.log = lambda x: None
        
        try:
            game.play()
            winner = max(game.players, key=lambda p: p.vp + p.hidden_vp)
            if winner.id == 0:
                super_wins += 1
        except:
            pass
    
    print(f"\n\n📈 نتایج:")
    print(f"  Super Bot: {super_wins}/{games_to_play} برد ({100*super_wins/games_to_play:.0f}%)")
    print(f"  Normal Bot: {games_to_play-super_wins}/{games_to_play} برد ({100*(games_to_play-super_wins)/games_to_play:.0f}%)")
    
    if super_wins > games_to_play/2:
        print("\n✅ Super Bot استراتژی بهتری دارد!")
    else:
        print("\n🤔 Normal Bot هنوز رقیب قدری است!")


def show_super_bot_features():
    """نمایش ویژگی‌های Super Bot"""
    
    print("\n" + "=" * 60)
    print("🌟 ویژگی‌های SUPER BOT")
    print("=" * 60)
    
    features = [
        ("🎯", "تشخیص Leader", "همیشه قوی‌ترین بازیکن را شناسایی می‌کند"),
        ("⚔️", "حمله به Leader", "Robber را روی بهترین hex های leader می‌گذارد"),
        ("🤝", "اتحاد تاکتیکی", "با بازیکنان ضعیف‌تر علیه leader متحد می‌شود"),
        ("💰", "Trade تهاجمی", "حتی trade های 4:1 را برای برد قبول می‌کند"),
        ("🚫", "Block کردن", "جلوی expansion حریفان را می‌گیرد"),
        ("🏃", "Desperate Mode", "وقتی عقب است، ریسک‌های بزرگ می‌کند"),
        ("🛡️", "Defensive Mode", "وقتی جلو است، قدرتش را مخفی می‌کند"),
        ("👁️", "Winning Move Detection", "حرکات برد را تشخیص می‌دهد"),
        ("🎴", "استفاده استراتژیک از کارت‌ها", "Development cards را در زمان مناسب استفاده می‌کند"),
        ("🧠", "Hidden VP Estimation", "VP های مخفی حریفان را تخمین می‌زند")
    ]
    
    for icon, title, desc in features:
        print(f"\n{icon} {title}")
        print(f"   {desc}")
    
    print("\n" + "=" * 60)


def main():
    """منوی اصلی ساده"""
    
    print("""
╔══════════════════════════════════════════════════════════╗
║              🔥 SUPER BOT - QUICK TEST 🔥                ║
╚══════════════════════════════════════════════════════════╝

Super Bot: یک AI تهاجمی که برای برد از هیچ کاری دریغ نمی‌کند!
    """)
    
    # نمایش ویژگی‌ها
    show_super_bot_features()
    
    print("\n🎮 شروع تست...")
    print("-" * 60)
    
    # یک بازی دمو
    super_won = quick_demo()
    
    # مقایسه سریع
    compare_strategies()
    
    # نتیجه‌گیری
    print("\n" + "=" * 60)
    print("📝 نتیجه‌گیری:")
    print("-" * 40)
    
    if super_won:
        print("✅ Super Bot در بازی اول برنده شد!")
        print("   استراتژی تهاجمی موثر بود.")
    else:
        print("❌ Super Bot در بازی اول باخت.")
        print("   اما این فقط یک بازی بود!")
    
    print("\n💡 Super Bot از استراتژی‌های پیشرفته استفاده می‌کند:")
    print("   • حمله به leader")
    print("   • تشخیص winning moves")
    print("   • trading استراتژیک")
    print("   • blocking حریفان")
    
    print("\n🚀 برای تست کامل‌تر، فایل run_super_bot.py را اجرا کنید.")
    print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⛔ متوقف شد.")
    except Exception as e:
        print(f"\n❌ خطا: {e}")
        print("\nلطفاً مطمئن شوید فایل‌های catan_plus.py و super_bot.py موجود هستند.")