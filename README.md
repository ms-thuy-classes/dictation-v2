# Learn with Ms.Thúy — English Dictation Practice

A static, JSON-driven dictation practice website. No build step, no backend —
works directly on GitHub Pages.

## Folder structure

```
/
├── index.html          Homepage: search, level filter, lesson cards, pagination
├── lesson.html          Dictation practice page (?id=lessonX)
├── assets/
│   ├── css/style.css    All styling (pastel gradient + glassmorphism)
│   ├── js/main.js       Homepage logic
│   ├── js/dictation.js  Lesson page logic
│   └── audio/           Put lessonX.mp3 files here
└── data/
    ├── articles.json    Master list of lessons shown on the homepage
    └── lessonX.json     One file per lesson (title, level, audio, sentences)
```

## ⚠️ Audio files

This build ships with **sample lesson data (lesson1–lesson3) and 12 homepage
entries**, but no actual `.mp3` audio — those need to be recorded/sourced by
you and placed in `assets/audio/`. The player will simply stay silent until a
matching file exists (it fails gracefully, no error dialog).

## Adding a new lesson (no code changes needed)

1. Add the audio file to `assets/audio/`, e.g. `lesson13.mp3`.
2. Create `data/lesson13.json`:
   ```json
   {
     "title": "Your Lesson Title",
     "level": "B1",
     "audio": "lesson13.mp3",
     "sentences": [
       "First sentence.",
       "Second sentence."
     ]
   }
   ```
3. Add an entry to `data/articles.json`:
   ```json
   {
     "id": "lesson13",
     "title": "Your Lesson Title",
     "level": "B1",
     "audio": "lesson13.mp3",
     "duration": "3 phút",
     "date": "2025-08-13"
   }
   ```

That's it — the homepage and lesson page both read straight from JSON.

## Deploying to GitHub Pages

1. Push this folder's contents to a GitHub repository (e.g. `main` branch).
2. Repository → Settings → Pages → Source: `Deploy from a branch` → `main` / `root`.
3. Your site will be live at `https://<username>.github.io/<repo>/`.

No Jekyll processing is required; everything is plain HTML/CSS/JS.

## Features implemented

- Pastel gradient + glassmorphism UI, mobile-first, responsive
- Automatic dark mode (follows OS `prefers-color-scheme`)
- Search (title/keyword) + level filter (A1–C2), client-side pagination (10/page, no reload)
- Sticky audio player: play/pause, ±10s, seek bar, 0.75x–1.5x speed
- Transcript blanked into underscores (letters → `_`, punctuation/spaces preserved)
- Per-sentence hint button (reveals first letter of each word, −0.5 pts/hint)
- Check Answer: case-insensitive, ignores extra spaces, colors each sentence 🟢/🔴
- Score = correct / total × 10, minus hint penalty
- Real-time progress bar as fields are filled
- After 3 attempts, full transcript is revealed with a notice, inputs lock
- Final result card: score, correct, wrong, hints used, attempts
- Keyboard-visible focus states and reduced-motion support for accessibility

