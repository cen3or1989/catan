// Board Generation System for Full Catan Game
// ============================================

import { 
  RESOURCES, TOKENS, PORT_TYPES, 
  createTile, createNode, createEdge, createPort 
} from './game-types.js';

// Hex Layout Constants
export const HEX_SIZE = 48;
export const BOARD_CENTER_X = 300;
export const BOARD_CENTER_Y = 300;

// Standard Catan 19-hex board layout (axial coordinates)
export const STANDARD_HEX_LAYOUT = [
  // Row 1 (top, 3 hexes)
  { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 },
  // Row 2 (4 hexes)
  { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 2, r: -1 },
  // Row 3 (center, 5 hexes)
  { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 },
  // Row 4 (4 hexes)
  { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 },
  // Row 5 (bottom, 3 hexes)
  { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 }
];

// Standard resource distribution for Catan
export const STANDARD_RESOURCES = [
  ...Array(4).fill("wood"),
  ...Array(3).fill("brick"), 
  ...Array(4).fill("sheep"),
  ...Array(4).fill("wheat"),
  ...Array(3).fill("ore"),
  "desert"
];

// Standard port configuration
export const STANDARD_PORTS = [
  // Generic 3:1 ports
  { nodes: [0, 1], type: PORT_TYPES.GENERIC, position: 'top-left' },
  { nodes: [3, 4], type: PORT_TYPES.GENERIC, position: 'top-right' },
  { nodes: [15, 22], type: PORT_TYPES.GENERIC, position: 'bottom-right' },
  { nodes: [46, 47], type: PORT_TYPES.GENERIC, position: 'bottom-left' },
  
  // Specific 2:1 ports
  { nodes: [7, 17], type: PORT_TYPES.WOOD, position: 'left' },
  { nodes: [14, 23], type: PORT_TYPES.BRICK, position: 'top-right-2' },
  { nodes: [28, 38], type: PORT_TYPES.SHEEP, position: 'right' },
  { nodes: [45, 51], type: PORT_TYPES.WHEAT, position: 'bottom' },
  { nodes: [26, 37], type: PORT_TYPES.ORE, position: 'left-bottom' }
];

// Coordinate conversion utilities
export function axialToPixel(q, r, hexSize = HEX_SIZE, centerX = BOARD_CENTER_X, centerY = BOARD_CENTER_Y) {
  const x = hexSize * Math.sqrt(3) * (q + r / 2) + centerX;
  const y = hexSize * (3 / 2) * r + centerY;
  return { x, y };
}

export function pixelToAxial(x, y, hexSize = HEX_SIZE, centerX = BOARD_CENTER_X, centerY = BOARD_CENTER_Y) {
  const relX = (x - centerX) / hexSize;
  const relY = (y - centerY) / hexSize;
  
  const q = (Math.sqrt(3)/3 * relX - 1/3 * relY);
  const r = (2/3 * relY);
  
  return axialRound(q, r);
}

function axialRound(q, r) {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  
  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);
  
  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }
  
  return { q: rq, r: rr };
}

export function getHexCorners(center, size = HEX_SIZE) {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 180 * (60 * i - 30);
    corners.push({
      x: center.x + size * Math.cos(angle),
      y: center.y + size * Math.sin(angle)
    });
  }
  return corners;
}

// Board Generation Functions
export function generateRandomBoard() {
  const tiles = generateTiles();
  const { nodes, edges } = generateNodesAndEdges(tiles);
  const ports = generatePorts(nodes);
  
  return {
    tiles,
    nodes,
    edges,
    ports,
    robberPosition: findDesertTile(tiles)?.id || 0
  };
}

function generateTiles() {
  const resources = shuffleArray([...STANDARD_RESOURCES]);
  const tokens = shuffleArray([...TOKENS]);
  
  return STANDARD_HEX_LAYOUT.map((coord, index) => {
    const resource = resources[index % resources.length];
    const token = resource === 'desert' ? null : tokens.pop();
    
    return createTile(index, coord.q, coord.r, resource, token);
  });
}

function generateNodesAndEdges(tiles) {
  const nodeMap = new Map();
  const nodes = [];
  
  // Generate nodes from hex corners
  tiles.forEach(tile => {
    const center = axialToPixel(tile.q, tile.r);
    const corners = getHexCorners(center);
    
    corners.forEach(corner => {
      const key = `${Math.round(corner.x)}:${Math.round(corner.y)}`;
      
      if (!nodeMap.has(key)) {
        const id = nodes.length;
        nodeMap.set(key, id);
        nodes.push(createNode(
          id,
          corner.x,
          corner.y,
          [tile.id], // adjacentTiles
          [] // neighborNodes - will be filled later
        ));
      } else {
        const existingNode = nodes[nodeMap.get(key)];
        existingNode.adjacentTiles.push(tile.id);
      }
    });
  });
  
  // Generate edges and populate neighbor relationships
  const edges = [];
  const edgeSet = new Set();
  
  tiles.forEach(tile => {
    const center = axialToPixel(tile.q, tile.r);
    const corners = getHexCorners(center);
    const nodeIds = corners.map(corner => {
      const key = `${Math.round(corner.x)}:${Math.round(corner.y)}`;
      return nodeMap.get(key);
    });
    
    // Create edges between adjacent corners
    for (let i = 0; i < 6; i++) {
      const nodeA = nodeIds[i];
      const nodeB = nodeIds[(i + 1) % 6];
      const edgeKey = nodeA < nodeB ? `${nodeA}-${nodeB}` : `${nodeB}-${nodeA}`;
      
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        const nodeAData = nodes[nodeA];
        const nodeBData = nodes[nodeB];
        
        edges.push(createEdge(
          edges.length,
          nodeA,
          nodeB,
          nodeAData.x,
          nodeAData.y,
          nodeBData.x,
          nodeBData.y
        ));
        
        // Add to neighbor lists
        nodeAData.neighborNodes.push(nodeB);
        nodeBData.neighborNodes.push(nodeA);
      }
    }
  });
  
  return { nodes, edges };
}

function generatePorts(nodes) {
  return STANDARD_PORTS.map(portConfig => {
    const ratio = portConfig.type === PORT_TYPES.GENERIC ? 3 : 2;
    const port = createPort(portConfig.nodes, portConfig.type, ratio);
    
    // Mark nodes as having ports
    portConfig.nodes.forEach(nodeId => {
      if (nodes[nodeId]) {
        nodes[nodeId].port = portConfig.type;
      }
    });
    
    return port;
  });
}

function findDesertTile(tiles) {
  return tiles.find(tile => tile.resource === 'desert');
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Enhanced Image Detection System
export class BoardImageDetector {
  constructor(canvas, context) {
    this.canvas = canvas;
    this.ctx = context;
    this.resourceColors = {
      wood: { r: 139, g: 195, b: 74 },     // Green
      brick: { r: 229, g: 115, b: 115 },   // Red
      sheep: { r: 174, g: 213, b: 129 },   // Light green
      wheat: { r: 251, g: 192, b: 45 },    // Yellow
      ore: { r: 176, g: 190, b: 197 },     // Gray
      desert: { r: 245, g: 222, b: 179 }   // Beige
    };
  }
  
  async detectBoardFromImage(imageUrl, tiles) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          this.canvas.width = img.width;
          this.canvas.height = img.height;
          this.ctx.drawImage(img, 0, 0);
          
          const detectedBoard = this.analyzeBoard(tiles);
          resolve(detectedBoard);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }
  
  analyzeBoard(tiles) {
    const updatedTiles = tiles.map(tile => ({ ...tile }));
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    updatedTiles.forEach((tile, index) => {
      const center = axialToPixel(tile.q, tile.r);
      
      // Sample multiple points around the hex center
      const samplePoints = this.getHexSamplePoints(center, HEX_SIZE * 0.6);
      const averageColor = this.getAverageColor(imageData, samplePoints);
      
      // Detect resource based on color
      const detectedResource = this.detectResource(averageColor);
      tile.resource = detectedResource;
      
      // Try to detect number token
      const detectedToken = this.detectToken(imageData, center);
      if (detectedResource !== 'desert' && detectedToken) {
        tile.token = detectedToken;
      } else if (detectedResource === 'desert') {
        tile.token = null;
      }
    });
    
    return updatedTiles;
  }
  
  getHexSamplePoints(center, radius) {
    const points = [];
    const angles = [0, 60, 120, 180, 240, 300]; // 6 points around hex
    
    angles.forEach(angle => {
      const radians = (angle * Math.PI) / 180;
      points.push({
        x: Math.round(center.x + radius * Math.cos(radians)),
        y: Math.round(center.y + radius * Math.sin(radians))
      });
    });
    
    // Add center point
    points.push({ x: Math.round(center.x), y: Math.round(center.y) });
    
    return points;
  }
  
  getAverageColor(imageData, points) {
    let totalR = 0, totalG = 0, totalB = 0, validPoints = 0;
    
    points.forEach(point => {
      if (point.x >= 0 && point.x < this.canvas.width && 
          point.y >= 0 && point.y < this.canvas.height) {
        
        const index = (point.y * this.canvas.width + point.x) * 4;
        totalR += imageData.data[index];
        totalG += imageData.data[index + 1];
        totalB += imageData.data[index + 2];
        validPoints++;
      }
    });
    
    if (validPoints === 0) return { r: 128, g: 128, b: 128 };
    
    return {
      r: Math.round(totalR / validPoints),
      g: Math.round(totalG / validPoints),
      b: Math.round(totalB / validPoints)
    };
  }
  
  detectResource(color) {
    let bestMatch = 'desert';
    let minDistance = Infinity;
    
    Object.entries(this.resourceColors).forEach(([resource, refColor]) => {
      const distance = this.colorDistance(color, refColor);
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = resource;
      }
    });
    
    return bestMatch;
  }
  
  colorDistance(color1, color2) {
    const dr = color1.r - color2.r;
    const dg = color1.g - color2.g;
    const db = color1.b - color2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }
  
  detectToken(imageData, center) {
    // This is a simplified token detection
    // In practice, you'd use OCR or more sophisticated image recognition
    const tokenArea = this.getCircularArea(imageData, center, 20);
    
    // Look for circular white areas (tokens are typically white with black numbers)
    const isLikelyToken = this.detectCircularWhiteArea(tokenArea);
    
    if (isLikelyToken) {
      // For now, return a random valid token
      // In a real implementation, you'd use OCR to read the number
      const validTokens = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];
      return validTokens[Math.floor(Math.random() * validTokens.length)];
    }
    
    return null;
  }
  
  getCircularArea(imageData, center, radius) {
    const area = [];
    const radiusSquared = radius * radius;
    
    for (let y = center.y - radius; y <= center.y + radius; y++) {
      for (let x = center.x - radius; x <= center.x + radius; x++) {
        const dx = x - center.x;
        const dy = y - center.y;
        
        if (dx * dx + dy * dy <= radiusSquared &&
            x >= 0 && x < this.canvas.width &&
            y >= 0 && y < this.canvas.height) {
          
          const index = (y * this.canvas.width + x) * 4;
          area.push({
            r: imageData.data[index],
            g: imageData.data[index + 1],
            b: imageData.data[index + 2],
            a: imageData.data[index + 3]
          });
        }
      }
    }
    
    return area;
  }
  
  detectCircularWhiteArea(area) {
    if (area.length === 0) return false;
    
    // Check if majority of pixels are white-ish
    const whitePixels = area.filter(pixel => 
      pixel.r > 200 && pixel.g > 200 && pixel.b > 200
    );
    
    return (whitePixels.length / area.length) > 0.6;
  }
  
  // Advanced feature: Detect robber position
  detectRobber(imageData, tiles) {
    // Look for a dark circular object on tiles
    let robberTile = null;
    let maxDarkness = 0;
    
    tiles.forEach(tile => {
      const center = axialToPixel(tile.q, tile.r);
      const area = this.getCircularArea(imageData, center, 15);
      
      if (area.length > 0) {
        const darkness = area.reduce((sum, pixel) => {
          const brightness = (pixel.r + pixel.g + pixel.b) / 3;
          return sum + (255 - brightness);
        }, 0) / area.length;
        
        if (darkness > maxDarkness && darkness > 100) {
          maxDarkness = darkness;
          robberTile = tile.id;
        }
      }
    });
    
    return robberTile;
  }
}

// Manual Board Setup Interface
export function createManualBoardEditor() {
  return {
    setTileResource: (tiles, tileId, resource) => {
      return tiles.map(tile => 
        tile.id === tileId ? { ...tile, resource } : tile
      );
    },
    
    setTileToken: (tiles, tileId, token) => {
      return tiles.map(tile => 
        tile.id === tileId ? { ...tile, token } : tile
      );
    },
    
    validateBoard: (tiles) => {
      const errors = [];
      
      // Check resource counts
      const resourceCounts = RESOURCES.reduce((acc, res) => {
        acc[res] = tiles.filter(tile => tile.resource === res).length;
        return acc;
      }, {});
      
      const expectedCounts = { wood: 4, brick: 3, sheep: 4, wheat: 4, ore: 3 };
      Object.entries(expectedCounts).forEach(([resource, expected]) => {
        if (resourceCounts[resource] !== expected) {
          errors.push(`Expected ${expected} ${resource} tiles, found ${resourceCounts[resource] || 0}`);
        }
      });
      
      // Check for exactly one desert
      const desertCount = tiles.filter(tile => tile.resource === 'desert').length;
      if (desertCount !== 1) {
        errors.push(`Expected 1 desert tile, found ${desertCount}`);
      }
      
      // Check token distribution
      const usedTokens = tiles
        .filter(tile => tile.token !== null)
        .map(tile => tile.token)
        .sort((a, b) => a - b);
      
      const expectedTokens = [...TOKENS].sort((a, b) => a - b);
      if (JSON.stringify(usedTokens) !== JSON.stringify(expectedTokens)) {
        errors.push('Token distribution does not match standard Catan layout');
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    }
  };
}