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

## Testing
`python3 tests/playthrough.py` plays the whole game with the TV and both phones in Playwright, using a fake PeerJS built on BroadcastChannel (`tests/fakepeer.js`). `tests/soundboard_test.py` covers the soundboard. Screenshots go to `tests/shots/`, which git ignores.

## Open items / ideas
- Optional recorded soundtrack and sound effects to replace the synthesized ones.
- More episodes: the engine could take content packs.
- Mat's notes from the first playthrough go here.
