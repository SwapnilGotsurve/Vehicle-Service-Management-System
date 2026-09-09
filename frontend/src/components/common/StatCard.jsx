export default function StatCard({ icon: Icon, label, value, accent = 'blue' }) {
  return <div className="stat-card"><div className={`stat-icon ${accent}`}><Icon size={19} /></div><span>{label}</span><strong>{value}</strong><small>Updated just now</small></div>;
}
