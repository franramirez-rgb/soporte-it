export default function Loading() {
  return <div className="stack">
    <div className="card pad skeleton" style={{ minHeight: 120 }} />
    <div className="grid g2"><div className="card pad skeleton" style={{ minHeight: 220 }} /><div className="card pad skeleton" style={{ minHeight: 220 }} /></div>
    <div className="card pad skeleton" style={{ minHeight: 280 }} />
  </div>
}
