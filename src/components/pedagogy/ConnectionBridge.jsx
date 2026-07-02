import { motion } from 'framer-motion'
import { Link2 } from 'lucide-react'

export default function ConnectionBridge({ block }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-10 rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0e0e18]"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
        <Link2 size={14} className="text-cyan-400" />
        <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">You've seen this concept before</span>
      </div>

      <div className="p-5 md:p-6 space-y-5">
        {/* Concept summary */}
        <div className="space-y-1">
          <p className="text-sm font-bold text-white">{block.concept}</p>
          <p className="text-sm text-white/50 leading-relaxed">{block.coreIdea}</p>
        </div>

        {/* Connection rows */}
        <div className="space-y-2.5">
          {block.connections.map((conn, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex gap-3.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors"
            >
              <div className="text-xl flex-shrink-0 mt-0.5">{conn.icon}</div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white/80">{conn.domain}</p>
                <p className="text-sm text-white/50 leading-relaxed">{conn.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Explicit punchline */}
        <div className="bg-cyan-950/30 border border-cyan-500/20 rounded-xl p-4 flex gap-3">
          <span className="text-lg flex-shrink-0">💡</span>
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">Say it out loud</p>
            <p className="text-sm text-cyan-100/90 leading-relaxed italic">"{block.punchline}"</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
