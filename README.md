# 🧠 Mind Blocks — Unlimited Strategy Puzzle
Original 8×8 block puzzle. Vanilla HTML/CSS/JS, no backend, no dependencies, works offline (service worker) and on GitHub Pages.

**Run:** open `index.html` (or host the folder on GitHub Pages — service worker needs https/localhost).
**Controls:** drag a piece onto the board, or tap a piece then tap the board. Keyboard: 1-3 select, arrows move, Enter/Space place, Z undo, H hint.

## How levels work
`level number → hash seed → difficulty d = f(level) + noise → board pattern → piece trio → validator → objective`.
Same level = same puzzle (`generateLevel(n)`), for any n. Nothing is stored per level.
* Difficulty `d = 0.82·(1−e^(−level/320)) + noise`; it drives start density, shape complexity and "decision pressure" (trios are chosen to have fewer legal placements as d grows).
* Every trio must pass `solvable()` (all 3 pieces placeable in some order, with line clears simulated; search is node-capped) and anti-repetition (recent shape sets are avoided).
* Objectives rotate score / lines / pieces; stars = fewer hints+undos.
* Progress is saved in `localStorage`; a refresh restarts the current level from its seed.
