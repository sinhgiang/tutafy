// The row of figures at the top of a list page (T-0825). Four cards at most; each has a label, a value and one line under it.
export type Stat = { id: string; label: string; value: string; foot?: string }

export function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <div className="dash-grid" style={{ marginBottom: 16 }} data-testid="stat-row">
      {stats.map(s => (
        <div key={s.id} className="dash-card dash-kpi dash-c3" data-testid={`stat-${s.id}`}>
          <span className="dash-kpi-label">{s.label}</span>
          <span className="dash-kpi-value">{s.value}</span>
          {s.foot && <span className="dash-kpi-foot">{s.foot}</span>}
        </div>
      ))}
    </div>
  )
}
