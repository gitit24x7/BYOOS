import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, RotateCcw, ChevronRight } from 'lucide-react'

const LAYERS = [
  {
    id: 'user-code',
    label: 'Your Code',
    sublabel: 'Ring 3 — User Space',
    ring: 3,
    color: '#5e9eff',
    bg: 'rgba(94,158,255,0.08)',
    border: 'rgba(94,158,255,0.2)',
    steps: [
      { code: 'printf("Hello\\n")', explain: 'You call printf() — a C standard library function. This is Ring 3 code. No kernel involvement yet.' },
    ],
  },
  {
    id: 'stdio',
    label: 'stdio Buffer',
    sublabel: 'C Standard Library — still Ring 3',
    ring: 3,
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.2)',
    steps: [
      { code: 'fwrite(str, stdout)', explain: 'printf formats your string and hands it to fwrite(). The output goes into an internal buffer inside the FILE* struct. No syscall yet — this is still just memory manipulation.' },
      { code: 'if (buffer_full || newline) flush()', explain: 'When the buffer fills up or a newline is printed (line-buffered mode), the library calls write() to flush to the kernel. Without a newline, printf() might not call the kernel at all — your text just sits in the buffer.' },
    ],
  },
  {
    id: 'glibc',
    label: 'write() wrapper',
    sublabel: 'glibc syscall shim — still Ring 3',
    ring: 3,
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.2)',
    steps: [
      { code: 'mov rax, 1      ; SYS_write', explain: 'Load syscall number 1 into register rax. Linux knows: rax=1 means "write to file descriptor."' },
      { code: 'mov rdi, 1      ; fd=stdout', explain: 'rdi = first argument = file descriptor 1 (stdout).' },
      { code: 'mov rsi, buf    ; data ptr', explain: 'rsi = second argument = pointer to the string in memory.' },
      { code: 'mov rdx, len    ; byte count', explain: 'rdx = third argument = how many bytes to write.' },
    ],
  },
  {
    id: 'boundary',
    label: '"syscall" instruction',
    sublabel: '⚡ Ring 3 → Ring 0 crossing',
    ring: 'CROSSING',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.08)',
    border: 'rgba(248,113,113,0.35)',
    steps: [
      { code: 'syscall', explain: 'One instruction. The CPU atomically: saves Ring 3 state, switches to Ring 0 privilege, and jumps to the kernel\'s system call dispatch table. Your code is now paused. The kernel is now running.' },
    ],
  },
  {
    id: 'kernel',
    label: 'sys_write()',
    sublabel: 'Linux kernel — Ring 0',
    ring: 0,
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
    border: 'rgba(74,222,128,0.2)',
    steps: [
      { code: 'validate_fd(fd=1)', explain: 'Is file descriptor 1 valid for this process? The kernel checks the process\'s file descriptor table. fd=1 is stdout — always valid.' },
      { code: 'verify_user_ptr(buf)', explain: 'Is the buffer pointer in this process\'s virtual address space? The kernel cannot trust pointers from user space. If this pointer pointed to kernel memory, it would be a privilege escalation attack.' },
      { code: 'copy_from_user(kbuf, buf, len)', explain: 'Copy the string from user space memory into a kernel buffer. The kernel cannot directly dereference user pointers — it must copy them safely.' },
      { code: 'vfs_write(file, kbuf, len)', explain: 'Call the Virtual Filesystem layer\'s write function for stdout\'s file — this dispatches to whatever driver owns stdout.' },
    ],
  },
  {
    id: 'driver',
    label: 'TTY Driver',
    sublabel: 'Terminal driver — still Ring 0',
    ring: 0,
    color: '#ff8c42',
    bg: 'rgba(255,140,66,0.08)',
    border: 'rgba(255,140,66,0.2)',
    steps: [
      { code: 'tty_write(tty, buf, len)', explain: 'The TTY (terminal) driver processes the bytes. It handles escape codes (\\033[31m for red text, etc.), line discipline (backspace, newline handling), and writes the final bytes.' },
      { code: 'Characters appear on screen', explain: 'The bytes are sent to the terminal emulator (or directly to the framebuffer on a physical console). Your "Hello\\n" is now visible.' },
    ],
  },
  {
    id: 'return',
    label: 'Return to user',
    sublabel: '⚡ Ring 0 → Ring 3 return',
    ring: 'RETURN',
    color: '#5e9eff',
    bg: 'rgba(94,158,255,0.08)',
    border: 'rgba(94,158,255,0.2)',
    steps: [
      { code: 'rax = bytes_written (= len)', explain: 'The kernel stores the return value in rax — bytes successfully written, or a negative error code.' },
      { code: 'iretq / sysret', explain: 'The CPU restores your Ring 3 state and resumes execution at the instruction after "syscall". Your program wakes up. write() returns. printf() returns. Your next line of code runs.' },
    ],
  },
]

export default function SyscallTraceSim() {
  const [currentLayer, setCurrentLayer] = useState(-1)
  const [currentStep, setCurrentStep] = useState(-1)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)

  const reset = () => {
    setCurrentLayer(-1)
    setCurrentStep(-1)
    setRunning(false)
    setDone(false)
  }

  const advance = () => {
    if (done) { reset(); return }

    if (currentLayer === -1) {
      setCurrentLayer(0)
      setCurrentStep(0)
      return
    }

    const layer = LAYERS[currentLayer]
    if (currentStep < layer.steps.length - 1) {
      setCurrentStep(s => s + 1)
    } else if (currentLayer < LAYERS.length - 1) {
      setCurrentLayer(l => l + 1)
      setCurrentStep(0)
    } else {
      setDone(true)
    }
  }

  const currentLayerData = currentLayer >= 0 ? LAYERS[currentLayer] : null
  const currentStepData = currentLayerData && currentStep >= 0 ? currentLayerData.steps[currentStep] : null

  const totalSteps = LAYERS.reduce((acc, l) => acc + l.steps.length, 0)
  const completedSteps = LAYERS.slice(0, currentLayer).reduce((acc, l) => acc + l.steps.length, 0) + Math.max(0, currentStep + 1)

  return (
    <div className="my-8 rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0a0a12]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse-slow" />
          <span className="text-xs font-mono text-white/50">System Call Tracer — printf("Hello\n")</span>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="p-1.5 rounded-full text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-all">
            <RotateCcw size={13} />
          </button>
          <button
            onClick={advance}
            className={done ? 'btn-secondary flex items-center gap-1.5 px-3.5 py-1.5 text-xs' : 'btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs'}
            style={done ? {} : { background: 'linear-gradient(135deg, #f87171, #fb923c)', '--btn-glow': 'rgba(248,113,113,0.4)', color: '#fff' }}
          >
            {done ? <>↺ Replay</> : currentLayer === -1 ? <><Play size={11} fill="white" /> Start</> : <>Next step <ChevronRight size={11} /></>}
          </button>
        </div>
      </div>

      <div className="p-4 md:p-5 space-y-4">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-white/20">
            <span>Step {completedSteps} of {totalSteps}</span>
            <span>{Math.round((completedSteps / totalSteps) * 100)}%</span>
          </div>
          <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-red-500 to-blue-500"
              animate={{ width: `${(completedSteps / totalSteps) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Layer pipeline */}
        <div className="flex flex-col gap-1.5">
          {LAYERS.map((layer, li) => {
            const isActive = li === currentLayer
            const isPast = li < currentLayer || done
            const isCrossing = layer.ring === 'CROSSING' || layer.ring === 'RETURN'

            return (
              <motion.div
                key={layer.id}
                animate={{
                  opacity: currentLayer === -1 ? 0.4 : isPast || isActive ? 1 : 0.25,
                  scale: isActive ? 1.01 : 1,
                }}
                transition={{ duration: 0.2 }}
                className={`rounded-xl border px-4 py-3 transition-all duration-300 ${
                  isCrossing ? 'border-dashed' : ''
                }`}
                style={{
                  borderColor: isActive ? layer.border : isPast ? `${layer.color}15` : 'rgba(255,255,255,0.05)',
                  backgroundColor: isActive ? layer.bg : isPast ? `${layer.color}05` : 'transparent',
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Ring badge */}
                  <div
                    className="flex-shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded mt-0.5 tracking-wider"
                    style={{
                      backgroundColor: isCrossing ? 'rgba(248,113,113,0.2)' :
                        layer.ring === 0 ? 'rgba(74,222,128,0.15)' : 'rgba(94,158,255,0.15)',
                      color: isCrossing ? '#f87171' :
                        layer.ring === 0 ? '#4ade80' : '#93c5fd',
                    }}
                  >
                    {isCrossing ? '⚡' : `R${layer.ring}`}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-bold" style={{ color: isActive ? layer.color : isPast ? `${layer.color}80` : 'rgba(255,255,255,0.3)' }}>
                        {layer.label}
                      </span>
                      <span className="text-[10px] text-white/25">{layer.sublabel}</span>
                    </div>

                    {/* Current step code + explanation */}
                    <AnimatePresence>
                      {isActive && currentStepData && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            {layer.steps.map((_, si) => (
                              <div
                                key={si}
                                className="w-4 h-0.5 rounded-full transition-all"
                                style={{ backgroundColor: si <= currentStep ? layer.color : 'rgba(255,255,255,0.1)' }}
                              />
                            ))}
                          </div>
                          <code
                            className="block text-[12px] font-mono px-3 py-2 rounded-lg"
                            style={{ backgroundColor: `${layer.color}12`, color: layer.color }}
                          >
                            {currentStepData.code}
                          </code>
                          <p className="text-xs text-white/55 leading-relaxed">{currentStepData.explain}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Past layer summary */}
                    {isPast && !isActive && (
                      <div className="mt-1 flex gap-1 flex-wrap">
                        {layer.steps.map((step, si) => (
                          <code
                            key={si}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: `${layer.color}10`, color: `${layer.color}70` }}
                          >
                            {step.code.split('\n')[0].slice(0, 30)}{step.code.length > 30 ? '…' : ''}
                          </code>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Done state */}
        <AnimatePresence>
          {done && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-green-950/30 border border-green-500/20 text-center space-y-1"
            >
              <p className="text-green-400 font-bold text-sm">✓ "Hello" is on screen</p>
              <p className="text-xs text-white/40">7 layers · 2 Ring crossings · ~200–300 nanoseconds total</p>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[10px] text-white/20 text-center">Press "Next step" to trace printf() all the way to the screen</p>
      </div>
    </div>
  )
}
