import argparse
import json
import os
import sys
from typing import Dict, Any, Optional, Tuple, List, Callable

from collections import Counter

# Local imports when run from repo root
ROOT = os.path.dirname(os.path.dirname(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
from catan_plus_bundle.starter_eval import simulate
from catan_plus_bundle.catan_plus import make_standard_board

try:
    from PIL import Image  # type: ignore
except Exception:
    Image = None  # type: ignore


def _decode_qr_json(image_path: str) -> Optional[Dict[str, Any]]:
    try:
        import cv2  # type: ignore
    except Exception:
        return None
    try:
        img = cv2.imread(image_path)
        if img is None:
            return None
        det = cv2.QRCodeDetector()
        data, points, _ = det.detectAndDecode(img)
        if not data:
            return None
        # Expect JSON in QR code
        obj = json.loads(data)
        return obj
    except Exception:
        return None


def load_trace_from_image(image_path: str, explicit_trace: Optional[str]) -> Dict[str, Any]:
    """
    Best-effort loader: given an image path, first attempt to decode a QR-embedded
    JSON state from the image. If absent and --trace is provided or found next to the image,
    use that. Returns a dict compatible with starter_eval init.
    """
    # 1) Try QR-embedded JSON first
    qr = _decode_qr_json(image_path)
    if qr is not None:
        # Accept either a full trace (list of frames) or an init state dict
        if isinstance(qr, list) and qr:
            frame = qr[-1]
        elif isinstance(qr, dict) and 'board' in qr and 'players' in qr:
            # Already in init shape
            return qr
        else:
            frame = None
        if frame is not None:
            board = frame['board']
            players = frame['players']
            return {
                'seed': frame.get('turn', 0),
                'target_vp': 10,
                'board': {
                    'nodes': board['nodes'],
                    'hexes': board['hexes'],
                    'edges': board.get('edges', []),
                    'ports': board.get('ports', {}),
                    'robber_hex': board.get('robber_hex', 0),
                },
                'players': [
                    {
                        'name': p.get('name', f'P{i}'),
                        'settlements': p.get('settlements', []),
                        'cities': p.get('cities', []),
                        'roads': p.get('roads', []),
                        'hand': p.get('hand', {}),
                    }
                    for i, p in enumerate(players)
                ]
            }

    # 2) If explicit trace provided, prefer it
    if explicit_trace and os.path.exists(explicit_trace):
        with open(explicit_trace, 'r', encoding='utf-8') as f:
            frames = json.load(f)
    else:
        # Try sibling trace.json next to the image
        folder = os.path.dirname(os.path.abspath(image_path))
        guess = os.path.join(folder, 'trace.json')
        if not os.path.exists(guess):
            raise SystemExit("No state found. Provide --trace, place trace.json next to the image, or embed a QR code with the state in the image.")
        with open(guess, 'r', encoding='utf-8') as f:
            frames = json.load(f)

    if not frames:
        raise SystemExit("Trace is empty.")
    # Use the last frame as current board state
    frame = frames[-1]
    board = frame['board']
    players = frame['players']
    # Sanitize: ensure types are JSON serializable and minimal
    init = {
        'seed': frame.get('turn', 0),
        'target_vp': 10,
        'board': {
            'nodes': board['nodes'],
            'hexes': board['hexes'],
            'edges': board.get('edges', []),
            'ports': board.get('ports', {}),
            'robber_hex': board.get('robber_hex', 0),
        },
        'players': [
            {
                'name': p.get('name', f'P{i}'),
                'settlements': p.get('settlements', []),
                'cities': p.get('cities', []),
                'roads': p.get('roads', []),
                'hand': p.get('hand', {}),
            }
            for i, p in enumerate(players)
        ]
    }
    return init


def load_state_from_qr_only(image_path: str) -> Optional[Dict[str, Any]]:
    """
    Attempt to read a JSON state embedded as a QR code inside the image.
    Returns an init dict or None if no QR or invalid payload.
    """
    qr = _decode_qr_json(image_path)
    if qr is None:
        return None
    # Accept either a full trace (list of frames) or an init state dict
    if isinstance(qr, list) and qr:
        frame = qr[-1]
        try:
            board = frame['board']
            players = frame['players']
        except Exception:
            return None
        return {
            'seed': frame.get('turn', 0),
            'target_vp': 10,
            'board': {
                'nodes': board['nodes'],
                'hexes': board['hexes'],
                'edges': board.get('edges', []),
                'ports': board.get('ports', {}),
                'robber_hex': board.get('robber_hex', 0),
            },
            'players': [
                {
                    'name': p.get('name', f'P{i}'),
                    'settlements': p.get('settlements', []),
                    'cities': p.get('cities', []),
                    'roads': p.get('roads', []),
                    'hand': p.get('hand', {}),
                }
                for i, p in enumerate(players)
            ]
        }
    if isinstance(qr, dict) and 'board' in qr and 'players' in qr:
        return qr
    return None


def _map_nodes_to_image_pixels(board, img_w: int, img_h: int,
                               pad: int = 40,
                               jitter: Tuple[float,float] = (0.0, 0.0),
                               angle_deg: float = 0.0) -> Dict[int, Tuple[float,float]]:
    # Fit with configurable pad and offset jitter
    nodes = board.nodes
    # Optionally rotate coordinates around origin (board is roughly centered around 0)
    import math as _m
    cosA = _m.cos(_m.radians(angle_deg)); sinA = _m.sin(_m.radians(angle_deg))
    rot_nodes = {nid: (cosA*pt[0] - sinA*pt[1], sinA*pt[0] + cosA*pt[1]) for nid, pt in nodes.items()}
    xs = [p[0] for p in rot_nodes.values()]
    ys = [p[1] for p in rot_nodes.values()]
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    bw, bh = (maxx - minx), (maxy - miny)
    scale = min(max(0.0001, (img_w - 2*pad) / max(0.0001, bw)), max(0.0001, (img_h - 2*pad) / max(0.0001, bh)))
    ox = (img_w - scale*bw)/2 - scale*minx + jitter[0]
    oy = (img_h - scale*bh)/2 - scale*miny + jitter[1]
    def P(pt):
        return (ox + scale*pt[0], oy + scale*pt[1])
    return {nid: P(pt) for nid, pt in rot_nodes.items()}


def _score_fit(Pmap: Dict[int, Tuple[float,float]], px, W: int, H: int,
               player_colors: List[Tuple[int,int,int]], window: int, thresh: float) -> float:
    score = 0.0
    inside = 0
    for (_, (x,y)) in Pmap.items():
        x = int(round(x)); y = int(round(y))
        if 0 <= x < W and 0 <= y < H:
            inside += 1
        counts = [0 for _ in player_colors]
        for dx in range(-window, window+1):
            for dy in range(-window, window+1):
                xx, yy = x+dx, y+dy
                if 0 <= xx < W and 0 <= yy < H:
                    c = px[xx, yy]
                    best_idx = min(range(len(player_colors)), key=lambda i: _color_distance(c, player_colors[i]))
                    if _color_distance(c, player_colors[best_idx]) < thresh:
                        counts[best_idx] += 1
        score += max(counts) if counts else 0
    # Slightly penalize mappings that push many nodes outside
    score *= (0.5 + 0.5 * (inside / max(1, len(Pmap))))
    return score


def _color_distance(a: Tuple[int,int,int], b: Tuple[int,int,int]) -> float:
    return ((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2) ** 0.5


def _rgb(c: str) -> Tuple[int,int,int]:
    c = c.lstrip('#')
    return tuple(int(c[i:i+2], 16) for i in (0,2,4))  # type: ignore


def extract_state_from_visualizer_image(
    image_path: str,
    num_players: int = 2,
    cancel_check: Optional[Callable[[], bool]] = None,
    progress: Optional[Callable[[float, str], None]] = None,
) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
    """
    Heuristic parser for screenshots of this repo's visualizer canvas.
    Detects 2 players' settlements/cities/roads from known colors and maps them to
    standard board nodes/edges. Board resources/numbers are generated (spiral) since
    robust OCR is out of scope. Returns init-state dict or None if image not parseable.
    """
    if Image is None:
        return None
    try:
        im = Image.open(image_path).convert('RGB')
    except Exception:
        return None
    W, H = im.size
    px = im.load()
    # Known colors: GUI palette + physical Catan piece colors
    player_colors_all: List[Tuple[int,int,int]] = [
        # GUI-ish
        (91,212,255), (255,149,233), (255,210,77), (120,245,150),
        # Physical pieces common: blue, red, orange, white/gray, black
        (40,90,170), (180,30,30), (245,150,40), (235,235,235), (210,210,210), (30,30,30)
    ]
    # Use requested num_players, but detect which colors actually appear
    # by sampling all nodes and picking colors that pass thresholds anywhere.
    base_win = max(3, int(min(W, H) * 0.006))  # adapt window to image size
    thresh = 110.0  # looser for photographs/compression
    # Build board geometry and calibrate a better fit to the screenshot
    board = make_standard_board(seed=0)
    # Calibrate pad, small jitter, and rotation angle to best match colors at node positions
    best = None
    best_params = (40, (0.0, 0.0), 0.0)
    angles = (-90,-60,-45,-30,-15,0,15,30,45,60,90)
    pads = (10, 20, 30, 40, 60, 80, 100, 120)
    dxy = (-30.0, -15.0, 0.0, 15.0, 30.0)
    total = len(pads) * len(angles) * len(dxy) * len(dxy)
    step = 0
    for pad in pads:
        for ang in angles:
            for dx in dxy:
                for dy in dxy:
                    if cancel_check and cancel_check():
                        return None
                    Pm = _map_nodes_to_image_pixels(board, W, H, pad=pad, jitter=(dx, dy), angle_deg=ang)
                    s = _score_fit(Pm, px, W, H, player_colors_all, window=base_win, thresh=thresh)
                    if (best is None) or (s > best):
                        best = s; best_params = (pad, (dx, dy), ang)
                    step += 1
                    if progress and step % 10 == 0:
                        progress(100.0 * step / total, "Calibrating fit...")
    Pmap = _map_nodes_to_image_pixels(board, W, H, pad=best_params[0], jitter=best_params[1], angle_deg=best_params[2])
    # Detect nodes by sampling area around each node
    node_owner = {}  # nid -> (color_index, kind: 'settlement'|'city')
    color_presence = [0 for _ in player_colors_all]
    node_iter = list(Pmap.items())
    for idx, (nid, (x,y)) in enumerate(node_iter):
        if cancel_check and cancel_check():
            return None
        x = int(round(x)); y = int(round(y))
        counts = [0 for _ in player_colors_all]
        window = base_win
        for dx in range(-window, window+1):
            for dy in range(-window, window+1):
                xx, yy = x+dx, y+dy
                if 0 <= xx < W and 0 <= yy < H:
                    c = px[xx, yy]
                    # find nearest canonical color
                    best_idx = min(range(len(player_colors_all)), key=lambda i: _color_distance(c, player_colors_all[i]))
                    if _color_distance(c, player_colors_all[best_idx]) < thresh:
                        counts[best_idx] += 1
        best = max(range(len(counts)), key=lambda i: counts[i])
        area = (2*window+1)*(2*window+1)
        if counts[best] > max(8, int(area*0.05)):
            # Roughly classify city vs settlement by pixel coverage ratio
            ratio = counts[best] / float(max(1, area))
            kind = 'city' if ratio > 0.20 else 'settlement'
            node_owner[nid] = (best, kind)
            color_presence[best] += 1
        if progress and idx % 40 == 0:
            progress(100.0 * idx / max(1, len(node_iter)), "Detecting pieces...")
    # Cities detection: look for larger clusters; simplistic heuristic
    # If we later find roads that connect through, it's fine either way; treat all as settlements for now

    # Detect roads: sample midpoints of edges
    road_owner = {}
    # sample three points along the edge (35%, 50%, 65%) to improve robustness
    edge_iter = list(board.edges)
    for ei, (u,v) in enumerate(edge_iter):
        if cancel_check and cancel_check():
            return None
        ux, uy = Pmap[u]; vx, vy = Pmap[v]
        pts = [
            (ux*0.35 + vx*0.65, uy*0.35 + vy*0.65),
            (ux*0.50 + vx*0.50, uy*0.50 + vy*0.50),
            (ux*0.65 + vx*0.35, uy*0.65 + vy*0.35),
        ]
        counts = [0 for _ in player_colors_all]
        win = max(2, int(base_win*0.6))
        for (mx,my) in pts:
            mx = int(round(mx)); my = int(round(my))
            for dx in range(-win, win+1):
                for dy in range(-win, win+1):
                    xx, yy = mx+dx, my+dy
                    if 0 <= xx < W and 0 <= yy < H:
                        c = px[xx, yy]
                        best_idx = min(range(len(player_colors_all)), key=lambda i: _color_distance(c, player_colors_all[i]))
                        if _color_distance(c, player_colors_all[best_idx]) < thresh:
                            counts[best_idx] += 1
        best = max(range(len(counts)), key=lambda i: counts[i])
        if counts[best] > max(6, int((2*win+1)*(2*win+1) * 0.12)):
            road_owner[(u,v)] = best
        if progress and ei % 80 == 0:
            progress(60.0 + 40.0 * ei / max(1, len(edge_iter)), "Detecting roads...")

    # Build players
    # Determine how many players to include: prefer detected colors, else fallback to parameter
    active_colors = [i for i,cnt in enumerate(color_presence) if cnt > 0]
    N = max(2, min(4, len(active_colors) if active_colors else num_players))
    players = []
    for i in range(N):
        pid = active_colors[i] if active_colors else i
        settlements = [nid for nid,(pp,kk) in node_owner.items() if pp==pid and kk=='settlement']
        cities = [nid for nid,(pp,kk) in node_owner.items() if pp==pid and kk=='city']
        roads = [[u,v] for (u,v), pp in road_owner.items() if pp==pid]
        players.append({
            'name': f'Player {i+1}',
            'settlements': settlements,
            'cities': cities,
            'roads': roads,
            'hand': {}
        })

    # Require at least one piece detected to trust parsing
    if not any(len(p['settlements']) or len(p['roads']) for p in players):
        return None

    # Detect resource types per hex by sampling color near hex centers
    res_palette = {
        None: _rgb('#353a4e'),
        'brick': _rgb('#b55a3c'),
        'wood': _rgb('#1c7b46'),
        'wool': _rgb('#8bcf63'),
        'grain': _rgb('#d7b44a'),
        'ore': _rgb('#6f6f7e'),
    }
    # Clear board assignments; we'll fill resources (numbers remain unknown)
    for h in board.hexes.values():
        h.resource = None
        h.number = None
    # Helper to map arbitrary point using the chosen fit
    def Ppt(pt):
        # replicate _map_nodes_to_image_pixels math with best_params
        nodes = board.nodes
        xs = [p[0] for p in nodes.values()]; ys = [p[1] for p in nodes.values()]
        minx, maxx = min(xs), max(xs); miny, maxy = min(ys), max(ys)
        bw, bh = (maxx - minx), (maxy - miny)
        pad = best_params[0]; dx, dy = best_params[1]
        scale = min(max(0.0001, (W - 2*pad) / max(0.0001, bw)), max(0.0001, (H - 2*pad) / max(0.0001, bh)))
        ox = (W - scale*bw)/2 - scale*minx + dx
        oy = (H - scale*bh)/2 - scale*miny + dy
        return (ox + scale*pt[0], oy + scale*pt[1])

    hex_list = list(board.hexes.items())
    for hi, (hid, h) in enumerate(hex_list):
        if cancel_check and cancel_check():
            return None
        cx, cy = Ppt(h.center)
        cx = int(round(cx)); cy = int(round(cy))
        win = max(6, int(base_win*1.8))
        cnt = 0; acc = [0,0,0]
        for dx in range(-win, win+1):
            for dy in range(-win, win+1):
                xx, yy = cx+dx, cy+dy
                if 0 <= xx < W and 0 <= yy < H:
                    r,g,b = px[xx, yy]
                    acc[0]+=r; acc[1]+=g; acc[2]+=b; cnt+=1
        if cnt>0:
            avg = (acc[0]/cnt, acc[1]/cnt, acc[2]/cnt)
            # pick closest resource color (broad match; photos vary)
            best_res = None; best_d = 1e9
            for name, col in res_palette.items():
                d = _color_distance(avg, col)
                if d < best_d:
                    best_d = d; best_res = name
            # Only accept if relatively close; else leave as None to avoid wrong assignment
            if best_d < 90.0:
                board.hexes[hid].resource = best_res
        if progress and hi % 5 == 0:
            progress(100.0, "Detecting resources...")

    # Set robber on a desert if detected
    deserts = [hid for hid,h in board.hexes.items() if h.resource is None]
    board.robber_hex = deserts[0] if deserts else 0
    # Ports are not detectable reliably from image; clear them
    board.ports = {}

    # Build JSON from detected board and parsed placements
    board_json = {
        'nodes': {str(k): list(v) for k,v in board.nodes.items()},
        'hexes': {str(hid): {'resource': h.resource, 'number': h.number, 'nodes': h.nodes} for hid,h in board.hexes.items()},
        'edges': [list(e) for e in board.edges],
        'ports': board.ports,
        'robber_hex': board.robber_hex,
    }
    init = {'seed': 0, 'target_vp': 10, 'board': board_json, 'players': players}
    overlay = {
        'player_colors_rgb': player_colors_all,
        'node_pixels': {int(n): (float(x), float(y)) for n,(x,y) in Pmap.items()},
        'detected_settlements': {i: players[i]['settlements'] for i in range(len(players))},
        'detected_roads': {i: players[i]['roads'] for i in range(len(players))},
        'image_size': (W, H),
    }
    return init, overlay


def compute_quick_stats(init: Dict[str, Any]) -> Dict[str, Any]:
    # Simple production potential per player (sum of dice weights of adjacent numbers)
    hexes = init['board']['hexes']
    node_to_hexes = {}
    for hid_str, h in hexes.items():
        for nid in h['nodes']:
            node_to_hexes.setdefault(nid, []).append(int(hid_str))
    stats = []
    for i, p in enumerate(init['players']):
        pip = 0
        for nid in p.get('settlements', []):
            for hid in node_to_hexes.get(nid, []):
                num = hexes[str(hid)]['number']
                if num is not None:
                    pip += {2:1,3:2,4:3,5:4,6:5,8:5,9:4,10:3,11:2,12:1}.get(num, 0)
        for nid in p.get('cities', []):
            for hid in node_to_hexes.get(nid, []):
                num = hexes[str(hid)]['number']
                if num is not None:
                    pip += 2*{2:1,3:2,4:3,5:4,6:5,8:5,9:4,10:3,11:2,12:1}.get(num, 0)
        stats.append({'name': p['name'], 'pip_sum': pip, 'settlements': len(p.get('settlements', [])), 'cities': len(p.get('cities', []))})
    return {'production_pips': stats}


def main():
    ap = argparse.ArgumentParser(description='Estimate win rates from a board image by pairing with a trace.json state')
    ap.add_argument('--image', required=True, help='Path to board image (screenshot or photo)')
    ap.add_argument('--trace', help='Optional trace.json path; defaults to sibling of image')
    ap.add_argument('--games', type=int, default=500, help='Simulations to run')
    ap.add_argument('--turns', type=int, default=300, help='Max turns per game')
    ap.add_argument('--out', default='image_results.json', help='Where to write results JSON')
    args = ap.parse_args()

    # Try QR/state in image; else trace (if provided or sibling); else heuristic parse
    try:
        init = load_trace_from_image(args.image, args.trace)
    except SystemExit as e:
        # fallback to heuristic visual parse
        parsed = extract_state_from_visualizer_image(args.image)
        if parsed is None:
            raise
        init = parsed
    quick = compute_quick_stats(init)
    wins, turns = simulate(init, games=args.games, max_turns=args.turns, use_mcts=False)
    names = [p['name'] for p in init['players']]
    total = sum(wins) if sum(wins) > 0 else 1
    results = {
        'players': [
            {'id': i, 'name': names[i], 'wins': wins[i], 'win_rate': wins[i]/total}
            for i in range(len(names))
        ],
        'games': args.games,
        'avg_turns': (sum(turns)/len(turns)) if turns else None,
        'quick_stats': quick,
        'source_image': os.path.abspath(args.image),
    }
    with open(args.out, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
    print('Saved:', args.out)


if __name__ == '__main__':
    main()
