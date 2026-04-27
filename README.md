# AfyaTech MamaSMS (Vanilla Frontend)

Interactive **HTML/CSS/JavaScript** platform that generates **SMS-friendly, rural-aware** maternal health replies (Kenya/Uganda), including:

- Local staple foods (ugali/posho, matooke, beans, sukuma/greens, omena/mukene)
- CHV/CHW/VHT pathway guidance
- M-Pesa-aware transport planning (Kenya)
- Cultural-respectful wording + substitutions
- Danger-sign triage and urgent referral language
- SMS segmentation + copy/export
- Local save/reset (localStorage)

## Run it

### Option A: open directly
Open `index.html` in your browser.

> Note: clipboard copy may be blocked by some browsers when opened as a local file. If that happens, use Option B.

### Option B (recommended): simple local server
If you have Python installed:

```bash
python -m http.server 5173
```

Then open `http://localhost:5173` in your browser.

## Files
- `index.html`: UI layout
- `styles.css`: modern responsive styling
- `app.js`: all interactivity + message generation logic

