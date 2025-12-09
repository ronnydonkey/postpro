import React, { useMemo, useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import clsx from 'clsx';
import type { Episode, Milestone, MilestoneType, CalendarEvent } from '../types';

interface CalendarViewProps {
  episodes: Episode[];
  milestones: Milestone[];
  milestoneTypes: MilestoneType[];
  calendarEvents: CalendarEvent[];
  onMilestoneClick?: (milestone: Milestone) => void;
  onDateClick?: (date: Date) => void;
}

interface DayCell {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  milestones: Milestone[];
  events: CalendarEvent[];
}

function getMilestoneColor(milestoneType: MilestoneType | undefined): string {
  if (milestoneType?.color) return milestoneType.color;
  
  const code = milestoneType?.code || '';
  if (['EC', 'DC'].includes(code)) return '#3B82F6';
  if (['SC', 'NC1', 'NC2', 'NC3'].includes(code)) return '#8B5CF6';
  if (['FPL', 'SL'].includes(code)) return '#EF4444';
  if (['MIX', 'DD1', 'DD2'].includes(code)) return '#F59E0B';
  if (['CC', 'O'].includes(code)) return '#10B981';
  if (['VFX', 'Drop'].includes(code)) return '#EC4899';
  if (['QC', 'D'].includes(code)) return '#6B7280';
  
  return '#6B7280';
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  episodes,
  milestones,
  milestoneTypes,
  calendarEvents,
  onMilestoneClick,
  onDateClick
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const milestoneTypeMap = useMemo(() => {
    return new Map(milestoneTypes.map(mt => [mt.id, mt]));
  }, [milestoneTypes]);
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const days = useMemo((): DayCell[] => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd }).map(date => {
      const dayMilestones = milestones.filter(m => 
        m.scheduledDate && isSameDay(m.scheduledDate, date)
      );
      
      const dayEvents = calendarEvents.filter(e => 
        isSameDay(e.startDate, date) || 
        (e.endDate && date >= e.startDate && date <= e.endDate)
      );
      
      return {
        date,
        isCurrentMonth: isSameMonth(date, currentMonth),
        isToday: isToday(date),
        milestones: dayMilestones,
        events: dayEvents
      };
    });
  }, [currentMonth, milestones, calendarEvents]);
  
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-500" />
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
          </div>
          
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <button
          onClick={() => setCurrentMonth(new Date())}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Today
        </button>
      </div>
      
      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-7 gap-2">
          {/* Week day headers */}
          {weekDays.map(day => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {days.map((day, idx) => (
            <div
              key={idx}
              onClick={() => onDateClick?.(day.date)}
              className={clsx(
                'min-h-[100px] border border-gray-200 rounded-lg p-2',
                'cursor-pointer transition-colors hover:bg-gray-50',
                !day.isCurrentMonth && 'bg-gray-50 opacity-50',
                day.isToday && 'ring-2 ring-blue-500 ring-offset-1'
              )}
            >
              {/* Date number */}
              <div className={clsx(
                'text-sm font-medium mb-1',
                day.isToday ? 'text-blue-600' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              )}>
                {format(day.date, 'd')}
              </div>
              
              {/* Events */}
              {day.events.length > 0 && (
                <div className="space-y-1 mb-1">
                  {day.events.map(event => (
                    <div
                      key={event.id}
                      className={clsx(
                        'text-xs px-1.5 py-0.5 rounded truncate',
                        event.eventType === 'holiday' && 'bg-amber-100 text-amber-800',
                        event.eventType === 'hold' && 'bg-red-100 text-red-800',
                        event.eventType === 'block' && 'bg-purple-100 text-purple-800',
                        event.eventType === 'note' && 'bg-blue-100 text-blue-800'
                      )}
                      title={event.name}
                    >
                      {event.name}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Milestones */}
              <div className="space-y-1">
                {day.milestones.slice(0, 3).map(milestone => {
                  const mt = milestoneTypeMap.get(milestone.milestoneTypeId);
                  const episode = episodes.find(e => e.id === milestone.episodeId);
                  const color = getMilestoneColor(mt);
                  
                  return (
                    <button
                      key={milestone.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMilestoneClick?.(milestone);
                      }}
                      className="w-full text-left text-xs px-1.5 py-0.5 rounded text-white truncate hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: color }}
                      title={`${episode?.number} ${mt?.code}: ${mt?.name}`}
                    >
                      {episode?.number} {mt?.code}
                    </button>
                  );
                })}
                {day.milestones.length > 3 && (
                  <div className="text-xs text-gray-500 px-1.5">
                    +{day.milestones.length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-3 border-t border-gray-200 bg-gray-50 text-xs">
        <span className="text-gray-500 font-medium">Legend:</span>
        {milestoneTypes.slice(0, 8).map(mt => (
          <div key={mt.id} className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: getMilestoneColor(mt) }}
            />
            <span className="text-gray-600">{mt.code}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarView;

