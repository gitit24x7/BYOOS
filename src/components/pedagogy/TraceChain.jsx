import { useState, useEffect } from 'react'
import { RotateCcw, ChevronRight, Zap, Tag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function TraceChain({ block }) {
  const { title, color = '#5e9eff', steps } = block
  const [step, setStep] = useState(-1)
  const [auto, setAuto] = useState(false)

  useEffect(() => {
    if (!auto) return
    if (step >= steps.length - 1) { setAuto(false); return }
    const t = setTimeout(() => setStep(s => s + 1), 1500)
    return () => clearTimeout(t)
  }, [auto, step, steps.length])

  const current = step >= 0 ? steps[step] : null
  const reset = () => { setStep(-1); setAuto(false) }

  return (
    <div className="my-8 rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0c0c14]">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02] gap-3 flex-wrap">
        <span className="text-xs font-bold text-white/60">{title}</span>
        <div className="flex gap-2">
          <button onClick={reset} className="p-1.5 rounded text-white/30 hover:text-white/60 transition-colors"><RotateCcw size={13} /></button>
          <button
            onClick={() => { if (step < steps.length - 1) { setAuto(true); if (step === -1) setStep(0) } }}
            disabled={step >= steps.length - 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            style={{ backgroundColor: color }}
          >
            <Zap size={11} /> Auto-play
          </button>
          <button
            onClick={() => setStep(s => Math.min(s + 1, steps.length - 1))}
            disabled={step >= steps.length - 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 text-white/60 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Step <ChevronRight size={11} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {steps.map((s, i) => {
            const done = i <= step
            const active = i === step
            return (
              <div key={i} className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setStep(i)} className="flex flex-col items-center gap-1 group">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 ${
                      active ? 'ring-2 scale-110' : done ? '' : 'opacity-30'
                    }`}
                    style={{
                      backgroundColor: done ? `${color}25` : 'rgba(255,255,255,0.04)',
                      color: done ? color : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {i + 1}
                  </div>
                  <span className={`text-[9px] font-medium whitespace-nowrap max-w-[70px] truncate transition-colors ${done ? 'text-white/50' : 'text-white/20'}`}>
                    {s.label}
                  </span>
                </button>
                {i < steps.length - 1 && (
                  <div className={`w-4 h-px mt-3 flex-shrink-0 transition-all duration-500 ${i < step ? 'bg-white/30' : 'bg-white/10'}`} />
                )}
              </div>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          {current ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="p-4 rounded-xl border"
              style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <p className="font-bold text-white text-sm">{current.label}</p>
                  {current.sublabel && <p className="text-xs text-white/40 mt-0.5">{current.sublabel}</p>}
                </div>
                {current.module && (
                  <span className="flex items-center gap-1 text-[10px] font-mono flex-shrink-0 px-2 py-1 rounded-full border border-white/10 text-white/40">
                    <Tag size={9} /> {current.module}
                  </span>
                )}
              </div>
              <p className="text-sm text-white/60 leading-relaxed">{current.detail}</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 rounded-xl border border-white/[0.05] bg-white/[0.02] text-center"
            >
              <p className="text-sm text-white/25">Press Step or Auto-play to trace this scenario from start to finish</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / steps.length) * 100}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  )
}
