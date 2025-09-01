/**
 * Board Generation Utilities
 * Handles creation and manipulation of Catan boards
 */

import { fisherYatesShuffle } from './gameLogic.js';

export const RESOURCES = ["wood", "brick", "sheep", "wheat", "ore", "desert"];
export const TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
export const HEX_SIZE = 48;

// Standard Catan board layout (axial coordinates)
export const STANDARD_HEX_LAYOUT = [
  { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 },
  { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 2, r: -1 },
  { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 },
  { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 },
  { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 },
];

// Coordinate conversion utilities
export function axialToPixel(q, r, size = HEX_SIZE) {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * (3 / 2) * r;
  return { x, y };
}

export function hexCorner(center, size, cornerIndex) {
  const angle = Math.PI / 180 * (60 * cornerIndex - 30);
  return { 
    x: center.x + size * Math.cos(angle), 
    y: center.y + size * Math.sin(angle) 
  };
}

// Generate a random Catan board
export function generateRandomBoard() {
  const resourceBag = [
    ...Array(4).fill("wood"),
    ...Array(3).fill("brick"),
    ...Array(4).fill("sheep"),
    ...Array(4).fill("wheat"),
    ...Array(3).fill("ore"),
    "desert",
  ];
  
  const shuffledResources = fisherYatesShuffle(resourceBag);
  const shuffledTokens = fisherYatesShuffle([...TOKENS]);
  
  return STANDARD_HEX_LAYOUT.map((coord, index) => {
    const resource = shuffledResources[index];
    const token = resource === "desert" ? null : shuffledTokens.pop();
    
    return { 
      id: index, 
      q: coord.q, 
      r: coord.r, 
      resource, 
      token 
    };
  });
}

// Validate board configuration
export function validateBoard(tiles) {
  const errors = [];
  
  // Check tile count
  if (tiles.length !== 19) {
    errors.push(`Expected 19 tiles, found ${tiles.length}`);
  }
  
  // Check resource distribution
  const resourceCounts = RESOURCES.reduce((acc, resource) => {
    acc[resource] = tiles.filter(tile => tile.resource === resource).length;
    return acc;
  }, {});
  
  const expectedCounts = { wood: 4, brick: 3, sheep: 4, wheat: 4, ore: 3, desert: 1 };
  Object.entries(expectedCounts).forEach(([resource, expected]) => {
    if (resourceCounts[resource] !== expected) {
      errors.push(`Expected ${expected} ${resource} tiles, found ${resourceCounts[resource] || 0}`);
    }
  });
  
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

// Calculate board balance score
export function calculateBoardBalance(tiles) {
  let balance = 0;
  
  // Check for even distribution of high-probability numbers
  const highProbTiles = tiles.filter(tile => tile.token === 6 || tile.token === 8);
  const positions = highProbTiles.map(tile => ({ q: tile.q, r: tile.r }));
  
  // Calculate minimum distance between high-prob tiles
  let minDistance = Infinity;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const distance = Math.abs(positions[i].q - positions[j].q) + 
                      Math.abs(positions[i].r - positions[j].r);
      minDistance = Math.min(minDistance, distance);
    }
  }
  
  balance += minDistance > 2 ? 1 : 0; // Bonus for spread out high-prob numbers
  
  return balance;
}