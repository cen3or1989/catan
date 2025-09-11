#!/usr/bin/env python3
"""
تست SuperBot که به کد اصلی اضافه شده
"""

# حالا SuperBot داخل catan_plus.py است!
from catan_plus import Game, HeuristicBot, MCTSBot, SuperBot

def test_super_bot_in_main_code():
    """تست که SuperBot در کد اصلی کار می‌کند"""
    
    print("=" * 60)
    print("🎮 تست SuperBot در کد اصلی catan_plus.py")
    print("=" * 60)
    
    # ساخت بازی معمولی
    game = Game(
        seed=42,
        target_vp=8,  # VP کمتر برای تست سریع
        max_turns=100,
        num_players=4
    )
    
    # حالا می‌توانید SuperBot را مستقیماً استفاده کنید!
    game.bots[0] = SuperBot(0, "🔥 Super Bot 1")  # جایگزینی bot اول
    game.bots[1] = HeuristicBot(1, "Normal Bot 1")  # بقیه معمولی
    game.bots[2] = HeuristicBot(2, "Normal Bot 2")
    game.bots[3] = SuperBot(3, "🔥 Super Bot 2")  # یکی دیگر SuperBot
    
    print("\n🎯 Setup:")
    print("  Player 0: SuperBot (Aggressive)")
    print("  Player 1: Normal Bot")
    print("  Player 2: Normal Bot")
    print("  Player 3: SuperBot (Aggressive)")
    print("\n⚔️ Starting game...")
    
    # غیرفعال کردن log برای سرعت
    game.log = lambda x: None
    
    # اجرای بازی
    game.play()
    
    # نمایش نتایج
    print("\n📊 نتایج بازی:")
    print("-" * 40)
    
    results = []
    for p in game.players:
        total = p.vp + p.hidden_vp
        bot_type = "SUPER" if "Super" in p.name else "Normal"
        results.append((p.name, total, bot_type))
        print(f"{p.name:20} | {total:2} VP | Type: {bot_type}")
    
    # تعیین برنده
    winner = max(results, key=lambda x: x[1])
    print("\n" + "=" * 60)
    print(f"🏆 برنده: {winner[0]} با {winner[1]} VP!")
    
    if winner[2] == "SUPER":
        print("✅ SuperBot برنده شد! استراتژی تهاجمی موثر بود!")
    else:
        print("❌ Normal Bot برنده شد. SuperBot نیاز به تنظیم دارد.")
    
    print(f"\n⏱️ بازی در {game.turn} turn تمام شد")
    
    return winner[2] == "SUPER"


def quick_comparison():
    """مقایسه سریع SuperBot vs Normal"""
    
    print("\n" + "=" * 60)
    print("📊 مقایسه عملکرد (5 بازی)")
    print("=" * 60)
    
    super_wins = 0
    normal_wins = 0
    
    for i in range(5):
        print(f"\rBازی {i+1}/5...", end="", flush=True)
        
        game = Game(seed=100+i, target_vp=8, max_turns=100, num_players=2)
        
        # یک SuperBot و یک Normal
        game.bots[0] = SuperBot(0, "Super")
        game.bots[1] = HeuristicBot(1, "Normal")
        
        game.log = lambda x: None
        game.play()
        
        winner = max(game.players, key=lambda p: p.vp + p.hidden_vp)
        if winner.id == 0:
            super_wins += 1
        else:
            normal_wins += 1
    
    print(f"\n\n📈 نتایج:")
    print(f"  SuperBot: {super_wins}/5 برد ({100*super_wins/5:.0f}%)")
    print(f"  Normal Bot: {normal_wins}/5 برد ({100*normal_wins/5:.0f}%)")
    
    if super_wins > normal_wins:
        print("\n✅ SuperBot عملکرد بهتری دارد!")
    else:
        print("\n🤔 Normal Bot هنوز قوی است!")


def show_usage_examples():
    """نمایش مثال‌های استفاده"""
    
    print("\n" + "=" * 60)
    print("📖 نحوه استفاده از SuperBot در کد شما:")
    print("=" * 60)
    
    print("""
# مثال 1: جایگزینی یک bot
from catan_plus import Game, SuperBot

game = Game(seed=42, target_vp=10, num_players=4)
game.bots[0] = SuperBot(0, "Aggressive Player")
game.play()

# مثال 2: همه SuperBot
for i in range(4):
    game.bots[i] = SuperBot(i, f"Super_{i}")

# مثال 3: ترکیب با MCTS
game.bots[0] = SuperBot(0, "Aggressive")
game.bots[1] = MCTSBot(1, "Smart")
game.bots[2] = HeuristicBot(2, "Normal")

# مثال 4: با پارامترهای مختلف
game = Game(
    seed=99,
    target_vp=12,  # VP بیشتر
    max_turns=500,  # بازی طولانی‌تر
    num_players=3,
    use_mcts_bot=False  # غیرفعال کردن MCTS پیش‌فرض
)
game.bots[0] = SuperBot(0, "Champion")
    """)
    
    print("\n💡 نکات:")
    print("  • SuperBot به طور خودکار leader را تشخیص می‌دهد")
    print("  • Robber را همیشه روی leader می‌گذارد")
    print("  • Trade های 4:1 را هم قبول می‌کند اگر عقب باشد")
    print("  • جلوی expansion leader را می‌گیرد")


def main():
    print("""
╔══════════════════════════════════════════════════════════╗
║     ✅ SUPER BOT در کد اصلی اضافه شد!                    ║
╚══════════════════════════════════════════════════════════╝
    """)
    
    # تست که کار می‌کند
    super_won = test_super_bot_in_main_code()
    
    # مقایسه عملکرد
    quick_comparison()
    
    # نمایش مثال‌ها
    show_usage_examples()
    
    print("\n" + "=" * 60)
    print("✅ SuperBot با موفقیت به catan_plus.py اضافه شد!")
    print("حالا می‌توانید در هر جای کد از آن استفاده کنید.")
    print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ خطا: {e}")
        print("مطمئن شوید که SuperBot به درستی به catan_plus.py اضافه شده است.")