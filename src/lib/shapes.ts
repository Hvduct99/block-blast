// Shape definitions
export type Shape = number[][];

export const SHAPES: Shape[] = [
  [[1]], // Dot
  [[1, 1]], // 2-h
  [[1], [1]], // 2-v
  [[1, 1, 1]], // 3-h
  [[1], [1], [1]], // 3-v
  [[1, 1], [1, 1]], // 2x2 square
  // L-shapes
  [[1, 0], [1, 0], [1, 1]], 
  [[0, 1], [0, 1], [1, 1]], 
  [[1, 1, 1], [1, 0, 0]], 
  [[1, 1, 1], [0, 0, 1]], 
  // T-shapes
  [[1, 1, 1], [0, 1, 0]],
  [[0, 1, 0], [1, 1, 1]], 
  [[1, 0], [1, 1], [1, 0]], 
  [[0, 1], [1, 1], [0, 1]],
  // Z-shapes (skew)
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 0], [1, 1], [0, 1]],
  [[0, 1], [1, 1], [1, 0]],
  // 4-long
  [[1, 1, 1, 1]],
  [[1], [1], [1], [1]],
  // 5-long (rare but exists)
  [[1, 1, 1, 1, 1]],
  [[1], [1], [1], [1], [1]],
  // 3x3 square
  [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
];

// Helper to get random shapes
export const getRandomShapes = (count: number = 3): Shape[] => {
  const shapes: Shape[] = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * SHAPES.length);
    shapes.push(SHAPES[randomIndex]);
  }
  return shapes;
};

// Beautiful gradient color palette for blocks
export const BLOCK_COLORS = [
  { // 1 - Sapphire Blue
    primary: '#3b82f6', light: '#93c5fd', dark: '#1d4ed8',
    glow: 'rgba(59, 130, 246, 0.5)',
    gradient: 'linear-gradient(145deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
    particle: '#60a5fa',
  },
  { // 2 - Royal Purple
    primary: '#8b5cf6', light: '#c4b5fd', dark: '#6d28d9',
    glow: 'rgba(139, 92, 246, 0.5)',
    gradient: 'linear-gradient(145deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%)',
    particle: '#a78bfa',
  },
  { // 3 - Sunset Orange
    primary: '#f97316', light: '#fdba74', dark: '#c2410c',
    glow: 'rgba(249, 115, 22, 0.5)',
    gradient: 'linear-gradient(145deg, #fb923c 0%, #f97316 50%, #ea580c 100%)',
    particle: '#fb923c',
  },
  { // 4 - Emerald Green
    primary: '#22c55e', light: '#86efac', dark: '#15803d',
    glow: 'rgba(34, 197, 94, 0.5)',
    gradient: 'linear-gradient(145deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)',
    particle: '#4ade80',
  },
  { // 5 - Ruby Red
    primary: '#ef4444', light: '#fca5a5', dark: '#b91c1c',
    glow: 'rgba(239, 68, 68, 0.5)',
    gradient: 'linear-gradient(145deg, #f87171 0%, #ef4444 50%, #dc2626 100%)',
    particle: '#f87171',
  },
  { // 6 - Hot Pink
    primary: '#ec4899', light: '#f9a8d4', dark: '#be185d',
    glow: 'rgba(236, 72, 153, 0.5)',
    gradient: 'linear-gradient(145deg, #f472b6 0%, #ec4899 50%, #db2777 100%)',
    particle: '#f472b6',
  },
  { // 7 - Cyan Teal
    primary: '#14b8a6', light: '#5eead4', dark: '#0f766e',
    glow: 'rgba(20, 184, 166, 0.5)',
    gradient: 'linear-gradient(145deg, #2dd4bf 0%, #14b8a6 50%, #0d9488 100%)',
    particle: '#2dd4bf',
  },
  { // 8 - Golden Yellow
    primary: '#eab308', light: '#fde047', dark: '#a16207',
    glow: 'rgba(234, 179, 8, 0.5)',
    gradient: 'linear-gradient(145deg, #facc15 0%, #eab308 50%, #ca8a04 100%)',
    particle: '#facc15',
  },
];

// Tetris tetrominoes
export const TETROMINOES = [
  { shape: [[1, 1, 1, 1]], colorId: 7 },            // I - Teal
  { shape: [[1, 1], [1, 1]], colorId: 8 },            // O - Yellow
  { shape: [[0, 1, 0], [1, 1, 1]], colorId: 2 },      // T - Purple
  { shape: [[0, 1, 1], [1, 1, 0]], colorId: 4 },      // S - Green
  { shape: [[1, 1, 0], [0, 1, 1]], colorId: 5 },      // Z - Red
  { shape: [[1, 0], [1, 0], [1, 1]], colorId: 3 },    // L - Orange
  { shape: [[0, 1], [0, 1], [1, 1]], colorId: 1 },    // J - Blue
];

export const getRandomTetromino = () =>
  TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
