"""
رفع باگ‌های شناسایی شده در بازی Catan Plus
Bug fixes for identified issues in Catan Plus game
"""

from collections import defaultdict, Counter, deque
from typing import Set, List, Tuple, Dict, Optional
import random

# ============= رفع باگ #1: محاسبه صحیح طولانی‌ترین جاده =============

def compute_longest_road_length_fixed(board, player, opponents: List) -> int:
    """
    محاسبه صحیح طول طولانی‌ترین جاده با در نظر گرفتن قطع شدن توسط ساختمان‌های حریف
    """
    player_edges = set(player.roads)
    if not player_edges:
        return 0
    
    # نودهایی که توسط حریفان اشغال شده (جاده را قطع می‌کنند)
    blocked_nodes = set()
    for opp in opponents:
        blocked_nodes |= opp.settlements
        blocked_nodes |= opp.cities
    
    # ساخت گراف جاده‌ها با در نظر گرفتن نودهای مسدود
    # نودهای مسدود جاده را به چند قسمت تقسیم می‌کنند
    road_segments = []  # لیست گراف‌های مجزا
    visited_edges = set()
    
    for edge in player_edges:
        if edge in visited_edges:
            continue
            
        u, v = edge
        # اگر هر دو سر جاده مسدود باشد، این جاده قابل استفاده نیست
        if u in blocked_nodes and v in blocked_nodes:
            visited_edges.add(edge)
            continue
        
        # ساخت یک segment جدید با BFS
        segment_graph = defaultdict(set)
        queue = deque([edge])
        segment_edges = set([edge])
        visited_edges.add(edge)
        
        while queue:
            curr_edge = queue.popleft()
            u, v = curr_edge
            
            # اضافه کردن یال به گراف segment (اگر نودها مسدود نباشند)
            if u not in blocked_nodes:
                if v not in blocked_nodes:
                    segment_graph[u].add(v)
                    segment_graph[v].add(u)
                else:
                    # v مسدود است، فقط u را اضافه کن
                    segment_graph[u]  # ایجاد نود تنها
            elif v not in blocked_nodes:
                # u مسدود است، فقط v را اضافه کن
                segment_graph[v]  # ایجاد نود تنها
            
            # پیدا کردن جاده‌های متصل
            for other_edge in player_edges:
                if other_edge in visited_edges:
                    continue
                ou, ov = other_edge
                
                # چک کردن اتصال (با در نظر گرفتن نودهای مسدود)
                connected = False
                if u == ou or u == ov or v == ou or v == ov:
                    # حداقل یک نود مشترک دارند
                    shared_node = None
                    if u == ou or u == ov:
                        shared_node = u
                    elif v == ou or v == ov:
                        shared_node = v
                    
                    # اگر نود مشترک مسدود نباشد، جاده‌ها متصل هستند
                    if shared_node and shared_node not in blocked_nodes:
                        connected = True
                
                if connected:
                    queue.append(other_edge)
                    segment_edges.add(other_edge)
                    visited_edges.add(other_edge)
        
        if segment_graph:
            road_segments.append(segment_graph)
    
    # محاسبه طولانی‌ترین مسیر در هر segment
    max_length = 0
    
    for segment in road_segments:
        # DFS برای پیدا کردن طولانی‌ترین مسیر در این segment
        segment_max = 0
        
        def dfs(node, visited_edges_dfs, length):
            nonlocal segment_max
            segment_max = max(segment_max, length)
            
            for neighbor in segment[node]:
                edge = (min(node, neighbor), max(node, neighbor))
                if edge not in visited_edges_dfs:
                    visited_edges_dfs.add(edge)
                    dfs(neighbor, visited_edges_dfs, length + 1)
                    visited_edges_dfs.remove(edge)
        
        # شروع DFS از همه نودها
        for start_node in segment:
            dfs(start_node, set(), 0)
        
        max_length = max(max_length, segment_max)
    
    return max_length


# ============= رفع باگ #2: انتخاب بهتر مکان دزد =============

def choose_robber_target_hex_fixed(game, player, others):
    """
    انتخاب هوشمندانه مکان دزد - همیشه جابجا می‌شود
    """
    current_robber = game.board.robber_hex
    leader = max(others, key=lambda p: (p.vp + p.hidden_vp, sum(p.hand.values())), default=None)
    
    candidates = []
    
    for hid, h in game.board.hexes.items():
        # نمی‌تواند در همان جا بماند
        if hid == current_robber:
            continue
        
        # فقط هگزهایی با عدد
        if h.number is None:
            continue
        
        weight = DICE_WEIGHTS.get(h.number, 0)
        if weight == 0:
            continue
        
        # محاسبه تأثیر روی بازیکنان
        opp_impact = 0
        my_impact = 0
        leader_impact = 0
        can_steal = False
        
        for nid in h.nodes:
            for opp in others:
                if nid in opp.settlements:
                    opp_impact += weight
                    if sum(opp.hand.values()) > 0:
                        can_steal = True
                    if opp == leader:
                        leader_impact += weight
                elif nid in opp.cities:
                    opp_impact += weight * 2
                    if sum(opp.hand.values()) > 0:
                        can_steal = True
                    if opp == leader:
                        leader_impact += weight * 2
            
            # تأثیر منفی روی خودمان
            if nid in player.settlements:
                my_impact += weight
            elif nid in player.cities:
                my_impact += weight * 2
        
        # امتیازدهی: بیشترین آسیب به حریف، کمترین آسیب به خود
        if opp_impact > 0:  # فقط اگر به حریف آسیب بزند
            score = opp_impact * 2.0  # وزن اصلی
            score += leader_impact * 1.5  # اولویت به رهبر
            score -= my_impact * 3.0  # جریمه سنگین برای آسیب به خود
            score += (1.0 if can_steal else 0.0)  # امتیاز اضافی اگر بتواند بدزدد
            
            candidates.append((hid, score))
    
    # اگر هیچ کاندیدای خوبی نبود، هگز با کمترین آسیب به خود را انتخاب کن
    if not candidates:
        safe_hexes = []
        for hid, h in game.board.hexes.items():
            if hid == current_robber:
                continue
            
            my_impact = 0
            for nid in h.nodes:
                if nid in player.settlements or nid in player.cities:
                    my_impact += 1
            
            safe_hexes.append((hid, -my_impact))
        
        if safe_hexes:
            return max(safe_hexes, key=lambda x: x[1])[0]
        
        # در بدترین حالت، اولین هگز متفاوت را انتخاب کن
        for hid in game.board.hexes:
            if hid != current_robber:
                return hid
    
    # بهترین کاندید را انتخاب کن
    return max(candidates, key=lambda x: x[1])[0]


# ============= رفع باگ #3: تصمیم‌گیری بهتر برای ساخت جاده =============

def should_build_road(game, player, others) -> Optional[Tuple[int, int]]:
    """
    تصمیم‌گیری هوشمند برای ساخت جاده - فقط اگر به هدف مشخصی منجر شود
    """
    legal_roads = game.legal_road_spots(player)
    if not legal_roads:
        return None
    
    # هدف 1: رسیدن به نقطه خوب برای ساختمان
    settlement_spots = game.legal_settlement_spots(player, others, require_connection=False)
    high_value_spots = [
        spot for spot in settlement_spots 
        if game.node_expectation(spot) > 5.0  # فقط نقاط با ارزش بالا
    ]
    
    if high_value_spots:
        # پیدا کردن کوتاه‌ترین مسیر به نقاط با ارزش
        best_road = None
        best_distance = float('inf')
        
        for road in legal_roads:
            u, v = road
            for spot in high_value_spots:
                # تخمین فاصله (ساده‌سازی شده)
                dist_u = abs(u - spot)
                dist_v = abs(v - spot)
                min_dist = min(dist_u, dist_v)
                
                if min_dist < best_distance:
                    best_distance = min_dist
                    best_road = road
        
        if best_road and best_distance < 3:  # فقط اگر نزدیک باشد
            return best_road
    
    # هدف 2: رسیدن به طولانی‌ترین جاده (اگر نزدیک 5 باشد)
    current_longest = compute_longest_road_length_fixed(game.board, player, others)
    if current_longest >= 3:  # اگر شانس دارد
        # جاده‌ای که بیشترین افزایش طول را می‌دهد
        best_road = None
        best_increase = 0
        
        for road in legal_roads:
            # شبیه‌سازی اضافه کردن این جاده
            player.roads.add(road)
            new_length = compute_longest_road_length_fixed(game.board, player, others)
            player.roads.remove(road)
            
            increase = new_length - current_longest
            if increase > best_increase:
                best_increase = increase
                best_road = road
        
        if best_road and best_increase > 0:
            return best_road
    
    # در غیر این صورت، جاده نساز (پس‌انداز کن برای ساختمان/شهر)
    return None


# ============= بهبود تصمیم‌گیری معامله =============

def smart_trade_decision(game, player, target_build=None):
    """
    تصمیم‌گیری هوشمند برای معامله بر اساس هدف
    """
    if target_build is None:
        # تعیین هدف بر اساس وضعیت بازی
        if len(player.settlements) > 0 and player.cities_left > 0:
            target_build = "city"
        elif player.settlements_left > 0:
            target_build = "settlement"
        else:
            return []  # هیچ هدفی نداریم
    
    trades = []
    
    # محاسبه کمبودها
    from catan_plus import BUILD_COST
    cost = BUILD_COST[target_build]
    needs = Counter({r: max(0, cost[r] - player.hand[r]) for r in cost})
    excess = Counter({r: max(0, player.hand[r] - cost[r]) for r in player.hand})
    
    # اگر کمبودی نداریم، معامله نکن
    if sum(needs.values()) == 0:
        return trades
    
    # اولویت‌بندی معاملات
    for need_res, need_amount in needs.most_common():
        if need_amount == 0:
            continue
        
        for excess_res, excess_amount in excess.most_common():
            if excess_amount == 0:
                continue
            
            # نرخ معامله
            rate = game.best_trade_rate(player, excess_res)
            
            # آیا می‌توانیم معامله کنیم؟
            if excess_amount >= rate:
                trades.append({
                    'give': excess_res,
                    'give_amount': rate,
                    'want': need_res,
                    'want_amount': 1,
                    'priority': 10 - rate  # نرخ بهتر = اولویت بالاتر
                })
    
    # مرتب‌سازی بر اساس اولویت
    trades.sort(key=lambda x: x['priority'], reverse=True)
    
    return trades[:3]  # حداکثر 3 معامله پیشنهادی


# ============= بهبود ارزیابی موقعیت برای MCTS =============

def evaluate_game_state_improved(game_state, player_id: int) -> float:
    """
    ارزیابی بهتر موقعیت بازی برای MCTS
    """
    player = game_state.players[player_id]
    others = [p for p in game_state.players if p.id != player_id]
    
    score = 0.0
    
    # 1. امتیاز پیروزی (بیشترین وزن)
    vp_total = player.vp + player.hidden_vp
    score += vp_total * 100
    
    # 2. فاصله تا پیروزی
    to_win = game_state.target_vp - vp_total
    score -= to_win * 20
    
    # 3. تولید منابع (با در نظر گرفتن احتمال تاس)
    production = 0
    for settlement_node in player.settlements:
        production += game_state.node_expectation(settlement_node)
    for city_node in player.cities:
        production += game_state.node_expectation(city_node) * 2
    score += production * 15
    
    # 4. تنوع منابع (مهم برای انعطاف‌پذیری)
    resource_types = set()
    for node in player.settlements | player.cities:
        for hex_id in game_state.board.node_to_hexes[node]:
            hex = game_state.board.hexes[hex_id]
            if hex.resource:
                resource_types.add(hex.resource)
    score += len(resource_types) * 25
    
    # 5. موقعیت نسبی (فاصله از رهبر)
    if others:
        leader_vp = max(p.vp + p.hidden_vp for p in others)
        vp_diff = leader_vp - vp_total
        score -= vp_diff * 30  # جریمه برای عقب بودن
    
    # 6. پتانسیل رشد
    available_spots = game_state.legal_settlement_spots(player, others)
    good_spots = [s for s in available_spots if game_state.node_expectation(s) > 4]
    score += len(good_spots) * 10
    
    # 7. کارت‌های توسعه
    dev_cards = sum(player.dev_hand.values())
    score += dev_cards * 8
    
    # 8. طولانی‌ترین جاده
    road_length = compute_longest_road_length_fixed(game_state.board, player, others)
    if road_length >= 5 and player.has_longest_road:
        score += 50  # دارای طولانی‌ترین جاده
    elif road_length >= 4:
        score += 20  # نزدیک به طولانی‌ترین جاده
    
    # 9. بزرگترین ارتش
    if player.knights_played >= 3 and player.has_largest_army:
        score += 50
    elif player.knights_played >= 2:
        score += 15
    
    # 10. ریسک دست (منفی برای کارت‌های زیاد)
    hand_size = sum(player.hand.values())
    if hand_size > 7:
        score -= (hand_size - 7) * 5
    
    return score


# ============= نمونه استفاده =============

if __name__ == "__main__":
    print("🔧 باگ‌های رفع شده:")
    print("1. ✅ محاسبه صحیح طولانی‌ترین جاده")
    print("2. ✅ انتخاب هوشمند مکان دزد")
    print("3. ✅ ساخت جاده هدفمند")
    print("4. ✅ معاملات هوشمندانه")
    print("5. ✅ ارزیابی بهتر موقعیت بازی")
    
    print("\n📝 برای استفاده:")
    print("این توابع را در catan_plus.py جایگزین توابع قبلی کنید")
    print("یا به عنوان override در کلاس‌های بات استفاده کنید")