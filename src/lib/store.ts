import { create } from 'zustand';
import { 
  addWeeks, 
  startOfWeek, 
  endOfWeek, 
  addDays,
  parseISO,
  isBefore,
  isAfter 
} from 'date-fns';
import { api } from './api';
import type {
  Project,
  Episode,
  Milestone,
  MilestoneType,
  WorkItem,
  CalendarEvent,
  CrewMember,
  Session,
  DateRange,
  CommandResult,
  ScheduleConflict,
  ViewMode
} from '../types';

// ============================================================================
// Store Types
// ============================================================================

interface PostProState {
  // Current context
  currentProject: Project | null;
  viewMode: ViewMode;
  dateRange: DateRange;
  selectedEpisodeId: string | null;
  selectedMilestoneId: string | null;
  
  // Data
  episodes: Episode[];
  milestones: Milestone[];
  milestoneTypes: MilestoneType[];
  workItems: WorkItem[];
  calendarEvents: CalendarEvent[];
  crewMembers: CrewMember[];
  sessions: Session[];
  
  // UI State
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  showOnboarding: boolean;
  
  // Actions
  setCurrentProject: (project: Project | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setDateRange: (range: DateRange) => void;
  selectEpisode: (id: string | null) => void;
  selectMilestone: (id: string | null) => void;
  
  // Data mutations
  updateMilestone: (id: string, updates: Partial<Milestone>) => void;
  moveMilestone: (id: string, newDate: Date) => Promise<CommandResult>;
  createMilestone: (milestone: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>) => void;
  
  // Command processing
  processCommand: (input: string) => Promise<CommandResult>;
  
  // Data loading from API
  loadProject: (projectId: string) => Promise<void>;
  fetchProjectData: (projectId: string) => Promise<void>;
  
  // Project creation
  createProjectFromOnboarding: (onboardingData: any) => Promise<void>;
  
  // UI actions
  setShowOnboarding: (show: boolean) => void;
  
  // Demo data
  loadDemoData: () => void;
}

// ============================================================================
// Command Parser
// ============================================================================

function parseCommand(input: string, _state: PostProState): {
  action: string;
  target: string | null;
  params: Record<string, any>;
} {
  const normalized = input.toLowerCase().trim();
  
  // Move commands: "move 304 lock to Friday" / "move 304's FPL to 12/15"
  const moveMatch = normalized.match(/move\s+(\d+)(?:'s?)?\s+(\w+)\s+(?:to\s+)?(.+)/i);
  if (moveMatch) {
    return {
      action: 'move',
      target: moveMatch[1],
      params: {
        milestoneCode: moveMatch[2].toUpperCase(),
        newDate: moveMatch[3]
      }
    };
  }
  
  // What-if commands: "what if 304 lock slips to..."
  const whatIfMatch = normalized.match(/what\s*(?:if|happens?\s*if)\s+(\d+)(?:'s?)?\s+(\w+)\s+(?:slips?\s+)?(?:to\s+)?(.+)/i);
  if (whatIfMatch) {
    return {
      action: 'what_if',
      target: whatIfMatch[1],
      params: {
        milestoneCode: whatIfMatch[2].toUpperCase(),
        newDate: whatIfMatch[3]
      }
    };
  }
  
  // Show commands: "show me this week" / "show 304"
  const showMatch = normalized.match(/show\s+(?:me\s+)?(.+)/i);
  if (showMatch) {
    return {
      action: 'show',
      target: showMatch[1],
      params: {}
    };
  }
  
  // Status queries: "what's blocking 306?" / "what's late?"
  const blockingMatch = normalized.match(/what(?:'s|s|\s+is)\s+blocking\s+(\d+)/i);
  if (blockingMatch) {
    return {
      action: 'blocking',
      target: blockingMatch[1],
      params: {}
    };
  }
  
  const lateMatch = normalized.match(/what(?:'s|s|\s+is)\s+late/i);
  if (lateMatch) {
    return {
      action: 'late',
      target: null,
      params: {}
    };
  }
  
  // List commands: "list VFX shots for 302"
  const listMatch = normalized.match(/list\s+(\w+)\s+(?:shots?\s+)?(?:for\s+)?(\d+)?/i);
  if (listMatch) {
    return {
      action: 'list',
      target: listMatch[2] || null,
      params: {
        type: listMatch[1]
      }
    };
  }
  
  // Default: unknown
  return {
    action: 'unknown',
    target: null,
    params: { raw: input }
  };
}

// ============================================================================
// Date Parser
// ============================================================================

function parseDateReference(dateStr: string, referenceDate: Date = new Date()): Date | null {
  const normalized = dateStr.toLowerCase().trim();
  
  // Relative days
  if (normalized === 'today') return referenceDate;
  if (normalized === 'tomorrow') return addDays(referenceDate, 1);
  if (normalized === 'yesterday') return addDays(referenceDate, -1);
  
  // Day of week
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = daysOfWeek.findIndex(d => normalized.includes(d));
  if (dayIndex !== -1) {
    const currentDay = referenceDate.getDay();
    let daysToAdd = dayIndex - currentDay;
    if (daysToAdd <= 0) daysToAdd += 7; // Next occurrence
    if (normalized.includes('next')) daysToAdd += 7;
    return addDays(referenceDate, daysToAdd);
  }
  
  // Relative weeks
  if (normalized.includes('next week')) {
    return addWeeks(referenceDate, 1);
  }
  
  // Try parsing as date string
  try {
    // Handle MM/DD format
    const slashMatch = normalized.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (slashMatch) {
      const month = parseInt(slashMatch[1]) - 1;
      const day = parseInt(slashMatch[2]);
      const year = slashMatch[3] 
        ? (slashMatch[3].length === 2 ? 2000 + parseInt(slashMatch[3]) : parseInt(slashMatch[3]))
        : referenceDate.getFullYear();
      return new Date(year, month, day);
    }
    
    // Try ISO format
    const parsed = parseISO(normalized);
    if (!isNaN(parsed.getTime())) return parsed;
  } catch {
    // Fall through to return null
  }
  
  return null;
}

// ============================================================================
// Dependency Checker
// ============================================================================

function checkDependencies(
  milestone: Milestone,
  newDate: Date,
  state: PostProState
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  
  const milestoneType = state.milestoneTypes.find(mt => mt.id === milestone.milestoneTypeId);
  if (!milestoneType) return conflicts;
  
  // Check if prerequisites are scheduled after new date
  const prerequisites = milestoneType.requiresCompletionOf || [];
  
  for (const prereqCode of prerequisites) {
    const prereqType = state.milestoneTypes.find(mt => mt.code === prereqCode);
    if (!prereqType) continue;
    
    const prereqMilestone = state.milestones.find(
      m => m.episodeId === milestone.episodeId && m.milestoneTypeId === prereqType.id
    );
    
    if (prereqMilestone?.scheduledDate && isAfter(prereqMilestone.scheduledDate, newDate)) {
      conflicts.push({
        type: 'dependency',
        severity: 'error',
        message: `${milestoneType.code} cannot be before ${prereqCode} (scheduled ${prereqMilestone.scheduledDate.toLocaleDateString()})`,
        affectedMilestones: [milestone.id, prereqMilestone.id],
        suggestedResolution: `Move ${prereqCode} earlier or schedule ${milestoneType.code} after ${prereqMilestone.scheduledDate.toLocaleDateString()}`
      });
    }
  }
  
  // Check if this would push dependents
  const dependents = state.milestoneTypes.filter(
    mt => mt.requiresCompletionOf?.includes(milestoneType.code)
  );
  
  for (const depType of dependents) {
    const depMilestone = state.milestones.find(
      m => m.episodeId === milestone.episodeId && m.milestoneTypeId === depType.id
    );
    
    if (depMilestone?.scheduledDate && isBefore(depMilestone.scheduledDate, newDate)) {
      conflicts.push({
        type: 'dependency',
        severity: 'warning',
        message: `This will require moving ${depType.code} (currently ${depMilestone.scheduledDate.toLocaleDateString()})`,
        affectedMilestones: [milestone.id, depMilestone.id],
        suggestedResolution: `${depType.code} will cascade to after ${newDate.toLocaleDateString()}`
      });
    }
  }
  
  return conflicts;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const usePostProStore = create<PostProState>((set, get) => ({
  // Initial state
  currentProject: null,
  viewMode: 'gantt',
  dateRange: {
    start: startOfWeek(new Date()),
    end: endOfWeek(addWeeks(new Date(), 8))
  },
  selectedEpisodeId: null,
  selectedMilestoneId: null,
  
  episodes: [],
  milestones: [],
  milestoneTypes: [],
  workItems: [],
  calendarEvents: [],
  crewMembers: [],
  sessions: [],
  
  isLoading: false,
  isSaving: false,
  error: null,
  showOnboarding: false,
  
  // Actions
  setCurrentProject: (project) => set({ currentProject: project }),
  setShowOnboarding: (show) => set({ showOnboarding: show }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setDateRange: (range) => set({ dateRange: range }),
  selectEpisode: (id) => set({ selectedEpisodeId: id }),
  selectMilestone: (id) => set({ selectedMilestoneId: id }),
  
  // Mutations
  updateMilestone: (id, updates) => set((state) => ({
    milestones: state.milestones.map(m => 
      m.id === id ? { ...m, ...updates, updatedAt: new Date() } : m
    )
  })),
  
  moveMilestone: async (id, newDate) => {
    const state = get();
    const milestone = state.milestones.find(m => m.id === id);
    
    if (!milestone) {
      return {
        success: false,
        message: 'Milestone not found'
      };
    }
    
    // Check dependencies
    const conflicts = checkDependencies(milestone, newDate, state);
    const hasErrors = conflicts.some(c => c.severity === 'error');
    
    if (hasErrors) {
      return {
        success: false,
        message: 'Cannot move milestone due to dependency conflicts',
        conflicts
      };
    }
    
    // Apply the move
    set((state) => ({
      milestones: state.milestones.map(m =>
        m.id === id ? { ...m, scheduledDate: newDate, updatedAt: new Date() } : m
      )
    }));
    
    const milestoneType = state.milestoneTypes.find(mt => mt.id === milestone.milestoneTypeId);
    const episode = state.episodes.find(e => e.id === milestone.episodeId);
    
    return {
      success: true,
      message: `Moved ${episode?.number} ${milestoneType?.code} to ${newDate.toLocaleDateString()}`,
      conflicts: conflicts.length > 0 ? conflicts : undefined
    };
  },
  
  createMilestone: (milestone) => set((state) => ({
    milestones: [
      ...state.milestones,
      {
        ...milestone,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  })),
  
  // Command processing
  processCommand: async (input) => {
    const state = get();
    
    // If we have a real project (not demo), use the API
    if (state.currentProject && state.currentProject.id !== 'demo-project') {
      try {
        const response = await api.command(
          state.currentProject.id,
          input,
          state.selectedEpisodeId || undefined
        );
        
        // If the command made changes, refresh the data
        if (response.success && response.changes && response.changes.length > 0) {
          await get().fetchProjectData(state.currentProject.id);
        }
        
        return {
          success: response.success,
          message: response.response,
          conflicts: response.clarificationNeeded ? [{
            type: 'resource' as const,
            severity: 'warning' as const,
            message: response.clarificationNeeded,
            affectedMilestones: []
          }] : undefined
        };
      } catch (error) {
        console.error('API command failed:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to process command'
        };
      }
    }
    
    // Fall back to local parsing for demo mode
    const parsed = parseCommand(input, state);
    
    switch (parsed.action) {
      case 'move': {
        const episode = state.episodes.find(e => e.number.includes(parsed.target || ''));
        if (!episode) {
          return { success: false, message: `Episode ${parsed.target} not found` };
        }
        
        const milestoneType = state.milestoneTypes.find(
          mt => mt.code === parsed.params.milestoneCode
        );
        if (!milestoneType) {
          return { success: false, message: `Unknown milestone type: ${parsed.params.milestoneCode}` };
        }
        
        const milestone = state.milestones.find(
          m => m.episodeId === episode.id && m.milestoneTypeId === milestoneType.id
        );
        if (!milestone) {
          return { success: false, message: `${episode.number} doesn't have a ${milestoneType.code} scheduled` };
        }
        
        const newDate = parseDateReference(parsed.params.newDate);
        if (!newDate) {
          return { success: false, message: `Couldn't understand date: "${parsed.params.newDate}"` };
        }
        
        return state.moveMilestone(milestone.id, newDate);
      }
      
      case 'what_if': {
        const episode = state.episodes.find(e => e.number.includes(parsed.target || ''));
        if (!episode) {
          return { success: false, message: `Episode ${parsed.target} not found` };
        }
        
        const milestoneType = state.milestoneTypes.find(
          mt => mt.code === parsed.params.milestoneCode
        );
        if (!milestoneType) {
          return { success: false, message: `Unknown milestone type: ${parsed.params.milestoneCode}` };
        }
        
        const milestone = state.milestones.find(
          m => m.episodeId === episode.id && m.milestoneTypeId === milestoneType.id
        );
        if (!milestone) {
          return { success: false, message: `${episode.number} doesn't have a ${milestoneType.code} scheduled` };
        }
        
        const newDate = parseDateReference(parsed.params.newDate);
        if (!newDate) {
          return { success: false, message: `Couldn't understand date: "${parsed.params.newDate}"` };
        }
        
        const conflicts = checkDependencies(milestone, newDate, state);
        
        if (conflicts.length === 0) {
          return {
            success: true,
            message: `Moving ${episode.number} ${milestoneType.code} to ${newDate.toLocaleDateString()} would have no conflicts.`
          };
        }
        
        return {
          success: true,
          message: `Moving ${episode.number} ${milestoneType.code} to ${newDate.toLocaleDateString()} would cause ${conflicts.length} issue(s):`,
          conflicts
        };
      }
      
      case 'late': {
        const today = new Date();
        const lateMilestones = state.milestones.filter(m => 
          m.scheduledDate && 
          isBefore(m.scheduledDate, today) && 
          m.status !== 'completed'
        );
        
        if (lateMilestones.length === 0) {
          return { success: true, message: 'Nothing is currently late!' };
        }
        
        const lateItems = lateMilestones.map(m => {
          const ep = state.episodes.find(e => e.id === m.episodeId);
          const mt = state.milestoneTypes.find(t => t.id === m.milestoneTypeId);
          return `${ep?.number} ${mt?.code}`;
        });
        
        return {
          success: true,
          message: `${lateMilestones.length} item(s) are past their scheduled date: ${lateItems.join(', ')}`
        };
      }
      
      case 'blocking': {
        const episode = state.episodes.find(e => e.number.includes(parsed.target || ''));
        if (!episode) {
          return { success: false, message: `Episode ${parsed.target} not found` };
        }
        
        // Find incomplete milestones for this episode
        const incomplete = state.milestones.filter(m =>
          m.episodeId === episode.id && m.status !== 'completed'
        );
        
        // Find work items not approved
        const pendingWork = state.workItems.filter(w =>
          w.episodeId === episode.id && w.status !== 'approved'
        );
        
        const blockers: string[] = [];
        
        incomplete.forEach(m => {
          const mt = state.milestoneTypes.find(t => t.id === m.milestoneTypeId);
          if (mt) blockers.push(`${mt.code} (${m.status})`);
        });
        
        if (pendingWork.length > 0) {
          blockers.push(`${pendingWork.length} work item(s) pending`);
        }
        
        if (blockers.length === 0) {
          return { success: true, message: `Nothing is blocking ${episode.number}!` };
        }
        
        return {
          success: true,
          message: `${episode.number} is waiting on: ${blockers.join(', ')}`
        };
      }
      
      case 'show': {
        const target = parsed.target?.toLowerCase() || '';
        
        if (target.includes('this week')) {
          set({
            dateRange: {
              start: startOfWeek(new Date()),
              end: endOfWeek(new Date())
            }
          });
          return { success: true, message: 'Showing this week' };
        }
        
        if (target.includes('next week')) {
          const nextWeek = addWeeks(new Date(), 1);
          set({
            dateRange: {
              start: startOfWeek(nextWeek),
              end: endOfWeek(nextWeek)
            }
          });
          return { success: true, message: 'Showing next week' };
        }
        
        // Episode number
        const epMatch = target.match(/(\d+)/);
        if (epMatch) {
          const episode = state.episodes.find(e => e.number.includes(epMatch[1]));
          if (episode) {
            set({ selectedEpisodeId: episode.id });
            return { success: true, message: `Selected episode ${episode.number}` };
          }
        }
        
        return { success: false, message: `Not sure what to show: "${parsed.target}"` };
      }
      
      default:
        return {
          success: false,
          message: `I didn't understand that. Try "move 304 lock to Friday" or "what's late?"`
        };
    }
  },
  
  // Data loading
  loadProject: async (projectId) => {
    set({ isLoading: true, error: null });
    
    try {
      await get().fetchProjectData(projectId);
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load project',
        isLoading: false 
      });
    }
  },
  
  // Fetch real project data from API
  fetchProjectData: async (projectId) => {
    try {
      const response = await api.projects.get(projectId);
      const project = response.data;
      
      // The API returns episodes, milestones, etc. nested in the project
      set({
        currentProject: {
          id: project.id,
          organizationId: project.organization_id,
          name: project.name,
          code: project.code,
          seasonNumber: project.season_number,
          status: project.status,
          settings: project.settings || {},
          createdAt: new Date(project.created_at),
          updatedAt: new Date(project.updated_at)
        },
        episodes: (project.episodes || []).map((ep: any) => ({
          id: ep.id,
          projectId: ep.project_id,
          number: ep.number,
          title: ep.title || '',
          director: ep.director,
          editor: ep.editor,
          sortOrder: ep.sort_order,
          status: ep.status,
          createdAt: new Date(ep.created_at),
          updatedAt: new Date(ep.updated_at)
        })),
        milestones: (project.milestones || []).map((m: any) => ({
          id: m.id,
          episodeId: m.episode_id,
          milestoneTypeId: m.milestone_type_id,
          scheduledDate: m.scheduled_date ? new Date(m.scheduled_date) : undefined,
          status: m.status,
          notes: m.notes,
          createdAt: new Date(m.created_at),
          updatedAt: new Date(m.updated_at)
        })),
        milestoneTypes: (project.milestone_types || []).map((mt: any) => ({
          id: mt.id,
          projectId: mt.project_id,
          code: mt.code,
          name: mt.name,
          sortOrder: mt.sort_order,
          isHardDeadline: mt.is_hard_deadline,
          requiresCompletionOf: mt.requires_completion_of || [],
          createdAt: new Date(mt.created_at)
        })),
        calendarEvents: (project.calendar_events || []).map((ce: any) => ({
          id: ce.id,
          projectId: ce.project_id,
          name: ce.name,
          eventType: ce.event_type,
          startDate: new Date(ce.start_date),
          endDate: ce.end_date ? new Date(ce.end_date) : undefined,
          affectsAll: ce.affects_all,
          createdAt: new Date(ce.created_at)
        })),
        workItems: [],
        crewMembers: [],
        sessions: [],
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to fetch project:', error);
      // Fall back to demo data
      get().loadDemoData();
    }
  },
  
  // Project creation from onboarding
  createProjectFromOnboarding: async (onboardingData: any) => {
    set({ isSaving: true, error: null });
    
    try {
      // Create project via API
      const projectResponse = await api.projects.create({
        organizationId: 'default-org', // TODO: get from auth context
        name: onboardingData.projectName,
        code: onboardingData.projectCode || undefined,
        seasonNumber: onboardingData.seasonNumber || undefined,
        episodeCount: onboardingData.episodeCount,
        episodePrefix: onboardingData.episodePrefix || undefined,
      });
      
      const projectId = projectResponse.data.id;
      
      // Create milestone types
      for (const mt of onboardingData.milestoneTypes) {
        await api.milestoneTypes.create(projectId, {
          code: mt.code,
          name: mt.name,
          sortOrder: mt.sortOrder,
          color: mt.color,
          requiresCompletionOf: mt.requiresCompletionOf || [],
        });
      }
      
      // Load the newly created project
      await get().fetchProjectData(projectId);
      
      set({ isSaving: false, showOnboarding: false });
    } catch (error) {
      console.error('Failed to create project:', error);
      // For demo mode, create project locally
      const projectId = `project-${Date.now()}`;
      const now = new Date();
      
      // Create milestone types
      const milestoneTypes: MilestoneType[] = onboardingData.milestoneTypes.map((mt: any, idx: number) => ({
        id: `mt-${mt.code}-${idx}`,
        projectId,
        code: mt.code,
        name: mt.name,
        sortOrder: mt.sortOrder,
        isHardDeadline: mt.isHardDeadline || false,
        color: mt.color,
        requiresCompletionOf: mt.requiresCompletionOf || [],
        createdAt: now
      }));
      
      // Create episodes
      const episodes: Episode[] = Array.from({ length: onboardingData.episodeCount }, (_, i) => ({
        id: `ep-${i + 1}`,
        projectId,
        number: `${onboardingData.episodePrefix}${onboardingData.episodeStartNumber + i}`,
        title: '',
        editor: onboardingData.defaultEditor || undefined,
        sortOrder: i,
        status: 'active',
        createdAt: now,
        updatedAt: now
      }));
      
      set({
        currentProject: {
          id: projectId,
          organizationId: 'default-org',
          name: onboardingData.projectName,
          code: onboardingData.projectCode,
          seasonNumber: onboardingData.seasonNumber || undefined,
          status: 'active',
          settings: {
            workWeekDays: onboardingData.workWeekDays,
            timezone: onboardingData.timezone,
          },
          createdAt: now,
          updatedAt: now
        },
        episodes,
        milestones: [],
        milestoneTypes,
        calendarEvents: [],
        workItems: [],
        crewMembers: [],
        sessions: [],
        isSaving: false,
        showOnboarding: false
      });
    }
  },
  
  // Demo data for development
  loadDemoData: () => {
    const projectId = 'demo-project';
    
    // Create milestone types
    const milestoneTypes: MilestoneType[] = [
      { id: 'mt-ec', projectId, code: 'EC', name: "Editor's Cut", sortOrder: 1, isHardDeadline: false, requiresCompletionOf: [], createdAt: new Date() },
      { id: 'mt-dc', projectId, code: 'DC', name: "Director's Cut", sortOrder: 2, isHardDeadline: false, requiresCompletionOf: ['EC'], createdAt: new Date() },
      { id: 'mt-nc1', projectId, code: 'NC1', name: 'Network Cut 1', sortOrder: 3, isHardDeadline: false, requiresCompletionOf: ['DC'], createdAt: new Date() },
      { id: 'mt-nc2', projectId, code: 'NC2', name: 'Network Cut 2', sortOrder: 4, isHardDeadline: false, requiresCompletionOf: ['NC1'], createdAt: new Date() },
      { id: 'mt-fpl', projectId, code: 'FPL', name: 'Final Picture Lock', sortOrder: 5, isHardDeadline: true, requiresCompletionOf: ['NC2'], createdAt: new Date() },
      { id: 'mt-ms', projectId, code: 'M/S', name: 'Music/Sound Spotting', sortOrder: 6, isHardDeadline: false, requiresCompletionOf: ['FPL'], createdAt: new Date() },
      { id: 'mt-cc', projectId, code: 'CC', name: 'Color Correction', sortOrder: 7, isHardDeadline: false, requiresCompletionOf: ['FPL'], createdAt: new Date() },
      { id: 'mt-mix', projectId, code: 'MIX', name: 'Final Mix', sortOrder: 8, isHardDeadline: false, requiresCompletionOf: ['M/S', 'CC'], createdAt: new Date() },
      { id: 'mt-qc', projectId, code: 'QC', name: 'Quality Control', sortOrder: 9, isHardDeadline: false, requiresCompletionOf: ['MIX'], createdAt: new Date() },
      { id: 'mt-d', projectId, code: 'D', name: 'Delivery', sortOrder: 10, isHardDeadline: true, requiresCompletionOf: ['QC'], createdAt: new Date() },
    ];
    
    // Create episodes
    const episodes: Episode[] = Array.from({ length: 10 }, (_, i) => ({
      id: `ep-${i + 1}`,
      projectId,
      number: `${301 + i}`,
      title: '',
      director: 'Garcia',
      editor: i % 2 === 0 ? 'Marrinson' : 'Maddox',
      sortOrder: i,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    // Create milestones with staggered dates
    const milestones: Milestone[] = [];
    const baseDate = new Date();
    
    episodes.forEach((ep, epIndex) => {
      milestoneTypes.forEach((mt, mtIndex) => {
        const daysOffset = (epIndex * 3) + (mtIndex * 7);
        milestones.push({
          id: `ms-${ep.id}-${mt.id}`,
          episodeId: ep.id,
          milestoneTypeId: mt.id,
          scheduledDate: addDays(baseDate, daysOffset),
          status: 'scheduled',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });
    });
    
    // Create some calendar events
    const calendarEvents: CalendarEvent[] = [
      {
        id: 'ce-1',
        projectId,
        name: 'Thanksgiving',
        eventType: 'holiday',
        startDate: addDays(baseDate, 21),
        endDate: addDays(baseDate, 24),
        affectsAll: true,
        createdAt: new Date()
      },
      {
        id: 'ce-2',
        projectId,
        name: 'Winter Break',
        eventType: 'hold',
        startDate: addDays(baseDate, 45),
        endDate: addDays(baseDate, 52),
        affectsAll: true,
        createdAt: new Date()
      }
    ];
    
    set({
      currentProject: {
        id: projectId,
        organizationId: 'demo-org',
        name: 'Demo Show',
        code: 'DEMO',
        seasonNumber: 3,
        status: 'active',
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      episodes,
      milestones,
      milestoneTypes,
      calendarEvents,
      workItems: [],
      crewMembers: [],
      sessions: [],
      isLoading: false
    });
  }
}));

export default usePostProStore;
