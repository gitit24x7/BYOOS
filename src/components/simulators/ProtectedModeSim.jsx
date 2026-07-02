import { useState, useEffect } from 'react'
import { RotateCcw, ChevronRight, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const STAGES = [
  {
    id: 'real-mode',
    label: 'Real Mode',
    sublabel: '16-bit, 1MB ceiling, no protection',
    detail: 'Your CPU is still in the same mode it powered on into back in Module 1 — 16-bit instructions, a 1-megabyte address ceiling, and zero memory protection. Every register can touch every address. Nothing stops you from overwriting anything.',
    color: '#ff8c42',
    code: null,
  },
  {
    id: 'cli',
    label: 'Interrupts Disabled',
    sublabel: 'cli — no interruptions during the switch',
    detail: 'Before touching anything else, we disable hardware interrupts with cli ("clear interrupt flag"). If a timer or keyboard interrupt fired mid-transition, the CPU would try to handle it using an interrupt table that assumes the mode we are about to leave — a guaranteed crash. We re-enable interrupts only after Protected Mode is fully set up (Module P05 covers exactly what that table is).',
    color: '#fbbf24',
    code: 'cli',
  },
  {
    id: 'lgdt',
    label: 'GDT Loaded',
    sublabel: 'lgdt — CPU now knows where the descriptor table lives',
    detail: 'lgdt loads the address and size of our Global Descriptor Table into a hidden CPU register (GDTR). The GDT itself is just a small array we built in memory ahead of time — a list of "descriptors," each one describing a region of memory: where it starts, how big it is, and what\'s allowed to happen there.',
    color: '#a78bfa',
    code: 'lgdt [gdt_descriptor]',
  },
  {
    id: 'cr0',
    label: 'PE Bit Set',
    sublabel: 'One flipped bit in CR0 — mode switches instantly',
    detail: 'CR0 is a special control register, and its very first bit is the Protection Enable (PE) bit. The instant this bit flips from 0 to 1, the CPU is technically in Protected Mode — every instruction decoded from this point on is interpreted as 32-bit code, using the GDT we just loaded instead of segment:offset math.',
    color: '#5e9eff',
    code: 'mov eax, cr0\nor eax, 1\nmov cr0, eax',
  },
  {
    id: 'far-jump',
    label: 'Far Jump',
    sublabel: 'jmp CODE_SEG:flush_pipeline — the moment of no return',
    detail: 'Flipping the PE bit alone isn\'t enough — the CPU may have already decoded upcoming instructions using the old 16-bit rules (a "prefetch queue" of instructions read ahead of time). A far jump — one that explicitly names a new code segment selector — forces the CPU to discard anything queued and start fresh, fully in 32-bit Protected Mode, reading CS from the GDT for the first time.',
    color: '#4ade80',
    code: 'jmp 0x08:flush_pipeline',
  },
  {
    id: 'reload-segments',
    label: 'Data Segments Reloaded',
    sublabel: 'ds, es, ss, fs, gs all point into the new GDT',
    detail: 'CS was updated by the far jump, but the other segment registers still hold stale Real Mode values. Each one is reloaded with a selector — an index into the GDT — so every future memory access is validated against the flat, protected address space the GDT describes, instead of 1978-era segment:offset arithmetic.',
    color: '#22d3ee',
    code: 'mov ax, 0x10\nmov ds, ax\nmov es, ax\nmov ss, ax',
  },
  {
    id: 'protected',
    label: 'Protected Mode Active',
    sublabel: '32-bit, up to 4GB, memory protection enforced',
    detail: 'The transition is complete. Every register is now 32 bits wide, the address ceiling has jumped from 1MB to 4GB, and the CPU actively checks every memory access against the descriptors in the GDT. This is the mode every real OS kernel actually runs in — and the mode virtual memory (Module 2) and interrupts (Module P05) both assume is already active.',
    color: '#67e8f9',
    code: null,
  },
]

export default function ProtectedModeSim() {
  const [step, setStep] = useState(-1)
  const [auto, setAuto] = useState(false)

  useEffect(() => {
    if (!auto) return
    if (step >= STAGES.length - 1) { setAuto(false); return }
    const t = setTimeout(() => setStep(s => s + 1), 1400)
    return () => clearTimeout(t)
  }, [auto, step])

  const current = step >= 0 ? STAGES[step] : null
  const reset = () => { setStep(-1); setAuto(false) }

  return (
    <div className="my-8 rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0c0c14]">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="text-xs font-mono text-white/50">Real Mode → Protected Mode Visualizer</span>
        <div className="flex gap-2">
          <button onClick={reset} className="p-1.5 rounded text-white/30 hover:text-white/60 transition-colors"><RotateCcw size={13} /></button>
          <button
            onClick={() => { if (step < STAGES.length - 1) { setAuto(true); if (step === -1) setStep(0) } }}
            disabled={step >= STAGES.length - 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-500 text-black hover:bg-sky-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Zap size={11} /> Auto-play
          </button>
          <button
            onClick={() => setStep(s => Math.min(s + 1, STAGES.length - 1))}
            disabled={step >= STAGES.length - 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 text-white/60 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Step <ChevronRight size={11} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Stage pipeline */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STAGES.map((s, i) => {
            const done = i <= step
            const active = i === step
            return (
              <div key={s.id} className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setStep(i)} className="flex flex-col items-center gap-1 group">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black transition-all duration-300 ${
                      active ? 'ring-2 scale-110' : done ? '' : 'opacity-30'
                    }`}
                    style={{
                      backgroundColor: done ? `${s.color}25` : 'rgba(255,255,255,0.04)',
                      color: done ? s.color : 'rgba(255,255,255,0.3)',
                      ringColor: active ? s.color : undefined,
                    }}
                  >
                    {i + 1}
                  </div>
                  <span className={`text-[9px] font-medium whitespace-nowrap transition-colors ${done ? 'text-white/50' : 'text-white/20'}`}>
                    {s.label}
                  </span>
                </button>
                {i < STAGES.length - 1 && (
                  <div className={`w-5 h-px mt-3 flex-shrink-0 transition-all duration-500 ${i < step ? 'bg-white/30' : 'bg-white/10'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Stage detail panel */}
        <AnimatePresence mode="wait">
          {current ? (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="p-4 rounded-xl border"
              style={{ borderColor: `${current.color}30`, backgroundColor: `${current.color}08` }}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-bold text-white text-sm">{current.label}</p>
                  <p className="text-xs text-white/40 mt-0.5">{current.sublabel}</p>
                </div>
              </div>
              <p className="text-sm text-white/60 leading-relaxed mb-3">{current.detail}</p>
              {current.code && (
                <pre className="text-[12px] font-mono px-3 py-2 rounded-lg bg-black/30 border border-white/[0.06] whitespace-pre-wrap"
                  style={{ color: current.color }}
                >
                  {current.code}
                </pre>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 rounded-xl border border-white/[0.05] bg-white/[0.02] text-center"
            >
              <p className="text-sm text-white/25">Press Step or Auto-play to walk through the mode transition</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress */}
        <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${((step + 1) / STAGES.length) * 100}%`,
              background: 'linear-gradient(90deg, #ff8c42, #67e8f9)',
            }}
          />
        </div>
        <p className="text-[11px] text-white/20 text-center font-mono">
          {step < 0 ? 'Still in Real Mode' : step >= STAGES.length - 1 ? 'Protected Mode active ✓' : `Step ${step + 1} of ${STAGES.length}`}
        </p>
      </div>
    </div>
  )
}
