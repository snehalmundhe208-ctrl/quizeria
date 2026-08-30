import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

const StudentJoinQuiz = () => {
  const navigate = useNavigate();
  const [quizCodeInput, setQuizCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');

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
      // fallback to input
    }

    if (!code) {
      setJoinError('Could not parse a valid quiz code from your input.');
      return;
    }

    navigate(`/quiz/${code}`);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8 text-slate-100 min-h-[80vh] flex flex-col justify-center">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-xl">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-indigo-50 border border-indigo-200 text-indigo-650 rounded-xl flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Join a Quiz</h2>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            Enter a share code or paste the full quiz URL provided by your educator to begin your timed assessment.
          </p>
        </div>

        <form onSubmit={handleJoinQuiz} className="space-y-4 max-w-md mx-auto">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-400 uppercase">Quiz Code or Link</label>
            <input
              type="text"
              required
              placeholder="e.g. quiz_code or paste full link"
              value={quizCodeInput}
              onChange={(e) => setQuizCodeInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-650"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
          >
            Start Quiz <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {joinError && (
          <p className="text-red-400 text-xs font-semibold text-center mt-2">{joinError}</p>
        )}
      </div>
    </div>
  );
};

export default StudentJoinQuiz;
