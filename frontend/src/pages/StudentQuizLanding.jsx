import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  Clock, 
  HelpCircle, 
  Award, 
  AlertTriangle,
  ArrowRight,
  Loader2
} from 'lucide-react';

const StudentQuizLanding = () => {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    // 1. Enforce student authentication check first
    if (!token || !user) {
      navigate(`/student/login?quizLink=${shareCode}`);
      return;
    }

    if (user.role !== 'STUDENT') {
      setError('Please log in using a student account to attempt this quiz.');
      setLoading(false);
      return;
    }

    const fetchQuizMetadata = async () => {
      try {
        const response = await fetch(`/api/public/quiz/${shareCode}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Quiz not available.');
        }

        setQuiz(data.quiz);
        setQuestionsCount(data.questions.length);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Quiz is not active or has expired.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizMetadata();
  }, [shareCode, token, user, navigate]);

  const handleStartQuiz = async () => {
    setStarting(true);
    setError('');

    try {
      const response = await fetch(`/api/public/quiz/${shareCode}/start`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start attempt.');
      }

      // Store initial state in sessionStorage to support recovery on page reload
      sessionStorage.setItem(`attempt_${data.attemptId}`, JSON.stringify({
        expiresAt: data.expiresAt,
        questions: data.questions
      }));

      // Redirect to the active quiz interface
      navigate(`/quiz/${shareCode}/take/${data.attemptId}`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not verify student permissions.');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm font-semibold">Loading assessment credentials...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-full w-fit mx-auto">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Quiz Unavailable</h3>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              {error || 'This shared link is either inactive, fully expired, or does not exist. Please contact your educator for access.'}
            </p>
          </div>
          <button 
            onClick={() => navigate('/')} 
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Go to Platform Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-100 font-sans">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        
        {/* Logo and title */}
        <div className="text-center">
          <div className="flex justify-center items-center gap-2">
            <GraduationCap className="h-10 w-10 text-indigo-400 animate-pulse" />
            <span className="text-2xl font-bold tracking-tight text-white">StudyForge AI</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-white leading-tight">{quiz.title}</h2>
          {quiz.description && (
            <p className="mt-2 text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
              {quiz.description}
            </p>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Instructions */}
          <div className="space-y-6">
            <div>
              <h3 className="text-md font-bold text-white">Instructions</h3>
              <p className="text-slate-500 text-xs mt-0.5">Please review the guidelines below before starting.</p>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center gap-3 text-xs font-semibold">
                <Clock className="h-5 w-5 text-indigo-400 shrink-0" />
                <div>
                  <p className="text-slate-200">Duration Limit</p>
                  <p className="text-slate-400 font-mono mt-0.5">{quiz.timeLimit} minutes</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold">
                <HelpCircle className="h-5 w-5 text-indigo-400 shrink-0" />
                <div>
                  <p className="text-slate-200">Questions Count</p>
                  <p className="text-slate-400 font-mono mt-0.5">{questionsCount} items</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold">
                <Award className="h-5 w-5 text-indigo-400 shrink-0" />
                <div>
                  <p className="text-slate-200">Grading System</p>
                  <p className="text-slate-400 font-mono mt-0.5">Passing Threshold: {quiz.passingPercentage}%</p>
                </div>
              </div>

              {quiz.negativeMarking > 0 && (
                <div className="flex items-center gap-3 text-xs font-semibold bg-red-950/20 border border-red-900/30 rounded-xl p-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
                  <div>
                    <p className="text-red-300">Negative Grading Enabled</p>
                    <p className="text-red-400/80 font-mono mt-0.5">-{quiz.negativeMarking} deduction per incorrect response</p>
                  </div>
                </div>
              )}
            </div>

            {quiz.instructions && (
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 text-xs leading-relaxed text-slate-400">
                <span className="font-bold text-white block mb-1">Educator Notes:</span>
                {quiz.instructions}
              </div>
            )}
          </div>

          {/* Right Column: Entry Account Details */}
          <div className="flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-md font-bold text-white">Student Account</h3>
              <p className="text-slate-500 text-xs mt-0.5">Attempting as registered student.</p>
            </div>

            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 text-xs space-y-2.5">
              <div>
                <span className="text-slate-500 font-bold block uppercase tracking-wider text-[10px]">Name:</span>
                <span className="text-slate-200 font-semibold">{user?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block uppercase tracking-wider text-[10px]">Email:</span>
                <span className="text-slate-200 font-mono">{user?.email}</span>
              </div>
              {user?.studentId && (
                <div>
                  <span className="text-slate-500 font-bold block uppercase tracking-wider text-[10px]">Student ID:</span>
                  <span className="text-slate-200 font-mono">{user?.studentId}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleStartQuiz}
              disabled={starting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {starting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Initializing assessment...
                </>
              ) : (
                <>
                  Start Assessment
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StudentQuizLanding;
