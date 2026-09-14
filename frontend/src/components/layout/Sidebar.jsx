import { Bell, LogOut, Sparkles, X, User, Mail, Shield } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { navigation } from './navigation';
import Modal from '../common/Modal';

export default function Sidebar({ user, open, onClose, onLogout }) {
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const visible = navigation.filter((item) => !item.roles || item.roles.includes(user.role));
  
  return <aside className={open ? 'sidebar open' : 'sidebar'}>
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
      <Modal title="User Profile" onClose={() => setProfileOpen(false)}>
        <div className="profile-modal">
          <div className="profile-avatar">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="profile-info">
            <div className="profile-item">
              <User size={16} />
              <div>
                <small>Full Name</small>
                <p>{user.name}</p>
              </div>
            </div>
            <div className="profile-item">
              <Mail size={16} />
              <div>
                <small>Email Address</small>
                <p>{user.email || 'Not provided'}</p>
              </div>
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
      </Modal>
    )}
  </aside>;
}
