import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Plus, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Loader2, 
  X, 
  UserPlus, 
  Send
} from 'lucide-react';

export default function Classes() {
  const { token } = useAuth();
  
  const [classesList, setClassesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newSection, setNewSection] = useState('');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch classes.');
      setClassesList(json.classes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newClassName,
          section: newSection,
          description: newDescription
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create class.');
      setSuccess(json.message);
      setIsCreateOpen(false);
      setNewClassName('');
      setNewSection('');
      setNewDescription('');
      fetchClasses();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Classes & Student Rosters</h1>
            <p className="text-sm text-slate-400 mt-1">
              Organize student sections, track student enrollments, and publish quiz assignments.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          Create New Class
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Classes Grid */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading class rosters...</p>
        </div>
      ) : classesList.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
          <Users className="w-10 h-10 text-indigo-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-200">No Classes Created Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Create your first class roster to group students and send targeted quiz assignments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classesList.map((cls) => (
            <div
              key={cls.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-6 space-y-4 shadow-lg flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="text-base font-bold text-slate-100">{cls.name}</h3>
                  {cls.section && (
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {cls.section}
                    </span>
                  )}
                </div>
                {cls.description && (
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {cls.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="text-slate-400 text-[11px]">Enrolled Students</div>
                  <div className="text-base font-bold text-slate-200 mt-1">
                    {cls._count?.students || 0}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="text-slate-400 text-[11px]">Assignments</div>
                  <div className="text-base font-bold text-indigo-400 mt-1">
                    {cls._count?.assignments || 0}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100">Create New Class Roster</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-semibold text-slate-400 uppercase">Class Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Science 101"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-slate-400 uppercase">Section / Cohort</label>
                <input
                  type="text"
                  placeholder="e.g. Section A (Fall 2026)"
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-slate-400 uppercase">Description</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Introduction to Operating Systems & Data Structures."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
