"use client";

import React, { useReducer, useEffect, useRef, useState, useCallback } from "react";
import { BLOCK_COLORS, getRandomTetromino } from "@/lib/shapes";
import { cn } from "@/lib/utils";
import { RefreshCcw, Trophy, RotateCw, ChevronDown, ChevronLeft, ChevronRight, ChevronsDown } from "lucide-react";

// --- Constants ---
const COLS = 10;
const ROWS = 20;
const CELL_SIZE = 26;
const GAP = 2;
const PADDING = 6;

// --- Types ---
type Grid = number[][];

interface Piece {
  shape: number[][];
  colorId: number;
  row: number;
  col: number;
}

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

interface TetrisState {
  grid: Grid;
  piece: Piece | null;
  nextPiece: { shape: number[][]; colorId: number };
  score: number;
  bestScore: number;
  level: number;
  linesCleared: number;
  gameOver: boolean;
  paused: boolean;
  clearingRows: number[];
}

// --- Helpers ---
function createEmptyGrid(): Grid {
  return Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill(0));
}

function rotateShape(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated: number[][] = [];
  for (let c = 0; c < cols; c++) {
    const newRow: number[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      newRow.push(shape[r][c]);
    }
    rotated.push(newRow);
  }
  return rotated;
}

function isValidPosition(shape: number[][], row: number, col: number, grid: Grid): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] === 1) {
        const br = row + r;
        const bc = col + c;
        if (bc < 0 || bc >= COLS || br >= ROWS) return false;
        if (br >= 0 && grid[br][bc] !== 0) return false;
      }
    }
  }
  return true;
}

function lockPieceToGrid(piece: Piece, grid: Grid): Grid {
  const newGrid = grid.map((r) => [...r]);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c] === 1) {
        const br = piece.row + r;
        const bc = piece.col + c;
        if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) {
          newGrid[br][bc] = piece.colorId;
        }
      }
    }
  }
  return newGrid;
}

function findFullRows(grid: Grid): number[] {
  const rows: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    if (grid[r].every((cell) => cell !== 0)) rows.push(r);
  }
  return rows;
}

function removeRows(grid: Grid, rowsToRemove: number[]): Grid {
  const newGrid = grid.filter((_, i) => !rowsToRemove.includes(i));
  while (newGrid.length < ROWS) {
    newGrid.unshift(new Array(COLS).fill(0));
  }
  return newGrid;
}

function getGhostRow(piece: Piece, grid: Grid): number {
  let ghostRow = piece.row;
  while (isValidPosition(piece.shape, ghostRow + 1, piece.col, grid)) {
    ghostRow++;
  }
  return ghostRow;
}

function calcPoints(lines: number, level: number): number {
  const table: Record<number, number> = { 1: 100, 2: 300, 3: 500, 4: 800 };
  return (table[lines] || lines * 200) * level;
}

function spawnPiece(state: TetrisState): TetrisState {
  const piece: Piece = {
    shape: state.nextPiece.shape,
    colorId: state.nextPiece.colorId,
    row: 0,
    col: Math.floor((COLS - state.nextPiece.shape[0].length) / 2),
  };

  if (!isValidPosition(piece.shape, piece.row, piece.col, state.grid)) {
    return { ...state, piece: null, gameOver: true };
  }
  return { ...state, piece, nextPiece: getRandomTetromino() };
}

function tryWallKick(shape: number[][], row: number, col: number, grid: Grid): { row: number; col: number } | null {
  const offsets = [
    [0, 0], [0, -1], [0, 1], [0, -2], [0, 2], [-1, 0], [-2, 0],
  ];
  for (const [dr, dc] of offsets) {
    if (isValidPosition(shape, row + dr, col + dc, grid)) {
      return { row: row + dr, col: col + dc };
    }
  }
  return null;
}

// --- Reducer ---
type Action =
  | { type: "TICK" }
  | { type: "MOVE"; dir: "left" | "right" }
  | { type: "ROTATE" }
  | { type: "SOFT_DROP" }
  | { type: "HARD_DROP" }
  | { type: "CLEAR_ROWS" }
  | { type: "RESTART" }
  | { type: "TOGGLE_PAUSE" }
  | { type: "LOAD_BEST"; best: number };

function reducer(state: TetrisState, action: Action): TetrisState {
  if (state.gameOver && action.type !== "RESTART" && action.type !== "LOAD_BEST") return state;
  if (state.paused && action.type !== "TOGGLE_PAUSE" && action.type !== "RESTART") return state;

  switch (action.type) {
    case "LOAD_BEST":
      return { ...state, bestScore: action.best };

    case "TICK": {
      if (state.clearingRows.length > 0) return state;
      if (!state.piece) return spawnPiece(state);

      const newRow = state.piece.row + 1;
      if (isValidPosition(state.piece.shape, newRow, state.piece.col, state.grid)) {
        return { ...state, piece: { ...state.piece, row: newRow } };
      }
      // Lock
      const locked = lockPieceToGrid(state.piece, state.grid);
      const fullRows = findFullRows(locked);
      if (fullRows.length > 0) {
        return { ...state, grid: locked, piece: null, clearingRows: fullRows };
      }
      const ns = spawnPiece({ ...state, grid: locked, piece: null });
      return ns;
    }

    case "MOVE": {
      if (!state.piece || state.clearingRows.length > 0) return state;
      const dc = action.dir === "left" ? -1 : 1;
      const nc = state.piece.col + dc;
      if (isValidPosition(state.piece.shape, state.piece.row, nc, state.grid)) {
        return { ...state, piece: { ...state.piece, col: nc } };
      }
      return state;
    }

    case "ROTATE": {
      if (!state.piece || state.clearingRows.length > 0) return state;
      const rotated = rotateShape(state.piece.shape);
      const kick = tryWallKick(rotated, state.piece.row, state.piece.col, state.grid);
      if (kick) {
        return { ...state, piece: { ...state.piece, shape: rotated, row: kick.row, col: kick.col } };
      }
      return state;
    }

    case "SOFT_DROP": {
      if (!state.piece || state.clearingRows.length > 0) return state;
      const nr = state.piece.row + 1;
      if (isValidPosition(state.piece.shape, nr, state.piece.col, state.grid)) {
        return { ...state, piece: { ...state.piece, row: nr }, score: state.score + 1 };
      }
      return state;
    }

    case "HARD_DROP": {
      if (!state.piece || state.clearingRows.length > 0) return state;
      let dropRow = state.piece.row;
      while (isValidPosition(state.piece.shape, dropRow + 1, state.piece.col, state.grid)) {
        dropRow++;
      }
      const bonusPoints = (dropRow - state.piece.row) * 2;
      const droppedPiece = { ...state.piece, row: dropRow };
      const locked = lockPieceToGrid(droppedPiece, state.grid);
      const fullRows = findFullRows(locked);
      if (fullRows.length > 0) {
        return { ...state, grid: locked, piece: null, score: state.score + bonusPoints, clearingRows: fullRows };
      }
      const ns = spawnPiece({ ...state, grid: locked, piece: null, score: state.score + bonusPoints });
      return ns;
    }

    case "CLEAR_ROWS": {
      if (state.clearingRows.length === 0) return state;
      const cleared = removeRows(state.grid, state.clearingRows);
      const lineCount = state.clearingRows.length;
      const points = calcPoints(lineCount, state.level);
      const newLines = state.linesCleared + lineCount;
      const newLevel = Math.floor(newLines / 10) + 1;
      const newScore = state.score + points;
      const newBest = Math.max(newScore, state.bestScore);
      const ns = spawnPiece({
        ...state,
        grid: cleared,
        clearingRows: [],
        score: newScore,
        bestScore: newBest,
        linesCleared: newLines,
        level: newLevel,
        piece: null,
      });
      return ns;
    }

    case "RESTART": {
      return {
        ...state,
        grid: createEmptyGrid(),
        piece: null,
        nextPiece: getRandomTetromino(),
        score: 0,
        level: 1,
        linesCleared: 0,
        gameOver: false,
        paused: false,
        clearingRows: [],
      };
    }

    case "TOGGLE_PAUSE":
      return { ...state, paused: !state.paused };

    default:
      return state;
  }
}

const initialState: TetrisState = {
  grid: createEmptyGrid(),
  piece: null,
  nextPiece: getRandomTetromino(),
  score: 0,
  bestScore: 0,
  level: 1,
  linesCleared: 0,
  gameOver: false,
  paused: false,
  clearingRows: [],
};

// --- Component ---
export default function TetrisGame() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);

  // Touch swipe state
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Load best score
  useEffect(() => {
    const saved = localStorage.getItem("tetrisBest");
    if (saved) dispatch({ type: "LOAD_BEST", best: parseInt(saved) });
  }, []);

  // Save best score
  useEffect(() => {
    if (state.bestScore > 0) {
      localStorage.setItem("tetrisBest", state.bestScore.toString());
    }
  }, [state.bestScore]);

  // Game loop
  useEffect(() => {
    if (state.gameOver || state.paused) return;
    const speed = Math.max(80, 1000 - (state.level - 1) * 100);
    const timer = setInterval(() => dispatch({ type: "TICK" }), speed);
    return () => clearInterval(timer);
  }, [state.gameOver, state.paused, state.level]);

  // Clear rows animation
  useEffect(() => {
    if (state.clearingRows.length > 0) {
      // Spawn particles for clearing rows
      const cells: { row: number; col: number; colorId: number }[] = [];
      state.clearingRows.forEach((r) => {
        for (let c = 0; c < COLS; c++) {
          if (state.grid[r][c] !== 0) {
            cells.push({ row: r, col: c, colorId: state.grid[r][c] });
          }
        }
      });
      spawnClearParticles(cells);

      // Floating score
      const pts = calcPoints(state.clearingRows.length, state.level);
      const avgRow = Math.round(
        state.clearingRows.reduce((a, b) => a + b, 0) / state.clearingRows.length
      );
      spawnFloat(pts, avgRow, Math.floor(COLS / 2));

      const timer = setTimeout(() => dispatch({ type: "CLEAR_ROWS" }), 520);
      return () => clearTimeout(timer);
    }
  }, [state.clearingRows, state.level]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (state.gameOver) return;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          dispatch({ type: "MOVE", dir: "left" });
          break;
        case "ArrowRight":
          e.preventDefault();
          dispatch({ type: "MOVE", dir: "right" });
          break;
        case "ArrowUp":
          e.preventDefault();
          dispatch({ type: "ROTATE" });
          break;
        case "ArrowDown":
          e.preventDefault();
          dispatch({ type: "SOFT_DROP" });
          break;
        case " ":
          e.preventDefault();
          dispatch({ type: "HARD_DROP" });
          break;
        case "p":
        case "P":
          dispatch({ type: "TOGGLE_PAUSE" });
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [state.gameOver]);

  // --- Particle effects ---
  const spawnClearParticles = useCallback(
    (cells: { row: number; col: number; colorId: number }[]) => {
      const newP: Particle[] = [];
      cells.forEach((cell) => {
        const color = BLOCK_COLORS[cell.colorId - 1] || BLOCK_COLORS[0];
        const cx = PADDING + cell.col * (CELL_SIZE + GAP) + CELL_SIZE / 2;
        const cy = PADDING + cell.row * (CELL_SIZE + GAP) + CELL_SIZE / 2;
        const count = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
          newP.push({
            id: `tp-${cell.row}-${cell.col}-${i}-${Date.now()}`,
            x: cx,
            y: cy,
            color: Math.random() > 0.4 ? color.primary : color.particle,
            dx: (Math.random() - 0.5) * 120,
            dy: Math.random() * 70 + 30,
            rotation: Math.random() * 720 - 360,
            size: 3 + Math.random() * 6,
            delay: Math.random() * 100,
          });
        }
      });
      setParticles((prev) => [...prev, ...newP]);
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => !newP.find((np) => np.id === p.id)));
      }, 1100);
    },
    []
  );

  const spawnFloat = useCallback((points: number, row: number, col: number) => {
    const id = `tfs-${Date.now()}-${Math.random()}`;
    const x = PADDING + col * (CELL_SIZE + GAP);
    const y = PADDING + row * (CELL_SIZE + GAP);
    setFloatingScores((prev) => [...prev, { id, x, y, score: points }]);
    setTimeout(() => setFloatingScores((prev) => prev.filter((f) => f.id !== id)), 1200);
  }, []);

  // --- Display Grid (merge piece + ghost) ---
  const getDisplayGrid = useCallback((): number[][] => {
    const display = state.grid.map((r) => [...r]);
    if (!state.piece) return display;

    // Ghost piece
    const ghostRow = getGhostRow(state.piece, state.grid);
    for (let r = 0; r < state.piece.shape.length; r++) {
      for (let c = 0; c < state.piece.shape[r].length; c++) {
        if (state.piece.shape[r][c]) {
          const gr = ghostRow + r;
          const gc = state.piece.col + c;
          if (gr >= 0 && gr < ROWS && gc >= 0 && gc < COLS && display[gr][gc] === 0) {
            display[gr][gc] = -(state.piece.colorId); // Negative = ghost
          }
        }
      }
    }

    // Current piece
    for (let r = 0; r < state.piece.shape.length; r++) {
      for (let c = 0; c < state.piece.shape[r].length; c++) {
        if (state.piece.shape[r][c]) {
          const pr = state.piece.row + r;
          const pc = state.piece.col + c;
          if (pr >= 0 && pr < ROWS && pc >= 0 && pc < COLS) {
            display[pr][pc] = state.piece.colorId;
          }
        }
      }
    }

    return display;
  }, [state.grid, state.piece]);

  const displayGrid = getDisplayGrid();

  // --- Touch Controls ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current || state.gameOver) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx < 15 && absDy < 15) {
        // Tap = rotate
        dispatch({ type: "ROTATE" });
      } else if (absDx > absDy) {
        // Horizontal swipe
        dispatch({ type: "MOVE", dir: dx > 0 ? "right" : "left" });
      } else if (dy > 30) {
        // Swipe down = hard drop
        dispatch({ type: "HARD_DROP" });
      }

      touchStartRef.current = null;
    },
    [state.gameOver]
  );

  // --- Render Next Piece Preview ---
  const renderNextPiece = () => {
    const np = state.nextPiece;
    const color = BLOCK_COLORS[np.colorId - 1] || BLOCK_COLORS[0];
    return (
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${np.shape[0].length}, 18px)`,
          gap: "2px",
        }}
      >
        {np.shape.map((row, ri) =>
          row.map((cell, ci) => (
            <div
              key={`${ri}-${ci}`}
              style={{
                width: 18,
                height: 18,
                background: cell ? color.gradient : "transparent",
                borderRadius: "3px",
                boxShadow: cell ? `0 1px 4px ${color.glow}` : "none",
                border: cell ? `1px solid ${color.light}40` : "none",
                visibility: cell ? "visible" : ("hidden" as const),
              }}
            />
          ))
        )}
      </div>
    );
  };

  // --- Control button helper ---
  const CtrlBtn = ({
    children,
    onAction,
    className: extraClass,
  }: {
    children: React.ReactNode;
    onAction: () => void;
    className?: string;
  }) => (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onAction();
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        onAction();
      }}
      className={cn(
        "flex items-center justify-center w-14 h-14 rounded-xl bg-slate-700/80 active:bg-slate-600 text-white shadow-lg transition-transform active:scale-90 touch-none select-none border border-slate-600/50",
        extraClass
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="game-container flex flex-col items-center gap-3 w-full max-w-sm mx-auto px-2">
      {/* Score Header */}
      <div className="flex w-full justify-between items-center rounded-xl bg-slate-800/80 p-3 shadow-lg border border-slate-700/50">
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Score</span>
          <span className="text-xl font-bold text-white tabular-nums">{state.score}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Level</span>
          <span className="text-lg font-bold text-indigo-400 tabular-nums">{state.level}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Lines</span>
          <span className="text-lg font-bold text-emerald-400 tabular-nums">{state.linesCleared}</span>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1 text-slate-400">
            <Trophy size={12} />
            <span className="text-[10px] font-medium uppercase tracking-wider">Best</span>
          </div>
          <span className="text-lg font-bold text-amber-400 tabular-nums">{state.bestScore}</span>
        </div>
      </div>

      {/* Board + Next Piece */}
      <div className="flex gap-3 items-start">
        {/* Game Board */}
        <div
          className="relative"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="grid rounded-xl bg-slate-800/80 shadow-2xl border border-slate-700/50"
            style={{
              gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
              gap: `${GAP}px`,
              padding: `${PADDING}px`,
            }}
          >
            {displayGrid.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const isGhost = cell < 0;
                const colorId = Math.abs(cell);
                const color = colorId > 0 ? BLOCK_COLORS[colorId - 1] || BLOCK_COLORS[0] : null;
                const isClearing = state.clearingRows.includes(rIdx);

                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    className={cn(
                      "rounded-sm",
                      isClearing && cell > 0 && "animate-cell-shatter",
                      isGhost && "animate-ghost"
                    )}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      background:
                        cell > 0
                          ? color!.gradient
                          : isGhost
                          ? color!.gradient
                          : "rgba(15, 23, 42, 0.5)",
                      opacity: isGhost ? 0.3 : 1,
                      boxShadow:
                        cell > 0
                          ? `0 1px 4px ${color!.glow}, inset 0 1px 0 ${color!.light}30`
                          : isGhost
                          ? `0 0 6px ${color!.glow}`
                          : "none",
                      border:
                        cell > 0
                          ? `1px solid ${color!.light}35`
                          : isGhost
                          ? `1.5px dashed ${color!.light}50`
                          : "1px solid rgba(51, 65, 85, 0.2)",
                      transition: isClearing ? "none" : "all 0.08s ease",
                    }}
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
              <span className="text-xl font-extrabold text-yellow-300 drop-shadow-[0_2px_8px_rgba(250,204,21,0.8)]">
                +{fs.score}
              </span>
            </div>
          ))}

          {/* Game Over */}
          {state.gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-slate-900/85 backdrop-blur-sm z-30">
              <h2 className="text-2xl font-extrabold text-white mb-2 drop-shadow-lg">Game Over!</h2>
              <p className="text-slate-300 text-sm mb-4">
                Score: {state.score} | Level: {state.level}
              </p>
              <button
                onClick={() => dispatch({ type: "RESTART" })}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95"
              >
                <RefreshCcw size={18} />
                Retry
              </button>
            </div>
          )}

          {/* Paused */}
          {state.paused && !state.gameOver && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-900/70 backdrop-blur-sm z-30">
              <h2 className="text-2xl font-extrabold text-white drop-shadow-lg">PAUSED</h2>
            </div>
          )}
        </div>

        {/* Next Piece Panel */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-700/50">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block mb-2">
              Next
            </span>
            {renderNextPiece()}
          </div>
          <button
            onClick={() => dispatch({ type: "TOGGLE_PAUSE" })}
            className="px-3 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-600/60 text-xs text-slate-300 hover:text-white transition-colors border border-slate-600/50"
          >
            {state.paused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={() => dispatch({ type: "RESTART" })}
            className="px-3 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-600/60 text-xs text-slate-300 hover:text-white transition-colors border border-slate-600/50 flex items-center justify-center gap-1"
          >
            <RefreshCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="flex flex-col items-center gap-2 mt-1 md:hidden">
        <div className="flex items-center gap-3">
          <CtrlBtn onAction={() => dispatch({ type: "MOVE", dir: "left" })}>
            <ChevronLeft size={28} />
          </CtrlBtn>
          <CtrlBtn onAction={() => dispatch({ type: "ROTATE" })} className="bg-indigo-700/80 active:bg-indigo-600 border-indigo-500/50">
            <RotateCw size={24} />
          </CtrlBtn>
          <CtrlBtn onAction={() => dispatch({ type: "MOVE", dir: "right" })}>
            <ChevronRight size={28} />
          </CtrlBtn>
        </div>
        <div className="flex items-center gap-3">
          <CtrlBtn onAction={() => dispatch({ type: "SOFT_DROP" })}>
            <ChevronDown size={28} />
          </CtrlBtn>
          <CtrlBtn
            onAction={() => dispatch({ type: "HARD_DROP" })}
            className="bg-amber-700/80 active:bg-amber-600 border-amber-500/50 w-[124px]"
          >
            <ChevronsDown size={24} />
            <span className="text-xs ml-1 font-bold">DROP</span>
          </CtrlBtn>
        </div>
      </div>

      {/* Desktop hint */}
      <p className="text-[10px] text-slate-500 hidden md:block">
        ← → Move &nbsp; ↑ Rotate &nbsp; ↓ Soft Drop &nbsp; Space Hard Drop &nbsp; P Pause
      </p>
    </div>
  );
}
