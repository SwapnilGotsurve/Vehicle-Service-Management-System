import { Bell, Download, FileText, LogOut, Sparkles, X, User, Mail, Shield } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { navigation } from './navigation';
import Modal from '../common/Modal';
import { api } from '../../api';
import { downloadInvoicePdf } from '../../pages/invoices/invoicePdf';

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function payStatusClass(status) {
  if (status === 'Paid')           return 'completed';
  if (status === 'Pending')        return 'pending';
  if (status === 'Partially Paid') return 'in-progress';
  return '';
}

export default function Sidebar({ user, open, onClose, onLogout }) {
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [invoices, setInvoices]       = useState([]);
  const [invLoading, setInvLoading]   = useState(false);

  const visible = navigation.filter((item) => !item.roles || item.roles.includes(user.role));

  // Load invoices when profile opens (customers only)
  useEffect(() => {
    if (!profileOpen || user.role !== 'customer') return;
    setInvLoading(true);
    api('/invoices')
      .then(setInvoices)
      .catch(() => setInvoices([]))
      .finally(() => setInvLoading(false));
  }, [profileOpen, user.role]);

  const paidInvoices    = invoices.filter((i) => i.paymentStatus === 'Paid');
  const pendingInvoices = invoices.filter((i) => i.paymentStatus !== 'Paid');

  return (
    <aside className={open ? 'sidebar open' : 'sidebar'}>
      <div className="brand">
        <button
          className="brand-profile-btn"
          onClick={() => setProfileOpen(true)}
          title="View profile"
        >
          <div className="brand-mark">{user.name.slice(0, 1)}</div>
          <div>
            <b>Forge</b>
            <small>{user.name}</small>
          </div>
        </button>
        <button className="icon-button close-menu" onClick={onClose}><X size={19} /></button>
      </div>

      <nav>
        {visible.map(({ label, icon: Icon, path }) => (
          <Link
            key={path}
            className={location.pathname === path ? 'active' : ''}
            onClick={onClose}
            to={path}
          >
            <Icon size={18} />{label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <Link to="/notifications"><Bell size={18} />Notifications</Link>
        <button className="logout sidebar-logout" onClick={onLogout}><LogOut size={16} />Log out</button>
        <div className="support-box"><Sparkles size={17} /><span><b>Need a hand?</b><small>Support is online</small></span></div>
      </div>

      {profileOpen && (
        <Modal title="My Profile" onClose={() => setProfileOpen(false)} wide={user.role === 'customer'}>
          <div className="profile-modal">
            {/* ── Avatar + info ── */}
            <div className="profile-header">
              <div className="profile-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
              <div className="profile-info">
                <div className="profile-item">
                  <User size={16} />
                  <div><small>Full Name</small><p>{user.name}</p></div>
                </div>
                <div className="profile-item">
                  <Mail size={16} />
                  <div><small>Email Address</small><p>{user.email || 'Not provided'}</p></div>
                </div>
                <div className="profile-item">
                  <Shield size={16} />
                  <div>
                    <small>Role</small>
                    <p className="role-badge">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Invoice section — customers only ── */}
            {user.role === 'customer' && (
              <div className="profile-invoices">
                <div className="profile-inv-heading">
                  <FileText size={15} />
                  <span>My Invoices</span>
                  {invoices.length > 0 && (
                    <span className="profile-inv-count">{invoices.length} total</span>
                  )}
                </div>

                {invLoading && (
                  <p className="muted" style={{ fontSize: 13 }}>Loading invoices…</p>
                )}

                {!invLoading && invoices.length === 0 && (
                  <p className="muted" style={{ fontSize: 13 }}>No invoices yet. They appear once your service is complete.</p>
                )}

                {!invLoading && invoices.length > 0 && (
                  <div className="profile-inv-list">
                    {/* Paid invoices — receipts */}
                    {paidInvoices.length > 0 && (
                      <>
                        <p className="profile-inv-section-label">
                          <span className="status completed">Paid</span> Receipts
                        </p>
                        {paidInvoices.map((inv) => (
                          <div className="profile-inv-row profile-inv-paid" key={inv._id}>
                            <div className="profile-inv-row-left">
                              <div className="profile-inv-icon paid-icon">
                                <FileText size={14} />
                              </div>
                              <div>
                                <strong>{inv.invoiceNumber}</strong>
                                <span>{inv.booking?.service?.name || 'Vehicle service'}</span>
                                <span className="muted" style={{ fontSize: 11 }}>
                                  {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  {inv.paymentMethod ? ` · ${inv.paymentMethod}` : ''}
                                </span>
                              </div>
                            </div>
                            <div className="profile-inv-row-right">
                              <strong className="profile-inv-amount">{money(inv.grandTotal)}</strong>
                              <button
                                className="profile-pdf-btn"
                                onClick={() => downloadInvoicePdf(inv)}
                                title="Download PDF receipt"
                              >
                                <Download size={14} />PDF
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Pending invoices */}
                    {pendingInvoices.length > 0 && (
                      <>
                        <p className="profile-inv-section-label" style={{ marginTop: paidInvoices.length ? 14 : 0 }}>
                          <span className="status pending">Pending</span> Awaiting payment
                        </p>
                        {pendingInvoices.map((inv) => (
                          <div className="profile-inv-row" key={inv._id}>
                            <div className="profile-inv-row-left">
                              <div className="profile-inv-icon pending-icon">
                                <FileText size={14} />
                              </div>
                              <div>
                                <strong>{inv.invoiceNumber}</strong>
                                <span>{inv.booking?.service?.name || 'Vehicle service'}</span>
                                <span className="muted" style={{ fontSize: 11 }}>
                                  {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                            </div>
                            <div className="profile-inv-row-right">
                              <strong className="profile-inv-amount" style={{ color: 'var(--orange)' }}>{money(inv.grandTotal)}</strong>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* Quick link to full invoices page */}
                {invoices.length > 0 && (
                  <Link
                    to="/invoices"
                    className="profile-inv-more"
                    onClick={() => setProfileOpen(false)}
                  >
                    View all invoices →
                  </Link>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </aside>
  );
}
