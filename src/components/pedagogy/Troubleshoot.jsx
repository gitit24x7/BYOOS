import { useState } from 'react'
import { ChevronDown, AlertOctagon } from 'lucide-react'

export default function Troubleshoot({ block }) {
  const { title = 'When It Doesn\'t Boot', items = [] } = block
  const [open, setOpen] = useState(0)

  return (
    <div className="my-8 rounded-2xl border border-amber-500/20 overflow-hidden bg-[#0c0c14]">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-amber-500/15 bg-amber-500/[0.06]">
        <AlertOctagon size={15} className="text-amber-400 flex-shrink-0" />
        <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">{title}</span>
      </div>
      <div className="divide-y divide-white/[0.05]">
        {items.map((item, i) => {
          const isOpen = open === i
          return (
            <div key={i}>
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-sm font-mono text-white/80">{item.symptom}</span>
                <ChevronDown size={14} className={`text-white/30 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-5 pb-4 space-y-2.5">
                  <div>
                    <p className="text-[10px] font-bold text-amber-400/60 uppercase tracking-widest mb-1">Cause</p>
                    <p className="text-sm text-white/60 leading-relaxed">{item.cause}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest mb-1">Fix</p>
                    <p className="text-sm text-white/60 leading-relaxed">{item.fix}</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
