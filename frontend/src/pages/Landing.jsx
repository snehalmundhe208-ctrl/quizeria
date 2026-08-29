import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  ArrowRight, 
  Upload, 
  Cpu, 
  BookOpen, 
  Share2, 
  Sparkles, 
  FileText, 
  Award,
  Lock,
  Clock,
  FileSpreadsheet
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-slate-100 flex flex-col justify-between font-sans relative overflow-x-hidden">
      
      {/* Subtle background gradient mesh */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-indigo-50/30 via-white to-white -z-10 pointer-events-none" />

      {/* 1. HEADER / NAVBAR */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <GraduationCap className="h-8 w-8 text-indigo-600" />
          <span className="text-xl font-bold tracking-tight text-slate-100">StudyForge AI</span>
        </div>
        
        {/* Navbar Links */}
        <div className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How It Works</a>
          <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="px-4 py-2 border-2 border-indigo-650 text-indigo-650 text-xs font-bold rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors bg-white text-indigo-600 border-indigo-600"
        >
          Educator Login
        </button>
      </header>

      {/* 2. HERO SECTION */}
      <section className="pt-16 pb-12 px-6 max-w-5xl mx-auto text-center space-y-6 relative">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100/40">
          <Sparkles className="h-3.5 w-3.5" /> Next-Gen AI Assessments
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-100 leading-tight tracking-tight max-w-4xl mx-auto">
          Turn Any Document Into a Quiz in Minutes
        </h1>

        <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          Digest textbooks, lecture slides, notes, or scanned PDFs. StudyForge AI parses semantic page structure, extracts educational study insights, and compiles secure online quizzes and printable academic exam papers.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <button
            onClick={() => navigate('/register')}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow transition-colors"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 border-2 border-indigo-600 hover:bg-indigo-50 text-indigo-600 text-sm font-bold rounded-lg transition-all bg-white"
          >
            Educator Login
          </button>
        </div>

        {/* Mock Browser Graphic */}
        <div className="max-w-4xl mx-auto mt-10 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden text-left border-collapse">
          {/* Browser Header Bar */}
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-400"></span>
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
            </div>
            <div className="bg-white border border-slate-205 border-slate-200 rounded px-12 py-0.5 text-[10px] text-slate-400 font-mono flex items-center gap-1 select-none">
              <Lock className="h-2.5 w-2.5 text-emerald-500" /> studyforge.ai/quiz/take/attempt_8c80f
            </div>
            <div className="w-12"></div>
          </div>
          {/* Browser Body / Assessment Taker View */}
          <div className="p-6 sm:p-8 bg-white space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Midterm Quiz: Operating Systems</span>
                <h4 className="text-sm font-bold text-slate-200">Question 3 of 10</h4>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500">Time Left: </span>
                <span className="text-xs font-mono font-bold text-indigo-650 bg-indigo-50 px-2 py-1 rounded text-indigo-600">28:45 mins</span>
              </div>
            </div>

            {/* Simulated Progress bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full w-[30%]"></div>
            </div>

            <div className="space-y-4">
              <p className="text-xs sm:text-sm font-bold text-slate-100 leading-relaxed">
                Which of the following scheduling algorithms can lead to thread starvation if process execution queues remain heavily saturated?
              </p>
              
              <div className="grid grid-cols-1 gap-2.5">
                <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100/50 cursor-pointer transition-colors text-xs font-medium text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-500">A</span>
                  <span>First-Come, First-Served (FCFS)</span>
                </div>
                <div className="flex items-center gap-3 p-3 border border-indigo-200 rounded-xl bg-indigo-50/30 cursor-pointer transition-colors text-xs font-semibold text-indigo-700">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">B</span>
                  <span>Shortest Job First (SJF)</span>
                </div>
                <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100/50 cursor-pointer transition-colors text-xs font-medium text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-500">C</span>
                  <span>Round Robin Scheduling (Time Quantum = 10ms)</span>
                </div>
                <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100/50 cursor-pointer transition-colors text-xs font-medium text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-500">D</span>
                  <span>Priority-Based Scheduling (without aging)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section id="how-it-works" className="bg-slate-50 py-20 border-t border-b border-slate-200 px-6 scroll-mt-16">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-100">How It Works</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Automated educator pipeline from document uploads to student grades.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <StepCard 
              num="1" 
              icon={Upload} 
              title="Upload Documents" 
              desc="Feed notes, slides, or scanned textbook PDFs into Multer disk store."
            />
            <StepCard 
              num="2" 
              icon={Cpu} 
              title="AI Structuring" 
              desc="Gemini transcribes pages and extracts semantic text chunks with insights."
            />
            <StepCard 
              num="3" 
              icon={BookOpen} 
              title="Generate & Refine" 
              desc="AI constructs validated question banks filterable by topic or difficulty."
            />
            <StepCard 
              num="4" 
              icon={Share2} 
              title="Publish & Assess" 
              desc="Orchestrate secure student quiz link attempts or export printable exam sheets."
            />
          </div>

        </div>
      </section>

      {/* 4. FEATURES GRID */}
      <section id="features" className="py-20 px-6 max-w-6xl mx-auto space-y-12 scroll-mt-16">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-slate-100">Platform Features</h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Everything you need to orchestrate modern educational assessments.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={Sparkles}
            title="Scanned PDF OCR Fallback"
            desc="Automatic scanned image checks page-by-page, transcribing text using official Google Files API."
          />
          <FeatureCard
            icon={FileText}
            title="Central Question Bank"
            desc="Curate questions per topic, search content, edit text keys, and trace chunks page citations."
          />
          <FeatureCard
            icon={Lock}
            title="Attempts Limit Security"
            desc="Block student name bypasses using composite attempts validation of studentName + studentId + quizId."
          />
          <FeatureCard
            icon={Clock}
            title="Scoring Grace Periods"
            desc="Enforce server-computed boundaries allowing a 10s latency buffer before auto-evaluating progress."
          />
          <FeatureCard
            icon={FileSpreadsheet}
            title="Manual Grading Screens"
            desc="Grade written short-answer items, reference keywords, and commit score recalculations."
          />
          <FeatureCard
            icon={Award}
            title="Dual-Mode Exam Prints"
            desc="Print clean un-answered student sheets or private keys with CSS page-breaks styling."
          />
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="border-t border-slate-200 py-10 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-semibold uppercase">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            <span className="text-slate-100 font-bold">StudyForge AI</span>
          </div>
          <p>© 2026 StudyForge AI. All rights reserved. Platform optimized for Google Chrome & Edge print templates.</p>
        </div>
      </footer>

    </div>
  );
};

const StepCard = ({ num, icon: Icon, title, desc }) => {
  return (
    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative space-y-4 hover:shadow-md transition-shadow">
      <span className="absolute top-4 right-4 text-3xl font-black text-slate-700 font-mono select-none opacity-10">
        {num}
      </span>
      <div className="p-3 bg-indigo-50 border border-indigo-100/40 text-indigo-600 rounded-xl w-fit">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-200">{title}</h4>
        <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, desc }) => {
  return (
    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow space-y-3.5">
      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl w-fit">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-200">{title}</h4>
        <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
};

export default Landing;
