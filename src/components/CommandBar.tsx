import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  X, 
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import clsx from 'clsx';
import type { CommandResult, ScheduleConflict } from '../types';

// ============================================================================
// Types
// ============================================================================

interface CommandBarProps {
  onCommand: (command: string) => Promise<CommandResult>;
  isProcessing?: boolean;
  placeholder?: string;
  suggestions?: string[];
}

interface CommandHistoryItem {
  id: string;
  input: string;
  result: CommandResult;
  timestamp: Date;
}

// ============================================================================
// Helper Components
// ============================================================================

interface ConflictCardProps {
  conflict: ScheduleConflict;
}

const ConflictCard: React.FC<ConflictCardProps> = ({ conflict }) => {
  const severityColors = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const severityIcons = {
    error: <X className="w-4 h-4 text-red-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    info: <MessageSquare className="w-4 h-4 text-blue-500" />
  };

  return (
    <div className={clsx(
      'p-3 rounded-lg border',
      severityColors[conflict.severity]
    )}>
      <div className="flex items-start gap-2">
        {severityIcons[conflict.severity]}
        <div className="flex-1">
          <p className="text-sm font-medium">{conflict.message}</p>
          {conflict.suggestedResolution && (
            <p className="text-xs mt-1 opacity-75">
              Suggestion: {conflict.suggestedResolution}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

interface SuggestionChipProps {
  suggestion: string;
  onClick: () => void;
}

const SuggestionChip: React.FC<SuggestionChipProps> = ({ suggestion, onClick }) => (
  <button
    onClick={onClick}
    className={clsx(
      'px-3 py-1.5 text-sm rounded-full',
      'bg-gray-100 hover:bg-gray-200 text-gray-700',
      'transition-colors duration-150',
      'flex items-center gap-1'
    )}
  >
    <ArrowRight className="w-3 h-3" />
    {suggestion}
  </button>
);

// ============================================================================
// Main Component
// ============================================================================

export const CommandBar: React.FC<CommandBarProps> = ({
  onCommand,
  isProcessing = false,
  placeholder = "Ask anything... try 'move 304 lock to Friday' or 'what's blocking 306?'",
  suggestions = [
    "Show me this week",
    "What's late?",
    "Move 303 mix to next Monday",
    "List VFX shots for 302"
  ]
}) => {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest result
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = useCallback(async (commandText: string) => {
    if (!commandText.trim() || isProcessing) return;

    const trimmedInput = commandText.trim();
    setInput('');
    setShowSuggestions(false);

    try {
      const result = await onCommand(trimmedInput);
      
      setHistory(prev => [...prev, {
        id: crypto.randomUUID(),
        input: trimmedInput,
        result,
        timestamp: new Date()
      }]);
    } catch (error) {
      setHistory(prev => [...prev, {
        id: crypto.randomUUID(),
        input: trimmedInput,
        result: {
          success: false,
          message: error instanceof Error ? error.message : 'Something went wrong'
        },
        timestamp: new Date()
      }]);
    }
  }, [onCommand, isProcessing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
    if (e.key === 'Escape') {
      setIsExpanded(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSubmit(suggestion);
  };

  const clearHistory = () => {
    setHistory([]);
    setShowSuggestions(true);
  };

  return (
    <div className={clsx(
      'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
      'transition-all duration-300 ease-out',
      isExpanded ? 'w-[600px]' : 'w-[480px]'
    )}>
      {/* Expanded results panel */}
      {isExpanded && history.length > 0 && (
        <div className={clsx(
          'mb-2 bg-white rounded-xl shadow-2xl border border-gray-200',
          'max-h-[400px] overflow-y-auto'
        )}>
          <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">
              Conversation
            </span>
            <button
              onClick={clearHistory}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            {history.map((item) => (
              <div key={item.id} className="space-y-2">
                {/* User input */}
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-3 h-3 text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-700 pt-0.5">{item.input}</p>
                </div>
                
                {/* Result */}
                <div className="flex items-start gap-2 ml-8">
                  <div className={clsx(
                    'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                    item.result.success ? 'bg-green-100' : 'bg-red-100'
                  )}>
                    {item.result.success 
                      ? <CheckCircle className="w-3 h-3 text-green-600" />
                      : <X className="w-3 h-3 text-red-600" />
                    }
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className={clsx(
                      'text-sm',
                      item.result.success ? 'text-gray-700' : 'text-red-600'
                    )}>
                      {item.result.message}
                    </p>
                    
                    {/* Conflicts */}
                    {item.result.conflicts && item.result.conflicts.length > 0 && (
                      <div className="space-y-2">
                        {item.result.conflicts.map((conflict, idx) => (
                          <ConflictCard key={idx} conflict={conflict} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={historyEndRef} />
          </div>
        </div>
      )}

      {/* Suggestions */}
      {isExpanded && showSuggestions && history.length === 0 && (
        <div className="mb-2 flex flex-wrap gap-2 justify-center">
          {suggestions.map((suggestion, idx) => (
            <SuggestionChip
              key={idx}
              suggestion={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
            />
          ))}
        </div>
      )}

      {/* Main input bar */}
      <div
        className={clsx(
          'bg-white rounded-2xl shadow-2xl border border-gray-200',
          'transition-all duration-200',
          isExpanded && 'ring-2 ring-blue-500 ring-opacity-50'
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <Sparkles className={clsx(
            'w-5 h-5 shrink-0',
            isProcessing ? 'text-blue-500 animate-pulse' : 'text-gray-400'
          )} />
          
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isProcessing}
            className={clsx(
              'flex-1 bg-transparent outline-none',
              'text-gray-700 placeholder:text-gray-400',
              'text-sm'
            )}
          />

          <button
            onClick={() => handleSubmit(input)}
            disabled={!input.trim() || isProcessing}
            className={clsx(
              'p-2 rounded-full transition-all duration-150',
              input.trim() && !isProcessing
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-400'
            )}
          >
            {isProcessing 
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </div>

        {/* Keyboard hint */}
        {isExpanded && (
          <div className="px-4 pb-2 flex items-center gap-4 text-xs text-gray-400">
            <span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">Enter</kbd>
              {' '}to send
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">Esc</kbd>
              {' '}to minimize
            </span>
          </div>
        )}
      </div>

      {/* Click outside to minimize */}
      {isExpanded && (
        <div 
          className="fixed inset-0 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};

export default CommandBar;
