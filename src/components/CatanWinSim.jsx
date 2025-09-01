@@ -1,4 +1,4 @@
-import React, { useEffect, useMemo, useState, useRef } from "react";
+import { useEffect, useMemo, useState, useRef } from "react";
 
 /**
  * Catan Starting Position — Browser-Only Win Predictor (Classic 19-hex board)
@@ -12,7 +12,7 @@
 // ---------- Types & Constants ----------
 const RESOURCES = ["wood", "brick", "sheep", "wheat", "ore", "desert"]; // desert produces nothing
 const TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]; // standard set (no 7)
-const DICE_P = { 2: 1/36, 3: 2/36, 4: 3/36, 5: 4/36, 6: 5/36, 7: 6/36, 8: 5/36, 9: 4/36, 10: 3/36, 11: 2/36, 12: 1/36 };
+const DICE_PROBABILITIES = { 2: 1/36, 3: 2/36, 4: 3/36, 5: 4/36, 6: 5/36, 7: 6/36, 8: 5/36, 9: 4/36, 10: 3/36, 11: 2/36, 12: 1/36 };
 
 const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f"]; // red, blue, green, yellow
 
@@ -25,7 +25,7 @@
 
 const DEV_EXPECTED_VP = 0.25; // rough proxy
 
-// Layout constants
+// Layout constants - consider making these configurable
 const HEX_SIZE = 48; // pixel radius
 
 // Color utilities for resource detection
@@ -58,7 +58,7 @@
   { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 },
 ];
 
-function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
+function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); } // Fisher-Yates would be better
 
 // ---------- Core Board Model ----------
 function makeInitialBoard() {
@@ -73,7 +73,7 @@
   ];
   const res = shuffle(bag);
   const tokens = [...TOKENS];
-  return STD_AXIAL_19.map((ax, i) => {
+  return STD_AXIAL_19.map((ax, i) => { // Consider using proper shuffling for tokens too
     const resource = res[i % res.length];
     const token = resource === "desert" ? null : tokens.pop();
     return { id: i, q: ax.q, r: ax.r, resource, token };
@@ -82,6 +82,7 @@
 
 function computeNodes(tiles) {
   const nodeMap = new Map();
+  // Using coordinate-based keys could cause floating point precision issues
   const idOf = (pt) => `${Math.round(pt.x)}:${Math.round(pt.y)}`;
   const nodes = [];
   tiles.forEach((t) => {
@@ -100,6 +101,7 @@
   return nodes;
 }
 
+// This function has high complexity - consider breaking it down
 function makeNodeAdjacency(nodes, tiles) {
   const hexCornersToNode = new Map();
   tiles.forEach((t) => {
@@ -120,6 +122,7 @@
   return neighborArr;
 }
 
+// Edge computation could be optimized
 function computeEdges(nodes, neighbors) {
   const edges = [];
   const edgeSet = new Set();
@@ -147,6 +150,7 @@
   return edges;
 }
 
+// Linear search - could use spatial indexing for better performance
 function findNearestNodeId(nodes, x, y) {
   let best = 0, bestD = Infinity;
   for (const n of nodes) {
@@ -157,6 +161,7 @@
   return best;
 }
 
+// Complex distance calculation - consider caching results
 function findNearestEdgeId(edges, x, y) {
   let best = 0, bestD = Infinity;
   for (const e of edges) {
@@ -189,6 +194,7 @@
 }
 
 // ---------- Simulation Helpers ----------
+// These functions could be moved to a separate utilities file
 function sampleDice() { return (1 + Math.floor(Math.random()*6)) + (1 + Math.floor(Math.random()*6)); }
 function canAfford(bank, cost) { return Object.entries(cost).every(([k, v]) => (bank[k] || 0) >= v); }
 function pay(bank, cost) { const nb = { ...bank }; for (const [k, v] of Object.entries(cost)) nb[k] = (nb[k] || 0) - v; return nb; }
@@ -199,6 +205,7 @@
   const target = (player.settlements > player.cities) ? ["ore", "wheat"] : ["wood", "brick", "sheep", "wheat"]; for (const need of target) tryTrade441(player.bank, need); return false;
 }
 function wilsonCI(p, n, z = 1.96) { if (n===0) return [0,0]; const denom = 1 + (z*z)/n; const center = (p + (z*z)/(2*n))/denom; const margin = (z/denom) * Math.sqrt((p*(1-p))/n + (z*z)/(4*n*n)); return [Math.max(0, center-margin), Math.min(1, center+margin)]; }
+// Consider adding error handling for edge cases in these utility functions
 
 // ---------- React App ----------
 export default function CatanWinSim() {
@@ -207,6 +214,7 @@
   const neighbors = useMemo(() => makeNodeAdjacency(nodes, tiles), [nodes, tiles]);
   const edges = useMemo(() => computeEdges(nodes, neighbors), [nodes, neighbors]);
 
+  // State management could be simplified with useReducer
   const [numPlayers, setNumPlayers] = useState(4);
   const playersInit = useMemo(() => Array.from({ length: numPlayers }, (_, i) => ({ 
     id: i, 
@@ -235,6 +243,7 @@
   const [tokenMode, setTokenMode] = useState(false);
   const [tokenCursor, setTokenCursor] = useState(0);
 
+  // This computation happens on every render - consider optimization
   // Derived
   const prodByPlayer = useMemo(() => computeProduction(players, nodes, tiles), [players, nodes, tiles]);
 
@@ -250,6 +259,7 @@
   function onTileClick(tid) { if (!editMode) return; setSelectedTile(tid); }
   function updateSelectedTile(field, value) { if (selectedTile == null) return; setTiles(prev => prev.map((t) => t.id === selectedTile ? { ...t, [field]: value } : t)); }
   
+  // Settlement placement logic could be extracted to a separate function
   function canPlaceSettlement(nodeId) { 
     const occupied = new Set(players.flatMap(p => p.settlementsAt)); 
     if (occupied.has(nodeId)) return false; 
@@ -259,6 +269,7 @@
     return touchesProduce; 
   }
   
+  // Road placement logic is complex and could be simplified
   function canPlaceRoad(edgeId) {
     // Check if road already exists
     const occupiedRoads = new Set(players.flatMap(p => p.roadsAt));
@@ -283,6 +294,7 @@
            });
   }
   
+  // This function has side effects and complex logic - consider breaking it down
   function handlePlace(nodeId, edgeId) { 
     if (phase !== "place") return; 
     
@@ -308,6 +320,7 @@
     }
   }
 
+  // Resource calculation logic should be moved to game engine
   function grantInitialResources() { 
     const start = players.map(()=> ({ wood:0, brick:0, sheep:0, wheat:0, ore:0 })); 
     players.forEach((p,i)=>{ 
@@ -324,6 +337,7 @@
   // Auto-detect resources from the uploaded image colors
   const vb = useMemo(()=>{ const pts = tiles.map(t => axialToPixel(t.q, t.r)); const xs = pts.map(p=>p.x), ys=pts.map(p=>p.y); const pad = 2*HEX_SIZE; return { minX: Math.min(...xs)-pad, maxX: Math.max(...xs)+pad, minY: Math.min(...ys)-pad, maxY: Math.max(...ys)+pad }; }, [tiles]);
   
+  // This function is very long and complex - should be broken into smaller functions
   async function autoDetectResourcesFromImage(){
     if(!bgUrl) return;
     const W = vb.maxX - vb.minX, H = vb.maxY - vb.minY;
@@ -374,6 +388,7 @@
   function startTokenMode(){ setTokenMode(true); setTokenCursor(0); }
   function stopTokenMode(){ setTokenMode(false); }
   function handleKeyDown(e){ 
+    // Keyboard handling could be more robust with proper event handling
     if(!tokenMode) return; 
     const key=e.key; 
     if(key==='Escape'){ stopTokenMode(); return; } 
@@ -384,6 +399,7 @@
     if(/^[0-9]$/.test(key)){ const n = Number(key); if(n>=2 && n<=9 && n!==7){ setTiles(prev=> prev.map((t,i)=> i===tokenCursor? {...t, token:n}: t)); setTokenCursor(c=> Math.min(c+1, tiles.length-1)); return; } } 
   }
 
+  // Simulation logic should be moved to a separate service/engine
   async function runSimulation() {
     if (phase !== "ready") return; setSimBusy(true); await new Promise((r)=>setTimeout(r));
     const startBanks = grantInitialResources(); const wins = Array(numPlayers).fill(0); const TURN_CAP = 600;
@@ -402,6 +418,7 @@
     const probs = wins.map((w)=> w/runs); const ci = probs.map((p)=> wilsonCI(p, runs)); setResults({ wins, probs, ci, runs }); setSimBusy(false);
   }
 
+  // Main component is too large - consider breaking into smaller components
   return (
     <div className="min-h-screen w-full bg-slate-50 text-slate-900" onKeyDown={handleKeyDown} tabIndex={0}
          onPaste={(e)=>{ const items = e.clipboardData?.items; if(!items) return; for(const it of items){ if(it.type && it.type.startsWith('image/')){ const blob = it.getAsFile(); setBgFromBlob(blob); break; } } }}>
@@ -520,6 +537,7 @@
 }
 
 // ---------- UI Components ----------
+// These components should be moved to separate files
 function BoardSVG({ tiles, nodes, edges, onTileClick, players, onPlace, canPlaceSettlement, canPlaceRoad, bgUrl, bgOpacity, bgScale, bgOffset, tokenMode, tokenCursor, bgShow, placementMode }) {
   const { minX, minY, maxX, maxY } = useMemo(() => {
     const pts = tiles.map(t => axialToPixel(t.q, t.r));
@@ -598,6 +616,7 @@
   );
 }
 
+// Missing PropTypes or TypeScript for better type safety
 function HexTile({ t, onClick }) {
   const center = axialToPixel(t.q, t.r);
   const pts = Array.from({ length: 6 }, (_, i) => hexCorner(center, HEX_SIZE, i));
@@ -612,6 +631,7 @@
   );
 }
 
+// Consider memoizing this component for better performance
 function QuickStats({ prod }) {
   const total = Object.values(prod).reduce((a,b)=>a+b,0);
   const entries = ["wood","brick","sheep","wheat","ore"].map(k=> [k, prod[k]||0]);
@@ -628,6 +648,7 @@
   );
 }
 
+// Results component could show more detailed statistics
 function ResultsCard({ results, players }) {
   const { probs, ci, runs } = results;
   return (
@@ -645,6 +666,7 @@
 }
 
 // ---------- Production math ----------
+// These calculations should be moved to a game logic module
 function computeProduction(players, nodes, tiles) {
   const prod = players.map(()=> ({ wood:0, brick:0, sheep:0, wheat:0, ore:0 }));
   players.forEach((p, idx) => {
@@ -652,7 +674,7 @@
       const hexes = nodes[nid].adjHexes;
       hexes.forEach((hid) => {
         const h = tiles[hid];
-        if (!h || h.resource === "desert" || !h.token) return;
-        const pr = DICE_P[h.token] || 0;
+        if (!h || h.resource === "desert" || !h.token) return;
+        const pr = DICE_PROBABILITIES[h.token] || 0;
         prod[idx][h.resource] += pr; // settlement yield = 1
       });
     });
@@ -660,6 +682,7 @@
   return prod;
 }
 
+// This function name could be more descriptive
 function productionFromRollForPlayer(roll, playerDef, nodes, tiles) {
   if (roll === 7) return null;
   const bank = { wood:0, brick:0, sheep:0, wheat:0, ore:0 };