# HANDOFF — The Last Recital  (⚠️ SPOILERS: Mat and Emily, don't read this)

## What it is
A static GitHub Pages app. `index.html` is the TV/host and runs the game. `play.html` is the phone controller and only renders the views the host sends it. `cards.html` is the printable sheet of 4 hidden pages.

## Architecture
- **Networking:** PeerJS, bundled locally in `lib/`, using the free public broker. The host uses the peer ID `lastrecital-v1-<ROOM>`, and the room code is saved in the laptop's localStorage. Phones connect over JSON serialization, send pings every 3 s, and reconnect on their own.
- **Game state:** all of it lives on the host (`js/game.js`, class `Game`) and is saved to localStorage, so refreshing the TV resumes the game. The host computes a separate view for each player. Answers are randomized per game from a seed (`generate()`).
- **Sound:** generated in the browser with Web Audio (`js/sound.js`); there are no audio files. Pitch detection uses autocorrelation (`js/pitch.js`). Scanning QR codes uses `jsQR`.
- **Phases:** lobby → hide → intro → seance → lock → hunt1 → melody → harmony → rhythm → hunt2 → portraits → finale → release → end.
- **Hints:** each puzzle has 2 hint tiers, then a skip. For the hunts, hints are per player and come from the whisper the hider typed in.

## Custom sounds
- `js/audiobank.js` holds the slot list. Files are loaded from IndexedDB first (added on `soundboard.html`), then from the repo's `sounds/<slot>.<ext>` (found through the GitHub contents API on github.io, or `sounds/manifest.json` as a fallback). The soundboard announces changes over the BroadcastChannel `lr-soundboard`, and the TV reloads them live.
- `tv.js` `applyMusic()` maps phases to music slots and ducks the music in the listening phases. The randomized musical sounds (music box tune, ghost hum, phone keys) are always synthesized.

## Mat's audio (v1.2)
- All 19 slots have files in `sounds/`, built by `tools/process_audio.py` from Mat's uploads. That script trims silence (−45 dB relative to peak), sets loudness targets (music −18 LUFS; title −20; ending −16; SFX −15 to −27 by role), soft-limits peaks to −1 dBTP, and encodes LAME VBR q2.
- Loop points are in `sounds/loops.json`, in seconds within the processed file. The files are cut at the loop end, and the 0.45–1.5 s before the loop end is pre-blended with the audio just before the loop start (an equal-power crossfade baked into the file). Candidates were found with `tools/find_loops.py` (feature similarity plus onset alignment) and checked visually on spectrograms. Chrome decodes these files sample-exactly, offset 0 compared with ffmpeg.
- The fizzle (sfx_reset) was a 4 s sustained sound, shortened to 1.4 s with a fade-out. The climax sting's 5.6 s silent tail was removed. The TV test sound's long tail was trimmed.

## Scene art (v1.6)
- `js/scenes.js` and `css/scenes.css` hold the SVG scenes (exterior, hallway, parlor, musicroom, attic, dawn), keyed by phase (`PHASE_SCENE`). They also hold the Eleanor ghost (`ghost(pos, ms, strength)` and `hideGhost(rise)`), transitions (`transition('ink'|'snuff', cb)`; the stage re-renders while the screen is covered), `lightning()`, `shimmer()` and `tension(0|1|2)`.
- `tv.js` `render()` drives the transitions and `stageMoments()` drives Eleanor's beats. The game's sound events trigger the visual effects. `tests/scenes_test.py` screenshots every scene and effect.

## Testing
`python3 tests/playthrough.py` plays the whole game with the TV and both phones in Playwright, using a fake PeerJS built on BroadcastChannel (`tests/fakepeer.js`). `tests/soundboard_test.py` covers the soundboard. Screenshots go to `tests/shots/`, which git ignores.

## Open items / ideas
- Optional recorded soundtrack and sound effects to replace the synthesized ones.
- More episodes: the engine could take content packs.
- Mat's notes from the first playthrough go here.
