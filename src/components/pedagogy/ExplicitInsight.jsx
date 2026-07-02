import { motion } from 'framer-motion'
import { Target } from 'lucide-react'

export default function ExplicitInsight({ block }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="my-10 relative overflow-hidden rounded-2xl"
    >
      {/* Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-blue-600/10" />
      <div className="absolute inset-0 border border-purple-500/20 rounded-2xl" />

      <div className="relative p-5 md:p-7 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-base">💡</span>
          <span className="text-[11px] font-bold text-purple-400 uppercase tracking-widest">Say it out loud</span>
        </div>
        <blockquote className="text-base md:text-lg leading-relaxed text-white/90 font-medium border-l-2 border-purple-500/40 pl-4">
          {block.text}
        </blockquote>
      </div>
    </motion.div>
  )
}

export function WhatThisMeans({ block }) {
  return (
    <div className="my-8 flex gap-3 p-4 md:p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <Target size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-[11px] font-bold text-green-400 uppercase tracking-widest">🎯 What this actually means</p>
        <p className="text-sm text-white/70 leading-relaxed">{block.text}</p>
      </div>
    </div>
  )
}
