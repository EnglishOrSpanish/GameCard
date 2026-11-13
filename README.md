# GameCard

Prototype of the Karma Cards trading card game (two sides on one screen).

- **Play online:** https://englishorspanish.github.io/GameCard/ (updates when `main` is pushed)
- **Rules / manual:** [RULES.md](RULES.md) (v1)
- Run locally: `python -m http.server 5190` then open http://localhost:5190/
- Engine: `game.js` · Agni (fire) abilities: `agni.js` · board UI: `ui.js` · board image: `board.webp`

## Card data (source of truth)
- **Google Sheet:** `ยังไม่ได้ใส่ลิงก์` <!-- วางลิงก์ชีตที่นี่ -->
- Before working, check the sheet first: if it changed, re-export it and regenerate `cards.js`:
  `python build_cards.py <PRL-card.xlsx>` (needs `pip install openpyxl`)
- Abilities with automation are keyed by card number (PRL-xxx), so do not reorder card ids.
