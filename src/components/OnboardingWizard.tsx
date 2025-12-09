import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Film, 
  List, 
  Calendar,
  Settings,
  FileText,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import clsx from 'clsx';
import type { MilestoneType } from '../types';

interface OnboardingData {
  // Step 1: Project Basics
  projectName: string;
  projectCode: string;
  seasonNumber: number | null;
  startDate: string;
  targetDeliveryDate: string;
  
  // Step 2: Episodes
  episodeCount: number;
  episodePrefix: string;
  episodeStartNumber: number;
  defaultEditor: string;
  
  // Step 3: Milestone Types
  milestoneTypes: Array<{
    code: string;
    name: string;
    sortOrder: number;
    isHardDeadline: boolean;
    requiresCompletionOf: string[];
    color?: string;
  }>;
  
  // Step 4: Settings
  workWeekDays: number[];
  timezone: string;
}

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OnboardingData) => Promise<void>;
}

const MILESTONE_TEMPLATES = {
  streaming: [
    { code: 'EC', name: "Editor's Cut", sortOrder: 1, requiresCompletionOf: [] },
    { code: 'DC', name: "Director's Cut", sortOrder: 2, requiresCompletionOf: ['EC'] },
    { code: 'PC', name: "Producer's Cut", sortOrder: 3, requiresCompletionOf: ['DC'] },
    { code: 'SC', name: "Studio Cut", sortOrder: 4, requiresCompletionOf: ['PC'] },
    { code: 'FPL', name: 'Final Picture Lock', sortOrder: 5, requiresCompletionOf: ['SC'], isHardDeadline: true },
    { code: 'M/S', name: 'Music/Sound Spotting', sortOrder: 6, requiresCompletionOf: ['FPL'] },
    { code: 'CC', name: 'Color Correction', sortOrder: 7, requiresCompletionOf: ['FPL'] },
    { code: 'MIX', name: 'Final Mix', sortOrder: 8, requiresCompletionOf: ['M/S', 'CC'] },
    { code: 'QC', name: 'Quality Control', sortOrder: 9, requiresCompletionOf: ['MIX'] },
    { code: 'D', name: 'Delivery', sortOrder: 10, requiresCompletionOf: ['QC'], isHardDeadline: true },
  ],
  broadcast: [
    { code: 'EC', name: "Editor's Cut", sortOrder: 1, requiresCompletionOf: [] },
    { code: 'DC', name: "Director's Cut", sortOrder: 2, requiresCompletionOf: ['EC'] },
    { code: 'PC', name: "Producer's Cut", sortOrder: 3, requiresCompletionOf: ['DC'] },
    { code: 'NC', name: 'Network Cut', sortOrder: 4, requiresCompletionOf: ['PC'] },
    { code: 'FPL', name: 'Final Picture Lock', sortOrder: 5, requiresCompletionOf: ['NC'], isHardDeadline: true },
    { code: 'MIX', name: 'Final Mix', sortOrder: 6, requiresCompletionOf: ['FPL'] },
    { code: 'D', name: 'Delivery', sortOrder: 7, requiresCompletionOf: ['MIX'], isHardDeadline: true },
  ],
  roughFine: [
    { code: 'RC1', name: 'Rough Cut 1', sortOrder: 1, requiresCompletionOf: [] },
    { code: 'RC2', name: 'Rough Cut 2', sortOrder: 2, requiresCompletionOf: ['RC1'] },
    { code: 'FC1', name: 'Fine Cut 1', sortOrder: 3, requiresCompletionOf: ['RC2'] },
    { code: 'FC2', name: 'Fine Cut 2', sortOrder: 4, requiresCompletionOf: ['FC1'] },
    { code: 'LOCK', name: 'Picture Lock', sortOrder: 5, requiresCompletionOf: ['FC2'], isHardDeadline: true },
    { code: 'MIX', name: 'Final Mix', sortOrder: 6, requiresCompletionOf: ['LOCK'] },
    { code: 'CC', name: 'Color Correction', sortOrder: 7, requiresCompletionOf: ['LOCK'] },
    { code: 'D', name: 'Delivery', sortOrder: 8, requiresCompletionOf: ['MIX', 'CC'], isHardDeadline: true },
  ],
  minimal: [
    { code: 'CUT', name: 'Cut', sortOrder: 1, requiresCompletionOf: [] },
    { code: 'LOCK', name: 'Lock', sortOrder: 2, requiresCompletionOf: ['CUT'], isHardDeadline: true },
    { code: 'FINISH', name: 'Finishing', sortOrder: 3, requiresCompletionOf: ['LOCK'] },
    { code: 'DELIVER', name: 'Delivery', sortOrder: 4, requiresCompletionOf: ['FINISH'], isHardDeadline: true },
  ]
};

const MILESTONE_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Green
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#14B8A6', // Teal
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    projectName: '',
    projectCode: '',
    seasonNumber: null,
    startDate: '',
    targetDeliveryDate: '',
    episodeCount: 10,
    episodePrefix: '',
    episodeStartNumber: 1,
    defaultEditor: '',
    milestoneTypes: [],
    workWeekDays: [1, 2, 3, 4, 5], // Monday-Friday
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const totalSteps = 5;

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadTemplate = (templateKey: keyof typeof MILESTONE_TEMPLATES) => {
    const template = MILESTONE_TEMPLATES[templateKey];
    updateData({
      milestoneTypes: template.map((mt, idx) => ({
        ...mt,
        isHardDeadline: mt.isHardDeadline || false,
        color: MILESTONE_COLORS[idx % MILESTONE_COLORS.length],
      }))
    });
  };

  const addMilestoneType = () => {
    const newOrder = data.milestoneTypes.length > 0
      ? Math.max(...data.milestoneTypes.map(mt => mt.sortOrder)) + 1
      : 1;
    
    updateData({
      milestoneTypes: [
        ...data.milestoneTypes,
        {
          code: '',
          name: '',
          sortOrder: newOrder,
          isHardDeadline: false,
          requiresCompletionOf: [],
          color: MILESTONE_COLORS[data.milestoneTypes.length % MILESTONE_COLORS.length],
        }
      ]
    });
  };

  const removeMilestoneType = (index: number) => {
    updateData({
      milestoneTypes: data.milestoneTypes.filter((_, i) => i !== index)
    });
  };

  const updateMilestoneType = (index: number, updates: Partial<OnboardingData['milestoneTypes'][0]>) => {
    const updated = [...data.milestoneTypes];
    updated[index] = { ...updated[index], ...updates };
    updateData({ milestoneTypes: updated });
  };

  const toggleWorkDay = (day: number) => {
    const days = data.workWeekDays.includes(day)
      ? data.workWeekDays.filter(d => d !== day)
      : [...data.workWeekDays, day].sort();
    updateData({ workWeekDays: days });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create New Project</h2>
            <p className="text-sm text-gray-500 mt-1">Step {currentStep} of {totalSteps}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-8 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={clsx(
                  'flex-1 h-2 rounded-full transition-colors',
                  i + 1 < currentStep && 'bg-blue-500',
                  i + 1 === currentStep && 'bg-blue-300',
                  i + 1 > currentStep && 'bg-gray-200'
                )}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Step 1: Project Basics */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Film className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Project Basics</h3>
                  <p className="text-sm text-gray-500">Tell us about your project</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={data.projectName}
                    onChange={(e) => updateData({ projectName: e.target.value })}
                    placeholder="e.g., The Great Show"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Code
                  </label>
                  <input
                    type="text"
                    value={data.projectCode}
                    onChange={(e) => updateData({ projectCode: e.target.value.toUpperCase() })}
                    placeholder="e.g., TGS"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Season Number
                  </label>
                  <input
                    type="number"
                    value={data.seasonNumber || ''}
                    onChange={(e) => updateData({ seasonNumber: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="e.g., 1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={data.startDate}
                    onChange={(e) => updateData({ startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Delivery Date
                  </label>
                  <input
                    type="date"
                    value={data.targetDeliveryDate}
                    onChange={(e) => updateData({ targetDeliveryDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Episodes */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <List className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Episodes</h3>
                  <p className="text-sm text-gray-500">Configure episode numbering and defaults</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Episodes *
                  </label>
                  <input
                    type="number"
                    value={data.episodeCount}
                    onChange={(e) => updateData({ episodeCount: parseInt(e.target.value) || 0 })}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Episode Prefix
                  </label>
                  <input
                    type="text"
                    value={data.episodePrefix}
                    onChange={(e) => updateData({ episodePrefix: e.target.value })}
                    placeholder="e.g., EP or S03E"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Starting Episode Number
                  </label>
                  <input
                    type="number"
                    value={data.episodeStartNumber}
                    onChange={(e) => updateData({ episodeStartNumber: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Episodes will be numbered: {data.episodePrefix}{data.episodeStartNumber}, {data.episodePrefix}{data.episodeStartNumber + 1}, ...
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Editor
                  </label>
                  <input
                    type="text"
                    value={data.defaultEditor}
                    onChange={(e) => updateData({ defaultEditor: e.target.value })}
                    placeholder="e.g., John Smith"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Milestone Types */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">Milestone Types</h3>
                  <p className="text-sm text-gray-500">Define your cut names and workflow</p>
                </div>
              </div>

              {/* Templates */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Quick Templates
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => loadTemplate('streaming')}
                    className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Streaming Drama
                  </button>
                  <button
                    onClick={() => loadTemplate('broadcast')}
                    className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Broadcast Comedy
                  </button>
                  <button
                    onClick={() => loadTemplate('roughFine')}
                    className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Rough/Fine Cut
                  </button>
                  <button
                    onClick={() => loadTemplate('minimal')}
                    className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Minimal
                  </button>
                </div>
              </div>

              {/* Milestone Types List */}
              <div className="space-y-4">
                {data.milestoneTypes.map((mt, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Code *
                        </label>
                        <input
                          type="text"
                          value={mt.code}
                          onChange={(e) => updateMilestoneType(index, { code: e.target.value.toUpperCase() })}
                          placeholder="RC1, FC2, EC, etc."
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Short code (e.g., RC1, FC2)</p>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={mt.name}
                          onChange={(e) => updateMilestoneType(index, { name: e.target.value })}
                          placeholder="Rough Cut 1, Fine Cut 2, Editor's Cut, etc."
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Full name (e.g., Rough Cut 1)</p>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => removeMilestoneType(index)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={mt.isHardDeadline}
                          onChange={(e) => updateMilestoneType(index, { isHardDeadline: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-700">Hard Deadline</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-700">Color:</label>
                        <input
                          type="color"
                          value={mt.color || '#6B7280'}
                          onChange={(e) => updateMilestoneType(index, { color: e.target.value })}
                          className="w-8 h-8 rounded border border-gray-300"
                        />
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <label className="text-xs text-gray-700">Order:</label>
                        <input
                          type="number"
                          value={mt.sortOrder}
                          onChange={(e) => updateMilestoneType(index, { sortOrder: parseInt(e.target.value) || 1 })}
                          min="1"
                          className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addMilestoneType}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Milestone Type
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Settings */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Settings className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Settings</h3>
                  <p className="text-sm text-gray-500">Configure work schedule and preferences</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Work Week Days
                </label>
                <div className="flex gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <button
                      key={index}
                      onClick={() => toggleWorkDay(index)}
                      className={clsx(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        data.workWeekDays.includes(index)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={data.timezone}
                  onChange={(e) => updateData({ timezone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Check className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Review & Create</h3>
                  <p className="text-sm text-gray-500">Review your project settings</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Project</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Name:</span> {data.projectName || '—'}</p>
                    <p><span className="font-medium">Code:</span> {data.projectCode || '—'}</p>
                    {data.seasonNumber && (
                      <p><span className="font-medium">Season:</span> {data.seasonNumber}</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Episodes</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Count:</span> {data.episodeCount}</p>
                    <p><span className="font-medium">Numbering:</span> {data.episodePrefix}{data.episodeStartNumber} - {data.episodePrefix}{data.episodeStartNumber + data.episodeCount - 1}</p>
                    {data.defaultEditor && (
                      <p><span className="font-medium">Default Editor:</span> {data.defaultEditor}</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Milestone Types</h4>
                  <div className="text-sm text-gray-600">
                    {data.milestoneTypes.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {data.milestoneTypes.map((mt, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 rounded text-white text-xs"
                            style={{ backgroundColor: mt.color || '#6B7280' }}
                          >
                            {mt.code}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400">No milestone types defined</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={currentStep === 1 ? onClose : handleBack}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>

          <div className="flex items-center gap-3">
            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={!data.projectName || (currentStep === 3 && data.milestoneTypes.length === 0)}
                className={clsx(
                  'px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
                  !data.projectName || (currentStep === 3 && data.milestoneTypes.length === 0)
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                )}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !data.projectName || data.milestoneTypes.length === 0}
                className={clsx(
                  'px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
                  isSubmitting || !data.projectName || data.milestoneTypes.length === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                )}
              >
                {isSubmitting ? 'Creating...' : 'Create Project'}
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;

