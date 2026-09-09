import { Activity, CalendarDays, CarFront, ClipboardList, LayoutDashboard, Package, UserRound, Wrench } from 'lucide-react';

export const navigation = [
  { label: 'Overview', icon: LayoutDashboard, path: '/' },
  { label: 'My vehicles', icon: CarFront, path: '/vehicles', roles: ['customer', 'admin', 'staff'] },
  { label: 'Book service', icon: CalendarDays, path: '/book', roles: ['customer', 'admin', 'staff'] },
  { label: 'Bookings', icon: ClipboardList, path: '/bookings', roles: ['customer', 'admin', 'staff', 'mechanic'] },
  { label: 'Service history', icon: Activity, path: '/history', roles: ['customer', 'admin', 'staff', 'mechanic'] },
  { label: 'Invoices', icon: Package, path: '/invoices', roles: ['customer', 'admin', 'staff'] },
  { label: 'Team', icon: UserRound, path: '/team', roles: ['admin', 'staff'] },
  { label: 'Parts & inventory', icon: Package, path: '/parts', roles: ['admin', 'staff', 'mechanic'] },
  { label: 'Services', icon: Wrench, path: '/services', roles: ['admin'] },
];
