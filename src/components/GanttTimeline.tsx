import React, { useMemo, useRef, useState } from 'react';
import { 
  format, 
  eachDayOfInterval, 
  addWeeks, 
  isWeekend,
  isSameDay,
  isToday,
  getWeek
} from 'date-fns';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import clsx from 'clsx';
import type { Episode, Milestone, MilestoneType, CalendarEvent, DateRange } from '../types';

// ============================================================================
// Types
// ============================================================================

interface GanttTimelineProps {
  episodes: Episode[];
  milestones: Milestone[];
  milestoneTypes: MilestoneType[];
  calendarEvents: CalendarEvent[];
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onMilestoneClick?: (milestone: Milestone) => void;
  onMilestoneMove?: (milestoneId: string, newDate: Date) => void;
  onCellClick?: (episodeId: string, date: Date) => void;
}

interface DayColumn {
  date: Date;
  dayOfWeek: string;
  dayNumber: number;
  isWeekend: boolean;
  isToday: boolean;
  weekNumber: number;
  isFirstOfWeek: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getMilestoneColor(milestoneType: MilestoneType | undefined): string {
  if (milestoneType?.color) return milestoneType.color;
  
  // Default colors based on milestone category
  const code = milestoneType?.code || '';
  
  if (['EC', 'DC'].includes(code)) return '#3B82F6'; // Blue - editorial cuts
  if (['SC', 'NC1', 'NC2', 'NC3'].includes(code)) return '#8B5CF6'; // Purple - network cuts
  if (['FPL', 'SL'].includes(code)) return '#EF4444'; // Red - locks (important)
  if (['MIX', 'DD1', 'DD2'].includes(code)) return '#F59E0B'; // Amber - sound
  if (['CC', 'O'].includes(code)) return '#10B981'; // Green - finishing
  if (['VFX', 'Drop'].includes(code)) return '#EC4899'; // Pink - VFX
  if (['QC', 'D'].includes(code)) return '#6B7280'; // Gray - delivery
  
  return '#6B7280'; // Default gray
}

// ============================================================================
// Sub-components
// ============================================================================

interface MilestoneBadgeProps {
  milestone: Milestone;
  milestoneType: MilestoneType | undefined;
  onClick?: () => void;
  isDragging?: boolean;
}

const MilestoneBadge: React.FC<MilestoneBadgeProps> = ({ 
  milestone, 
  milestoneType,
  onClick,
  isDragging 
}) => {
  const color = getMilestoneColor(milestoneType);
  const code = milestoneType?.code || '?';
  
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-1.5 py-0.5 text-xs font-medium rounded',
        'transition-all duration-150',
        'hover:scale-105 hover:shadow-md',
        'focus:outline-none focus:ring-2 focus:ring-offset-1',
        isDragging && 'opacity-50 scale-95',
        milestone.status === 'completed' && 'opacity-60'
      )}
      style={{ 
        backgroundColor: color,
        color: 'white',
        boxShadow: `0 1px 2px ${color}40`
      }}
      title={`${milestoneType?.name || code}${milestone.notes ? `: ${milestone.notes}` : ''}`}
    >
      {code}
    </button>
  );
};

interface TimelineHeaderProps {
  days: DayColumn[];
  cellWidth: number;
}

const TimelineHeader: React.FC<TimelineHeaderProps> = ({ days, cellWidth }) => {
  // Group days by week for week labels
  const weeks = useMemo(() => {
    const weekMap = new Map<number, DayColumn[]>();
    days.forEach(day => {
      const existing = weekMap.get(day.weekNumber) || [];
      weekMap.set(day.weekNumber, [...existing, day]);
    });
    return Array.from(weekMap.entries());
  }, [days]);

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
      {/* Week row */}
      <div className="flex border-b border-gray-100">
        <div className="w-48 shrink-0 bg-gray-50 border-r border-gray-200" />
        <div className="flex">
          {weeks.map(([weekNum, weekDays]) => (
            <div
              key={weekNum}
              className="text-xs font-medium text-gray-500 px-2 py-1 bg-gray-50 border-r border-gray-100 text-center"
              style={{ width: weekDays.length * cellWidth }}
            >
              Week {weekNum}
            </div>
          ))}
        </div>
      </div>
      
      {/* Date row */}
      <div className="flex">
        <div className="w-48 shrink-0 bg-gray-50 border-r border-gray-200" />
        <div className="flex">
          {days.map((day) => (
            <div
              key={day.date.toISOString()}
              className={clsx(
                'text-center border-r border-gray-100 py-1',
                'text-xs',
                day.isWeekend && 'bg-gray-50',
                day.isToday && 'bg-blue-50'
              )}
              style={{ width: cellWidth }}
            >
              <div className={clsx(
                'font-medium',
                day.isToday ? 'text-blue-600' : day.isWeekend ? 'text-gray-400' : 'text-gray-600'
              )}>
                {day.dayOfWeek}
              </div>
              <div className={clsx(
                day.isToday ? 'text-blue-600' : 'text-gray-400'
              )}>
                {day.dayNumber}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface EpisodeRowProps {
  episode: Episode;
  days: DayColumn[];
  milestones: Milestone[];
  milestoneTypes: Map<string, MilestoneType>;
  calendarEvents: CalendarEvent[];
  cellWidth: number;
  onMilestoneClick?: (milestone: Milestone) => void;
  onCellClick?: (date: Date) => void;
}

const EpisodeRow: React.FC<EpisodeRowProps> = ({
  episode,
  days,
  milestones,
  milestoneTypes,
  calendarEvents,
  cellWidth,
  onMilestoneClick,
  onCellClick
}) => {
  // Group milestones by date
  const milestonesByDate = useMemo(() => {
    const map = new Map<string, Milestone[]>();
    milestones.forEach(m => {
      if (m.scheduledDate) {
        const key = format(m.scheduledDate, 'yyyy-MM-dd');
        const existing = map.get(key) || [];
        map.set(key, [...existing, m]);
      }
    });
    return map;
  }, [milestones]);

  return (
    <div className="flex border-b border-gray-100 hover:bg-gray-50/50 group">
      {/* Episode info (sticky left) */}
      <div className="w-48 shrink-0 sticky left-0 z-10 bg-white group-hover:bg-gray-50/50 border-r border-gray-200 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-gray-900">{episode.number}</span>
          {episode.title && (
            <span className="text-sm text-gray-500 truncate">{episode.title}</span>
          )}
        </div>
        <div className="flex gap-2 text-xs text-gray-400 mt-0.5">
          {episode.director && <span>{episode.director}</span>}
          {episode.editor && <span>/ {episode.editor}</span>}
        </div>
      </div>

      {/* Timeline cells */}
      <div className="flex">
        {days.map(day => {
          const dateKey = format(day.date, 'yyyy-MM-dd');
          const dayMilestones = milestonesByDate.get(dateKey) || [];
          const hasHoliday = calendarEvents.some(e => 
            e.eventType === 'holiday' && 
            isSameDay(e.startDate, day.date)
          );
          
          return (
            <div
              key={dateKey}
              className={clsx(
                'border-r border-gray-100 px-0.5 py-1',
                'min-h-[40px] flex flex-wrap items-start gap-0.5 content-start',
                'cursor-pointer hover:bg-blue-50/50 transition-colors',
                day.isWeekend && 'bg-gray-50/50',
                day.isToday && 'bg-blue-50/30',
                hasHoliday && 'bg-amber-50/50'
              )}
              style={{ width: cellWidth }}
              onClick={() => onCellClick?.(day.date)}
            >
              {dayMilestones.map(m => (
                <MilestoneBadge
                  key={m.id}
                  milestone={m}
                  milestoneType={milestoneTypes.get(m.milestoneTypeId)}
                  onClick={() => onMilestoneClick?.(m)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const GanttTimeline: React.FC<GanttTimelineProps> = ({
  episodes,
  milestones,
  milestoneTypes,
  calendarEvents,
  dateRange,
  onDateRangeChange,
  onMilestoneClick,
  onMilestoneMove: _onMilestoneMove,
  onCellClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellWidth, setCellWidth] = useState(36);

  // Build milestone type lookup
  const milestoneTypeMap = useMemo(() => {
    return new Map(milestoneTypes.map(mt => [mt.id, mt]));
  }, [milestoneTypes]);

  // Generate day columns
  const days = useMemo((): DayColumn[] => {
    return eachDayOfInterval({
      start: dateRange.start,
      end: dateRange.end
    }).map(date => ({
      date,
      dayOfWeek: format(date, 'EEE'),
      dayNumber: date.getDate(),
      isWeekend: isWeekend(date),
      isToday: isToday(date),
      weekNumber: getWeek(date),
      isFirstOfWeek: date.getDay() === 0
    }));
  }, [dateRange]);

  // Group milestones by episode
  const milestonesByEpisode = useMemo(() => {
    const map = new Map<string, Milestone[]>();
    milestones.forEach(m => {
      const existing = map.get(m.episodeId) || [];
      map.set(m.episodeId, [...existing, m]);
    });
    return map;
  }, [milestones]);

  // Navigation handlers
  const handleNavigate = (direction: 'prev' | 'next') => {
    const weeks = direction === 'next' ? 1 : -1;
    onDateRangeChange({
      start: addWeeks(dateRange.start, weeks),
      end: addWeeks(dateRange.end, weeks)
    });
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const newWidth = direction === 'in' 
      ? Math.min(cellWidth + 8, 80)
      : Math.max(cellWidth - 8, 20);
    setCellWidth(newWidth);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleNavigate('prev')}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Previous week"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[200px] text-center">
            {format(dateRange.start, 'MMM d')} – {format(dateRange.end, 'MMM d, yyyy')}
          </span>
          <button
            onClick={() => handleNavigate('next')}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Next week"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handleZoom('out')}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Zoom out"
            disabled={cellWidth <= 20}
          >
            <ZoomOut className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => handleZoom('in')}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Zoom in"
            disabled={cellWidth >= 80}
          >
            <ZoomIn className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto"
      >
        <div className="inline-block min-w-full">
          <TimelineHeader days={days} cellWidth={cellWidth} />
          
          <div>
            {episodes.map(episode => (
              <EpisodeRow
                key={episode.id}
                episode={episode}
                days={days}
                milestones={milestonesByEpisode.get(episode.id) || []}
                milestoneTypes={milestoneTypeMap}
                calendarEvents={calendarEvents}
                cellWidth={cellWidth}
                onMilestoneClick={onMilestoneClick}
                onCellClick={(date) => onCellClick?.(episode.id, date)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs">
        <span className="text-gray-500">Legend:</span>
        {milestoneTypes.slice(0, 8).map(mt => (
          <div key={mt.id} className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: getMilestoneColor(mt) }}
            />
            <span className="text-gray-600">{mt.code}</span>
          </div>
        ))}
        {milestoneTypes.length > 8 && (
          <span className="text-gray-400">+{milestoneTypes.length - 8} more</span>
        )}
      </div>
    </div>
  );
};

export default GanttTimeline;
