import { useState, useEffect } from 'react'
import { RotateCcw, ChevronRight, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const STEPS = [
  { field: 'EFLAGS', by: 'CPU', color: '#f87171', detail: 'The instant the interrupt fires, the CPU itself pushes the flags register — before your code or your stub ever runs.' },
  { field: 'CS', by: 'CPU', color: '#f87171', detail: 'The interrupted code segment selector, pushed automatically right after EFLAGS.' },
  { field: 'EIP', by: 'CPU', color: '#f87171', detail: 'The exact instruction the interrupted code was about to execute — this is what makes resuming it later possible at all.' },
  { field: 'err_code', by: 'Stub', color: '#0ea5e9', detail: 'Some vectors (like 8, 13, 14) have the CPU push a real error code here automatically. Others don\'t — so your stub pushes a dummy 0 itself, keeping every vector\'s stack layout identical.' },
  { field: 'int_no', by: 'Stub', color: '#0ea5e9', detail: 'Your stub pushes the interrupt number itself, so the one shared C handler can tell which of the 256 possible vectors actually fired.' },
  { field: 'eax, ecx, edx, ebx', by: 'pusha', color: '#22d3ee', detail: 'A single pusha instruction pushes all eight general-purpose registers in one step — the exact registers a plain C function would feel free to clobber, now safely preserved.' },
  { field: 'esp (orig), ebp, esi, edi', by: 'pusha', color: '#22d3ee', detail: 'The remaining four registers pusha pushes, completing the exact layout the registers_t struct expects, field for field.' },
]

export default function InterruptStackSim() {
  const [step, setStep] = useState(-1)
  const [auto, setAuto] = useState(false)

  useEffect(() => {
    if (!auto) return
    if (step >= STEPS.length - 1) { setAuto(false); return }
    const t = setTimeout(() => setStep(s => s + 1), 1300)
    return () => clearTimeout(t)
  }, [auto, step])

  const reset = () => { setStep(-1); setAuto(false) }
  const visible = STEPS.slice(0, step + 1)

  return (
    <div className="my-8 rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0c0c14]">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02] gap-3 flex-wrap">
        <span className="text-xs font-mono text-white/50">Interrupt Stack Frame — building, one push at a time</span>
        <div className="flex gap-2">
          <button onClick={reset} className="p-1.5 rounded-full text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-all"><RotateCcw size={13} /></button>
          <button
            onClick={() => { if (step < STEPS.length - 1) { setAuto(true); if (step === -1) setStep(0) } }}
            disabled={step >= STEPS.length - 1}
            className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs"
            style={{ backgroundColor: '#0ea5e9', '--btn-glow': 'rgba(14,165,233,0.5)' }}
          >
            <Zap size={11} /> Auto-play
          </button>
          <button
            onClick={() => setStep(s => Math.min(s + 1, STEPS.length - 1))}
            disabled={step >= STEPS.length - 1}
            className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
          >
            Push next <ChevronRight size={11} />
          </button>
        </div>
      </div>

      <div className="p-5 grid md:grid-cols-2 gap-5">
        {/* Vertical stack visual */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-white/25 mb-2">↓ toward higher addresses (interrupted code's stack)</p>
          <div className="flex flex-col-reverse gap-1 min-h-[280px] justify-start">
            {visible.length === 0 && (
              <div className="p-3 rounded-lg border border-white/[0.06] text-center text-white/20 text-xs">
                Interrupted code was running here — nothing pushed yet
              </div>
            )}
            <AnimatePresence initial={false}>
              {visible.map((s) => (
                <motion.div
                  key={s.field}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-2.5 rounded-lg border font-mono text-xs flex items-center justify-between"
                  style={{ borderColor: `${s.color}40`, backgroundColor: `${s.color}12`, color: s.color }}
                >
                  <span>{s.field}</span>
                  <span className="text-[10px] opacity-70">{s.by}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-white/25 mt-2">
            {step >= 0 ? '← current ESP points here' : ''}
          </p>
        </div>

        {/* Detail panel */}
        <div>
          {step >= 0 ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border h-full"
              style={{ borderColor: `${STEPS[step].color}30`, backgroundColor: `${STEPS[step].color}08` }}
            >
              <p className="font-bold text-white text-sm mb-1">{STEPS[step].field}</p>
              <p className="text-[11px] mb-3" style={{ color: STEPS[step].color }}>pushed by {STEPS[step].by}</p>
              <p className="text-sm text-white/60 leading-relaxed">{STEPS[step].detail}</p>
              {step === STEPS.length - 1 && (
                <p className="text-sm text-white/60 leading-relaxed mt-3 pt-3 border-t border-white/10">
                  This is the exact moment <code className="text-cyan-300/80">call isr_handler</code> runs — every field your registers_t struct expects is sitting on the stack, in this exact order, ready to be read as a struct instead of raw offsets.
                </p>
              )}
            </motion.div>
          ) : (
            <div className="p-4 rounded-xl border border-white/[0.05] bg-white/[0.02] text-center h-full flex items-center justify-center">
              <p className="text-sm text-white/25">Press "Push next" to fire an interrupt and watch the stack build</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
