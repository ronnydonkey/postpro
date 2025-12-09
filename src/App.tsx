import React, { useEffect } from 'react';
import { GanttTimeline } from './components/GanttTimeline';
import { CommandBar } from './components/CommandBar';
import { CalendarView } from './components/CalendarView';
import { GridView } from './components/GridView';
import { ListView } from './components/ListView';
import { usePostProStore } from './lib/store';
import { 
  Calendar, 
  LayoutGrid, 
  List, 
  GanttChart,
  Settings,
  Bell,
  Search,
  Plus,
  ChevronDown
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// Header Component
// ============================================================================

const Header: React.FC = () => {
  const { currentProject } = usePostProStore();
  
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">PP</span>
          </div>
          <span className="font-semibold text-gray-900">Post Pro</span>
        </div>
        
        {/* Project selector */}
        {currentProject && (
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <span className="text-sm font-medium text-gray-700">
              {currentProject.name}
              {currentProject.seasonNumber && ` S${currentProject.seasonNumber}`}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Search className="w-5 h-5 text-gray-500" />
        </button>
        <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Settings className="w-5 h-5 text-gray-500" />
        </button>
        
        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-gray-200 ml-2" />
      </div>
    </header>
  );
};

// ============================================================================
// Sidebar Component
// ============================================================================

const Sidebar: React.FC = () => {
  const { viewMode, setViewMode } = usePostProStore();
  
  const navItems = [
    { id: 'gantt', label: 'Timeline', icon: GanttChart },
    { id: 'grid', label: 'Grid', icon: LayoutGrid },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'list', label: 'Tasks', icon: List },
  ] as const;
  
  return (
    <aside className="w-16 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4 gap-2">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setViewMode(item.id)}
          className={clsx(
            'w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1',
            'transition-all duration-150',
            viewMode === item.id
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          )}
          title={item.label}
        >
          <item.icon className="w-5 h-5" />
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
      
      <div className="flex-1" />
      
      <button
        className={clsx(
          'w-12 h-12 rounded-xl flex items-center justify-center',
          'bg-blue-500 hover:bg-blue-600 text-white',
          'transition-colors shadow-lg shadow-blue-500/25'
        )}
        title="Add new"
      >
        <Plus className="w-6 h-6" />
      </button>
    </aside>
  );
};

// ============================================================================
// Main Content Area
// ============================================================================

const MainContent: React.FC = () => {
  const {
    viewMode,
    episodes,
    milestones,
    milestoneTypes,
    calendarEvents,
    workItems,
    dateRange,
    setDateRange,
    selectMilestone,
    processCommand
  } = usePostProStore();
  
  const handleCellClick = (episodeId: string, date: Date) => {
    console.log('Cell clicked:', episodeId, date);
    // Could open a quick-add dialog here
  };
  
  const handleMilestoneClick = (milestone: any) => {
    selectMilestone(milestone.id);
    // Could open a detail panel here
  };
  
  return (
    <main className="flex-1 overflow-hidden p-4 bg-gray-100">
      {viewMode === 'gantt' && (
        <GanttTimeline
          episodes={episodes}
          milestones={milestones}
          milestoneTypes={milestoneTypes}
          calendarEvents={calendarEvents}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onMilestoneClick={handleMilestoneClick}
          onCellClick={handleCellClick}
        />
      )}
      
      {viewMode === 'grid' && (
        <GridView
          episodes={episodes}
          milestones={milestones}
          milestoneTypes={milestoneTypes}
          onMilestoneClick={handleMilestoneClick}
        />
      )}
      
      {viewMode === 'calendar' && (
        <CalendarView
          episodes={episodes}
          milestones={milestones}
          milestoneTypes={milestoneTypes}
          calendarEvents={calendarEvents}
          onMilestoneClick={handleMilestoneClick}
          onDateClick={handleCellClick}
        />
      )}
      
      {viewMode === 'list' && (
        <ListView
          episodes={episodes}
          milestones={milestones}
          milestoneTypes={milestoneTypes}
          workItems={workItems}
          onMilestoneClick={handleMilestoneClick}
        />
      )}
      
      {/* Command Bar - floating at bottom */}
      <CommandBar onCommand={processCommand} />
    </main>
  );
};

// ============================================================================
// App Component
// ============================================================================

const App: React.FC = () => {
  const { loadDemoData, isLoading } = usePostProStore();
  
  // Load demo data on mount
  useEffect(() => {
    loadDemoData();
  }, [loadDemoData]);
  
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <MainContent />
      </div>
    </div>
  );
};

export default App;
