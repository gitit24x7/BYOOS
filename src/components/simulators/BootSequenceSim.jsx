import { useState, useEffect } from 'react'
import { Play, RotateCcw, ChevronRight, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const STAGES = [
  {
    id: 'power',
    label: 'Power On',
    sublabel: 'Electricity flows to motherboard',
    detail: 'The CPU powers up but has no code to run. RAM is empty. Disk is not mounted. There is nothing.',
    color: '#ff8c42',
    byte: null,
  },
  {
    id: 'bios',
    label: 'BIOS Executes',
    sublabel: 'Code from ROM chip runs first',
    detail: 'A tiny chip on your motherboard permanently stores the BIOS firmware. The CPU\'s very first instruction is hardwired to jump to this chip\'s address. The BIOS runs before anything else can.',
    color: '#fbbf24',
    byte: '0xF000:FFF0',
  },
  {
    id: 'post',
    label: 'POST',
    sublabel: 'Power-On Self-Test',
    detail: 'BIOS checks: Is RAM working? Is the CPU functioning? Are storage devices connected? If a device fails, the BIOS beeps a specific pattern — the computer\'s last way of communicating without a screen.',
    color: '#a78bfa',
    byte: null,
  },
  {
    id: 'mbr',
    label: 'BIOS Finds Bootable Disk',
    sublabel: 'Reads first 512 bytes → 0x7C00',
    detail: 'BIOS reads the first 512 bytes of the first disk. It checks the last 2 bytes for 0xAA55. If found: "This is bootable." It copies those 512 bytes to RAM address 0x7C00 and jumps there.',
    color: '#5e9eff',
    byte: '0x0000:7C00',
  },
  {
    id: 'bootloader',
    label: 'Bootloader Runs',
    sublabel: 'Your 512 bytes execute',
    detail: 'The CPU is now executing your code — the 22 lines of assembly we wrote. The BIOS has handed off control. There is no safety net. This code must find and load the OS kernel itself.',
    color: '#4ade80',
    byte: '0x0000:7C00',
  },
  {
    id: 'kernel',
    label: 'OS Kernel Loads',
    sublabel: 'The full OS enters memory',
    detail: 'The bootloader reads the OS kernel from disk into high memory, sets up protected mode, and jumps to the kernel entry point. The OS takes over. The computer is now fully alive.',
    color: '#f87171',
    byte: '0x0010:0000',
  },
]

export default function BootSequenceSim() {
  const [step, setStep] = useState(-1)
  const [auto, setAuto] = useState(false)

  useEffect(() => {
    if (!auto) return
    if (step >= STAGES.length - 1) { setAuto(false); return }
    const t = setTimeout(() => setStep(s => s + 1), 1200)
    return () => clearTimeout(t)
  }, [auto, step])

  const current = step >= 0 ? STAGES[step] : null
  const reset = () => { setStep(-1); setAuto(false) }

  return (
    <div className="my-8 rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0c0c14]">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="text-xs font-mono text-white/50">Boot Sequence Visualizer</span>
        <div className="flex gap-2">
          <button onClick={reset} className="p-1.5 rounded text-white/30 hover:text-white/60 transition-colors"><RotateCcw size={13} /></button>
          <button
            onClick={() => { if (step < STAGES.length - 1) { setAuto(true); if (step === -1) setStep(0) } }}
            disabled={step >= STAGES.length - 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-500 text-black hover:bg-orange-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
                <button
                  onClick={() => setStep(i)}
                  className="flex flex-col items-center gap-1 group"
                >
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
                  <span className={`text-[9px] font-medium whitespace-nowrap transition-colors ${
                    done ? 'text-white/50' : 'text-white/20'
                  }`}>
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
                {current.byte && (
                  <code className="text-[11px] font-mono flex-shrink-0 px-2 py-1 rounded"
                    style={{ backgroundColor: `${current.color}15`, color: current.color }}
                  >
                    📍 {current.byte}
                  </code>
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
              <p className="text-sm text-white/25">Press Step or Auto-play to walk through the boot sequence</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress */}
        <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${((step + 1) / STAGES.length) * 100}%`,
              background: 'linear-gradient(90deg, #ff8c42, #5e9eff)',
            }}
          />
        </div>
        <p className="text-[11px] text-white/20 text-center font-mono">
          {step < 0 ? 'Machine off' : step >= STAGES.length - 1 ? 'OS running ✓' : `Stage ${step + 1} of ${STAGES.length}`}
        </p>
      </div>
    </div>
  )
}
