import { useState, useEffect } from 'react'
import { RotateCcw, ChevronRight, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const SOURCES = {
  timer: {
    label: 'Timer (IRQ0)',
    color: '#4ade80',
    vector: '0x20',
    trigger: 'The Programmable Interval Timer fires an electrical signal on IRQ0, roughly every 1 millisecond — completely independent of what the CPU is currently doing.',
    handler: 'The ISR increments a tick counter and, on most modern kernels, calls straight into the scheduler — this is the exact mechanism behind Module 3\'s preemptive time-slicing. The currently running process has no say in this; it is interrupted whether it wants to be or not.',
  },
  keyboard: {
    label: 'Keyboard (IRQ1)',
    color: '#a78bfa',
    vector: '0x21',
    trigger: 'You press a key. The keyboard controller latches the scancode into a small hardware buffer and raises IRQ1 to signal "data is ready."',
    handler: 'The ISR reads the scancode out of the keyboard controller\'s I/O port, translates it into a character, and typically queues it for whichever process is currently reading from the keyboard — all before your original program\'s next instruction runs.',
  },
  syscall: {
    label: 'Syscall (int 0x80 / syscall)',
    color: '#f87171',
    vector: '0x80',
    trigger: 'Your own running program deliberately executes the syscall instruction — the exact mechanism from Module 4 — asking the kernel to do something on its behalf.',
    handler: 'The ISR reads the syscall number and arguments out of the registers Module 4 described, validates them, performs the requested kernel operation, and writes a return value back — this is the same sys_write() handler from Module 4, now shown as one specific case of the general interrupt mechanism.',
  },
}

function buildStages(source) {
  const s = SOURCES[source]
  return [
    { id: 'running', label: 'Program Running', sublabel: 'Ring 3, mid-instruction', detail: 'Your program is executing normally in user mode. It has no idea an interrupt is about to happen — nothing in its own code predicts this.', color: '#5e9eff' },
    { id: 'trigger', label: 'Interrupt Triggered', sublabel: `Vector ${s.vector}`, detail: s.trigger, color: s.color },
    { id: 'finish', label: 'Current Instruction Finishes', sublabel: 'The CPU never interrupts mid-instruction', detail: 'Interrupts are checked between instructions, never in the middle of one — an instruction that has already started always completes first. This is a hardware guarantee, not a courtesy.', color: '#67e8f9' },
    { id: 'idt-lookup', label: 'IDT Lookup', sublabel: `IDT[${s.vector}] → handler address`, detail: `The CPU uses the vector number as a direct index into the Interrupt Descriptor Table — a fixed-size array loaded earlier with lidt, structurally identical to the GDT from Module P04, but each entry points at a handler function instead of describing a memory region.`, color: '#22d3ee' },
    { id: 'push-frame', label: 'Interrupt Frame Pushed', sublabel: 'CPU automatically saves state', detail: 'Before jumping anywhere, the CPU itself — not your code — pushes the current flags register, CS, and the instruction pointer onto the stack. This is what makes returning to the exact interrupted instruction possible later.', color: '#0ea5e9' },
    { id: 'isr-runs', label: 'ISR Executes', sublabel: 'Ring 0 — the handler takes over', detail: s.handler, color: '#38bdf8' },
    { id: 'iret', label: 'iret', sublabel: 'Pop the frame, restore everything', detail: 'iret is the interrupt-specific counterpart to ret from Module P03\'s stack chapter — it pops flags, CS, and the instruction pointer back off the stack in one atomic step, undoing exactly what the automatic push did.', color: '#818cf8' },
    { id: 'resume', label: 'Program Resumes', sublabel: 'Exactly where it left off, unaware', detail: 'Execution continues from the exact instruction that was about to run before the interrupt fired. From the program\'s point of view, no time passed and nothing happened — the same illusion Module 3\'s context switch relies on.', color: '#5e9eff' },
  ]
}

export default function InterruptTraceSim() {
  const [source, setSource] = useState('timer')
  const [step, setStep] = useState(-1)
  const [auto, setAuto] = useState(false)
  const STAGES = buildStages(source)

  useEffect(() => {
    if (!auto) return
    if (step >= STAGES.length - 1) { setAuto(false); return }
    const t = setTimeout(() => setStep(s => s + 1), 1300)
    return () => clearTimeout(t)
  }, [auto, step, STAGES.length])

  const current = step >= 0 ? STAGES[step] : null
  const reset = () => { setStep(-1); setAuto(false) }
  const changeSource = (src) => { setSource(src); reset() }

  return (
    <div className="my-8 rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0c0c14]">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02] flex-wrap gap-2">
        <span className="text-xs font-mono text-white/50">Interrupt Trace — pick a source</span>
        <div className="flex gap-1.5">
          {Object.entries(SOURCES).map(([key, s]) => (
            <button
              key={key}
              onClick={() => changeSource(key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all ${
                source === key ? 'text-black' : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08]'
              }`}
              style={source === key ? { backgroundColor: s.color } : {}}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {STAGES.map((s, i) => {
              const done = i <= step
              const active = i === step
              return (
                <div key={s.id} className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setStep(i)} className="flex flex-col items-center gap-1 group">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 ${
                        active ? 'ring-2 scale-110' : done ? '' : 'opacity-30'
                      }`}
                      style={{
                        backgroundColor: done ? `${s.color}25` : 'rgba(255,255,255,0.04)',
                        color: done ? s.color : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {i + 1}
                    </div>
                  </button>
                  {i < STAGES.length - 1 && (
                    <div className={`w-4 h-px flex-shrink-0 transition-all duration-500 ${i < step ? 'bg-white/30' : 'bg-white/10'}`} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={reset} className="p-1.5 rounded text-white/30 hover:text-white/60 transition-colors"><RotateCcw size={13} /></button>
            <button
              onClick={() => { if (step < STAGES.length - 1) { setAuto(true); if (step === -1) setStep(0) } }}
              disabled={step >= STAGES.length - 1}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-black hover:bg-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Zap size={11} /> Auto
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

        <AnimatePresence mode="wait">
          {current ? (
            <motion.div
              key={source + current.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="p-4 rounded-xl border"
              style={{ borderColor: `${current.color}30`, backgroundColor: `${current.color}08` }}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <p className="font-bold text-white text-sm">{current.label}</p>
                  <p className="text-xs text-white/40 mt-0.5">{current.sublabel}</p>
                </div>
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
              <p className="text-sm text-white/25">Press Step or Auto to trace a {SOURCES[source].label} interrupt from trigger to resume</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / STAGES.length) * 100}%`, backgroundColor: SOURCES[source].color }}
          />
        </div>
      </div>
    </div>
  )
}
