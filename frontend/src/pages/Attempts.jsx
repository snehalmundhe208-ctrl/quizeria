import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Download, 
  HelpCircle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowUpDown, 
  ChevronRight, 
  X, 
  Check, 
  Loader2,
  FileText,
  UserCheck
} from 'lucide-react';

const Attempts = () => {
  const { token } = useAuth();

  // List states
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter settings
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [quizFilter, setQuizFilter] = useState('');
  const [quizzes, setQuizzes] = useState([]);

  // Sort settings
  const [sortField, setSortField] = useState('submitTime');
  const [sortOrder, setSortOrder] = useState('desc');

  // Manual Review Grading Modal state
  const [reviewAttemptId, setReviewAttemptId] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [gradeInputs, setGradeInputs] = useState({}); // { [questionId]: { marksObtained: number, isCorrect: boolean } }
  const [submittingGrades, setSubmittingGrades] = useState(false);

  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (quizFilter) params.append('quizId', quizFilter);

      const response = await fetch(`/api/quizzes/attempts/all?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch attempts list.');
      const data = await response.json();
      setAttempts(data.attempts);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve participant attempts.');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const response = await fetch('/api/quizzes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.quizzes);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAttempts();
    fetchQuizzes();
  }, [token, statusFilter, quizFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAttempts();
  };

  // CSV Generator Client Side
  const handleExportCSV = () => {
    if (attempts.length === 0) return;

    const headers = ['Student Name', 'Student ID', 'Quiz Title', 'Status', 'Score Obtained', 'Max Marks', 'Percentage (%)', 'Submitted At'];
    const rows = attempts.map(a => [
      a.studentName,
      a.studentId || 'N/A',
      `"${a.quizTitle.replace(/"/g, '""')}"`,
      a.status,
      a.score,
      a.maxMarks,
      a.percentage.toFixed(1),
      a.submitTime ? new Date(a.submitTime).toLocaleString() : 'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `studyforge_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Grading Modal
  const handleOpenReview = async (id) => {
    setReviewAttemptId(id);
    setReviewLoading(true);
    setReviewData(null);
    try {
      const response = await fetch(`/api/quizzes/attempts/${id}/review`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load review sheet.');
      const data = await response.json();
      setReviewData(data);

      // Initialize inputs dictionary
      const inputs = {};
      data.shortAnswers.forEach(ans => {
        inputs[ans.questionId] = {
          marksObtained: ans.marksObtained !== null ? ans.marksObtained : 0,
          isCorrect: ans.isCorrect !== null ? ans.isCorrect : false
        };
      });
      setGradeInputs(inputs);
    } catch (err) {
      alert(err.message);
      setReviewAttemptId(null);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleGradeToggle = (qId, isCorrect, maxMarks) => {
    setGradeInputs(prev => ({
      ...prev,
      [qId]: {
        isCorrect,
        marksObtained: isCorrect ? maxMarks : 0.0
      }
    }));
  };

  const handleMarksChange = (qId, val, maxMarks) => {
    const parsed = parseFloat(val);
    const marks = isNaN(parsed) ? 0.0 : Math.min(maxMarks, Math.max(0.0, parsed));
    setGradeInputs(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        marksObtained: marks
      }
    }));
  };

  const handleSubmitGrades = async (e) => {
    e.preventDefault();
    setSubmittingGrades(true);

    const gradesPayload = Object.entries(gradeInputs).map(([qId, val]) => ({
      questionId: qId,
      isCorrect: val.isCorrect,
      marksObtained: val.marksObtained
    }));

    try {
      const response = await fetch(`/api/quizzes/attempts/${reviewAttemptId}/review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ grades: gradesPayload })
      });

      if (!response.ok) throw new Error('Failed to submit manual evaluations.');
      
      alert('Manual review committed and finalized!');
      setReviewAttemptId(null);
      fetchAttempts();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingGrades(false);
    }
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Sort list
  const sortedAttempts = [...attempts].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (sortField === 'studentName') {
      valA = a.studentName.toLowerCase();
      valB = b.studentName.toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100 relative min-h-screen">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Attempts & Grading <UserCheck className="h-7 w-7 text-indigo-400" />
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Grade short-answer questions, filter quiz progress, and download scorecard sheets.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={attempts.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-900/10 transition-all disabled:opacity-40 self-start md:self-auto"
        >
          <Download className="h-4 w-4" />
          Export CSV Sheet
        </button>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search student or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <select
            value={quizFilter}
            onChange={(e) => setQuizFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="">All Assessments</option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>{q.title}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="STARTED">STARTED</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="UNDER_REVIEW">UNDER REVIEW</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>

          <button
            type="submit"
            className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold rounded-lg transition-colors border border-slate-800"
          >
            Apply Filters
          </button>
        </form>
      </div>

      {/* MAIN ATTEMPTS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="text-slate-400 text-xs font-semibold">Updating credentials data...</p>
            </div>
          ) : sortedAttempts.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
              <HelpCircle className="h-12 w-12 text-slate-700" />
              <p className="text-sm font-semibold text-slate-400">No attempts found</p>
              <p className="text-xs text-slate-500 max-w-sm">No students have submitted responses matching this filter sequence.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase">
                  <th className="pb-3 cursor-pointer select-none" onClick={() => toggleSort('studentName')}>
                    Student <ArrowUpDown className="h-3 w-3 inline ml-1 text-slate-500" />
                  </th>
                  <th className="pb-3">Quiz</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-center cursor-pointer select-none" onClick={() => toggleSort('percentage')}>
                    Score <ArrowUpDown className="h-3 w-3 inline ml-1 text-slate-500" />
                  </th>
                  <th className="pb-3 text-center cursor-pointer select-none" onClick={() => toggleSort('submitTime')}>
                    Submitted At <ArrowUpDown className="h-3 w-3 inline ml-1 text-slate-500" />
                  </th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {sortedAttempts.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="py-4 pr-3 max-w-[200px] truncate">
                      <div>
                        <p className="font-semibold text-slate-200 truncate">{att.studentName}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{att.studentId || 'No ID'}</p>
                      </div>
                    </td>
                    <td className="py-4 pr-3 max-w-[200px] truncate">
                      <p className="text-slate-300 font-medium truncate">{att.quizTitle}</p>
                    </td>
                    <td className="py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        att.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400 border-emerald-900/35' :
                        att.status === 'UNDER_REVIEW' ? 'bg-amber-950 text-amber-400 border-amber-900/35' :
                        att.status === 'STARTED' ? 'bg-blue-950 text-blue-400 border-blue-900/30' :
                        'bg-slate-800 text-slate-400 border-slate-700/60'
                      }`}>
                        {att.status}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      <div className="font-mono">
                        <span className="text-indigo-400 font-bold">{att.percentage.toFixed(0)}%</span>
                        <span className="text-[10px] text-slate-500 block">({att.score.toFixed(1)}/{att.maxMarks})</span>
                      </div>
                    </td>
                    <td className="py-4 text-center text-xs text-slate-400 font-mono">
                      {att.submitTime ? new Date(att.submitTime).toLocaleString() : (
                        <span className="text-[10px] text-blue-400 flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      {att.status === 'UNDER_REVIEW' ? (
                        <button
                          onClick={() => handleOpenReview(att.id)}
                          className="px-2.5 py-1.5 bg-amber-950 hover:bg-amber-900 border border-amber-900/40 rounded-lg text-xs font-bold text-amber-400 transition-all flex items-center gap-1.5 ml-auto"
                        >
                          Grade Paper
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-650 text-slate-500 font-semibold uppercase pr-3 select-none">
                          No Review
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* SHORT-ANSWER MANUAL GRADING VIEW DRAWER */}
      {reviewAttemptId && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between shadow-2xl p-6 relative overflow-hidden animate-slide-left">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Paper Review <UserCheck className="h-5 w-5 text-amber-400" />
                </h3>
                {reviewData && (
                  <p className="text-xs text-slate-400 mt-1">
                    Student: <span className="text-slate-200 font-semibold">{reviewData.attempt.student.name}</span> • Assessment: {reviewData.attempt.quiz.title}
                  </p>
                )}
              </div>
              <button 
                onClick={() => setReviewAttemptId(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrolling Card Lists */}
            <div className="flex-1 overflow-y-auto my-6 space-y-6 pr-1">
              {reviewLoading ? (
                <div className="py-20 text-center flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
                  <p className="text-slate-400 text-xs font-semibold">Loading student answer sheet...</p>
                </div>
              ) : reviewData && reviewData.shortAnswers.length === 0 ? (
                <div className="py-20 text-center text-slate-500 text-xs">
                  No short answer questions to grade in this attempt.
                </div>
              ) : (
                reviewData && reviewData.shortAnswers.map((ans, idx) => {
                  const state = gradeInputs[ans.questionId] || { marksObtained: 0, isCorrect: false };
                  return (
                    <div key={ans.questionId} className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                      
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase font-mono">Question {idx + 1}</span>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Max Marks: {ans.maxMarks}</span>
                      </div>

                      <h4 className="text-sm font-semibold text-white leading-relaxed">{ans.questionText}</h4>
                      
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-550 text-slate-500 uppercase font-semibold">Student Answer</span>
                        <p className="text-xs text-slate-350 text-slate-300 leading-relaxed font-mono bg-slate-900 border border-slate-850 p-3 rounded-xl">
                          {ans.studentAnswer || 'Unanswered'}
                        </p>
                      </div>

                      {/* Reference Answer Keys */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs border-t border-slate-900 bg-slate-900/20 p-3.5 rounded-xl">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Correct Answer keywords</span>
                          <p className="text-indigo-400 font-mono mt-0.5">{ans.referenceAnswer}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">AI Explanations</span>
                          <p className="text-slate-400 leading-normal mt-0.5">{ans.explanation}</p>
                        </div>
                      </div>

                      {/* Grading inputs */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-900">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleGradeToggle(ans.questionId, true, ans.maxMarks)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                              state.isCorrect 
                                ? 'bg-emerald-950 border border-emerald-900/40 text-emerald-400' 
                                : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-350'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" /> Correct
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGradeToggle(ans.questionId, false, ans.maxMarks)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                              !state.isCorrect && state.marksObtained === 0.0
                                ? 'bg-red-950 border border-red-900/40 text-red-400'
                                : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-350'
                            }`}
                          >
                            <X className="h-3.5 w-3.5" /> Incorrect
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-semibold">Award Marks:</span>
                          <input
                            type="number"
                            min="0"
                            max={ans.maxMarks}
                            step="0.5"
                            value={state.marksObtained}
                            onChange={(e) => handleMarksChange(ans.questionId, e.target.value, ans.maxMarks)}
                            className="w-16 bg-slate-900 border border-slate-850 rounded text-center text-xs py-1 text-indigo-400 font-bold focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-500">/ {ans.maxMarks}</span>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800 pt-4 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setReviewAttemptId(null)}
                className="px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitGrades}
                disabled={submittingGrades || reviewLoading || !reviewData}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                {submittingGrades ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving grades...
                  </>
                ) : (
                  <>
                    Finalize Scoring
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Attempts;
