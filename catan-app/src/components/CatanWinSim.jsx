import React, { useEffect, useMemo, useState, useRef } from "react";

/**
 * Catan Starting Position — Browser-Only Win Predictor (Classic 19-hex board)
 * -------------------------------------------------------------------------
 * Upload a board image and use it for simulation:
 *  - Background overlay with opacity/scale/offset controls
 *  - Auto-detect resources from image colors (beta)
 *  - Fast token entry mode via keyboard
 *  - Roads (streets) placement and visualization
 */

// ---------- Types & Constants ----------
const RESOURCES = ["wood", "brick", "sheep", "wheat", "ore", "desert"]; // desert produces nothing
const TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]; // standard set (no 7)
const DICE_P = { 2: 1/36, 3: 2/36, 4: 3/36, 5: 4/36, 6: 5/36, 7: 6/36, 8: 5/36, 9: 4/36, 10: 3/36, 11: 2/36, 12: 1/36 };

const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f"]; // red, blue, green, yellow

const COSTS = {
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
  city: { ore: 3, wheat: 2 },
  road: { wood: 1, brick: 1 },
  dev: { ore: 1, sheep: 1, wheat: 1 },
};

const DEV_EXPECTED_VP = 0.25; // rough proxy

// Layout constants
const HEX_SIZE = 48; // pixel radius

// Color utilities for resource detection
function hexToRgb(hex){
  const h = hex.replace('#','');
  const bigint = parseInt(h, 16);
  return { r: (bigint>>16)&255, g: (bigint>>8)&255, b: bigint&255 };
}
function rgbDist(a,b){ const dr=a.r-b.r, dg=a.g-b.g, db=a.b-b.b; return Math.sqrt(dr*dr+dg*dg+db*db); }
const RESOURCE_PALETTE = {
  wood: hexToRgb("#8BC34A"), brick: hexToRgb("#E57373"), sheep: hexToRgb("#AED581"), wheat: hexToRgb("#FBC02D"), ore: hexToRgb("#B0BEC5"), desert: hexToRgb("#F5DEB3")
};

// Axial coordinate helpers (pointy-topped)
function axialToPixel(q, r, size = HEX_SIZE) {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * (3 / 2) * r;
  return { x, y };
}
function hexCorner(center, size, i) {
  const angle = Math.PI / 180 * (60 * i - 30);
  return { x: center.x + size * Math.cos(angle), y: center.y + size * Math.sin(angle) };
}

// Classic Catan axial coords (rows 3-4-5-4-3 = 19)
const STD_AXIAL_19 = [
  { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 },
  { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 2, r: -1 },
  { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 },
  { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 },
  { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 },
];

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// ---------- Core Board Model ----------
function makeInitialBoard() {
  const bag = [
    ...Array(4).fill("wood"),
    ...Array(3).fill("brick"),
    ...Array(4).fill("sheep"),
    ...Array(4).fill("wheat"),
    ...Array(3).fill("ore"),
    "desert",
  ];
  const res = shuffle(bag);
  const tokens = [...TOKENS];
  return STD_AXIAL_19.map((ax, i) => {
    const resource = res[i % res.length];
    const token = resource === "desert" ? null : tokens.pop();
    return { id: i, q: ax.q, r: ax.r, resource, token };
  });
}

function computeNodes(tiles) {
  const nodeMap = new Map();
  const idOf = (pt) => `${Math.round(pt.x)}:${Math.round(pt.y)}`;
  const nodes = [];
  tiles.forEach((t) => {
    const center = axialToPixel(t.q, t.r);
    const corners = Array.from({ length: 6 }, (_, i) => hexCorner(center, HEX_SIZE, i));
    corners.forEach((c) => {
      const key = idOf(c);
      if (!nodeMap.has(key)) {
        const id = nodes.length;
        nodeMap.set(key, id);
        nodes.push({ id, x: c.x, y: c.y, adjHexes: new Set([t.id]) });
      } else {
        nodes[nodeMap.get(key)].adjHexes.add(t.id);
      }
    });
  });
  nodes.forEach((n) => (n.adjHexes = Array.from(n.adjHexes)));
  return nodes;
}

function makeNodeAdjacency(nodes, tiles) {
  const hexCornersToNode = new Map();
  tiles.forEach((t) => {
    const center = axialToPixel(t.q, t.r);
    const corners = Array.from({ length: 6 }, (_, i) => hexCorner(center, HEX_SIZE, i));
    const ids = corners.map((c) => findNearestNodeId(nodes, c.x, c.y));
    hexCornersToNode.set(t.id, ids);
  });
  const neighbors = new Map(nodes.map((n) => [n.id, new Set()]));
  for (const ids of hexCornersToNode.values()) {
    for (let i = 0; i < 6; i++) {
      const a = ids[i];
      const b = ids[(i + 1) % 6];
      neighbors.get(a).add(b);
      neighbors.get(b).add(a);
    }
  }
  const neighborArr = new Map();
  neighbors.forEach((set, id) => neighborArr.set(id, Array.from(set)));
  return neighborArr;
}

function computeEdges(nodes, neighbors) {
  const edges = [];
  const edgeSet = new Set();
  
  neighbors.forEach((adjList, nodeId) => {
    adjList.forEach(adjNodeId => {
      const edgeKey = nodeId < adjNodeId ? `${nodeId}-${adjNodeId}` : `${adjNodeId}-${nodeId}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push({
          id: edges.length,
          from: nodeId,
          to: adjNodeId,
          x1: nodes[nodeId].x,
          y1: nodes[nodeId].y,
          x2: nodes[adjNodeId].x,
          y2: nodes[adjNodeId].y
        });
      }
    });
  });
  
  return edges;
}

function findNearestNodeId(nodes, x, y) {
  let best = 0, bestD = Infinity;
  for (const n of nodes) {
    const d = (n.x - x) ** 2 + (n.y - y) ** 2;
    if (d < bestD) { bestD = d; best = n.id; }
  }
  return best;
}

function findNearestEdgeId(edges, x, y) {
  let best = 0, bestD = Infinity;
  for (const e of edges) {
    // Calculate distance to line segment
    const A = x - e.x1;
    const B = y - e.y1;
    const C = e.x2 - e.x1;
    const D = e.y2 - e.y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    if (param < 0) {
      xx = e.x1;
      yy = e.y1;
    } else if (param > 1) {
      xx = e.x2;
      yy = e.y2;
    } else {
      xx = e.x1 + param * C;
      yy = e.y1 + param * D;
    }
    
    const dx = x - xx;
    const dy = y - yy;
    const d = dx * dx + dy * dy;
    
    if (d < bestD) {
      bestD = d;
      best = e.id;
    }
  }
  return best;
}

// ---------- Simulation Helpers ----------
function sampleDice() { return (1 + Math.floor(Math.random()*6)) + (1 + Math.floor(Math.random()*6)); }
function canAfford(bank, cost) { return Object.entries(cost).every(([k, v]) => (bank[k] || 0) >= v); }
function pay(bank, cost) { const nb = { ...bank }; for (const [k, v] of Object.entries(cost)) nb[k] = (nb[k] || 0) - v; return nb; }
function add(bank, addend) { const nb = { ...bank }; for (const [k, v] of Object.entries(addend)) nb[k] = (nb[k] || 0) + v; return nb; }
function tryTrade441(bank, needKey) { for (const k of ["wood","brick","sheep","wheat","ore"]) { while ((bank[k]||0)>=4) { bank[k]-=4; bank[needKey]=(bank[needKey]||0)+1; if((bank[needKey]||0)>=1) return; } } }
function greedyBuildStep(player) {
  if (canAfford(player.bank, COSTS.city) && player.settlements > player.cities) { player.bank = pay(player.bank, COSTS.city); player.cities += 1; player.vp += 1; return true; }
  if (canAfford(player.bank, COSTS.settlement)) { player.bank = pay(player.bank, COSTS.settlement); player.settlements += 1; player.vp += 1; return true; }
  if (canAfford(player.bank, COSTS.road)) { player.bank = pay(player.bank, COSTS.road); player.roadsBuilt += 1; return true; }
  if (canAfford(player.bank, COSTS.dev)) { player.bank = pay(player.bank, COSTS.dev); player.devBought += 1; player.vpFromDev += DEV_EXPECTED_VP; return true; }
  const target = (player.settlements > player.cities) ? ["ore", "wheat"] : ["wood", "brick", "sheep", "wheat"]; for (const need of target) tryTrade441(player.bank, need); return false;
}
function wilsonCI(p, n, z = 1.96) { if (n===0) return [0,0]; const denom = 1 + (z*z)/n; const center = (p + (z*z)/(2*n))/denom; const margin = (z/denom) * Math.sqrt((p*(1-p))/n + (z*z)/(4*n*n)); return [Math.max(0, center-margin), Math.min(1, center+margin)]; }

// ---------- React App ----------
export default function CatanWinSim() {
  const [tiles, setTiles] = useState(makeInitialBoard);
  const nodes = useMemo(() => computeNodes(tiles), [tiles]);
  const neighbors = useMemo(() => makeNodeAdjacency(nodes, tiles), [nodes, tiles]);
  const edges = useMemo(() => computeEdges(nodes, neighbors), [nodes, neighbors]);

  const [numPlayers, setNumPlayers] = useState(4);
  const playersInit = useMemo(() => Array.from({ length: numPlayers }, (_, i) => ({ 
    id: i, 
    color: COLORS[i], 
    settlementsAt: [], 
    roadsAt: [] 
  })), [numPlayers]);
  const [players, setPlayers] = useState(playersInit);
  useEffect(() => setPlayers(playersInit), [playersInit]);

  const [editMode, setEditMode] = useState(false);
  const [selectedTile, setSelectedTile] = useState(null);
  const [currentPlr, setCurrentPlr] = useState(0);
  const [phase, setPhase] = useState("place");
  const [placementMode, setPlacementMode] = useState("settlement"); // "settlement" or "road"
  const [runs, setRuns] = useState(1500);
  const [simBusy, setSimBusy] = useState(false);
  const [results, setResults] = useState(null);

  // Background board image
  const [bgUrl, setBgUrl] = useState(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);
  const [bgScale, setBgScale] = useState(1);
  const [bgOffset, setBgOffset] = useState({ x: 0, y: 0 });
  const [bgShow, setBgShow] = useState(true);
  const [bgError, setBgError] = useState(null);

  async function setBgFromBlob(blob){
    if(!blob) return;
    const url = URL.createObjectURL(blob);
    setBgUrl(url);
    setBgError(null);
  }
  function onUploadImage(e){
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    setBgFromBlob(file);
    e.target.value = ""; // allow re-uploading same file
  }
  function clearBg(){ setBgUrl(null); setBgError(null); }
  function updateBgOffset(axis, value){ setBgOffset(prev=> ({...prev, [axis]: Number(value)})); }

  // Hidden canvas for image sampling
  const scanCanvasRef = useRef(null);
  // Token entry mode
  const [tokenMode, setTokenMode] = useState(false);
  const [tokenCursor, setTokenCursor] = useState(0);

  // Derived
  const prodByPlayer = useMemo(() => computeProduction(players, nodes, tiles), [players, nodes, tiles]);

  function resetBoard() { 
    setTiles(makeInitialBoard()); 
    setPlayers(playersInit); 
    setResults(null); 
    setPhase("place"); 
    setCurrentPlr(0); 
    setPlacementMode("settlement");
    setBgUrl(null); 
  }
  
  function onTileClick(tid) { if (!editMode) return; setSelectedTile(tid); }
  function updateSelectedTile(field, value) { if (selectedTile == null) return; setTiles(prev => prev.map((t) => t.id === selectedTile ? { ...t, [field]: value } : t)); }
  
  function canPlaceSettlement(nodeId) { 
    const occupied = new Set(players.flatMap(p => p.settlementsAt)); 
    if (occupied.has(nodeId)) return false; 
    const adj = neighbors.get(nodeId) || []; 
    if (adj.some((n) => occupied.has(n))) return false; 
    const touchesProduce = (nodes[nodeId].adjHexes || []).some((hid) => tiles[hid].resource !== "desert"); 
    return touchesProduce; 
  }
  
  function canPlaceRoad(edgeId) {
    // Check if road already exists
    const occupiedRoads = new Set(players.flatMap(p => p.roadsAt));
    if (occupiedRoads.has(edgeId)) return false;
    
    const edge = edges[edgeId];
    const currentPlayer = players[currentPlr];
    
    // For initial placement, road must connect to player's settlement
    if (phase === "place") {
      return currentPlayer.settlementsAt.includes(edge.from) || 
             currentPlayer.settlementsAt.includes(edge.to);
    }
    
    // For regular gameplay, road must connect to existing road or settlement
    const playerRoads = currentPlayer.roadsAt;
    const playerSettlements = currentPlayer.settlementsAt;
    
    return playerSettlements.includes(edge.from) || 
           playerSettlements.includes(edge.to) ||
           playerRoads.some(roadId => {
             const road = edges[roadId];
             return road.from === edge.from || road.to === edge.from ||
                    road.from === edge.to || road.to === edge.to;
           });
  }
  
  function handlePlace(nodeId, edgeId) { 
    if (phase !== "place") return; 
    
    if (placementMode === "settlement" && nodeId !== undefined) {
      if (!canPlaceSettlement(nodeId)) return;
      setPlayers(prev => prev.map((p,i)=> i===currentPlr? { ...p, settlementsAt:[...p.settlementsAt, nodeId]}:p));
      
      const totalSettlements = players.reduce((a,p)=> a+p.settlementsAt.length, 0) + 1;
      if (totalSettlements < numPlayers * 2) {
        setPlacementMode("road");
      } else {
        setCurrentPlr(c => (c+1)%numPlayers);
        if (totalSettlements >= numPlayers*2) setPhase("ready");
      }
    } else if (placementMode === "road" && edgeId !== undefined) {
      if (!canPlaceRoad(edgeId)) return;
      setPlayers(prev => prev.map((p,i)=> i===currentPlr? { ...p, roadsAt:[...p.roadsAt, edgeId]}:p));
      
      setCurrentPlr(c => (c+1)%numPlayers);
      setPlacementMode("settlement");
      
      const totalSettlements = players.reduce((a,p)=> a+p.settlementsAt.length, 0) + 1;
      if (totalSettlements >= numPlayers*2) setPhase("ready");
    }
  }

  function grantInitialResources() { 
    const start = players.map(()=> ({ wood:0, brick:0, sheep:0, wheat:0, ore:0 })); 
    players.forEach((p,i)=>{ 
      const second = p.settlementsAt[1]; 
      if(second==null) return; 
      const hexes = nodes[second].adjHexes; 
      hexes.forEach(hid=>{ 
        const h=tiles[hid]; 
        if (h.resource && h.resource!=="desert") 
          start[i][h.resource] = (start[i][h.resource]||0)+1; 
      });
    }); 
    return start; 
  }

  // Auto-detect resources from the uploaded image colors
  const vb = useMemo(()=>{ const pts = tiles.map(t => axialToPixel(t.q, t.r)); const xs = pts.map(p=>p.x), ys=pts.map(p=>p.y); const pad = 2*HEX_SIZE; return { minX: Math.min(...xs)-pad, maxX: Math.max(...xs)+pad, minY: Math.min(...ys)-pad, maxY: Math.max(...ys)+pad }; }, [tiles]);
  
  async function autoDetectResourcesFromImage(){
    if(!bgUrl) return;
    const W = vb.maxX - vb.minX, H = vb.maxY - vb.minY;
    let canvas = scanCanvasRef.current;
    if(!canvas){
      canvas = document.createElement('canvas');
      scanCanvasRef.current = canvas;
    }
    canvas.width = Math.ceil(W);
    canvas.height = Math.ceil(H);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);

    const img = new Image();
    if (typeof bgUrl === "string" && bgUrl.startsWith("http")) {
      img.crossOrigin = "anonymous";
    }
    const p = new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error("Image load failed (CORS or URL)."));
    });
    img.src = bgUrl;
    try {
      await p;
    } catch (err) {
      setBgError("Load failed. If it's a web URL, CORS blocked canvas. Upload the file instead.");
      return;
    }

    const drawX = (bgOffset?.x||0);
    const drawY = (bgOffset?.y||0);
    const drawW = W * (bgScale || 1);
    const drawH = H * (bgScale || 1);
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    const updated = tiles.map(t=> ({...t}));
    tiles.forEach((t, idx)=>{
      const center = axialToPixel(t.q, t.r);
      const corners = Array.from({length:6}, (_,i)=> hexCorner(center, HEX_SIZE*0.6, i));
      const samples = [corners[0], corners[2], corners[4]];
      const rgbAvg = {r:0,g:0,b:0}; let count=0;
      samples.forEach(pt=>{
        const cx = Math.round((pt.x - vb.minX));
        const cy = Math.round((pt.y - vb.minY));
        if(cx>=0 && cy>=0 && cx<canvas.width && cy<canvas.height){
          const d = ctx.getImageData(cx, cy, 1, 1).data;
          rgbAvg.r+=d[0]; rgbAvg.g+=d[1]; rgbAvg.b+=d[2];
          count++;
        }
      });
      if(count>0){ rgbAvg.r/=count; rgbAvg.g/=count; rgbAvg.b/=count; }
      const rgb = { r: rgbAvg.r, g: rgbAvg.g, b: rgbAvg.b };
      let bestRes='desert', bestD=Infinity;
      for(const [res, ref] of Object.entries(RESOURCE_PALETTE)){
        const d = rgbDist(rgb, ref);
        if(d<bestD){ bestD=d; bestRes=res; }
      }
      updated[idx].resource = bestRes;
      if(bestRes==='desert') updated[idx].token = null;
    });
    setTiles(updated);
  }

  function startTokenMode(){ setTokenMode(true); setTokenCursor(0); }
  function stopTokenMode(){ setTokenMode(false); }
  function handleKeyDown(e){ 
    if(!tokenMode) return; 
    const key=e.key; 
    if(key==='Escape'){ stopTokenMode(); return; } 
    if(key==='Backspace'){ setTiles(prev=> prev.map((t,i)=> i===tokenCursor? {...t, token:null}: t)); return; } 
    if(key===' '|| key==='ArrowRight'){ setTokenCursor(c=> Math.min(c+1, tiles.length-1)); return; } 
    if(key==='ArrowLeft'){ setTokenCursor(c=> Math.max(c-1, 0)); return; } 
    if(/^[0-9]$/.test(key)){ const n = Number(key); if(n>=2 && n<=9 && n!==7){ setTiles(prev=> prev.map((t,i)=> i===tokenCursor? {...t, token:n}: t)); setTokenCursor(c=> Math.min(c+1, tiles.length-1)); return; } } 
  }

  async function runSimulation() {
    if (phase !== "ready") return; setSimBusy(true); await new Promise((r)=>setTimeout(r));
    const startBanks = grantInitialResources(); const wins = Array(numPlayers).fill(0); const TURN_CAP = 600;
    for (let run = 0; run < runs; run++) {
      const plr = players.map((p, i) => ({ id: i, bank: { ...startBanks[i] }, settlements: 2, cities: 0, roadsBuilt: 0, devBought: 0, vpFromDev: 0, vp: 2, prod: prodByPlayer[i] }));
      let winner = -1;
      for (let turn = 0; turn < TURN_CAP; turn++) {
        const roll = sampleDice();
        if (roll === 7) {
          plr.forEach((P) => { const total = Object.values(P.bank).reduce((a,b)=>a+b,0); if(total>7){ let toDiscard = Math.floor(total/2); const keys=["wood","brick","sheep","wheat","ore"].sort((a,b)=>(P.bank[b]||0)-(P.bank[a]||0)); for(const k of keys){ const take=Math.min(P.bank[k]||0, toDiscard); P.bank[k]-=take; toDiscard-=take; if(!toDiscard) break; } } });
        } else {
          players.forEach((p, idx) => { const gain = productionFromRollForPlayer(roll, p, nodes, tiles); if (gain) plr[idx].bank = add(plr[idx].bank, gain); });
        }
        for (let i = 0; i < numPlayers; i++) { for (let k = 0; k < 3; k++) { greedyBuildStep(plr[i]); } if (plr[i].vp + plr[i].vpFromDev >= 10) { winner = i; break; } }
        if (winner >= 0) break;
      }
      if (winner >= 0) wins[winner]++; else { let best=0, bestScore=-Infinity; for(let i=0;i<numPlayers;i++){ const bankTotal = Object.values(plr[i].bank).reduce((a,b)=>a+b,0); const score = (plr[i].vp + plr[i].vpFromDev) + 0.001*bankTotal + 0.05*plr[i].devBought; if(score>bestScore){ bestScore=score; best=i; } } wins[best]++; }
    }
    const probs = wins.map((w)=> w/runs); const ci = probs.map((p)=> wilsonCI(p, runs)); setResults({ wins, probs, ci, runs }); setSimBusy(false);
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900" onKeyDown={handleKeyDown} tabIndex={0}
         onPaste={(e)=>{ const items = e.clipboardData?.items; if(!items) return; for(const it of items){ if(it.type && it.type.startsWith('image/')){ const blob = it.getAsFile(); setBgFromBlob(blob); break; } } }}>
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Catan Starting Position — Win Predictor with Roads</h1>
          <div className="flex items-center gap-2 text-sm">
            <button className="px-3 py-1.5 rounded bg-slate-800 text-white hover:bg-slate-700" onClick={resetBoard}>New Random Board</button>
            <label className="flex items-center gap-2"><span>Players</span>
              <select className="border rounded px-2 py-1" value={numPlayers} onChange={(e)=>setNumPlayers(Number(e.target.value))}>{[2,3,4].map(n=> <option key={n} value={n}>{n}</option>)}</select>
            </label>
            <label className="flex items-center gap-2"><span>Edit Board</span>
              <input type="checkbox" checked={editMode} onChange={(e)=>setEditMode(e.target.checked)} />
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4 grid md:grid-cols-[2fr,1fr] gap-6">
        {/* Board Canvas */}
        <div className="relative bg-white rounded-2xl shadow p-3 overflow-hidden"
             onDragOver={(e)=>{ e.preventDefault(); e.dataTransfer.dropEffect='copy'; }}
             onDrop={(e)=>{ e.preventDefault(); const f = e.dataTransfer.files?.[0]; if(f && f.type.startsWith('image/')) setBgFromBlob(f); }}>
          <BoardSVG
            tiles={tiles}
            nodes={nodes}
            edges={edges}
            onTileClick={onTileClick}
            players={players}
            onPlace={handlePlace}
            canPlaceSettlement={canPlaceSettlement}
            canPlaceRoad={canPlaceRoad}
            bgUrl={bgUrl}
            bgOpacity={bgOpacity}
            bgScale={bgScale}
            bgOffset={bgOffset}
            tokenMode={tokenMode}
            tokenCursor={tokenCursor}
            bgShow={bgShow}
            placementMode={placementMode}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {players.map((p,i)=> (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="inline-block w-3 h-3 rounded-full" style={{background:p.color}} />
                <span>Player {i+1}</span>
                <span className="text-slate-500">— {p.settlementsAt.length}/2 settlements, {p.roadsAt.length} roads</span>
                {phase==="place" && currentPlr===i && (
                  <span className="px-2 py-0.5 rounded bg-slate-100 border">
                    placing {placementMode}...
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Side Panel */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-semibold mb-2">Board Editor</h2>

            {/* Upload image controls */}
            <div className="mt-2 mb-3">
              <h3 className="font-medium mb-2">Upload Board Image (optional)</h3>
              <div className="flex flex-col gap-2 text-sm">
                <input type="file" accept="image/*" onChange={onUploadImage} className="block text-sm" />
                <div className="text-xs text-slate-500">You can <b>drag-drop</b> an image here or <b>paste</b> from clipboard. If using a web URL, CORS might block it—better to upload the file.</div>
                {bgUrl && (
                  <div className="flex flex-col gap-2 p-2 border rounded bg-slate-50">
                    <img src={bgUrl} alt="preview" className="w-full max-h-32 object-contain rounded" />
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2">Opacity
                        <input type="range" min="0" max="1" step="0.05" value={bgOpacity} onChange={(e)=>setBgOpacity(Number(e.target.value))} className="w-full" />
                        <span className="w-10 text-right">{bgOpacity.toFixed(2)}</span>
                      </label>
                      <label className="flex items-center gap-2">Scale
                        <input type="range" min="0.5" max="2" step="0.05" value={bgScale} onChange={(e)=>setBgScale(Number(e.target.value))} className="w-full" />
                        <span className="w-10 text-right">{bgScale.toFixed(2)}</span>
                      </label>
                      <label className="flex items-center gap-2">Offset X
                        <input type="number" className="border rounded px-2 py-1 w-24" value={bgOffset.x} onChange={(e)=>updateBgOffset('x', e.target.value)} />
                      </label>
                      <label className="flex items-center gap-2">Offset Y
                        <input type="number" className="border rounded px-2 py-1 w-24" value={bgOffset.y} onChange={(e)=>updateBgOffset('y', e.target.value)} />
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={bgShow} onChange={(e)=>setBgShow(e.target.checked)} />
                      <span>Show background</span>
                    </div>
                    {bgError && <div className="text-xs text-red-600">{bgError}</div>}
                    <div className="flex flex-wrap gap-2">
                      <button onClick={autoDetectResourcesFromImage} className="px-2 py-1 rounded bg-emerald-600 text-white text-xs">Auto-detect resources (beta)</button>
                      <button onClick={startTokenMode} className="px-2 py-1 rounded bg-indigo-600 text-white text-xs">Token entry mode</button>
                      <button onClick={clearBg} className="px-2 py-1 rounded bg-slate-800 text-white text-xs">Remove Image</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hex editor */}
            {selectedTile==null ? (
              <p className="text-sm text-slate-600">Toggle <b>Edit Board</b>, click a hex to edit its resource/token.</p>
            ) : (
              <div className="flex flex-col gap-2 text-sm">
                <div className="font-medium">Selected Hex #{selectedTile}</div>
                <label className="flex items-center gap-2">Resource
                  <select className="border rounded px-2 py-1" value={tiles[selectedTile].resource} onChange={(e)=>updateSelectedTile("resource", e.target.value)}>
                    {RESOURCES.map(r=> <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2">Token
                  <select className="border rounded px-2 py-1" value={tiles[selectedTile].token ?? ""} onChange={(e)=>updateSelectedTile("token", e.target.value===""? null : Number(e.target.value))}>
                    <option value="">(none)</option>
                    {[2,3,4,5,6,8,9,10,11,12].map(t=> <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <p className="text-xs text-slate-500">Tip: Desert should have no token.</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-semibold mb-2">Quick Stats</h2>
            {players.map((p,i)=> (
              <div key={i} className="mb-3 p-2 rounded border">
                <div className="flex items-center gap-2 mb-1"><span className="inline-block w-3 h-3 rounded-full" style={{background:p.color}} /> <b>Player {i+1}</b></div>
                <QuickStats prod={prodByPlayer[i]} />
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-semibold mb-2">Simulation</h2>
            <div className="flex items-center gap-2 text-sm mb-2">
              <label className="flex items-center gap-2">Runs
                <input type="number" className="border rounded px-2 py-1 w-24" min={100} max={20000} step={100} value={runs} onChange={(e)=>setRuns(Number(e.target.value))} />
              </label>
            </div>
            <button disabled={phase!=="ready" || simBusy} onClick={runSimulation} className="px-3 py-1.5 rounded bg-indigo-600 text-white disabled:opacity-50">
              {simBusy? "Running…" : (phase!=="ready"? "Place settlements & roads" : "Run Monte-Carlo")}
            </button>
            {results && <ResultsCard results={results} players={players} />}
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-6 text-xs text-slate-500">
        <p>Enhanced with roads! Click nodes to place settlements, click edges to place roads. Simplified build/trade; no ports, Longest Road, or Largest Army yet.</p>
      </footer>
    </div>
  );
}

// ---------- UI Components ----------
function BoardSVG({ tiles, nodes, edges, onTileClick, players, onPlace, canPlaceSettlement, canPlaceRoad, bgUrl, bgOpacity, bgScale, bgOffset, tokenMode, tokenCursor, bgShow, placementMode }) {
  const { minX, minY, maxX, maxY } = useMemo(() => {
    const pts = tiles.map(t => axialToPixel(t.q, t.r));
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const pad = 2*HEX_SIZE;
    return { minX: Math.min(...xs)-pad, maxX: Math.max(...xs)+pad, minY: Math.min(...ys)-pad, maxY: Math.max(...ys)+pad };
  }, [tiles]);

  const occupied = new Set(players.flatMap(p => p.settlementsAt));
  const occupiedRoads = new Set(players.flatMap(p => p.roadsAt));

  return (
    <svg viewBox={`${minX} ${minY} ${maxX-minX} ${maxY-minY}`} className="w-full aspect-[16/11] bg-slate-100 rounded-xl">
      {/* Background uploaded image */}
      {bgUrl && bgShow && (
        <image
          href={bgUrl}
          xlinkHref={bgUrl}
          x={minX + (bgOffset?.x || 0)}
          y={minY + (bgOffset?.y || 0)}
          width={(maxX - minX) * (bgScale || 1)}
          height={(maxY - minY) * (bgScale || 1)}
          opacity={bgOpacity ?? 0.5}
          preserveAspectRatio="xMidYMid meet"
          pointerEvents="none"
        />
      )}

      {/* Active token cursor highlight */}
      {tokenMode && tiles[tokenCursor] && (()=>{ const c = axialToPixel(tiles[tokenCursor].q, tiles[tokenCursor].r); return (<circle cx={c.x} cy={c.y} r={HEX_SIZE*0.85} fill="none" stroke="#6366f1" strokeWidth={3} strokeDasharray="6 6" />); })()}

      {/* Hex tiles */}
      {tiles.map((t) => <HexTile key={t.id} t={t} onClick={()=>onTileClick(t.id)} />)}

      {/* Roads (edges) */}
      {edges.map((e) => {
        const isOccupied = occupiedRoads.has(e.id);
        const canPlace = canPlaceRoad(e.id);
        const isPlaceable = placementMode === "road" && canPlace && !isOccupied;
        
        // Find which player owns this road
        let ownerColor = "#94a3b8";
        players.forEach(p => {
          if (p.roadsAt.includes(e.id)) {
            ownerColor = p.color;
          }
        });
        
        return (
          <g key={e.id}>
            <line
              x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke={isOccupied ? ownerColor : (isPlaceable ? "#22c55e" : "#d1d5db")}
              strokeWidth={isOccupied ? 4 : (isPlaceable ? 3 : 1)}
              strokeOpacity={isOccupied ? 1 : (isPlaceable ? 0.8 : 0.3)}
              onClick={() => onPlace(undefined, e.id)}
              className="cursor-pointer hover:stroke-opacity-100"
            />
          </g>
        );
      })}

      {/* Nodes (intersections) */}
      {nodes.map((n)=> {
        const ok = canPlaceSettlement(n.id);
        const isPlaceable = placementMode === "settlement" && ok;
        
        return (
          <g key={n.id} transform={`translate(${n.x},${n.y})`}>
            <circle 
              r={8} 
              fill={occupied.has(n.id) ? "#334155" : (isPlaceable ? "#22c55e" : "#94a3b8")} 
              opacity={occupied.has(n.id) ? 1 : (isPlaceable ? 0.8 : 0.4)} 
              stroke="#0f172a" 
              strokeWidth={0.5} 
              onClick={() => onPlace(n.id, undefined)}
              className="cursor-pointer hover:opacity-100"
            />
          </g>
        );
      })}

      {/* Placed settlements */}
      {players.map((p,i)=> p.settlementsAt.map((nid, idx)=> { 
        const n = nodes[nid]; 
        return (
          <g key={`${p.id}-${idx}`} transform={`translate(${n.x},${n.y})`}>
            <rect x={-8} y={-8} width={16} height={16} rx={2} ry={2} fill={p.color} stroke="#111827" strokeWidth={0.8} />
          </g>
        ); 
      }))}
    </svg>
  );
}

function HexTile({ t, onClick }) {
  const center = axialToPixel(t.q, t.r);
  const pts = Array.from({ length: 6 }, (_, i) => hexCorner(center, HEX_SIZE, i));
  const d = `M ${pts.map(p=>`${p.x},${p.y}`).join(" L ")} Z`;
  const fill = { wood: "#8BC34A", brick: "#E57373", sheep: "#AED581", wheat: "#FBC02D", ore: "#B0BEC5", desert: "#F5DEB3" }[t.resource] || "#ddd";
  const text = t.token ?? ""; const hot = t.token===6 || t.token===8;
  return (
    <g onClick={onClick} className="cursor-pointer">
      <path d={d} fill={fill} stroke="#374151" strokeWidth={2} />
      {t.token && (<g><circle cx={center.x} cy={center.y} r={16} fill="white" stroke={hot? "#ef4444" : "#334155"} strokeWidth={hot? 3 : 1.5} /><text x={center.x} y={center.y+5} textAnchor="middle" fontSize={14} fontWeight={700} fill="#111827">{text}</text></g>)}
    </g>
  );
}

function QuickStats({ prod }) {
  const total = Object.values(prod).reduce((a,b)=>a+b,0);
  const entries = ["wood","brick","sheep","wheat","ore"].map(k=> [k, prod[k]||0]);
  const entropy = -entries.reduce((s,[,v])=> s + (v>0? (v/total)*Math.log2(v/total) : 0), 0);
  return (
    <div className="text-xs text-slate-700">
      <div className="grid grid-cols-5 gap-2 mb-1">
        {entries.map(([k,v])=> (<div key={k} className="flex flex-col items-center"><div className="font-mono">{v.toFixed(3)}</div><div className="uppercase tracking-wide text-[10px] text-slate-500">{k}</div></div>))}
      </div>
      <div className="text-[11px] text-slate-500">Diversity (entropy): {entropy.toFixed(2)} • Total exp/roll: {total.toFixed(3)}</div>
    </div>
  );
}

function ResultsCard({ results, players }) {
  const { probs, ci, runs } = results;
  return (
    <div className="mt-3 border rounded p-3 text-sm">
      <div className="mb-2 text-slate-600">Runs: {runs.toLocaleString()}</div>
      {players.map((p,i)=> (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{background:p.color}} />
          <div className="w-28">Player {i+1}</div>
          <div className="font-mono w-20">{(probs[i]*100).toFixed(1)}%</div>
          <div className="text-xs text-slate-500">CI95: {(ci[i][0]*100).toFixed(1)}% – {(ci[i][1]*100).toFixed(1)}%</div>
        </div>
      ))}
    </div>
  );
}

// ---------- Production math ----------
function computeProduction(players, nodes, tiles) {
  const prod = players.map(()=> ({ wood:0, brick:0, sheep:0, wheat:0, ore:0 }));
  players.forEach((p, idx) => {
    p.settlementsAt.forEach((nid) => {
      const hexes = nodes[nid].adjHexes;
      hexes.forEach((hid) => {
        const h = tiles[hid];
        if (!h || h.resource === "desert" || !h.token) return;
        const pr = DICE_P[h.token] || 0;
        prod[idx][h.resource] += pr; // settlement yield = 1
      });
    });
  });
  return prod;
}

function productionFromRollForPlayer(roll, playerDef, nodes, tiles) {
  if (roll === 7) return null;
  const bank = { wood:0, brick:0, sheep:0, wheat:0, ore:0 };
  playerDef.settlementsAt.forEach((nid) => {
    const hexes = nodes[nid].adjHexes;
    hexes.forEach((hid) => { const h = tiles[hid]; if (!h || h.resource === "desert" || !h.token) return; if (h.token === roll) bank[h.resource] += 1; });
  });
  return bank;
}
