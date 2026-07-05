import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function MysteryOpener({ data, onReady, color = '#f97316' }) {
  const [revealed, setRevealed] = useState(false)
  const [lineIndex, setLineIndex] = useState(0)

  useEffect(() => {
    if (revealed) return
    const interval = setInterval(() => {
      setLineIndex(prev => {
        if (prev < data.lines.length - 1) return prev + 1
        clearInterval(interval)
        return prev
      })
    }, 700)
    return () => clearInterval(interval)
  }, [revealed, data.lines.length])

  return (
    <div className="relative flex flex-col items-center justify-center h-full bg-[#09090d] overflow-hidden">
      {/* Background glow — tinted with this module's own color */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full blur-3xl" style={{ backgroundColor: `${color}10` }} />
        <div className="absolute w-[320px] h-[320px] -translate-x-32 translate-y-24 rounded-full blur-3xl" style={{ backgroundColor: `${color}14` }} />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 text-center max-w-2xl px-8 space-y-10">
        {/* Lines */}
        <div className="space-y-3">
          {data.lines.map((line, i) => (
            <AnimatePresence key={i}>
              {i <= lineIndex && (
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`font-light tracking-wide ${
                    i === data.lines.length - 1
                      ? 'text-3xl md:text-4xl font-bold text-white'
                      : 'text-xl md:text-2xl text-white/70'
                  }`}
                >
                  {line}
                </motion.p>
              )}
            </AnimatePresence>
          ))}
        </div>

        {/* Cursor blink on last line */}
        {lineIndex === data.lines.length - 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-6"
          >
            <p className="text-white/30 text-sm tracking-widest uppercase">
              Think about it for a moment.
            </p>
            <button
              onClick={onReady}
              className="btn-primary px-8 py-3.5 text-sm tracking-wide"
              style={{ backgroundColor: color, '--btn-glow': `${color}70` }}
            >
              I'm ready — show me how →
            </button>
          </motion.div>
        )}
      </div>

      {/* Corner label */}
      <div className="absolute bottom-6 right-6 text-white/10 text-xs font-mono">BYOOS / mystery_opener.c</div>
    </div>
  )
}
