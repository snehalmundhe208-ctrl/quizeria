import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Database, 
  HelpCircle, 
  Printer, 
  FileSpreadsheet, 
  BarChart3, 
  Settings, 
  LogOut,
  GraduationCap,
  Users,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const getNavItems = () => {
    if (user?.role === 'ADMIN') {
      return [
        { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Teachers', path: '/admin/teachers', icon: Users },
        { name: 'My Profile', path: '/profile', icon: User },
        { name: 'Settings', path: '/settings', icon: Settings },
      ];
    }
    if (user?.role === 'STUDENT') {
      return [
        { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
        { name: 'Join Quiz', path: '/student/join', icon: HelpCircle },
        { name: 'My Profile', path: '/profile', icon: User },
      ];
    }
    // Teacher/Educator items
    return [
      { name: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
      { name: 'Documents', path: '/documents', icon: FileText },
      { name: 'Question Bank', path: '/questions', icon: Database },
      { name: 'Quizzes', path: '/quizzes', icon: HelpCircle },
      { name: 'Question Papers', path: '/question-papers', icon: Printer },
      { name: 'Attempts', path: '/attempts', icon: FileSpreadsheet },
      { name: 'Analytics', path: '/analytics', icon: BarChart3 },
      { name: 'My Profile', path: '/profile', icon: User },
      { name: 'Settings', path: '/settings', icon: Settings },
    ];
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen sticky top-0 border-r border-slate-800">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <GraduationCap className="h-8 w-8 text-indigo-400" />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">StudyForge AI</h1>
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            {user?.role || 'Educator'} Panel
          </span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-indigo-650 bg-indigo-600 text-white shadow-md shadow-indigo-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400">
            {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
          </div>
          <div className="truncate">
            <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
            <p className="text-xs text-slate-400 truncate">Logged in</p>
          </div>
        </div>
        
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-all"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
