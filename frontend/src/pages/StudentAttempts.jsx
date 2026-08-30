import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  LogOut, 
  HelpCircle, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Loader2, 
  Eye,
  TrendingUp,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const StudentAttempts = () => {
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Join a Quiz States
  const [quizCodeInput, setQuizCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');

  const fetchAttempts = async () => {
    try {
      const response = await fetch('/api/public/attempts/my-attempts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to load quiz attempts history.');
      const data = await response.json();
      setAttempts(data.attempts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/student/login');
      return;
    }
    fetchAttempts();
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleJoinQuiz = (e) => {
    e.preventDefault();
    setJoinError('');
    if (!quizCodeInput.trim()) return;

    let code = quizCodeInput.trim();
    try {
      if (code.includes('/quiz/')) {
        const parts = code.split('/quiz/');
        if (parts.length > 1) {
          code = parts[1].split('/')[0].split('?')[0];
        }
      }
    } catch (err) {
      // fallback to original input
    }

    if (!code) {
      setJoinError('Could not parse a valid quiz code from your input.');
      return;
    }

    navigate(`/quiz/${code}`);
  };

  const getStatusBadge = (status, passed) => {
    if (status === 'STARTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase">
          <Clock className="h-3 w-3" /> In Progress
        </span>
      );
    }
    if (status === 'UNDER_REVIEW') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-600 rounded-full text-xs font-bold uppercase">
          <AlertCircle className="h-3 w-3" /> Under Review
        </span>
      );
    }
    if (passed) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold uppercase">
          <CheckCircle className="h-3 w-3" /> Passed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-bold uppercase">
        <XCircle className="h-3 w-3" /> Failed
      </span>
    );
  };

  // Stats Calculations (exclude in-progress and under review scores)
  const completedAttempts = attempts.filter(att => att.status !== 'STARTED' && att.status !== 'UNDER_REVIEW');
  const totalAttemptedCount = attempts.filter(att => att.status !== 'STARTED').length;
  const avgScore = completedAttempts.length > 0
    ? (completedAttempts.reduce((sum, att) => sum + att.percentage, 0) / completedAttempts.length).toFixed(1)
    : '0.0';
  const bestScore = completedAttempts.length > 0
    ? Math.max(...completedAttempts.map(att => att.percentage))
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-100 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Dashboard Nav */}
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-10 w-10 text-indigo-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Student Dashboard</h1>
              <p className="text-slate-400 text-xs mt-0.5">Logged in as {user?.name || user?.username}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-800 rounded-lg text-xs font-bold hover:bg-slate-800 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>

        {/* Summary Stat Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Quizzes Attempted</p>
              <h3 className="text-2xl font-bold text-white">{totalAttemptedCount}</h3>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 text-indigo-650 p-3 rounded-xl">
              <HelpCircle className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Average Score</p>
              <h3 className="text-2xl font-bold text-white">{avgScore}%</h3>
            </div>
            <div className="bg-cyan-50 border border-cyan-200 text-cyan-650 p-3 rounded-xl">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Best Score</p>
              <h3 className="text-2xl font-bold text-white">{bestScore}%</h3>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-650 p-3 rounded-xl">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Join a Quiz Section */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1 text-left">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400" /> Join a Quiz
              </h3>
              <p className="text-slate-400 text-xs">
                Have a share code or full link from your teacher? Paste it here to start immediately.
              </p>
            </div>
            <form onSubmit={handleJoinQuiz} className="w-full md:w-1/2 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="e.g. quiz_code or paste full link"
                value={quizCodeInput}
                onChange={(e) => setQuizCodeInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0"
              >
                Start Quiz <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
          {joinError && (
            <p className="text-red-400 text-xs font-semibold text-left">{joinError}</p>
          )}
        </div>

        {/* Content Board */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-6 border-b border-slate-800 pb-3">My Quiz Attempts</h2>

          {loading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="text-slate-400 text-xs font-semibold">Retrieving your assessment records...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-950/20 border border-red-800 text-red-300 rounded-xl text-xs">
              {error}
            </div>
          ) : attempts.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
              <HelpCircle className="h-12 w-12 text-slate-700" />
              <p className="text-sm font-semibold text-slate-400">No attempts logged yet</p>
              <p className="text-xs text-slate-500 max-w-sm">When you complete quizzes using shared student links, your history and score report cards will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase">
                    <th className="pb-3">Quiz Name</th>
                    <th className="pb-3 text-center">Attempt Date</th>
                    <th className="pb-3 text-center">Score Ratio</th>
                    <th className="pb-3 text-center">Percentage</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {attempts.map((att) => {
                    return (
                      <tr key={att.id} className="hover:bg-slate-800/10 transition-colors">
                        <td className="py-4 pr-3 max-w-[280px] truncate">
                          <p className="font-semibold text-slate-200 truncate">{att.quiz.title}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {att.id.substring(0, 8)}...</p>
                        </td>
                        <td className="py-4 text-center font-mono text-xs text-slate-300">
                          {new Date(att.startTime).toLocaleDateString()}
                        </td>
                        <td className="py-4 text-center font-mono text-slate-200">
                          {att.status === 'UNDER_REVIEW' ? (
                            <span className="text-slate-500 italic">Pending Review</span>
                          ) : (
                            <span className="text-indigo-300 font-bold">{att.score}</span>
                          )}
                        </td>
                        <td className="py-4 text-center font-mono font-bold text-slate-200">
                          {att.status === 'UNDER_REVIEW' ? (
                            <span className="text-slate-500">-</span>
                          ) : (
                            <span>{att.percentage}%</span>
                          )}
                        </td>
                        <td className="py-4 text-center">
                          {getStatusBadge(att.status, att.passed)}
                        </td>
                        <td className="py-4 text-right">
                          {att.status !== 'STARTED' ? (
                            <button
                              onClick={() => navigate(`/quiz/result/${att.id}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-indigo-400 text-xs font-bold rounded-lg transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" /> View Report
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Attempt active</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default StudentAttempts;
