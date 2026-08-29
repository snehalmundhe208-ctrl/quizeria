import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  HelpCircle, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  RefreshCw, 
  Clock, 
  ArrowUp, 
  ArrowDown, 
  X, 
  Eye, 
  Share2, 
  FileText,
  Lock,
  Unlock,
  ExternalLink,
  GraduationCap
} from 'lucide-react';

const Quizzes = () => {
  const { token } = useAuth();
  
  // Navigation Screens: 'list' | 'create' | 'edit'
  const [screen, setScreen] = useState('list');
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Question bank loaded for selection
  const [allQuestions, setAllQuestions] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState([]);

  // Quiz Form fields
  const [quizId, setQuizId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [passingPercentage, setPassingPercentage] = useState(40);
  const [attemptsAllowed, setAttemptsAllowed] = useState(1);
  const [negativeMarking, setNegativeMarking] = useState(0.0);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [showResultImmediately, setShowResultImmediately] = useState(true);
  const [revealAnswersAfterSubmission, setRevealAnswersAfterSubmission] = useState(true);
  
  // Selected questions in the builder
  // Array of { questionId, questionText, type, topic, difficulty, marks }
  const [selectedQuizQuestions, setSelectedQuizQuestions] = useState([]);

  // Share link / publish state
  const [publishingQuiz, setPublishingQuiz] = useState(null);
  const [shareConfigAttempts, setShareConfigAttempts] = useState(0);
  const [shareConfigExpiry, setShareConfigExpiry] = useState('');
  const [generatedShareLink, setGeneratedShareLink] = useState(null);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/quizzes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch quizzes.');
      const data = await response.json();
      setQuizzes(data.quizzes);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve quiz listing.');
    } finally {
      setLoading(false);
    }
  };

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

  const fetchAllQuestions = async () => {
    try {
      const response = await fetch('/api/questions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAllQuestions(data.questions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchQuizzes();
    fetchDocuments();
    fetchAllQuestions();
  }, [token]);

  const handleStartCreate = () => {
    setQuizId(null);
    setTitle('');
    setDescription('');
    setInstructions('');
    setTimeLimit(30);
    setPassingPercentage(40);
    setAttemptsAllowed(1);
    setNegativeMarking(0.0);
    setRandomizeQuestions(false);
    setRandomizeOptions(false);
    setShowResultImmediately(true);
    setRevealAnswersAfterSubmission(true);
    setSelectedQuizQuestions([]);
    setError('');
    setSuccess('');
    setScreen('create');
  };

  const handleStartEdit = async (quizItem) => {
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/quizzes/${quizItem.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load quiz details.');
      const data = await response.json();
      const quiz = data.quiz;

      setQuizId(quiz.id);
      setTitle(quiz.title);
      setDescription(quiz.description || '');
      setInstructions(quiz.instructions || '');
      setTimeLimit(quiz.timeLimit);
      setPassingPercentage(quiz.passingPercentage);
      setAttemptsAllowed(quiz.attemptsAllowed);
      setNegativeMarking(quiz.negativeMarking);
      setRandomizeQuestions(quiz.randomizeQuestions);
      setRandomizeOptions(quiz.randomizeOptions);
      setShowResultImmediately(quiz.showResultImmediately);
      setRevealAnswersAfterSubmission(quiz.revealAnswersAfterSubmission);

      // Load mapped questions
      const mapped = quiz.quizQuestions.map(qq => ({
        questionId: qq.question.id,
        questionText: qq.question.questionText,
        type: qq.question.type,
        topic: qq.question.topic,
        difficulty: qq.question.difficulty,
        marks: qq.marks
      }));
      setSelectedQuizQuestions(mapped);
      setScreen('edit');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddQuestionToQuiz = (q) => {
    const exists = selectedQuizQuestions.some(sq => sq.questionId === q.id);
    if (exists) return;
    
    setSelectedQuizQuestions(prev => [
      ...prev,
      {
        questionId: q.id,
        questionText: q.questionText,
        type: q.type,
        topic: q.topic,
        difficulty: q.difficulty,
        marks: 1.0 // default
      }
    ]);
  };

  const handleRemoveQuestionFromQuiz = (qId) => {
    setSelectedQuizQuestions(prev => prev.filter(q => q.questionId !== qId));
  };

  const handleUpdateQuestionMarks = (qId, val) => {
    const parsed = parseFloat(val);
    setSelectedQuizQuestions(prev => prev.map(q => 
      q.questionId === qId ? { ...q, marks: isNaN(parsed) ? 0 : parsed } : q
    ));
  };

  const handleMoveQuestion = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === selectedQuizQuestions.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const next = [...selectedQuizQuestions];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    setSelectedQuizQuestions(next);
  };

  const handleSaveQuiz = async (e) => {
    e.preventDefault();
    if (!title || timeLimit <= 0 || passingPercentage < 0) {
      setError('Please fill in all required configurations.');
      return;
    }

    if (selectedQuizQuestions.length === 0) {
      setError('A quiz must contain at least one question.');
      return;
    }

    const payload = {
      title,
      description,
      instructions,
      timeLimit: parseInt(timeLimit, 10),
      passingPercentage: parseFloat(passingPercentage),
      attemptsAllowed: parseInt(attemptsAllowed, 10),
      negativeMarking: parseFloat(negativeMarking),
      randomizeQuestions,
      randomizeOptions,
      showResultImmediately,
      revealAnswersAfterSubmission,
      questions: selectedQuizQuestions.map((q, idx) => ({
        questionId: q.questionId,
        marks: q.marks,
        sortOrder: idx
      }))
    };

    try {
      const url = screen === 'create' ? '/api/quizzes' : `/api/quizzes/${quizId}`;
      const method = screen === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save quiz.');

      setSuccess(`Quiz ${screen === 'create' ? 'created' : 'updated'} successfully.`);
      setScreen('list');
      fetchQuizzes();
    } catch (err) {
      setError(err.message || 'Failed to complete transaction.');
    }
  };

  const handleDeleteQuiz = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This deletes the quiz and all historical student attempts.`)) return;

    try {
      const response = await fetch(`/api/quizzes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete quiz.');
      setQuizzes(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  // Open Publish settings panel
  const handleOpenPublish = (quiz) => {
    setPublishingQuiz(quiz);
    setShareConfigAttempts(0);
    setShareConfigExpiry('');
    setGeneratedShareLink(null);

    // If quiz is already published, show active settings if available
    if (quiz.shareLink) {
      setGeneratedShareLink(quiz.shareLink);
    }
  };

  const handlePublishQuizSubmit = async (e) => {
    e.preventDefault();
    if (!publishingQuiz) return;

    try {
      const response = await fetch(`/api/quizzes/${publishingQuiz.id}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          maxAttempts: shareConfigAttempts,
          expiresAt: shareConfigExpiry || null
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Publish failed.');

      setGeneratedShareLink(data.shareCode);
      setSuccess(`Quiz "${publishingQuiz.title}" is now published.`);
      fetchQuizzes(); // Refresh list to update badge statuses
    } catch (err) {
      alert(err.message || 'Failed to publish.');
    }
  };

  const handleRegenerateCode = async () => {
    if (!publishingQuiz) return;

    try {
      const response = await fetch(`/api/quizzes/${publishingQuiz.id}/regenerate-link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          maxAttempts: shareConfigAttempts,
          expiresAt: shareConfigExpiry || null
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Regeneration failed.');

      setGeneratedShareLink(data.shareCode);
      alert('New unguessable share code generated successfully.');
      fetchQuizzes();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleLinkActive = async (currentStatus) => {
    if (!publishingQuiz) return;

    try {
      const response = await fetch(`/api/quizzes/${publishingQuiz.id}/toggle-link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isActive: !currentStatus
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to toggle status.');

      // Toggle status inside local model
      setPublishingQuiz(prev => ({
        ...prev,
        shareLinkActive: data.shareLink.isActive
      }));

      fetchQuizzes();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCopyLink = () => {
    if (!generatedShareLink) return;
    const fullLink = `${window.location.origin}/quiz/${generatedShareLink}`;
    navigator.clipboard.writeText(fullLink);
    alert('Shareable link copied to clipboard!');
  };

  // Filter selection bank list
  const filteredSelectionQuestions = allQuestions.filter(q => {
    const matchesDoc = selectedDocId ? q.documentId === selectedDocId : true;
    const matchesDiff = selectedDifficulty ? q.difficulty === selectedDifficulty : true;
    const matchesSearch = searchQuery ? q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) : true;
    const notSelected = !selectedQuizQuestions.some(sq => sq.questionId === q.id);
    return matchesDoc && matchesDiff && matchesSearch && notSelected;
  });

  const totalMarksSum = selectedQuizQuestions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100 relative min-h-screen">
      
      {/* SUCCESS / ERROR FLOATING BARS */}
      {success && (
        <div className="bg-emerald-950/30 border border-emerald-800 text-emerald-300 p-3 rounded-lg flex items-center justify-between text-sm animate-fade-in">
          <span className="flex items-center gap-2"><CheckCircle className="h-5 w-5" /> {success}</span>
          <button onClick={() => setSuccess('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* 1. QUIZZES LISTING TABLE VIEW */}
      {screen === 'list' && (
        <>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                Quiz Panel <HelpCircle className="h-7 w-7 text-indigo-400" />
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Create online assessments, publish links, and monitor participant attempts.
              </p>
            </div>
            <button
              onClick={handleStartCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-900/10 transition-all self-start md:self-auto"
            >
              <Plus className="h-4 w-4" />
              Create Assessment
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="overflow-x-auto">
              {quizzes.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
                  <HelpCircle className="h-12 w-12 text-slate-700" />
                  <p className="text-sm font-semibold text-slate-400">No quizzes generated yet</p>
                  <p className="text-xs text-slate-500 max-w-sm">Use the assessment creator to bundle questions together and share them with students.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase">
                      <th className="pb-3">Title</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-center">Questions</th>
                      <th className="pb-3 text-center">Total Marks</th>
                      <th className="pb-3 text-center">Attempts</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {quizzes.map((quiz) => (
                      <tr key={quiz.id} className="hover:bg-slate-800/10 transition-colors">
                        <td className="py-4 pr-3 max-w-[220px] truncate">
                          <div>
                            <p className="font-semibold text-slate-200 truncate">{quiz.title}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" /> {quiz.timeLimit} mins
                            </p>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            quiz.status === 'PUBLISHED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/35' :
                            quiz.status === 'CLOSED' ? 'bg-red-950 text-red-400 border border-red-900/30' :
                            'bg-slate-800 text-slate-400 border border-slate-700/60'
                          }`}>
                            {quiz.status}
                          </span>
                        </td>
                        <td className="py-4 text-center font-mono text-slate-300">{quiz.questionCount}</td>
                        <td className="py-4 text-center font-mono text-indigo-300">{quiz.totalMarks}</td>
                        <td className="py-4 text-center font-mono text-slate-300">{quiz.attemptCount}</td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenPublish(quiz)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-750 border-slate-800 rounded-lg text-xs font-semibold text-indigo-400 transition-colors"
                              title="Share & Link Details"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              Link
                            </button>
                            <button
                              onClick={() => handleStartEdit(quiz)}
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                              title="Edit config"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-red-405 text-red-400 hover:text-red-300 transition-colors"
                              title="Delete quiz"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* 2. CREATION / EDITING FORM VIEW (QUIZ BUILDER) */}
      {(screen === 'create' || screen === 'edit') && (
        <form onSubmit={handleSaveQuiz} className="space-y-8 max-w-7xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                {screen === 'create' ? 'Create Assessment' : 'Edit Assessment Config'}
              </h1>
              <p className="text-slate-400 text-sm mt-1">Configure scoring, timer thresholds, and question lists.</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setScreen('list')}
                className="px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded-lg text-sm text-slate-400 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md transition-colors"
              >
                Save Assessment
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-950/20 border border-red-800 rounded-xl text-red-300 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Config Settings Form */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-md font-bold text-white mb-4">Quiz Parameters</h3>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Assessment Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. Operating Systems Final Exam"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Special Instructions</label>
                  <textarea
                    rows={2}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. No calculators allowed. Negative grading enabled."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase">Time Limit (Mins) *</label>
                    <input
                      type="number"
                      required
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase">Passing Score (%) *</label>
                    <input
                      type="number"
                      required
                      value={passingPercentage}
                      onChange={(e) => setPassingPercentage(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase">Attempts Allowed</label>
                    <input
                      type="number"
                      value={attemptsAllowed}
                      onChange={(e) => setAttemptsAllowed(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase">Negative Mark Value</label>
                    <input
                      type="number"
                      step="0.05"
                      value={negativeMarking}
                      onChange={(e) => setNegativeMarking(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Score Option Checkboxes */}
                <div className="space-y-3 pt-3 border-t border-slate-800/60">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={randomizeQuestions}
                      onChange={(e) => setRandomizeQuestions(e.target.checked)}
                      className="rounded text-indigo-650 bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 h-4 w-4"
                    />
                    <span className="text-xs text-slate-300 font-medium">Randomize Question Order</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={randomizeOptions}
                      onChange={(e) => setRandomizeOptions(e.target.checked)}
                      className="rounded text-indigo-650 bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 h-4 w-4"
                    />
                    <span className="text-xs text-slate-300 font-medium">Randomize Option Order</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showResultImmediately}
                      onChange={(e) => setShowResultImmediately(e.target.checked)}
                      className="rounded text-indigo-650 bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 h-4 w-4"
                    />
                    <span className="text-xs text-slate-300 font-medium">Show Score Immediately</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={revealAnswersAfterSubmission}
                      onChange={(e) => setRevealAnswersAfterSubmission(e.target.checked)}
                      className="rounded text-indigo-650 bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 h-4 w-4"
                    />
                    <span className="text-xs text-slate-300 font-medium">Reveal Answers on Submit</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Question Selection & Mapping Grid */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Top Selector Grid: Mapped Questions in Quiz */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h3 className="text-md font-bold text-white">Quiz Questions ({selectedQuizQuestions.length})</h3>
                  <div className="text-xs font-semibold uppercase">
                    Total Marks: <span className="text-indigo-400 font-mono text-sm">{totalMarksSum}</span>
                  </div>
                </div>

                {selectedQuizQuestions.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No questions added. Select questions from the Question Bank below.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {selectedQuizQuestions.map((q, idx) => (
                      <div key={q.questionId} className="flex gap-3 items-center justify-between bg-slate-950 border border-slate-800 p-3 rounded-xl hover:border-slate-700 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-300 font-medium truncate leading-relaxed">
                            <span className="text-indigo-400 font-bold mr-1">{idx + 1}.</span>
                            {q.questionText}
                          </p>
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-0.5">
                            {q.topic} • {q.type} • {q.difficulty}
                          </span>
                        </div>

                        {/* Marks & Sorting controls */}
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">Marks:</span>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={q.marks}
                              onChange={(e) => handleUpdateQuestionMarks(q.questionId, e.target.value)}
                              className="w-12 bg-slate-900 border border-slate-800 rounded text-center text-xs py-0.5 text-indigo-400 focus:outline-none"
                            />
                          </div>

                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'up')}
                              disabled={idx === 0}
                              className="p-0.5 hover:bg-slate-800 text-slate-500 hover:text-white rounded disabled:opacity-30"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'down')}
                              disabled={idx === selectedQuizQuestions.length - 1}
                              className="p-0.5 hover:bg-slate-800 text-slate-500 hover:text-white rounded disabled:opacity-30"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveQuestionFromQuiz(q.questionId)}
                            className="p-1 hover:bg-slate-800 text-red-400 hover:text-red-300 rounded"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Selector: Bank Question List Selection */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="border-b border-slate-800 pb-2">
                  <h3 className="text-md font-bold text-white">Add Questions from Bank</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Search and select items to insert into this assessment.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="relative md:col-span-1">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">All Documents</option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>{doc.name}</option>
                    ))}
                  </select>

                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">All Difficulties</option>
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>

                {/* Available list */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {filteredSelectionQuestions.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No matching questions available in the bank.
                    </div>
                  ) : (
                    filteredSelectionQuestions.map((q) => (
                      <div 
                        key={q.id}
                        onClick={() => handleAddQuestionToQuiz(q)}
                        className="flex justify-between items-center bg-slate-950/40 hover:bg-slate-950 border border-slate-800 hover:border-indigo-900/50 p-2.5 rounded-xl cursor-pointer transition-all"
                      >
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="text-xs text-slate-300 truncate leading-relaxed">{q.questionText}</p>
                          <span className="text-[9px] text-slate-500 uppercase font-semibold block mt-0.5">
                            {q.topic} • {q.type} • {q.difficulty}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="px-2 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-400 text-[10px] font-bold rounded-md"
                        >
                          Add
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        </form>
      )}

      {/* 3. SHARE LINK & PUBLISH DIALOG PANEL */}
      {publishingQuiz && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Share Link Settings <Share2 className="h-5 w-5 text-indigo-400" />
              </h3>
              <button 
                onClick={() => setPublishingQuiz(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Assessment</p>
                <p className="text-sm font-bold text-indigo-300 truncate">{publishingQuiz.title}</p>
              </div>

              {/* Configure publish limits */}
              <form onSubmit={handlePublishQuizSubmit} className="space-y-4 border-t border-slate-800/60 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400 uppercase">Max Attempts Allowed</label>
                    <input
                      type="number"
                      min="0"
                      value={shareConfigAttempts}
                      onChange={(e) => setShareConfigAttempts(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">0 means unlimited attempts</span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400 uppercase">Expiration Date</label>
                    <input
                      type="datetime-local"
                      value={shareConfigExpiry}
                      onChange={(e) => setShareConfigExpiry(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                {!generatedShareLink ? (
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
                  >
                    Publish Quiz & Generate Link
                  </button>
                ) : (
                  <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                    <span className="text-xs text-slate-500 uppercase font-semibold block">Shareable Student URL</span>
                    
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/quiz/${generatedShareLink}`}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="p-2 bg-slate-850 hover:bg-slate-800 rounded-lg text-indigo-400 border border-slate-800"
                        title="Copy Link"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-800/60 text-xs">
                      {/* Toggle status */}
                      <button
                        type="button"
                        onClick={() => handleToggleLinkActive(publishingQuiz.shareLinkActive)}
                        className={`flex items-center gap-1 font-semibold ${
                          publishingQuiz.shareLinkActive ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        {publishingQuiz.shareLinkActive ? (
                          <>
                            <Unlock className="h-3.5 w-3.5" />
                            Link is Active
                          </>
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5" />
                            Link is Deactivated
                          </>
                        )}
                      </button>

                      {/* Regenerate */}
                      <button
                        type="button"
                        onClick={handleRegenerateCode}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Regenerate Code
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="flex justify-end border-t border-slate-800/60 pt-4">
              <button
                type="button"
                onClick={() => setPublishingQuiz(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Quizzes;
