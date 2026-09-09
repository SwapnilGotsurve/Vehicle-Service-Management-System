import { Bell, LogOut, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { navigation } from '../components/layout/navigation';
import { useState } from 'react';

export default function AppLayout({ user, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const visible = navigation.filter((item) => !item.roles || item.roles.includes(user.role));
  const pageTitle = location.pathname === '/' ? `Good to see you, ${user.name.split(' ')[0]}` : visible.find((item) => item.path === location.pathname)?.label || 'Service desk';
  return <div className="app-shell"><Sidebar user={user} open={open} onClose={() => setOpen(false)} onLogout={onLogout} /><main className="content"><header className="topbar"><button className="icon-button menu-button" onClick={() => setOpen(true)}><Menu size={21} /></button><div><p className="eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p><h3>{pageTitle}</h3></div><div className="top-actions"><button className="icon-button" onClick={() => navigate('/notifications')}><Bell size={19} /><i /></button><div className="avatar">{user.name.slice(0, 1)}</div><button className="logout" onClick={onLogout}><LogOut size={16} />Log out</button></div></header>{children}</main></div>;
}
