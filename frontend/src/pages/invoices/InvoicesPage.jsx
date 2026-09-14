import { useEffect, useMemo, useState } from 'react';
import {
  BarChart2, Calendar, CheckCircle, Clock, CreditCard,
  Download, FileText, IndianRupee, Loader, Pencil,
  Plus, Trash2, TrendingDown, TrendingUp, User, X,
} from 'lucide-react';
import { api, del, patch, post, put } from '../../api';import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { downloadInvoicePdf } from './invoicePdf';

// ─── helpers ─────────────────────────────────────────────────────────────────
const money = (v) =>
  `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const moneyFull = (v) =>
  `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const blankItem = () => ({ type: 'service', name: '', quantity: 1, price: 0 });
const billableStatuses = ['Confirmed', 'Assigned', 'Inspection', 'In Progress', 'Waiting for Parts', 'Completed'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function totalsOf(items, discount, tax) {
  const sub = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);
  return { subtotal: sub, grandTotal: Math.max(0, sub - Number(discount || 0) + Number(tax || 0)) };
}

function payStatusClass(status) {
  if (status === 'Paid')          return 'completed';
  if (status === 'Pending')       return 'pending';
  if (status === 'Partially Paid') return 'in-progress';
  return '';
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────
const CHART_H = 100; // px — fixed chart area height

function MiniBarChart({ data }) {
  if (!data?.length) return <p className="muted" style={{ fontSize: 12 }}>No trend data yet.</p>;

  const max = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="mini-bar-chart" aria-label="Monthly revenue chart">
      {data.map((d) => {
        const barH = Math.max(6, Math.round((d.revenue / max) * CHART_H));
        const label = `${MONTH_NAMES[d._id.month - 1]}`;
        const tipText = `${MONTH_NAMES[d._id.month - 1]} ${d._id.year}\n${money(d.revenue)}`;
        return (
          <div key={`${d._id.year}-${d._id.month}`} className="mbc-col" title={tipText}>
            {/* value label above bar */}
            <span className="mbc-val">{money(d.revenue)}</span>
            {/* spacer pushes bar to bottom */}
            <div className="mbc-spacer" style={{ height: CHART_H - barH }} />
            {/* the bar itself */}
            <div className="mbc-bar" style={{ height: barH }} />
            {/* month label */}
            <span className="mbc-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Admin analytics panel ────────────────────────────────────────────────────
function AdminAnalytics({ analytics }) {
  const { overall, thisMonth, lastMonth, thisYear, growth, byPaymentMethod, monthlyTrend, byStatus } = analytics;
  const collectionRate = overall.count ? Math.round((overall.paidCount / overall.count) * 100) : 0;
  return (
    <div className="analytics-section">
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
                <>{growth >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{Math.abs(growth)}% vs last month</>
              )}
            </small>
          </div>
        </div>
      </div>

      <div className="analytics-row">
        <div className="analytics-panel">
          <div className="analytics-panel-head"><BarChart2 size={16} /><span>Monthly Revenue (last 6 months)</span></div>
          <MiniBarChart data={monthlyTrend} />
          <div className="analytics-chart-foot">
            <div><span>Last month</span><strong>{money(lastMonth.revenue)}</strong></div>
            <div><span>This month</span><strong>{money(thisMonth.revenue)}</strong></div>
            <div><span>This year</span><strong>{money(thisYear.revenue)}</strong></div>
          </div>
        </div>
        <div className="analytics-panel">
          <div className="analytics-panel-head"><CreditCard size={16} /><span>Payment Breakdown</span></div>
          <div className="breakdown-list">
            {byStatus?.map((s) => (
              <div className="breakdown-row" key={s._id}>
                <span className={`status ${payStatusClass(s._id)}`}>{s._id}</span>
                <span className="breakdown-count">{s.count} inv</span>
                <strong className="breakdown-amount">{money(s.total)}</strong>
              </div>
            ))}
          </div>
          <div className="analytics-panel-head" style={{ marginTop: 16 }}><CreditCard size={16} /><span>Collection by Method</span></div>
          <div className="breakdown-list">
            {byPaymentMethod?.length
              ? byPaymentMethod.map((m) => (
                  <div className="breakdown-row" key={m._id}>
                    <span className="method-pill">{m._id || 'Unset'}</span>
                    <span className="breakdown-count">{m.count} paid</span>
                    <strong className="breakdown-amount">{money(m.total)}</strong>
                  </div>
                ))
              : <p className="muted" style={{ fontSize: 12 }}>No paid invoices yet.</p>}
          </div>
        </div>
        <div className="analytics-panel">
          <div className="analytics-panel-head"><IndianRupee size={16} /><span>Adjustments (All time)</span></div>
          <div className="breakdown-list">
            <div className="breakdown-row"><span className="muted" style={{ fontSize: 12 }}>Gross billed</span><strong className="breakdown-amount">{money(overall.totalRevenue + overall.totalDiscount - overall.totalTax)}</strong></div>
            <div className="breakdown-row"><span className="muted" style={{ fontSize: 12 }}>Discounts given</span><strong className="breakdown-amount" style={{ color: 'var(--orange)' }}>− {money(overall.totalDiscount)}</strong></div>
            <div className="breakdown-row"><span className="muted" style={{ fontSize: 12 }}>Tax collected</span><strong className="breakdown-amount" style={{ color: 'var(--green)' }}>+ {money(overall.totalTax)}</strong></div>
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

// ─── Payment update modal (admin + staff) ─────────────────────────────────────
function PaymentModal({ invoice, onClose, onSaved }) {
  const [status, setStatus]   = useState(invoice.paymentStatus || 'Pending');
  const [method, setMethod]   = useState(invoice.paymentMethod || '');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const updated = await patch(`/invoices/${invoice._id}/payment`, {
        paymentStatus: status,
        paymentMethod: method,
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Update payment" onClose={onClose}>
      <div style={{ padding: '4px 0' }}>
        {/* Invoice reference strip */}
        <div className="pay-modal-strip">
          <div><span className="eyebrow">Invoice</span><strong>{invoice.invoiceNumber}</strong></div>
          <div><span className="eyebrow">Customer</span><strong>{invoice.customer?.name}</strong></div>
          <div>
            <span className="eyebrow">Amount</span>
            <strong style={{ color: 'var(--orange)', fontSize: 18, fontFamily: "'Space Grotesk'" }}>
              {moneyFull(invoice.grandTotal)}
            </strong>
          </div>
        </div>

        <form onSubmit={submit} style={{ marginTop: 16 }}>
          <label className="job-label">Payment status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>Pending</option>
              <option>Paid</option>
              <option>Partially Paid</option>
              <option>Refunded</option>
            </select>
          </label>
          <label className="job-label" style={{ marginTop: 12 }}>Payment method
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="">Not set</option>
              <option>Cash</option>
              <option>Card</option>
              <option>UPI</option>
              <option>Online</option>
            </select>
          </label>
          {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button className="primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? <><Loader size={14} />Saving…</> : <><CheckCircle size={14} />Save payment</>}
            </button>
            <button type="button" className="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// ─── Invoice detail viewer ────────────────────────────────────────────────────
function InvoiceViewer({ viewer, isAdmin, isStaff, onClose, onPaymentSaved, onEdit, onDelete }) {
  const [payModal, setPayModal] = useState(false);
  const [localViewer, setLocalViewer] = useState(viewer);
  const canManagePayment = isAdmin || isStaff;

  function handlePaymentSaved(updated) {
    setLocalViewer(updated);
    onPaymentSaved(updated);
  }

  const v = localViewer;
  return (
    <Modal title={v.invoiceNumber} onClose={onClose} wide>
      <div className="invoice-preview">

        {/* ── Payment status banner ── */}
        <div className={`inv-status-banner inv-status-${v.paymentStatus.toLowerCase().replace(' ', '-')}`}>
          <div className="inv-status-banner-left">
            {v.paymentStatus === 'Paid'
              ? <CheckCircle size={18} />
              : <Clock size={18} />}
            <div>
              <strong>{v.paymentStatus}</strong>
              {v.paymentMethod && <span> · {v.paymentMethod}</span>}
              {v.paymentStatus === 'Paid'
                ? <span className="inv-status-sub"> Payment received — thank you!</span>
                : <span className="inv-status-sub"> Payment is awaiting confirmation.</span>}
            </div>
          </div>
          {canManagePayment && (
            <button className="ghost inv-pay-btn" onClick={() => setPayModal(true)}>
              <CreditCard size={14} />Update payment
            </button>
          )}
        </div>

        {/* ── Header meta ── */}
        <div className="invoice-preview-head">
          <div>
            <p className="eyebrow orange">Billed to</p>
            <strong>{v.customer?.name}</strong>
            <span>{v.customer?.email}</span>
            {v.customer?.phone && <span>{v.customer.phone}</span>}
          </div>
          <div>
            <p className="eyebrow orange">Vehicle</p>
            <strong>{[v.vehicle?.brand, v.vehicle?.model].filter(Boolean).join(' ')}</strong>
            <span>{v.vehicle?.registrationNumber}</span>
          </div>
          <div>
            <p className="eyebrow orange">Service date</p>
            <strong>{new Date(v.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
            <span>{v.booking?.service?.name}</span>
          </div>
          {(isAdmin || isStaff) && v.createdBy && (
            <div>
              <p className="eyebrow orange">Created by</p>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <User size={13} />{v.createdBy.name}
              </strong>
              <span style={{ textTransform: 'capitalize' }}>{v.createdBy.role}</span>
            </div>
          )}
        </div>

        {/* ── Line items ── */}
        <table className="invoice-table">
          <thead>
            <tr><th>Item</th><th>Type</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {(v.items || []).map((item, i) => (
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

        {/* ── Totals ── */}
        <div className="invoice-summary">
          <div><span>Subtotal</span><strong>{moneyFull(v.subtotal)}</strong></div>
          <div><span>Discount</span><strong>− {moneyFull(v.discount)}</strong></div>
          <div><span>Tax</span><strong>+ {moneyFull(v.tax)}</strong></div>
          <div className="grand"><span>Total due</span><strong>{moneyFull(v.grandTotal)}</strong></div>
        </div>

        {v.notes && <p className="muted" style={{ fontSize: 13 }}>Notes: {v.notes}</p>}

        {/* ── Actions ── */}
        <div className="invoice-actions">
          <button className="primary" onClick={() => downloadInvoicePdf(v)}>
            <Download size={16} />Download PDF
          </button>
          {isStaff && (
            <button className="ghost" onClick={() => onEdit(v)}>
              <Pencil size={16} />Edit invoice
            </button>
          )}
          {isAdmin && v.paymentStatus !== 'Paid' && (
            <button className="ghost danger-text" onClick={() => onDelete(v)}>
              <Trash2 size={15} />Delete
            </button>
          )}
        </div>
      </div>

      {payModal && (
        <PaymentModal invoice={v} onClose={() => setPayModal(false)} onSaved={handlePaymentSaved} />
      )}
    </Modal>
  );
}

// ─── Customer pay confirmation modal ─────────────────────────────────────────
function CustomerPayModal({ invoice, onClose, onPaid }) {
  const [method,  setMethod]  = useState('Cash');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  async function confirm(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const updated = await patch(`/invoices/${invoice._id}/customer-payment`, { paymentMethod: method });
      onPaid(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Confirm payment" onClose={onClose}>
      <div className="customer-pay-modal">
        {/* Amount banner */}
        <div className="cpm-amount-banner">
          <p className="eyebrow orange">Amount due</p>
          <span className="cpm-amount">{`₹${Number(invoice.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}</span>
          <p className="muted" style={{ fontSize: 12, margin: 0 }}>{invoice.invoiceNumber} · {invoice.booking?.service?.name || 'Vehicle service'}</p>
        </div>

        <form onSubmit={confirm}>
          <p className="cpm-label">How are you paying?</p>
          <div className="cpm-method-grid">
            {['Cash', 'Card', 'UPI', 'Online'].map((m) => (
              <label key={m} className={`cpm-method-tile${method === m ? ' selected' : ''}`}>
                <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} />
                <span className="cpm-method-icon">
                  {m === 'Cash'   && '💵'}
                  {m === 'Card'   && '💳'}
                  {m === 'UPI'    && '📱'}
                  {m === 'Online' && '🌐'}
                </span>
                <span>{m}</span>
              </label>
            ))}
          </div>

          <div className="cpm-notice">
            <CheckCircle size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />
            <span>By confirming, you acknowledge that the payment of <strong>{`₹${Number(invoice.grandTotal || 0).toLocaleString('en-IN')}`}</strong> has been made. Staff will be notified immediately.</span>
          </div>

          {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button className="primary" style={{ flex: 1 }} disabled={saving}>
              {saving
                ? <><Loader size={14} />Processing…</>
                : <><CheckCircle size={15} />Confirm payment · {method}</>}
            </button>
            <button type="button" className="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// ─── Customer invoice card ────────────────────────────────────────────────────
function CustomerInvoiceCard({ invoice, onView, onDownload, onPaid }) {
  const [payOpen, setPayOpen] = useState(false);
  const isPaid = invoice.paymentStatus === 'Paid';

  return (
    <>
      <div className={`customer-inv-card${isPaid ? ' inv-paid' : ' inv-unpaid'}`}>
        {/* Left accent bar */}
        <div className={`customer-inv-bar${isPaid ? ' bar-green' : ' bar-orange'}`} />

        <div className="customer-inv-body">
          <div className="customer-inv-top">
            <div>
              <p className="eyebrow">{new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              <h3 className="customer-inv-num">{invoice.invoiceNumber}</h3>
              <p className="customer-inv-service">{invoice.booking?.service?.name || 'Vehicle service'}</p>
              <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                {[invoice.vehicle?.brand, invoice.vehicle?.model, invoice.vehicle?.registrationNumber].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="customer-inv-right">
              <span className={`status ${payStatusClass(invoice.paymentStatus)}`}>{invoice.paymentStatus}</span>
              <p className="customer-inv-amount">{money(invoice.grandTotal)}</p>
              {invoice.paymentMethod && isPaid && (
                <span className="method-pill" style={{ marginTop: 4 }}>{invoice.paymentMethod}</span>
              )}
            </div>
          </div>

          {/* Paid confirmation */}
          {isPaid && (
            <div className="inv-paid-notice">
              <CheckCircle size={13} />
              <span>Payment received{invoice.paymentMethod ? ` via ${invoice.paymentMethod}` : ''}. Thank you!</span>
            </div>
          )}

          {/* Pending call-to-action */}
          {!isPaid && (
            <div className="inv-pending-notice">
              <Clock size={13} />
              <span>Payment pending — select a method below and tap <strong>Pay now</strong> to confirm.</span>
            </div>
          )}

          <div className="customer-inv-actions">
            <button className="ghost" onClick={() => onView(invoice)}>View details</button>
            {!isPaid && (
              <>
                <button className="ghost" onClick={() => onDownload(invoice)}><Download size={14} />Download PDF</button>
                <button
                  className="primary"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => setPayOpen(true)}
                >
                  <CheckCircle size={15} />Pay now
                </button>
              </>
            )}
            {isPaid && (
              <button
                className="inv-receipt-btn"
                onClick={() => onDownload(invoice)}
              >
                <Download size={15} />Download receipt PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {payOpen && (
        <CustomerPayModal
          invoice={invoice}
          onClose={() => setPayOpen(false)}
          onPaid={(updated) => { onPaid(updated); }}
        />
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function InvoicesPage({ user }) {
  const isAdmin    = user.role === 'admin';
  const isStaff    = user.role === 'staff';
  const isCustomer = user.role === 'customer';

  const [invoices,         setInvoices]         = useState([]);
  const [bookings,         setBookings]         = useState([]);
  const [services,         setServices]         = useState([]);
  const [analytics,        setAnalytics]        = useState(null);
  const [filter,           setFilter]           = useState('all');
  const [search,           setSearch]           = useState('');
  const [error,            setError]            = useState('');
  const [message,          setMessage]          = useState('');
  const [editor,           setEditor]           = useState(null);
  const [viewer,           setViewer]           = useState(null);
  const [saving,           setSaving]           = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [backfilling,      setBackfilling]      = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  async function load() {
    const data = await api('/invoices');
    setInvoices(data);
    if (isStaff) {
      const [bd, sd] = await Promise.all([api('/bookings'), api('/services')]);
      setBookings(bd);
      setServices(sd);
    }
  }

  async function loadAnalytics() {
    if (!isAdmin) return;
    setAnalyticsLoading(true);
    try { setAnalytics(await api('/invoices/analytics/summary')); }
    catch (err) { setError(err.message); }
    finally { setAnalyticsLoading(false); }
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    loadAnalytics();
    // Auto-backfill: generate invoices for completed bookings with no invoice yet
    // Staff/admin do it silently so existing completed jobs immediately get invoices
    if (isStaff || isAdmin) runBackfill();
  }, [user.role]);

  // Silently generate invoices for completed bookings with no invoice yet
  async function runBackfill() {
    try { await post('/invoices/backfill', {}); await load(); }
    catch { /* non-critical */ }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const invoicedBookingIds = useMemo(
    () => new Set(invoices.map((inv) => inv.booking?._id || inv.booking)),
    [invoices],
  );
  const billableBookings = bookings.filter(
    (b) => billableStatuses.includes(b.status) && !invoicedBookingIds.has(b._id),
  );

  const visible = invoices.filter((inv) => {
    const matchFilter = filter === 'all' || inv.paymentStatus === filter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || inv.invoiceNumber?.toLowerCase().includes(q)
      || inv.customer?.name?.toLowerCase().includes(q)
      || inv.vehicle?.registrationNumber?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  // quick stats for staff
  const stats = {
    count:       invoices.length,
    pending:     invoices.filter((i) => i.paymentStatus === 'Pending').length,
    outstanding: invoices.filter((i) => i.paymentStatus !== 'Paid').reduce((s, i) => s + Number(i.grandTotal || 0), 0),
    collected:   invoices.filter((i) => i.paymentStatus === 'Paid').reduce((s, i) => s + Number(i.grandTotal || 0), 0),
  };

  // ── Staff editor helpers ──────────────────────────────────────────────────
  function applyBookingService(bookingId, currentItems) {
    const bk = bookings.find((b) => b._id === bookingId);
    const svc = bk?.service;
    if (!svc || currentItems.some((i) => i.name === svc.name)) return currentItems;
    return [{ type: 'service', name: svc.name, quantity: 1, price: Number(svc.price) || 0 }, ...currentItems];
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
      _id:           invoice._id,
      booking:       invoice.booking?._id || invoice.booking,
      items:         (invoice.items || []).map((i) => ({ type: i.type || 'service', name: i.name, quantity: i.quantity, price: i.price })),
      discount:      invoice.discount || 0,
      tax:           invoice.tax || 0,
      notes:         invoice.notes || '',
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
      else            await post('/invoices', payload);
      setMessage(editor._id ? 'Invoice updated.' : 'Invoice created.');
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
      setMessage('Invoice deleted.');
      setViewer(null);
      await load();
      if (isAdmin) loadAnalytics();
    } catch (err) { setError(err.message); }
  }

  function handlePaymentSaved(updated) {
    setInvoices((prev) => prev.map((inv) => inv._id === updated._id ? updated : inv));
    setMessage('Payment updated.');
    if (isAdmin) loadAnalytics();
  }

  function handleCustomerPaid(updated) {
    setInvoices((prev) => prev.map((inv) => inv._id === updated._id ? updated : inv));
    setMessage('Payment confirmed! Thank you.');
  }

  const liveTotals = editor
    ? totalsOf(editor.items, editor.discount, editor.tax)
    : { subtotal: 0, grandTotal: 0 };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      {/* Page heading */}
      <div className="page-heading">
        <div>
          <p className="eyebrow orange">
            {isAdmin ? 'Finance overview' : isStaff ? 'Billing desk' : 'My billing'}
          </p>
          <h1>Invoices</h1>
          <p className="muted">
            {isAdmin
              ? 'Monitor all invoices, revenue and profit. Update payment status for any invoice.'
              : isStaff
              ? 'Invoices are auto-generated when a job is completed. Create or edit manually as needed.'
              : 'Your service invoices appear here automatically once a job is done.'}
          </p>
        </div>
        {isStaff && (
          <button className="primary" onClick={openCreate}>
            <Plus size={18} />New invoice
          </button>
        )}
      </div>

      {error   && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      {/* ── Admin: analytics dashboard ── */}
      {isAdmin && (
        <>
          {analyticsLoading && (
            <p className="muted" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Loader size={14} className="spin" />Loading analytics…
            </p>
          )}
          {analytics && <AdminAnalytics analytics={analytics} />}
        </>
      )}

      {/* ── Staff: quick stats strip ── */}
      {isStaff && (
        <section className="stat-grid invoice-stats">
          <div className="stat-card">
            <div className="stat-icon orange"><FileText size={18} /></div>
            <span>Total</span><strong>{stats.count}</strong><small>All invoices</small>
          </div>
          <div className="stat-card">
            <div className="stat-icon ink"><Clock size={18} /></div>
            <span>Pending</span><strong>{stats.pending}</strong><small>Awaiting payment</small>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><IndianRupee size={18} /></div>
            <span>Outstanding</span><strong>{money(stats.outstanding)}</strong><small>Not fully paid</small>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><CheckCircle size={18} /></div>
            <span>Collected</span><strong>{money(stats.collected)}</strong><small>Marked paid</small>
          </div>
        </section>
      )}

      {/* ── Customer: summary banner ── */}
      {isCustomer && invoices.length > 0 && (
        <div className="customer-inv-summary">
          <div className="cis-item">
            <span>{invoices.length}</span><small>Total invoices</small>
          </div>
          <div className="cis-item cis-orange">
            <span>{invoices.filter((i) => i.paymentStatus !== 'Paid').length}</span><small>Payment pending</small>
          </div>
          <div className="cis-item cis-green">
            <span>{invoices.filter((i) => i.paymentStatus === 'Paid').length}</span><small>Paid</small>
          </div>
          <div className="cis-item">
            <span>{money(invoices.reduce((s, i) => s + Number(i.grandTotal || 0), 0))}</span><small>Total billed</small>
          </div>
        </div>
      )}

      {/* ── Filters + search (admin & staff) ── */}
      {!isCustomer && (
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
            placeholder="Search by number, customer or plate…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* ── Customer filter chips ── */}
      {isCustomer && invoices.length > 0 && (
        <div className="invoice-filters" style={{ marginBottom: 18 }}>
          {['all', 'Pending', 'Paid'].map((v) => (
            <button key={v} className={filter === v ? 'chip active' : 'chip'} onClick={() => setFilter(v)}>
              {v === 'all' ? 'All' : v}
            </button>
          ))}
        </div>
      )}

      {/* ── Customer invoice list ── */}
      {isCustomer && (
        visible.length === 0 ? (
          <div className="panel">
            <div className="inv-empty-customer">
              <FileText size={36} />
              <h3>No invoices yet</h3>
              <p>Your invoice is generated automatically when your service is marked complete by our team. If your service is done and you don't see it yet, tap the button below.</p>
              <button className="ghost" onClick={() => load().catch(() => {})} style={{ marginTop: 8 }}>
                Refresh invoices
              </button>
            </div>
          </div>
        ) : (
          <div className="customer-inv-list">
            {visible.map((inv) => (
              <CustomerInvoiceCard
                key={inv._id}
                invoice={inv}
                onView={setViewer}
                onDownload={downloadInvoicePdf}
                onPaid={handleCustomerPaid}
              />
            ))}
          </div>
        )
      )}

      {/* ── Admin / Staff invoice grid ── */}
      {!isCustomer && (
        <>
          <div className="invoice-grid">
            {visible.map((invoice) => (
              <article className="invoice-card" key={invoice._id}>
                <header>
                  <div>
                    <p className="eyebrow">{new Date(invoice.createdAt).toLocaleDateString('en-IN')}</p>
                    <h3>{invoice.invoiceNumber}</h3>
                  </div>
                  <span className={`status ${payStatusClass(invoice.paymentStatus)}`}>{invoice.paymentStatus}</span>
                </header>

                <p className="invoice-party">{invoice.customer?.name || 'Customer'}</p>
                <p className="muted" style={{ fontSize: 12 }}>
                  {[invoice.vehicle?.brand, invoice.vehicle?.model, invoice.vehicle?.registrationNumber].filter(Boolean).join(' · ') || 'Vehicle on file'}
                </p>
                {invoice.booking?.service?.name && (
                  <p className="muted" style={{ fontSize: 11, marginTop: 2 }}>{invoice.booking.service.name}</p>
                )}
                {invoice.createdBy && (
                  <p className="invoice-creator">
                    <User size={11} />{invoice.createdBy.name}
                    <span className="creator-role">{invoice.createdBy.role}</span>
                  </p>
                )}
                <p className="invoice-amount">{money(invoice.grandTotal)}</p>

                <div className="invoice-actions">
                  <button className="ghost" onClick={() => setViewer(invoice)}>View</button>
                  <button className="ghost" onClick={() => downloadInvoicePdf(invoice)}><Download size={15} />PDF</button>
                  {isStaff && (
                    <button className="ghost" onClick={() => openEdit(invoice)}><Pencil size={15} />Edit</button>
                  )}
                  {/* Quick pay button on pending invoices */}
                  {invoice.paymentStatus === 'Pending' && (
                    <button
                      className="ghost"
                      style={{ color: 'var(--green)', fontWeight: 700 }}
                      onClick={() => setViewer(invoice)}
                    >
                      <CreditCard size={14} />Pay
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
                text={isAdmin ? 'No invoices match your filter.' : 'No invoices yet. They are created automatically when a job is completed.'}
              />
            </div>
          )}
        </>
      )}

      {/* ── Invoice viewer modal ── */}
      {viewer && (
        <InvoiceViewer
          viewer={viewer}
          isAdmin={isAdmin}
          isStaff={isStaff}
          onClose={() => setViewer(null)}
          onPaymentSaved={handlePaymentSaved}
          onEdit={openEdit}
          onDelete={removeInvoice}
        />
      )}

      {/* ── Staff invoice editor modal ── */}
      {editor && isStaff && (
        <Modal title={editor._id ? 'Edit invoice' : 'New invoice'} onClose={() => setEditor(null)} wide>
          <form className="invoice-form" onSubmit={saveEditor}>
            <label>
              Booking / job
              <select
                required
                disabled={Boolean(editor._id)}
                value={editor.booking}
                onChange={(e) =>
                  setEditor({ ...editor, booking: e.target.value, items: applyBookingService(e.target.value, editor.items) })
                }
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
                    type="button" className="chip" key={s._id}
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
                <button type="button" className="link" onClick={() => setEditor({ ...editor, items: [...editor.items, blankItem()] })}>Add line</button>
              </div>
              {editor.items.map((item, idx) => (
                <div className="line-row" key={`${item.name}-${idx}`}>
                  <input placeholder="Service or part name" value={item.name}
                    onChange={(e) => { const items = [...editor.items]; items[idx] = { ...item, name: e.target.value }; setEditor({ ...editor, items }); }} />
                  <select value={item.type}
                    onChange={(e) => { const items = [...editor.items]; items[idx] = { ...item, type: e.target.value }; setEditor({ ...editor, items }); }}>
                    <option value="service">Service</option><option value="part">Part</option>
                    <option value="labor">Labor</option><option value="other">Other</option>
                  </select>
                  <input type="number" min="1" value={item.quantity}
                    onChange={(e) => { const items = [...editor.items]; items[idx] = { ...item, quantity: Number(e.target.value) }; setEditor({ ...editor, items }); }} />
                  <input type="number" min="0" value={item.price}
                    onChange={(e) => { const items = [...editor.items]; items[idx] = { ...item, price: Number(e.target.value) }; setEditor({ ...editor, items }); }} />
                  <strong>{money((Number(item.quantity) || 0) * (Number(item.price) || 0))}</strong>
                  <button type="button" className="icon-button" aria-label="Remove"
                    onClick={() => setEditor({ ...editor, items: editor.items.filter((_, i) => i !== idx) })}>
                    <X size={16} />
                  </button>
                </div>
              ))}
              {!editor.items.length && <p className="muted">Pick a booking or tap a catalog service to start the bill.</p>}
            </div>

            <div className="form-grid">
              <label>Discount (₹)<input type="number" min="0" value={editor.discount} onChange={(e) => setEditor({ ...editor, discount: e.target.value })} /></label>
              <label>Tax (₹)<input type="number" min="0" value={editor.tax} onChange={(e) => setEditor({ ...editor, tax: e.target.value })} /></label>
              <label>Payment status
                <select value={editor.paymentStatus} onChange={(e) => setEditor({ ...editor, paymentStatus: e.target.value })}>
                  <option>Pending</option><option>Paid</option><option>Partially Paid</option><option>Refunded</option>
                </select>
              </label>
              <label>Payment method
                <select value={editor.paymentMethod} onChange={(e) => setEditor({ ...editor, paymentMethod: e.target.value })}>
                  <option value="">Not set</option><option>Cash</option><option>Card</option><option>UPI</option><option>Online</option>
                </select>
              </label>
            </div>

            <label className="wide-field">Notes
              <textarea rows="2" value={editor.notes} onChange={(e) => setEditor({ ...editor, notes: e.target.value })} />
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
