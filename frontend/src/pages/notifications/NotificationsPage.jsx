import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../../api';
import EmptyState from '../../components/common/EmptyState';

export default function NotificationsPage() { const [items, setItems] = useState([]); useEffect(() => { api('/notifications').then(setItems).catch(console.error); }, []); return <div className="page"><div className="page-heading"><div><p className="eyebrow orange">Updates</p><h1>Notifications</h1></div></div><div className="panel">{items.length ? items.map((item) => <div className="record-row" key={item._id}><div className="record-icon"><Bell size={18} /></div><div><strong>{item.title}</strong><span>{item.message}</span></div></div>) : <EmptyState icon={Bell} text="You’re all caught up" />}</div></div>; }
