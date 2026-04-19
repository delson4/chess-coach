## Project: Chess Coach

A self-hosted chess web app. React + Vite frontend, Node.js + Express backend, Stockfish engine.

### Deployment

- Always commit and push directly to the **main** branch. Never create separate branches.
- After pushing, Railway auto-deploys within 30 seconds at https://my-chess-coach.up.railway.app.
- Bump the version in `src/components/Settings.jsx` whenever you make changes. **Always tell the user the new version number** so they can verify the deploy by checking Settings in the app.

### Key files

- `src/data/coaches.js` — Coach personalities and commentary templates
- `src/engine/commentary.js` — Move analysis and commentary generation
- `src/components/` — React UI components
- `src/index.css` — All styling
- `server.js` — Express server + TTS endpoint

### Rules

- Do not modify `deploy.sh`, `deploy-watcher.sh`, or `deploy.log`
- Do not change the server port (3000)
- Keep all changes in the `src/` directory unless there's a good reason not to
