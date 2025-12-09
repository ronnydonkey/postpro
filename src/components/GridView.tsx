import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import type { Episode, Milestone, MilestoneType } from '../types';

interface GridViewProps {
  episodes: Episode[];
  milestones: Milestone[];
  milestoneTypes: MilestoneType[];
  onMilestoneClick?: (milestone: Milestone) => void;
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

export const GridView: React.FC<GridViewProps> = ({
  episodes,
  milestones,
  milestoneTypes,
  onMilestoneClick
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedEpisodes, setExpandedEpisodes] = useState<Set<string>>(new Set());
  
  const milestoneTypeMap = useMemo(() => {
    return new Map(milestoneTypes.map(mt => [mt.id, mt]));
  }, [milestoneTypes]);
  
  const sortedMilestoneTypes = useMemo(() => {
    return [...milestoneTypes].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [milestoneTypes]);
  
  const sortedEpisodes = useMemo(() => {
    return [...episodes].sort((a, b) => {
      const aNum = parseInt(a.number) || 0;
      const bNum = parseInt(b.number) || 0;
      return aNum - bNum;
    });
  }, [episodes]);
  
  const toggleEpisode = (episodeId: string) => {
    setExpandedEpisodes(prev => {
      const next = new Set(prev);
      if (next.has(episodeId)) {
        next.delete(episodeId);
      } else {
        next.add(episodeId);
      }
      return next;
    });
  };
  
  const getMilestoneForEpisode = (episodeId: string, milestoneTypeId: string): Milestone | undefined => {
    return milestones.find(m => 
      m.episodeId === episodeId && m.milestoneTypeId === milestoneTypeId
    );
  };
  
  const getStatusCounts = useMemo(() => {
    const counts = {
      scheduled: 0,
      in_progress: 0,
      completed: 0,
      skipped: 0
    };
    
    milestones.forEach(m => {
      if (m.status === 'scheduled') counts.scheduled++;
      else if (m.status === 'in_progress') counts.in_progress++;
      else if (m.status === 'completed') counts.completed++;
      else if (m.status === 'skipped') counts.skipped++;
    });
    
    return counts;
  }, [milestones]);
  
  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Milestone Grid</h2>
        
        <div className="flex items-center gap-4">
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled ({getStatusCounts.scheduled})</option>
              <option value="in_progress">In Progress ({getStatusCounts.in_progress})</option>
              <option value="completed">Completed ({getStatusCounts.completed})</option>
              <option value="skipped">Skipped ({getStatusCounts.skipped})</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="inline-block min-w-full">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Episode
                </th>
                {sortedMilestoneTypes.map(mt => (
                  <th
                    key={mt.id}
                    className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span>{mt.code}</span>
                      <span className="text-[10px] text-gray-400 font-normal">{mt.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedEpisodes.map(episode => {
                const isExpanded = expandedEpisodes.has(episode.id);
                const episodeMilestones = milestones.filter(m => m.episodeId === episode.id);
                const hasCompleted = episodeMilestones.some(m => m.status === 'completed');
                const hasInProgress = episodeMilestones.some(m => m.status === 'in_progress');
                
                return (
                  <React.Fragment key={episode.id}>
                    <tr 
                      className={clsx(
                        'hover:bg-gray-50 cursor-pointer transition-colors',
                        isExpanded && 'bg-blue-50'
                      )}
                      onClick={() => toggleEpisode(episode.id)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {episode.number}
                            </div>
                            <div className="text-xs text-gray-500">
                              {episode.director && episode.editor 
                                ? `${episode.director} / ${episode.editor}`
                                : episode.director || episode.editor || '—'
                              }
                            </div>
                          </div>
                          {hasCompleted && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                              Done
                            </span>
                          )}
                          {hasInProgress && !hasCompleted && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              Active
                            </span>
                          )}
                        </div>
                      </td>
                      {sortedMilestoneTypes.map(mt => {
                        const milestone = getMilestoneForEpisode(episode.id, mt.id);
                        const color = getMilestoneColor(mt);
                        
                        return (
                          <td
                            key={mt.id}
                            className="px-3 py-3 text-center border-l border-gray-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (milestone) onMilestoneClick?.(milestone);
                            }}
                          >
                            {milestone ? (
                              <div className="flex flex-col items-center gap-1">
                                <div
                                  className={clsx(
                                    'px-2 py-1 rounded text-xs font-medium text-white cursor-pointer hover:opacity-80 transition-opacity',
                                    milestone.status === 'completed' && 'opacity-60',
                                    milestone.status === 'skipped' && 'opacity-30'
                                  )}
                                  style={{ backgroundColor: color }}
                                  title={`${mt.name} - ${milestone.status}`}
                                >
                                  {milestone.scheduledDate 
                                    ? format(milestone.scheduledDate, 'MMM d')
                                    : '—'
                                  }
                                </div>
                                {milestone.status === 'completed' && (
                                  <span className="text-[10px] text-green-600">✓</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    
                    {/* Expanded details */}
                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan={sortedMilestoneTypes.length + 1} className="px-4 py-3">
                          <div className="text-sm text-gray-600">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="font-medium">Episode:</span> {episode.number}
                                {episode.title && ` - ${episode.title}`}
                              </div>
                              <div>
                                <span className="font-medium">Status:</span> {episode.status}
                              </div>
                            </div>
                            {episodeMilestones.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <div className="text-xs font-medium text-gray-500 mb-1">Milestones:</div>
                                <div className="flex flex-wrap gap-2">
                                  {episodeMilestones.map(m => {
                                    const mt = milestoneTypeMap.get(m.milestoneTypeId);
                                    return (
                                      <div
                                        key={m.id}
                                        className="text-xs px-2 py-1 rounded"
                                        style={{ 
                                          backgroundColor: getMilestoneColor(mt) + '20',
                                          color: getMilestoneColor(mt)
                                        }}
                                      >
                                        {mt?.code}: {m.status}
                                        {m.scheduledDate && ` (${format(m.scheduledDate, 'MMM d, yyyy')})`}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GridView;

