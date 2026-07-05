import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronRight } from 'lucide-react'

export default function TheReveal({ reveal, onNext, color = '#f97316' }) {
  const [activeNode, setActiveNode] = useState(null)
  const [allShown, setAllShown] = useState(false)

  return (
    <div className="my-16 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white/40 uppercase tracking-widest">
          ⚡ The Reveal
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white">How it all connects</h2>
      </div>

      {/* Chain */}
      <div className="flex flex-wrap items-start justify-center gap-3">
        {reveal.chain.map((node, i) => (
          <div key={i} className="flex items-start gap-2">
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.12 }}
              onClick={() => {
                setActiveNode(activeNode === i ? null : i)
                if (i === reveal.chain.length - 1) setAllShown(true)
              }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 hover:scale-105 cursor-pointer ${
                activeNode === i ? '' : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15]'
              }`}
              style={activeNode === i ? { borderColor: `${color}60`, backgroundColor: `${color}18` } : {}}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border transition-colors ${
                  activeNode === i ? '' : 'border-white/10 bg-white/5 text-white/40'
                }`}
                style={activeNode === i ? { borderColor: `${color}80`, backgroundColor: `${color}30`, color } : {}}
              >
                {i + 1}
              </div>
              <span className="text-[11px] font-semibold text-white/70 text-center max-w-[80px] leading-tight">
                {node.label}
              </span>
              <span className="text-[9px] text-white/30 text-center max-w-[80px] leading-tight">
                {node.sublabel}
              </span>
            </motion.button>
            {i < reveal.chain.length - 1 && (
              <ChevronRight size={14} className="text-white/20 mt-5 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Final insight */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reveal.chain.length * 0.12 + 0.3 }}
        className="max-w-2xl mx-auto p-5 md:p-6 rounded-2xl border"
        style={{ background: `linear-gradient(135deg, ${color}14, transparent 60%, ${color}0f)`, borderColor: `${color}30` }}
      >
        <p className="text-sm text-white/60 leading-relaxed text-center">{reveal.finalInsight}</p>
      </motion.div>

      {/* Next chapter teaser */}
      {reveal.nextChapter && onNext && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reveal.chain.length * 0.12 + 0.5 }}
          className="text-center space-y-4"
        >
          <div className="text-xs text-white/25 uppercase tracking-widest font-bold">Up next</div>
          <p className="text-sm text-white/50 max-w-lg mx-auto leading-relaxed italic">
            "{reveal.nextChapter}"
          </p>
          <button
            onClick={onNext}
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm"
            style={{ backgroundColor: color, '--btn-glow': `${color}70` }}
          >
            Continue to next chapter <ArrowRight size={15} strokeWidth={2.5} />
          </button>
        </motion.div>
      )}
    </div>
  )
}
