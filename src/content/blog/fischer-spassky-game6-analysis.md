---
title: "Revisiting Fischer vs. Spassky 1972 Game 6 — Classic Strategy Meets Modern Chess Analyzer"
description: "Move-by-move breakdown of the iconic Queen's Gambit from Reykjavik 1972, with practical tips on replaying every turning point inside Chess Analyzer."
canonical: https://chess-analysis.org/blog/fischer-spassky-game6-analysis
keywords:
  - Fischer vs Spassky analysis
  - chess analyzer
  - classic chess games
  - PGN study guide
  - Stockfish browser analysis
  - chess analysis
  - lichess analysis
  - chess analysis free
  - chess analysis board
  - free chess analysis
  - lichess analysis board
  - chess.com analysis
  - chess game analysis
  - chess board analysis
  - chess engine analysis
  - chess com analysis
  - free analysis chess
  - chess free analysis
  - analysis chess
cover: https://cacle.chess-analysis.org/img/Fischer-vs-Spassky.png
date: 2025-11-18
---

# Fischer vs. Spassky Game 6 — Classic Strategy Meets Modern Chess Analyzer

<figure>
  <video
    controls
    playsinline
    preload="metadata"
    crossorigin="anonymous"
    poster="https://cacle.chess-analysis.org/img/Fischer-vs-Spassky-Chess-Analysis.png"
    style="width:100%;border-radius:8px;display:block;border:1px solid rgba(255,255,255,0.12)"
  >
    <source src="https://cacle.chess-analysis.org/img/fischer-vs-spassky.mp4" type="video/mp4" />
    Your browser does not support the video tag.
  </video>
  <figcaption>Video: Fischer vs. Spassky Game 6 — replay and engine eval walkthrough</figcaption>
</figure>
<img src="https://cacle.chess-analysis.org/img/Fischer-vs-Spassky-Chess-Analysis.png" alt="Fischer vs. Spassky Game 6 — midgame squeeze on the c-file" crossorigin="anonymous" style="margin-top:16px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);display:block;width:100%;" />

The sixth game of the 1972 World Championship in Reykjavik is a model of strategic clarity. Bobby Fischer switched to 1.c4 and slowly squeezed Boris Spassky in a Queen's Gambit structure. In this post we revisit the full PGN (see `src/content/blog/fischer-vs-spassky-1972-game6.pgn`) and show how to dissect it with Chess Analyzer: a browser-based Stockfish board that runs locally and keeps every step private.

Below you will find the key moments, the ideas behind them, and practical instructions on reproducing the evaluation swings with our Analyzer. If you're familiar with **chess analysis** using lichess or chess.com tools, this guide shows how to run an equally powerful, **free chess analysis** session on our **chess analysis board**. Everything is powered by the same **chess engine analysis** (Stockfish 17) but runs directly in your browser; you get the convenience of a **lichess analysis board** or **chess com analysis** workflow combined with the privacy of local compute.

> **Download the PGN**  
> Want to replay it yourself? Grab the same PGN we used here: <a href="https://cacle.chess-analysis.org/png/fischer-vs-spassky-1972-game6.pgn" target="_blank" rel="noopener noreferrer">Download Fischer vs. Spassky 1972 Game 6</a>.  
> After downloading, open Chess Analyzer → Load Game → *Upload PGN File* to start analyzing.

## 1. Setting the Structure (Moves 1–10)

- **What happens**: Fischer heads for a Symmetrical English that transposes to the Queen's Gambit Declined. After the sequence `1.c4 e6 2.Nf3 d5 3.d4 Nf6 4.Nc3 Be7`, both players castle and Spassky strikes with `...b6` to fianchetto his bishop.
- **Use Analyzer**: Paste the PGN, hit *Analyze*, and enable Multi-PV set to 3. Stockfish will confirm that the position around move 10 is roughly equal (±0.10). This equilibrium matters—every later advantage stems from minor improvements, not tactics. If you normally rely on **chess.com analysis** or **lichess analysis**, you’ll notice the same evaluation curve here—only now the entire **chess game analysis** stays on your device.

## 2. The Roaming Queen (Moves 11–16)

- **Turning point**: Fischer plays `11.Rc1 Be6 12.Qa4 c5 13.Qa3`, rerouting the queen to pressure c5 and the long diagonal. Spassky replies with `13...Rc8 14.Bb5 a6 15.dxc5`. The capture on c5 fixes Black's queenside pawns on dark squares.
- **Why it matters**: In Analyzer, drag the timeline to move 15 and open the eval graph. The engine jumps from equality to about +0.40 for White after `15.dxc5 bxc5 16.O-O Ra7` because Black's c5 pawn becomes a permanent weakness.

## 3. Exploiting the c-file (Moves 17–23)

- **Sequence**: `17.Be2 Nd7 18.Nd4 Qf8 19.Nxe6 fxe6 20.e4 d4 21.f4`. Fischer transfers pieces to d5/f4 and clamps d5.
- **Analyzer tip**: Use the Move List tab to add arrows (hotkey `A`) when you replay `Nd4–e6`. Stockfish shows the evaluation creeping to around +0.60; note how every variation highlights d5 as an outpost for White's minor pieces. This is classic **chess board analysis**: lock a weakness, highlight it with arrows, and compare variations like you would on any high-end **chess analysis board**.

![Fischer vs. Spassky Game 6 — midgame squeeze on the c-file](https://cacle.chess-analysis.org/img/Fischer-vs-Spassky-Chess-Analysis.png)

## 4. Kingside Expansion and the e-file Break (Moves 24–31)

- **Critical idea**: `24.Qh3 Nf8 25.b3 a5 26.f5 exf5 27.Rxf5 Nh7 28.Rcf1 Qd8 29.Qg3 Re7 30.h4 Rbb7 31.e6!`
- **Analysis**: The sacrifice `31.e6` opens the e-file and traps Black's king. Run *Analyze Again* from move 30: Multi-PV shows that declining the pawn with `...Qe8` still leads to a +1.5 evaluation for White. Highlight the line by pinning it in Engine Lines so you can revisit the tactical justification.

## 5. Convert With Accuracy (Moves 32–41)

- **Closing sequence**: After `31...Rbc7 32.Qe5 Qe8 33.a4 Qd8 34.R1f2 Qe8 35.R2f3 Qd8`, Fischer keeps the tension, then coordinates rooks and bishop: `37.Qe4 Nf6 38.Rxf6 gxf6 39.Rxf6 Kg8 40.Bc4 Kh8 41.Qf4`.
- **Evaluator view**: Use Analyzer's eval bar to notice the spike to +3 after `38.Rxf6`. The rook sacrifice removes Black's only defender. Toggle *Play vs Engine* from this position (depth limited) to practice the finishing technique: see how any materialistic capture by Black collapses under `Qf4`.

## Step-by-Step Replay Checklist

1. **Load the PGN**: Click *Load Game* → paste the PGN block above → *Analyze This Game*. The Analyzer stores it locally; no account needed.
2. **Mark key moves**: Use the Move List to drop bookmarks on moves 15, 21, 31, and 38. Bookmarks appear in the Records panel for future study.
3. **Compare branches**: In Engine Lines, right-click the primary line to pin it. Then try alternative defenses (`30...Nf8`, `31...Qe8`, etc.) and watch how the eval changes. The Multi-PV values quantify why Fischer's ideas were airtight. This is the workflow for **analysis chess**: spin through **free analysis chess** variations, label the best candidate, and keep your prep portable.
4. **Save and share**: Hit *Analyze Again* once you have annotations to refresh the evals, then click *Export PGN* → your notes plus Stockfish verdicts stay in the PGN file.

## Lessons From Game 6

- **Structural patience pays**: The early queen maneuver looked slow but targeted long-term weaknesses. Analyzer's eval graph demonstrates gradual gains rather than sudden jumps.
- **Timing the pawn break**: `31.e6` is only possible because every white piece already pointed at e6/d5. Use the engine to verify if the break works a move earlier—it doesn’t, underscoring Fischer’s restraint.
- **Keep conversions reproducible**: Practicing the final tactics with *Play vs Engine* turns passive learning into active drilling. Restart from move 38 until you can execute `Rxf6` without peeking at hints. Think of it as continuous **chess engine analysis** that doubles as tactical sparring.

## Try It Yourself

1. Import your favorite classic PGN and replicate the workflow above.
2. Use Position Explorer to compare Fischer’s setup with modern Queen’s Gambit Declined theory.
3. Save variations into Records so you can revisit them before your next tournament. Whether you call it **chess free analysis**, **free chess analysis**, or simply chasing better **analysis chess**, the objective is the same: capture the insights, keep them portable, and integrate them into everyday prep.

Chess Analyzer bridges historic insight with modern tooling: every instructive moment from Fischer–Spassky Game 6 is just a bookmark, eval spike, or sparring session away. Paste the PGN, explore the lines, and let Stockfish in your browser explain why this masterpiece still teaches new lessons.
