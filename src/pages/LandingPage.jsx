import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { curriculum } from '../data/curriculum'
import { useProgress } from '../hooks/useProgress'
import { ArrowRight, CheckCircle2, Clock, Lock, ChevronRight, Sparkles } from 'lucide-react'

const FEATURES = [
  { icon: '⚡', color: '#ff8c42', title: 'Why pressing power works', desc: 'The 512-byte bootloader that starts every computer on Earth, including yours, right now.' },
  { icon: '🧩', color: '#a78bfa', title: 'How Docker is virtual memory', desc: 'The same trick the OS uses for RAM — Docker applied it to filesystems. Same idea, 44 years later.' },
  { icon: '🔄', color: '#4ade80', title: 'Why Spotify doesn\'t freeze Chrome', desc: 'The scheduler giving each app a turn on one CPU, thousands of times per second, invisibly.' },
  { icon: '🔒', color: '#f87171', title: 'What printf() actually calls', desc: 'Six layers from your C code to the screen. Two security boundary crossings. All explained.' },
  { icon: '🐚', color: '#fbbf24', title: 'How your terminal runs commands', desc: 'fork() + exec() — the two syscalls that launch every program ever run on a Unix system.' },
  { icon: '🧠', color: '#5e9eff', title: 'Why memory addresses are fake', desc: 'Every address your program sees is a lie the OS tells it. For very good reasons.' },
]

const SECTION_META = {
  'Core Curriculum': { color: '#5e9eff', hint: null },
  'Prerequisites': { color: '#22d3ee', hint: 'The background OSDev.org expects you to already have. Taught here, in the same depth, so you never have to leave.' },
  'Capstone': { color: '#f87171', hint: 'Everything you just learned, watched working together — in real kernels, and in one continuous chain.' },
}

export default function LandingPage() {
  const navigate = useNavigate()
  const { isComplete, getCompletedCount } = useProgress()
  const total = curriculum.filter(m => !m.comingSoon).length

  return (
    <div className="h-full overflow-y-auto bg-[#09090d]">
      {/* Hero */}
      <div className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        {/* Grid bg */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Radial glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[800px] h-[800px] rounded-full bg-blue-600/8 blur-3xl" />
          <div className="absolute w-[420px] h-[420px] -translate-x-40 rounded-full bg-purple-600/10 blur-2xl" />
          <div className="absolute w-[360px] h-[360px] translate-x-48 translate-y-16 rounded-full bg-orange-500/8 blur-2xl" />
        </div>

        <div className="relative z-10 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-blue-300 text-xs font-bold uppercase tracking-widest"
              style={{
                background: 'linear-gradient(135deg, rgba(94,158,255,0.12), rgba(167,139,250,0.1))',
                border: '1px solid rgba(94,158,255,0.25)',
                boxShadow: '0 0 24px -8px rgba(94,158,255,0.35)',
              }}
            >
              <Sparkles size={12} className="text-blue-300" />
              First principles · Problem-based · Interactive
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-black tracking-tight">
              <span className="text-white">Build Your Own</span>
              <br />
              <span
                className="bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_6s_linear_infinite]"
                style={{ backgroundImage: 'linear-gradient(100deg, #5e9eff, #a78bfa, #f87171, #a78bfa, #5e9eff)' }}
              >
                Operating System
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
              A first-principles textbook that is actually interactive. Learn how your computer really works —
              from the 512-byte bootloader to the scheduler juggling 50 apps on one CPU.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => navigate('/chapter/M00')}
                className="btn-primary group flex items-center gap-2.5 px-7 py-3.5 text-base"
                style={{
                  background: 'linear-gradient(135deg, #5e9eff, #a78bfa)',
                  '--btn-glow': 'rgba(94,158,255,0.45)',
                }}
              >
                Start from the beginning
                <ArrowRight size={16} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
              {getCompletedCount() > 0 && (
                <button
                  onClick={() => {
                    const last = curriculum.find(m => !isComplete(m.id) && !m.comingSoon)
                    if (last) navigate(`/chapter/${last.id}`)
                  }}
                  className="btn-secondary flex items-center gap-2 px-6 py-3.5 text-sm"
                >
                  Continue where I left off
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 pt-4 text-sm text-white/25">
              <div className="flex items-center gap-1.5"><span className="font-bold text-white/40">{total}</span> modules</div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-1.5"><span className="font-bold text-white/40">8</span> live simulators</div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-1.5"><span className="font-bold text-white/40">0</span> prior OS knowledge needed</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* What you'll understand section */}
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-black text-white">What you'll actually understand</h2>
          <p className="text-white/40 text-sm">Not memorize. Understand. There's a difference.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {FEATURES.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 + 0.2 }}
              className="card-glow p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] group"
              style={{ '--glow': item.color }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: `${item.color}18`, boxShadow: `inset 0 0 0 1px ${item.color}30` }}
              >
                {item.icon}
              </div>
              <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Module list */}
      <div className="max-w-3xl mx-auto px-6 pb-20 space-y-10">
        {Object.entries(
          curriculum.reduce((groups, mod) => {
            (groups[mod.section] ||= []).push(mod)
            return groups
          }, {})
        ).map(([section, mods]) => {
          const meta = SECTION_META[section] || { color: '#5e9eff', hint: null }
          return (
            <div key={section} className="space-y-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: meta.color, boxShadow: `0 0 10px ${meta.color}` }}
                  />
                  <h2 className="text-xl font-black text-white">{section}</h2>
                </div>
                {meta.hint && (
                  <p className="text-xs text-white/35 mt-1 pl-[18px]">{meta.hint}</p>
                )}
              </div>
              {mods.map((mod, i) => {
                const done = isComplete(mod.id)
                return (
                  <motion.button
                    key={mod.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => !mod.comingSoon && navigate(`/chapter/${mod.id}`)}
                    disabled={mod.comingSoon}
                    className={`card-glow relative w-full text-left flex items-start gap-4 p-4 md:p-5 pl-5 rounded-2xl border overflow-hidden ${
                      mod.comingSoon
                        ? 'opacity-40 cursor-not-allowed border-white/[0.05] bg-white/[0.02]'
                        : 'border-white/[0.08] bg-white/[0.02] cursor-pointer group'
                    }`}
                    style={{ '--glow': mod.color }}
                  >
                    {/* Colored spine */}
                    {!mod.comingSoon && (
                      <span
                        className="absolute left-0 top-0 bottom-0 w-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ backgroundColor: done ? '#4ade80' : mod.color }}
                      />
                    )}

                    {/* Number */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 transition-transform duration-300 group-hover:scale-105"
                      style={{
                        backgroundColor: done ? 'rgba(74,222,128,0.15)' : `${mod.color}15`,
                        color: done ? '#4ade80' : mod.color,
                        boxShadow: done ? 'inset 0 0 0 1px rgba(74,222,128,0.3)' : `inset 0 0 0 1px ${mod.color}30`,
                      }}
                    >
                      {done ? <CheckCircle2 size={17} /> : mod.comingSoon ? <Lock size={14} /> : mod.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[11px] font-mono text-white/25">{mod.number}</span>
                        <span className="text-sm md:text-base font-bold text-white">{mod.title}</span>
                        {mod.comingSoon && <span className="text-[10px] text-white/20 border border-white/10 px-1.5 py-0.5 rounded-full">Coming soon</span>}
                      </div>
                      <p className="text-xs md:text-sm text-white/40 mt-1 leading-relaxed">{mod.subtitle}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex gap-1 flex-wrap">
                          {mod.tags.map(tag => (
                            <span
                              key={tag}
                              className="text-[10px] px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: `${mod.color}12`, color: `${mod.color}cc` }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 ml-auto text-white/20">
                          <Clock size={11} />
                          <span className="text-[11px] font-mono">{mod.duration}</span>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    {!mod.comingSoon && (
                      <ChevronRight size={16} className="text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                    )}
                  </motion.button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
