/**
 * AI-Powered Command Processing
 * Uses Claude to understand natural language commands and have conversations about the schedule
 */

interface ProjectContext {
  project: {
    name: string;
    code?: string;
    seasonNumber?: number;
  };
  episodes: Array<{
    id: string;
    number: string;
    title?: string;
    director?: string;
    editor?: string;
    status: string;
  }>;
  milestones: Array<{
    id: string;
    episodeId: string;
    episodeNumber: string;
    milestoneTypeCode: string;
    milestoneTypeName: string;
    scheduledDate?: string;
    status: string;
  }>;
  milestoneTypes: Array<{
    code: string;
    name: string;
    sortOrder: number;
    isHardDeadline: boolean;
    requiresCompletionOf: string[];
  }>;
  calendarEvents: Array<{
    name: string;
    eventType: string;
    startDate: string;
    endDate?: string;
  }>;
}

interface AICommandResult {
  success: boolean;
  message: string;
  actions?: Array<{
    type: 'move' | 'update' | 'create' | 'query';
    target: string;
    params: Record<string, any>;
  }>;
  conflicts?: Array<{
    type: 'dependency' | 'resource' | 'deadline';
    severity: 'error' | 'warning' | 'info';
    message: string;
    affectedMilestones: string[];
    suggestedResolution?: string;
  }>;
  clarificationNeeded?: string;
}

/**
 * Process a natural language command using Claude AI
 * This works client-side for demo mode, or can be used as a fallback
 */
export async function processAICommand(
  input: string,
  context: ProjectContext,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<AICommandResult> {
  // Check if we have an API key (for client-side Claude calls)
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  
  // If no API key, we'll rely on the backend API endpoint which should have Claude configured
  // For now, return a message indicating AI processing should go through the backend
  if (!apiKey) {
    return {
      success: false,
      message: 'AI processing is configured on the backend. Please ensure your backend API is running with Claude configured.',
      clarificationNeeded: 'To use client-side AI, set VITE_ANTHROPIC_API_KEY in your environment variables.',
    };
  }

  try {
    // Build the context prompt
    const contextPrompt = buildContextPrompt(context);
    
    // Build conversation history
    const messages = [
      {
        role: 'system' as const,
        content: `You are a helpful assistant for post-production scheduling. You help users manage their show's schedule through natural conversation.

You understand:
- Episode numbers (e.g., "304", "episode 304", "304's")
- Milestone types and their codes (e.g., "EC" = Editor's Cut, "DC" = Director's Cut, "FPL" = Final Picture Lock, "LOCK" = Picture Lock)
- Natural date expressions (e.g., "Friday", "next week", "back two days", "12/20")
- Schedule dependencies and conflicts
- Post-production terminology

When the user asks to move or change something:
1. Identify the episode and milestone type
2. Understand the new date or relative change
3. Check for conflicts (dependencies, deadlines)
4. Explain what will happen clearly
5. If there are conflicts, suggest resolutions

Be conversational and helpful. Ask for clarification if needed. When you make changes, explain what you did.`
      },
      {
        role: 'user' as const,
        content: `${contextPrompt}\n\nUser said: "${input}"\n\nPlease respond naturally and helpfully. If you need to make changes to the schedule, describe what you would do. If there are conflicts or issues, explain them clearly.`
      },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error?.message || 'Failed to process command');
    }

    const data = await response.json();
    const aiResponse = data.content[0]?.text || 'I apologize, but I couldn\'t process that request.';

    // Parse the AI response to extract actions if it mentions making changes
    const actions = extractActions(aiResponse, context);
    
    return {
      success: true,
      message: aiResponse,
      actions,
    };
  } catch (error) {
    console.error('AI command processing failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process command with AI',
    };
  }
}

/**
 * Build a context prompt with current project state
 */
function buildContextPrompt(context: ProjectContext): string {
  const episodesList = context.episodes.map(ep => 
    `- ${ep.number}${ep.title ? `: ${ep.title}` : ''} (${ep.status})${ep.editor ? ` - Editor: ${ep.editor}` : ''}`
  ).join('\n');

  const milestoneTypesList = context.milestoneTypes
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(mt => {
      const deps = mt.requiresCompletionOf.length > 0 
        ? ` (requires: ${mt.requiresCompletionOf.join(', ')})`
        : '';
      return `- ${mt.code}: ${mt.name}${deps}${mt.isHardDeadline ? ' [HARD DEADLINE]' : ''}`;
    })
    .join('\n');

  const milestonesList = context.milestones
    .filter(m => m.scheduledDate)
    .map(m => {
      const date = new Date(m.scheduledDate!).toLocaleDateString();
      return `- ${m.episodeNumber} ${m.milestoneTypeCode} (${m.milestoneTypeName}): ${date} [${m.status}]`;
    })
    .slice(0, 20) // Limit to first 20 for context
    .join('\n');

  return `Current Project: ${context.project.name}${context.project.seasonNumber ? ` Season ${context.project.seasonNumber}` : ''}

Available Episodes:
${episodesList}

Milestone Types (in order):
${milestoneTypesList}

Current Milestones:
${milestonesList || 'No milestones scheduled yet'}

Today is ${new Date().toLocaleDateString()}.`;
}

/**
 * Extract actionable commands from AI response
 * This is a simple parser - in production, the AI could return structured JSON
 */
function extractActions(_aiResponse: string, _context: ProjectContext): AICommandResult['actions'] {
  const actions: AICommandResult['actions'] = [];
  
  // Look for patterns like "move episode 304's FPL to Friday"
  // This is a simplified version - in production, you'd want the AI to return structured actions
  
  // For now, return empty - the AI response is conversational
  // The actual implementation would parse the response and return structured actions
  // that can be executed
  
  return actions.length > 0 ? actions : undefined;
}

/**
 * Client-side fallback that uses a simpler approach when API key isn't available
 * This provides basic understanding without requiring Claude
 */
export async function processCommandFallback(
  _input: string,
  _context: ProjectContext
): Promise<AICommandResult> {
  // This would use a simpler rule-based or pattern-matching approach
  // For now, return a helpful message
  return {
    success: false,
    message: 'To use natural language commands, please configure VITE_ANTHROPIC_API_KEY. For now, you can use commands like "move 304 lock to Friday" or "what\'s blocking 306?".',
  };
}

