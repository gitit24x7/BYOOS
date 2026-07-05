import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { curriculum } from '../../data/curriculum'
import { useProgress } from '../../hooks/useProgress'
import { ChevronLeft, ChevronRight, CheckCircle2, Lock, Clock, X, Menu } from 'lucide-react'

export default function AppShell({ children }) {
  const { moduleId } = useParams()
  const navigate = useNavigate()
  const { isComplete, getCompletedCount } = useProgress()
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true)

  const currentIndex = curriculum.findIndex(m => m.id === moduleId)
  const current = curriculum[currentIndex]
  const prev = curriculum[currentIndex - 1]
  const next = curriculum[currentIndex + 1]

  return (
    <div className="flex h-full overflow-hidden bg-[#09090d]">
      {/* Mobile backdrop — closes the drawer on tap */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed overlay drawer on mobile, in-flow panel on desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 min-w-0 flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0c0c12] overflow-hidden transition-transform duration-300 ease-out lg:static lg:z-auto lg:transition-[width] lg:duration-300 ${
          sidebarOpen ? 'translate-x-0 lg:w-72' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:border-r-0'
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors group"
          >
            <div
              className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-[10px] font-black font-mono text-black transition-transform duration-300 group-hover:scale-110"
              style={{ boxShadow: '0 0 14px -2px rgba(249,115,22,0.55), inset 0 1px 0 rgba(255,255,255,0.35)' }}
            >
              B
            </div>
            <span className="text-sm font-bold tracking-tight">BYOOS</span>
          </button>
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-full text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-all">
            <X size={14} />
          </button>
        </div>

        {/* Progress */}
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-white/30 font-medium uppercase tracking-widest">Progress</span>
            <span className="text-[11px] text-white/50 font-mono">{getCompletedCount()} / {curriculum.filter(m => !m.comingSoon).length}</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700"
              style={{
                width: `${(getCompletedCount() / curriculum.filter(m => !m.comingSoon).length) * 100}%`,
                boxShadow: '0 0 10px rgba(94,158,255,0.6)',
              }}
            />
          </div>
        </div>

        {/* Module list */}
        <nav className="flex-1 overflow-y-auto py-2">
          {curriculum.map((mod) => {
            const isActive = mod.id === moduleId
            const done = isComplete(mod.id)
            const locked = mod.comingSoon

            return (
              <button
                key={mod.id}
                onClick={() => {
                  if (locked) return
                  navigate(`/chapter/${mod.id}`)
                  if (window.innerWidth < 1024) setSidebarOpen(false)
                }}
                disabled={locked}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-all duration-200 group relative ${
                  locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-white/[0.035]'
                }`}
                style={isActive ? {
                  background: `linear-gradient(90deg, ${mod.color}14, transparent 70%)`,
                } : {}}
              >
                {/* Active indicator */}
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r"
                    style={{ backgroundColor: mod.color, boxShadow: `0 0 8px ${mod.color}` }}
                  />
                )}

                {/* Module number badge */}
                <div
                  className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0 transition-all ${
                    done ? 'bg-green-500/20 text-green-400' :
                    isActive ? '' : 'bg-white/5 text-white/30 group-hover:text-white/50'
                  }`}
                  style={isActive && !done ? { backgroundColor: `${mod.color}20`, color: mod.color } : {}}
                >
                  {done ? <CheckCircle2 size={14} /> : locked ? <Lock size={11} /> : mod.number}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold leading-tight truncate ${isActive ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>
                    {mod.title}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock size={10} className="text-white/20 flex-shrink-0" />
                    <span className="text-[11px] text-white/25 font-mono">{mod.duration}</span>
                    {locked && <span className="text-[10px] text-white/20 ml-1">Soon</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 h-12 flex items-center justify-between px-4 border-b border-white/[0.06] bg-[#09090d]/80 backdrop-blur">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-full text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-all mr-1"
              >
                <Menu size={16} />
              </button>
            )}
            {current && (
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                  style={{ backgroundColor: `${current.color}18`, color: current.color }}
                >
                  {current.icon} {current.number}
                </span>
                <span className="text-sm text-white/60 truncate max-w-[140px] sm:max-w-xs">{current.title}</span>
              </div>
            )}
          </div>

          {/* Prev / Next nav */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => prev && navigate(`/chapter/${prev.id}`)}
              disabled={!prev}
              className="p-1.5 rounded-full text-white/35 hover:text-white/80 hover:bg-white/[0.07] disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => next && !next.comingSoon && navigate(`/chapter/${next.id}`)}
              disabled={!next || next.comingSoon}
              className="p-1.5 rounded-full text-white/35 hover:text-white/80 hover:bg-white/[0.07] disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}
