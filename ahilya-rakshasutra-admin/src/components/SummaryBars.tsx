export default function SummaryBars({ counts }:{ counts:{ sms:number; url:number; voip:number}}) {
  const card = "bg-slate-900/50 border border-slate-800 rounded-lg p-3";
  const num = "text-2xl font-bold";
  const label = "text-slate-400 text-sm";
  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      <div className={card}><div className={label}>VOIP</div><div className={num}>{counts.voip}</div></div>
      <div className={card}><div className={label}>SMS</div><div className={num}>{counts.sms}</div></div>
      <div className={card}><div className={label}>URL</div><div className={num}>{counts.url}</div></div>
    </div>
  );
}
