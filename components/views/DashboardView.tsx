import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Task, Note, Item, ViewType, Widget, WidgetType } from '../../types';
import { getQuoteOfTheDay } from '../../services/geminiService';
import { 
  ClipboardCheckIcon, DocumentTextIcon, ChevronRightIcon,
  ListBulletIcon, CheckBadgeIcon, ExclamationTriangleIcon, ChartPieIcon,
  PlusIcon, XMarkIcon, ClockIcon, CalendarDaysIcon, PlayIcon, ArrowPathIcon
} from '../Icons';

interface DashboardViewProps {
  tasks: Task[];
  notes: Note[];
  statuses: string[];
  widgets: Widget[];
  onSelectItem: (item: Item) => void;
  onSelectNote: (note: Note) => void;
  onViewChange: (view: ViewType) => void;
  onAddWidget: (type: WidgetType) => void;
  onRemoveWidget: (id: string) => void;
}

// WIDGETS
const WidgetWrapper: React.FC<{ title: string; children: React.ReactNode; onRemove: () => void; className?: string }> = ({ title, children, onRemove, className = '' }) => (
    <div className={`bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)] flex flex-col ${className}`}>
        <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
            <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
            <button onClick={onRemove} title="Remove widget" className="p-1 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-full">
                <XMarkIcon className="w-4 h-4" />
            </button>
        </div>
        <div className="p-4 flex-1">{children}</div>
    </div>
);

const TaskStatsWidget: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);
    const completedThisWeek = tasks.filter(t => t.status === 'Done' && t.dueDate && new Date(t.dueDate) >= oneWeekAgo).length;
    const overdueTasks = tasks.filter(t => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < today).length;
    return (
        <div className="grid grid-cols-3 gap-4">
            <div className="text-center"><p className="text-2xl font-bold">{tasks.length}</p><p className="text-xs text-[var(--text-muted)]">Total Tasks</p></div>
            <div className="text-center"><p className="text-2xl font-bold">{completedThisWeek}</p><p className="text-xs text-[var(--text-muted)]">Completed (Week)</p></div>
            <div className="text-center"><p className="text-2xl font-bold">{overdueTasks}</p><p className="text-xs text-[var(--text-muted)]">Overdue</p></div>
        </div>
    );
};

const StatusChartWidget: React.FC<{ tasks: Task[]; statuses: string[] }> = ({ tasks, statuses }) => {
    const statusCounts = statuses.map(status => ({ name: status, count: tasks.filter(t => t.status === status).length }));
    const totalTasks = tasks.length;
    const chartColors = ['#38bdf8', '#fbbf24', '#34d399', '#f87171', '#a78bfa', '#fb923c'];
    let cumulativePercent = 0;
    const gradients = statusCounts.map((status, index) => {
        if (totalTasks === 0) return '';
        const percent = (status.count / totalTasks) * 100;
        const start = cumulativePercent;
        cumulativePercent += percent;
        return `${chartColors[index % chartColors.length]} ${start}% ${cumulativePercent}%`;
    }).filter(Boolean);
  
    return totalTasks > 0 ? (
        <div className="flex gap-4 items-center h-full">
            <div className="w-24 h-24 rounded-full flex-shrink-0" style={{ background: `conic-gradient(${gradients.join(', ')})` }} />
            <ul className="space-y-1 text-sm flex-1">
                {statusCounts.map((s, i) => <li key={s.name} className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors[i % chartColors.length] }}></span><span className="text-[var(--text-secondary)]">{s.name}</span></div><span className="font-semibold">{s.count}</span></li>)}
            </ul>
        </div>
    ) : <p className="text-center text-sm text-[var(--text-muted)] h-full flex items-center justify-center">No task data.</p>;
};

const UpcomingTasksWidget: React.FC<{ tasks: Task[], onSelectItem: (item: Item) => void, onViewChange: (v: ViewType) => void }> = ({ tasks, onSelectItem, onViewChange }) => {
    const upcoming = tasks.filter(t => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) >= new Date()).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()).slice(0, 3);
    return upcoming.length > 0 ? (
        <ul className="space-y-2">
            {upcoming.map(task => <li key={task.id} onClick={() => onSelectItem(task)} className="p-2 bg-[var(--bg-tertiary)] rounded-md cursor-pointer hover:bg-[var(--bg-quaternary)]"><p className="font-medium text-sm">{task.title}</p><p className="text-xs text-[var(--text-muted)]">{new Date(task.dueDate!).toLocaleDateString()}</p></li>)}
        </ul>
    ) : <p className="text-center text-sm text-[var(--text-muted)] h-full flex items-center justify-center">No upcoming tasks.</p>;
};

const RecentNotesWidget: React.FC<{ notes: Note[], onSelectNote: (note: Note) => void, onViewChange: (v: ViewType) => void }> = ({ notes, onSelectNote }) => {
    const recent = notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3);
    return recent.length > 0 ? (
        <ul className="space-y-2">
            {recent.map(note => <li key={note.id} onClick={() => onSelectNote(note)} className="p-2 bg-[var(--bg-tertiary)] rounded-md cursor-pointer hover:bg-[var(--bg-quaternary)]"><p className="font-medium text-sm truncate">{note.title}</p><p className="text-xs text-[var(--text-muted)] truncate">{note.content || 'No content'}</p></li>)}
        </ul>
    ) : <p className="text-center text-sm text-[var(--text-muted)] h-full flex items-center justify-center">No recent notes.</p>;
};

const PomodoroWidget: React.FC = () => {
    const [minutes, setMinutes] = useState(25);
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let interval: number | null = null;
        if (isActive) {
            interval = window.setInterval(() => {
                if (seconds > 0) setSeconds(s => s - 1);
                else if (minutes > 0) { setMinutes(m => m - 1); setSeconds(59); } 
                else { setIsActive(false); new Notification("Pomodoro timer finished!"); }
            }, 1000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [isActive, seconds, minutes]);

    const resetTimer = () => { setIsActive(false); setMinutes(25); setSeconds(0); };

    return <div className="flex flex-col items-center justify-center h-full"><p className="text-5xl font-bold font-mono">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</p><div className="flex gap-2 mt-4"><button onClick={() => setIsActive(!isActive)} className="px-3 py-1 bg-[var(--bg-tertiary)] text-sm font-semibold rounded-md">{isActive ? 'Pause' : 'Start'}</button><button onClick={resetTimer} className="px-3 py-1 bg-[var(--bg-tertiary)] text-sm font-semibold rounded-md">Reset</button></div></div>;
};

const QuoteWidget: React.FC = () => {
    const [quote, setQuote] = useState<{ quote: string; author: string } | null>(null);
    useEffect(() => { getQuoteOfTheDay().then(setQuote); }, []);
    return quote ? <div className="h-full flex flex-col justify-center"><blockquote>"{quote.quote}"</blockquote><cite className="text-right block mt-2 text-sm text-[var(--text-muted)]">- {quote.author}</cite></div> : <p className="text-center text-sm text-[var(--text-muted)] h-full flex items-center justify-center">Loading quote...</p>;
};

const TaskStreakWidget: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
    const streak = useMemo(() => {
        const completedDates = new Set(tasks.filter(t => t.status === 'Done' && t.dueDate).map(t => new Date(t.dueDate!).toDateString()));
        if (completedDates.size === 0) return 0;
        let currentStreak = 0;
        let checkDate = new Date();
        while (completedDates.has(checkDate.toDateString())) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
        return currentStreak;
    }, [tasks]);
    return <div className="flex flex-col items-center justify-center h-full"><p className="text-5xl font-bold">{streak}</p><p className="mt-2 text-sm text-[var(--text-muted)]">Day Streak</p></div>;
};

const widgetComponents: Record<WidgetType, React.FC<any>> = {
    task_stats: TaskStatsWidget,
    status_chart: StatusChartWidget,
    upcoming_tasks: UpcomingTasksWidget,
    recent_notes: RecentNotesWidget,
    pomodoro: PomodoroWidget,
    quote: QuoteWidget,
    streak: TaskStreakWidget,
    completion_chart: () => <p>Completion Chart coming soon</p> // Placeholder
};
const widgetMeta: Record<WidgetType, { title: string, icon: React.ElementType, defaultSpan: string }> = {
    task_stats: { title: "Task Stats", icon: CheckBadgeIcon, defaultSpan: 'col-span-3' },
    status_chart: { title: "Status Distribution", icon: ChartPieIcon, defaultSpan: 'col-span-3' },
    upcoming_tasks: { title: "Upcoming", icon: ClipboardCheckIcon, defaultSpan: 'col-span-2' },
    recent_notes: { title: "Recent Notes", icon: DocumentTextIcon, defaultSpan: 'col-span-2' },
    pomodoro: { title: "Pomodoro Timer", icon: ClockIcon, defaultSpan: 'col-span-2' },
    quote: { title: "Quote of the Day", icon: DocumentTextIcon, defaultSpan: 'col-span-2' },
    streak: { title: "Task Streak", icon: CalendarDaysIcon, defaultSpan: 'col-span-2' },
    completion_chart: { title: "Completion Trend", icon: ChartPieIcon, defaultSpan: 'col-span-3' },
};

const AddWidgetPanel: React.FC<{ onAddWidget: (type: WidgetType) => void, currentWidgets: Widget[] }> = ({ onAddWidget, currentWidgets }) => {
    const availableWidgets = Object.keys(widgetMeta).filter(type => !currentWidgets.some(w => w.type === type)) as WidgetType[];
    return <div className="p-4"><h3 className="font-semibold text-[var(--text-primary)] mb-2">Add a Widget</h3><div className="grid grid-cols-2 gap-2">{availableWidgets.map(type => <button key={type} onClick={() => onAddWidget(type)} className="flex items-center gap-2 p-2 bg-[var(--bg-tertiary)] rounded-md hover:bg-[var(--bg-quaternary)] text-sm"><widgetMeta[type].icon className="w-4 h-4 text-[var(--color-primary-400)]" /> {widgetMeta[type].title}</button>)}</div></div>;
};

const DashboardView: React.FC<DashboardViewProps> = ({ tasks, notes, statuses, widgets, onSelectItem, onSelectNote, onViewChange, onAddWidget, onRemoveWidget }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };
  
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold mb-1 text-[var(--text-primary)]">{getGreeting()}!</h1>
            <p className="text-[var(--text-secondary)]">Here's your productivity pulse.</p>
        </div>
        {/* Future: Add layout customization button here */}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        {widgets.map(widget => {
            const WidgetComponent = widgetComponents[widget.type];
            const meta = widgetMeta[widget.type];
            return (
                <div key={widget.id} className={meta.defaultSpan}>
                    <WidgetWrapper title={meta.title} onRemove={() => onRemoveWidget(widget.id)}>
                        <WidgetComponent 
                            tasks={tasks} 
                            notes={notes} 
                            statuses={statuses} 
                            onSelectItem={onSelectItem}
                            onSelectNote={onSelectNote}
                            onViewChange={onViewChange}
                        />
                    </WidgetWrapper>
                </div>
            );
        })}
         <div className="col-span-full">
            <AddWidgetPanel onAddWidget={onAddWidget} currentWidgets={widgets} />
         </div>
      </div>
    </div>
  );
};

export default DashboardView;
