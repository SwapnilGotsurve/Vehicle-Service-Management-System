import { Bell, LogOut, Sparkles, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { navigation } from './navigation';

export default function Sidebar({ user, open, onClose, onLogout }) {
  const location = useLocation();
  const visible = navigation.filter((item) => !item.roles || item.roles.includes(user.role));
  return <aside className={open ? 'sidebar open' : 'sidebar'}><div className="brand"><div className="brand-mark">F<span>/</span></div><div><b>Forge</b><small>{user.role} service desk</small></div><button className="icon-button close-menu" onClick={onClose}><X size={19} /></button></div><nav>{visible.map(({ label, icon: Icon, path }) => <Link key={path} className={location.pathname === path ? 'active' : ''} onClick={onClose} to={path}><Icon size={18} />{label}</Link>)}</nav><div className="sidebar-bottom"><Link to="/notifications"><Bell size={18} />Notifications</Link><button className="logout sidebar-logout" onClick={onLogout}><LogOut size={16} />Log out</button><div className="support-box"><Sparkles size={17} /><span><b>Need a hand?</b><small>Support is online</small></span></div></div></aside>;
}
