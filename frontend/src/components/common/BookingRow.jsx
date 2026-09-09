const statusClass = (status = '') => `status ${status.toLowerCase().replaceAll(' ', '-')}`;

export default function BookingRow({ booking }) {
  const date = new Date(booking.bookingDate);
  return <div className="booking-row"><div className="date-tile"><b>{date.getDate()}</b><small>{date.toLocaleDateString('en-US', { month: 'short' })}</small></div><div className="booking-info"><strong>{booking.service?.name || 'Service appointment'}</strong><span>{booking.vehicle?.registrationNumber || 'Vehicle'} · {booking.timeSlot}</span></div><span className={statusClass(booking.status)}>{booking.status}</span></div>;
}
