import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  Loader2, 
  AlertCircle, 
  Trash2, 
  Eye, 
  Plus,
  RefreshCw,
  Search,
  BookOpen,
  Sparkles,
  ChevronRight,
  BrainCircuit,
  FileMinus,
  Edit3,
  Check,
  X
} from 'lucide-react';

const Documents = () => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal / Detail drawer state
  const [viewingDoc, setViewingDoc] = useState(null);
  const [docDetails, setDocDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Question Generation Config Modal
  const [generatingDoc, setGeneratingDoc] = useState(null);
  const [qCount, setQCount] = useState(10);
  const [qDifficulty, setQDifficulty] = useState('MEDIUM');
  const [qTypes, setQTypes] = useState(['MCQ']); // MCQ, TRUE_FALSE, SHORT_ANSWER
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  // Question Review UI State
  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [activeReviewIdx, setActiveReviewIdx] = useState(null); // index of question being edited inline

  const fileInputRef = useRef(null);
  const pollingIntervals = useRef({});

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch documents.');
      const data = await response.json();
      setDocuments(data.documents);

      data.documents.forEach(doc => {
        if (doc.status === 'PROCESSING' || doc.status === 'UPLOADED') {
          startPolling(doc.id);
        }
      });
    } catch (err) {
      console.error(err);
      setError('Could not retrieve study documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    return () => {
      Object.values(pollingIntervals.current).forEach(clearInterval);
    };
  }, [token]);

  const startPolling = (id) => {
    if (pollingIntervals.current[id]) return;

    pollingIntervals.current[id] = setInterval(async () => {
      try {
        const response = await fetch(`/api/documents/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const doc = data.document;

          setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: doc.status, pageCount: doc.pageCount, failureReason: doc.failureReason, _count: doc._count } : d));

          if (doc.status === 'PROCESSED' || doc.status === 'FAILED') {
            clearInterval(pollingIntervals.current[id]);
            delete pollingIntervals.current[id];
            fetchDocuments();
          }
        }
      } catch (err) {
        console.error("Polling error for document:", id, err);
      }
    }, 3000);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed.');

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      setSuccess(`Uploaded "${data.document.name}" successfully! Starting parsing pipeline.`);
      setDocuments(prev => [data.document, ...prev]);

      triggerProcessing(data.document.id);
    } catch (err) {
      setError(err.message || 'An error occurred during uploading.');
    } finally {
      setUploading(false);
    }
  };

  const triggerProcessing = async (id) => {
    try {
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: 'PROCESSING' } : d));
      const response = await fetch(`/api/documents/${id}/process`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Processing failed to initiate.');
      startPolling(id);
    } catch (err) {
      console.error(err);
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: 'FAILED' } : d));
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"? All associated chunks and generated questions will be deleted.`)) return;

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete document.');
      
      setDocuments(prev => prev.filter(d => d.id !== id));
      if (viewingDoc && viewingDoc.id === id) {
        setViewingDoc(null);
        setDocDetails(null);
      }
      
      if (pollingIntervals.current[id]) {
        clearInterval(pollingIntervals.current[id]);
        delete pollingIntervals.current[id];
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const viewDocumentDetails = async (doc) => {
    setViewingDoc(doc);
    setDetailsLoading(true);
    setDocDetails(null);

    try {
      const response = await fetch(`/api/documents/${doc.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load details.');
      const data = await response.json();
      setDocDetails(data.document);
    } catch (err) {
      console.error(err);
      setError('Could not load document details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Toggle question types
  const handleTypeToggle = (type) => {
    if (qTypes.includes(type)) {
      if (qTypes.length > 1) {
        setQTypes(qTypes.filter(t => t !== type));
      }
    } else {
      setQTypes([...qTypes, type]);
    }
  };

  // Triggers Gemini question generation
  const handleGenerateAIQuestions = async (e) => {
    e.preventDefault();
    if (!generatingDoc) return;

    setGeneratingQuestions(true);
    setError('');

    try {
      const response = await fetch(`/api/questions/generate/${generatingDoc.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          count: qCount,
          difficulty: qDifficulty,
          types: qTypes
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate questions.');

      setReviewQuestions(data.questions);
      setIsReviewing(true);
      setGeneratingDoc(null); // Close config modal
    } catch (err) {
      console.error(err);
      setError(err.message || 'AI Question Generation failed.');
    } finally {
      setGeneratingQuestions(false);
    }
  };

  // Regenerate a single question in the review batch
  const handleRegenerateQuestion = async (idx) => {
    const originalQ = reviewQuestions[idx];
    if (!originalQ.chunkId) {
      alert('This question lacks a source chunk and cannot be regenerated.');
      return;
    }

    try {
      // Set loading state on that index
      setReviewQuestions(prev => prev.map((q, i) => i === idx ? { ...q, regenerating: true } : q));

      const response = await fetch('/api/questions/regenerate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chunkId: originalQ.chunkId,
          type: originalQ.type,
          difficulty: originalQ.difficulty
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Regeneration failed.');

      // Swap out the question at index
      setReviewQuestions(prev => prev.map((q, i) => i === idx ? data.question : q));
    } catch (err) {
      alert(err.message || 'Failed to replace question.');
      setReviewQuestions(prev => prev.map((q, i) => i === idx ? { ...q, regenerating: false } : q));
    }
  };

  const handleEditReviewQuestion = (idx, field, value) => {
    setReviewQuestions(prev => prev.map((q, i) => {
      if (i === idx) {
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  const handleEditMCQOption = (qIdx, optIdx, val) => {
    setReviewQuestions(prev => prev.map((q, i) => {
      if (i === qIdx) {
        const newOpts = [...q.options];
        newOpts[optIdx] = val;
        return { ...q, options: newOpts };
      }
      return q;
    }));
  };

  const handleDeleteReviewQuestion = (idx) => {
    setReviewQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveReviewedQuestions = async () => {
    if (reviewQuestions.length === 0) return;

    // Quick basic client side verification
    for (const q of reviewQuestions) {
      if (!q.questionText.trim()) {
        alert('All questions must have question text.');
        return;
      }
      if (q.type === 'MCQ' && (!q.options || q.options.some(o => !o.trim()))) {
        alert('All MCQ options must contain text.');
        return;
      }
    }

    try {
      setUploading(true); // show loader
      const response = await fetch('/api/questions/bulk-save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentId: reviewQuestions[0].documentId,
          questions: reviewQuestions
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save questions.');

      setSuccess(`Saved ${data.count} questions to the Question Bank successfully.`);
      setIsReviewing(false);
      setReviewQuestions([]);
      fetchDocuments();
    } catch (err) {
      alert(err.message || 'Failed to complete transaction.');
    } finally {
      setUploading(false);
    }
  };

  const filteredDocs = documents.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100 relative min-h-screen">
      {/* 1. Main Table Dashboard */}
      {!isReviewing ? (
        <>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              Study Materials <BookOpen className="h-7 w-7 text-indigo-400" />
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Upload lectures, textbook chapters, or reference sheets to build learning modules.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Side: Upload Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Upload Material</h3>
                <p className="text-slate-400 text-xs mt-0.5">Supports PDF, DOCX, PPTX, or TXT up to 25MB.</p>
              </div>

              {error && (
                <div className="bg-red-950/30 border border-red-800 text-red-300 p-3 rounded-lg flex items-start gap-2 text-sm animate-fade-in">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-emerald-950/30 border border-emerald-800 text-emerald-300 p-3 rounded-lg flex items-start gap-2 text-sm animate-fade-in">
                  <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="space-y-6">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/80"
                >
                  <Upload className="h-10 w-10 text-slate-400 mb-3" />
                  <p className="text-sm font-semibold text-white">Select File</p>
                  <p className="text-xs text-slate-500 mt-1">or drag & drop here</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.pptx,.txt"
                    onChange={handleFileChange}
                  />
                </div>

                {selectedFile && (
                  <div className="p-3 bg-slate-950 rounded-lg flex items-center justify-between border border-slate-800 animate-fade-in">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-5 w-5 text-indigo-400 shrink-0" />
                      <div className="truncate">
                        <p className="text-sm font-medium text-slate-200 truncate">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-red-400 hover:text-red-300 text-xs font-semibold px-2"
                    >
                      Clear
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!selectedFile || uploading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : 'Upload File'}
                </button>
              </form>
            </div>

            {/* Right Side: Document Table Grid */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search study documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={fetchDocuments}
                  className="p-2 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title="Refresh list"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                {filteredDocs.length === 0 ? (
                  <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
                    <FileMinus className="h-12 w-12 text-slate-700" />
                    <p className="text-sm font-semibold text-slate-400">No documents found</p>
                    <p className="text-xs text-slate-500 max-w-sm">Upload slides or lecture PDFs on the left to start extracting text and building test sets.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase">
                        <th className="pb-3">Name</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Pages</th>
                        <th className="pb-3 text-center">Questions</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredDocs.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-800/10 transition-colors">
                          <td className="py-4 pr-3 max-w-[200px] truncate">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-indigo-400 shrink-0" />
                              <div className="truncate">
                                <p className="font-medium text-slate-200 truncate" title={doc.name}>
                                  {doc.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(doc.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <StatusBadge status={doc.status} failureReason={doc.failureReason} onRetry={() => triggerProcessing(doc.id)} />
                          </td>
                          <td className="py-4 text-slate-300 font-mono">
                            {doc.status === 'PROCESSED' ? doc.pageCount : '-'}
                          </td>
                          <td className="py-4 text-center font-mono text-slate-300">
                            {doc._count?.questions || 0}
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {doc.status === 'PROCESSED' && (
                                <>
                                  <button
                                    onClick={() => setGeneratingDoc(doc)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-950 text-indigo-400 border border-indigo-900/35 hover:bg-indigo-900/40 rounded-lg text-xs font-semibold transition-all"
                                    title="Generate AI Questions"
                                  >
                                    <BrainCircuit className="h-3.5 w-3.5" />
                                    Generate
                                  </button>
                                  <button
                                    onClick={() => viewDocumentDetails(doc)}
                                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                                    title="View Details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDelete(doc.id, doc.name)}
                                className="p-1.5 hover:bg-slate-800 rounded-lg text-red-405 text-red-400 hover:text-red-300 transition-colors"
                                title="Delete document"
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
          </div>
        </>
      ) : (
        /* 2. Bulk Question Review Screen */
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                Review AI-Generated Questions <BrainCircuit className="h-7 w-7 text-indigo-400" />
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Refine, select, or regenerate questions before adding them to the bank.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setIsReviewing(false); setReviewQuestions([]); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-lg transition-all"
              >
                Discard Batch
              </button>
              <button
                onClick={handleSaveReviewedQuestions}
                disabled={reviewQuestions.length === 0 || uploading}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md shadow-indigo-900/10 transition-all disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Approve & Save ({reviewQuestions.length})
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {reviewQuestions.map((q, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-all relative">
                {q.regenerating && (
                  <div className="absolute inset-0 bg-slate-950/70 z-10 rounded-2xl flex items-center justify-center flex-col gap-2">
                    <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                    <span className="text-slate-300 text-xs font-semibold">Generating replacement...</span>
                  </div>
                )}
                
                {/* Header info */}
                <div className="flex justify-between items-center text-xs text-slate-500 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-400">Question {idx + 1}</span>
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono uppercase">
                      {q.type}
                    </span>
                  </div>
                  <div>
                    <span>Page {q.sourcePage} • Section: "{q.sourceSection}"</span>
                  </div>
                </div>

                {/* Inline Form Edit */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">Question Text</label>
                    <textarea
                      rows={2}
                      value={q.questionText}
                      onChange={(e) => handleEditReviewQuestion(idx, 'questionText', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 border-slate-800 rounded-lg p-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  {/* MCQ Options Edit */}
                  {q.type === 'MCQ' && q.options && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="space-y-1">
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase">Option {String.fromCharCode(65 + optIdx)}</label>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleEditMCQOption(idx, optIdx, e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Core scoring details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">Correct Answer</label>
                      {q.type === 'MCQ' ? (
                        <select
                          value={q.correctAnswer}
                          onChange={(e) => handleEditReviewQuestion(idx, 'correctAnswer', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="0">Option A</option>
                          <option value="1">Option B</option>
                          <option value="2">Option C</option>
                          <option value="3">Option D</option>
                        </select>
                      ) : q.type === 'TRUE_FALSE' ? (
                        <select
                          value={q.correctAnswer.toLowerCase()}
                          onChange={(e) => handleEditReviewQuestion(idx, 'correctAnswer', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={q.correctAnswer}
                          onChange={(e) => handleEditReviewQuestion(idx, 'correctAnswer', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          placeholder="Correct Answer description/keywords"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">Difficulty</label>
                      <select
                        value={q.difficulty}
                        onChange={(e) => handleEditReviewQuestion(idx, 'difficulty', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                        value={q.topic}
                        onChange={(e) => handleEditReviewQuestion(idx, 'topic', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">Explanation</label>
                    <textarea
                      rows={2}
                      value={q.explanation || ''}
                      onChange={(e) => handleEditReviewQuestion(idx, 'explanation', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                    />
                  </div>
                </div>

                {/* Footer action buttons */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/60">
                  <button
                    onClick={() => handleRegenerateQuestion(idx)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Regenerate
                  </button>
                  <button
                    onClick={() => handleDeleteReviewQuestion(idx)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 rounded-lg text-xs font-semibold transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Slide-out insights details drawer */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex justify-end animate-fade-in">
          <div className="w-full max-w-3xl bg-slate-900 border-l border-slate-800 h-full flex flex-col p-6 space-y-6 shadow-2xl overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-indigo-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">{viewingDoc.name}</h2>
                  <p className="text-slate-500 text-xs uppercase font-mono tracking-wider mt-0.5">
                    {viewingDoc.type} • {viewingDoc.pageCount} Pages
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setViewingDoc(null); setDocDetails(null); }}
                className="text-slate-400 hover:text-white font-medium text-sm px-3 py-1.5 border border-slate-800 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>

            {detailsLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                <p className="text-slate-400 text-sm font-semibold">Extracting insights & chunks...</p>
              </div>
            ) : docDetails ? (
              <div className="space-y-8 pb-10">
                <div className="bg-indigo-950/15 border border-indigo-900/30 rounded-xl p-5 space-y-6">
                  <div className="flex items-center gap-2 border-b border-indigo-900/20 pb-2">
                    <Sparkles className="h-5 w-5 text-indigo-400" />
                    <h3 className="text-md font-bold text-white">AI Document Insights</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 font-semibold uppercase">Difficulty Estimate</span>
                      <p className={`text-sm font-bold ${
                        docDetails.insights?.difficulty === 'HARD' ? 'text-red-400' :
                        docDetails.insights?.difficulty === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {docDetails.insights?.difficulty || 'MEDIUM'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 font-semibold uppercase">Suggested Quiz Topics</span>
                      <p className="text-sm text-slate-300">
                        {docDetails.insights?.suggestedQuizTopics?.join(', ') || 'General Review'}
                      </p>
                    </div>
                  </div>

                  {docDetails.insights?.topics?.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs text-slate-500 font-semibold uppercase block">Main Topics</span>
                      <div className="flex flex-wrap gap-2">
                        {docDetails.insights.topics.map((t, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-indigo-950 text-indigo-300 text-xs font-semibold rounded-lg border border-indigo-900/35">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {docDetails.insights?.definitions?.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs text-slate-500 font-semibold uppercase block">Key Definitions</span>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {docDetails.insights.definitions.map((def, idx) => (
                          <div key={idx} className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-xs">
                            <span className="font-bold text-white">{def.term}: </span>
                            <span className="text-slate-400">{def.definition}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {docDetails.insights?.formulas?.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs text-slate-500 font-semibold uppercase block">Important Formulas</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {docDetails.insights.formulas.map((form, idx) => (
                          <div key={idx} className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-xs font-mono">
                            <span className="font-bold text-white block mb-0.5">{form.name}</span>
                            <span className="text-indigo-300">{form.formula}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Extracted Semantic Chunks
                    <span className="text-xs font-mono font-medium text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                      {docDetails.chunks?.length || 0} chunks
                    </span>
                  </h3>
                  
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {docDetails.chunks?.map((chunk, idx) => (
                      <div key={chunk.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center text-xs font-semibold border-b border-slate-800 pb-2">
                          <span className="text-indigo-400">Chunk {idx + 1}</span>
                          <span className="text-slate-500 uppercase tracking-wider">
                            Page {chunk.pageNumber} • Section: "{chunk.sectionTitle}"
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-mono whitespace-pre-wrap">
                          {chunk.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 4. AI Question Generation Parameters Dialog Modal */}
      {generatingDoc && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Generate Questions <BrainCircuit className="h-5 w-5 text-indigo-400" />
              </h3>
              <button 
                onClick={() => setGeneratingDoc(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {generatingQuestions ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">Gemini is generating assessment items...</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    This distributes questions across source content chunks and validates each response format.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateAIQuestions} className="space-y-6">
                <div>
                  <p className="text-xs text-slate-500 mb-2 font-medium">DOCUMENT</p>
                  <p className="text-sm font-semibold text-indigo-300 truncate">{generatingDoc.name}</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Question Count</label>
                  <select
                    value={qCount}
                    onChange={(e) => setQCount(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="5">5 Questions</option>
                    <option value="10">10 Questions (Recommended)</option>
                    <option value="20">20 Questions</option>
                    <option value="30">30 Questions</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Difficulty Level</label>
                  <select
                    value={qDifficulty}
                    onChange={(e) => setQDifficulty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                    <option value="MIXED">MIXED (Randomised per question)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Include Types</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => handleTypeToggle('MCQ')}
                      className={`py-2 px-3 text-xs font-semibold border rounded-lg transition-all ${
                        qTypes.includes('MCQ') 
                          ? 'bg-indigo-950/40 text-indigo-400 border-indigo-700' 
                          : 'border-slate-800 text-slate-400 hover:bg-slate-850 hover:bg-slate-800'
                      }`}
                    >
                      MCQ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeToggle('TRUE_FALSE')}
                      className={`py-2 px-3 text-xs font-semibold border rounded-lg transition-all ${
                        qTypes.includes('TRUE_FALSE') 
                          ? 'bg-indigo-950/40 text-indigo-400 border-indigo-700' 
                          : 'border-slate-800 text-slate-400 hover:bg-slate-850 hover:bg-slate-800'
                      }`}
                    >
                      True/False
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeToggle('SHORT_ANSWER')}
                      className={`py-2 px-3 text-xs font-semibold border rounded-lg transition-all ${
                        qTypes.includes('SHORT_ANSWER') 
                          ? 'bg-indigo-950/40 text-indigo-400 border-indigo-700' 
                          : 'border-slate-800 text-slate-400 hover:bg-slate-850 hover:bg-slate-800'
                      }`}
                    >
                      Short Answer
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-3 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => setGeneratingDoc(null)}
                    className="px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-400 text-sm font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md transition-colors"
                  >
                    Generate AI Questions
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status, failureReason, onRetry }) => {
  if (status === 'UPLOADED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold bg-blue-950 text-blue-400 border border-blue-900/30">
        Uploaded
      </span>
    );
  }
  if (status === 'PROCESSING') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-900/30">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing
      </span>
    );
  }
  if (status === 'PROCESSED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-900/30">
        <CheckCircle className="h-3 w-3" />
        Processed
      </span>
    );
  }
  // FAILED state — show badge + reason + retry button
  return (
    <div className="space-y-1">
      <span
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold bg-red-950 text-red-400 border border-red-900/30"
        title={failureReason || 'Processing failed'}
      >
        <AlertCircle className="h-3 w-3" />
        Failed
        <button
          onClick={onRetry}
          className="ml-1 text-red-300 underline hover:text-white transition-colors"
        >
          Retry
        </button>
      </span>
      {failureReason && (
        <p className="text-xs text-red-400/70 max-w-xs leading-relaxed" title={failureReason}>
          {failureReason.length > 80 ? failureReason.substring(0, 80) + '…' : failureReason}
        </p>
      )}
    </div>
  );
};

export default Documents;
