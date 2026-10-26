const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');

app.use(cors());
app.use(express.json());

const taskInclude = {
  subtasks: { orderBy: { id: 'asc' } },
  tags: true,
  comments: { orderBy: { createdAt: 'desc' } },
  dependencies: { include: { dependsOnTask: { select: { id: true, title: true, status: true } } } }
};

const day = (offset, hour = 17) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(hour, 0, 0, 0);
  return date;
};

async function seed() {
  if (await prisma.task.count()) return;
  const tags = {};
  for (const [name, color] of [['engineering', '#8b5cf6'], ['design', '#22d3ee'], ['marketing', '#f59e0b']]) {
    tags[name] = await prisma.tag.create({ data: { name, color } });
  }

  const tasks = await Promise.all([
    prisma.task.create({ data: { title: 'Ship onboarding flow', description: 'Tighten the new user path and make the first session feel effortless.', status: 'IN_PROGRESS', priority: 'URGENT', urgency: 'HIGH', importance: 'HIGH', energyLevel: 'HIGH_FOCUS', estimatedMinutes: 120, actualMinutes: 74, dueDate: day(0, 16), streakScore: 8, tags: { connect: [{ id: tags.engineering.id }] }, subtasks: { create: [{ title: 'Audit empty states', isCompleted: true }, { title: 'Wire success event', isCompleted: true }, { title: 'QA the invite path', isCompleted: false }] } } }),
    prisma.task.create({ data: { title: 'Finalize Q4 launch brief', description: 'Turn the latest positioning notes into a focused launch narrative.', status: 'PENDING', priority: 'HIGH', urgency: 'HIGH', importance: 'HIGH', energyLevel: 'HIGH_FOCUS', estimatedMinutes: 90, actualMinutes: 0, dueDate: day(1, 17), streakScore: 5, tags: { connect: [{ id: tags.marketing.id }] }, subtasks: { create: [{ title: 'Add audience signal', isCompleted: true }, { title: 'Write launch sequence', isCompleted: false }, { title: 'Share for review', isCompleted: false }] } } }),
    prisma.task.create({ data: { title: 'Review component tokens', description: 'Check spacing and semantic color usage before the next UI pass.', status: 'WAITING', priority: 'MEDIUM', urgency: 'LOW', importance: 'HIGH', energyLevel: 'LOW_ENERGY', estimatedMinutes: 45, actualMinutes: 20, dueDate: day(2, 12), streakScore: 3, tags: { connect: [{ id: tags.design.id }] }, subtasks: { create: [{ title: 'Compare dark surfaces', isCompleted: true }, { title: 'Flag token drift', isCompleted: false }] } } }),
    prisma.task.create({ data: { title: 'Clean up API error states', description: 'Make failures understandable in the task creation flow.', status: 'PENDING', priority: 'MEDIUM', urgency: 'LOW', importance: 'HIGH', energyLevel: 'QUICK_WIN', estimatedMinutes: 30, actualMinutes: 0, dueDate: day(0, 18), streakScore: 2, tags: { connect: [{ id: tags.engineering.id }] }, subtasks: { create: [{ title: 'Map status codes', isCompleted: false }, { title: 'Add retry copy', isCompleted: false }] } } }),
    prisma.task.create({ data: { title: 'Publish customer proof points', description: 'Pull three crisp customer quotes into the campaign workspace.', status: 'COMPLETED', priority: 'HIGH', urgency: 'HIGH', importance: 'HIGH', energyLevel: 'LOW_ENERGY', estimatedMinutes: 60, actualMinutes: 52, dueDate: day(-1, 15), streakScore: 12, tags: { connect: [{ id: tags.marketing.id }] }, subtasks: { create: [{ title: 'Select quotes', isCompleted: true }, { title: 'Format cards', isCompleted: true }] } } }),
    prisma.task.create({ data: { title: 'Sketch settings refresh', description: 'Explore a more legible hierarchy for workspace settings.', status: 'PENDING', priority: 'LOW', urgency: 'LOW', importance: 'LOW', energyLevel: 'LOW_ENERGY', estimatedMinutes: 25, actualMinutes: 0, dueDate: day(4, 14), streakScore: 1, tags: { connect: [{ id: tags.design.id }] } } }),
    prisma.task.create({ data: { title: 'Draft weekly progress note', description: 'Capture the decisions, wins, and one open question from this week.', status: 'COMPLETED', priority: 'MEDIUM', urgency: 'LOW', importance: 'HIGH', energyLevel: 'QUICK_WIN', estimatedMinutes: 20, actualMinutes: 18, dueDate: day(0, 10), streakScore: 6, tags: { connect: [{ id: tags.marketing.id }] } } }),
    prisma.task.create({ data: { title: 'Test dependency guardrails', description: 'Confirm blocked tasks cannot jump ahead of their prerequisites.', status: 'PENDING', priority: 'HIGH', urgency: 'HIGH', importance: 'HIGH', energyLevel: 'QUICK_WIN', estimatedMinutes: 35, actualMinutes: 0, dueDate: day(1, 11), streakScore: 4, tags: { connect: [{ id: tags.engineering.id }] } } })
  ]);
  await prisma.taskDependency.create({ data: { taskId: tasks[7].id, dependsOnTaskId: tasks[0].id } });
  await prisma.taskDependency.create({ data: { taskId: tasks[1].id, dependsOnTaskId: tasks[0].id } });
}

function normalizeTask(task) {
  return {
    ...task,
    dueDate: task.dueDate.toISOString(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    progress: task.subtasks.length ? Math.round(task.subtasks.filter((item) => item.isCompleted).length / task.subtasks.length * 100) : (task.status === 'COMPLETED' ? 100 : 0),
    blocked: task.dependencies.some((dependency) => dependency.dependsOnTask.status !== 'COMPLETED'),
    blockedBy: task.dependencies.filter((dependency) => dependency.dependsOnTask.status !== 'COMPLETED').map((dependency) => dependency.dependsOnTask.title)
  };
}

app.get('/api/health', (req, res) => res.json({ ok: true, db: 'SQLite', api: 'Active' }));

app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({ include: taskInclude, orderBy: [{ status: 'asc' }, { dueDate: 'asc' }] });
    res.json(tasks.map(normalizeTask));
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const body = req.body;
    const tagName = body.tagName ? body.tagName.toLowerCase().replace(/^#/, '') : null;
    let tag;
    if (tagName) tag = await prisma.tag.upsert({ where: { name: tagName }, update: {}, create: { name: tagName, color: '#8b5cf6' } });
    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description || '',
        status: body.status || 'PENDING',
        priority: body.priority || 'MEDIUM',
        urgency: body.urgency || 'LOW',
        importance: body.importance || 'HIGH',
        energyLevel: body.energyLevel || 'QUICK_WIN',
        estimatedMinutes: Number(body.estimatedMinutes) || 30,
        actualMinutes: 0,
        dueDate: body.dueDate ? new Date(body.dueDate) : day(1, 17),
        recurrence: body.recurrence || 'NONE',
        tags: tag ? { connect: [{ id: tag.id }] } : undefined,
        subtasks: body.subtasks?.length ? { create: body.subtasks.map((title) => ({ title })) } : undefined
      }, include: taskInclude
    });
    res.status(201).json(normalizeTask(task));
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const task = await prisma.task.findUnique({ where: { id }, select: { id: true, title: true } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await prisma.task.delete({ where: { id } });
    res.json({ ok: true, deletedId: id, title: task.title });
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.patch('/api/tasks/:id/status', async (req, res) => {
  const id = Number(req.params.id);
  const status = req.body.status;
  try {
    const task = await prisma.task.findUnique({ where: { id }, include: { dependencies: { include: { dependsOnTask: true } } } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (['IN_PROGRESS', 'COMPLETED'].includes(status)) {
      const blockedBy = task.dependencies.filter((dependency) => dependency.dependsOnTask.status !== 'COMPLETED').map((dependency) => dependency.dependsOnTask.title);
      if (blockedBy.length) return res.status(409).json({ error: 'Dependency not complete', blockedBy });
    }
    const updated = await prisma.task.update({ where: { id }, data: { status, actualMinutes: status === 'COMPLETED' && task.actualMinutes === 0 ? task.estimatedMinutes : task.actualMinutes }, include: taskInclude });
    res.json(normalizeTask(updated));
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const updated = await prisma.task.update({ where: { id: Number(req.params.id) }, data: req.body, include: taskInclude });
    res.json(normalizeTask(updated));
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.patch('/api/subtasks/:id', async (req, res) => {
  try {
    const subtask = await prisma.subtask.update({ where: { id: Number(req.params.id) }, data: { isCompleted: Boolean(req.body.isCompleted) } });
    res.json(subtask);
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.get('/api/tasks/stats', async (req, res) => {
  try {
    const [total, breakdown, aggregate] = await Promise.all([
      prisma.task.count(),
      prisma.task.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.task.aggregate({ _sum: { estimatedMinutes: true, actualMinutes: true } })
    ]);
    const completed = breakdown.find((row) => row.status === 'COMPLETED')?._count._all || 0;
    res.json({ total, completed, statusBreakdown: Object.fromEntries(breakdown.map((row) => [row.status, row._count._all])), velocityCompletionRate: total ? Math.round(completed / total * 100) : 0, estimatedHours: Math.round((aggregate._sum.estimatedMinutes || 0) / 60 * 10) / 10, actualHours: Math.round((aggregate._sum.actualMinutes || 0) / 60 * 10) / 10 });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/tasks/next-best', async (req, res) => {
  try {
    const energy = req.query.energyLevel;
    const tasks = await prisma.task.findMany({ where: { status: { not: 'COMPLETED' } }, include: taskInclude });
    const now = Date.now();
    const rank = (task) => {
      const hoursToDue = Math.max(0, (task.dueDate.getTime() - now) / 3600000);
      const blocked = task.dependencies.some((dependency) => dependency.dependsOnTask.status !== 'COMPLETED');
      return (energy && task.energyLevel === energy ? 40 : 0) + (task.urgency === 'HIGH' ? 26 : 0) + (task.importance === 'HIGH' ? 14 : 0) + Math.max(0, 24 - hoursToDue) + (task.priority === 'URGENT' ? 20 : task.priority === 'HIGH' ? 10 : 0) - (blocked ? 60 : 0);
    };
    tasks.sort((a, b) => rank(b) - rank(a));
    res.json(tasks[0] ? normalizeTask(tasks[0]) : null);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.use(express.static(frontendDist));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'), (error) => error && next());
});

seed().then(() => app.listen(PORT, '0.0.0.0', () => console.log(`TaskPulse API listening on ${PORT}`))).catch((error) => { console.error(error); process.exit(1); });
