/**
 * PostPro API Client
 * Connects the frontend to the backend API
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiError extends Error {
  constructor(message: string, public status: number, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error || 'API request failed',
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

// ============================================================================
// Projects
// ============================================================================

export async function listProjects(organizationId: string) {
  return request<{ data: any[] }>(`/projects?organizationId=${organizationId}`);
}

export async function getProject(id: string) {
  return request<{ data: any }>(`/projects/${id}`);
}

export async function createProject(data: {
  organizationId: string;
  name: string;
  code?: string;
  seasonNumber?: number;
  templateId?: string;
  episodeCount?: number;
  episodePrefix?: string;
}) {
  return request<{ data: any }>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================================
// Episodes
// ============================================================================

export async function listEpisodes(projectId: string) {
  return request<{ data: any[] }>(`/projects/${projectId}/episodes`);
}

export async function updateEpisode(id: string, data: Partial<any>) {
  return request<{ data: any }>(`/episodes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============================================================================
// Milestones
// ============================================================================

export async function listMilestones(projectId: string) {
  return request<{ data: any[] }>(`/projects/${projectId}/milestones`);
}

export async function createMilestone(data: {
  episodeId: string;
  milestoneTypeId: string;
  scheduledDate: string;
  notes?: string;
}) {
  return request<{ data: any }>('/milestones', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMilestone(
  id: string,
  data: { scheduledDate?: string; status?: string; notes?: string }
) {
  return request<{ data: any }>(`/milestones/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============================================================================
// Milestone Types
// ============================================================================

export async function listMilestoneTypes(projectId: string) {
  return request<{ data: any[] }>(`/projects/${projectId}/milestone-types`);
}

export async function createMilestoneType(
  projectId: string,
  data: {
    code: string;
    name: string;
    aliases?: string[];
    category?: string;
    sortOrder: number;
    color?: string;
    requiresCompletionOf?: string[];
  }
) {
  return request<{ data: any }>(`/projects/${projectId}/milestone-types`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================================
// Work Items
// ============================================================================

export async function listWorkItems(
  projectId: string,
  filters?: {
    departmentId?: string;
    episodeId?: string;
    status?: string;
    vendorId?: string;
  }
) {
  const params = new URLSearchParams();
  if (filters?.departmentId) params.set('departmentId', filters.departmentId);
  if (filters?.episodeId) params.set('episodeId', filters.episodeId);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.vendorId) params.set('vendorId', filters.vendorId);

  const query = params.toString();
  return request<{ data: any[] }>(
    `/projects/${projectId}/work-items${query ? `?${query}` : ''}`
  );
}

export async function createWorkItem(data: {
  episodeId: string;
  departmentId?: string;
  vendorId?: string;
  sceneNumbers?: string;
  sceneDescription?: string;
  workDescription: string;
  notes?: string;
  shootDate?: string;
  requiresSupervision?: boolean;
  dueDate?: string;
  dueMilestoneId?: string;
}) {
  return request<{ data: any }>('/work-items', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================================
// Templates
// ============================================================================

export async function listTemplates(organizationId?: string) {
  const query = organizationId ? `?organizationId=${organizationId}` : '';
  return request<{ data: any[] }>(`/templates${query}`);
}

export async function getTemplate(id: string) {
  return request<{ data: any }>(`/templates/${id}`);
}

// ============================================================================
// Commands (Claude-powered)
// ============================================================================

export async function sendCommand(
  projectId: string,
  input: string,
  selectedEpisodeId?: string
) {
  return request<{
    intent: string;
    confidence: number;
    response: string;
    success: boolean;
    changes?: any[];
    clarificationNeeded?: string;
  }>(`/projects/${projectId}/command`, {
    method: 'POST',
    body: JSON.stringify({ input, selectedEpisodeId }),
  });
}

// ============================================================================
// Export
// ============================================================================

export const api = {
  projects: {
    list: listProjects,
    get: getProject,
    create: createProject,
  },
  episodes: {
    list: listEpisodes,
    update: updateEpisode,
  },
  milestones: {
    list: listMilestones,
    create: createMilestone,
    update: updateMilestone,
  },
  milestoneTypes: {
    list: listMilestoneTypes,
    create: createMilestoneType,
  },
  workItems: {
    list: listWorkItems,
    create: createWorkItem,
  },
  templates: {
    list: listTemplates,
    get: getTemplate,
  },
  command: sendCommand,
};

export default api;
