# GameCard

Prototype of the Karma Cards trading card game (two sides on one screen).

- **Play online:** https://englishorspanish.github.io/GameCard/ (updates when `main` is pushed)
- **Rules / manual:** [RULES.md](RULES.md) (v1.2)
- Run locally: `python -m http.server 5190` then open http://localhost:5190/
- Engine: `game.js` · Agni (fire) abilities: `agni.js` · board UI: `ui.js` · board image: `board.webp`

## Card data (source of truth)
- **Google Sheet:** https://docs.google.com/spreadsheets/d/1O2I0ywL9aQdia50XVoGnaB5DwDjpNFqQuex0jDAAoy0/edit
- CSV export (no login, sheet is shared by link): https://docs.google.com/spreadsheets/d/1O2I0ywL9aQdia50XVoGnaB5DwDjpNFqQuex0jDAAoy0/export?format=csv
- Before working, check the sheet first: if it changed, re-export it and regenerate `cards.js`:
  `python build_cards.py sheet.csv` then `python categorize.py sheet.csv` (adds the 【 】 ability categories;
  it also writes `abilities-categorized.csv` to paste back into the sheet — rows marked ตรวจ need a manual check)
- Abilities with automation are keyed by card number (PRL-xxx), so do not reorder card ids.
