"use client";

import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import { SHAPES, getRandomShapes, BLOCK_COLORS, type Shape } from "@/lib/shapes";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Modifier,
} from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";
import { RefreshCcw, Trophy } from "lucide-react";

// --- Constants ---
const GRID_SIZE = 9;
const CELL_SIZE = 30;
const GAP = 3;
const PADDING = 8;

// --- Snap anchor modifier ---
// Aligns the DragOverlay so the shape's anchor cell center is at the cursor position,
// matching the preview calculation on the grid.
const snapAnchorToCursor: Modifier = ({
  activatorEvent,
  draggingNodeRect,
  active,
  transform,
}) => {
  if (!activatorEvent || !draggingNodeRect || !active?.data?.current) return transform;

  const shape = active.data.current.shape as number[][];
  if (!shape) return transform;

  const coords = getEventCoordinates(activatorEvent);
  if (!coords) return transform;

  const anchorR = Math.floor(shape.length / 2);
  const anchorC = Math.floor(shape[0].length / 2);

  // Anchor cell center position within the overlay element (no extra padding)
  const anchorCenterX = anchorC * (CELL_SIZE + GAP) + CELL_SIZE / 2;
  const anchorCenterY = anchorR * (CELL_SIZE + GAP) + CELL_SIZE / 2;

  // Where cursor started within the source element
  const grabOffsetX = coords.x - draggingNodeRect.left;
  const grabOffsetY = coords.y - draggingNodeRect.top;

  return {
    ...transform,
    x: transform.x + grabOffsetX - anchorCenterX,
    y: transform.y + grabOffsetY - anchorCenterY,
  };
};

// --- Types ---
type Cell = number; // 0: empty, 1-8: color ID
type Grid = Cell[][];

interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
  dx: number;
  dy: number;
  rotation: number;
  size: number;
  delay: number;
}

interface FloatingScore {
  id: string;
  x: number;
  y: number;
  score: number;
}

// --- Draggable Block ---
const DraggableBlock = ({
  id,
  shape,
  colorId,
  isOverlay = false,
}: {
  id: string;
  shape: Shape;
  colorId: number;
  isOverlay?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { shape, colorId },
    disabled: isOverlay,
  });

  const color = BLOCK_COLORS[colorId - 1];
  const cellPx = isOverlay ? CELL_SIZE : 24;
  const gapPx = isOverlay ? GAP : 2;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "touch-none select-none cursor-grab active:cursor-grabbing",
        !isOverlay && "p-1",
        isDragging ? "opacity-0 scale-75" : "opacity-100 hover:scale-110 transition-transform duration-200"
      )}
      style={{ touchAction: "none", WebkitUserDrag: "none" } as React.CSSProperties}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${shape[0].length}, ${cellPx}px)`,
          gap: `${gapPx}px`,
          filter: isOverlay ? `drop-shadow(0 0 14px ${color.glow})` : undefined,
        }}
      >
        {shape.map((row, rIdx) =>
          row.map((cell, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              style={{
                width: cellPx,
                height: cellPx,
                background: cell ? color.gradient : "transparent",
                boxShadow: cell
                  ? `0 2px 8px ${color.glow}, inset 0 1px 0 ${color.light}50, inset 0 -2px 0 ${color.dark}40`
                  : "none",
                borderRadius: "4px",
                border: cell ? `1px solid ${color.light}50` : "none",
                visibility: cell ? "visible" : ("hidden" as const),
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};

// --- Droppable Cell ---
const DroppableCell = memo(function DroppableCell({
  row,
  col,
  colorId,
  isClearing,
  isPreview,
  previewValid,
  previewColorId,
}: {
  row: number;
  col: number;
  colorId: number;
  isClearing: boolean;
  isPreview: boolean;
  previewValid: boolean;
  previewColorId: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${row}-${col}`,
    data: { row, col },
  });

  const filled = colorId > 0;
  const color = filled ? BLOCK_COLORS[colorId - 1] : null;
  const prevColor = isPreview && previewColorId > 0 ? BLOCK_COLORS[previewColorId - 1] : null;

  let bg = "rgba(15, 23, 42, 0.5)";
  let shadow = "none";
  let border = "1px solid rgba(51, 65, 85, 0.3)";

  if (filled) {
    bg = color!.gradient;
    shadow = `0 2px 6px ${color!.glow}, inset 0 1px 0 ${color!.light}30, inset 0 -2px 0 ${color!.dark}30`;
    border = `1px solid ${color!.light}40`;
  } else if (isPreview && prevColor) {
    bg = previewValid
      ? `${prevColor.gradient.replace("145deg", "145deg")}`.replace(/100%\)$/, "60%)")
      : "rgba(239, 68, 68, 0.15)";
    shadow = previewValid ? `0 0 8px ${prevColor.glow}` : "none";
    border = previewValid ? `1px solid ${prevColor.light}40` : "1px solid rgba(239, 68, 68, 0.3)";
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-sm",
        isClearing && "animate-cell-shatter",
        !filled && !isPreview && isOver && "ring-1 ring-white/20"
      )}
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        background: bg,
        boxShadow: shadow,
        border,
        transition: isClearing ? "none" : "all 0.15s ease",
      }}
    />
  );
});

// --- Main Game ---
export default function BlockBlastGame() {
  const [grid, setGrid] = useState<Grid>(() =>
    Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(0))
  );
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [shapes, setShapes] = useState<{ id: string; shape: Shape; colorId: number }[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);

  // Drag state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragShape, setActiveDragShape] = useState<Shape | null>(null);
  const [activeDragColorId, setActiveDragColorId] = useState<number>(1);

  // Preview state
  const [previewCells, setPreviewCells] = useState<Set<string> | null>(null);
  const [previewValid, setPreviewValid] = useState(false);
  const [previewColorId, setPreviewColorId] = useState(0);

  // Effects state
  const [clearingCells, setClearingCells] = useState<Set<string>>(new Set());
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const isAnimating = useRef(false);

  // Init
  useEffect(() => {
    generateNewShapes();
    const saved = localStorage.getItem("blockBlastBest");
    if (saved) setBestScore(parseInt(saved));
  }, []);

  const generateNewShapes = () => {
    const newShapes = getRandomShapes(3).map((s, i) => ({
      id: `shape-${Date.now()}-${i}`,
      shape: s,
      colorId: Math.floor(Math.random() * BLOCK_COLORS.length) + 1,
    }));
    setShapes(newShapes);
  };

  const restartGame = () => {
    setGrid(
      Array(GRID_SIZE)
        .fill(null)
        .map(() => Array(GRID_SIZE).fill(0))
    );
    setScore(0);
    setIsGameOver(false);
    setClearingCells(new Set());
    setParticles([]);
    setFloatingScores([]);
    isAnimating.current = false;
    generateNewShapes();
  };

  const isValidPlacement = useCallback(
    (g: Grid, shape: Shape, startRow: number, startCol: number) => {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] === 1) {
            const br = startRow + r;
            const bc = startCol + c;
            if (br < 0 || br >= GRID_SIZE || bc < 0 || bc >= GRID_SIZE) return false;
            if (g[br][bc] !== 0) return false;
          }
        }
      }
      return true;
    },
    []
  );

  // --- Sensors (FIXED for mobile) ---
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } })
  );

  // --- Drag handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragId(active.id as string);
    setActiveDragShape(active.data.current?.shape as Shape);
    setActiveDragColorId(active.data.current?.colorId as number);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setPreviewCells(null);
      return;
    }
    const overId = over.id as string;
    if (!overId.startsWith("cell-")) {
      setPreviewCells(null);
      return;
    }

    const parts = overId.split("-");
    const targetRow = parseInt(parts[1]);
    const targetCol = parseInt(parts[2]);
    const shape = active.data.current?.shape as Shape;
    const cId = active.data.current?.colorId as number;
    if (!shape) return;

    // Center the shape on the target cell
    const anchorR = Math.floor(shape.length / 2);
    const anchorC = Math.floor(shape[0].length / 2);
    const placeRow = targetRow - anchorR;
    const placeCol = targetCol - anchorC;

    const valid = isValidPlacement(grid, shape, placeRow, placeCol);
    const cells = new Set<string>();
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 1) {
          cells.add(`${placeRow + r}-${placeCol + c}`);
        }
      }
    }
    setPreviewCells(cells);
    setPreviewValid(valid);
    setPreviewColorId(cId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setActiveDragShape(null);
    setPreviewCells(null);

    if (isAnimating.current) return;
    if (!over) return;

    const overId = over.id as string;
    if (!overId.startsWith("cell-")) return;

    const parts = overId.split("-");
    const targetRow = parseInt(parts[1]);
    const targetCol = parseInt(parts[2]);
    const shape = active.data.current?.shape as Shape;
    const colorId = active.data.current?.colorId as number;
    if (!shape) return;

    // Center anchor
    const anchorR = Math.floor(shape.length / 2);
    const anchorC = Math.floor(shape[0].length / 2);
    const placeRow = targetRow - anchorR;
    const placeCol = targetCol - anchorC;

    placeBlock(shape, placeRow, placeCol, active.id as string, colorId);
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    setActiveDragShape(null);
    setPreviewCells(null);
  };

  // --- Particle effects ---
  const spawnParticles = (cells: { row: number; col: number; colorId: number }[]) => {
    const newParticles: Particle[] = [];
    cells.forEach((cell) => {
      const color = BLOCK_COLORS[cell.colorId - 1];
      const cx = PADDING + cell.col * (CELL_SIZE + GAP) + CELL_SIZE / 2;
      const cy = PADDING + cell.row * (CELL_SIZE + GAP) + CELL_SIZE / 2;
      const count = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        newParticles.push({
          id: `p-${cell.row}-${cell.col}-${i}-${Date.now()}`,
          x: cx,
          y: cy,
          color: Math.random() > 0.5 ? color.primary : color.particle,
          dx: (Math.random() - 0.5) * 140,
          dy: Math.random() * 80 + 20,
          rotation: Math.random() * 720 - 360,
          size: 3 + Math.random() * 7,
          delay: Math.random() * 120,
        });
      }
    });
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)));
    }, 1100);
  };

  const spawnFloatingScore = (points: number, row: number, col: number) => {
    const id = `fs-${Date.now()}-${Math.random()}`;
    const x = PADDING + col * (CELL_SIZE + GAP);
    const y = PADDING + row * (CELL_SIZE + GAP);
    setFloatingScores((prev) => [...prev, { id, x, y, score: points }]);
    setTimeout(() => {
      setFloatingScores((prev) => prev.filter((fs) => fs.id !== id));
    }, 1200);
  };

  // --- Place block ---
  const placeBlock = (shape: Shape, r: number, c: number, shapeId: string, colorId: number) => {
    if (!isValidPlacement(grid, shape, r, c)) return;

    const newGrid = grid.map((row) => [...row]);
    for (let i = 0; i < shape.length; i++) {
      for (let j = 0; j < shape[i].length; j++) {
        if (shape[i][j] === 1) {
          newGrid[r + i][c + j] = colorId;
        }
      }
    }

    // Check and clear lines
    const { clearedGrid, points, clearedCellsList } = clearLines(newGrid);

    if (clearedCellsList.length > 0) {
      isAnimating.current = true;
      const clearingSet = new Set(clearedCellsList.map((c) => `${c.row}-${c.col}`));
      setClearingCells(clearingSet);
      setGrid(newGrid); // Show placed block first

      spawnParticles(clearedCellsList);

      const avgRow = Math.round(
        clearedCellsList.reduce((s, c) => s + c.row, 0) / clearedCellsList.length
      );
      const avgCol = Math.round(
        clearedCellsList.reduce((s, c) => s + c.col, 0) / clearedCellsList.length
      );
      spawnFloatingScore(points, avgRow, avgCol);

      setTimeout(() => {
        setGrid(clearedGrid);
        setClearingCells(new Set());
        isAnimating.current = false;
      }, 520);
    } else {
      setGrid(newGrid);
    }

    const newScore = score + points + 10;
    setScore(newScore);
    if (newScore > bestScore) {
      setBestScore(newScore);
      localStorage.setItem("blockBlastBest", newScore.toString());
    }

    const remainingShapes = shapes.filter((s) => s.id !== shapeId);
    if (remainingShapes.length === 0) {
      generateNewShapes();
    } else {
      setShapes(remainingShapes);
    }
  };

  // --- Clear lines ---
  const clearLines = (
    currentGrid: Grid
  ): {
    clearedGrid: Grid;
    points: number;
    clearedCellsList: { row: number; col: number; colorId: number }[];
  } => {
    const rowsToClear: number[] = [];
    const colsToClear: number[] = [];
    const clearedCellsList: { row: number; col: number; colorId: number }[] = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      if (currentGrid[r].every((cell) => cell !== 0)) rowsToClear.push(r);
    }
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

    const newGrid = currentGrid.map((row) => [...row]);

    rowsToClear.forEach((r) => {
      for (let c = 0; c < GRID_SIZE; c++) {
        clearedCellsList.push({ row: r, col: c, colorId: currentGrid[r][c] });
        newGrid[r][c] = 0;
      }
    });
    colsToClear.forEach((c) => {
      for (let r = 0; r < GRID_SIZE; r++) {
        if (!rowsToClear.includes(r)) {
          clearedCellsList.push({ row: r, col: c, colorId: currentGrid[r][c] });
        }
        newGrid[r][c] = 0;
      }
    });

    const linesCleared = rowsToClear.length + colsToClear.length;
    const points = linesCleared * 100 * (linesCleared > 1 ? linesCleared : 1);
    return { clearedGrid: newGrid, points, clearedCellsList };
  };

  // --- Game Over check ---
  useEffect(() => {
    if (shapes.length === 0 || isGameOver) return;
    let canMove = false;
    for (const { shape } of shapes) {
      for (let r = 0; r < GRID_SIZE && !canMove; r++) {
        for (let c = 0; c < GRID_SIZE && !canMove; c++) {
          if (isValidPlacement(grid, shape, r, c)) canMove = true;
        }
      }
      if (canMove) break;
    }
    if (!canMove) setIsGameOver(true);
  }, [grid, shapes, isValidPlacement, isGameOver]);

  // --- Render ---
  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="game-container flex flex-col items-center gap-4 w-full max-w-md mx-auto px-2">
        {/* Score Header */}
        <div className="flex w-full justify-between rounded-xl bg-slate-800/80 p-4 shadow-lg border border-slate-700/50 backdrop-blur-sm">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Score
            </span>
            <span className="text-2xl font-bold text-white tabular-nums">{score}</span>
          </div>
          <button
            onClick={restartGame}
            className="flex items-center gap-1 self-center px-3 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCcw size={16} />
          </button>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-slate-400">
              <Trophy size={14} />
              <span className="text-xs font-medium uppercase tracking-wider">Best</span>
            </div>
            <span className="text-xl font-bold text-amber-400 tabular-nums">{bestScore}</span>
          </div>
        </div>

        {/* Game Board */}
        <div className="relative">
          <div
            className="grid rounded-xl bg-slate-800/80 shadow-2xl border border-slate-700/50"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
              gap: `${GAP}px`,
              padding: `${PADDING}px`,
            }}
          >
            {grid.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const key = `${rIdx}-${cIdx}`;
                return (
                  <DroppableCell
                    key={key}
                    row={rIdx}
                    col={cIdx}
                    colorId={cell}
                    isClearing={clearingCells.has(key)}
                    isPreview={previewCells?.has(key) || false}
                    previewValid={previewValid}
                    previewColorId={previewColorId}
                  />
                );
              })
            )}
          </div>

          {/* Particles */}
          {particles.length > 0 && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
              {particles.map((p) => (
                <div
                  key={p.id}
                  className="absolute animate-particle"
                  style={
                    {
                      left: p.x,
                      top: p.y,
                      width: p.size,
                      height: p.size,
                      backgroundColor: p.color,
                      borderRadius: "2px",
                      "--px-dx": `${p.dx}px`,
                      "--px-dy": `${p.dy}px`,
                      "--px-rot": `${p.rotation}deg`,
                      animationDelay: `${p.delay}ms`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          )}

          {/* Floating Scores */}
          {floatingScores.map((fs) => (
            <div
              key={fs.id}
              className="absolute pointer-events-none animate-score-float"
              style={{ left: fs.x, top: fs.y, zIndex: 20 }}
            >
              <span className="text-2xl font-extrabold text-yellow-300 drop-shadow-[0_2px_8px_rgba(250,204,21,0.8)]">
                +{fs.score}
              </span>
            </div>
          ))}

          {/* Game Over */}
          {isGameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-slate-900/85 backdrop-blur-sm z-30">
              <h2 className="text-3xl font-extrabold text-white mb-2 drop-shadow-lg">
                Game Over!
              </h2>
              <p className="text-slate-300 mb-6">Final Score: {score}</p>
              <button
                onClick={restartGame}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95"
              >
                <RefreshCcw size={20} />
                Play Again
              </button>
            </div>
          )}
        </div>

        {/* Shapes Tray */}
        <div className="flex w-full items-center justify-center gap-2 py-2 min-h-[90px]">
          {shapes.map((item) => (
            <div key={item.id} className="flex items-center justify-center flex-1 max-w-[120px]">
              <DraggableBlock id={item.id} shape={item.shape} colorId={item.colorId} />
            </div>
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={null} zIndex={50} modifiers={[snapAnchorToCursor]}>
        {activeDragId && activeDragShape ? (
          <DraggableBlock
            id={activeDragId}
            shape={activeDragShape}
            colorId={activeDragColorId}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
