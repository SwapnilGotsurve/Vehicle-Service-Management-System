export default function BookingStatusTimeline({ statusHistory = [] }) {
  if (!statusHistory || statusHistory.length === 0) {
    return <p style={{ color: '#999', fontSize: '14px' }}>No status history available</p>;
  }

  const statusEmojis = {
    'Pending': '⏳',
    'Confirmed': '✓',
    'Assigned': '👤',
    'Inspection': '🔍',
    'In Progress': '⚙️',
    'Waiting for Parts': '⏸️',
    'Completed': '✓',
    'Cancelled': '✗',
    'Rejected': '✗'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {statusHistory.map((entry, idx) => {
        const date = new Date(entry.timestamp);
        const isLast = idx === statusHistory.length - 1;

        return (
          <div key={idx} style={{ display: 'flex', gap: '12px' }}>
            {/* Timeline connector */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '24px',
                height: '24px',
                background: '#ff9800',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {statusEmojis[entry.status] || '•'}
              </div>
              {!isLast && <div style={{ width: '2px', height: '40px', background: '#ddd', margin: '4px 0' }} />}
            </div>

            {/* Timeline content */}
            <div style={{ flex: 1, paddingTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <strong>{entry.status}</strong>
                <span style={{ fontSize: '12px', color: '#999' }}>
                  {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {entry.note && (
                <p style={{ fontSize: '13px', color: '#666', margin: '0' }}>
                  {entry.note}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
