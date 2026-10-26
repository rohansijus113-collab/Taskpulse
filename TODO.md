# TaskPulse outcome checklist

## 1. Full-stack foundation and SQLite persistence
- [x] The project uses React for the frontend, Express/Node.js for the backend, Prisma ORM, and SQLite with `provider = "sqlite"`.
- [x] The root `package.json` provides `npm start` to run backend Port 5000 and frontend Port 3000 together via `concurrently`.
- [x] `prisma/schema.prisma` includes Task, Subtask, TaskDependency, Tag, and Comment models; Task includes id, title, description, status (PENDING, IN_PROGRESS, WAITING, COMPLETED), priority (LOW, MEDIUM, HIGH, URGENT), urgency (LOW, HIGH), importance (LOW, HIGH), energyLevel (HIGH_FOCUS, LOW_ENERGY, QUICK_WIN), estimatedMinutes, actualMinutes, dueDate, recurrence, streakScore, createdAt, and updatedAt; indexes exist on status, dueDate, and priority.

## 2. TaskPulse navigation shell and dashboard
- [x] A fixed collapsible sidebar uses the #090d16 dark theme, shows the ⚡ TaskPulse logo, and includes a dynamic “DB: SQLite / API: Active” connection badge.
- [x] Main navigation exposes Dashboard & Metrics, Kanban Board, Calendar & Timeline Scheduler, Eisenhower Matrix, Focus & Pomodoro, and Momentum & Journal.
- [x] Quick context filters expose #HighFocus, #LowEnergy, #5MinWin, #Engineering, #Design, and #Marketing; the footer shows a user profile avatar and workspace toggle indicator.
- [x] Dashboard provides overview metrics, live counters, and stats analytics with estimated-vs-actual time and completion/velocity signals.

## 3. Task operations and smart planning
- [x] Kanban exposes To Do, In Progress, Waiting, and Done columns with quick status moves, including a Waiting action.
- [x] Task creation accepts natural language such as “Submit report tomorrow at 5pm #engineering” and extracts title, due date/time, and category tag.
- [x] Task cards show nested subtask checklists, progress bars, dependency/blocking warnings, energy, priority, and due-time context.
- [x] `GET /api/tasks/stats` returns total tasks, status breakdowns, velocity completion rate, and estimated-vs-actual hours using Prisma aggregation operations.
- [x] Dependency validation prevents moving a task to IN_PROGRESS or COMPLETED when a dependency is not yet COMPLETED.
- [x] `GET /api/tasks/next-best` returns a single suggested task based on energy level, urgency, deadline proximity, priority, importance, and blocked state.

## 4. Planning workspaces
- [x] Calendar & Timeline shows a monthly calendar view and daily time-blocking grid.
- [x] Eisenhower Matrix shows a 2x2 urgency-vs-importance quadrant grid.
- [x] Focus & Pomodoro provides a 25-minute work / 5-minute break timer and time-tracking log interaction.
- [x] Momentum & Journal shows streaks, XP milestones, and a Done accomplishment log.

## 5. Runtime and delivery
- [x] Setup runs non-interactively with `npx prisma db push` and the application starts cleanly in one pass.
- [x] `GET /manus-routes.json` serves the synchronized SPA route manifest.
- [x] Production build passes with `npm run build`; Preview renders the dashboard with the fixed sidebar, metrics, task panels, chart, energy map, and activity feed.

## 6. Task deletion controls
- [x] `DELETE /api/tasks/:id` deletes an existing task and returns a JSON confirmation; missing tasks return a 404 error.
- [x] Every task-bearing surface exposes an explicit red Delete button: Kanban task cards, Dashboard list items, Calendar task cards, and Eisenhower matrix items.
- [x] Delete actions stop event propagation, confirm the task title before deletion, refresh tasks/stats/next-best data, and show a completion or error toast.
