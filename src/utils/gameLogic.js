/**
 * Game Logic Utilities
 * Extracted from main component for better organization
 */

export const DICE_PROBABILITIES = { 
  2: 1/36, 3: 2/36, 4: 3/36, 5: 4/36, 6: 5/36, 7: 6/36, 
  8: 5/36, 9: 4/36, 10: 3/36, 11: 2/36, 12: 1/36 
};

export const BUILDING_COSTS = {
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
  city: { ore: 3, wheat: 2 },
  road: { wood: 1, brick: 1 },
  dev: { ore: 1, sheep: 1, wheat: 1 },
};

// Improved shuffle using Fisher-Yates algorithm
export function fisherYatesShuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Dice rolling with proper probability distribution
export function rollDice() {
  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  return { die1, die2, total: die1 + die2 };
}

// Resource management utilities
export function canAfford(resources, cost) {
  return Object.entries(cost).every(([resource, amount]) => 
    (resources[resource] || 0) >= amount
  );
}

export function payResources(resources, cost) {
  const newResources = { ...resources };
  Object.entries(cost).forEach(([resource, amount]) => {
    newResources[resource] = (newResources[resource] || 0) - amount;
  });
  return newResources;
}

export function addResources(resources, gain) {
  const newResources = { ...resources };
  Object.entries(gain).forEach(([resource, amount]) => {
    newResources[resource] = (newResources[resource] || 0) + amount;
  });
  return newResources;
}

// Calculate production for a player based on settlements
export function calculatePlayerProduction(player, nodes, tiles) {
  const production = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  
  player.settlementsAt.forEach(nodeId => {
    const node = nodes[nodeId];
    if (!node) return;
    
    node.adjHexes.forEach(tileId => {
      const tile = tiles[tileId];
      if (!tile || tile.resource === "desert" || !tile.token) return;
      
      const probability = DICE_PROBABILITIES[tile.token] || 0;
      production[tile.resource] += probability;
    });
  });
  
  return production;
}

// Calculate resources gained from a dice roll
export function calculateResourcesFromRoll(roll, player, nodes, tiles) {
  if (roll === 7) return null;
  
  const resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  
  player.settlementsAt.forEach(nodeId => {
    const node = nodes[nodeId];
    if (!node) return;
    
    node.adjHexes.forEach(tileId => {
      const tile = tiles[tileId];
      if (!tile || tile.resource === "desert" || tile.token !== roll) return;
      
      resources[tile.resource] += 1;
    });
  });
  
  return resources;
}

// Wilson confidence interval calculation
export function calculateWilsonCI(successes, trials, confidence = 0.95) {
  if (trials === 0) return [0, 0];
  
  const z = confidence === 0.95 ? 1.96 : 2.576;
  const p = successes / trials;
  const n = trials;
  
  const denominator = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denominator;
  const margin = (z / denominator) * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  
  return [
    Math.max(0, center - margin),
    Math.min(1, center + margin)
  ];
}