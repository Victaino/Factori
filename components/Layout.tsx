import React, { useState, useEffect } from 'react';
import { NAV_ITEMS, getPageTitle } from '../constants';
import type { NavItem } from '../constants';
import { ViewState } from '../types';
import { LayoutDashboard, ChevronDown, ChevronRight, Menu, X } from 'lucide-react';

interface LayoutProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, onNavigate, children }) => {
  // State to track expanded groups.
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  // State to track mobile menu visibility
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Automatically expand the group containing the current view
  useEffect(() => {
    const parentGroup = NAV_ITEMS.find(item => 
      item.children?.some(child => child.id === currentView)
    );
    if (parentGroup) {
      setExpandedGroups(prev => {
        if (!prev.includes(parentGroup.id)) {
          return [...prev, parentGroup.id];
        }
        return prev;
      });
    }
  }, [currentView]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId) 
        : [...prev, groupId]
    );
  };

  const handleNavigate = (view: ViewState) => {
    onNavigate(view);
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isActive = currentView === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedGroups.includes(item.id);
    const isChildActive = hasChildren && item.children?.some(c => c.id === currentView);

    if (hasChildren) {
      return (
        <div key={item.id} className="mb-1">
          <button
            onClick={() => toggleGroup(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors duration-200 ${
              isChildActive || isExpanded ? 'bg-slate-800/50 text-white' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </div>
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          
          {isExpanded && (
            <div className="mt-1 ml-4 border-l border-slate-700 pl-2 space-y-1">
              {item.children!.map(child => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => handleNavigate(item.id as ViewState)}
        className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors duration-200 mb-1 ${
          isActive 
            ? 'bg-primary-600 text-white shadow-md shadow-primary-900/30' 
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
      >
        {item.icon}
        <span className="font-medium text-sm">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 hidden md:flex flex-col transition-all duration-300 h-screen sticky top-0 border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3 flex-shrink-0">
          <div className="p-2 bg-primary-600 rounded-lg text-white">
            <LayoutDashboard size={24} />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Factori</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {NAV_ITEMS.map(item => renderNavItem(item))}
        </nav>
        
        <div className="p-6 border-t border-slate-800 flex-shrink-0 bg-slate-900">
          <p className="text-xs text-slate-500">Factori v1.1.0</p>
          <p className="text-xs text-slate-600 mt-1">Production System</p>
        </div>
      </aside>

      {/* Mobile Header (Visible on small screens) */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 z-50 p-4 flex justify-between items-center text-white shadow-md">
         <div className="flex items-center space-x-2">
           <div className="p-1.5 bg-primary-600 rounded">
             <LayoutDashboard size={18} />
           </div>
           <span className="font-bold text-lg">Factori</span>
         </div>
         <button 
           onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
           className="p-1 text-slate-300 hover:text-white focus:outline-none"
         >
           {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
         </button>
      </div>

      {/* Mobile Sidebar Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          
          {/* Sidebar Content */}
          <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-50 animate-in slide-in-from-left duration-200">
             <div className="p-6 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
               <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-600 rounded-lg text-white">
                    <LayoutDashboard size={24} />
                  </div>
                  <span className="text-xl font-bold text-white tracking-tight">Factori</span>
               </div>
               <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                 <X size={20} />
               </button>
             </div>
             
             <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {NAV_ITEMS.map(item => renderNavItem(item))}
             </nav>

             <div className="p-6 border-t border-slate-800 flex-shrink-0 bg-slate-900">
               <p className="text-xs text-slate-500">Factori v1.1.0</p>
               <p className="text-xs text-slate-600 mt-1">Mobile Access</p>
             </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen md:p-8 p-4 pt-20 md:pt-8 scroll-smooth dark:bg-slate-900 dark:text-gray-100">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8 flex justify-between items-end">
             <div>
               <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                 {getPageTitle(currentView)}
               </h1>
               <p className="text-gray-500 mt-1 dark:text-gray-400">Overview and management</p>
             </div>
             <div className="text-sm text-gray-500 hidden md:block dark:text-gray-400">
               {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
             </div>
          </header>
          
          <div className="animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};