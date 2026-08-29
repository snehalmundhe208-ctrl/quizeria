import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Eye, 
  Printer, 
  HelpCircle, 
  Loader2, 
  ChevronRight, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUp, 
  ArrowDown, 
  RefreshCw, 
  BookOpen, 
  Clock, 
  Award,
  Sparkles
} from 'lucide-react';

const QuestionPapers = () => {
  const { token } = useAuth();

  // Screen layout: 'list' | 'create' | 'preview'
  const [screen, setScreen] = useState('list');
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Source selections
  const [documents, setDocuments] = useState([]);
  
  // Paper Form
  const [documentId, setDocumentId] = useState('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [totalMarks, setTotalMarks] = useState(100);
  const [instructions, setInstructions] = useState('Answer all questions.');

  // Blueprint sections array: { id, name, type, count, marksPerQuestion }
  const [sections, setSections] = useState([
    { id: '1', name: 'Section A: MCQs', type: 'MCQ', count: 10, marksPerQuestion: 2 },
    { id: '2', name: 'Section B: Essay questions', type: 'SHORT_ANSWER', count: 5, marksPerQuestion: 16 }
  ]);

  // Preview paper details
  const [activePaper, setActivePaper] = useState(null);
  const [activePaperLoading, setActivePaperLoading] = useState(false);
  const [savingEdits, setSavingEdits] = useState(false);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/papers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch question papers list.');
      const data = await response.json();
      setPapers(data.papers);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve question papers feed.');
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
        if (data.documents.length > 0) {
          setDocumentId(data.documents[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPapers();
    fetchDocuments();
  }, [token]);

  const handleStartCreate = () => {
    setTitle('');
    setSubject('');
    setDurationMinutes(120);
    setTotalMarks(100);
    setInstructions('Answer all questions.');
    setSections([
      { id: '1', name: 'Section A: MCQs', type: 'MCQ', count: 10, marksPerQuestion: 2 },
      { id: '2', name: 'Section B: Essay questions', type: 'SHORT_ANSWER', count: 5, marksPerQuestion: 16 }
    ]);
    setError('');
    setSuccess('');
    setScreen('create');
  };

  const handleAddSection = () => {
    const nextId = String(sections.length + 1);
    setSections(prev => [
      ...prev,
      { id: nextId, name: `Section ${String.fromCharCode(65 + prev.length)}`, type: 'MCQ', count: 5, marksPerQuestion: 2 }
    ]);
  };

  const handleRemoveSection = (secId) => {
    setSections(prev => prev.filter(s => s.id !== secId));
  };

  const handleSectionFieldChange = (secId, field, value) => {
    setSections(prev => prev.map(s => {
      if (s.id === secId) {
        let val = value;
        if (field === 'count' || field === 'marksPerQuestion') {
          val = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
        }
        return { ...s, [field]: val };
      }
      return s;
    }));
  };

  const calculateBlueprintSum = () => {
    return sections.reduce((sum, s) => sum + (s.count * s.marksPerQuestion), 0);
  };

  const handleGeneratePaper = async (e) => {
    e.preventDefault();
    if (!title || !subject || !documentId) {
      setError('Please fill in all details.');
      return;
    }

    const calculatedSum = calculateBlueprintSum();
    if (Math.abs(calculatedSum - parseFloat(totalMarks)) > 0.01) {
      setError(`Blueprint total sum (${calculatedSum} marks) must exactly equal Total Marks field (${totalMarks} marks).`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/papers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentId,
          title,
          subject,
          durationMinutes: parseInt(durationMinutes, 10),
          totalMarks: parseFloat(totalMarks),
          instructions,
          blueprint: sections
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Blueprint generation failed.');

      setSuccess('Question paper compiled successfully!');
      setScreen('list');
      fetchPapers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPreview = async (paperId) => {
    setActivePaperLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/papers/${paperId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load paper details.');
      const data = await response.json();
      setActivePaper(data.paper);
      setScreen('preview');
    } catch (err) {
      alert(err.message);
    } finally {
      setActivePaperLoading(false);
    }
  };

  const handleDeletePaper = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const response = await fetch(`/api/papers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete paper.');
      setPapers(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  // Drag reorder inside preview list (swapping)
  const handleSwapQuestions = (index, direction) => {
    if (!activePaper) return;
    const questions = [...activePaper.questions];
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = questions[index];
    questions[index] = questions[targetIdx];
    questions[targetIdx] = temp;

    // re-assign sortOrder indices
    const updated = questions.map((q, idx) => ({ ...q, sortOrder: idx }));
    setActivePaper(prev => ({ ...prev, questions: updated }));
  };

  const handleUpdateMarks = (index, val) => {
    if (!activePaper) return;
    const parsed = parseFloat(val);
    const questions = [...activePaper.questions];
    questions[index].marks = isNaN(parsed) ? 0 : parsed;
    setActivePaper(prev => ({ ...prev, questions }));
  };

  const handleSaveEdits = async () => {
    if (!activePaper) return;
    setSavingEdits(true);
    try {
      const payload = {
        title: activePaper.title,
        subject: activePaper.subject,
        durationMinutes: activePaper.durationMinutes,
        instructions: activePaper.instructions,
        questions: activePaper.questions.map((q, idx) => ({
          questionId: q.questionId,
          sectionId: q.sectionId,
          marks: q.marks,
          sortOrder: idx
        }))
      };

      const response = await fetch(`/api/papers/${activePaper.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to save paper modifications.');
      setSuccess('Question paper edits synchronized successfully.');
      handleOpenPreview(activePaper.id); // Reload
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingEdits(false);
    }
  };

  // Regenerate section
  const handleRegenerateSection = async (secId) => {
    if (!activePaper || !confirm(`Regenerate all questions in "${secId}"? This replaces current questions with new matches.`)) return;

    setActivePaperLoading(true);
    try {
      const response = await fetch(`/api/papers/${activePaper.id}/regenerate-section`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sectionId: secId,
          documentId: activePaper.questions[0]?.question.documentId // retrieve documentId reference
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Regeneration failed.');

      alert('Section questions regenerated!');
      handleOpenPreview(activePaper.id); // reload
    } catch (err) {
      alert(err.message);
      setActivePaperLoading(false);
    }
  };

  // Open unauthenticated print page in a new browser tab
  const handlePrint = (mode) => {
    if (!activePaper) return;
    if (mode === 'answer_key') {
      window.open(`/api/papers/${activePaper.id}/export?mode=answer_key&token=${token}`, '_blank');
    } else {
      window.open(`/api/public/papers/${activePaper.id}/export?mode=student`, '_blank');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100 relative min-h-screen">
      
      {/* FLOAT SUCCESS/ERROR NOTIFICATIONS */}
      {success && (
        <div className="bg-emerald-950/30 border border-emerald-800 text-emerald-300 p-3 rounded-lg flex items-center justify-between text-sm animate-fade-in">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> {success}</span>
          <button onClick={() => setSuccess('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* 1. PAPERS LISTING VIEW */}
      {screen === 'list' && (
        <>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                Exam Papers <FileText className="h-7 w-7 text-indigo-400" />
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Design blueprint sections, sample question types, and print dual-mode PDF copies.
              </p>
            </div>
            <button
              onClick={handleStartCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-900/10 transition-all self-start md:self-auto"
            >
              <Plus className="h-4 w-4" />
              Compile Paper
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                  <p className="text-slate-400 text-xs font-semibold">Retrieving examinations database...</p>
                </div>
              ) : papers.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
                  <BookOpen className="h-12 w-12 text-slate-700" />
                  <p className="text-sm font-semibold text-slate-400">No exam papers compiled yet</p>
                  <p className="text-xs text-slate-500 max-w-sm">Use the compiler to design blueprints, sample matching items, and print paper copies.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase">
                      <th className="pb-3">Subject / Title</th>
                      <th className="pb-3 text-center">Marks</th>
                      <th className="pb-3 text-center">Time Limit</th>
                      <th className="pb-3 text-center">Questions</th>
                      <th className="pb-3 text-center">Generated</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {papers.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/10 transition-colors">
                        <td className="py-4 pr-3 max-w-[240px] truncate">
                          <div>
                            <p className="font-semibold text-slate-200 truncate">{p.title}</p>
                            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{p.subject}</p>
                          </div>
                        </td>
                        <td className="py-4 text-center font-mono text-indigo-300 font-bold">{p.totalMarks}</td>
                        <td className="py-4 text-center text-slate-300">{p.durationMinutes} mins</td>
                        <td className="py-4 text-center text-slate-300 font-mono">{p._count.questions}</td>
                        <td className="py-4 text-center text-xs text-slate-450 text-slate-500 font-mono">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenPreview(p.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-800 rounded-lg text-xs font-semibold text-indigo-400 transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                            <button
                              onClick={() => handleDeletePaper(p.id, p.title)}
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                              title="Delete Paper"
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

      {/* 2. BLUEPRINT BUILDER FORM VIEW */}
      {screen === 'create' && (
        <form onSubmit={handleGeneratePaper} className="space-y-8 max-w-7xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                Blueprint Compiler <Sparkles className="h-6 w-6 text-indigo-400" />
              </h1>
              <p className="text-slate-400 text-sm mt-1">Bundle sections, difficulty weights, and marks mappings.</p>
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
                Compile Paper
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-950/20 border border-red-800 rounded-xl text-red-300 text-xs animate-fade-in">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Box: Meta Settings */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white mb-4">Paper Parameters</h3>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Document Source *</label>
                  <select
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-205 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>{doc.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Examination Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. Midterm Examination 2026"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Subject / Course *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. CS101: Computer Science Fundamentals"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase">Duration (Mins) *</label>
                    <input
                      type="number"
                      required
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase">Total Marks *</label>
                    <input
                      type="number"
                      required
                      value={totalMarks}
                      onChange={(e) => setTotalMarks(parseFloat(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Special Instructions</label>
                  <textarea
                    rows={3}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-normal"
                    placeholder="e.g. Write all answers in blue ink."
                  />
                </div>
              </div>
            </div>

            {/* Right Box: Blueprint Builder */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-white">Sections Blueprint ({sections.length})</h3>
                  <div className="text-[11px] font-semibold uppercase flex flex-col items-end gap-1">
                    <div>
                      Sum: <span className={`${Math.abs(calculateBlueprintSum() - totalMarks) > 0.01 ? 'text-red-400 font-bold' : 'text-indigo-400'} font-mono text-xs`}>{calculateBlueprintSum()} / {totalMarks} Marks</span>
                    </div>
                    {Math.abs(calculateBlueprintSum() - totalMarks) > 0.01 && (
                      <span className="text-[9px] text-red-450 text-red-400 font-bold lowercase flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> marks sum mismatch!
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {sections.map((sec, idx) => {
                    const secSum = sec.count * sec.marksPerQuestion;
                    return (
                      <div key={sec.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3 relative hover:border-slate-800 transition-colors">
                        
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-indigo-400 font-mono">SECTION {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSection(sec.id)}
                            className="p-1 hover:bg-slate-900 rounded text-red-400 hover:text-red-300"
                            title="Remove section"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Section Name</label>
                            <input
                              type="text"
                              required
                              value={sec.name}
                              onChange={(e) => handleSectionFieldChange(sec.id, 'name', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white placeholder-slate-650"
                              placeholder="e.g. Section A: Multiple Choices"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Question Type</label>
                            <select
                              value={sec.type}
                              onChange={(e) => handleSectionFieldChange(sec.id, 'type', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                            >
                              <option value="MCQ">MCQ (Multiple Choice)</option>
                              <option value="TRUE_FALSE">TRUE / FALSE</option>
                              <option value="SHORT_ANSWER">SHORT ANSWER</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Section Marks</label>
                            <div className="text-xs font-mono font-bold text-indigo-300 pt-1.5 pl-1">
                              {secSum} Marks
                            </div>
                          </div>

                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Questions Count</label>
                            <input
                              type="number"
                              min="1"
                              value={sec.count}
                              onChange={(e) => handleSectionFieldChange(sec.id, 'count', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Marks Per Question</label>
                            <input
                              type="number"
                              min="0.5"
                              step="0.5"
                              value={sec.marksPerQuestion}
                              onChange={(e) => handleSectionFieldChange(sec.id, 'marksPerQuestion', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono"
                            />
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleAddSection}
                  className="w-full py-2.5 border border-dashed border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5 mt-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Section Blueprint
                </button>
              </div>
            </div>

          </div>
        </form>
      )}

      {/* 3. PREVIEW & EDIT PAPER QUESTIONS LIST VIEW */}
      {screen === 'preview' && activePaper && (
        <div className="space-y-8">
          
          <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-slate-800 pb-4 gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white truncate">{activePaper.title}</h1>
              <p className="text-slate-400 text-sm mt-1">
                Subject: <span className="text-slate-200 font-semibold">{activePaper.subject}</span> • Marks: {activePaper.totalMarks} • Time: {activePaper.durationMinutes} mins
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setScreen('list')}
                className="px-3 py-1.5 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-bold text-slate-400"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleSaveEdits}
                disabled={savingEdits}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-indigo-400 border border-slate-800 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {savingEdits ? 'Syncing...' : 'Save Reordering'}
              </button>

              {/* Exports */}
              <button
                type="button"
                onClick={() => handlePrint('student')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow"
              >
                <Printer className="h-3.5 w-3.5" />
                Student PDF
              </button>

              <button
                type="button"
                onClick={() => handlePrint('answer_key')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-800 text-slate-200 rounded-lg text-xs font-bold transition-all"
              >
                <Printer className="h-3.5 w-3.5 text-red-400" />
                Answer Key
              </button>
            </div>
          </div>

          {activePaperLoading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="text-slate-400 text-xs font-semibold">Generating section questions...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8">
              
              {/* Instructions edit box */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Special Instructions</span>
                <textarea
                  rows={2}
                  value={activePaper.instructions || ''}
                  onChange={(e) => setActivePaper(prev => ({ ...prev, instructions: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none font-sans leading-relaxed"
                />
              </div>

              {/* Questions organized by section */}
              {(() => {
                // Group locally
                const sectionsData = {};
                activePaper.questions.forEach((q, idx) => {
                  const secId = q.sectionId;
                  if (!sectionsData[secId]) sectionsData[secId] = [];
                  sectionsData[secId].push({ ...q, originalIndex: idx });
                });

                return Object.entries(sectionsData).map(([secId, qList]) => {
                  const sectionTotal = qList.reduce((sum, q) => sum + q.marks, 0);
                  return (
                    <div key={secId} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
                      
                      {/* Section header */}
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <div>
                          <h3 className="text-md font-bold text-white">{secId}</h3>
                          <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">Section total: {sectionTotal} marks</span>
                        </div>

                        {/* Regenerate button */}
                        <button
                          type="button"
                          onClick={() => handleRegenerateSection(secId)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded text-[10px] font-bold text-amber-400 transition-colors"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Regenerate Section
                        </button>
                      </div>

                      {/* Section questions list */}
                      <div className="space-y-4">
                        {qList.map((qItem, secIdx) => {
                          const q = qItem.question;
                          return (
                            <div key={qItem.id} className="flex gap-4 items-start bg-slate-950 border border-slate-850 p-4 rounded-2xl hover:border-slate-800 transition-all">
                              
                              <span className="h-6 w-6 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold font-mono text-slate-400 flex items-center justify-center shrink-0">
                                {secIdx + 1}
                              </span>

                              <div className="flex-1 min-w-0 pr-3">
                                <p className="text-xs font-semibold text-slate-200 leading-relaxed">{q.questionText}</p>
                                
                                {q.type === 'MCQ' && q.options && (
                                  <div className="grid grid-cols-2 gap-2 mt-2 pl-3">
                                    {q.options.map((opt, optIdx) => (
                                      <span key={optIdx} className="text-[10px] text-slate-500 font-medium">
                                        ({String.fromCharCode(65 + optIdx)}) {opt}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                <span className="text-[9px] text-slate-500 font-bold block mt-2.5 uppercase">
                                  {q.topic} • Difficulty: {q.difficulty}
                                </span>
                              </div>

                              {/* Reorder and marks override controls */}
                              <div className="flex items-center gap-3 shrink-0 ml-3">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Marks:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={qItem.marks}
                                    onChange={(e) => handleUpdateMarks(qItem.originalIndex, e.target.value)}
                                    className="w-12 bg-slate-900 border border-slate-800 rounded text-center text-xs py-0.5 text-indigo-400 focus:outline-none font-bold"
                                  />
                                </div>

                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSwapQuestions(qItem.originalIndex, 'up')}
                                    disabled={qItem.originalIndex === 0}
                                    className="p-0.5 hover:bg-slate-900 text-slate-500 hover:text-white rounded disabled:opacity-30"
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSwapQuestions(qItem.originalIndex, 'down')}
                                    disabled={qItem.originalIndex === activePaper.questions.length - 1}
                                    className="p-0.5 hover:bg-slate-900 text-slate-500 hover:text-white rounded disabled:opacity-30"
                                  >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>

                    </div>
                  );
                });
              })()}

            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default QuestionPapers;
