import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Award, 
  Clock, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  AlertCircle, 
  TrendingUp, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp,
  Loader2,
  BookmarkCheck,
  FileText,
  Sparkles
} from 'lucide-react';

const StudentQuizResult = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [practiceLoading, setPracticeLoading] = useState(false);
  
  // Accordion state to collapse/expand single question reviews
  const [expandedAnswers, setExpandedAnswers] = useState(new Set());

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchResults = async () => {
      try {
        const response = await fetch(`/api/public/attempts/${attemptId}/result`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch results.');
        setResult(data);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Could not retrieve scorecard details.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [attemptId, token]);

  const toggleExpand = (qId) => {
    setExpandedAnswers(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm font-semibold">Calculating your final score...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-full w-fit mx-auto">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Result Not Loaded</h3>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">{error || 'Score report is not ready yet.'}</p>
          </div>
          <button 
            onClick={() => navigate('/')} 
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Return to Entrance
          </button>
        </div>
      </div>
    );
  }

  const { attempt, student, quiz, answers } = result;

  // 1. Calculate Statistics Counts
  const mcqTfAnswers = answers.filter(a => a.type !== 'SHORT_ANSWER');
  const totalGraded = mcqTfAnswers.length;
  const correctCount = mcqTfAnswers.filter(a => a.isCorrect).length;
  const wrongCount = mcqTfAnswers.filter(a => a.isCorrect === false && a.studentAnswer).length;
  const unansweredCount = mcqTfAnswers.filter(a => !a.studentAnswer).length;

  const hasShortAnswers = answers.some(a => a.type === 'SHORT_ANSWER');
  const shortAnswerCount = answers.filter(a => a.type === 'SHORT_ANSWER').length;

  // 2. Compute Topic-wise analysis dynamically
  const topicGroups = {};
  answers.forEach(ans => {
    const topic = ans.topic || 'General';
    if (!topicGroups[topic]) {
      topicGroups[topic] = { total: 0, correct: 0, possibleMarks: 0, obtainedMarks: 0 };
    }
    
    topicGroups[topic].total++;
    
    if (ans.type !== 'SHORT_ANSWER') {
      topicGroups[topic].possibleMarks += ans.maxMarks;
      if (ans.isCorrect) {
        topicGroups[topic].correct++;
        topicGroups[topic].obtainedMarks += ans.maxMarks;
      } else if (ans.marksObtained) {
        topicGroups[topic].obtainedMarks += ans.marksObtained; // handles negative marks
      }
    } else {
      // Short answer pending marks are null, don't count in initial topic math
    }
  });

  const topicPerformance = Object.entries(topicGroups).map(([name, data]) => {
    const pct = data.possibleMarks > 0 
      ? Math.max(0, Math.min(100, Math.floor((data.obtainedMarks / data.possibleMarks) * 100)))
      : 100; // default for short answers topics initially
    return { name, ...data, percentage: pct };
  });

  const isPassed = attempt.percentage >= quiz.passingPercentage;
  const isUnderReview = attempt.status === 'UNDER_REVIEW';

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Top Header Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -left-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-4 text-center md:text-left flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Assessment Complete</span>
              {isUnderReview ? (
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-950 text-amber-400 border border-amber-900/40">
                  Pending Educator Review
                </span>
              ) : isPassed ? (
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-900/45">
                  Passed (Passed)
                </span>
              ) : (
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-red-950 text-red-400 border border-red-900/40">
                  Failed (Below Threshold)
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">{quiz.title}</h1>
            <p className="text-slate-400 text-xs sm:text-sm font-medium">
              Student: <span className="text-slate-200">{student.name}</span> 
              {student.studentId && <span> • ID: {student.studentId}</span>}
            </p>
          </div>

          {/* Big Circular Score box */}
          <div className="flex flex-col items-center shrink-0">
            <div className={`h-32 w-32 rounded-full border-4 flex flex-col items-center justify-center shadow-lg relative ${
              isUnderReview ? 'border-amber-500/30' : isPassed ? 'border-emerald-500/40' : 'border-red-500/30'
            }`}>
              <span className="text-3xl font-black text-white">{attempt.percentage.toFixed(0)}%</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">
                {attempt.score.toFixed(1)} / {mcqTfAnswers.reduce((sum, a) => sum + a.maxMarks, 0)} pts
              </span>
            </div>
          </div>
        </div>

        {/* Short answer notice alert */}
        {isUnderReview && (
          <div className="bg-amber-950/20 border border-amber-800 text-amber-300 p-4 rounded-2xl flex items-start gap-3 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className="font-semibold text-white">Manual Grading Pending</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                This assessment contains {shortAnswerCount} short-answer question(s). Your score reflects only the auto-graded questions (MCQ & True/False). The final score and pass/fail decision will update once the educator evaluates your written answers.
              </p>
            </div>
          </div>
        )}

        {/* Summary stats grids */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <ScoreStat title="Auto Correct" value={correctCount} color="emerald" icon={CheckCircle} />
          <ScoreStat title="Auto Incorrect" value={wrongCount} color="red" icon={XCircle} />
          <ScoreStat title="Unanswered" value={unansweredCount} color="gray" icon={HelpCircle} />
          <ScoreStat title="Duration Taken" value={formatDuration(attempt.durationSeconds)} color="indigo" icon={Clock} />
        </div>

        {/* Layout split: Left Topic performance list, Right detailed question review */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Topic Performance Bar metrics */}
          <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 h-fit space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Topic Performance</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Summary of correctness grouped by category.</p>
            </div>

            <div className="space-y-4">
              {topicPerformance.map((topic, index) => (
                <div key={index} className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-300 truncate max-w-[150px]">{topic.name}</span>
                    <span className="text-slate-400">{topic.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                    <div 
                      className={`h-full rounded-full ${
                        topic.percentage >= quiz.passingPercentage ? 'bg-indigo-500' : 'bg-slate-700'
                      }`}
                      style={{ width: `${topic.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={async () => {
                try {
                  setPracticeLoading(true);
                  const res = await fetch('/api/practice/weak-topics/generate', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ count: 10 })
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error || 'Failed to generate practice quiz.');
                  navigate(`/quiz/${json.shareCode}`);
                } catch (err) {
                  alert(err.message);
                } finally {
                  setPracticeLoading(false);
                }
              }}
              disabled={practiceLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition disabled:opacity-50"
            >
              {practiceLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-300" />
              )}
              <span>Practice My Weak Topics</span>
            </button>
          </div>

          {/* Question List Review (Collapsible Accordion layout) */}
          <div className="md:col-span-2 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Question Review</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Explore each answer correctness and detailed explanations.</p>
            </div>

            <div className="space-y-3.5">
              {answers.map((ans, idx) => {
                const isOpen = expandedAnswers.has(ans.questionId);
                const isShort = ans.type === 'SHORT_ANSWER';

                let borderClass = 'border-slate-800';
                if (!isShort) {
                  borderClass = ans.isCorrect ? 'border-emerald-950 bg-emerald-950/5' : 'border-red-950 bg-red-950/5';
                } else {
                  borderClass = 'border-slate-800 bg-slate-900/50';
                }

                return (
                  <div key={ans.questionId} className={`border rounded-2xl p-4 sm:p-5 transition-all ${borderClass}`}>
                    
                    {/* Compact accordion header row */}
                    <div 
                      onClick={() => toggleExpand(ans.questionId)}
                      className="flex justify-between items-start gap-4 cursor-pointer"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2 items-center text-[10px] font-semibold text-slate-500 uppercase">
                          <span className="font-bold text-indigo-400">Q{idx + 1}</span>
                          <span>{ans.type}</span>
                          <span>•</span>
                          <span className="truncate max-w-[120px]">{ans.topic}</span>
                        </div>
                        <p className="text-sm font-semibold text-white leading-relaxed">{ans.questionText}</p>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0 mt-1">
                        {isShort ? (
                          <span className="text-[10px] font-bold bg-amber-950/40 border border-amber-900/30 text-amber-400 px-2 py-0.5 rounded">
                            Pending
                          </span>
                        ) : ans.isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                        )}
                        {isOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                      </div>
                    </div>

                    {/* Expandable answers body details */}
                    {isOpen && (
                      <div className="mt-4 pt-4 border-t border-slate-800/60 space-y-4 text-xs animate-slide-down">
                        
                        {/* MCQ options displays */}
                        {ans.type === 'MCQ' && ans.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {ans.options.map((opt, optIdx) => {
                              const letter = String.fromCharCode(65 + optIdx);
                              const isStudentSelected = ans.studentAnswer === opt;
                              const isCorrectOption = ans.correctAnswer === opt;

                              let optClass = 'bg-slate-950/40 border-slate-900 text-slate-500';
                              if (isStudentSelected) {
                                optClass = ans.isCorrect 
                                  ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400 font-medium' 
                                  : 'bg-red-950/20 border-red-900/40 text-red-400 font-medium';
                              }
                              if (isCorrectOption && !ans.isCorrect && quiz.revealAnswers) {
                                optClass = 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400 font-medium';
                              }

                              return (
                                <div key={optIdx} className={`p-2.5 rounded-lg border text-[11px] leading-normal flex items-start gap-2 ${optClass}`}>
                                  <span className="font-bold shrink-0">{letter}.</span>
                                  <span>{opt}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Truth values */}
                        {ans.type === 'TRUE_FALSE' && (
                          <div className="space-y-1">
                            <span className="text-slate-500 uppercase font-semibold">Your Selection</span>
                            <p className={`font-semibold ${ans.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                              {ans.studentAnswer || 'Unanswered'}
                            </p>
                          </div>
                        )}

                        {/* Written details for short answers */}
                        {isShort && (
                          <div className="space-y-2">
                            <div>
                              <span className="text-slate-500 uppercase font-semibold">Your Written Response</span>
                              <p className="text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 leading-relaxed font-mono mt-1">
                                {ans.studentAnswer || 'Unanswered'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Answers reveal & Explanations */}
                        {quiz.revealAnswers && (
                          <div className="space-y-3 pt-3 border-t border-slate-800/40 bg-slate-950/20 p-3 rounded-xl">
                            {!isShort && (
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase font-semibold">Correct Answer</span>
                                <p className="text-emerald-400 font-semibold mt-0.5">{ans.correctAnswer}</p>
                              </div>
                            )}

                            {isShort && ans.correctAnswer && (
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase font-semibold">Grounded Reference Keywords</span>
                                <p className="text-indigo-400 font-mono mt-0.5">{ans.correctAnswer}</p>
                              </div>
                            )}

                            {ans.explanation && (
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase font-semibold">Explanation Details</span>
                                <p className="text-slate-400 leading-relaxed mt-0.5">{ans.explanation}</p>
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

// Reusable stat item card
const ScoreStat = ({ title, value, color, icon: Icon }) => {
  const colorMap = {
    emerald: 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400',
    red: 'bg-red-950/20 border-red-900/30 text-red-400',
    gray: 'bg-slate-900/60 border-slate-800 text-slate-400',
    indigo: 'bg-indigo-950/20 border-indigo-900/30 text-indigo-400'
  };

  return (
    <div className={`p-5 rounded-2xl border ${colorMap[color]} shadow flex items-center gap-3.5`}>
      <Icon className="h-8 w-8 shrink-0 opacity-80" />
      <div>
        <p className="text-[10px] font-semibold uppercase opacity-60 tracking-wider">{title}</p>
        <p className="text-xl font-bold text-white tracking-tight mt-0.5">{value}</p>
      </div>
    </div>
  );
};

export default StudentQuizResult;
