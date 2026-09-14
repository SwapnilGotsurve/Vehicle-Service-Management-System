import { useEffect, useRef, useState } from 'react';
import {
  Camera, CheckCircle, ChevronDown, ChevronUp, ClipboardList,
  ImagePlus, Loader, Plus, Trash2, Upload, Wrench, X,
} from 'lucide-react';
import { api, patch, post } from '../../api';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const statusColors = {
  'Assigned':           { bg: '#f3e5f5', color: '#7b1fa2' },
  'Inspection':         { bg: '#fce4ec', color: '#c2185b' },
  'In Progress':        { bg: '#e0f2f1', color: '#00796b' },
  'Waiting for Parts':  { bg: '#fff9c4', color: '#f9a825' },
  'Completed':          { bg: '#e8f5e9', color: '#388e3c' },
};

// ─── small helpers ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = statusColors[status] || { bg: '#f5f5f5', color: '#666' };
  return (
    <span style={{ padding: '3px 10px', background: s.bg, color: s.color, borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
      {status}
    </span>
  );
}

// ─── Photo grid with lightbox ─────────────────────────────────────────────────
function PhotoGrid({ photos, phase, recordId, onDeleted, canEdit }) {
  const [lightbox, setLightbox] = useState(null);
  const [deleting, setDeleting] = useState(null);

  async function deletePhoto(idx) {
    if (!window.confirm('Remove this photo?')) return;
    setDeleting(idx);
    try {
      const updated = await api(`/service-records/${recordId}/photos/${phase}/${idx}`, { method: 'DELETE' });
      onDeleted(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  }

  if (!photos?.length) {
    return <p className="muted" style={{ fontSize: 12 }}>No {phase} photos yet.</p>;
  }

  return (
    <>
      <div className="photo-grid">
        {photos.map((p, i) => (
          <div className="photo-thumb" key={`${p.url}-${i}`}>
            <img
              src={`${BASE_URL}${p.url}`}
              alt={p.caption || `${phase} photo ${i + 1}`}
              onClick={() => setLightbox(i)}
            />
            {p.caption && <span className="photo-caption">{p.caption}</span>}
            {canEdit && (
              <button
                className="photo-delete-btn"
                onClick={() => deletePhoto(i)}
                disabled={deleting === i}
                aria-label="Delete photo"
              >
                {deleting === i ? <Loader size={12} /> : <Trash2 size={12} />}
              </button>
            )}
          </div>
        ))}
      </div>

      {lightbox !== null && (
        <div className="lightbox" onClick={() => setLightbox(null)} role="dialog" aria-modal="true" aria-label="Photo viewer">
          <button className="lightbox-close" onClick={() => setLightbox(null)} aria-label="Close"><X size={22} /></button>
          <button
            className="lightbox-nav prev"
            onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + photos.length) % photos.length); }}
            aria-label="Previous photo"
          >‹</button>
          <img
            src={`${BASE_URL}${photos[lightbox].url}`}
            alt={photos[lightbox].caption || `${phase} photo`}
            onClick={(e) => e.stopPropagation()}
          />
          {photos[lightbox].caption && <p className="lightbox-caption">{photos[lightbox].caption}</p>}
          <span className="lightbox-counter">{lightbox + 1} / {photos.length}</span>
          <button
            className="lightbox-nav next"
            onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % photos.length); }}
            aria-label="Next photo"
          >›</button>
        </div>
      )}
    </>
  );
}

// ─── Photo upload panel ───────────────────────────────────────────────────────
function PhotoUploader({ recordId, phase, onUploaded }) {
  const fileRef = useRef();
  const [previews, setPreviews] = useState([]);   // { file, caption, objectUrl }
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function pickFiles(e) {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => f.type.startsWith('image/'));
    if (valid.length !== files.length) setError('Only image files are accepted.');
    setPreviews((prev) => [
      ...prev,
      ...valid.map((f) => ({ file: f, caption: '', objectUrl: URL.createObjectURL(f) })),
    ]);
    e.target.value = '';
  }

  function removePreview(idx) {
    URL.revokeObjectURL(previews[idx].objectUrl);
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateCaption(idx, value) {
    setPreviews((prev) => prev.map((p, i) => i === idx ? { ...p, caption: value } : p));
  }

  async function upload() {
    if (!previews.length) return;
    setUploading(true);
    setError('');
    try {
      const token = localStorage.getItem('vsms_token');
      const fd = new FormData();
      previews.forEach((p, i) => {
        fd.append('photos', p.file);
        fd.append('captions', p.caption);
      });
      const res = await fetch(`${API_URL}/service-records/${recordId}/photos/${phase}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Upload failed');
      previews.forEach((p) => URL.revokeObjectURL(p.objectUrl));
      setPreviews([]);
      onUploaded(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="photo-uploader">
      {error && <p className="error" style={{ fontSize: 12 }}>{error}</p>}

      {previews.length > 0 && (
        <div className="upload-previews">
          {previews.map((p, i) => (
            <div className="upload-preview-item" key={p.objectUrl}>
              <img src={p.objectUrl} alt={`preview ${i + 1}`} />
              <input
                className="preview-caption-input"
                placeholder="Caption (optional)"
                value={p.caption}
                onChange={(e) => updateCaption(i, e.target.value)}
              />
              <button className="photo-delete-btn" onClick={() => removePreview(i)} aria-label="Remove"><X size={12} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="uploader-actions">
        <button className="ghost" onClick={() => fileRef.current.click()} type="button">
          <ImagePlus size={15} />Select photos
        </button>
        {previews.length > 0 && (
          <button className="primary" onClick={upload} disabled={uploading} type="button">
            {uploading ? <><Loader size={14} />Uploading…</> : <><Upload size={14} />Upload {previews.length} photo{previews.length > 1 ? 's' : ''}</>}
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={pickFiles} />
    </div>
  );
}

// ─── Job detail / work panel (inside modal) ───────────────────────────────────
function JobDetailModal({ booking, onClose, onRecordSaved }) {
  const [record, setRecord]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError]           = useState('');
  const [section, setSection]       = useState('before'); // 'before' | 'after' | 'notes'

  // Work form state
  const [workLines, setWorkLines]   = useState(['']);
  const [notes, setNotes]           = useState('');
  const [recs, setRecs]             = useState('');

  async function loadRecord() {
    setLoading(true);
    try {
      const data = await api(`/service-records/booking/${booking._id}`);
      setRecord(data);
      setWorkLines(data.workPerformed?.length ? data.workPerformed : ['']);
      setNotes(data.mechanicNotes || '');
      setRecs(data.recommendations || '');
    } catch {
      setRecord(null); // no record yet
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRecord(); }, [booking._id]);

  async function startJob() {
    setError('');
    setSaving(true);
    try {
      const data = await post('/service-records', { booking: booking._id });
      setRecord(data);
      setWorkLines(['']);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveNotes() {
    setSaving(true);
    setError('');
    try {
      const data = await patch(`/service-records/${record._id}`, {
        workPerformed: workLines.filter(Boolean),
        mechanicNotes: notes,
        recommendations: recs,
      });
      setRecord(data);
      onRecordSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function markComplete() {
    if (!window.confirm('Mark this job as complete? This will notify the customer.')) return;
    setCompleting(true);
    setError('');
    try {
      // Save latest notes first
      await patch(`/service-records/${record._id}`, {
        workPerformed: workLines.filter(Boolean),
        mechanicNotes: notes,
        recommendations: recs,
        serviceEndTime: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
      onRecordSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setCompleting(false);
    }
  }

  const isComplete = booking.status === 'Completed';

  return (
    <Modal title={`Job: ${booking.service?.name || 'Service'}`} onClose={onClose} wide>
      <div className="job-detail-modal">
        {/* Booking summary strip */}
        <div className="job-summary-strip">
          <div>
            <span className="eyebrow">Vehicle</span>
            <strong>{[booking.vehicle?.brand, booking.vehicle?.model].filter(Boolean).join(' ')}</strong>
            <span className="muted">{booking.vehicle?.registrationNumber}</span>
          </div>
          <div>
            <span className="eyebrow">Customer</span>
            <strong>{booking.customer?.name}</strong>
          </div>
          <div>
            <span className="eyebrow">Date</span>
            <strong>{new Date(booking.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
            <span className="muted">{booking.timeSlot}</span>
          </div>
          <div><StatusBadge status={booking.status} /></div>
        </div>

        {booking.problemDescription && (
          <div className="job-problem-box">
            <strong>Customer reported issue:</strong> {booking.problemDescription}
          </div>
        )}

        {loading && <div className="job-loading"><Loader size={22} /><span>Loading job record…</span></div>}

        {!loading && !record && !isComplete && (
          <div className="job-start-box">
            <Wrench size={32} />
            <p>No service record started yet. Click below to begin documentation for this job.</p>
            {error && <p className="error">{error}</p>}
            <button className="primary" onClick={startJob} disabled={saving}>
              {saving ? <><Loader size={15} />Starting…</> : <><Plus size={15} />Start job record</>}
            </button>
          </div>
        )}

        {!loading && record && (
          <>
            {/* Section tabs */}
            <div className="job-tabs">
              {[
                { id: 'before', label: 'Before photos', count: record.beforePhotos?.length },
                { id: 'after',  label: 'After photos',  count: record.afterPhotos?.length  },
                { id: 'notes',  label: 'Work & notes'  },
              ].map((t) => (
                <button
                  key={t.id}
                  className={`job-tab${section === t.id ? ' active' : ''}`}
                  onClick={() => setSection(t.id)}
                >
                  {t.label}
                  {t.count !== undefined && <span className="tab-badge">{t.count}</span>}
                </button>
              ))}
            </div>

            {/* Before photos */}
            {section === 'before' && (
              <div className="job-section">
                <p className="job-section-hint">Take photos of the vehicle before starting any work.</p>
                <PhotoGrid
                  photos={record.beforePhotos}
                  phase="before"
                  recordId={record._id}
                  onDeleted={setRecord}
                  canEdit={!isComplete}
                />
                {!isComplete && (
                  <PhotoUploader
                    recordId={record._id}
                    phase="before"
                    onUploaded={setRecord}
                  />
                )}
              </div>
            )}

            {/* After photos */}
            {section === 'after' && (
              <div className="job-section">
                <p className="job-section-hint">Take photos after completing the work to show the result.</p>
                <PhotoGrid
                  photos={record.afterPhotos}
                  phase="after"
                  recordId={record._id}
                  onDeleted={setRecord}
                  canEdit={!isComplete}
                />
                {!isComplete && (
                  <PhotoUploader
                    recordId={record._id}
                    phase="after"
                    onUploaded={setRecord}
                  />
                )}
              </div>
            )}

            {/* Work & Notes */}
            {section === 'notes' && (
              <div className="job-section">
                <div className="job-notes-grid">
                  <div>
                    <label className="job-label">Work performed</label>
                    {workLines.map((line, i) => (
                      <div className="work-line" key={i}>
                        <input
                          placeholder={`Step ${i + 1}…`}
                          value={line}
                          disabled={isComplete}
                          onChange={(e) => {
                            const updated = [...workLines];
                            updated[i] = e.target.value;
                            setWorkLines(updated);
                          }}
                        />
                        {!isComplete && workLines.length > 1 && (
                          <button type="button" className="icon-button" onClick={() => setWorkLines(workLines.filter((_, j) => j !== i))} aria-label="Remove line"><X size={14} /></button>
                        )}
                      </div>
                    ))}
                    {!isComplete && (
                      <button type="button" className="link" style={{ marginTop: 6 }} onClick={() => setWorkLines([...workLines, ''])}>
                        <Plus size={13} />Add step
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="job-label">Mechanic notes
                      <textarea
                        rows={4}
                        placeholder="Internal notes about the service…"
                        value={notes}
                        disabled={isComplete}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </label>
                    <label className="job-label">Recommendations for customer
                      <textarea
                        rows={3}
                        placeholder="e.g. Replace brake pads within 5,000 km…"
                        value={recs}
                        disabled={isComplete}
                        onChange={(e) => setRecs(e.target.value)}
                      />
                    </label>
                  </div>
                </div>

                {error && <p className="error">{error}</p>}

                {!isComplete && (
                  <div className="job-actions">
                    <button className="ghost" onClick={saveNotes} disabled={saving}>
                      {saving ? <><Loader size={14} />Saving…</> : 'Save notes'}
                    </button>
                    <button className="primary" onClick={markComplete} disabled={completing}>
                      {completing
                        ? <><Loader size={14} />Completing…</>
                        : <><CheckCircle size={15} />Mark job complete</>}
                    </button>
                  </div>
                )}
                {isComplete && record.completedAt && (
                  <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
                    ✓ Completed on {new Date(record.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ServiceJobPage({ user }) {
  const [bookings, setBookings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [filter, setFilter]       = useState('active');
  const [activeJob, setActiveJob] = useState(null);

  async function loadBookings() {
    setLoading(true);
    try {
      const data = await api('/bookings');
      setBookings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBookings(); }, []);

  const filtered = bookings.filter((b) => {
    if (filter === 'active')    return !['Completed', 'Cancelled', 'Rejected'].includes(b.status);
    if (filter === 'completed') return b.status === 'Completed';
    return true;
  });

  const counts = {
    active:    bookings.filter((b) => !['Completed', 'Cancelled', 'Rejected'].includes(b.status)).length,
    completed: bookings.filter((b) => b.status === 'Completed').length,
  };

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 12 }}>
          <Loader size={36} className="spin" />
          <p className="muted">Loading your jobs…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow orange">Workshop</p>
          <h1>My Jobs</h1>
          <p className="muted">Manage your assigned service jobs, upload before & after photos, and document the work.</p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {/* Filter tabs */}
      <div className="job-filter-tabs">
        {[
          { id: 'active',    label: 'Active',    count: counts.active    },
          { id: 'completed', label: 'Completed', count: counts.completed },
          { id: 'all',       label: 'All jobs',  count: bookings.length  },
        ].map((t) => (
          <button key={t.id} className={`job-filter-tab${filter === t.id ? ' active' : ''}`} onClick={() => setFilter(t.id)}>
            {t.label} <span className="filter-count">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Job cards */}
      {filtered.length === 0 ? (
        <div className="panel">
          <EmptyState icon={ClipboardList} text={filter === 'active' ? 'No active jobs assigned to you.' : 'No jobs found.'} />
        </div>
      ) : (
        <div className="job-card-list">
          {filtered.map((booking) => {
            const sc = statusColors[booking.status] || { bg: '#f5f5f5', color: '#666' };
            return (
              <div className="job-card" key={booking._id}>
                <div className="job-card-left">
                  <div className="job-card-status-bar" style={{ background: sc.color }} />
                  <div className="job-card-body">
                    <div className="job-card-top">
                      <div>
                        <p className="eyebrow">{new Date(booking.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {booking.timeSlot}</p>
                        <h3 className="job-card-title">{booking.service?.name || 'Service'}</h3>
                        <p className="job-card-vehicle">
                          {[booking.vehicle?.brand, booking.vehicle?.model].filter(Boolean).join(' ')}
                          {booking.vehicle?.registrationNumber && <span className="reg-pill">{booking.vehicle.registrationNumber}</span>}
                        </p>
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>

                    {booking.problemDescription && (
                      <p className="job-card-problem">
                        <strong>Issue:</strong> {booking.problemDescription}
                      </p>
                    )}

                    <div className="job-card-meta">
                      <span><Camera size={12} />Photos documented when job is open</span>
                      {booking.estimatedCost && (
                        <span>Est. ₹{Number(booking.estimatedCost).toLocaleString('en-IN')}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  className="primary job-open-btn"
                  onClick={() => setActiveJob(booking)}
                >
                  {booking.status === 'Completed' ? 'View record' : 'Open job'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeJob && (
        <JobDetailModal
          booking={activeJob}
          onClose={() => setActiveJob(null)}
          onRecordSaved={loadBookings}
        />
      )}
    </div>
  );
}
