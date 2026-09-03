import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Database, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  FileText, 
  Check, 
  HelpCircle,
  AlertCircle,
  Eye,
  X,
  RefreshCw,
  SlidersHorizontal,
  Bookmark,
  Loader2
} from 'lucide-react';

import SourceTraceabilityModal from '../components/SourceTraceabilityModal';

const Questions = () => {
  const { token } = useAuth();
  
  const [questions, setQuestions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sourceQuestionId, setSourceQuestionId] = useState(null);
  
  // Filters
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [topicQuery, setTopicQuery] = useState('');

  // Editing state
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editText, setEditText] = useState('');
  const [editOptions, setEditOptions] = useState([]);
  const [editCorrectAnswer, setEditCorrectAnswer] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  const [editDifficulty, setEditDifficulty] = useState('MEDIUM');
  const [editTopic, setEditTopic] = useState('General');
  const [editPage, setEditPage] = useState('');
  const [editSection, setEditSection] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Preview state
  const [previewingQuestion, setPreviewingQuestion] = useState(null);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDocId) params.append('documentId', selectedDocId);
      if (selectedDifficulty) params.append('difficulty', selectedDifficulty);
      if (selectedType) params.append('type', selectedType);
      if (topicQuery) params.append('topic', topicQuery);

      const response = await fetch(`/api/questions?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch questions.');
      const data = await response.json();
      setQuestions(data.questions);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve question bank entries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [token]);

  useEffect(() => {
    fetchQuestions();
  }, [token, selectedDocId, selectedDifficulty, selectedType, topicQuery]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this question? This will permanently remove it from the Question Bank and any quizzes containing it.')) return;

    try {
      const response = await fetch(`/api/questions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete question.');
      setQuestions(prev => prev.filter(q => q.id !== id));
      if (previewingQuestion?.id === id) setPreviewingQuestion(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const startEdit = (q) => {
    setEditingQuestion(q);
    setEditText(q.questionText);
    setEditOptions(q.options ? [...q.options] : []);
    setEditCorrectAnswer(q.correctAnswer);
    setEditExplanation(q.explanation || '');
    setEditDifficulty(q.difficulty);
    setEditTopic(q.topic);
    setEditPage(q.sourcePage || '');
    setEditSection(q.sourceSection || '');
  };

  const handleEditOptionChange = (idx, val) => {
    const next = [...editOptions];
    next[idx] = val;
    setEditOptions(next);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editingQuestion) return;

    setSavingEdit(true);
    try {
      const response = await fetch(`/api/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionText: editText,
          options: editingQuestion.type === 'MCQ' ? editOptions : null,
          correctAnswer: editCorrectAnswer,
          explanation: editExplanation,
          difficulty: editDifficulty,
          topic: editTopic,
          sourcePage: editPage ? parseInt(editPage, 10) : null,
          sourceSection: editSection
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update question.');

      // Update in local state
      setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? data.question : q));
      setEditingQuestion(null);
    } catch (err) {
      alert(err.message || 'Failed to save question edits.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Filter questions matching search input on Client side for ultra fast responsiveness
  const filteredQuestions = questions.filter(q => 
    q.questionText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100 relative min-h-screen">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          Question Bank <Database className="h-7 w-7 text-indigo-400" />
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          A central repository of AI-generated and verified curriculum questions.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-800 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Main Grid split: Left sidebar filters, Right list of cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Filters Sidebar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-indigo-400" />
              Filter Bank
            </h3>
            <button
              onClick={() => {
                setSelectedDocId('');
                setSelectedDifficulty('');
                setSelectedType('');
                setTopicQuery('');
                setSearchQuery('');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Reset All
            </button>
          </div>

          <div className="space-y-4">
            {/* Filter by Document */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase">Document Source</label>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Documents</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>{doc.name}</option>
                ))}
              </select>
            </div>

            {/* Filter by Difficulty */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase">Difficulty</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Levels</option>
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>

            {/* Filter by Type */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase">Question Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Types</option>
                <option value="MCQ">MCQ</option>
                <option value="TRUE_FALSE">True/False</option>
                <option value="SHORT_ANSWER">Short Answer</option>
              </select>
            </div>

            {/* Filter by Topic */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase">Topic Query</label>
              <input
                type="text"
                placeholder="e.g. CPU Scheduling"
                value={topicQuery}
                onChange={(e) => setTopicQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
              />
            </div>
          </div>
        </div>

        {/* Right side: Central list */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search question content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={fetchQuestions}
              className="p-2 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Refresh questions"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="text-slate-400 text-sm">Querying matching questions...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl py-16 text-center flex flex-col items-center justify-center space-y-3">
              <HelpCircle className="h-12 w-12 text-slate-700" />
              <p className="text-sm font-semibold text-slate-400">No questions found</p>
              <p className="text-xs text-slate-500 max-w-sm">No items match your active filters. Go to study materials to parse a document and generate new ones.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((q) => (
                <div key={q.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-6 space-y-4">
                  {/* Meta data row */}
                  <div className="flex justify-between items-start gap-4 text-xs text-slate-500 border-b border-slate-800 pb-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="font-bold text-indigo-400">{q.topic}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                        q.difficulty === 'HARD' ? 'bg-red-950 text-red-400 border border-red-900/30' :
                        q.difficulty === 'MEDIUM' ? 'bg-amber-950 text-amber-400 border border-amber-900/30' : 
                        'bg-emerald-950 text-emerald-400 border border-emerald-900/30'
                      }`}>
                        {q.difficulty}
                      </span>
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono">
                        {q.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 font-medium">
                      <FileText className="h-3 w-3" />
                      <span className="truncate max-w-[150px]">{q.document?.name}</span>
                      {q.sourcePage && <span>• Pg {q.sourcePage}</span>}
                    </div>
                  </div>

                  {/* Question Text */}
                  <p className="text-sm font-semibold text-white leading-relaxed">{q.questionText}</p>

                  {/* Options if MCQ */}
                  {q.type === 'MCQ' && q.options && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                      {q.options.map((opt, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs leading-normal ${
                            String(idx) === q.correctAnswer
                              ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                              : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                          }`}
                        >
                          <span className="font-bold shrink-0">{String.fromCharCode(65 + idx)}.</span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Truth value if True/False */}
                  {q.type === 'TRUE_FALSE' && (
                    <div className="flex gap-3 pl-2">
                      <div className={`px-4 py-1.5 rounded-lg border text-xs font-semibold uppercase ${
                        q.correctAnswer.toLowerCase() === 'true'
                          ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-500'
                      }`}>
                        True
                      </div>
                      <div className={`px-4 py-1.5 rounded-lg border text-xs font-semibold uppercase ${
                        q.correctAnswer.toLowerCase() === 'false'
                          ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-500'
                      }`}>
                        False
                      </div>
                    </div>
                  )}

                  {/* Short answer text */}
                  {q.type === 'SHORT_ANSWER' && (
                    <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-3 text-xs">
                      <span className="text-slate-500 uppercase font-semibold block mb-1">Ideal Correct Answer Reference</span>
                      <p className="text-indigo-300 font-mono leading-relaxed">{q.correctAnswer}</p>
                    </div>
                  )}

                  {/* Explanation Section */}
                  {q.explanation && (
                    <div className="bg-indigo-950/5 border border-indigo-950/20 rounded-xl p-3 text-xs leading-relaxed text-slate-400">
                      <span className="font-semibold text-indigo-400 block mb-0.5">Explanation</span>
                      {q.explanation}
                    </div>
                  )}

                  {/* Actions Drawer */}
                  <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-800/40">
                    <button
                      onClick={() => setSourceQuestionId(q.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                      title="View Source Traceability"
                    >
                      <Bookmark className="h-3.5 w-3.5 text-emerald-400" />
                      View Source
                    </button>
                    <button
                      onClick={() => setPreviewingQuestion(q)}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                      title="Preview details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => startEdit(q)}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors"
                      title="Edit question"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                      title="Delete question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 1. Edit Question Modal Overlay */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Edit Question Details <Edit3 className="h-5 w-5 text-indigo-400" />
              </h3>
              <button 
                onClick={() => setEditingQuestion(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitEdit} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">Question Text</label>
                <textarea
                  rows={3}
                  required
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-805 border-slate-800 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono leading-relaxed"
                />
              </div>

              {/* MCQ Options */}
              {editingQuestion.type === 'MCQ' && editOptions.length === 4 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editOptions.map((opt, optIdx) => (
                    <div key={optIdx} className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-500 uppercase">Option {String.fromCharCode(65 + optIdx)}</label>
                      <input
                        type="text"
                        required
                        value={opt}
                        onChange={(e) => handleEditOptionChange(optIdx, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Core Attributes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">Correct Answer</label>
                  {editingQuestion.type === 'MCQ' ? (
                    <select
                      value={editCorrectAnswer}
                      onChange={(e) => setEditCorrectAnswer(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="0">Option A</option>
                      <option value="1">Option B</option>
                      <option value="2">Option C</option>
                      <option value="3">Option D</option>
                    </select>
                  ) : editingQuestion.type === 'TRUE_FALSE' ? (
                    <select
                      value={editCorrectAnswer.toLowerCase()}
                      onChange={(e) => setEditCorrectAnswer(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={editCorrectAnswer}
                      onChange={(e) => setEditCorrectAnswer(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">Difficulty</label>
                  <select
                    value={editDifficulty}
                    onChange={(e) => setEditDifficulty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">Topic</label>
                  <input
                    type="text"
                    required
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Source traceability */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">Source Page Number</label>
                  <input
                    type="number"
                    value={editPage}
                    onChange={(e) => setEditPage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">Source Section Name</label>
                  <input
                    type="text"
                    value={editSection}
                    onChange={(e) => setEditSection(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">Explanation</label>
                <textarea
                  rows={2}
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-400 text-sm font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md transition-colors"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Preview Details Modal Overlay */}
      {previewingQuestion && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Traceability Reference</h3>
              </div>
              <button 
                onClick={() => setPreviewingQuestion(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold block mb-0.5">Source Material</span>
                <p className="font-semibold text-slate-200">{previewingQuestion.document?.name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-500 uppercase font-semibold block mb-0.5">Page Location</span>
                  <p className="text-slate-300 font-mono">Page {previewingQuestion.sourcePage || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase font-semibold block mb-0.5">Section Title</span>
                  <p className="text-slate-300 truncate">"{previewingQuestion.sourceSection || 'General'}"</p>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold block mb-0.5">Topic Target</span>
                <p className="text-slate-300">{previewingQuestion.topic}</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Grounded Question Context</span>
                <p className="text-xs font-mono text-slate-400 whitespace-pre-wrap leading-relaxed">
                  Referenced from chunk segment index {previewingQuestion.chunkId ? previewingQuestion.chunkId.substring(0, 8) : 'N/A'}. 
                  Assigned complexity: {previewingQuestion.difficulty}.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800/60">
              <button
                onClick={() => setPreviewingQuestion(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-lg transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
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
};

export default Questions;
