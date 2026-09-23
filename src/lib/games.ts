// ============================================================================
// games.ts — loads the puzzle text files in content/games/.
//
//   content/games/connections.txt
//   content/games/strands.txt
//
// Swap either file out and the game on the site changes on the next page
// load. See the example files for the exact format (it's all plain text).
// ============================================================================

import fs from "node:fs/promises";
import path from "node:path";

const GAMES_DIR = path.join(process.cwd(), "content", "games");

async function readGameFile(name: string): Promise<string | null> {
  try {
    return await fs.readFile(path.join(GAMES_DIR, name), "utf8");
  } catch {
    return null;
  }
}

// Shared "key: value" reader. Lines starting with # are comments. A line
// without a colon continues the previous key (handy for word lists / grids).
function readKeyValues(text: string): { pairs: [string, string][] } {
  const pairs: [string, string][] = [];
  for (const raw of text.replace(/^﻿/, "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    const idx = line.indexOf(":");
    if (idx > 0) {
      pairs.push([line.slice(0, idx).trim(), line.slice(idx + 1).trim()]);
    } else if (pairs.length > 0) {
      const last = pairs[pairs.length - 1];
      last[1] = last[1] ? `${last[1]}\n${line}` : line;
    } else {
      pairs.push(["", line]);
    }
  }
  return { pairs };
}

function splitList(s: string): string[] {
  return s
    .split(/[,|\n]/)
    .map((w) => w.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// CONNECTIONS
// ---------------------------------------------------------------------------
export interface ConnectionsGroup {
  name: string;
  words: string[];
  level: number; // 0 = yellow (easiest) … 3 = purple (hardest)
}

export interface ConnectionsPuzzle {
  title: string;
  date: string;
  author: string;
  groups: ConnectionsGroup[];
}

const CONNECTIONS_META = new Set(["title", "date", "author", "by", "puzzle by", "byline"]);

export async function loadConnections(): Promise<{ puzzle?: ConnectionsPuzzle; error?: string }> {
  const text = await readGameFile("connections.txt");
  if (text === null) return { error: "content/games/connections.txt is missing." };

  const { pairs } = readKeyValues(text);
  const meta: Record<string, string> = {};
  const groups: ConnectionsGroup[] = [];

  for (const [key, value] of pairs) {
    const k = key.toLowerCase();
    const words = splitList(value);
    if (CONNECTIONS_META.has(k) && words.length !== 4) {
      meta[k] = value;
      continue;
    }
    if (words.length !== 4) {
      return { error: `Group "${key}" needs exactly 4 words (found ${words.length}).` };
    }
    groups.push({ name: key, words: words.map((w) => w.toUpperCase()), level: groups.length });
  }

  if (groups.length !== 4) return { error: `connections.txt needs exactly 4 groups (found ${groups.length}).` };
  const all = groups.flatMap((g) => g.words);
  const dupes = all.filter((w, i) => all.indexOf(w) !== i);
  if (dupes.length) return { error: `Each word can only appear once. Repeated: ${[...new Set(dupes)].join(", ")}` };

  return {
    puzzle: {
      title: meta.title || "Connections",
      date: meta.date || "",
      author: meta.author || meta.by || meta["puzzle by"] || meta.byline || "",
      groups,
    },
  };
}

// ---------------------------------------------------------------------------
// STRANDS
// ---------------------------------------------------------------------------
export type Cell = [number, number]; // [row, col]

export interface StrandsPuzzle {
  title: string;
  date: string;
  author: string;
  theme: string;
  rows: number;
  cols: number;
  grid: string[][]; // grid[row][col] = letter
  spangram: string;
  words: string[]; // theme words (not including spangram)
  solution: Record<string, Cell[]>; // word -> its path in the grid
}

function lettersOnly(s: string): string {
  return s.toUpperCase().replace(/[^A-Z]/g, "");
}

// Small deterministic random generator so everyone sees the same grid for
// the same puzzle file (and the grid only changes when the file changes).
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DIRS: Cell[] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

// ---- Core solver/generator -------------------------------------------------
// Lays every word into the grid as a path of touching cells (8 directions),
// using every cell exactly once and never letting two diagonal lines cross.
// If `fixed` letters are given (a hand-made grid), paths must match them;
// otherwise it invents the grid.
interface LayoutOptions {
  rows: number;
  cols: number;
  words: string[]; // words[0] is the spangram
  fixed?: string[][];
  rand: () => number;
  budget: number; // max search steps
}

function layout(opts: LayoutOptions): Cell[][] | null {
  const { rows, cols, words, fixed, rand } = opts;
  const owner: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-1));
  const diagUsed = new Set<number>(); // 2x2 squares whose diagonal is taken
  const paths: Cell[][] = [];
  let steps = 0;

  const inside = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols;
  const sqKey = (a: Cell, b: Cell) => Math.min(a[0], b[0]) * cols + Math.min(a[1], b[1]);
  const isDiag = (a: Cell, b: Cell) => a[0] !== b[0] && a[1] !== b[1];

  const emptyNeighbors = (r: number, c: number) => {
    let n = 0;
    for (const [dr, dc] of DIRS) if (inside(r + dr, c + dc) && owner[r + dr][c + dc] === -1) n++;
    return n;
  };

  // Every empty region must be big enough for at least the shortest word
  // still to be placed, and the regions must be fillable in total.
  const regionsOk = (remaining: number[]): boolean => {
    if (remaining.length === 0) return true;
    const minLen = Math.min(...remaining);
    const seen: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (owner[r][c] !== -1 || seen[r][c]) continue;
        let size = 0;
        const stack: Cell[] = [[r, c]];
        seen[r][c] = true;
        while (stack.length) {
          const [cr, cc] = stack.pop()!;
          size++;
          for (const [dr, dc] of DIRS) {
            const nr = cr + dr, nc = cc + dc;
            if (inside(nr, nc) && !seen[nr][nc] && owner[nr][nc] === -1) {
              seen[nr][nc] = true;
              stack.push([nr, nc]);
            }
          }
        }
        if (size < minLen) return false;
      }
    return true;
  };

  const spansGrid = (path: Cell[]) => {
    const rs = path.map((p) => p[0]);
    const cs = path.map((p) => p[1]);
    return (cs.includes(0) && cs.includes(cols - 1)) || (rs.includes(0) && rs.includes(rows - 1));
  };

  // Try to lay word #wi, then recurse into the rest.
  const placeWord = (wi: number): boolean => {
    if (wi === words.length) return true;
    const word = words[wi];
    const isSpangram = wi === 0;

    let starts: Cell[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (owner[r][c] === -1 && (!fixed || fixed[r][c] === word[0])) starts.push([r, c]);
    if (isSpangram && !fixed) {
      // spangram starts on the left edge or top edge
      starts = starts.filter(([r, c]) => c === 0 || r === 0);
    }
    // prefer tight corners so we don't strand single cells
    starts = shuffle(starts, rand).sort((a, b) => emptyNeighbors(a[0], a[1]) - emptyNeighbors(b[0], b[1]));

    const path: Cell[] = [];

    const extend = (r: number, c: number, i: number): boolean => {
      if (++steps > opts.budget) return false;
      owner[r][c] = wi;
      path.push([r, c]);

      if (i === word.length - 1) {
        if ((!isSpangram || spansGrid(path)) && regionsOk(words.slice(wi + 1).map((w) => w.length))) {
          paths[wi] = [...path];
          if (placeWord(wi + 1)) return true;
        }
      } else {
        let next: Cell[] = [];
        for (const [dr, dc] of DIRS) {
          const nr = r + dr, nc = c + dc;
          if (!inside(nr, nc) || owner[nr][nc] !== -1) continue;
          if (fixed && fixed[nr][nc] !== word[i + 1]) continue;
          if (isDiag([r, c], [nr, nc]) && diagUsed.has(sqKey([r, c], [nr, nc]))) continue;
          next.push([nr, nc]);
        }
        next = shuffle(next, rand);
        // regular words hug tight spots (keeps the leftover space fillable);
        // the spangram wanders freely so it isn't always stuck on an edge
        if (!isSpangram) next.sort((a, b) => emptyNeighbors(a[0], a[1]) - emptyNeighbors(b[0], b[1]));
        for (const [nr, nc] of next) {
          const diag = isDiag([r, c], [nr, nc]);
          const key = sqKey([r, c], [nr, nc]);
          if (diag) diagUsed.add(key);
          if (extend(nr, nc, i + 1)) return true;
          if (diag) diagUsed.delete(key);
          if (steps > opts.budget) break;
        }
      }

      owner[r][c] = -1;
      path.pop();
      return false;
    };

    for (const [r, c] of starts) {
      if (extend(r, c, 0)) return true;
      if (steps > opts.budget) return false;
    }
    return false;
  };

  return placeWord(0) ? paths : null;
}

function chooseSize(total: number): { rows: number; cols: number } | null {
  if (total === 48) return { rows: 8, cols: 6 };
  let best: { rows: number; cols: number; score: number } | null = null;
  for (let cols = 5; cols <= 8; cols++) {
    if (total % cols) continue;
    const rows = total / cols;
    if (rows < 5 || rows > 10) continue;
    const score = Math.abs(rows - 8) + Math.abs(cols - 6);
    if (!best || score < best.score) best = { rows, cols, score };
  }
  return best ? { rows: best.rows, cols: best.cols } : null;
}

const strandsCache = new Map<string, { puzzle?: StrandsPuzzle; error?: string }>();

export async function loadStrands(): Promise<{ puzzle?: StrandsPuzzle; error?: string }> {
  const text = await readGameFile("strands.txt");
  if (text === null) return { error: "content/games/strands.txt is missing." };
  const cached = strandsCache.get(text);
  if (cached) return cached;
  const result = buildStrands(text);
  strandsCache.set(text, result);
  return result;
}

export function buildStrands(text: string): { puzzle?: StrandsPuzzle; error?: string } {
  const { pairs } = readKeyValues(text);
  const meta: Record<string, string> = {};
  const wordList: string[] = [];
  for (const [key, value] of pairs) {
    const k = key.toLowerCase();
    if (k === "words" || k === "word" || k === "theme words") wordList.push(...splitList(value));
    else meta[k] = value;
  }

  const spangram = lettersOnly(meta.spangram || "");
  const words = [...new Set(wordList.map(lettersOnly).filter(Boolean))].filter((w) => w !== spangram);
  if (!spangram) return { error: "strands.txt needs a line like  spangram: EAGLEEYE" };
  if (words.length === 0) return { error: "strands.txt needs a line like  words: WORD, WORD, WORD" };
  const tooShort = [spangram, ...words].filter((w) => w.length < 3);
  if (tooShort.length) return { error: `Words must be at least 3 letters: ${tooShort.join(", ")}` };

  // Optional hand-made grid
  let fixed: string[][] | undefined;
  if (meta.grid) {
    fixed = meta.grid
      .split("\n")
      .map((row) => lettersOnly(row).split(""))
      .filter((row) => row.length);
    if (fixed.some((row) => row.length !== fixed![0].length)) return { error: "Every grid row must be the same length." };
  }

  const total = [spangram, ...words].reduce((n, w) => n + w.length, 0);
  let size: { rows: number; cols: number } | null = null;
  if (fixed) size = { rows: fixed.length, cols: fixed[0].length };
  else if (meta.size) {
    const m = meta.size.match(/(\d+)\s*[x×*]\s*(\d+)/i);
    if (m) size = { rows: +m[1], cols: +m[2] };
  }
  size ??= chooseSize(total);
  if (!size || size.rows * size.cols !== total) {
    const want = size ? size.rows * size.cols : 48;
    return {
      error: `The spangram + words have ${total} letters in total, but the grid${size ? ` (${size.rows}x${size.cols})` : ""} has ${want} squares. Add or remove words so they match (a normal 8x6 grid = 48 letters).`,
    };
  }

  // Longest words first makes the search much faster; spangram stays first.
  const ordered = [spangram, ...[...words].sort((a, b) => b.length - a.length)];
  const seed = hashString(text);
  let paths: Cell[][] | null = null;
  for (let attempt = 0; attempt < 400 && !paths; attempt++) {
    paths = layout({
      rows: size.rows,
      cols: size.cols,
      words: ordered,
      fixed,
      rand: mulberry32(seed + attempt * 7919),
      budget: 20000,
    });
  }
  if (!paths) {
    return {
      error: fixed
        ? "Couldn't find every word in the hand-made grid (each word must be a chain of touching letters, and every letter must be used once)."
        : "Couldn't fit those words into a grid — try swapping a word or two.",
    };
  }

  const grid: string[][] = fixed ?? Array.from({ length: size.rows }, () => Array(size!.cols).fill(""));
  const solution: Record<string, Cell[]> = {};
  ordered.forEach((w, i) => {
    solution[w] = paths![i];
    if (!fixed) paths![i].forEach(([r, c], j) => (grid[r][c] = w[j]));
  });

  return {
    puzzle: {
      title: meta.title || "Strands",
      date: meta.date || "",
      author: meta.author || meta.by || "",
      theme: meta.theme || meta.clue || "Today’s theme",
      rows: size.rows,
      cols: size.cols,
      grid,
      spangram,
      words,
      solution,
    },
  };
}
