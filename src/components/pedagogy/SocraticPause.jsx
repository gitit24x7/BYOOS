import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react'

export default function SocraticPause({ block }) {
  const [selected, setSelected] = useState(null)
  const answered = selected !== null
  const correct = selected === block.answer

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-10 rounded-2xl border border-white/10 overflow-hidden bg-[#0f0f18]"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
        <HelpCircle size={15} className="text-purple-400" />
        <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Stop and think</span>
      </div>

      <div className="p-5 md:p-6 space-y-5">
        {/* Question */}
        <p className="text-base md:text-lg font-semibold text-white leading-relaxed">{block.question}</p>

        {/* Options */}
        <div className="space-y-2.5">
          {block.options.map((opt, i) => {
            const isSelected = selected === i
            const isCorrect = i === block.answer
            let classes = 'border border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:border-white/[0.16] hover:text-white hover:-translate-y-0.5 cursor-pointer'

            if (answered) {
              if (isCorrect) classes = 'border border-green-500/40 bg-green-500/10 text-green-200 cursor-default'
              else if (isSelected) classes = 'border border-red-500/30 bg-red-500/10 text-red-300 line-through cursor-default'
              else classes = 'border border-white/[0.04] bg-transparent text-white/25 cursor-default opacity-50'
            }

            return (
              <button
                key={i}
                disabled={answered}
                onClick={() => setSelected(i)}
                className={`w-full text-left p-3.5 md:p-4 rounded-xl text-sm leading-relaxed transition-all duration-200 flex items-start gap-3 ${classes}`}
              >
                <span className="mt-0.5 font-mono text-[11px] opacity-60 flex-shrink-0 w-5">
                  {String.fromCharCode(65 + i)}.
                </span>
                <span>{opt}</span>
              </button>
            )
          })}
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {answered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.4 }}
              className={`rounded-xl p-4 border text-sm leading-relaxed ${
                correct
                  ? 'bg-green-950/30 border-green-500/20 text-green-100'
                  : 'bg-amber-950/20 border-amber-500/20 text-amber-100'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {correct
                  ? <CheckCircle2 size={15} className="text-green-400 flex-shrink-0 mt-0.5" />
                  : <XCircle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
                }
                <p>{block.explanations[selected]}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
