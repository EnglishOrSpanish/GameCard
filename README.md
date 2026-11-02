# GameCard

Prototype of the Karma Cards trading card game (hot-seat, two sides on one screen).

- Run: `python -m http.server 5190` then open http://localhost:5190/
- `cards.js` is generated from the card sheet: `python build_cards.py <PRL-card.xlsx>`
- Engine: `game.js` · Agni (fire) abilities: `agni.js` · board UI: `ui.js` · board image: `board.webp`
- Only the Agni element has automated abilities; other elements use stats only.
