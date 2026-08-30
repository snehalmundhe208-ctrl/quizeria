import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Bookmark, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  RefreshCw,
  LogOut
} from 'lucide-react';

const StudentQuizTake = () => {
  const { shareCode, attemptId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { [questionId]: string }
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [currentIdx, setCurrentIdx] = useState(0);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [syncStatus, setSyncStatus] = useState('saved'); // 'saving' | 'saved' | 'error'
  const [error, setError] = useState('');
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(0); // seconds remaining
  const timerRef = useRef(null);
  const expiresAtRef = useRef(null);

  useEffect(() => {
    if (!token) {
      navigate(`/student/login?quizLink=${shareCode}`);
      return;
    }

    const loadAttempt = async () => {
      try {
        // 1. Try restoring session config from sessionStorage
        let cached = sessionStorage.getItem(`attempt_${attemptId}`);
        let targetQuestions = [];
        let targetExpiresAt = null;

        if (cached) {
          const parsed = JSON.parse(cached);
          targetQuestions = parsed.questions;
          targetExpiresAt = new Date(parsed.expiresAt);
        } else {
          // Fallback: recover session configuration from DB active attempt start request
          const startRes = await fetch(`/api/public/quiz/${shareCode}/start`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json' 
            }
          });
          if (startRes.ok) {
            const startData = await startRes.json();
            targetQuestions = startData.questions;
            targetExpiresAt = new Date(startData.expiresAt);
            sessionStorage.setItem(`attempt_${attemptId}`, JSON.stringify({
              expiresAt: startData.expiresAt,
              questions: startData.questions
            }));
          }
        }

        // 2. Fetch full details from public endpoint (includes active state checks)
        const response = await fetch(`/api/public/quiz/${shareCode}`);
        if (!response.ok) throw new Error('Failed to load quiz details.');
        const data = await response.json();
        setQuiz(data.quiz);

        if (targetQuestions.length === 0) {
          throw new Error('Attempt state missing. Please restart from landing page.');
        }

        setQuestions(targetQuestions);
        expiresAtRef.current = targetExpiresAt;

        // 3. Load already saved progress from server (if resuming attempt)
        const answersResponse = await fetch(`/api/public/attempts/${attemptId}/answers/load`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
          }
        });
        if (answersResponse.ok) {
          const answersData = await answersResponse.json();
          const loadedAnswers = {};
          answersData.answers.forEach(item => {
            loadedAnswers[item.questionId] = item.answer;
          });
          setAnswers(loadedAnswers);
        }

        // Initialize Timer
        calculateTimeRemaining();
        timerRef.current = setInterval(calculateTimeRemaining, 1000);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Access denied. Active attempt not found.');
      } finally {
        setLoading(false);
      }
    };

    loadAttempt();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [shareCode, attemptId]);

  const calculateTimeRemaining = () => {
    if (!expiresAtRef.current) return;
    const now = new Date();
    const diff = Math.floor((expiresAtRef.current.getTime() - now.getTime()) / 1000);
    
    if (diff <= 0) {
      setTimeLeft(0);
      clearInterval(timerRef.current);
      // Auto submit immediately on expiry
      handleAutoSubmit();
    } else {
      setTimeLeft(diff);
    }
  };

  // Perform auto-save on answer change
  const saveAnswerToServer = async (qId, val) => {
    setSyncStatus('saving');
    try {
      const response = await fetch(`/api/public/attempts/${attemptId}/answers`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          answers: [{ questionId: qId, answer: val }]
        })
      });
      if (!response.ok) throw new Error('Auto-save failed');
      setSyncStatus('saved');
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
    }
  };

  const handleSelectOption = (qId, optionText) => {
    setAnswers(prev => ({ ...prev, [qId]: optionText }));
    saveAnswerToServer(qId, optionText);
  };

  const handleTextChange = (qId, text) => {
    setAnswers(prev => ({ ...prev, [qId]: text }));
    // Debounce or immediately save on input change
    saveAnswerToServer(qId, text);
  };

  const toggleMarkedForReview = (qId) => {
    setMarkedForReview(prev => {
      const next = new Set(prev);
      if (next.has(qId)) {
        next.delete(qId);
      } else {
        next.add(qId);
      }
      return next;
    });
  };

  const handleAutoSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('Time expired! Submitting your answers automatically...');

    try {
      const response = await fetch(`/api/public/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([key, val]) => ({
            questionId: key,
            answer: val
          }))
        })
      });

      if (!response.ok) throw new Error('Auto-submit failed.');
      sessionStorage.removeItem(`attempt_${attemptId}`);
      navigate(`/quiz/result/${attemptId}`);
    } catch (err) {
      console.error(err);
      alert('Quiz expired. Answers were scored based on last synchronized progress.');
      navigate(`/quiz/result/${attemptId}`);
    }
  };

  const handleSubmitQuiz = async () => {
    const unansweredCount = questions.length - Object.keys(answers).length;
    let msg = 'Are you sure you want to submit your quiz?';
    if (unansweredCount > 0) {
      msg = `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`;
    }

    if (!confirm(msg)) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/public/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([key, val]) => ({
            questionId: key,
            answer: val
          }))
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit quiz.');

      sessionStorage.removeItem(`attempt_${attemptId}`);
      navigate(`/quiz/result/${attemptId}`);
    } catch (err) {
      alert(err.message || 'Failed to submit quiz. Please try again.');
      setSubmitting(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm font-semibold">Configuring testing environment...</p>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl text-slate-100">
          <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-full w-fit mx-auto">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Access Denied</h3>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">{error || 'Session initialization failed.'}</p>
          </div>
          <button 
            onClick={() => navigate(`/quiz/${shareCode}`)} 
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Back to Entrance
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const isTimeLow = timeLeft < 120; // 2 minutes

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col h-screen">
      
      {/* Top Banner Row */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Sparkles className="h-6 w-6 text-indigo-400 shrink-0" />
          <h2 className="text-lg font-bold text-white truncate">{quiz?.title}</h2>
          
          {/* Sync indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-850 text-[10px] text-slate-500 font-semibold shrink-0">
            {syncStatus === 'saving' && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                <span>Saving progress...</span>
              </>
            )}
            {syncStatus === 'saved' && (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span>Progress Saved</span>
              </>
            )}
            {syncStatus === 'error' && (
              <>
                <AlertCircle className="h-3 w-3 text-red-500" />
                <span>Sync Error</span>
              </>
            )}
          </div>
        </div>

        {/* Timer Box */}
        <div className={`flex items-center gap-2 px-4 py-2 border rounded-xl font-mono text-sm font-bold shadow ${
          isTimeLow 
            ? 'bg-red-950/30 border-red-800 text-red-400 animate-pulse' 
            : 'bg-slate-950 border-slate-800 text-indigo-400'
        }`}>
          <Clock className="h-4.5 w-4.5" />
          <span>{formatTime(timeLeft)}</span>
        </div>
      </header>

      {/* Progress slider bar */}
      <div className="w-full bg-slate-800 h-1.5 shrink-0">
        <div 
          className="bg-indigo-500 h-full transition-all duration-300"
          style={{ width: `${((Object.keys(answers).length) / questions.length) * 100}%` }}
        />
      </div>

      {/* Main split: Left Question Card, Right Navigation grid */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Question Display */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col justify-between">
          <div className="max-w-3xl mx-auto w-full space-y-8">
            <div className="flex justify-between items-start gap-4">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span className="text-xs font-semibold bg-slate-900 border border-slate-800 text-indigo-400 px-2 py-0.5 rounded font-mono">
                {currentQuestion.marks} Mark(s)
              </span>
            </div>

            <h3 className="text-lg md:text-xl font-semibold text-white leading-relaxed font-sans">
              {currentQuestion.questionText}
            </h3>

            {/* MCQ List Options */}
            {currentQuestion.type === 'MCQ' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = answers[currentQuestion.id] === opt;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(currentQuestion.id, opt)}
                      className={`w-full text-left p-4 rounded-xl border text-sm font-medium transition-all flex items-start gap-3 hover:bg-slate-900 ${
                        isSelected 
                          ? 'bg-indigo-950/20 border-indigo-550 border-indigo-600 text-indigo-300 shadow-md shadow-indigo-950/40' 
                          : 'bg-slate-900/40 border-slate-800/80 text-slate-400'
                      }`}
                    >
                      <span className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold font-mono ${
                        isSelected ? 'bg-indigo-600 text-white border-transparent' : 'border-slate-700 text-slate-500'
                      }`}>
                        {letter}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* True/False Buttons */}
            {currentQuestion.type === 'TRUE_FALSE' && (
              <div className="flex gap-4">
                {['True', 'False'].map((val) => {
                  const isSelected = answers[currentQuestion.id]?.toLowerCase() === val.toLowerCase();
                  return (
                    <button
                      key={val}
                      onClick={() => handleSelectOption(currentQuestion.id, val)}
                      className={`flex-1 py-4 text-center border rounded-xl text-sm font-semibold transition-all hover:bg-slate-900 ${
                        isSelected
                          ? 'bg-indigo-950/20 border-indigo-600 text-indigo-300'
                          : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Short Answer text block */}
            {currentQuestion.type === 'SHORT_ANSWER' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase">Write your response</label>
                <textarea
                  rows={4}
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleTextChange(currentQuestion.id, e.target.value)}
                  className="w-full bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono leading-relaxed"
                  placeholder="Type your explanation here. Answers are manually evaluated by the teacher."
                />
              </div>
            )}
          </div>

          {/* Question card Footer Controls */}
          <div className="max-w-3xl mx-auto w-full pt-8 border-t border-slate-800/40 flex justify-between items-center mt-8">
            <button
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <button
              onClick={() => toggleMarkedForReview(currentQuestion.id)}
              className={`flex items-center gap-1.5 px-4 py-2 border rounded-lg text-xs font-bold transition-all ${
                markedForReview.has(currentQuestion.id)
                  ? 'bg-amber-950/20 border-amber-800 text-amber-400'
                  : 'border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Bookmark className="h-4 w-4" />
              Mark for Review
            </button>

            {currentIdx === questions.length - 1 ? (
              <button
                type="button"
                onClick={handleSubmitQuiz}
                disabled={submitting}
                className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                Submit Quiz
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-800 hover:bg-slate-850 hover:bg-slate-850 rounded-lg text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Grid Panel */}
        <div className="w-80 bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between shrink-0 h-full overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Assessment Map</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Quickly jump to any question segment.</p>
            </div>

            {/* Quick grid */}
            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((q, idx) => {
                const isCurrent = currentIdx === idx;
                const isAnswered = answers[q.id] !== undefined && String(answers[q.id]).trim().length > 0;
                const isMarked = markedForReview.has(q.id);

                let badgeClass = 'border-slate-800 text-slate-500 hover:border-slate-700';
                if (isAnswered) {
                  badgeClass = 'bg-indigo-950/20 border-indigo-800 text-indigo-400';
                }
                if (isMarked) {
                  badgeClass = 'bg-amber-950/25 border-amber-800 text-amber-400';
                }
                if (isCurrent) {
                  badgeClass = 'border-indigo-650 bg-indigo-600 text-white border-transparent ring-2 ring-indigo-500/20';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-10 w-10 border rounded-lg flex items-center justify-center text-xs font-bold transition-all ${badgeClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick legend */}
          <div className="border-t border-slate-800 pt-6 space-y-3.5 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-indigo-600 bg-indigo-600" />
              <span>Current Question</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-indigo-800 bg-indigo-950/20" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-amber-800 bg-amber-950/20" />
              <span>Marked for Review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-slate-800" />
              <span>Unanswered</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentQuizTake;
