import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { curriculum } from '../../data/curriculum'
import { useProgress } from '../../hooks/useProgress'
import { ChevronLeft, ChevronRight, CheckCircle2, Lock, Clock, X, Menu } from 'lucide-react'

export default function AppShell({ children }) {
  const { moduleId } = useParams()
  const navigate = useNavigate()
  const { isComplete, getCompletedCount } = useProgress()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const currentIndex = curriculum.findIndex(m => m.id === moduleId)
  const current = curriculum[currentIndex]
  const prev = curriculum[currentIndex - 1]
  const next = curriculum[currentIndex + 1]

  return (
    <div className="flex h-full overflow-hidden bg-[#09090d]">
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0c0c12] transition-all duration-300 ${
          sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-black">B</div>
            <span className="text-sm font-bold tracking-tight">BYOOS</span>
          </button>
          <button onClick={() => setSidebarOpen(false)} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Progress */}
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-white/30 font-medium uppercase tracking-widest">Progress</span>
            <span className="text-[11px] text-white/50 font-mono">{getCompletedCount()} / {curriculum.filter(m => !m.comingSoon).length}</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700"
              style={{ width: `${(getCompletedCount() / curriculum.filter(m => !m.comingSoon).length) * 100}%` }}
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
                onClick={() => !locked && navigate(`/chapter/${mod.id}`)}
                disabled={locked}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-white/[0.06]'
                    : locked
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-white/[0.03] cursor-pointer'
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r"
                    style={{ backgroundColor: mod.color }}
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
                className="text-white/30 hover:text-white/70 transition-colors mr-1"
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
                <span className="text-sm text-white/60 truncate max-w-xs">{current.title}</span>
              </div>
            )}
          </div>

          {/* Prev / Next nav */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => prev && navigate(`/chapter/${prev.id}`)}
              disabled={!prev}
              className="p-1.5 rounded text-white/30 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => next && !next.comingSoon && navigate(`/chapter/${next.id}`)}
              disabled={!next || next.comingSoon}
              className="p-1.5 rounded text-white/30 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
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
