import React, { useState } from 'react';
import { Task, Item } from '../../types';
import { ChevronLeftIcon, ChevronRightIcon } from '../Icons';

interface CalendarViewProps {
  events: Task[];
  onSelectItem: (item: Item) => void;
  onUpdateItem: (item: Item) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, onSelectItem, onUpdateItem }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropTargetDate, setDropTargetDate] = useState<Date | null>(null);

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(startOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(endOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const days = [];
  let day = new Date(startDate);

  while (day <= endDate) {
    days.push(new Date(day));
    day.setDate(day.getDate() + 1);
  }

  const isSameDay = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const changeMonth = (offset: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };
  
  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    setDraggedItemId(eventId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    setDropTargetDate(day);
  };
  
  const handleDragLeave = () => {
    setDropTargetDate(null);
  };

  const handleDrop = (e: React.DragEvent, dropDate: Date) => {
    e.preventDefault();
    if (!draggedItemId) return;

    const droppedItem = events.find(ev => ev.id === draggedItemId);
    if (droppedItem) {
      const originalDueDate = droppedItem.dueDate ? new Date(droppedItem.dueDate) : new Date();
      const newDueDate = new Date(dropDate);
      
      // Preserve original time
      newDueDate.setHours(originalDueDate.getHours());
      newDueDate.setMinutes(originalDueDate.getMinutes());
      
      const updatedItem: Task = { ...droppedItem, dueDate: newDueDate };
      onUpdateItem(updatedItem);
    }
    setDraggedItemId(null);
    setDropTargetDate(null);
  };
  
  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDropTargetDate(null);
  };

  return (
    <div className="animate-fade-in h-full flex flex-col" onDragEnd={handleDragEnd}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
        </h1>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <button onClick={() => changeMonth(-1)} className="p-2 bg-[var(--bg-tertiary)] rounded-md hover:bg-[var(--bg-quaternary)] transition-colors">
                <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] rounded-md hover:bg-[var(--bg-quaternary)] transition-colors">Today</button>
            <button onClick={() => changeMonth(1)} className="p-2 bg-[var(--bg-tertiary)] rounded-md hover:bg-[var(--bg-quaternary)] transition-colors">
                <ChevronRightIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-7 grid-rows-[auto,1fr] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)] overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center font-semibold p-3 bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] border-b border-[var(--border-color)]">{d}</div>
        ))}
        <div className="col-span-7 grid grid-cols-7 grid-rows-6 h-full">
            {days.map(d => {
            const eventsOnDay = events.filter(e => e.dueDate && isSameDay(new Date(e.dueDate), d));
            const isCurrentMonth = d.getMonth() === currentDate.getMonth();
            const isToday = isSameDay(d, new Date());
            const isDropTarget = dropTargetDate && isSameDay(d, dropTargetDate);
            return (
                <div 
                    key={d.toString()} 
                    onDragOver={(e) => handleDragOver(e, d)} 
                    onDrop={(e) => handleDrop(e, d)}
                    onDragLeave={handleDragLeave}
                    className={`p-2 flex flex-col border-r border-b border-[var(--border-color)] transition-colors ${isCurrentMonth ? '' : 'bg-[var(--bg-tertiary)]/50'} ${isDropTarget ? 'bg-[var(--color-primary-500)]/20' : ''}`}
                 >
                <span className={`text-sm font-semibold self-start mb-1.5 ${isToday ? 'bg-[var(--color-primary-500)] text-white rounded-full w-6 h-6 flex items-center justify-center' : isCurrentMonth ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                    {d.getDate()}
                </span>
                <div className="space-y-1 overflow-y-auto text-xs">
                    {eventsOnDay.map(e => (
                    <div 
                        key={e.id}
                        draggable
                        onDragStart={(ev) => handleDragStart(ev, e.id)}
                        onClick={() => onSelectItem(e)} 
                        className="bg-[var(--color-primary-600)]/30 border border-[var(--color-primary-500)]/30 text-[var(--color-primary-200)] p-1.5 rounded-md cursor-pointer truncate hover:bg-[var(--color-primary-600)]/50 hover:border-[var(--color-primary-500)]/50 transition-colors active:cursor-grabbing"
                    >
                        {e.title}
                    </div>
                    ))}
                </div>
                </div>
            );
            })}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;