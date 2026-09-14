import { useEffect, useState } from 'react';
import {
  AlertCircle, Calendar, Camera, CheckCircle, ChevronDown,
  Clock, Edit2, Loader, Trash2, User, UserCheck, Wrench, X,
} from 'lucide-react';
import { api, patch } from '../../api';
import Modal from '../../components/common/Modal';

const API_URL  = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const STATUS_COLORS = {
  'Pending':           { bg: '#fff3e0', color: '#f57c00' },
  'Confirmed':         { bg: '#e3f2fd', color: '#1976d2' },
  'Assigned':          { bg: '#f3e5f5', color: '#7b1fa2' },
  'Inspection':        { bg: '#fce4ec', color: '#c2185b' },
  'In Progress':       { bg: '#e0f2f1', color: '#00796b' },
  'Waiting for Parts': { bg: '#fff9c4', color: '#f9a825' },
  'Completed':         { bg: '#e8f5e9', color: '#388e3c' },
  'Cancelled':         { bg: '#ffebee', color: '#d32f2f' },
  'Rejected':          { bg: '#ffebee', color: '#d32f2f' },
};

// Allowed next statuses per role
const STAFF_STATUSES = ['Pending', 'Confirmed', 'Assigned', 'Inspection', 'In Progress', 'Waiting for Parts', 'Completed', 'Rejected'];

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ photos, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true" aria-label="Photo viewer">
      <button className="lightbox-close" onClick={onClose} aria-label="Close"><X size={22} /></button>
      <button className="lightbox-nav prev" onClick={(e) => { e.stopPropagation(); setIdx((idx - 1 + photos.length) % photos.length); }} aria-label="Previous">‹</button>
      <img src={`${BASE_URL}${photos[idx].url}`} alt={photos[idx].caption || `photo ${idx + 1}`} onClick={(e) => e.stopPropagation()} />
      {photos[idx].caption && <p className="lightbox-caption">{photos[idx].caption}</p>}
      <span className="lightbox-counter">{idx + 1} / {photos.length}</span>
      <button className="lightbox-nav next" onClick={(e) => { e.stopPropagation(); setIdx((idx + 1) % photos.length); }} aria-label="Next">›</button>
    </div>
  );
}

function PhotoStrip({ photos, label, accent }) {
  const [lightbox, setLightbox] = useState(null);
  if (!photos?.length) return null;
  return (
    <div className="service-photo-section">
      <p className="service-photo-label" style={{ color: accent }}>
        <Camera size={13} />{label}<span className="tab-badge">{photos.length}</span>
      </p>
      <div className="photo-grid">
        {photos.map((p, i) => (
          <div className="photo-thumb" key={`${p.url}-${i}`} onClick={() => setLightbox(i)}>
            <img src={`${BASE_URL}${p.url}`} alt={p.caption || label} />
            {p.caption && <span className="photo-caption">{p.caption}</span>}
          </div>
        ))}
      </div>
      {lightbox !== null && <Lightbox photos={photos} startIndex={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

// ─── Service detail viewer (customer + staff) ──────────────────────────────────
function ServiceDetailModal({ booking, onClose }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/service-records/booking/${booking._id}`)
      .then(setRecord).catch(() => setRecord(null)).finally(() => setLoading(false));
  }, [booking._id]);

  return (
    <Modal title="Service Details" onClose={onClose} wide>
      <div className="service-detail-modal">
        <div className="svc-booking-strip">
          <div><span className="eyebrow">Service</span><strong>{booking.service?.name}</strong></div>
          <div>
            <span className="eyebrow">Vehicle</span>
            <strong>{[booking.vehicle?.brand, booking.vehicle?.model].filter(Boolean).join(' ')}</strong>
            <span className="muted">{booking.vehicle?.registrationNumber}</span>
          </div>
          <div>
            <span className="eyebrow">Date</span>
            <strong>{new Date(booking.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
          </div>
          <div><span className={`status ${booking.status === 'Completed' ? 'completed' : 'in-progress'}`}>{booking.status}</span></div>
        </div>

        {loading && <div className="job-loading"><Loader size={20} /><span>Loading service record…</span></div>}
        {!loading && !record && (
          <div className="svc-no-record"><Wrench size={28} /><p>The service team hasn't started documenting this job yet.</p></div>
        )}
        {!loading && record && (
          <>
            {record.mechanic && (
              <div className="mechanic-info-card">
                <div className="mechanic-avatar">{record.mechanic.name?.slice(0, 1).toUpperCase()}</div>
                <div>
                  <p className="eyebrow orange">Assigned mechanic</p>
                  <strong>{record.mechanic.name}</strong>
                  {record.mechanic.specialization && <span className="muted"> · {record.mechanic.specialization}</span>}
                  {record.completedAt && (
                    <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      <CheckCircle size={12} style={{ verticalAlign: 'middle', marginRight: 4, color: 'var(--green)' }} />
                      Completed {new Date(record.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="svc-photos-row">
              <PhotoStrip photos={record.beforePhotos} label="Before service" accent="#e86f33" />
              <PhotoStrip photos={record.afterPhotos}  label="After service"  accent="#3d9b79" />
            </div>
            {(!record.beforePhotos?.length && !record.afterPhotos?.length) && (
              <p className="muted" style={{ fontSize: 13 }}><Camera size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />No photos uploaded yet.</p>
            )}
            {record.workPerformed?.filter(Boolean).length > 0 && (
              <div className="svc-work-section">
                <p className="svc-section-head"><Wrench size={14} />Work performed</p>
                <ul className="work-list">
                  {record.workPerformed.filter(Boolean).map((s, i) => <li key={i}><CheckCircle size={13} />{s}</li>)}
                </ul>
              </div>
            )}
            {record.mechanicNotes && (
              <div className="svc-notes-box">
                <p className="svc-section-head">Mechanic notes</p>
                <p>{record.mechanicNotes}</p>
              </div>
            )}
            {record.recommendations && (
              <div className="svc-notes-box svc-recs">
                <p className="svc-section-head">Recommendations</p>
                <p>{record.recommendations}</p>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── Assign Mechanic Modal (staff / admin) ─────────────────────────────────────
function AssignMechanicModal({ booking, mechanics, onClose, onAssigned }) {
  const [selectedId, setSelectedId] = useState(booking.assignedMechanic?._id || booking.assignedMechanic || '');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!selectedId) { setError('Please select a mechanic.'); return; }
    setSaving(true); setError('');
    try {
      const updated = await patch(`/bookings/${booking._id}/assign-mechanic`, { mechanicId: selectedId });
      onAssigned(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const current = mechanics.find((m) => m._id === (booking.assignedMechanic?._id || booking.assignedMechanic));

  return (
    <Modal title="Assign mechanic" onClose={onClose}>
      <div style={{ padding: '4px 0' }}>
        {/* Booking context */}
        <div className="assign-context-strip">
          <div>
            <span className="eyebrow">Booking</span>
            <strong>{booking.service?.name}</strong>
          </div>
          <div>
            <span className="eyebrow">Customer</span>
            <strong>{booking.customer?.name || 'Customer'}</strong>
            <span className="muted">{booking.customer?.email}</span>
          </div>
          <div>
            <span className="eyebrow">Vehicle</span>
            <strong>{[booking.vehicle?.brand, booking.vehicle?.model].filter(Boolean).join(' ')}</strong>
            <span className="muted">{booking.vehicle?.registrationNumber}</span>
          </div>
          <div>
            <span className="eyebrow">Date & time</span>
            <strong>{new Date(booking.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong>
            <span className="muted">{booking.timeSlot}</span>
          </div>
        </div>

        {current && (
          <div className="current-mechanic-banner">
            <UserCheck size={15} />
            <span>Currently assigned: <strong>{current.name}</strong>{current.specialization ? ` · ${current.specialization}` : ''}</span>
          </div>
        )}

        <form onSubmit={submit} style={{ marginTop: 16 }}>
          <p className="job-label" style={{ marginBottom: 8 }}>Select mechanic</p>

          {mechanics.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>No active mechanics found. Add mechanics in the Team section.</p>
          ) : (
            <div className="mechanic-picker-list">
              {mechanics.map((m) => (
                <label
                  key={m._id}
                  className={`mechanic-picker-item${selectedId === m._id ? ' selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="mechanic"
                    value={m._id}
                    checked={selectedId === m._id}
                    onChange={() => setSelectedId(m._id)}
                  />
                  <div className="mechanic-picker-avatar">{m.name.slice(0, 1).toUpperCase()}</div>
                  <div className="mechanic-picker-info">
                    <strong>{m.name}</strong>
                    {m.specialization && <span>{m.specialization}</span>}
                    {m.phone && <span>{m.phone}</span>}
                  </div>
                  {selectedId === m._id && <CheckCircle size={16} className="mechanic-check" />}
                </label>
              ))}
            </div>
          )}

          {error && <p className="error" style={{ marginTop: 10 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button className="primary" style={{ flex: 1 }} disabled={saving || !selectedId || !mechanics.length}>
              {saving ? <><Loader size={14} />Assigning…</> : <><UserCheck size={14} />Confirm assignment</>}
            </button>
            <button type="button" className="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// ─── Change Status Modal (staff / admin) ──────────────────────────────────────
function ChangeStatusModal({ booking, onClose, onChanged }) {
  const [status, setStatus] = useState(booking.status);
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function submit(e) {
    e.preventDefault();
    if (status === booking.status && !note) { onClose(); return; }
    setSaving(true); setError('');
    try {
      const updated = await patch(`/bookings/${booking._id}/status`, { status, note });
      onChanged(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Update booking status" onClose={onClose}>
      <div style={{ padding: '4px 0' }}>
        <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>
          <strong>{booking.service?.name}</strong> · {booking.customer?.name} · {booking.vehicle?.registrationNumber}
        </p>
        <form onSubmit={submit}>
          <label className="job-label">New status
            <div className="status-select-wrapper">
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STAFF_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown size={15} className="select-chevron" />
            </div>
          </label>

          <label className="job-label" style={{ marginTop: 12 }}>Note (optional)
            <textarea rows={2} placeholder="Add a note about this status change…" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>

          {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button className="primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Saving…' : 'Update status'}
            </button>
            <button type="button" className="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// ─── Staff / Admin booking management card ─────────────────────────────────────
function StaffBookingCard({ booking, mechanics, onRefresh }) {
  const [assigning, setAssigning]       = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [detailOpen, setDetailOpen]     = useState(false);
  const sc = STATUS_COLORS[booking.status] || { bg: '#f5f5f5', color: '#666' };
  const hasRecord = ['Inspection', 'In Progress', 'Waiting for Parts', 'Completed'].includes(booking.status);
  const isTerminal = ['Completed', 'Cancelled', 'Rejected'].includes(booking.status);

  function handleAssigned(updated) {
    onRefresh();
  }
  function handleChanged(updated) {
    onRefresh();
  }

  return (
    <>
      <div className="staff-booking-card" style={{ borderLeftColor: sc.color }}>
        {/* Header row */}
        <div className="sbc-header">
          <div className="sbc-header-left">
            <div className="sbc-badges">
              <span className="mybooking-status" style={{ background: sc.bg, color: sc.color }}>{booking.status}</span>
              <span className="booking-id-pill">#{booking._id.slice(-8).toUpperCase()}</span>
            </div>
            <h3 className="sbc-title">{booking.service?.name}</h3>
          </div>
          <div className="sbc-header-right">
            {!isTerminal && (
              <button className="ghost sbc-status-btn" onClick={() => setChangingStatus(true)}>
                <ChevronDown size={14} />Status
              </button>
            )}
          </div>
        </div>

        {/* Info grid */}
        <div className="sbc-info-grid">
          <div className="sbc-info-item">
            <span className="eyebrow">Customer</span>
            <strong>{booking.customer?.name || '—'}</strong>
            <span className="muted">{booking.customer?.email}</span>
          </div>
          <div className="sbc-info-item">
            <span className="eyebrow">Vehicle</span>
            <strong>{[booking.vehicle?.brand, booking.vehicle?.model].filter(Boolean).join(' ') || '—'}</strong>
            <span className="muted reg-pill" style={{ display: 'inline-block', marginTop: 2 }}>{booking.vehicle?.registrationNumber}</span>
          </div>
          <div className="sbc-info-item">
            <span className="eyebrow">Appointment</span>
            <strong>{new Date(booking.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
            <span className="muted"><Clock size={11} style={{ verticalAlign: 'middle' }} /> {booking.timeSlot}</span>
          </div>
          <div className="sbc-info-item">
            <span className="eyebrow">Mechanic</span>
            {booking.assignedMechanic ? (
              <>
                <strong style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <UserCheck size={13} style={{ color: 'var(--green)' }} />{booking.assignedMechanic.name}
                </strong>
                {!isTerminal && (
                  <button className="link" style={{ fontSize: 11, marginTop: 3 }} onClick={() => setAssigning(true)}>
                    Reassign
                  </button>
                )}
              </>
            ) : (
              <>
                <span className="muted" style={{ fontSize: 12 }}>Not assigned</span>
                {!isTerminal && (
                  <button className="assign-btn" onClick={() => setAssigning(true)}>
                    <UserCheck size={13} />Assign mechanic
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {booking.problemDescription && (
          <p className="mybooking-problem">{booking.problemDescription}</p>
        )}

        {/* Footer actions */}
        <div className="sbc-footer">
          {booking.estimatedCost && (
            <span className="sbc-cost">₹{Number(booking.estimatedCost).toLocaleString('en-IN')}</span>
          )}
          <div className="sbc-actions">
            {hasRecord && (
              <button className="ghost" style={{ fontSize: 12 }} onClick={() => setDetailOpen(true)}>
                <Camera size={13} />Service record
              </button>
            )}
          </div>
        </div>
      </div>

      {assigning && (
        <AssignMechanicModal
          booking={booking}
          mechanics={mechanics}
          onClose={() => setAssigning(false)}
          onAssigned={handleAssigned}
        />
      )}
      {changingStatus && (
        <ChangeStatusModal
          booking={booking}
          onClose={() => setChangingStatus(false)}
          onChanged={handleChanged}
        />
      )}
      {detailOpen && (
        <ServiceDetailModal booking={booking} onClose={() => setDetailOpen(false)} />
      )}
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function MyBookingsPage({ user }) {
  const isStaffOrAdmin = user?.role === 'admin' || user?.role === 'staff';

  const [bookings, setBookings]           = useState([]);
  const [mechanics, setMechanics]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [filter, setFilter]               = useState('all');
  const [search, setSearch]               = useState('');

  // Customer-only state
  const [detailBooking, setDetailBooking] = useState(null);
  const [rescheduling, setRescheduling]   = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ newDate: '', newTimeSlot: '' });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading]   = useState(false);
  const [cancelling, setCancelling]       = useState(null);
  const [cancelReason, setCancelReason]   = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadBookings();
    if (isStaffOrAdmin) loadMechanics();
  }, []);

  async function loadBookings() {
    setLoading(true);
    try { setBookings(await api('/bookings')); setError(''); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function loadMechanics() {
    try { setMechanics(await api('/mechanics')); }
    catch { /* non-critical */ }
  }

  // Filtering
  const filtered = bookings.filter((b) => {
    const matchesFilter =
      filter === 'all'       ? true :
      filter === 'active'    ? !['Completed', 'Cancelled', 'Rejected'].includes(b.status) :
      filter === 'pending'   ? b.status === 'Pending' :
      filter === 'assigned'  ? b.status === 'Assigned' :
      filter === 'completed' ? b.status === 'Completed' :
      filter === 'past'      ? ['Completed', 'Cancelled', 'Rejected'].includes(b.status) : true;

    if (!isStaffOrAdmin || !search) return matchesFilter;
    const q = search.toLowerCase();
    return matchesFilter && (
      b.customer?.name?.toLowerCase().includes(q) ||
      b.vehicle?.registrationNumber?.toLowerCase().includes(q) ||
      b.service?.name?.toLowerCase().includes(q) ||
      b._id.slice(-8).toLowerCase().includes(q)
    );
  });

  // Customer helpers
  async function loadSlots(date) {
    setSlotsLoading(true);
    try { const d = await api(`/bookings/available-slots/${date}`); setAvailableSlots(d.availableSlots); }
    catch { setAvailableSlots([]); }
    finally { setSlotsLoading(false); }
  }

  async function handleReschedule() {
    if (!rescheduleForm.newDate || !rescheduleForm.newTimeSlot) { alert('Please select date and time'); return; }
    setActionLoading(true);
    try {
      await patch(`/bookings/${rescheduling._id}/reschedule`, rescheduleForm);
      setRescheduling(null); setRescheduleForm({ newDate: '', newTimeSlot: '' });
      await loadBookings();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setActionLoading(false); }
  }

  async function handleCancel() {
    setActionLoading(true);
    try {
      await patch(`/bookings/${cancelling._id}/cancel`, { reason: cancelReason });
      setCancelling(null); setCancelReason('');
      await loadBookings();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setActionLoading(false); }
  }

  const canReschedule  = (b) => !['Completed', 'Cancelled', 'Rejected', 'In Progress'].includes(b.status);
  const canCancel      = (b) => !['Completed', 'Cancelled', 'Rejected'].includes(b.status);
  const hasServiceRecord = (b) => ['Inspection', 'In Progress', 'Waiting for Parts', 'Completed'].includes(b.status);

  if (loading) return (
    <div className="page">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 12 }}>
        <Loader size={36} className="spin" /><p className="muted">Loading bookings…</p>
      </div>
    </div>
  );

  // ── STAFF / ADMIN VIEW ─────────────────────────────────────────────────────
  if (isStaffOrAdmin) {
    const FILTERS = [
      { id: 'all',       label: 'All',       count: bookings.length },
      { id: 'pending',   label: 'Pending',   count: bookings.filter((b) => b.status === 'Pending').length },
      { id: 'active',    label: 'Active',    count: bookings.filter((b) => !['Completed', 'Cancelled', 'Rejected'].includes(b.status)).length },
      { id: 'assigned',  label: 'Assigned',  count: bookings.filter((b) => b.status === 'Assigned').length },
      { id: 'completed', label: 'Completed', count: bookings.filter((b) => b.status === 'Completed').length },
    ];

    return (
      <div className="page">
        <div className="page-heading">
          <div>
            <p className="eyebrow orange">Service desk</p>
            <h1>Bookings</h1>
            <p className="muted">Manage all customer bookings, assign mechanics and track service progress.</p>
          </div>
          {/* Quick stats */}
          <div className="booking-quick-stats">
            <div className="bqs-item"><span>{bookings.filter((b) => b.status === 'Pending').length}</span><small>Pending</small></div>
            <div className="bqs-item bqs-orange"><span>{bookings.filter((b) => !['Completed','Cancelled','Rejected'].includes(b.status) && b.assignedMechanic == null).length}</span><small>Unassigned</small></div>
            <div className="bqs-item bqs-green"><span>{bookings.filter((b) => b.status === 'Completed').length}</span><small>Completed</small></div>
          </div>
        </div>

        {error && <div className="alert-error"><AlertCircle size={18} /><span>{error}</span></div>}

        {/* Toolbar: filters + search */}
        <div className="booking-toolbar">
          <div className="booking-filter-tabs" style={{ borderBottom: 'none', marginBottom: 0 }}>
            {FILTERS.map((f) => (
              <button key={f.id} className={`booking-filter-tab${filter === f.id ? ' active' : ''}`} onClick={() => setFilter(f.id)}>
                {f.label} <span className="filter-count" style={{ marginLeft: 4 }}>{f.count}</span>
              </button>
            ))}
          </div>
          <input
            className="invoice-search"
            placeholder="Search by customer, vehicle, service…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p className="muted">No bookings match your filter.</p>
          </div>
        ) : (
          <div className="staff-booking-list">
            {filtered.map((b) => (
              <StaffBookingCard
                key={b._id}
                booking={b}
                mechanics={mechanics}
                onRefresh={loadBookings}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── CUSTOMER VIEW ──────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow orange">Your appointments</p>
          <h1>My Bookings</h1>
          <p className="muted">Track your service history, view mechanic updates and before & after photos.</p>
        </div>
      </div>

      {error && <div className="alert-error"><AlertCircle size={18} /><span>{error}</span></div>}

      <div className="booking-filter-tabs">
        {[{ id: 'all', label: 'All bookings' }, { id: 'active', label: 'Active' }, { id: 'past', label: 'Past' }].map((t) => (
          <button key={t.id} className={`booking-filter-tab${filter === t.id ? ' active' : ''}`} onClick={() => setFilter(t.id)}>{t.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '48px 24px' }}><p className="muted">No bookings found.</p></div>
      ) : (
        <div className="mybooking-list">
          {filtered.map((booking) => {
            const sc = STATUS_COLORS[booking.status] || { bg: '#f5f5f5', color: '#666' };
            return (
              <div className="mybooking-card" key={booking._id} style={{ borderLeftColor: sc.color }}>
                <div className="mybooking-top">
                  <div className="mybooking-info">
                    <div className="mybooking-badges">
                      <span className="mybooking-status" style={{ background: sc.bg, color: sc.color }}>{booking.status}</span>
                      <span className="booking-id-pill">#{booking._id.slice(-8).toUpperCase()}</span>
                    </div>
                    <h3 className="mybooking-title">{booking.service?.name} · {booking.vehicle?.brand} {booking.vehicle?.model}</h3>
                    <div className="mybooking-meta">
                      <span><Calendar size={13} />{new Date(booking.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span><Clock size={13} />{booking.timeSlot}</span>
                      {booking.estimatedCost && <span style={{ color: 'var(--orange)', fontWeight: 700 }}>₹{Number(booking.estimatedCost).toLocaleString('en-IN')}</span>}
                      {booking.assignedMechanic && <span><User size={13} />{booking.assignedMechanic.name}</span>}
                    </div>
                    {booking.problemDescription && <p className="mybooking-problem">{booking.problemDescription}</p>}
                  </div>
                  <div className="mybooking-actions">
                    {hasServiceRecord(booking) && (
                      <button className="primary" style={{ fontSize: 12, padding: '8px 14px' }} onClick={() => setDetailBooking(booking)}>
                        <Camera size={14} />Service details
                      </button>
                    )}
                    {canReschedule(booking) && (
                      <button className="ghost" onClick={() => { setRescheduling(booking); setRescheduleForm({ newDate: '', newTimeSlot: '' }); setAvailableSlots([]); }}>
                        <Edit2 size={13} />Reschedule
                      </button>
                    )}
                    {canCancel(booking) && (
                      <button className="ghost danger-text" onClick={() => { setCancelling(booking); setCancelReason(''); }}>
                        <Trash2 size={13} />Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detailBooking && <ServiceDetailModal booking={detailBooking} onClose={() => setDetailBooking(null)} />}

      {rescheduling && (
        <Modal title="Reschedule Booking" onClose={() => setRescheduling(null)}>
          <div style={{ padding: '4px 0' }}>
            <p className="muted" style={{ marginBottom: 20 }}>{rescheduling.service?.name} · {rescheduling.vehicle?.brand} {rescheduling.vehicle?.model}</p>
            <label className="job-label">New date
              <input type="date" min={new Date().toISOString().split('T')[0]} value={rescheduleForm.newDate}
                onChange={(e) => { setRescheduleForm({ ...rescheduleForm, newDate: e.target.value }); loadSlots(e.target.value); }} />
            </label>
            <label className="job-label" style={{ marginTop: 12 }}>Time slot
              {slotsLoading ? <p className="muted" style={{ fontSize: 12 }}>Loading slots…</p> : (
                <select value={rescheduleForm.newTimeSlot} disabled={!rescheduleForm.newDate || !availableSlots.length}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, newTimeSlot: e.target.value })}>
                  <option value="">Select time…</option>
                  {availableSlots.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              {rescheduleForm.newDate && !slotsLoading && !availableSlots.length && <small className="error">No slots available</small>}
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="primary" disabled={!rescheduleForm.newDate || !rescheduleForm.newTimeSlot || actionLoading} onClick={handleReschedule} style={{ flex: 1 }}>
                {actionLoading ? 'Rescheduling…' : 'Confirm reschedule'}
              </button>
              <button className="ghost" onClick={() => setRescheduling(null)} style={{ flex: 1 }}>Keep booking</button>
            </div>
          </div>
        </Modal>
      )}

      {cancelling && (
        <Modal title="Cancel Booking" onClose={() => setCancelling(null)}>
          <div style={{ padding: '4px 0' }}>
            <p style={{ color: '#c54444', marginBottom: 16 }}>This action cannot be undone.</p>
            <label className="job-label">Reason (optional)
              <textarea rows={3} placeholder="Tell us why you're cancelling…" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="primary" style={{ flex: 1, background: '#c54444' }} disabled={actionLoading} onClick={handleCancel}>
                {actionLoading ? 'Cancelling…' : 'Yes, cancel booking'}
              </button>
              <button className="ghost" onClick={() => setCancelling(null)} style={{ flex: 1 }}>Keep booking</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
