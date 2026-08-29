import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  ShieldAlert, 
  Loader2, 
  RefreshCw, 
  UserX, 
  UserCheck 
} from 'lucide-react';

const TeachersManagement = () => {
  const { token, user } = useAuth();

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/teachers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch teachers roster.');
      const data = await response.json();
      setTeachers(data.teachers);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [token]);

  const handleToggleStatus = async (teacherId, username) => {
    if (!confirm(`Are you sure you want to change the status of teacher "${username}"?`)) return;

    try {
      const response = await fetch(`/api/admin/teachers/${teacherId}/toggle`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to toggle status.');
      const data = await response.json();
      setSuccess(data.message);
      
      // Update local state
      setTeachers(prev => prev.map(t => {
        if (t.id === teacherId) {
          return { ...t, isActive: !t.isActive };
        }
        return t;
      }));

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100 min-h-screen">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Educator Management <Users className="h-7 w-7 text-indigo-400" />
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Activate, deactivate, and review registered teacher logins.
          </p>
        </div>
        <button
          onClick={fetchTeachers}
          className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-850 text-indigo-400 transition-colors"
          title="Refresh List"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {success && (
        <div className="bg-emerald-950/20 border border-emerald-800 text-emerald-300 p-3 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /> {success}
        </div>
      )}

      {error && (
        <div className="bg-red-950/20 border border-red-800 text-red-300 p-3 rounded-lg text-xs flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Roster table card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="text-slate-400 text-xs font-semibold">Loading teacher accounts...</p>
            </div>
          ) : teachers.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
              <Users className="h-12 w-12 text-slate-700" />
              <p className="text-sm font-semibold text-slate-400">No teachers registered yet</p>
              <p className="text-xs text-slate-500">Educators can self-register using the teacher sign-up link.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase">
                  <th className="pb-3">Teacher Email / Username</th>
                  <th className="pb-3 text-center">Registered Date</th>
                  <th className="pb-3 text-center">Documents</th>
                  <th className="pb-3 text-center">Quizzes</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="py-4 pr-3 max-w-[280px] truncate">
                      <p className="font-semibold text-slate-200 truncate">{t.username}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {t.id}</p>
                    </td>
                    <td className="py-4 text-center text-xs text-slate-300 font-mono">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 text-center text-slate-300 font-mono">{t._count.documents}</td>
                    <td className="py-4 text-center text-slate-300 font-mono">{t._count.quizzes}</td>
                    <td className="py-4 text-center">
                      {t.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold uppercase">
                          <CheckCircle className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-bold uppercase">
                          <XCircle className="h-3 w-3" /> Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(t.id, t.username)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-slate-800 ${
                          t.isActive
                            ? 'bg-slate-850 hover:bg-red-950/20 text-red-400 hover:text-red-300'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {t.isActive ? (
                          <>
                            <UserX className="h-3.5 w-3.5" /> Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3.5 w-3.5" /> Activate
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
};

export default TeachersManagement;
