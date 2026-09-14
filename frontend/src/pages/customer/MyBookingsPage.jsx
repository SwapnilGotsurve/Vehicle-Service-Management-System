import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle, XCircle, Edit2, Trash2, Loader } from 'lucide-react';
import { api, patch } from '../../api';
import Modal from '../../components/common/Modal';

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

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({ newDate: '', newTimeSlot: '' });
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      setLoading(true);
      const data = await api('/bookings');
      setBookings(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    if (filter === 'active') return !['Completed', 'Cancelled', 'Rejected'].includes(booking.status);
    if (filter === 'past') return ['Completed', 'Cancelled', 'Rejected'].includes(booking.status);
    return true;
  });

  async function handleReschedule() {
    if (!rescheduleForm.newDate || !rescheduleForm.newTimeSlot) {
      alert('Please select date and time');
      return;
    }

    setActionLoading(true);
    try {
      await patch(`/bookings/${selectedBooking._id}/reschedule`, rescheduleForm);
      setShowRescheduleModal(false);
      setRescheduleForm({ newDate: '', newTimeSlot: '' });
      await loadBookings();
      alert('Booking rescheduled successfully!');
    } catch (err) {
      alert('Error rescheduling: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    setActionLoading(true);
    try {
      await patch(`/bookings/${selectedBooking._id}/cancel`, { reason: cancelReason });
      setShowCancelModal(false);
      setCancelReason('');
      await loadBookings();
      alert('Booking cancelled successfully!');
    } catch (err) {
      alert('Error cancelling: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function loadAvailableSlots(date) {
    setSlotsLoading(true);
    try {
      const data = await api(`/bookings/available-slots/${date}`);
      setAvailableSlots(data.availableSlots);
    } catch (err) {
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }

  function openRescheduleModal(booking) {
    setSelectedBooking(booking);
    setRescheduleForm({ newDate: '', newTimeSlot: '' });
    setAvailableSlots([]);
    setShowRescheduleModal(true);
  }

  function openCancelModal(booking) {
    setSelectedBooking(booking);
    setCancelReason('');
    setShowCancelModal(true);
  }

  const canReschedule = (booking) => !['Completed', 'Cancelled', 'Rejected', 'In Progress'].includes(booking.status);
  const canCancel = (booking) => !['Completed', 'Cancelled', 'Rejected'].includes(booking.status);

  if (loading) {
    return (
      <div className="page">
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Loader size={40} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p className="muted">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow orange">Your appointments</p>
          <h1>My Bookings</h1>
          <p className="muted">View and manage all your service bookings</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#ffebee', border: '1px solid #f44336', borderRadius: '8px', color: '#c62828', marginBottom: '20px', display: 'flex', gap: '8px' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <div>{error}</div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #e0e0e0' }}>
        {['all', 'active', 'past'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              textTransform: 'capitalize',
              borderBottom: filter === f ? '3px solid #ff9800' : 'none',
              color: filter === f ? '#ff9800' : '#666',
              fontWeight: filter === f ? 'bold' : 'normal'
            }}
          >
            {f === 'all' ? 'All Bookings' : f === 'active' ? 'Active' : 'Past'}
          </button>
        ))}
      </div>

      {filteredBookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f5f5f5', borderRadius: '8px' }}>
          <p className="muted">No bookings found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredBookings.map((booking) => {
            const status = booking.status;
            const statusColor = statusColors[status] || statusColors['Pending'];
            const bookingDate = new Date(booking.bookingDate);
            const isPast = bookingDate < new Date();

            return (
              <div key={booking._id} style={{
                padding: '16px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                background: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s',
                borderLeft: `4px solid ${statusColor.color}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
                        Booking ID: {booking._id.slice(-8).toUpperCase()}
                      </span>
                    </div>

                    <h3 style={{ margin: '8px 0', fontSize: '16px', fontWeight: 'bold' }}>
                      {booking.service?.name} - {booking.vehicle?.brand} {booking.vehicle?.model}
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '12px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Calendar size={16} color="#666" />
                        <div>
                          <span style={{ color: '#999' }}>Date:</span>
                          <span style={{ marginLeft: '4px', fontWeight: '500' }}>
                            {bookingDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Clock size={16} color="#666" />
                        <div>
                          <span style={{ color: '#999' }}>Time:</span>
                          <span style={{ marginLeft: '4px', fontWeight: '500' }}>{booking.timeSlot}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ color: '#999' }}>Cost:</span>
                        <span style={{ marginLeft: '4px', fontWeight: '500', color: '#ff9800' }}>
                          ₹{Number(booking.estimatedCost).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {booking.problemDescription && (
                      <div style={{ marginTop: '12px', padding: '8px 12px', background: '#f5f5f5', borderRadius: '4px', fontSize: '14px' }}>
                        <strong>Issue:</strong> {booking.problemDescription}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                    {canReschedule(booking) && (
                      <button
                        onClick={() => openRescheduleModal(booking)}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #ff9800',
                          background: '#fff',
                          color: '#ff9800',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          display: 'flex',
                          gap: '4px',
                          alignItems: 'center'
                        }}
                      >
                        <Edit2 size={14} /> Reschedule
                      </button>
                    )}
                    {canCancel(booking) && (
                      <button
                        onClick={() => openCancelModal(booking)}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #f44336',
                          background: '#fff',
                          color: '#f44336',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          display: 'flex',
                          gap: '4px',
                          alignItems: 'center'
                        }}
                      >
                        <Trash2 size={14} /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedBooking && (
        <Modal onClose={() => setShowRescheduleModal(false)}>
          <div style={{ padding: '20px' }}>
            <h2>Reschedule Booking</h2>
            <p style={{ color: '#666', marginTop: '8px' }}>
              {selectedBooking.service?.name} for {selectedBooking.vehicle?.brand} {selectedBooking.vehicle?.model}
            </p>

            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '16px' }}>
                <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>New Date *</span>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={rescheduleForm.newDate}
                  onChange={(e) => {
                    setRescheduleForm({ ...rescheduleForm, newDate: e.target.value });
                    loadAvailableSlots(e.target.value);
                  }}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: '16px' }}>
                <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Time Slot *</span>
                {slotsLoading ? (
                  <div style={{ padding: '8px', color: '#999' }}>Loading available slots...</div>
                ) : (
                  <select
                    value={rescheduleForm.newTimeSlot}
                    onChange={(e) => setRescheduleForm({ ...rescheduleForm, newTimeSlot: e.target.value })}
                    disabled={!rescheduleForm.newDate || availableSlots.length === 0}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="">Select time...</option>
                    {availableSlots.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                )}
                {rescheduleForm.newDate && availableSlots.length === 0 && (
                  <small style={{ color: '#d32f2f', marginTop: '4px', display: 'block' }}>No slots available for this date</small>
                )}
              </label>

              <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
                <button
                  onClick={handleReschedule}
                  disabled={!rescheduleForm.newDate || !rescheduleForm.newTimeSlot || actionLoading}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#ff9800',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    opacity: (!rescheduleForm.newDate || !rescheduleForm.newTimeSlot || actionLoading) ? 0.6 : 1
                  }}
                >
                  {actionLoading ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#f5f5f5',
                    color: '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Modal */}
      {showCancelModal && selectedBooking && (
        <Modal onClose={() => setShowCancelModal(false)}>
          <div style={{ padding: '20px' }}>
            <h2>Cancel Booking</h2>
            <p style={{ color: '#d32f2f', marginTop: '8px' }}>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>

            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '16px' }}>
                <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Reason for cancellation (optional)</span>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows="3"
                  placeholder="Tell us why you're cancelling..."
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'inherit' }}
                />
              </label>

              <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#f44336',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    opacity: actionLoading ? 0.6 : 1
                  }}
                >
                  {actionLoading ? 'Cancelling...' : 'Yes, Cancel Booking'}
                </button>
                <button
                  onClick={() => setShowCancelModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#f5f5f5',
                    color: '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Keep Booking
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
