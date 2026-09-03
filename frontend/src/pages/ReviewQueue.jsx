import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import SourceTraceabilityModal from '../components/SourceTraceabilityModal';
import { 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Search, 
  Filter, 
  RefreshCw, 
  Edit3, 
  Bookmark, 
  AlertTriangle, 
  ShieldCheck, 
  Check, 
  X,
  FileText,
  Loader2
} from 'lucide-react';

export default function ReviewQueue() {
  const { token } = useAuth();
  
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [sourceQuestionId, setSourceQuestionId] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Editing single question inline
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    fetchReviewQueue();
  }, []);

  const fetchReviewQueue = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/questions/review-queue', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch review queue.');
      setQuestions(json.questions || []);
      setSelectedIds([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredQuestions.map(q => q.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleApproveSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      setError('');
      const res = await fetch('/api/questions/review-queue/approve', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ questionIds: selectedIds })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to approve questions.');
      setSuccess(json.message);
      fetchReviewQueue();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRejectSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      setError('');
      const res = await fetch('/api/questions/review-queue/reject', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ questionIds: selectedIds })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to reject questions.');
      setSuccess(json.message);
      fetchReviewQueue();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApproveSingle = async (id) => {
    try {
      setError('');
      const res = await fetch('/api/questions/review-queue/approve', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ questionIds: [id] })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to approve question.');
      setSuccess('Question approved into Question Bank.');
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRejectSingle = async (id) => {
    try {
      setError('');
      const res = await fetch('/api/questions/review-queue/reject', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ questionIds: [id] })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to reject question.');
      setSuccess('Question rejected.');
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveInlineEdit = async (id) => {
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ questionText: editText })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update question text.');
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, questionText: editText } : q));
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = !searchQuery || 
      q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDiff = !selectedDifficulty || q.difficulty === selectedDifficulty;
    const matchesType = !selectedType || q.type === selectedType;
    return matchesSearch && matchesDiff && matchesType;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                AI Question Review Queue
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {questions.length} Pending
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Inspect AI Quality Scores, verify source traceability, edit, and approve questions before publishing.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchReviewQueue}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Queue
        </button>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
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

      {/* Control Bar & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search questions or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Types</option>
          <option value="MCQ">MCQ</option>
          <option value="TRUE_FALSE">True / False</option>
          <option value="SHORT_ANSWER">Short Answer</option>
        </select>
      </div>

      {/* Batch Action Toolbar */}
      {filteredQuestions.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
          <label className="flex items-center space-x-2 text-xs font-semibold text-slate-300 cursor-pointer pl-2">
            <input
              type="checkbox"
              checked={selectedIds.length === filteredQuestions.length && filteredQuestions.length > 0}
              onChange={handleSelectAll}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Select All ({selectedIds.length} selected)</span>
          </label>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleApproveSelected}
              disabled={selectedIds.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve Selected ({selectedIds.length})
            </button>
            <button
              onClick={handleRejectSelected}
              disabled={selectedIds.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 disabled:opacity-40 text-xs font-semibold transition"
            >
              <XCircle className="w-4 h-4" />
              Reject Selected ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Question Cards List */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm">Fetching questions from review queue...</p>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-200">Review Queue Empty</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            All generated questions have been reviewed! Generate new questions from the Documents module to populate this queue.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((q) => {
            const isSelected = selectedIds.includes(q.id);
            const score = q.qualityScore ?? 90;
            const warnings = q.qualityWarnings || [];

            return (
              <div
                key={q.id}
                className={`bg-slate-900 border transition-all rounded-2xl p-5 space-y-4 ${
                  isSelected ? 'border-indigo-500/60 ring-1 ring-indigo-500/30 bg-slate-900/90' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top Row: Selection + Topic + Quality Score + Badges */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(q.id)}
                      className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-bold text-sm text-indigo-400">{q.topic}</span>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      q.difficulty === 'HARD' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      q.difficulty === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {q.difficulty}
                    </span>
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono">
                      {q.type}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Quality Score Badge */}
                    <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      score >= 85
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : score >= 70
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Quality: {score}/100</span>
                    </div>

                    <span className="text-xs text-slate-500 truncate max-w-[140px]">
                      {q.document?.name}
                    </span>
                  </div>
                </div>

                {/* Quality Warnings Alert */}
                {warnings.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                    <div className="font-semibold flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Quality Warnings Detected</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300 pl-1">
                      {warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Question Text / Inline Edit */}
                {editingId === q.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      rows={3}
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveInlineEdit(q.id)}
                        className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-semibold text-slate-100 leading-relaxed">
                      {q.questionText}
                    </p>
                    <button
                      onClick={() => {
                        setEditingId(q.id);
                        setEditText(q.questionText);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-indigo-400 transition"
                      title="Edit question text"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* MCQ Options */}
                {q.type === 'MCQ' && q.options && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-1">
                    {q.options.map((opt, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg border text-xs leading-normal flex items-start space-x-2 ${
                          String(idx) === String(q.correctAnswer)
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="font-bold">{String.fromCharCode(65 + idx)}.</span>
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Explanation */}
                {q.explanation && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 leading-relaxed">
                    <span className="font-semibold text-indigo-400 block mb-0.5">Grounding Explanation</span>
                    {q.explanation}
                  </div>
                )}

                {/* Footer Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/60">
                  <button
                    onClick={() => setSourceQuestionId(q.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 text-xs font-medium text-emerald-400 transition"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    View Source Context
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRejectSingle(q.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveSingle(q.id)}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-md"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve & Publish
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Source Traceability Modal */}
      <SourceTraceabilityModal
        isOpen={!!sourceQuestionId}
        onClose={() => setSourceQuestionId(null)}
        questionId={sourceQuestionId}
      />
    </div>
  );
}
