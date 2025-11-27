// PostPro Type Definitions
// These mirror the database schema and define the shape of data throughout the app

// ============================================================================
// Core Types
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectRole = 
  | 'admin' 
  | 'supervisor' 
  | 'coordinator' 
  | 'editor' 
  | 'assistant' 
  | 'executive' 
  | 'vendor';

export type ProjectStatus = 
  | 'development' 
  | 'active' 
  | 'wrapped' 
  | 'archived';

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  code?: string;
  seasonNumber?: number;
  startDate?: Date;
  targetDeliveryDate?: Date;
  color?: string;
  status: ProjectStatus;
  settings: ProjectSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectSettings {
  defaultMilestoneTypes?: string[];
  workWeekDays?: number[]; // 0-6, Sunday-Saturday
  timezone?: string;
}

// ============================================================================
// Episodes
// ============================================================================

export type EpisodeStatus = 
  | 'prep' 
  | 'shooting' 
  | 'active' 
  | 'locked' 
  | 'delivered';

export interface Episode {
  id: string;
  projectId: string;
  number: string;
  title?: string;
  director?: string;
  editor?: string;
  
  // Runtime (stored as minutes for simplicity in frontend)
  currentTrt?: number;
  storyTime?: number;
  mainTitleDuration?: number;
  prevOnDuration?: number;
  targetRuntime?: number;
  
  // Shoot info
  shootStartDate?: Date;
  shootEndDate?: Date;
  shootDays?: number;
  
  sortOrder: number;
  status: EpisodeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface EpisodeBlock {
  id: string;
  projectId: string;
  name: string;
  episodeIds: string[];
  createdAt: Date;
}

// ============================================================================
// Milestones
// ============================================================================

export interface MilestoneType {
  id: string;
  projectId: string;
  code: string;
  name: string;
  sortOrder: number;
  defaultDurationDays?: number;
  isHardDeadline: boolean;
  color?: string;
  icon?: string;
  requiresCompletionOf: string[]; // codes of prerequisite milestone types
  createdAt: Date;
}

export type MilestoneStatus = 
  | 'scheduled' 
  | 'in_progress' 
  | 'completed' 
  | 'skipped';

export interface Milestone {
  id: string;
  episodeId: string;
  milestoneTypeId: string;
  scheduledDate?: Date;
  scheduledTime?: string; // HH:MM format
  completedDate?: Date;
  completedAt?: Date;
  status: MilestoneStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Joined data (populated by queries)
  milestoneType?: MilestoneType;
  episode?: Episode;
}

// ============================================================================
// Work Items
// ============================================================================

export interface Department {
  id: string;
  projectId: string;
  code: string;
  name: string;
  color?: string;
  sortOrder: number;
  createdAt: Date;
}

export interface Vendor {
  id: string;
  organizationId: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkItemStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'review' 
  | 'approved' 
  | 'omitted';

export interface WorkItem {
  id: string;
  episodeId: string;
  departmentId?: string;
  vendorId?: string;
  sceneNumbers?: string;
  sceneDescription?: string;
  workDescription: string;
  notes?: string;
  shootDate?: Date;
  requiresSupervision: boolean;
  assignedTo?: string;
  dueDate?: Date;
  dueMilestoneId?: string;
  status: WorkItemStatus;
  currentVersion: number;
  estimatedCost?: number;
  actualCost?: number;
  poNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Joined data
  department?: Department;
  vendor?: Vendor;
  episode?: Episode;
}

// ============================================================================
// Crew
// ============================================================================

export interface CrewPosition {
  id: string;
  projectId: string;
  code: string;
  name: string;
  department?: string;
  sortOrder: number;
  defaultWeeklyRate?: number;
  createdAt: Date;
}

export interface CrewMember {
  id: string;
  projectId: string;
  positionId?: string;
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
  startDate?: Date;
  endDate?: Date;
  weeklyRate?: number;
  budgetedWeeks?: number;
  actualWeeks?: number;
  assignedEpisodeIds?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Joined data
  position?: CrewPosition;
}

export type WorkDayType = 'W' | 'SW' | 'H' | 'V' | 'S'; // Work, Start Week, Hold, Vacation, Sick

export interface CrewWorkDay {
  id: string;
  crewMemberId: string;
  workDate: Date;
  workType: WorkDayType;
  notes?: string;
  createdAt: Date;
}

// ============================================================================
// Sessions & Calendar
// ============================================================================

export type SessionType = 
  | 'cut_review' 
  | 'spotting' 
  | 'mix' 
  | 'adr' 
  | 'color' 
  | 'qc' 
  | 'other';

export type SessionStatus = 
  | 'scheduled' 
  | 'confirmed' 
  | 'completed' 
  | 'cancelled';

export interface Session {
  id: string;
  projectId: string;
  name: string;
  sessionType?: SessionType;
  scheduledDate: Date;
  startTime?: string;
  endTime?: string;
  location?: string;
  episodeIds?: string[];
  milestoneId?: string;
  attendees?: string[];
  status: SessionStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CalendarEventType = 
  | 'holiday' 
  | 'hold' 
  | 'block' 
  | 'note';

export interface CalendarEvent {
  id: string;
  projectId: string;
  name: string;
  eventType: CalendarEventType;
  startDate: Date;
  endDate?: Date;
  affectsAll: boolean;
  affectedCrewIds?: string[];
  color?: string;
  notes?: string;
  createdAt: Date;
}

// ============================================================================
// Activity & Comments
// ============================================================================

export type EntityType = 
  | 'episode' 
  | 'milestone' 
  | 'work_item' 
  | 'session' 
  | 'crew_member';

export interface Comment {
  id: string;
  userId: string;
  entityType: EntityType;
  entityId: string;
  content: string;
  mentionedUserIds?: string[];
  createdAt: Date;
  updatedAt: Date;
  
  // Joined
  user?: User;
}

export type ActivityAction = 
  | 'created' 
  | 'updated' 
  | 'deleted' 
  | 'moved' 
  | 'completed';

export interface ActivityLogEntry {
  id: string;
  projectId: string;
  userId: string;
  entityType: EntityType;
  entityId: string;
  action: ActivityAction;
  changes?: Record<string, { from: any; to: any }>;
  description: string;
  createdAt: Date;
  
  // Joined
  user?: User;
}

// ============================================================================
// UI State Types
// ============================================================================

export type ViewMode = 'gantt' | 'grid' | 'calendar' | 'list';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface GanttCell {
  date: Date;
  episodeId: string;
  milestones: Milestone[];
  workItems: WorkItem[];
  calendarEvents: CalendarEvent[];
  isWeekend: boolean;
  isHoliday: boolean;
}

export interface ScheduleConflict {
  type: 'dependency' | 'resource' | 'deadline';
  severity: 'error' | 'warning' | 'info';
  message: string;
  affectedMilestones: string[];
  suggestedResolution?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// Command Types (for conversational interface)
// ============================================================================

export type CommandType = 
  | 'move' 
  | 'show' 
  | 'list' 
  | 'create' 
  | 'update' 
  | 'delete'
  | 'what_if'
  | 'export'
  | 'help';

export interface Command {
  type: CommandType;
  raw: string;
  parsed: {
    action: string;
    target?: string;
    targetId?: string;
    newValue?: any;
    filters?: Record<string, any>;
  };
  confidence: number;
}

export interface CommandResult {
  success: boolean;
  message: string;
  changes?: ActivityLogEntry[];
  conflicts?: ScheduleConflict[];
  preview?: any; // For what-if scenarios
}
