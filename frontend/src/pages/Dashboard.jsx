import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  HelpCircle, 
  Printer, 
  Users, 
  FileSpreadsheet, 
  TrendingUp, 
  Plus, 
  Clock, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard statistics.');
        }
        const data = await response.json();
        setStats(data.stats);
        setActivities(data.recentActivity);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 w-64 bg-slate-800 rounded"></div>
          <div className="h-10 w-36 bg-slate-800 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-900 border border-slate-800 rounded-xl p-6"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-900 border border-slate-800 rounded-xl"></div>
          <div className="h-96 bg-slate-900 border border-slate-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Dashboard <Sparkles className="h-6 w-6 text-indigo-400" />
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time analytics and curriculum generation management.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/documents"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-900/10 transition-all"
          >
            <Plus className="h-4 w-4" />
            Upload Document
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-800 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Main KPI Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Documents" 
          value={stats?.totalDocuments || 0} 
          icon={FileText} 
          color="indigo" 
          description="Uploaded lectures & notes"
        />
        <StatCard 
          title="AI Quizzes" 
          value={stats?.totalQuizzes || 0} 
          icon={HelpCircle} 
          color="cyan" 
          description={`${stats?.publishedAssessments || 0} published assessments`}
        />
        <StatCard 
          title="Question Papers" 
          value={stats?.totalQuestionPapers || 0} 
          icon={Printer} 
          color="emerald" 
          description="Structured printable exams"
        />
        <StatCard 
          title="Average Score" 
          value={`${stats?.averageScore || 0}%`} 
          icon={TrendingUp} 
          color="violet" 
          description={`From ${stats?.totalAttempts || 0} total submissions`}
        />
      </div>

      {/* Layout Split: Left Main Charts/Insights, Right Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Section: Platform Overview (Visual Charts) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Assessment Trends</h3>
            <p className="text-slate-400 text-xs mt-0.5">Statistical insights of student exam submissions.</p>
          </div>
          
          <div className="h-64 flex items-end gap-3 px-4 pt-8 pb-2">
            {/* Visual SVG Placeholder Chart representing grading distribution or attempt frequency */}
            <div className="w-full flex flex-col items-center gap-2">
              <div className="w-full bg-slate-950/50 border border-slate-800 rounded-xl h-40 relative flex items-end p-2">
                <div className="w-[12%] mx-auto bg-indigo-500 rounded-t h-[20%]"></div>
                <div className="w-[12%] mx-auto bg-indigo-500 rounded-t h-[45%]"></div>
                <div className="w-[12%] mx-auto bg-indigo-500 rounded-t h-[75%]"></div>
                <div className="w-[12%] mx-auto bg-indigo-650 rounded-t h-[90%]"></div>
                <div className="w-[12%] mx-auto bg-indigo-500 rounded-t h-[60%]"></div>
                <div className="w-[12%] mx-auto bg-indigo-500 rounded-t h-[35%]"></div>
              </div>
              <span className="text-xs text-slate-100 font-semibold">Weekly Attempt Metrics</span>
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-slate-800 pt-6 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{stats?.totalStudents || 0}</p>
              <p className="text-xs text-slate-500 font-medium uppercase mt-1">Participants</p>
            </div>
            <div className="border-x border-slate-800">
              <p className="text-2xl font-bold text-white">{stats?.totalAttempts || 0}</p>
              <p className="text-xs text-slate-500 font-medium uppercase mt-1">Total Submissions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">
                {stats?.totalAttempts > 0 ? ((stats.publishedAssessments / stats.totalQuizzes) * 100).toFixed(0) : 0}%
              </p>
              <p className="text-xs text-slate-500 font-medium uppercase mt-1">Publish Ratio</p>
            </div>
          </div>
        </div>

        {/* Right Section: Recent System Activities */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white">Recent Activity</h3>
            <p className="text-slate-400 text-xs mt-0.5">Real-time log of administrator actions.</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {activities.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <Clock className="h-8 w-8 text-slate-600" />
                <p className="text-sm font-medium text-slate-400">No activity yet</p>
                <p className="text-xs text-slate-500">Your documents & quiz generation logs will appear here.</p>
              </div>
            ) : (
              activities.map((act, index) => (
                <div key={index} className="flex gap-3 items-start text-sm border-b border-slate-800/60 pb-3 last:border-b-0">
                  <div className={`p-2 rounded-lg ${
                    act.type === 'document' ? 'bg-indigo-950 text-indigo-400' : 'bg-cyan-950 text-cyan-400'
                  }`}>
                    {act.type === 'document' ? <FileText className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 font-medium truncate">{act.message}</p>
                    <p className="text-slate-500 text-xs mt-1">
                      {new Date(act.date).toLocaleDateString()} at {new Date(act.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {activities.length > 0 && (
            <Link
              to="/documents"
              className="mt-6 flex items-center justify-center gap-1 text-xs text-indigo-400 font-semibold hover:text-indigo-300 transition-colors"
            >
              Manage study materials <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>

      </div>
    </div>
  );
};

// Internal reusable KPI card component
const StatCard = ({ title, value, icon: Icon, color, description }) => {
  const colorMap = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-650',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-650',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-650',
    violet: 'bg-purple-50 border-purple-200 text-purple-650'
  };

  return (
    <div className={`p-6 bg-slate-905 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg`}>
      <div className="flex justify-between items-start">
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-xl border ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
        <p className="text-slate-500 text-xs mt-1 font-medium truncate">{description}</p>
      </div>
    </div>
  );
};

export default Dashboard;
