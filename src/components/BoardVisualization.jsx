/**
 * Board Visualization Components
 * Separated from main component for better organization
 */

import { useMemo } from 'react';
import { axialToPixel, hexCorner, HEX_SIZE } from '../utils/boardGeneration.js';

export function BoardSVG({ 
  tiles, 
  nodes, 
  edges, 
  onTileClick, 
  players, 
  onPlace, 
  canPlaceSettlement, 
  canPlaceRoad, 
  bgUrl, 
  bgOpacity, 
  bgScale, 
  bgOffset, 
  tokenMode, 
  tokenCursor, 
  bgShow, 
  placementMode 
}) {
  const viewBox = useMemo(() => {
    const pts = tiles.map(t => axialToPixel(t.q, t.r));
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const pad = 2 * HEX_SIZE;
    
    return {
      minX: Math.min(...xs) - pad,
      maxX: Math.max(...xs) + pad,
      minY: Math.min(...ys) - pad,
      maxY: Math.max(...ys) + pad
    };
  }, [tiles]);

  const occupied = new Set(players.flatMap(p => p.settlementsAt));
  const occupiedRoads = new Set(players.flatMap(p => p.roadsAt));

  return (
    <svg 
      viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.maxX - viewBox.minX} ${viewBox.maxY - viewBox.minY}`} 
      className="w-full aspect-[16/11] bg-slate-100 rounded-xl"
    >
      {/* Background image */}
      {bgUrl && bgShow && (
        <image
          href={bgUrl}
          x={viewBox.minX + (bgOffset?.x || 0)}
          y={viewBox.minY + (bgOffset?.y || 0)}
          width={(viewBox.maxX - viewBox.minX) * (bgScale || 1)}
          height={(viewBox.maxY - viewBox.minY) * (bgScale || 1)}
          opacity={bgOpacity ?? 0.5}
          preserveAspectRatio="xMidYMid meet"
          pointerEvents="none"
        />
      )}

      {/* Token cursor highlight */}
      {tokenMode && tiles[tokenCursor] && (
        <TokenCursor tile={tiles[tokenCursor]} />
      )}

      {/* Hex tiles */}
      {tiles.map((tile) => (
        <HexTile 
          key={tile.id} 
          tile={tile} 
          onClick={() => onTileClick(tile.id)} 
        />
      ))}

      {/* Roads */}
      {edges.map((edge) => (
        <RoadEdge
          key={edge.id}
          edge={edge}
          players={players}
          occupiedRoads={occupiedRoads}
          canPlace={canPlaceRoad(edge.id)}
          placementMode={placementMode}
          onPlace={onPlace}
        />
      ))}

      {/* Settlement nodes */}
      {nodes.map((node) => (
        <SettlementNode
          key={node.id}
          node={node}
          occupied={occupied}
          canPlace={canPlaceSettlement(node.id)}
          placementMode={placementMode}
          onPlace={onPlace}
        />
      ))}

      {/* Placed settlements */}
      {players.map((player, playerIndex) => 
        player.settlementsAt.map((nodeId, settlementIndex) => (
          <PlacedSettlement
            key={`${player.id}-${settlementIndex}`}
            node={nodes[nodeId]}
            player={player}
          />
        ))
      )}
    </svg>
  );
}

function TokenCursor({ tile }) {
  const center = axialToPixel(tile.q, tile.r);
  return (
    <circle 
      cx={center.x} 
      cy={center.y} 
      r={HEX_SIZE * 0.85} 
      fill="none" 
      stroke="#6366f1" 
      strokeWidth={3} 
      strokeDasharray="6 6" 
    />
  );
}

export function HexTile({ tile, onClick }) {
  const center = axialToPixel(tile.q, tile.r);
  const corners = Array.from({ length: 6 }, (_, i) => hexCorner(center, HEX_SIZE, i));
  const path = `M ${corners.map(p => `${p.x},${p.y}`).join(" L ")} Z`;
  
  const resourceColors = {
    wood: "#8BC34A",
    brick: "#E57373", 
    sheep: "#AED581",
    wheat: "#FBC02D",
    ore: "#B0BEC5",
    desert: "#F5DEB3"
  };

  const isHotNumber = tile.token === 6 || tile.token === 8;

  return (
    <g onClick={onClick} className="cursor-pointer hover:opacity-90 transition-opacity">
      <path 
        d={path} 
        fill={resourceColors[tile.resource] || "#ddd"} 
        stroke="#374151" 
        strokeWidth={2} 
      />
      {tile.token && (
        <g>
          <circle 
            cx={center.x} 
            cy={center.y} 
            r={16} 
            fill="white" 
            stroke={isHotNumber ? "#ef4444" : "#334155"} 
            strokeWidth={isHotNumber ? 3 : 1.5} 
          />
          <text 
            x={center.x} 
            y={center.y + 5} 
            textAnchor="middle" 
            fontSize={14} 
            fontWeight={700} 
            fill="#111827"
          >
            {tile.token}
          </text>
        </g>
      )}
    </g>
  );
}

function RoadEdge({ edge, players, occupiedRoads, canPlace, placementMode, onPlace }) {
  const isOccupied = occupiedRoads.has(edge.id);
  const isPlaceable = placementMode === "road" && canPlace && !isOccupied;
  
  // Find owner color
  let ownerColor = "#94a3b8";
  players.forEach(player => {
    if (player.roadsAt.includes(edge.id)) {
      ownerColor = player.color;
    }
  });
  
  return (
    <line
      x1={edge.x1} 
      y1={edge.y1} 
      x2={edge.x2} 
      y2={edge.y2}
      stroke={isOccupied ? ownerColor : (isPlaceable ? "#22c55e" : "#d1d5db")}
      strokeWidth={isOccupied ? 4 : (isPlaceable ? 3 : 1)}
      strokeOpacity={isOccupied ? 1 : (isPlaceable ? 0.8 : 0.3)}
      onClick={() => onPlace(undefined, edge.id)}
      className="cursor-pointer hover:stroke-opacity-100 transition-all"
    />
  );
}

function SettlementNode({ node, occupied, canPlace, placementMode, onPlace }) {
  const isPlaceable = placementMode === "settlement" && canPlace;
  
  return (
    <circle 
      cx={node.x}
      cy={node.y}
      r={8} 
      fill={occupied.has(node.id) ? "#334155" : (isPlaceable ? "#22c55e" : "#94a3b8")} 
      opacity={occupied.has(node.id) ? 1 : (isPlaceable ? 0.8 : 0.4)} 
      stroke="#0f172a" 
      strokeWidth={0.5} 
      onClick={() => onPlace(node.id, undefined)}
      className="cursor-pointer hover:opacity-100 transition-opacity"
    />
  );
}

function PlacedSettlement({ node, player }) {
  return (
    <rect 
      x={node.x - 8} 
      y={node.y - 8} 
      width={16} 
      height={16} 
      rx={2} 
      ry={2} 
      fill={player.color} 
      stroke="#111827" 
      strokeWidth={0.8} 
    />
  );
}