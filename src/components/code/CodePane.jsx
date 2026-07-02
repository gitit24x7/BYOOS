import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

// Beej-style code pane with clickable line annotations in a sidebar popout
export default function CodePane({ block }) {
  const [activeAnnotation, setActiveAnnotation] = useState(null)

  const lines = block.code.split('\n')

  // Build a map: line number (0-indexed) → annotation
  const lineAnnotationMap = {}
  if (block.annotations) {
    block.annotations.forEach(ann => {
      ann.lines.forEach(ln => {
        lineAnnotationMap[ln - 1] = ann
      })
    })
  }

  return (
    <div className="my-8 rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl bg-[#0a0a10]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#0d0d14]">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-xs font-mono text-white/30">{block.filename}</span>
        </div>
        <span className="text-[10px] font-mono text-white/15 uppercase tracking-widest">{block.language}</span>
      </div>

      {/* Caption */}
      {block.caption && (
        <div className="px-4 py-2.5 border-b border-white/[0.04] bg-blue-500/5">
          <p className="text-xs text-blue-300/70">{block.caption}</p>
        </div>
      )}

      <div className="flex">
        {/* Code */}
        <div className="flex-1 overflow-x-auto">
          <pre className="p-4 text-[13px] font-mono leading-relaxed">
            {lines.map((line, i) => {
              const ann = lineAnnotationMap[i]
              const isActive = activeAnnotation && activeAnnotation.lines.includes(i + 1)
              const hasAnnotation = !!ann

              return (
                <div
                  key={i}
                  onClick={() => hasAnnotation && setActiveAnnotation(activeAnnotation === ann ? null : ann)}
                  className={`flex items-start gap-3 px-1 py-0.5 rounded transition-all duration-150 ${
                    hasAnnotation ? 'cursor-pointer group' : ''
                  } ${
                    isActive ? 'bg-blue-500/10 ring-1 ring-blue-500/20' :
                    hasAnnotation ? 'hover:bg-white/[0.04]' : ''
                  }`}
                >
                  {/* Line number */}
                  <span className={`select-none w-7 text-right flex-shrink-0 text-[11px] transition-colors ${
                    isActive ? 'text-blue-400' :
                    hasAnnotation ? 'text-white/20 group-hover:text-blue-400/60' :
                    'text-white/10'
                  }`}>
                    {i + 1}
                  </span>

                  {/* Code line */}
                  <span className={`flex-1 transition-colors ${
                    isActive ? 'text-white' :
                    hasAnnotation ? 'text-white/70 group-hover:text-white' :
                    'text-white/50'
                  }`}>
                    {line || ' '}
                  </span>

                  {/* Annotation indicator */}
                  {hasAnnotation && (
                    <span className={`flex-shrink-0 text-[10px] font-bold transition-colors mt-0.5 ${
                      isActive ? 'text-blue-400' : 'text-white/15 group-hover:text-blue-400/50'
                    }`}>
                      ●
                    </span>
                  )}
                </div>
              )
            })}
          </pre>
        </div>
      </div>

      {/* Annotation panel — Beej-style popout */}
      <AnimatePresence>
        {activeAnnotation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="border-t border-blue-500/20 bg-[#0a0f1a] overflow-hidden"
          >
            <div className="p-5 space-y-4">
              {/* Label */}
              <div className="flex items-start justify-between gap-4">
                <code className="text-sm font-mono text-blue-300 bg-blue-500/10 px-2 py-1 rounded">
                  {activeAnnotation.label}
                </code>
                <button
                  onClick={() => setActiveAnnotation(null)}
                  className="text-white/20 hover:text-white/60 hover:bg-white/[0.07] rounded-full px-2 py-1 transition-all flex-shrink-0 text-xs"
                >
                  close ×
                </button>
              </div>

              {/* What it does */}
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest">What it does</p>
                <p className="text-sm text-white/80 leading-relaxed">{activeAnnotation.what}</p>
              </div>

              {/* Why it's here */}
              <div className="space-y-1 pl-3 border-l-2 border-amber-500/40">
                <p className="text-[11px] font-bold text-amber-400/60 uppercase tracking-widest">Why it's here</p>
                <p className="text-sm text-white/70 leading-relaxed">{activeAnnotation.why}</p>
              </div>

              {/* Extra note */}
              {activeAnnotation.note && (
                <div className="space-y-1 bg-white/[0.03] rounded-lg p-3.5 border border-white/[0.05]">
                  <p className="text-[11px] font-bold text-purple-400/60 uppercase tracking-widest">Details</p>
                  <p className="text-sm text-white/60 leading-relaxed">{activeAnnotation.note}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint when no annotation selected */}
      {!activeAnnotation && block.annotations && block.annotations.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-white/[0.04] bg-white/[0.01]">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400/50 animate-pulse-slow" />
          <p className="text-[11px] text-white/25">
            Click any highlighted line (●) to open a Beej-style explanation
          </p>
        </div>
      )}
    </div>
  )
}
