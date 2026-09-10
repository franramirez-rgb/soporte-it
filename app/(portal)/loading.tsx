export default function Loading() {
  return (
    <div className="page-loading" aria-label="Cargando">
      <div className="loading-title skeleton" />
      <div className="loading-subtitle skeleton" />

      <div className="loading-grid">
        <div className="card pad"><div className="skeleton skeleton-stat" /></div>
        <div className="card pad"><div className="skeleton skeleton-stat" /></div>
        <div className="card pad"><div className="skeleton skeleton-stat" /></div>
        <div className="card pad"><div className="skeleton skeleton-stat" /></div>
      </div>

      <div className="card pad loading-table">
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
      </div>
    </div>
  )
}
