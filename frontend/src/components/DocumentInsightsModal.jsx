import React, { useState, useEffect } from 'react';
import { X, Sparkles, BookOpen, Layers, HelpCircle, CheckCircle, AlertCircle, FileText, Cpu, CheckSquare } from 'lucide-react';

export default function DocumentInsightsModal({ isOpen, onClose, documentId }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && documentId) {
      fetchInsights();
    }
  }, [isOpen, documentId]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/documents/${documentId}/insights`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch document insights.');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const insights = data?.insights || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">AI Document Insights</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {data?.name || 'Document'} • {data?.pageCount || 0} Pages • {data?.chunkCount || 0} Chunks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-400">Extracting document curriculum insights...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Estimated Difficulty & Assessment Recommendation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    <span>Estimated Content Difficulty</span>
                  </div>
                  <div className="flex items-center space-x-3 mt-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      insights.difficulty === 'HARD'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : insights.difficulty === 'EASY'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {insights.difficulty || 'MEDIUM'}
                    </span>
                    <span className="text-xs text-slate-400">
                      Based on vocabulary density & formula complexity
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    <span>Recommended Assessment</span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium">
                    Recommended: 15 MCQs + 5 Short Answer questions based on {insights.topics?.length || 0} core topics.
                  </p>
                </div>
              </div>

              {/* Topics Breakdown */}
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span>Identified Curriculum Topics ({insights.topics?.length || 0})</span>
                </h3>
                {insights.topics && insights.topics.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {insights.topics.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No specific topic tags detected.</p>
                )}
              </div>

              {/* Important Concepts */}
              {insights.concepts && insights.concepts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Core Concepts</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {insights.concepts.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs text-slate-300 flex items-center space-x-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0"></span>
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Definitions */}
              {insights.definitions && insights.definitions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Extracted Key Definitions</span>
                  </h3>
                  <div className="space-y-2">
                    {insights.definitions.map((def, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                        <div className="font-semibold text-amber-300 text-xs">{def.term}</div>
                        <div className="text-xs text-slate-400 mt-1 leading-relaxed">{def.definition}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulas & Equations */}
              {insights.formulas && insights.formulas.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center space-x-2">
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                    <span>Formulas & Equations</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insights.formulas.map((f, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-purple-500/20">
                        <div className="text-xs font-semibold text-purple-300">{f.name}</div>
                        <div className="font-mono text-xs text-slate-200 mt-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                          {f.formula}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            Close Insights
          </button>
        </div>
      </div>
    </div>
  );
}
