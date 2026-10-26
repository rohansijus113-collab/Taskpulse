# TaskPulse implementation plan

## Approach
TaskPulse will be a compact full-stack web app with a React/Vite frontend and an Express backend. The backend serves the built frontend in production and exposes a small REST API for tasks, analytics, and the next-best-task recommendation. Prisma will use SQLite as requested; the app seeds a useful demo dataset on first boot so the Preview is immediately meaningful. The UI is intentionally single-page with view state rather than route-heavy boilerplate, while `public/manus-routes.json` declares the root page.

## Project structure
- `backend/server.js`: Express server, Prisma client, seed data, task CRUD/status routes, stats aggregation, dependency validation, and next-best-task scoring.
- `frontend/src/App.jsx`: application shell, collapsible sidebar, dashboard/workspace views, task cards, modals, Pomodoro interaction, calendar/matrix/timeline views.
- `frontend/src/styles.css`: dark visual system, responsive layout, cards, charts, kanban, matrix, and micro-interactions.
- `prisma/schema.prisma`: SQLite datasource, Task/Subtask/TaskDependency/Tag/Comment models, enums, and indexes.
- `public/manus-routes.json`: route manifest for the SPA root.
- `package.json`: root scripts and dependencies; `npm start` runs the API/frontend together.

## Design direction
Three possible directions: Neon operations cockpit (0.07); Quiet editorial planner (0.06); Warm productivity studio (0.04). Chosen: **Neon operations cockpit**.

- **Design Movement:** Dark-mode command center with restrained cybernetic accents and editorial spacing.
- **Core Principles:** high signal over decoration; layered surfaces; fast scanning; every control exposes momentum.
- **Color Philosophy:** near-black navy backgrounds keep focus low-noise; electric violet is the ownable TaskPulse signal; mint and amber indicate progress and attention without relying on red/green alone.
- **Layout Paradigm:** fixed navigation rail plus a spacious asymmetric workspace: a compact “today” column anchors the left while the main canvas carries metrics and work queues.
- **Signature Elements:** violet pulse line motif, segmented status chips, and thin luminous borders around active surfaces.
- **Interaction Philosophy:** quick status moves, inline filters, and immediate feedback; controls feel like switches on a live system.
- **Animation:** 160–220ms ease-out transitions, gentle pulse on live indicators, count-up feel for metrics, and no distracting continuous motion.
- **Typography System:** Inter for interface copy with JetBrains Mono for metrics, tags, and timestamps; strong 12px uppercase labels and generous 28–40px display numerals.
- **Brand Essence:** a calm command center for turning scattered work into visible momentum; focused, analytical, energizing.
- **Brand Voice:** concise, operational, encouraging. Example lines: “Make the next move obvious.” “You are 78% through today’s load.”
- **Wordmark & Logo:** a compact lightning mark nested inside a rounded square, followed by the TaskPulse wordmark; the mark doubles as the live connection pulse.
- **Signature Brand Color:** Pulse violet `#8b5cf6`.

## Build workflow
Install dependencies once, run `npx prisma db push`, start the frontend/backend together, verify the API and route manifest over HTTP, then run the production build and commit the working project to the canonical remote.
