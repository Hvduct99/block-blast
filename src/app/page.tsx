"use client";

import { useState } from "react";
import BlockBlastGame from "@/components/Game";
import TetrisGame from "@/components/TetrisGame";
import { cn } from "@/lib/utils";

export default function Home() {
  const [mode, setMode] = useState<"blast" | "tetris">("blast");

  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-slate-950 py-6 px-2">
      {/* Mode Selector */}
      <div className="flex gap-1 mb-6 p-1 rounded-full bg-slate-800/80 border border-slate-700/50">
        <button
          onClick={() => setMode("blast")}
          className={cn(
            "px-5 py-2 rounded-full text-sm font-bold transition-all duration-200",
            mode === "blast"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
              : "bg-transparent text-slate-400 hover:text-white"
          )}
        >
          Map 1: Block Blast
        </button>
        <button
          onClick={() => setMode("tetris")}
          className={cn(
            "px-5 py-2 rounded-full text-sm font-bold transition-all duration-200",
            mode === "tetris"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
              : "bg-transparent text-slate-400 hover:text-white"
          )}
        >
          Map 2: Xếp Hình
        </button>
      </div>

      {mode === "blast" ? <BlockBlastGame /> : <TetrisGame />}
    </main>
  );
}
