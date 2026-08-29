import React from 'react';
import { SidebarOpen } from 'lucide-react';

const Placeholder = ({ title }) => {
  return (
    <div className="p-8 max-w-7xl mx-auto text-slate-100 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
        <p className="text-slate-400 text-sm mt-1">This module is currently in development.</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
        <div className="p-4 bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 rounded-full">
          <SidebarOpen className="h-10 w-10 animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Feature Arriving in Next Phase</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto mt-2">
            The technical scaffolding is complete. AI-driven document chunking, question banks, quiz building, and evaluation logic will hook into this screen shortly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Placeholder;
