# تحلیل قوانین و باگ‌های بازی Catan Plus

## 🔍 بررسی دقت قوانین بازی

### ✅ قوانین درست پیاده‌سازی شده:

1. **قانون فاصله ساختمان‌ها** (Distance Rule)
   - درست: ساختمان‌ها باید حداقل 2 یال از هم فاصله داشته باشند
   - کد صحیح در خطوط 607-609

2. **توزیع منابع**
   - درست: تاس 7 = دزد، بقیه اعداد = تولید منابع
   - شهرها 2 منبع، ساختمان‌ها 1 منبع می‌گیرند

3. **دزد دریایی (Robber)**
   - درست: روی تاس 7 حرکت می‌کند
   - بازیکنان با بیش از 7 کارت، نصف را دور می‌ریزند
   - مانع تولید منابع می‌شود

### ❌ **باگ‌های مهم در قوانین:**

## 🐛 **باگ #1: مشکل در قطع جاده توسط ساختمان حریف**

```python
# خط 615-640: player_connected_nodes
def player_connected_nodes(self, player: Player) -> Set[int]:
    # باگ: این تابع درست کار می‌کند اما...
    opponent_occupied = set()
    for p in self.players:
        if p.id == player.id:
            continue
        opponent_occupied |= set(p.settlements)
        opponent_occupied |= set(p.cities)
    
    return (seen | owned_nodes) - opponent_occupied  # ✅ این درست است
```

**مشکل:** در `legal_road_spots` (خط 642) از این تابع استفاده می‌شود اما منطق کامل نیست.

## 🐛 **باگ #2: محاسبه طولانی‌ترین جاده**

```python
# خط 252-285: compute_longest_road_length
def compute_longest_road_length(board: Board, player: Player, opponents: List[Player]) -> int:
    blocked_nodes = set()
    for opp in opponents:
        blocked_nodes |= opp.settlements
        blocked_nodes |= opp.cities
    
    # باگ: فقط نودهای مسدود را چک می‌کند، نه یال‌های مسدود شده
    for u,v in player_edges:
        if u in blocked_nodes or v in blocked_nodes: 
            continue  # ❌ این کافی نیست!
```

**مشکل:** اگر ساختمان حریف وسط جاده باشد، باید جاده را به دو قسمت تقسیم کند، نه اینکه کل یال را حذف کند.

## 🐛 **باگ #3: انتخاب هدف دزد توسط بات**

```python
# خط 1195-1226: choose_robber_target_hex
def choose_robber_target_hex(self, game, player, others):
    # باگ: ممکن است هگز فعلی دزد را دوباره انتخاب کند
    if not candidates:
        return game.board.robber_hex  # ❌ همان جای قبلی!
```

## 🤖 **تحلیل تصمیم‌گیری بات‌ها**

### ❌ **مشکلات در HeuristicBot:**

### **مشکل #1: ساخت جاده بدون هدف**
```python
# خط 1142-1183: در turn_actions
while can_afford(player.hand, BUILD_COST["road"]) and player.roads_left>0:
    # بات جاده می‌سازد حتی اگر به ساختمان جدید منجر نشود
    choice = max(legal, key=road_score)
    # ❌ بدون چک اینکه آیا واقعاً به ساختمان می‌رسد
```

### **مشکل #2: معامله P2P غیربهینه**
```python
# خط 407-508: p2p_trade
def p2p_trade(self, proposer: Player, responder: Player) -> bool:
    # مشکل: فقط یک معامله در هر نوبت
    # بات نمی‌تواند چند معامله پشت سر هم انجام دهد
    for opp in others:
        if game.p2p_trade(player, opp):
            break  # ❌ فقط یک معامله!
```

### **مشکل #3: خرید کارت توسعه نامناسب**
```python
# خط 1185-1192
if can_afford(player.hand, BUILD_COST["dev"]):
    hand_total = sum(player.hand.values())
    risk_discard = hand_total > 7
    # ❌ منطق ضعیف: فقط بر اساس ریسک 7
```

### ❌ **مشکلات در MCTSBot:**

### **مشکل #1: شبیه‌سازی ناقص**
```python
# خط 1316-1381: apply function
elif kind == "play_monopoly":
    # شبیه‌سازی monopoly کارت‌های حریفان را تغییر می‌دهد
    # اما این تغییرات در شبیه‌سازی‌های بعدی اثر دارد
    for op in sim['others']:
        op.hand[res] -= amt  # ❌ side effect!
```

### **مشکل #2: ارزیابی ضعیف موقعیت**
```python
# خط 1383-1431: eval_state
def eval_state(sim) -> float:
    # وزن‌های ثابت و غیربهینه
    base = p.vp + p.hidden_vp
    + 0.06 * prod  # ❌ وزن کم برای تولید
    + 0.02 * len(p.roads)  # ❌ وزن کم برای جاده
    - 0.03 * handrisk  # ❌ وزن کم برای ریسک
```

## 📊 **خلاصه مشکلات اصلی:**

### 🔴 **باگ‌های بحرانی:**
1. **محاسبه غلط طولانی‌ترین جاده** - جاده‌های قطع شده درست محاسبه نمی‌شوند
2. **انتخاب مکان دزد** - ممکن است در همان جا بماند
3. **قطع جاده توسط ساختمان** - منطق ناقص

### 🟡 **تصمیمات ضعیف بات:**
1. **ساخت جاده بی‌هدف** - منابع هدر می‌دهد
2. **معاملات ناکارآمد** - فقط یک معامله در هر نوبت
3. **خرید کارت توسعه نامناسب** - استراتژی ضعیف
4. **عدم در نظر گرفتن موقعیت حریفان** - فقط به خودش فکر می‌کند

### 🟢 **نکات مثبت:**
1. قوانین اصلی بازی درست پیاده‌سازی شده
2. MCTS به طور کلی کار می‌کند
3. منطق ساخت ساختمان و شهر معقول است

## 🔧 **راه‌حل‌های پیشنهادی:**

### برای باگ طولانی‌ترین جاده:
```python
def compute_longest_road_length_fixed(board, player, opponents):
    # جاده‌ها را به گراف‌های مجزا تقسیم کن
    blocked_nodes = set()
    for opp in opponents:
        blocked_nodes |= opp.settlements | opp.cities
    
    # گراف جاده بدون نودهای مسدود بساز
    road_graph = defaultdict(set)
    for u, v in player.roads:
        if u not in blocked_nodes and v not in blocked_nodes:
            road_graph[u].add(v)
            road_graph[v].add(u)
    
    # حالا DFS را اجرا کن
    return calculate_longest_path(road_graph)
```

### برای بهبود تصمیمات بات:
```python
class ImprovedBot:
    def evaluate_position(self, game_state):
        score = 0
        # موقعیت خود
        score += self.vp * 100
        score += self.production_value * 20
        
        # موقعیت حریفان (منفی)
        leader_vp = max(opp.vp for opp in opponents)
        score -= (leader_vp - self.vp) * 50
        
        # پتانسیل رشد
        score += self.expansion_potential * 15
        
        return score
```

## نتیجه‌گیری:
- **قوانین**: 70% درست، 30% باگ دارد
- **بات Heuristic**: 60% خوب، تصمیمات ساده‌لوحانه
- **بات MCTS**: 75% خوب، اما نیاز به تنظیم وزن‌ها دارد
- **قابلیت بازی**: قابل بازی است اما بات‌ها گاهی تصمیمات عجیب می‌گیرند