import { Lightbulb, AlertTriangle, Info, Zap } from 'lucide-react'

const variants = {
  insight: {
    border: 'border-blue-500/25',
    bg: 'bg-blue-950/20',
    icon: <Lightbulb size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />,
    labelColor: 'text-blue-400',
    label: 'Key Insight',
    textColor: 'text-blue-100/90',
  },
  warning: {
    border: 'border-amber-500/25',
    bg: 'bg-amber-950/20',
    icon: <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />,
    labelColor: 'text-amber-400',
    label: 'Watch Out',
    textColor: 'text-amber-100/90',
  },
  tip: {
    border: 'border-green-500/25',
    bg: 'bg-green-950/20',
    icon: <Zap size={16} className="text-green-400 flex-shrink-0 mt-0.5" />,
    labelColor: 'text-green-400',
    label: 'Pro Tip',
    textColor: 'text-green-100/90',
  },
  info: {
    border: 'border-purple-500/25',
    bg: 'bg-purple-950/20',
    icon: <Info size={16} className="text-purple-400 flex-shrink-0 mt-0.5" />,
    labelColor: 'text-purple-400',
    label: 'Note',
    textColor: 'text-purple-100/90',
  },
}

export default function CalloutBox({ block }) {
  const v = variants[block.variant] || variants.info
  return (
    <div className={`my-6 p-4 md:p-5 rounded-xl border ${v.border} ${v.bg} flex gap-3.5`}>
      {v.icon}
      <div className="space-y-1">
        <p className={`text-[11px] font-bold uppercase tracking-widest ${v.labelColor}`}>{v.label}</p>
        <p className={`text-sm leading-relaxed ${v.textColor}`}>{block.content}</p>
      </div>
    </div>
  )
}
