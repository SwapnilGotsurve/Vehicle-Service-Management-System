import { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp, TrendingDown, Download, FileText, Pencil,
  Plus, Trash2, X, IndianRupee, CreditCard, Clock, CheckCircle,
  BarChart2, User, Calendar,
} from 'lucide-react';
import { api, del, patch, post, put } from '../../api';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { downloadInvoicePdf } from './invoicePdf';

// ─── helpers ────────────────────────────────────────────────────────────────
const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const moneyFull = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const blankItem = () => ({ type: 'service', name: '', quantity: 1, price: 0 });
const billableStatuses = ['Confirmed', 'Assigned', 'Inspection', 'In Progress', 'Waiting for Parts', 'Completed'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function totalsOf(items, discount, tax) {
  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);
  return { subtotal, grandTotal: Math.max(0, subtotal - Number(discount || 0) + Number(tax || 0)) };
}

function statusClass(status) {
  if (status === 'Paid') return 'completed';
  if (status === 'Pending') return 'pending';
  if (status === 'Partially Paid') return 'in-progress';
  return '';
}

// ─── mini bar chart (no external dep) ──────────────────────────────────────
function MiniBarChart({ data }) {
  if (!data?.length) return <p className="muted" style={{ fontSize: 12 }}>No data yet</p>;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="mini-bar-chart" aria-label="Monthly revenue chart">
      {data.map((d) => (
        <div key={`${d._id.year}-${d._id.month}`} className="mini-bar-col">
          <span className="mini-bar-tip">{money(d.revenue)}</span>
          <div
            className="mini-bar"
            style={{ height: `${Math.max(6, (d.revenue / max) * 100)}%` }}
            title={`${MONTH_NAMES[d._id.month - 1]} ${d._id.year}: ${money(d.revenue)}`}
          />
          <span className="mini-bar-label">{MONTH_NAMES[d._id.month - 1]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Admin Analytics Panel ──────────────────────────────────────────────────
function AdminAnalytics({ analytics }) {
  const { overall, thisMonth, lastMonth, thisYear, growth, byPaymentMethod, monthlyTrend, byStatus } = analytics;
  const collectionRate = overall.count ? Math.round((overall.paidCount / overall.count) * 100) : 0;

  return (
    <div className="analytics-section">
      {/* KPI row */}
      <div className="analytics-kpi-grid">
        <div className="kpi-card kpi-primary">
          <div className="kpi-icon"><IndianRupee size={20} /></div>
          <div className="kpi-body">
            <span>Total Revenue</span>
            <strong>{money(overall.totalRevenue)}</strong>
            <small>All time · {overall.count} invoices</small>
          </div>
        </div>

        <div className="kpi-card kpi-green">
          <div className="kpi-icon"><CheckCircle size={20} /></div>
          <div className="kpi-body">
            <span>Collected</span>
            <strong>{money(overall.totalPaid)}</strong>
            <small>{collectionRate}% collection rate</small>
          </div>
        </div>

        <div className="kpi-card kpi-amber">
          <div className="kpi-icon"><Clock size={20} /></div>
          <div className="kpi-body">
            <span>Outstanding</span>
            <strong>{money(overall.totalPending + overall.totalPartial)}</strong>
            <small>{overall.pendingCount} pending invoices</small>
          </div>
        </div>

        <div className="kpi-card kpi-blue">
          <div className="kpi-icon"><Calendar size={20} /></div>
          <div className="kpi-body">
            <span>This Month</span>
            <strong>{money(thisMonth.revenue)}</strong>
            <small className={`growth-badge ${growth === null ? '' : growth >= 0 ? 'up' : 'down'}`}>
              {growth === null ? 'No prior data' : (
                <>{growth >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {Math.abs(growth)}% vs last month</>
              )}
            </small>
          </div>
        </div>
      </div>

      {/* Secondary row: chart + breakdown */}
      <div className="analytics-row">
        {/* Monthly trend chart */}
        <div className="analytics-panel">
          <div className="analytics-panel-head">
            <BarChart2 size={16} />
            <span>Monthly Revenue (last 6 months)</span>
          </div>
          <MiniBarChart data={monthlyTrend} />
          <div className="analytics-chart-foot">
            <div><span>Last month</span><strong>{money(lastMonth.revenue)}</strong></div>
            <div><span>This month</span><strong>{money(thisMonth.revenue)}</strong></div>
            <div><span>This year</span><strong>{money(thisYear.revenue)}</strong></div>
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="analytics-panel">
          <div className="analytics-panel-head">
            <CreditCard size={16} />
            <span>Payment Breakdown</span>
          </div>
          <div className="breakdown-list">
            {byStatus?.map((s) => (
              <div className="breakdown-row" key={s._id}>
                <span className={`status ${statusClass(s._id)}`}>{s._id}</span>
                <span className="breakdown-count">{s.count} inv</span>
                <strong className="breakdown-amount">{money(s.total)}</strong>
              </div>
            ))}
          </div>
          <div className="analytics-panel-head" style={{ marginTop: 16 }}>
            <CreditCard size={16} />
            <span>Collection by Method</span>
          </div>
          <div className="breakdown-list">
            {byPaymentMethod?.length ? byPaymentMethod.map((m) => (
              <div className="breakdown-row" key={m._id}>
                <span className="method-pill">{m._id || 'Unset'}</span>
                <span className="breakdown-count">{m.count} paid</span>
                <strong className="breakdown-amount">{money(m.total)}</strong>
              </div>
            )) : <p className="muted" style={{ fontSize: 12 }}>No paid invoices yet</p>}
          </div>
        </div>

        {/* Other stats */}
        <div className="analytics-panel">
          <div className="analytics-panel-head">
            <IndianRupee size={16} />
            <span>Adjustments (All time)</span>
          </div>
          <div className="breakdown-list">
            <div className="breakdown-row">
              <span className="muted" style={{ fontSize: 12 }}>Gross billed</span>
              <strong className="breakdown-amount">{money(overall.totalRevenue + overall.totalDiscount - overall.totalTax)}</strong>
            </div>
            <div className="breakdown-row">
              <span className="muted" style={{ fontSize: 12 }}>Discounts given</span>
              <strong className="breakdown-amount" style={{ color: 'var(--orange)' }}>- {money(overall.totalDiscount)}</strong>
            </div>
            <div className="breakdown-row">
              <span className="muted" style={{ fontSize: 12 }}>Tax collected</span>
              <strong className="breakdown-amount" style={{ color: 'var(--green)' }}>+ {money(overall.totalTax)}</strong>
            </div>
            <div className="breakdown-row" style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>Net Revenue</span>
              <strong className="breakdown-amount" style={{ fontSize: 16 }}>{money(overall.totalRevenue)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Invoice Detail Viewer ──────────────────────────────────────────────────
function InvoiceViewer({ viewer, canManage, isAdmin, onClose, onMarkPaid, onEdit, onDelete }) {
  return (
    <Modal title={viewer.invoiceNumber} onClose={onClose} wide>
      <div className="invoice-preview">
        {/* Header meta */}
        <div className="invoice-preview-head">
          <div>
            <p className="eyebrow orange">Billed to</p>
            <strong>{viewer.customer?.name}</strong>
            <span>{viewer.customer?.email}</span>
            {viewer.customer?.phone && <span>{viewer.customer.phone}</span>}
          </div>
          <div>
            <p className="eyebrow orange">Vehicle</p>
            <strong>{[viewer.vehicle?.brand, viewer.vehicle?.model].filter(Boolean).join(' ')}</strong>
            <span>{viewer.vehicle?.registrationNumber}</span>
            <span className={`status ${statusClass(viewer.paymentStatus)}`}>{viewer.paymentStatus}</span>
          </div>
          {(isAdmin || canManage) && viewer.createdBy && (
            <div>
              <p className="eyebrow orange">Created by</p>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <User size={13} />{viewer.createdBy.name}
              </strong>
              <span style={{ textTransform: 'capitalize' }}>{viewer.createdBy.role}</span>
              <span>{new Date(viewer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          )}
        </div>

        <table className="invoice-table">
          <thead>
            <tr><th>Item</th><th>Type</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {(viewer.items || []).map((item, i) => (
              <tr key={`${item.name}-${i}`}>
                <td>{item.name}</td>
                <td><span className="method-pill">{item.type || 'service'}</span></td>
                <td>{item.quantity}</td>
                <td>{moneyFull(item.price)}</td>
                <td><strong>{moneyFull(item.total)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-summary">
          <div><span>Subtotal</span><strong>{moneyFull(viewer.subtotal)}</strong></div>
          <div><span>Discount</span><strong>- {moneyFull(viewer.discount)}</strong></div>
          <div><span>Tax</span><strong>+ {moneyFull(viewer.tax)}</strong></div>
          <div className="grand"><span>Total due</span><strong>{moneyFull(viewer.grandTotal)}</strong></div>
        </div>

        {viewer.paymentMethod && (
          <p className="muted" style={{ fontSize: 12 }}>
            Payment method: <strong>{viewer.paymentMethod}</strong>
          </p>
        )}
        {viewer.notes && <p className="muted">Notes: {viewer.notes}</p>}

        <div className="invoice-actions">
          <button className="primary" onClick={() => downloadInvoicePdf(viewer)}>
            <Download size={16} />Download PDF
          </button>
          {canManage && viewer.paymentStatus !== 'Paid' && (
            <button className="ghost" onClick={() => onMarkPaid(viewer)}>Mark paid</button>
          )}
          {/* Admin can only edit payment status, NOT invoice content */}
          {canManage && !isAdmin && (
            <button className="ghost" onClick={() => onEdit(viewer)}>
              <Pencil size={16} />Edit
            </button>
          )}
          {isAdmin && viewer.paymentStatus !== 'Paid' && (
            <button className="ghost danger-text" onClick={() => onDelete(viewer)}>
              <Trash2 size={15} />Delete
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function InvoicesPage({ user }) {
  const isAdmin = user.role === 'admin';
  const isStaff = user.role === 'staff';
  const isCustomer = user.role === 'customer';
  // Staff can create/edit invoices; admin is read-only with analytics; customer can only view+download
  const canCreate = isStaff;
  const canManage = isStaff; // edit/delete day-to-day managed by staff only

  const [invoices, setInvoices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editor, setEditor] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  async function load() {
    const invoiceData = await api('/invoices');
    setInvoices(invoiceData);
    if (canCreate) {
      const [bookingData, serviceData] = await Promise.all([api('/bookings'), api('/services')]);
      setBookings(bookingData);
      setServices(serviceData);
    }
  }

  async function loadAnalytics() {
    if (!isAdmin) return;
    setAnalyticsLoading(true);
    try {
      const data = await api('/invoices/analytics/summary');
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyticsLoading(false);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
    loadAnalytics();
  }, [user.role]);

  const invoicedBookingIds = useMemo(
    () => new Set(invoices.map((inv) => inv.booking?._id || inv.booking)),
    [invoices],
  );
  const billableBookings = bookings.filter(
    (b) => billableStatuses.includes(b.status) && !invoicedBookingIds.has(b._id),
  );

  const visible = invoices.filter((inv) => {
    const matchesFilter = filter === 'all' || inv.paymentStatus === filter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.customer?.name?.toLowerCase().includes(q) ||
      inv.vehicle?.registrationNumber?.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  // Summary stats (for non-admin quick view)
  const stats = {
    count: invoices.length,
    pending: invoices.filter((i) => i.paymentStatus === 'Pending').length,
    outstanding: invoices
      .filter((i) => i.paymentStatus !== 'Paid')
      .reduce((s, i) => s + Number(i.grandTotal || 0), 0),
    collected: invoices
      .filter((i) => i.paymentStatus === 'Paid')
      .reduce((s, i) => s + Number(i.grandTotal || 0), 0),
  };

  // ── Staff editor helpers ──────────────────────────────────────────────────
  function applyBookingService(bookingId, currentItems) {
    const booking = bookings.find((b) => b._id === bookingId);
    const service = booking?.service;
    if (!service) return currentItems;
    if (currentItems.some((i) => i.name === service.name)) return currentItems;
    return [{ type: 'service', name: service.name, quantity: 1, price: Number(service.price) || 0 }, ...currentItems];
  }

  function openCreate() {
    setError('');
    const bookingId = billableBookings[0]?._id || '';
    setEditor({
      booking: bookingId,
      items: bookingId ? applyBookingService(bookingId, []) : [],
      discount: 0, tax: 0, notes: '', paymentStatus: 'Pending', paymentMethod: '',
    });
  }

  function openEdit(invoice) {
    setError('');
    setViewer(null);
    setEditor({
      _id: invoice._id,
      booking: invoice.booking?._id || invoice.booking,
      items: (invoice.items || []).map((i) => ({ type: i.type || 'service', name: i.name, quantity: i.quantity, price: i.price })),
      discount: invoice.discount || 0,
      tax: invoice.tax || 0,
      notes: invoice.notes || '',
      paymentStatus: invoice.paymentStatus,
      paymentMethod: invoice.paymentMethod || '',
    });
  }

  async function saveEditor(e) {
    e.preventDefault();
    if (!editor.booking) { setError('Select the booking this invoice belongs to'); return; }
    const items = editor.items.filter((i) => i.name && Number(i.price) >= 0);
    if (!items.length) { setError('Add at least one billed service or part'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        booking: editor.booking, items,
        discount: Number(editor.discount) || 0, tax: Number(editor.tax) || 0,
        notes: editor.notes, paymentStatus: editor.paymentStatus, paymentMethod: editor.paymentMethod,
      };
      if (editor._id) await put(`/invoices/${editor._id}`, payload);
      else await post('/invoices', payload);
      setMessage(editor._id ? 'Invoice updated' : 'Invoice created');
      setEditor(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeInvoice(invoice) {
    if (!window.confirm(`Delete ${invoice.invoiceNumber}? This cannot be undone.`)) return;
    try {
      await del(`/invoices/${invoice._id}`);
      setMessage('Invoice deleted');
      setViewer(null);
      await load();
      if (isAdmin) loadAnalytics();
    } catch (err) {
      setError(err.message);
    }
  }

  async function markPaid(invoice) {
    try {
      await patch(`/invoices/${invoice._id}/payment`, { paymentStatus: 'Paid', paymentMethod: invoice.paymentMethod || 'Cash' });
      setMessage('Marked as paid');
      await load();
      if (isAdmin) loadAnalytics();
      if (viewer?._id === invoice._id) setViewer({ ...viewer, paymentStatus: 'Paid' });
    } catch (err) {
      setError(err.message);
    }
  }

  const liveTotals = editor ? totalsOf(editor.items, editor.discount, editor.tax) : { subtotal: 0, grandTotal: 0 };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      {/* Page header */}
      <div className="page-heading">
        <div>
          <p className="eyebrow orange">
            {isAdmin ? 'Finance overview' : isStaff ? 'Billing desk' : 'My billing'}
          </p>
          <h1>Invoices</h1>
          <p className="muted">
            {isAdmin
              ? 'Monitor all invoices, revenue, and profit across the workshop.'
              : isStaff
              ? 'Create invoices from completed work and manage billing.'
              : 'View and download your service invoices.'}
          </p>
        </div>
        {/* Only staff gets "New Invoice" button */}
        {canCreate && (
          <button className="primary" onClick={openCreate}>
            <Plus size={18} />New invoice
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      {/* ── Admin: full analytics dashboard ── */}
      {isAdmin && (
        <>
          {analyticsLoading && <p className="muted" style={{ fontSize: 13 }}>Loading analytics…</p>}
          {analytics && <AdminAnalytics analytics={analytics} />}
        </>
      )}

      {/* ── Non-admin: quick stat strip ── */}
      {!isAdmin && (
        <section className="stat-grid invoice-stats">
          <div className="stat-card">
            <div className="stat-icon orange"><FileText size={18} /></div>
            <span>Invoices</span><strong>{stats.count}</strong><small>All records</small>
          </div>
          <div className="stat-card">
            <div className="stat-icon ink"><FileText size={18} /></div>
            <span>Pending</span><strong>{stats.pending}</strong><small>Awaiting payment</small>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><FileText size={18} /></div>
            <span>Outstanding</span><strong>{money(stats.outstanding)}</strong><small>Not fully paid</small>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><FileText size={18} /></div>
            <span>Collected</span><strong>{money(stats.collected)}</strong><small>Marked paid</small>
          </div>
        </section>
      )}

      {/* ── Filters + search ── */}
      <div className="invoice-toolbar">
        <div className="invoice-filters">
          {['all', 'Pending', 'Paid', 'Partially Paid'].map((v) => (
            <button key={v} className={filter === v ? 'chip active' : 'chip'} onClick={() => setFilter(v)}>
              {v === 'all' ? 'All' : v}
            </button>
          ))}
        </div>
        <input
          className="invoice-search"
          placeholder="Search by number, customer, or plate…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Invoice grid ── */}
      <div className="invoice-grid">
        {visible.map((invoice) => (
          <article className="invoice-card" key={invoice._id}>
            <header>
              <div>
                <p className="eyebrow">{new Date(invoice.createdAt).toLocaleDateString('en-IN')}</p>
                <h3>{invoice.invoiceNumber}</h3>
              </div>
              <span className={`status ${statusClass(invoice.paymentStatus)}`}>{invoice.paymentStatus}</span>
            </header>

            <p className="invoice-party">{invoice.customer?.name || 'Customer'}</p>
            <p className="muted" style={{ fontSize: 12 }}>
              {[invoice.vehicle?.brand, invoice.vehicle?.model, invoice.vehicle?.registrationNumber]
                .filter(Boolean).join(' · ') || 'Vehicle on file'}
            </p>

            {/* Creator badge — visible to admin & staff */}
            {(isAdmin || isStaff) && invoice.createdBy && (
              <p className="invoice-creator">
                <User size={11} />{invoice.createdBy.name}
                <span className="creator-role">{invoice.createdBy.role}</span>
              </p>
            )}

            <p className="invoice-amount">{money(invoice.grandTotal)}</p>

            <div className="invoice-actions">
              <button className="ghost" onClick={() => setViewer(invoice)}>View</button>
              <button className="ghost" onClick={() => downloadInvoicePdf(invoice)}>
                <Download size={15} />PDF
              </button>
              {/* Staff edit */}
              {canManage && (
                <button className="ghost" onClick={() => openEdit(invoice)}>
                  <Pencil size={15} />Edit
                </button>
              )}
              {/* Staff delete (unpaid only); admin delete handled in viewer */}
              {canManage && invoice.paymentStatus !== 'Paid' && (
                <button className="ghost danger-text" onClick={() => removeInvoice(invoice)}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {!visible.length && (
        <div className="panel">
          <EmptyState
            icon={FileText}
            text={
              isAdmin
                ? 'No invoices match your filter.'
                : canCreate
                ? 'No invoices yet. Create one from a billed booking.'
                : 'No invoices yet.'
            }
          />
        </div>
      )}

      {/* ── Invoice detail viewer modal ── */}
      {viewer && (
        <InvoiceViewer
          viewer={viewer}
          canManage={canManage}
          isAdmin={isAdmin}
          onClose={() => setViewer(null)}
          onMarkPaid={markPaid}
          onEdit={openEdit}
          onDelete={removeInvoice}
        />
      )}

      {/* ── Staff invoice editor modal ── */}
      {editor && canCreate && (
        <Modal title={editor._id ? 'Edit invoice' : 'New invoice'} onClose={() => setEditor(null)} wide>
          <form className="invoice-form" onSubmit={saveEditor}>
            <label>
              Booking / job
              <select
                required
                disabled={Boolean(editor._id)}
                value={editor.booking}
                onChange={(e) => setEditor({ ...editor, booking: e.target.value, items: applyBookingService(e.target.value, editor.items) })}
              >
                <option value="">Select a booking to bill</option>
                {(editor._id ? bookings : billableBookings).map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.customer?.name || 'Customer'} · {b.vehicle?.registrationNumber || 'Vehicle'} · {b.service?.name || 'Service'} · {b.status}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <p className="eyebrow">Add from service catalog</p>
              <div className="service-chips">
                {services.map((s) => (
                  <button
                    type="button"
                    className="chip"
                    key={s._id}
                    onClick={() => setEditor({
                      ...editor,
                      items: [...editor.items, { type: 'service', name: s.name, quantity: 1, price: Number(s.price) || 0 }],
                    })}
                  >
                    {s.name} · {money(s.price)}
                  </button>
                ))}
              </div>
            </div>

            <div className="line-items">
              <div className="line-head">
                <span>Billed items</span>
                <button type="button" className="link" onClick={() => setEditor({ ...editor, items: [...editor.items, blankItem()] })}>
                  Add line
                </button>
              </div>
              {editor.items.map((item, idx) => (
                <div className="line-row" key={`${item.name}-${idx}`}>
                  <input
                    placeholder="Service or part name"
                    value={item.name}
                    onChange={(e) => { const items = [...editor.items]; items[idx] = { ...item, name: e.target.value }; setEditor({ ...editor, items }); }}
                  />
                  <select
                    value={item.type}
                    onChange={(e) => { const items = [...editor.items]; items[idx] = { ...item, type: e.target.value }; setEditor({ ...editor, items }); }}
                  >
                    <option value="service">Service</option>
                    <option value="part">Part</option>
                    <option value="labor">Labor</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    type="number" min="1" value={item.quantity}
                    onChange={(e) => { const items = [...editor.items]; items[idx] = { ...item, quantity: Number(e.target.value) }; setEditor({ ...editor, items }); }}
                  />
                  <input
                    type="number" min="0" value={item.price}
                    onChange={(e) => { const items = [...editor.items]; items[idx] = { ...item, price: Number(e.target.value) }; setEditor({ ...editor, items }); }}
                  />
                  <strong>{money((Number(item.quantity) || 0) * (Number(item.price) || 0))}</strong>
                  <button
                    type="button" className="icon-button" aria-label="Remove line"
                    onClick={() => setEditor({ ...editor, items: editor.items.filter((_, i) => i !== idx) })}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {!editor.items.length && <p className="muted">Pick a booking or tap a catalog service to start the bill.</p>}
            </div>

            <div className="form-grid">
              <label>Discount (₹)<input type="number" min="0" value={editor.discount} onChange={(e) => setEditor({ ...editor, discount: e.target.value })} /></label>
              <label>Tax (₹)<input type="number" min="0" value={editor.tax} onChange={(e) => setEditor({ ...editor, tax: e.target.value })} /></label>
              <label>
                Payment status
                <select value={editor.paymentStatus} onChange={(e) => setEditor({ ...editor, paymentStatus: e.target.value })}>
                  <option>Pending</option><option>Paid</option><option>Partially Paid</option><option>Refunded</option>
                </select>
              </label>
              <label>
                Payment method
                <select value={editor.paymentMethod} onChange={(e) => setEditor({ ...editor, paymentMethod: e.target.value })}>
                  <option value="">Not set</option><option>Cash</option><option>Card</option><option>UPI</option><option>Online</option>
                </select>
              </label>
            </div>

            <label className="wide-field">
              Notes<textarea rows="2" value={editor.notes} onChange={(e) => setEditor({ ...editor, notes: e.target.value })} />
            </label>

            <div className="invoice-summary compact">
              <div><span>Subtotal</span><strong>{money(liveTotals.subtotal)}</strong></div>
              <div className="grand"><span>Total</span><strong>{money(liveTotals.grandTotal)}</strong></div>
            </div>

            {error && <p className="error">{error}</p>}
            <button className="primary form-submit" disabled={saving}>
              {saving ? 'Saving…' : editor._id ? 'Save changes' : 'Create invoice'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
