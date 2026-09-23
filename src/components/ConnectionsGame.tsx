"use client";

import { useEffect, useState } from "react";
import type { ConnectionsPuzzle, ConnectionsGroup } from "@/lib/games";

const MAX_MISTAKES = 4;
const LEVEL_CLASS = ["lvl-yellow", "lvl-green", "lvl-blue", "lvl-purple"];

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ConnectionsGame({ puzzle }: { puzzle: ConnectionsPuzzle }) {
  const allWords = puzzle.groups.flatMap((g) => g.words);
  // start in a fixed order (so server + browser match), shuffle right after load
  const [order, setOrder] = useState<string[]>(allWords);
  const [selected, setSelected] = useState<string[]>([]);
  const [solved, setSolved] = useState<ConnectionsGroup[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => setOrder(shuffled(allWords)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const lost = mistakes >= MAX_MISTAKES;
  const won = solved.length === 4 && !lost;
  const over = won || lost;

  // when the game is lost, reveal every group that's left
  const shownGroups = lost
    ? [...solved, ...puzzle.groups.filter((g) => !solved.includes(g))]
    : solved;
  const remaining = order.filter((w) => !shownGroups.some((g) => g.words.includes(w)));

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  };

  const toggle = (w: string) => {
    if (over) return;
    setSelected((s) => (s.includes(w) ? s.filter((x) => x !== w) : s.length < 4 ? [...s, w] : s));
  };

  const submit = () => {
    if (selected.length !== 4 || over) return;
    const key = [...selected].sort().join("|");
    if (guesses.includes(key)) {
      flash("Already guessed!");
      return;
    }
    setGuesses((g) => [...g, key]);

    const match = puzzle.groups.find((g) => selected.every((w) => g.words.includes(w)));
    if (match) {
      setSolved((s) => [...s, match]);
      setSelected([]);
      return;
    }
    const oneAway = puzzle.groups.some((g) => selected.filter((w) => g.words.includes(w)).length === 3);
    setShake(true);
    window.setTimeout(() => setShake(false), 450);
    setMistakes((m) => m + 1);
    if (oneAway && mistakes + 1 < MAX_MISTAKES) flash("One away…");
  };

  return (
    <div className="connections">
      <p className="game-instructions">Create four groups of four!</p>

      <div className="conn-board">
        {shownGroups.map((g) => (
          <div key={g.name} className={`conn-solved ${LEVEL_CLASS[g.level]}`}>
            <div className="conn-solved-name">{g.name}</div>
            <div className="conn-solved-words">{g.words.join(", ")}</div>
          </div>
        ))}
        {remaining.length > 0 && (
          <div className="conn-grid">
            {remaining.map((w) => {
              const isSel = selected.includes(w);
              return (
                <button
                  key={w}
                  className={`conn-tile${isSel ? " selected" : ""}${isSel && shake ? " shake" : ""}`}
                  onClick={() => toggle(w)}
                  style={{ fontSize: w.length > 8 ? "clamp(10px, 2.6vw, 14px)" : undefined }}
                >
                  {w}
                </button>
              );
            })}
          </div>
        )}
        {toast && <div className="game-toast">{toast}</div>}
      </div>

      {!over && (
        <>
          <div className="conn-mistakes">
            Mistakes remaining:
            {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
              <span key={i} className={i < MAX_MISTAKES - mistakes ? "dot" : "dot used"} />
            ))}
          </div>
          <div className="game-buttons">
            <button className="pill" onClick={() => setOrder(shuffled(order))}>
              Shuffle
            </button>
            <button className="pill" onClick={() => setSelected([])} disabled={selected.length === 0}>
              Deselect All
            </button>
            <button className="pill primary" onClick={submit} disabled={selected.length !== 4}>
              Submit
            </button>
          </div>
        </>
      )}

      {over && (
        <div className="game-result">
          <h2>{won ? (mistakes === 0 ? "Perfect!" : "Great job!") : "Next time!"}</h2>
          <p>
            {won
              ? `You solved it with ${mistakes} mistake${mistakes === 1 ? "" : "s"}.`
              : "Here are the answers."}
          </p>
          <button
            className="pill"
            onClick={() => {
              setSolved([]);
              setMistakes(0);
              setGuesses([]);
              setSelected([]);
              setOrder(shuffled(allWords));
            }}
          >
            Play again
          </button>
        </div>
      )}
    </div>
  );
}
