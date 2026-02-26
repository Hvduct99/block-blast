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
