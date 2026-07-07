# Sync Checklist (Home PC ⇄ Work PC)

Read this before you touch the code. Two machines + two AI assistants only works if you follow this every time.

## Before you stop working (either machine)

1. Save all your files.
2. Run:
   ```
   git add -A
   git commit -m "describe what you just did"
   git push
   ```
3. Confirm it says `Everything up-to-date` or shows your push succeeded. If it errors, stop and ask Claude/ChatGPT to help before closing your laptop.

**Never leave a session with uncommitted changes if you're about to switch machines.** That's the #1 cause of the mess we just cleaned up.

## Before you start working (either machine)

1. Run:
   ```
   git pull
   ```
2. If it says `Already up to date`, you're good.
3. If it says `Fast-forward` or lists new commits, read what changed (or ask your AI assistant to summarize it) before diving in.
4. If it errors about local changes or untracked files being overwritten — **stop**. That means step 1 (the "before you stop" checklist) got skipped somewhere. Ask for help rather than forcing it.

## Golden rules

- **One machine "active" at a time.** Don't have Claude editing on the home PC and ChatGPT editing on the work PC in the same window of time — finish and push one side before starting the other.
- **Commit often, in small chunks.** A commit after every small working change is much easier to untangle than one giant pile of uncommitted edits.
- **If GitHub Desktop is open, close it before an AI assistant runs git commands for you.** Having both touch the repo at once is what caused the file-lock corruption we just fixed.
- **Don't panic if a pull/merge fails.** It almost always means uncommitted work is in the way, not that anything is broken. Stop and ask before running anything that says "force" or "hard reset" — those are safe in the right hands but can discard work if used wrong.

## How does Claude on the other machine know what we did?

Claude has no memory between machines or sessions — it only knows what's sitting in the files it can see. So:

- **Code changes carry over automatically once you push + pull.** Claude on the other machine just reads the current files — it doesn't need to "hear about" what happened, the file *is* what happened.
- **Anything stored in your browser (localStorage) does NOT carry over.** The Popcycle map's Edit Positions data (dragged markers, custom dots, drawn outlines) lives in your browser, not in git. If you want that data on the other machine, use the **Export Positions** button on the map to download a JSON file, then send/paste it back to Claude so it can be baked into `popcycleareamapdata.js` permanently.
- **For "why" context** (not just "what changed"), check the entry below or just tell the new Claude session one sentence about what you were doing — it'll read the actual code to fill in the rest.

## Recent work log

- **2026-07-06:** Popcycle "Focused Area" map was broken live (missing image files). Replaced with a single overview map (`gta5map2-1600.jpg`) with real coordinate-based pin positions for all areas, plus an "Edit Positions" mode: drag markers, add custom-named dots, draw a polygon outline highlight per schedule, auto-zoom on selection. All of this is in `public/js/popcycle/popcycleareamap.js`, `public/data/popcycleareamapdata.js`, and `public/data/popcyclevisualmapconfig.js`. Still needs live testing.

## If something looks wrong

Paste the exact error message to Claude or ChatGPT rather than guessing. Git errors are precise — the real fix is almost always obvious once someone reads the actual message.
