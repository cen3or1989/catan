const RESOURCES = ["wood", "brick", "sheep", "wheat", "ore"]
const TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]

export function createRandomBoard() {
  const resources = [
    ...Array(4).fill("wood"),
    ...Array(3).fill("brick"), 
    ...Array(4).fill("sheep"),
    ...Array(4).fill("wheat"),
    ...Array(3).fill("ore"),
    "desert"
  ]
  
  const tokens = [...TOKENS]
  const shuffledResources = [...resources].sort(() => Math.random() - 0.5)
  const shuffledTokens = [...tokens].sort(() => Math.random() - 0.5)
  
  const positions = [
    { x: 300, y: 120 }, { x: 370, y: 120 }, { x: 440, y: 120 },
    { x: 230, y: 170 }, { x: 300, y: 170 }, { x: 370, y: 170 }, { x: 440, y: 170 },
    { x: 160, y: 220 }, { x: 230, y: 220 }, { x: 300, y: 220 }, { x: 370, y: 220 }, { x: 440, y: 220 },
    { x: 160, y: 270 }, { x: 230, y: 270 }, { x: 300, y: 270 }, { x: 370, y: 270 },
    { x: 160, y: 320 }, { x: 230, y: 320 }, { x: 300, y: 320 }
  ]
  
  const tiles = positions.map((pos, index) => {
    const resource = shuffledResources[index]
    const token = resource === 'desert' ? null : shuffledTokens.pop()
    return { ...pos, resource, token }
  })
  
  return { tiles }
}

export function validateBoard(boardSetup) {
  const resourceCounts = RESOURCES.reduce((acc, resource) => {
    acc[resource] = boardSetup.tiles.filter(tile => tile.resource === resource).length
    return acc
  }, { desert: boardSetup.tiles.filter(tile => tile.resource === 'desert').length })

  return {
    isValid: boardSetup.tiles.length === 19 && resourceCounts.desert === 1,
    totalTiles: boardSetup.tiles.length,
    desertCount: resourceCounts.desert,
    resourceCounts
  }
}

export function calculateBoardQuality(boardSetup) {
  const validation = validateBoard(boardSetup)
  if (!validation.isValid) {
    return { quality: 'invalid', score: 0 }
  }

  let score = 0
  
  // Check resource balance
  const resourceCounts = Object.values(validation.resourceCounts)
  const maxResource = Math.max(...resourceCounts.slice(0, -1)) // Exclude desert
  const minResource = Math.min(...resourceCounts.slice(0, -1))
  
  if (maxResource - minResource <= 1) score += 30 // Good balance
  else if (maxResource - minResource <= 2) score += 20 // Fair balance
  
  // Check number token distribution
  const hotNumbers = boardSetup.tiles.filter(tile => tile.token === 6 || tile.token === 8).length
  if (hotNumbers === 2) score += 25 // Perfect hot number count
  else if (hotNumbers === 1 || hotNumbers === 3) score += 15
  
  // Check for number clustering (simplified)
  score += Math.random() * 20 // Placeholder for clustering analysis
  
  // Add port bonus
  if (boardSetup.ports && boardSetup.ports.length >= 9) score += 25
  
  let quality = 'poor'
  if (score >= 80) quality = 'excellent'
  else if (score >= 60) quality = 'good'
  else if (score >= 40) quality = 'fair'
  
  return { quality, score: Math.round(score) }
}