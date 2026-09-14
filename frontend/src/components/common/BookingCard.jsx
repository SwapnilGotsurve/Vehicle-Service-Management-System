import { Calendar, Clock, DollarSign, AlertCircle } from 'lucide-react';

const statusColors = {
  'Pending': { bg: '#fff3e0', color: '#f57c00', icon: '⏳' },
  'Confirmed': { bg: '#e3f2fd', color: '#1976d2', icon: '✓' },
  'Assigned': { bg: '#f3e5f5', color: '#7b1fa2', icon: '👤' },
  'Inspection': { bg: '#fce4ec', color: '#c2185b', icon: '🔍' },
  'In Progress': { bg: '#e0f2f1', color: '#00796b', icon: '⚙️' },
  'Waiting for Parts': { bg: '#fff9c4', color: '#f9a825', icon: '⏸️' },
  'Completed': { bg: '#e8f5e9', color: '#388e3c', icon: '✓' },
  'Cancelled': { bg: '#ffebee', color: '#d32f2f', icon: '✗' },
  'Rejected': { bg: '#ffebee', color: '#d32f2f', icon: '✗' }
};

export default function BookingCard({ booking, onAction, actions = [] }) {
  const status = booking.status;
  const statusColor = statusColors[status] || statusColors['Pending'];
  const bookingDate = new Date(booking.bookingDate);

  return (
    <div style={{
      padding: '16px',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      background: '#fff',
      borderLeft: `4px solid ${statusColor.color}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '16px'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{
            padding: '4px 12px',
            background: statusColor.bg,
            color: statusColor.color,
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {statusColor.icon} {status}
          </span>
          <span style={{ fontSize: '12px', color: '#999' }}>
            ID: {booking._id.slice(-8).toUpperCase()}
          </span>
        </div>

        <h3 style={{ margin: '8px 0', fontSize: '16px', fontWeight: 'bold' }}>
          {booking.service?.name} - {booking.vehicle?.brand} {booking.vehicle?.model}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '12px', fontSize: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Calendar size={16} color="#666" />
            <span>{bookingDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Clock size={16} color="#666" />
            <span>{booking.timeSlot}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <DollarSign size={16} color="#ff9800" />
            <span style={{ fontWeight: '500', color: '#ff9800' }}>₹{Number(booking.estimatedCost).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {booking.problemDescription && (
          <div style={{ marginTop: '12px', padding: '8px 12px', background: '#f5f5f5', borderRadius: '4px', fontSize: '13px' }}>
            <AlertCircle size={14} style={{ marginRight: '6px', display: 'inline-block' }} />
            {booking.problemDescription}
          </div>
        )}
      </div>

      {actions.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onAction && onAction(action.id, booking)}
              style={{
                padding: '8px 12px',
                border: `1px solid ${action.color}`,
                background: '#fff',
                color: action.color,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = action.color;
                e.target.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#fff';
                e.target.style.color = action.color;
              }}
            >
              {action.icon && <action.icon size={14} />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
