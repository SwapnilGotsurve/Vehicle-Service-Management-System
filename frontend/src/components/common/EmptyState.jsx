import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmptyState({ icon: Icon, text, action, to }) {
  return <div className="empty"><Icon size={28} /><strong>{text}</strong>{action && <Link to={to} className="link">{action} <ChevronRight size={14} /></Link>}</div>;
}
