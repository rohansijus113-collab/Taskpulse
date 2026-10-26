import { useEffect, useMemo, useState } from 'react';
import './styles.css';

const STATUS_META = {
  PENDING: { label: 'To do', tone: 'violet' },
  IN_PROGRESS: { label: 'In progress', tone: 'cyan' },
  WAITING: { label: 'Waiting', tone: 'amber' },
  COMPLETED: { label: 'Done', tone: 'mint' }
};
const NAV = [
  ['Dashboard', '◒', 'A clear read on today’s load'],
  ['Kanban Board', '▦', 'Move work without losing context'],
  ['Calendar', '□', 'Plan time, not just tasks'],
  ['Eisenhower', '⊞', 'Choose what earns attention'],
  ['Focus', '◷', 'One intentional block at a time'],
  ['Momentum', '↗', 'See the work compound']
];
const FILTERS = [
  { label: '#HighFocus', key: 'HIGH_FOCUS' },
  { label: '#LowEnergy', key: 'LOW_ENERGY' },
  { label: '#5MinWin', key: 'QUICK_WIN' },
  { label: '#Engineering', key: 'engineering' },
  { label: '#Design', key: 'design' },
  { label: '#Marketing', key: 'marketing' }
];

function formatDate(date, mode = 'short') {
  const value = new Date(date);
  if (mode === 'time') return value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (mode === 'full') return value.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  if (value.toDateString() === today.toDateString()) return `Today · ${formatDate(date, 'time')}`;
  if (value.toDateString() === tomorrow.toDateString()) return `Tomorrow · ${formatDate(date, 'time')}`;
  return value.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function parseNaturalLanguage(value) {
  const tagMatch = value.match(/#([a-z0-9-]+)/i);
  const timeMatch = value.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  const lower = value.toLowerCase();
  const due = new Date();
  if (lower.includes('tomorrow')) due.setDate(due.getDate() + 1);
  if (lower.includes('next week')) due.setDate(due.getDate() + 7);
  if (timeMatch) {
    let hour = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2] || 0);
    if (timeMatch[3]?.toLowerCase() === 'pm' && hour < 12) hour += 12;
    if (timeMatch[3]?.toLowerCase() === 'am' && hour === 12) hour = 0;
    due.setHours(hour, minutes, 0, 0);
  } else due.setHours(17, 0, 0, 0);
  const title = value
    .replace(/#([a-z0-9-]+)/ig, '')
    .replace(/\b(tomorrow|today|next week)\b/ig, '')
    .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?/ig, '')
    .replace(/\s+/g, ' ').trim();
  return { title: title || 'Untitled task', dueDate: due.toISOString(), tagName: tagMatch?.[1] || 'engineering' };
}

function IconButton({ children, label, onClick, active = false }) {
  return <button className={`icon-button ${active ? 'active' : ''}`} aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.PENDING;
  return <span className={`status-pill ${meta.tone}`}><i />{meta.label}</span>;
}

function DeleteButton({ task, onDelete, compact = false }) {
  return <button className={`delete-button ${compact ? 'compact' : ''}`} onClick={(event) => { event.stopPropagation(); if (window.confirm(`Delete “${task.title}”?`)) onDelete(task); }}>Delete</button>;
}

function TaskCard({ task, onStatus, onToggleSubtask, onDelete, compact = false }) {
  const nextStatus = task.status === 'PENDING' ? 'IN_PROGRESS' : task.status === 'IN_PROGRESS' ? 'COMPLETED' : task.status === 'WAITING' ? 'IN_PROGRESS' : 'COMPLETED';
  return <article className={`task-card ${compact ? 'compact' : ''} ${task.blocked ? 'is-blocked' : ''}`}>
    <div className="task-card-top"><StatusPill status={task.status} /><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span></div>
    <h3>{task.title}</h3>
    {!compact && <p>{task.description}</p>}
    <div className="task-meta"><span>◷ {formatDate(task.dueDate)}</span><span className={`energy ${task.energyLevel.toLowerCase()}`}>{task.energyLevel === 'HIGH_FOCUS' ? 'High focus' : task.energyLevel === 'LOW_ENERGY' ? 'Low energy' : '5 min win'}</span></div>
    {task.subtasks?.length > 0 && <div className="subtask-progress"><div className="progress-label"><span>Subtasks</span><strong>{task.progress}%</strong></div><div className="progress-track"><span style={{ width: `${task.progress}%` }} /></div><div className="subtask-list">{task.subtasks.slice(0, compact ? 2 : 4).map((subtask) => <label key={subtask.id}><input type="checkbox" checked={subtask.isCompleted} onChange={() => onToggleSubtask(subtask)} /><span className={subtask.isCompleted ? 'done-text' : ''}>{subtask.title}</span></label>)}</div></div>}
    {task.blocked && <div className="blocked-note">↳ Blocked by {task.blockedBy.join(', ')}</div>}
    <div className="task-footer"><div className="tag-row">{task.tags?.map((tag) => <span className="tag" key={tag.id}>#{tag.name}</span>)}</div><div className="task-actions"><DeleteButton task={task} onDelete={onDelete} compact />{task.status !== 'COMPLETED' && task.status !== 'WAITING' && <button className="task-action subtle" onClick={() => onStatus(task, 'WAITING')}>Wait</button>}<button className="task-action" onClick={() => onStatus(task, nextStatus)}>{task.status === 'COMPLETED' ? 'Reopen' : task.status === 'WAITING' ? 'Unblock' : 'Move →'}</button></div></div>
  </article>;
}

function Metric({ label, value, detail, tone = 'violet' }) {
  return <div className={`metric ${tone}`}><div className="metric-label">{label}<span className="metric-spark">↗</span></div><strong>{value}</strong><span className="metric-detail">{detail}</span></div>;
}

function Dashboard({ tasks, stats, nextBest, onStatus, onToggleSubtask, onDelete, setView }) {
  const today = new Date().toDateString();
  const todayTasks = tasks.filter((task) => task.status !== 'COMPLETED' && new Date(task.dueDate).toDateString() === today).slice(0, 3);
  const week = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const bars = [48, 66, 55, 80, 62, 92, 74];
  return <>
    <section className="hero-row"><div><div className="eyebrow"><span className="live-dot" /> Monday, October 26, 2026 · 09:41</div><h1>Make the next move <em>obvious.</em></h1><p className="hero-sub">You are <strong>78%</strong> through today’s load. Keep the signal, skip the noise.</p></div><div className="hero-actions"><button className="secondary-button" onClick={() => setView('Calendar')}>＋ Schedule time</button><button className="primary-button" onClick={() => setView('Kanban Board')}>Open board <span>↗</span></button></div></section>
    <section className="metric-grid"><Metric label="Open workload" value={stats.total - stats.completed} detail="across 4 lanes" tone="violet" /><Metric label="Velocity" value={`${stats.velocityCompletionRate}%`} detail="completion rate" tone="mint" /><Metric label="Time invested" value={`${stats.actualHours}h`} detail={`of ${stats.estimatedHours}h estimated`} tone="cyan" /><Metric label="Current streak" value="12 days" detail="+2 from last week" tone="amber" /></section>
    <section className="dashboard-grid"><div className="panel today-panel"><div className="panel-heading"><div><span className="section-kicker">Priority signal</span><h2>Next best task</h2></div><span className="pulse-badge">AI PICK</span></div>{nextBest ? <div className="next-best"><div className="next-icon">↗</div><div className="next-copy"><h3>{nextBest.title}</h3><p>{nextBest.description}</p><div className="next-meta"><span className="energy high_focus">{nextBest.energyLevel === 'HIGH_FOCUS' ? 'High focus' : '5 min win'}</span><span>Due {formatDate(nextBest.dueDate)}</span></div></div><button className="circle-action" onClick={() => onStatus(nextBest, 'IN_PROGRESS')}>→</button></div> : <div className="empty-state">All clear. Take the win.</div>}<div className="panel-divider" /><div className="panel-heading slim"><div><span className="section-kicker">Today</span><h2>Keep moving</h2></div><button className="text-button" onClick={() => setView('Kanban Board')}>View all</button></div><div className="mini-task-list">{todayTasks.map((task) => <div className="mini-task" key={task.id}><span className={`mini-check ${task.status === 'COMPLETED' ? 'checked' : ''}`} onClick={() => onStatus(task, task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED')}>{task.status === 'COMPLETED' ? '✓' : ''}</span><div><strong>{task.title}</strong><span>{formatDate(task.dueDate, 'time')} · {task.estimatedMinutes}m</span></div><span className="mini-priority">{task.priority === 'URGENT' ? 'Urgent' : task.priority}</span><DeleteButton task={task} onDelete={onDelete} compact /></div>)}</div></div>
      <div className="panel momentum-panel"><div className="panel-heading"><div><span className="section-kicker">Momentum / last 7 days</span><h2>Effort is compounding</h2></div><button className="icon-button">⋯</button></div><div className="chart-wrap"><div className="chart-y"><span>8h</span><span>4h</span><span>0h</span></div><div className="bar-chart">{bars.map((height, index) => <div className="bar-col" key={`${height}-${index}`}><div className="bar" style={{ height: `${height}%` }}><span>{index === 6 ? '6.2h' : ''}</span></div><span>{week[index]}</span></div>)}</div></div><div className="chart-summary"><div><strong>31.4h</strong><span>logged this week</span></div><div><strong className="mint-text">+18%</strong><span>vs last week</span></div><div><strong>4.5h</strong><span>daily average</span></div></div></div></section>
    <section className="lower-grid"><div className="panel focus-panel"><div className="panel-heading"><div><span className="section-kicker">Focus capacity</span><h2>Energy map</h2></div><button className="text-button" onClick={() => setView('Focus')}>Start focus</button></div><div className="energy-map"><div className="energy-row"><span className="energy-label">High focus</span><div className="energy-line"><span style={{ width: '72%' }} /></div><strong>72%</strong></div><div className="energy-row"><span className="energy-label">Low energy</span><div className="energy-line cyan-line"><span style={{ width: '48%' }} /></div><strong>48%</strong></div><div className="energy-row"><span className="energy-label">5 min wins</span><div className="energy-line amber-line"><span style={{ width: '86%' }} /></div><strong>86%</strong></div></div><div className="capacity-note">Your best window is <strong>10:00 – 12:00</strong>. Protect it.</div></div><div className="panel activity-panel"><div className="panel-heading"><div><span className="section-kicker">Live activity</span><h2>Workspace pulse</h2></div><span className="connection-mini">● synced</span></div><div className="activity-list"><div><span className="activity-avatar violet-avatar">AL</span><p><strong>Alex</strong> completed <b>Draft weekly progress note</b><small>8 minutes ago</small></p></div><div><span className="activity-avatar cyan-avatar">MK</span><p><strong>Mika</strong> moved <b>Review component tokens</b> to waiting<small>42 minutes ago</small></p></div><div><span className="activity-avatar amber-avatar">YO</span><p><strong>You</strong> logged 52m on <b>Publish customer proof points</b><small>1 hour ago</small></p></div></div></div></section>
  </>;
}

function Kanban({ tasks, onStatus, onToggleSubtask, onDelete, onNewTask }) {
  const statuses = ['PENDING', 'IN_PROGRESS', 'WAITING', 'COMPLETED'];
  return <section className="view-section"><div className="view-heading"><div><span className="eyebrow">Workspace / execution</span><h1>Kanban board</h1><p>Move work forward with the full context attached.</p></div><button className="primary-button" onClick={onNewTask}>＋ New task</button></div><div className="board-toolbar"><span className="result-count">{tasks.length} active signals</span><div className="board-filter"><span className="filter-dot" /> All assignees <span>⌄</span></div><div className="board-filter">This week <span>⌄</span></div></div><div className="kanban-grid">{statuses.map((status) => <div className="kanban-column" key={status}><div className="column-heading"><div><span className={`column-dot ${STATUS_META[status].tone}`} /><strong>{STATUS_META[status].label}</strong></div><span className="column-count">{tasks.filter((task) => task.status === status).length}</span></div><div className="column-cards">{tasks.filter((task) => task.status === status).map((task) => <TaskCard task={task} key={task.id} onStatus={onStatus} onToggleSubtask={onToggleSubtask} onDelete={onDelete} />)}{!tasks.some((task) => task.status === status) && <div className="column-empty">Nothing here yet.<br /><span>Drop a task in.</span></div>}</div><button className="add-column-task" onClick={onNewTask}>＋ Add task</button></div>)}</div></section>;
}

function CalendarView({ tasks, onDelete, setView }) {
  const today = new Date(2026, 9, 26);
  const monthDays = Array.from({ length: 35 }, (_, index) => index - 3);
  return <section className="view-section"><div className="view-heading"><div><span className="eyebrow">Workspace / time</span><h1>Calendar & timeline</h1><p>Give the work a place to happen.</p></div><button className="primary-button" onClick={() => setView('Focus')}>Open focus timer</button></div><div className="calendar-layout"><div className="panel calendar-panel"><div className="calendar-top"><div><span className="section-kicker">October 2026</span><h2>Monday, 26</h2></div><div className="month-arrows"><button>‹</button><button>›</button></div></div><div className="calendar-week">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-days">{monthDays.map((day) => { const valid = day > 0 && day <= 31; const selected = day === 26; const taskCount = tasks.filter((task) => valid && new Date(task.dueDate).getDate() === day).length; return <div className={`calendar-day ${valid ? '' : 'muted-day'} ${selected ? 'selected-day' : ''}`} key={day}><span>{valid ? day : ''}</span>{taskCount > 0 && <i>{taskCount}</i>}</div>; })}</div><div className="calendar-legend"><span><i className="legend-dot violet" /> Focus block</span><span><i className="legend-dot cyan" /> Review</span><span><i className="legend-dot amber" /> Due</span></div><div className="calendar-task-list">{tasks.slice(0, 5).map((task) => <div className="calendar-task-card" key={task.id}><div><strong>{task.title}</strong><small>{formatDate(task.dueDate)} · {task.estimatedMinutes}m</small></div><DeleteButton task={task} onDelete={onDelete} compact /></div>)}</div></div><div className="panel timeline-panel"><div className="panel-heading"><div><span className="section-kicker">Daily time blocks</span><h2>Monday, Oct 26</h2></div><span className="time-total">6h 20m planned</span></div><div className="timeline">{['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map((time, index) => <div className="timeline-row" key={time}><span>{time}</span><div className="timeline-slot">{index === 1 && <div className="time-block violet-block"><strong>Ship onboarding flow</strong><small>10:00 – 12:00 · Deep work</small></div>}{index === 4 && <div className="time-block cyan-block"><strong>Weekly review</strong><small>13:00 – 14:00 · Planning</small></div>}{index === 6 && <div className="time-block amber-block"><strong>Q4 launch brief</strong><small>15:00 – 17:00 · Drafting</small></div>}</div></div>)}</div></div></div></section>;
}

function Matrix({ tasks, onStatus, onDelete }) {
  const quadrants = [['DO FIRST', 'HIGH', 'HIGH'], ['SCHEDULE', 'LOW', 'HIGH'], ['DELEGATE', 'HIGH', 'LOW'], ['DROP', 'LOW', 'LOW']];
  return <section className="view-section"><div className="view-heading"><div><span className="eyebrow">Workspace / decisions</span><h1>Eisenhower matrix</h1><p>Urgency is a signal. Importance is the filter.</p></div><div className="matrix-score"><strong>2</strong><span>high leverage moves</span></div></div><div className="matrix-wrap"><div className="axis-y"><span>IMPORTANT</span></div><div className="matrix-grid">{quadrants.map(([label, urgency, importance]) => <div className={`quadrant q-${label.toLowerCase().replace(' ', '-')}`} key={label}><div className="quadrant-heading"><span>{label}</span><small>{urgency === 'HIGH' ? 'Urgent' : 'Not urgent'} · {importance === 'HIGH' ? 'Important' : 'Low impact'}</small></div>{tasks.filter((task) => task.urgency === urgency && task.importance === importance && task.status !== 'COMPLETED').slice(0, 3).map((task) => <div className="matrix-task" key={task.id}><span className="matrix-task-dot" /><div><strong>{task.title}</strong><small>{formatDate(task.dueDate)}</small></div><DeleteButton task={task} onDelete={onDelete} compact /><button onClick={() => onStatus(task, 'COMPLETED')}>✓</button></div>)}</div>)}</div><div className="axis-x"><span>URGENT</span><span>NOT URGENT</span></div></div></section>;
}

function Focus({ pomodoro, setPomodoro, timerRunning, setTimerRunning, timerMode, setTimerMode }) {
  const minutes = String(Math.floor(pomodoro / 60)).padStart(2, '0');
  const seconds = String(pomodoro % 60).padStart(2, '0');
  const circumference = 2 * Math.PI * 122;
  const offset = circumference * (1 - pomodoro / (timerMode === 'work' ? 1500 : 300));
  return <section className="view-section focus-view"><div className="view-heading"><div><span className="eyebrow">Workspace / attention</span><h1>Focus room</h1><p>Small, uninterrupted blocks turn into meaningful progress.</p></div><span className="focus-status"><span className="live-dot" /> Session ready</span></div><div className="focus-grid"><div className="panel timer-panel"><div className="timer-tabs"><button className={timerMode === 'work' ? 'selected' : ''} onClick={() => { setTimerMode('work'); setPomodoro(1500); }}>Work / 25</button><button className={timerMode === 'break' ? 'selected' : ''} onClick={() => { setTimerMode('break'); setPomodoro(300); }}>Break / 05</button></div><div className="timer-ring"><svg viewBox="0 0 280 280"><circle className="ring-bg" cx="140" cy="140" r="122" /><circle className="ring-progress" cx="140" cy="140" r="122" style={{ strokeDasharray: circumference, strokeDashoffset: offset }} /></svg><div className="timer-value"><span>{timerMode === 'work' ? 'Deep work' : 'Reset'}</span><strong>{minutes}:{seconds}</strong><small>{timerRunning ? 'In session' : 'Ready when you are'}</small></div></div><button className="timer-button" onClick={() => setTimerRunning(!timerRunning)}>{timerRunning ? 'Pause session' : 'Start session'} <span>{timerRunning ? 'Ⅱ' : '▶'}</span></button></div><div className="focus-side"><div className="panel focus-task-panel"><div className="panel-heading"><div><span className="section-kicker">Current task</span><h2>Ship onboarding flow</h2></div><span className="priority high">URGENT</span></div><p>Protect this block for the success event and invite path. You have 46 minutes left in your estimate.</p><div className="focus-task-progress"><div><span>Progress</span><strong>62%</strong></div><div className="progress-track"><span style={{ width: '62%' }} /></div></div><div className="focus-chips"><span>⌁ High focus</span><span>◷ Due today</span></div></div><div className="panel log-panel"><div className="panel-heading"><div><span className="section-kicker">Today’s log</span><h2>Time invested</h2></div><span className="log-total">2h 14m</span></div><div className="log-row"><span className="log-icon violet-avatar">P</span><div><strong>Ship onboarding flow</strong><small>10:02 – 11:16</small></div><b>74m</b></div><div className="log-row"><span className="log-icon cyan-avatar">R</span><div><strong>Review component tokens</strong><small>09:12 – 09:32</small></div><b>20m</b></div></div></div></div></section>;
}

function Momentum({ tasks, setView }) {
  const completed = tasks.filter((task) => task.status === 'COMPLETED');
  return <section className="view-section"><div className="view-heading"><div><span className="eyebrow">Workspace / reflection</span><h1>Momentum journal</h1><p>The work you finish is evidence. Keep it close.</p></div><button className="secondary-button" onClick={() => setView('Kanban Board')}>View completed work</button></div><div className="momentum-top"><div className="streak-card"><div className="streak-orbit"><span>12</span><small>days</small></div><div><span className="section-kicker">Current streak</span><h2>Quiet consistency wins.</h2><p>Best streak: 18 days · +2 this week</p></div></div><div className="xp-card"><div className="xp-heading"><span className="section-kicker">Momentum XP</span><strong>2,840 <small>/ 3,500</small></strong></div><div className="xp-track"><span style={{ width: '81%' }} /></div><p>660 XP to reach <strong>Flow state</strong></p></div></div><div className="journal-layout"><div className="panel accomplishment-panel"><div className="panel-heading"><div><span className="section-kicker">Accomplishment log</span><h2>Recently done</h2></div><span className="pulse-badge">LIVE</span></div>{completed.map((task, index) => <div className="accomplishment" key={task.id}><span className="accomplishment-check">✓</span><div><strong>{task.title}</strong><p>{index === 0 ? 'Finished with a clean handoff and a 12-minute buffer.' : 'Closed the loop and kept the workspace moving.'}</p><small>{formatDate(task.updatedAt, 'full')} · +{task.streakScore * 10} XP</small></div></div>)}</div><div className="panel journal-prompt"><span className="journal-mark">“</span><span className="section-kicker">Today’s prompt</span><h2>What became easier because you showed up?</h2><textarea placeholder="Capture one useful observation…" /><button className="primary-button">Save reflection <span>↗</span></button></div></div></section>;
}

function App() {
  const [view, setView] = useState('Dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, estimatedHours: 0, actualHours: 0, velocityCompletionRate: 0 });
  const [nextBest, setNextBest] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [nlInput, setNlInput] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [toast, setToast] = useState('');
  const [timerMode, setTimerMode] = useState('work');
  const [pomodoro, setPomodoro] = useState(1500);
  const [timerRunning, setTimerRunning] = useState(false);

  const loadData = async () => {
    try {
      const [taskResponse, statsResponse, nextResponse] = await Promise.all([fetch('/api/tasks'), fetch('/api/tasks/stats'), fetch('/api/tasks/next-best?energyLevel=HIGH_FOCUS')]);
      if (!taskResponse.ok || !statsResponse.ok || !nextResponse.ok) throw new Error('API unavailable');
      setTasks(await taskResponse.json());
      setStats(await statsResponse.json());
      setNextBest(await nextResponse.json());
    } catch (error) { setToast('Could not sync with the TaskPulse API.'); }
  };
  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (!timerRunning) return undefined; const interval = setInterval(() => setPomodoro((value) => { if (value <= 1) { setTimerRunning(false); return timerMode === 'work' ? 300 : 1500; } return value - 1; }), 1000); return () => clearInterval(interval); }, [timerRunning, timerMode]);
  useEffect(() => { if (!toast) return undefined; const timeout = setTimeout(() => setToast(''), 2600); return () => clearTimeout(timeout); }, [toast]);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const matchesSearch = !search || `${task.title} ${task.description}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = !activeFilter || task.energyLevel === activeFilter || task.tags?.some((tag) => tag.name === activeFilter);
    return matchesSearch && matchesFilter;
  }), [tasks, search, activeFilter]);

  const handleDelete = async (task) => {
    const response = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
    if (!response.ok) { setToast('Could not delete that task.'); return; }
    await loadData();
    setToast('Task deleted.');
  };
  const handleStatus = async (task, status) => {
    const response = await fetch(`/api/tasks/${task.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    const result = await response.json();
    if (!response.ok) { setToast(`Blocked: ${result.blockedBy?.join(', ') || result.error}`); return; }
    await loadData();
    setToast(status === 'COMPLETED' ? 'Task completed. Momentum +10 XP.' : `${STATUS_META[status].label} updated.`);
  };
  const handleToggleSubtask = async (subtask) => {
    const response = await fetch(`/api/subtasks/${subtask.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isCompleted: !subtask.isCompleted }) });
    if (!response.ok) return;
    setTasks((current) => current.map((task) => ({ ...task, subtasks: task.subtasks?.map((item) => item.id === subtask.id ? { ...item, isCompleted: !item.isCompleted } : item), progress: task.subtasks?.some((item) => item.id === subtask.id) ? Math.round(task.subtasks.map((item) => item.id === subtask.id ? !item.isCompleted : item.isCompleted).filter(Boolean).length / task.subtasks.length * 100) : task.progress })));
  };
  const createTask = async () => {
    if (!nlInput.trim()) return;
    const parsed = parseNaturalLanguage(nlInput);
    const response = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed) });
    if (response.ok) { setNlInput(''); setShowComposer(false); await loadData(); setToast('Task created from natural language.'); }
  };

  const renderView = () => {
    if (view === 'Dashboard') return <Dashboard tasks={filteredTasks} stats={stats} nextBest={nextBest} onStatus={handleStatus} onToggleSubtask={handleToggleSubtask} onDelete={handleDelete} setView={setView} />;
    if (view === 'Kanban Board') return <Kanban tasks={filteredTasks} onStatus={handleStatus} onToggleSubtask={handleToggleSubtask} onDelete={handleDelete} onNewTask={() => setShowComposer(true)} />;
    if (view === 'Calendar') return <CalendarView tasks={filteredTasks} onDelete={handleDelete} setView={setView} />;
    if (view === 'Eisenhower') return <Matrix tasks={filteredTasks} onStatus={handleStatus} onDelete={handleDelete} />;
    if (view === 'Focus') return <Focus pomodoro={pomodoro} setPomodoro={setPomodoro} timerRunning={timerRunning} setTimerRunning={setTimerRunning} timerMode={timerMode} setTimerMode={setTimerMode} />;
    return <Momentum tasks={filteredTasks} setView={setView} />;
  };

  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <aside className="sidebar"><div className="brand-row"><div className="brand-mark">ϟ</div><div className="brand-text"><strong>Task<span>Pulse</span></strong><small>WORKSPACE OS</small></div><IconButton label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed(!collapsed)}>{collapsed ? '›' : '‹'}</IconButton></div><div className="connection-badge"><span className="live-dot" /><div><strong>All systems operational</strong><small>DB: SQLite <b>·</b> API: Active</small></div></div><div className="side-section"><span className="side-label">MAIN NAVIGATION</span><nav>{NAV.map(([label, icon, hint]) => <button className={`nav-item ${view === label ? 'selected' : ''}`} key={label} onClick={() => setView(label)} title={hint}><span className="nav-icon">{icon}</span><span className="nav-copy"><strong>{label}</strong><small>{hint}</small></span>{view === label && <i className="nav-pulse" />}</button>)}</nav></div><div className="side-section context-section"><span className="side-label">QUICK CONTEXT</span><div className="filter-list">{FILTERS.map((filter) => <button className={`filter-chip ${activeFilter === filter.key ? 'active' : ''}`} key={filter.key} onClick={() => setActiveFilter(activeFilter === filter.key ? null : filter.key)}><span className="hash">#</span>{filter.label.replace('#', '')}</button>)}</div></div><div className="sidebar-bottom"><div className="sync-line"><span className="sync-wave">⌁</span><span>Synced 18 sec ago</span><b>⌄</b></div><div className="profile"><div className="profile-avatar">YO</div><div className="profile-copy"><strong>Yuki Okada</strong><small>Product workspace</small></div><span className="workspace-toggle">⌄</span></div></div></aside>
    <main className="main-content"><header className="topbar"><div className="breadcrumbs"><span>TaskPulse</span><b>/</b><strong>{view}</strong></div><div className="topbar-actions"><div className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks, tags, people…" /><kbd>⌘ K</kbd></div><IconButton label="Notifications">♢<i className="notification-dot" /></IconButton><button className="top-avatar">YO</button></div></header><div className="content-wrap">{renderView()}</div><button className="composer-fab" onClick={() => setShowComposer(true)}><span>＋</span><small>New task</small></button></main>
    {showComposer && <div className="modal-backdrop" onClick={() => setShowComposer(false)}><div className="composer-modal" onClick={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="section-kicker">Quick capture</span><h2>Put it in motion.</h2></div><IconButton label="Close" onClick={() => setShowComposer(false)}>×</IconButton></div><p>Use natural language. TaskPulse will extract the timing and tag.</p><div className="nl-input-wrap"><span>ϟ</span><input autoFocus value={nlInput} onChange={(event) => setNlInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && createTask()} placeholder="e.g. Submit report tomorrow at 5pm #engineering" /></div>{nlInput && <div className="parse-preview"><span>Parsed as</span><strong>{parseNaturalLanguage(nlInput).title}</strong><small>{formatDate(parseNaturalLanguage(nlInput).dueDate)} · #{parseNaturalLanguage(nlInput).tagName}</small></div>}<div className="modal-actions"><button className="secondary-button" onClick={() => setShowComposer(false)}>Cancel</button><button className="primary-button" onClick={createTask}>Create task <span>↗</span></button></div></div></div>}
    {toast && <div className="toast"><span>ϟ</span>{toast}</div>}
  </div>;
}

export default App;
