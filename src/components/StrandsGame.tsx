"use client";

import { useRef, useState } from "react";
import type { Cell, StrandsPuzzle } from "@/lib/games";

const key = ([r, c]: Cell) => `${r},${c}`;
const adjacent = (a: Cell, b: Cell) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) === 1;
const samePath = (a: Cell[], b: Cell[]) => a.length === b.length && a.every((p, i) => key(p) === key(b[i]));

export default function StrandsGame({ puzzle }: { puzzle: StrandsPuzzle }) {
  const { rows, cols, grid, spangram, solution } = puzzle;
  const allWords = [spangram, ...puzzle.words];

  const [found, setFound] = useState<string[]>([]);
  const [path, setPath] = useState<Cell[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [hintWord, setHintWord] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  // tappedLast = the press started on the letter that already ends the selection
  const drag = useRef<{ active: boolean; moved: boolean; tappedLast: boolean }>({
    active: false,
    moved: false,
    tappedLast: false,
  });

  const owner = new Map<string, string>(); // cell -> word it belongs to (found only)
  found.forEach((w) => solution[w].forEach((p) => owner.set(key(p), w)));
  const done = found.length === allWords.length;

  const flash = (msg: string) => {
    setMessage(msg);
    window.setTimeout(() => setMessage((m) => (m === msg ? null : m)), 1600);
  };

  const wordOf = (p: Cell[]) => p.map(([r, c]) => grid[r][c]).join("");

  const submit = (p: Cell[]) => {
    setPath([]);
    if (p.length < 3) {
      if (p.length > 0) flash("Too short");
      return;
    }
    const word = wordOf(p);
    const target = allWords.find((w) => !found.includes(w) && samePath(solution[w], p));
    if (target) {
      setFound((f) => [...f, target]);
      if (hintWord === target) setHintWord(null);
      flash(target === spangram ? "SPANGRAM!" : "Nice!");
    } else if (found.includes(word)) {
      flash("Already found");
    } else {
      flash("Not a theme word");
    }
  };

  // Which cell is under the pointer? Only counts the inner part of each cell so
  // diagonal drags don't accidentally clip the neighbours.
  const cellAt = (x: number, y: number): Cell | null => {
    const el = gridRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cw = rect.width / cols;
    const ch = rect.height / rows;
    const c = Math.floor((x - rect.left) / cw);
    const r = Math.floor((y - rect.top) / ch);
    if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
    const dx = x - rect.left - (c + 0.5) * cw;
    const dy = y - rect.top - (r + 0.5) * ch;
    if (Math.hypot(dx, dy) > Math.min(cw, ch) * 0.42) return null;
    return [r, c];
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (done) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (!cell || owner.has(key(cell))) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const last = path[path.length - 1];

    const tappedLast = !!last && key(last) === key(cell);
    drag.current = { active: true, moved: false, tappedLast };
    if (tappedLast) return; // tapping the last letter again = submit (on pointer up)
    const idx = path.findIndex((p) => key(p) === key(cell));
    if (idx >= 0) setPath(path.slice(0, idx + 1));
    else if (last && adjacent(last, cell)) setPath([...path, cell]);
    else setPath([cell]);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (!cell || owner.has(key(cell))) return;
    setPath((p) => {
      if (p.length === 0) return [cell];
      const last = p[p.length - 1];
      if (key(last) === key(cell)) return p;
      // dragged back onto the previous letter -> undo one step
      if (p.length > 1 && key(p[p.length - 2]) === key(cell)) {
        drag.current.moved = true;
        return p.slice(0, -1);
      }
      if (p.some((q) => key(q) === key(cell)) || !adjacent(last, cell)) return p;
      drag.current.moved = true;
      return [...p, cell];
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const { moved, tappedLast } = drag.current;
    drag.current.active = false;
    const cell = cellAt(e.clientX, e.clientY);
    const last = path[path.length - 1];
    if (moved) submit(path); // finished a drag
    else if (tappedLast && cell && last && key(cell) === key(last)) submit(path); // tapped the last letter twice
  };

  const giveHint = () => {
    const next = allWords.find((w) => w !== spangram && !found.includes(w)) ?? (found.includes(spangram) ? null : spangram);
    if (!next) return;
    setHintWord(next);
    setHintsUsed((h) => h + 1);
  };

  const center = ([r, c]: Cell) => `${c * 100 + 50},${r * 100 + 50}`;
  const hintCells = new Set(hintWord ? solution[hintWord].map(key) : []);
  const pathKeys = new Set(path.map(key));

  return (
    <div className="strands">
      <div className="strands-theme">
        <div className="strands-theme-label">Today’s theme</div>
        <div className="strands-theme-text">{puzzle.theme}</div>
      </div>

      <div className="strands-current" aria-live="polite">
        {message ?? (path.length ? wordOf(path) : " ")}
      </div>

      <div
        className="strands-grid"
        ref={gridRef}
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, aspectRatio: `${cols} / ${rows}` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current.active = false)}
      >
        <svg className="strands-lines" viewBox={`0 0 ${cols * 100} ${rows * 100}`} aria-hidden>
          {found.map((w) => (
            <polyline
              key={w}
              points={solution[w].map(center).join(" ")}
              className={w === spangram ? "line-spangram" : "line-found"}
            />
          ))}
          {path.length > 1 && <polyline points={path.map(center).join(" ")} className="line-current" />}
        </svg>
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const k = key([r, c]);
            const w = owner.get(k);
            const cls = [
              "strands-cell",
              w ? (w === spangram ? "spangram" : "found") : "",
              pathKeys.has(k) ? "selected" : "",
              !w && hintCells.has(k) ? "hinted" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div key={k} className={cls}>
                {letter}
              </div>
            );
          })
        )}
      </div>

      <div className="strands-status">
        <strong>{found.filter((w) => w !== spangram).length + (found.includes(spangram) ? 1 : 0)}</strong> of{" "}
        <strong>{allWords.length}</strong> theme words found.
        {hintsUsed > 0 && <span className="muted"> · {hintsUsed} hint{hintsUsed === 1 ? "" : "s"} used</span>}
      </div>

      {!done ? (
        <div className="game-buttons">
          <button className="pill" onClick={giveHint}>
            Hint
          </button>
          <button className="pill" onClick={() => setPath([])} disabled={path.length === 0}>
            Clear
          </button>
          <button className="pill primary" onClick={() => submit(path)} disabled={path.length < 3}>
            Enter
          </button>
        </div>
      ) : (
        <div className="game-result">
          <h2>{hintsUsed === 0 ? "Perfect!" : "Solved!"}</h2>
          <p>
            The spangram was <strong>{spangram}</strong>.
          </p>
          <button
            className="pill"
            onClick={() => {
              setFound([]);
              setHintsUsed(0);
              setHintWord(null);
            }}
          >
            Play again
          </button>
        </div>
      )}
      <p className="game-help">
        Drag across letters (or tap them one by one and tap the last letter again) to make words. Theme words fill the
        board completely; the <span className="spangram-chip">spangram</span> touches two opposite sides.
      </p>
    </div>
  );
}
