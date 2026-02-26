"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { SHAPES, getRandomShapes, type Shape } from "@/lib/shapes";
import { cn } from "@/lib/utils";
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, DragStartEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { RefreshCcw, Trophy } from "lucide-react";

// --- Types ---
type Cell = 0 | 1; // 0: Empty, 1: Filled
type Grid = Cell[][];
type BlockId = string;

interface GameState {
  grid: Grid;
  score: number;
  availableShapes: { id: BlockId; shape: Shape }[];
  isGameOver: boolean;
  bestScore: number;
}

const GRID_SIZE = 9; // 9x9 by default
const CELL_SIZE_PX = 40; // Approximate cell size for dragging calculations (responsive is harder with dnd-kit sometimes, but we'll try)

// --- Components ---

// 1. Draggable Block Component
const DraggableBlock = ({ id, shape, isOverlay = false }: { id: string; shape: Shape; isOverlay?: boolean }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: id,
    data: { shape },
    disabled: isOverlay, // Overlay itself shouldn't be draggable again
  });

  const style = isOverlay ? { cursor: "grabbing" } : undefined;

  // Render the shape as a mini-grid
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={cn(
        "touch-none select-none p-2 transition-transform",
        isDragging ? "opacity-0" : "opacity-100 hover:scale-105"
      )}
    >
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${shape[0].length}, min-content)`,
        }}
      >
        {shape.map((row, rIndex) =>
          row.map((cell, cIndex) => (
            <div
              key={`${rIndex}-${cIndex}`}
              className={cn(
                "h-8 w-8 rounded-sm",
                cell ? "bg-orange-500 shadow-sm" : "bg-transparent h-0 w-8" // Trick: h-0 for empty cells to maintain grid structure but invisible? No, regular grid flow.
                                                                           // Actually, simplest is to just render occupied cells.
              )}
              style={{
                  visibility: cell ? "visible" : "hidden", // Hide empty parts of the shape box
                  height: "32px", width: "32px"
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};

// 2. Grid Cell Component (Droppable)
// We will make the *entire board* droppable or handle drop via coordinate calculation.
// dnd-kit collision detection is great. Let's make every cell a droppable?
// Too many droppables (81) might be heavy. 
// Optimization: Make the BOARD one big droppable area, and calculate relative coordinates on drop.
const Board = ({ grid }: { grid: Grid }) => {
    const { setNodeRef } = useDroppable({
        id: "board-zone",
    });

  return (
    <div
      ref={setNodeRef}
      id="game-board"
      className="grid grid-cols-9 gap-1 rounded-lg bg-slate-800 p-2 shadow-inner border border-slate-700"
      style={{
          width: "fit-content",
          height: "fit-content"
      }}
    >
      {grid.map((row, rIndex) =>
        row.map((cell, cIndex) => (
          <div
            key={`${rIndex}-${cIndex}`}
            data-row={rIndex}
            data-col={cIndex}
            className={cn(
              "h-8 w-8 rounded-sm transition-colors duration-200",
              cell ? "bg-indigo-500 shadow-md ring-1 ring-white/10" : "bg-slate-900/50"
            )}
            style={{ width: "32px", height: "32px"}} // Fixed size for calculation simplicity
          />
        ))
      )}
    </div>
  );
};

// --- Main Game Logic ---

export default function BlockBlastGame() {
  // State
  const [grid, setGrid] = useState<Grid>(
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0))
  );
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [shapes, setShapes] = useState<{ id: string; shape: Shape }[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragShape, setActiveDragShape] = useState<Shape | null>(null);

  // Load initial shapes
  useEffect(() => {
    generateNewShapes();
    // Load best score logic if needed (localStorage)
    const savedBest = localStorage.getItem("blockBlastBest");
    if (savedBest) setBestScore(parseInt(savedBest));
  }, []);

  const generateNewShapes = () => {
    const newShapes = getRandomShapes(3).map((s, i) => ({
      id: `shape-${Date.now()}-${i}`,
      shape: s,
    }));
    setShapes(newShapes);
  };

  const restartGame = () => {
    setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0)));
    setScore(0);
    setIsGameOver(false);
    generateNewShapes();
  };

  // Check if placement is valid
  // We need to map the drop position to grid coordinates.
  const isValidPlacement = (grid: Grid, shape: Shape, startRow: number, startCol: number) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 1) {
          const boardRow = startRow + r;
          const boardCol = startCol + c;

          // Check boundaries
          if (boardRow < 0 || boardRow >= GRID_SIZE || boardCol < 0 || boardCol >= GRID_SIZE) {
            return false;
          }
          // Check collision
          if (grid[boardRow][boardCol] === 1) {
            return false;
          }
        }
      }
    }
    return true;
  };

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
      const { active } = event;
      setActiveDragId(active.id as string);
      setActiveDragShape(active.data.current?.shape as Shape);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Reset drag state
    setActiveDragId(null);
    setActiveDragShape(null);

    if (!over || over.id !== "board-zone") return;

    const shape = active.data.current?.shape as Shape;
    if (!shape) return;

    // Calculate Grid Coordinates based on drop position relative to Board
    // This is tricky with dnd-kit without specific droppable cells.
    // Enhanced approach: use document.elementFromPoint or getBoundingClientRect of the board.
    
    // 1. Get the board element
    const boardEl = document.getElementById("game-board");
    if (!boardEl) return;

    const boardRect = boardEl.getBoundingClientRect();
    
    // 2. Get the drag position (center or pointer?)
    // event.activatorEvent is the original event. 
    // event.delta contains the movement.
    // Use `event.active.rect` (requires modifier?) or calculate manually.
    // Let's rely on the pointer coordinates if available, 
    // OR roughly estimate based on the `over` rect if we had cell droppables.
    
    // Workaround: We'll assume the user drops the "center" of the shape? 
    // Or top-left? Top-left is standard for array mapping.
    // But typical UX is "finger covers the shape", so usually user grabs center.
    // Let's try to map the top-left of the DRAGGED ELEMENT to the board.
    
    // However, dnd-kit `event` doesn't give absolute final coordinates easily without `useDraggable` `transform`.
    // We can infer it from the `over` collision if we had 81 droppables.
    // Creating 81 droppables is cleaner for logic. Let's convert Board to use 81 Droppables.
    // Wait, 81 droppables might cause performance lag on mobile? Usually React can handle 81.
    // Let's try 81 droppable cells approach. It's much more robust for "which cell am I over".
    
    // ...
    // RE-EVALUATE: 81 droppables logic below.
  };
  
  // Custom Drag End for 81-cell approach logic (see Board implementation change below)
  const handleDragEndCell = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setActiveDragShape(null);

    if (!over) return;
    
    // over.id should be "cell-row-col"
    const overId = over.id as string;
    if (!overId.startsWith("cell-")) return;

    const [_, rStr, cStr] = overId.split("-");
    const targetRow = parseInt(rStr);
    const targetCol = parseInt(cStr);
    const shape = active.data.current?.shape as Shape;
    
    if (!shape) return;

    // Attempt to place shape at targetRow, targetCol
    // BUT: The user acts as if they are dropping the *part of the shape* they are holding.
    // If I hold the center of a 3x3 block and drop it on cell (0,0), it feels wrong if (0,0) becomes the top-left.
    // Simplification: Assume user is aiming for the top-left of the shape to match the target cell?
    // OR: Smart-snap. 
    // Let's stick to "Top-left of shape snaps to Target Cell" for MVP.
    
    placeBlock(shape, targetRow, targetCol, active.id as string);
  };
  
  const placeBlock = (shape: Shape, r: number, c: number, shapeId: string) => {
      // 1. Check validity
      if (!isValidPlacement(grid, shape, r, c)) {
          // Optional: sound effect "error"
          return; 
      }

      // 2. Place it
      const newGrid = grid.map(row => [...row]);
      for(let i=0; i<shape.length; i++) {
          for(let j=0; j<shape[i].length; j++) {
              if (shape[i][j] === 1) {
                  newGrid[r + i][c + j] = 1;
              }
          }
      }

      // 3. Clear Lines
      const { clearedGrid, points } = clearLines(newGrid);
      
      setGrid(clearedGrid);
      
      const newScore = score + points + 10; // 10 points for placement
      setScore(newScore);
      if (newScore > bestScore) {
          setBestScore(newScore);
          localStorage.setItem("blockBlastBest", newScore.toString());
      }

      // 4. Remove used shape
      const remainingShapes = shapes.filter(s => s.id !== shapeId);
      
      // 5. Check if round is finished (no shapes left)
      if (remainingShapes.length === 0) {
          // Time to generate new shapes??
          // Usually there is a slight delay.
          // Directly generate for now.
          generateNewShapes(); // This sets state, but uses old value of shapes? No, we call logic.
          // React state update batching... better to use effect or functional update.
          // BUT `generateNewShapes` updates `shapes` state.
          // We need to wait for render?
          // Let's just set state using functional update here to be safe, or just call it.
          // Actually we don't need to wait.
      } else {
          setShapes(remainingShapes);
      }
      
      // 6. Check Game Over (on the NEXT state of grid and NEW shapes?)
      // This is tricky. Game over happens if NO available shape can fit.
      // We need to check this *after* shapes are refreshed or *after* placement.
      // If we just refreshed shapes, we check the new ones.
      // If we still have shapes, we check the remaining ones.
  };

  // Helper: Clear lines
  const clearLines = (currentGrid: Grid): { clearedGrid: Grid; points: number } => {
      let linesCleared = 0;
      const rowsToClear: number[] = [];
      const colsToClear: number[] = [];

      // Check rows
      for (let r = 0; r < GRID_SIZE; r++) {
          if (currentGrid[r].every(cell => cell === 1)) {
              rowsToClear.push(r);
          }
      }

      // Check cols
      for (let c = 0; c < GRID_SIZE; c++) {
          let full = true;
          for (let r = 0; r < GRID_SIZE; r++) {
              if (currentGrid[r][c] === 0) {
                  full = false;
                  break;
              }
          }
          if (full) colsToClear.push(c);
      }

      // Create new clean grid
      const newGrid = currentGrid.map(row => [...row]);
      
      rowsToClear.forEach(r => {
          for (let c = 0; c < GRID_SIZE; c++) newGrid[r][c] = 0;
      });
      
      colsToClear.forEach(c => {
          for (let r = 0; r < GRID_SIZE; r++) newGrid[r][c] = 0;
      });
      
      linesCleared = rowsToClear.length + colsToClear.length;
      
      // Scoring logic (basic)
      // 100 per line, bonus for multiple?
      const points = linesCleared * 100 * (linesCleared > 1 ? linesCleared : 1);
      
      return { clearedGrid: newGrid, points };
  };

  // Check Game Over logic
  useEffect(() => {
      if (shapes.length === 0) return; // Wait for new shapes
      
      // Check if ANY shape can fit ANYWHERE
      let canMove = false;
      for (const { shape } of shapes) {
          for (let r = 0; r < GRID_SIZE; r++) {
              for (let c = 0; c < GRID_SIZE; c++) {
                  if (isValidPlacement(grid, shape, r, c)) {
                      canMove = true;
                      break;
                  }
              }
              if (canMove) break;
          }
          if (canMove) break;
      }
      
      if (!canMove) {
          setIsGameOver(true);
      }
  }, [grid, shapes]);


  return (
    <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEndCell}
    >
      <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
        {/* Header / Score */}
        <div className="flex w-full justify-between rounded-xl bg-slate-800 p-4 shadow-lg border border-slate-700">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Score</span>
            <span className="text-2xl font-bold text-white">{score}</span>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-slate-400">
                <Trophy size={14} />
                <span className="text-xs font-medium uppercase tracking-wider">Best</span>
            </div>
            <span className="text-xl font-bold text-orange-400">{bestScore}</span>
          </div>
        </div>

        {/* Game Board */}
        <div className="relative">
            <div className="grid grid-cols-9 gap-1 rounded-lg bg-slate-800 p-2 shadow-2xl border border-slate-700">
            {grid.map((row, rIndex) =>
                row.map((cell, cIndex) => (
                    <DroppableCell 
                        key={`${rIndex}-${cIndex}`} 
                        row={rIndex} 
                        col={cIndex} 
                        filled={cell === 1} 
                    />
                ))
            )}
            </div>
            
            {isGameOver && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-slate-900/80 backdrop-blur-sm z-10">
                    <h2 className="text-3xl font-extrabold text-white mb-2">Game Over!</h2>
                    <p className="text-slate-300 mb-6">Final Score: {score}</p>
                    <button 
                        onClick={restartGame}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
                    >
                        <RefreshCcw size={20} />
                        Play Again
                    </button>
                </div>
            )}
        </div>

        {/* Draggable Shapes Area */}
        <div className="flex w-full h-32 items-center justify-center gap-4 py-4">
             {/* We need a stable container for shapes even if they are dragged out, 
                 but dnd-kit removes the element from flow if not careful?
                 Actually useDraggable keeps it.
             */}
             {shapes.map((item) => (
                <div key={item.id} className="flex items-center justify-center w-1/3">
                    <DraggableBlock id={item.id} shape={item.shape} />
                </div>
             ))}
        </div>
      </div>
      
      <DragOverlay>
           {activeDragId && activeDragShape ? (
               <DraggableBlock id={activeDragId} shape={activeDragShape} isOverlay />
           ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// 3. Droppable Cell Helper
const DroppableCell = ({ row, col, filled }: { row: number; col: number; filled: boolean }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `cell-${row}-${col}`,
        data: { row, col }
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "w-8 h-8 rounded-sm transition-all duration-200",
                filled ? "bg-indigo-500 shadow-md ring-1 ring-white/10" : "bg-slate-900/50",
                !filled && isOver ? "bg-slate-700 ring-2 ring-indigo-400/50 z-10" : ""
            )}
        />
    );
}

