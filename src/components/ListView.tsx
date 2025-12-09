import React, { useMemo, useState } from 'react';
import { format, isPast, isToday, isFuture, differenceInDays } from 'date-fns';
import { 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar,
  ChevronRight
} from 'lucide-react';
import clsx from 'clsx';
import type { Episode, Milestone, MilestoneType, WorkItem } from '../types';

interface ListViewProps {
  episodes: Episode[];
  milestones: Milestone[];
  milestoneTypes: MilestoneType[];
  workItems: WorkItem[];
  onMilestoneClick?: (milestone: Milestone) => void;
  onWorkItemClick?: (workItem: WorkItem) => void;
}

type ViewType = 'milestones' | 'work-items' | 'all';
type SortBy = 'date' | 'episode' | 'status' | 'priority';

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

export const ListView: React.FC<ListViewProps> = ({
  episodes,
  milestones,
  milestoneTypes,
  workItems,
  onMilestoneClick,
  onWorkItemClick
}) => {
  const [viewType, setViewType] = useState<ViewType>('milestones');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const milestoneTypeMap = useMemo(() => {
    return new Map(milestoneTypes.map(mt => [mt.id, mt]));
  }, [milestoneTypes]);
  
  const episodeMap = useMemo(() => {
    return new Map(episodes.map(e => [e.id, e]));
  }, [episodes]);
  
  const sortedItems = useMemo(() => {
    let items: Array<{
      type: 'milestone' | 'work-item';
      id: string;
      episodeId: string;
      date?: Date;
      status: string;
      title: string;
      subtitle: string;
      color?: string;
      data: Milestone | WorkItem;
    }> = [];
    
    // Add milestones
    if (viewType === 'milestones' || viewType === 'all') {
      milestones.forEach(m => {
        const mt = milestoneTypeMap.get(m.milestoneTypeId);
        const episode = episodeMap.get(m.episodeId);
        
        if (filterStatus !== 'all' && m.status !== filterStatus) return;
        
        items.push({
          type: 'milestone',
          id: m.id,
          episodeId: m.episodeId,
          date: m.scheduledDate,
          status: m.status,
          title: `${episode?.number || '?'} ${mt?.code || '?'}: ${mt?.name || 'Milestone'}`,
          subtitle: episode?.title || `${episode?.director || ''} / ${episode?.editor || ''}`.trim() || '—',
          color: getMilestoneColor(mt),
          data: m
        });
      });
    }
    
    // Add work items
    if (viewType === 'work-items' || viewType === 'all') {
      workItems.forEach(w => {
        const episode = episodeMap.get(w.episodeId);
        
        if (filterStatus !== 'all' && w.status !== filterStatus) return;
        
        items.push({
          type: 'work-item',
          id: w.id,
          episodeId: w.episodeId,
          date: w.dueDate,
          status: w.status,
          title: w.workDescription,
          subtitle: `${episode?.number || '?'} - ${w.department?.name || 'General'}`,
          data: w
        });
      });
    }
    
    // Sort
    items.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return a.date.getTime() - b.date.getTime();
        
        case 'episode':
          const aEp = episodeMap.get(a.episodeId);
          const bEp = episodeMap.get(b.episodeId);
          const aNum = parseInt(aEp?.number || '0');
          const bNum = parseInt(bEp?.number || '0');
          return aNum - bNum;
        
        case 'status':
          return a.status.localeCompare(b.status);
        
        default:
          return 0;
      }
    });
    
    return items;
  }, [viewType, sortBy, filterStatus, milestones, workItems, milestoneTypeMap, episodeMap]);
  
  const getStatusIcon = (status: string, date?: Date) => {
    if (status === 'completed') {
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    }
    if (status === 'in_progress') {
      return <Clock className="w-4 h-4 text-blue-600" />;
    }
    if (date && isPast(date) && status !== 'completed') {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
    return <Calendar className="w-4 h-4 text-gray-400" />;
  };
  
  const getDateLabel = (date?: Date) => {
    if (!date) return 'No date';
    
    if (isToday(date)) return 'Today';
    if (isPast(date)) {
      const daysAgo = differenceInDays(new Date(), date);
      return `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`;
    }
    if (isFuture(date)) {
      const daysAway = differenceInDays(date, new Date());
      if (daysAway <= 7) return `In ${daysAway} day${daysAway !== 1 ? 's' : ''}`;
      return format(date, 'MMM d, yyyy');
    }
    
    return format(date, 'MMM d, yyyy');
  };
  
  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Tasks & Milestones</h2>
        
        <div className="flex items-center gap-4">
          {/* View type */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewType('milestones')}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium rounded transition-colors',
                viewType === 'milestones'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Milestones
            </button>
            <button
              onClick={() => setViewType('work-items')}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium rounded transition-colors',
                viewType === 'work-items'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Work Items
            </button>
            <button
              onClick={() => setViewType('all')}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium rounded transition-colors',
                viewType === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              All
            </button>
          </div>
          
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date">Sort by Date</option>
            <option value="episode">Sort by Episode</option>
            <option value="status">Sort by Status</option>
          </select>
          
          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* List */}
      <div className="flex-1 overflow-auto">
        <div className="divide-y divide-gray-200">
          {sortedItems.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No items found</p>
            </div>
          ) : (
            sortedItems.map(item => {
              const isOverdue = item.date && isPast(item.date) && item.status !== 'completed';
              const isItemToday = item.date && isToday(item.date);
              
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.type === 'milestone') {
                      onMilestoneClick?.(item.data as Milestone);
                    } else {
                      onWorkItemClick?.(item.data as WorkItem);
                    }
                  }}
                  className={clsx(
                    'px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors',
                    isOverdue && 'bg-red-50',
                    isItemToday && !isOverdue && 'bg-blue-50'
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Status icon */}
                    <div className="mt-0.5">
                      {getStatusIcon(item.status, item.date)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {item.color && (
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                            )}
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {item.title}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-500 truncate">
                            {item.subtitle}
                          </p>
                        </div>
                        
                        {/* Date */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className={clsx(
                            'text-sm font-medium',
                            isOverdue ? 'text-red-600' : isItemToday ? 'text-blue-600' : 'text-gray-600'
                          )}>
                            {getDateLabel(item.date)}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                      
                      {/* Status badge */}
                      <div className="mt-2">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          item.status === 'completed' && 'bg-green-100 text-green-800',
                          item.status === 'in_progress' && 'bg-blue-100 text-blue-800',
                          item.status === 'scheduled' && 'bg-gray-100 text-gray-800',
                          item.status === 'pending' && 'bg-yellow-100 text-yellow-800'
                        )}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ListView;

