import React, { useState, useEffect } from 'react';
import { X, Search, FileText, Bookmark, Layers, AlertCircle, Quote } from 'lucide-react';

export default function SourceTraceabilityModal({ isOpen, onClose, questionId, sourceData }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (sourceData) {
        setData(sourceData);
      } else if (questionId) {
        fetchSource();
      }
    }
  }, [isOpen, questionId, sourceData]);

  const fetchSource = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/questions/${questionId}/source`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch question source context.');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Source Traceability</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Verify AI Question $\rightarrow$ Source Document $\rightarrow$ Extracted Chunk
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
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center space-y-3">
              <div className="w-7 h-7 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-400">Locating source document chunk...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : data ? (
            <>
              {/* Question Text */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Question Text
                </div>
                <p className="text-sm text-slate-200 font-medium leading-relaxed">
                  "{data.questionText}"
                </p>
              </div>

              {/* Source Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Document</span>
                  </div>
                  <div className="text-xs font-bold text-slate-200 mt-1 truncate">
                    {data.documentName || 'Source PDF'}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                    <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Page Reference</span>
                  </div>
                  <div className="text-xs font-bold text-slate-200 mt-1">
                    {data.sourcePage ? `Page ${data.sourcePage}` : 'Page 1'}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 col-span-2 sm:col-span-1">
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>Section / Chunk</span>
                  </div>
                  <div className="text-xs font-bold text-slate-200 mt-1 truncate">
                    {data.sourceSection || 'General Section'}
                  </div>
                </div>
              </div>

              {/* Source Text Chunk */}
              <div>
                <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center space-x-2">
                  <Quote className="w-4 h-4 text-emerald-400" />
                  <span>Grounding Text Chunk</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/20 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {data.chunkText || 'No source text recorded.'}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
