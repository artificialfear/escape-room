# Changelog

## 2.1 — 2026-11-15
- Blackwood Hall: Mat's recorded storm. Continuous rain and rolling thunder now loop seamlessly under the music (new **Ambience** section on its soundboard, with its own volume). A big thunderclap plays when you click “Approach the house”. The storm calms at the ending.

## 2.0 — 2026-11-15
- New game: **Death at Blackwood Hall** (`blackwood.html`), a Victorian murder mystery on a stormy night. One phone is the Inspector and the other is the Doctor, each with different evidence and a casebook that builds up over the game. Every new case randomizes the killer, the weapon, the time of death and the clues. Includes printable evidence tags, its own soundboard, storm scenes (manor, library, drawing room, study), a case reconstruction, and a Scotland Yard case file with a detective rating.
- The Last Recital is unchanged apart from a small link to the new game on its join screen.

## 1.8 — 2026-11-15
- Opening: the TV starts on the sleeping house with its lights out. “Wake the house” brings thunder and a lightning flash, the windows flicker on one by one, the title music begins, and the join screen fades in.
- Ending: after the epilogue, the TV shows the evening's concert program, with each scene's time, hints (♪), skips, total performance time and a critic's star rating (Tone-Deaf Intruder → Maestro). The phones show the rating too.

## 1.7 — 2026-11-15
- Pause: a ❚❚ button on either phone (or P / the ⚙ menu on the laptop). It freezes the timer and ignores inputs, the music dims, and both screens show “The house holds its breath…” with Resume. The escape time doesn't count paused time.
- The TV page keeps the Mac's screen awake while the game is open, so the cast doesn't drop.
- iPhone: game sounds now play even with the ringer switch on silent. The audio session switches to record mode only while the mic is listening.
- Connection banners: the TV shows which phone dropped off, or that it's reconnecting to the service, after a short grace period. Phones show “Reconnecting to the TV…”. Progress is always saved.

## 1.6.1 — 2026-11-15
- Fixed fast flickering in the background art (seen on the moon). The slow camera drift now moves the art without rescaling it, which stops Chrome from redrawing the whole scene every frame. Each scene layer also gets its own SVG ids, so two scenes never share gradients during a crossfade.

## 1.6 — 2026-11-15
- Animated scene art behind every screen: the house at night (Savannah live oaks with Spanish moss), the hallway, the parlor, the music room (rain on the window), the attic (moonbeam and dust), and dawn for the ending. Includes candle flicker, drifting dust, slow camera drift and clouds.
- Eleanor appears as a ghost at story moments and with hints, then rises away at the end.
- Scene transitions: ink bleeds across the screen between places, and a candle snuffs out between scenes in the same place.
- Event effects: lightning and thunder on wrong answers, a golden shimmer when you solve something, and the edges darken as time runs low (red when you're over the hour).

## 1.5 — 2026-11-15
- Removed the test QR code from the TV's join screen. The phone's Test camera now checks against any printed page, without registering it or revealing anything.

## 1.4 — 2026-11-15
- Every QR code (the systems-check code and the printed pages) is now a link to the game. Scanning with the phone's normal camera app opens the game and registers the scan; the in-game Scan button still works too.
- If a scan opens a second tab, the old tab steps aside (“Opened in another tab”) instead of the two fighting over the connection.
- Pages printed before this update still work with the in-game Scan button.

## 1.3 — 2026-11-15
- Printable pages redesigned as torn, aged manuscript pages (parchment, stains, wax seal, handwritten lines), with tear-off “hidden by” tabs so the found page reveals nothing about who hid it.
- QR codes are larger and use high error correction, verified to scan at low resolution, with blur, and in dim light. Added an Ink saver option.

## 1.2 — 2026-11-15
- Mat's own music and sound effects are now built in (sounds/ folder). Silence is trimmed and loudness is matched across all files, and the music tracks have seamless loop points.
- Music now plays from decoded buffers, so loops are sample-accurate and gapless.
- Soundboard: a “Test loop” button that jumps to 8 s before each loop point, and “Remove all my files” to switch back to the repo sounds.

## 1.1 — 2026-11-15
- New Soundboard page (linked from the join screen): drag your own music and sound effects into 19 slots, with per-slot and master volume. Empty slots keep the built-in sounds.
- Music tracks per act, title, hiding and ending; music automatically ducks during listening moments.

## 1.0 — 2026-11-15
- First version: TV + two-phone escape room, about an hour long, with randomized puzzles, printable hidden pages, a hint/skip system, systems check, and resume after refresh.
