import { CheckCircle2 } from 'lucide-react'

export default function Checkpoint({ block }) {
  const { label = 'Checkpoint', command, output, note } = block
  return (
    <div className="my-8 rounded-2xl border border-emerald-500/20 overflow-hidden bg-[#0c0c14]">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-emerald-500/15 bg-emerald-500/[0.06]">
        <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
        <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest">{label}</span>
      </div>
      <div className="p-4 md:p-5 space-y-3">
        {command && (
          <div className="flex items-center gap-2 font-mono text-[13px]">
            <span className="text-emerald-400/50 flex-shrink-0">$</span>
            <span className="text-white/70">{command}</span>
          </div>
        )}
        <pre className="font-mono text-[12.5px] leading-relaxed text-emerald-100/80 whitespace-pre-wrap bg-black/25 rounded-lg p-3.5 border border-white/[0.05]">
{output}
        </pre>
        {note && <p className="text-sm text-white/50 leading-relaxed">{note}</p>}
      </div>
    </div>
  )
}
