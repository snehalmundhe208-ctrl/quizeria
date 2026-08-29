import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, 
  Users, 
  Award, 
  Clock, 
  HelpCircle, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  BookOpen
} from 'lucide-react';

const Analytics = () => {
  const { token } = useAuth();

  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [analytics, setAnalytics] = useState(null);
  
  const [loadingList, setLoadingList] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [error, setError] = useState('');

  const fetchQuizzes = async () => {
    try {
      const response = await fetch('/api/quizzes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load quizzes list.');
      const data = await response.json();
      setQuizzes(data.quizzes);
      if (data.quizzes.length > 0) {
        // Auto select first quiz to display data immediately
        setSelectedQuizId(data.quizzes[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Could not retrieve quiz parameters.');
    } finally {
      setLoadingList(false);
    }
  };

  const fetchAnalytics = async (quizId) => {
    if (!quizId) {
      setAnalytics(null);
      return;
    }
    setLoadingAnalytics(true);
    try {
      const response = await fetch(`/api/quizzes/${quizId}/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load quiz statistics.');
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
      setError('Failed to compute statistics for this assessment.');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, [token]);

  useEffect(() => {
    fetchAnalytics(selectedQuizId);
  }, [selectedQuizId]);

  const formatDuration = (secs) => {
    if (isNaN(secs)) return '0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100 relative min-h-screen">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Assessment Analytics <TrendingUp className="h-7 w-7 text-indigo-400" />
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track student performance, average scores, and identify weak learning concepts.
          </p>
        </div>

        {/* SELECT CONTROL */}
        {!loadingList && quizzes.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase">Assessment:</span>
            <select
              value={selectedQuizId}
              onChange={(e) => setSelectedQuizId(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none w-56 font-semibold"
            >
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>{q.title}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loadingList ? (
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-xs font-semibold">Retrieving quizzes feed...</p>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="py-16 text-center bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-3 p-6">
          <HelpCircle className="h-12 w-12 text-slate-700" />
          <p className="text-sm font-semibold text-slate-400">No quizzes generated yet</p>
          <p className="text-xs text-slate-500 max-w-sm">Create quizzes and share links with students to populate analytics.</p>
        </div>
      ) : (
        <>
          {loadingAnalytics ? (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="text-slate-400 text-xs font-semibold">Running database aggregates...</p>
            </div>
          ) : analytics && (
            <>
              {/* STATS HIGHLIGHTS GRID */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <MiniStat title="Total attempts" value={analytics.totalAttempts} color="indigo" icon={Users} />
                <MiniStat title="Average Score" value={`${analytics.averageScore}%`} color="indigo" icon={TrendingUp} />
                <MiniStat title="Highest Score" value={`${analytics.highestScore}%`} color="emerald" icon={Award} />
                <MiniStat title="Passing Rate" value={`${analytics.passRate}%`} color="indigo" icon={CheckCircle} />
                <MiniStat title="Avg Duration" value={formatDuration(analytics.averageDurationSeconds)} color="indigo" icon={Clock} />
              </div>

              {analytics.totalAttempts === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl py-16 text-center text-slate-400 p-6 flex flex-col items-center justify-center space-y-2">
                  <AlertCircle className="h-8 w-8 text-indigo-400" />
                  <p className="text-sm font-semibold text-slate-350">No submissions recorded yet</p>
                  <p className="text-xs text-slate-500 max-w-sm">Student attempts will show correct/incorrect ratios once they submit answers.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Left Column: Weak/Tough Questions (Accuracy lists) */}
                  <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                    <div>
                      <h3 className="text-md font-bold text-white uppercase tracking-wider">Item Analysis</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Accuracy scores per question to locate weak concepts.</p>
                    </div>

                    <div className="space-y-4">
                      {analytics.questionAnalytics.map((item, idx) => {
                        const isHard = item.accuracy < 50;
                        return (
                          <div key={item.questionId} className="flex gap-4 items-start bg-slate-950 border border-slate-850 p-4 rounded-2xl hover:border-slate-800 transition-colors">
                            <span className="h-6 w-6 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold font-mono text-slate-400 flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-200 leading-relaxed">{item.questionText}</p>
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mt-1">
                                {item.topic} • {item.type} • {item.difficulty}
                              </span>
                            </div>

                            {/* Accuracy badge */}
                            <div className="text-right shrink-0">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                isHard ? 'bg-red-950/40 text-red-400 border border-red-900/30' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30'
                              }`}>
                                {item.accuracy}% Acc
                              </span>
                              <span className="text-[9px] text-slate-500 block mt-1">({item.correctCount}/{item.answeredCount} pass)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Topic mastery breakdown list */}
                  <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 h-fit space-y-6">
                    <div>
                      <h3 className="text-md font-bold text-white uppercase tracking-wider">Concepts Mastery</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Topic average accuracy ratios.</p>
                    </div>

                    <div className="space-y-4">
                      {/* Compute dynamically in UI for cleaner code */}
                      {(() => {
                        const topicAcc = {};
                        analytics.questionAnalytics.forEach(q => {
                          const topic = q.topic || 'General';
                          if (!topicAcc[topic]) topicAcc[topic] = { correct: 0, total: 0 };
                          topicAcc[topic].correct += q.correctCount;
                          topicAcc[topic].total += q.answeredCount;
                        });

                        return Object.entries(topicAcc).map(([name, data]) => {
                          const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                          return (
                            <div key={name} className="space-y-1.5 text-xs">
                              <div className="flex justify-between font-semibold">
                                <span className="text-slate-300 truncate max-w-[150px]">{name}</span>
                                <span className="text-indigo-400">{pct}% Mastery</span>
                              </div>
                              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                                <div 
                                  className="h-full rounded-full bg-indigo-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                </div>
              )}
            </>
          )}
        </>
      )}

    </div>
  );
};

const MiniStat = ({ title, value, color, icon: Icon }) => {
  const colorMap = {
    indigo: 'bg-indigo-950/20 border-indigo-900/35 text-indigo-400',
    emerald: 'bg-emerald-950/20 border-emerald-900/35 text-emerald-400'
  };

  return (
    <div className={`p-4 rounded-xl border ${colorMap[color]} shadow-sm`}>
      <div className="flex justify-between items-start gap-2">
        <span className="text-[10px] font-bold uppercase opacity-60 tracking-wider leading-relaxed">{title}</span>
        <Icon className="h-4.5 w-4.5 shrink-0 opacity-70" />
      </div>
      <p className="text-lg font-black text-white tracking-tight mt-1.5">{value}</p>
    </div>
  );
};

export default Analytics;
