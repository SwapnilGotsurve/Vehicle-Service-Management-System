import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import Vehicle from './models/Vehicle.js';
import Service from './models/Service.js';
import Booking from './models/Booking.js';
import Part from './models/Part.js';
import ServiceRecord from './models/ServiceRecord.js';
import Invoice from './models/Invoice.js';
import Payment from './models/Payment.js';
import Notification from './models/Notification.js';
import { protect, allow } from './middleware/auth.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();
app.use(helmet());
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((origin) => origin.trim());
const isAllowedOrigin = (origin) => !origin || allowedOrigins.includes(origin) || /^https?:\/\/localhost:\d+$/.test(origin);
app.use(cors({ origin: (origin, callback) => callback(null, isAllowedOrigin(origin)) }));
app.use(express.json());
app.use(morgan('dev'));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
const ok = (res, data, message = '') => res.json({ success: true, message, data });
const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

app.get('/api/health', (req, res) => ok(res, { service: 'VSMS API', status: 'operational' }));
app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const { name, email, password, phone, address } = req.body;
  if (!name || !email || !password || password.length < 8) return res.status(422).json({ success: false, message: 'Name, email and an 8+ character password are required' });
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) return res.status(422).json({ success: false, message: 'Password needs uppercase, lowercase and a number' });
  if (await User.findOne({ email })) return res.status(409).json({ success: false, message: 'Email is already registered' });
  const user = await User.create({ name, email, password, phone, address });
  ok(res, { user: { id: user._id, name: user.name, email: user.email, role: user.role }, token: tokenFor(user._id) }, 'Account created');
}));
app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(req.body.password))) return res.status(401).json({ success: false, message: 'Invalid email or password' });
  ok(res, { user: { id: user._id, name: user.name, email: user.email, role: user.role }, token: tokenFor(user._id) }, 'Welcome back');
}));
app.get('/api/auth/me', protect, (req, res) => ok(res, req.user));

app.get('/api/vehicles', protect, asyncRoute(async (req, res) => ok(res, await Vehicle.find(req.user.role === 'customer' ? { owner: req.user._id, isActive: true } : {}).populate('owner', 'name email'))));
app.post('/api/vehicles', protect, asyncRoute(async (req, res) => ok(res, await Vehicle.create({ ...req.body, owner: req.user._id }), 'Vehicle added')));
app.put('/api/vehicles/:id', protect, asyncRoute(async (req, res) => { const vehicle = await Vehicle.findOneAndUpdate({ _id: req.params.id, ...(req.user.role === 'customer' ? { owner: req.user._id } : {}) }, req.body, { new: true, runValidators: true }); if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' }); ok(res, vehicle, 'Vehicle updated'); }));
app.delete('/api/vehicles/:id', protect, asyncRoute(async (req, res) => { await Vehicle.findOneAndUpdate({ _id: req.params.id, ...(req.user.role === 'customer' ? { owner: req.user._id } : {}) }, { isActive: false }); ok(res, null, 'Vehicle removed'); }));

app.get('/api/services', asyncRoute(async (req, res) => ok(res, await Service.find(req.query.all === 'true' ? {} : { status: 'Active' }).sort('name'))));
app.post('/api/services', protect, allow('admin'), asyncRoute(async (req, res) => ok(res, await Service.create(req.body), 'Service created')));
app.put('/api/services/:id', protect, allow('admin'), asyncRoute(async (req, res) => ok(res, await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }), 'Service updated')));

app.get('/api/bookings', protect, asyncRoute(async (req, res) => { const filter = req.user.role === 'customer' ? { customer: req.user._id } : req.user.role === 'mechanic' ? { assignedMechanic: req.user._id } : {}; ok(res, await Booking.find(filter).populate('customer', 'name email').populate('vehicle').populate('service').populate('assignedMechanic', 'name').sort('-bookingDate')); }));
app.get('/api/bookings/:id', protect, asyncRoute(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate(['customer', 'vehicle', 'service', 'assignedMechanic', 'assignedStaff']);
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  if (req.user.role === 'customer' && String(booking.customer._id) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'You do not have access to this booking' });
  ok(res, booking);
}));
app.post('/api/bookings', protect, asyncRoute(async (req, res) => {
  const { vehicle, service, bookingDate, timeSlot } = req.body;
  const ownedVehicle = await Vehicle.findOne({ _id: vehicle, owner: req.user._id, isActive: true });
  const activeService = await Service.findOne({ _id: service, status: 'Active' });
  if (!ownedVehicle) return res.status(422).json({ success: false, message: 'Select one of your active vehicles' });
  if (!activeService || new Date(bookingDate) < new Date(new Date().setHours(0, 0, 0, 0))) return res.status(422).json({ success: false, message: 'Choose an active service and a future date' });
  if (await Booking.findOne({ bookingDate: new Date(bookingDate), timeSlot, status: { $nin: ['Cancelled', 'Rejected'] } })) return res.status(409).json({ success: false, message: 'That appointment slot is already taken' });
  const booking = await Booking.create({ ...req.body, customer: req.user._id, estimatedCost: activeService.price, statusHistory: [{ status: 'Pending', changedBy: req.user._id }] });
  ok(res, await booking.populate(['vehicle', 'service']), 'Booking created');
}));
app.patch('/api/bookings/:id/status', protect, allow('admin', 'staff', 'mechanic'), asyncRoute(async (req, res) => { const booking = await Booking.findById(req.params.id); if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' }); if (req.user.role === 'mechanic' && String(booking.assignedMechanic) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'This job is not assigned to you' }); booking.status = req.body.status; booking.statusHistory.push({ status: req.body.status, changedBy: req.user._id, note: req.body.note }); await booking.save(); await Notification.create({ user: booking.customer, title: 'Booking updated', message: `Your booking is now ${booking.status}.`, type: 'booking' }); ok(res, booking, 'Booking status updated'); }));
app.patch('/api/bookings/:id/assign-mechanic', protect, allow('admin', 'staff'), asyncRoute(async (req, res) => { const booking = await Booking.findByIdAndUpdate(req.params.id, { assignedMechanic: req.body.mechanicId, status: 'Assigned', $push: { statusHistory: { status: 'Assigned', changedBy: req.user._id } } }, { new: true }).populate('assignedMechanic', 'name'); if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' }); ok(res, booking, 'Mechanic assigned'); }));
app.patch('/api/bookings/:id/assign-staff', protect, allow('admin'), asyncRoute(async (req, res) => { const existing = await Booking.findById(req.params.id); if (!existing) return res.status(404).json({ success: false, message: 'Booking not found' }); existing.assignedStaff = req.body.staffId; existing.statusHistory.push({ status: existing.status, changedBy: req.user._id, note: 'Staff advisor assigned' }); await existing.save(); ok(res, await existing.populate('assignedStaff', 'name'), 'Staff advisor assigned'); }));

// Get available time slots for a specific date
app.get('/api/bookings/available-slots/:date', protect, asyncRoute(async (req, res) => {
  const bookingDate = new Date(req.params.date);
  bookingDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(bookingDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const allTimeSlots = ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'];
  const bookedSlots = await Booking.find({ bookingDate: { $gte: bookingDate, $lt: nextDay }, status: { $nin: ['Cancelled', 'Rejected'] } }).select('timeSlot');
  const bookedTimes = bookedSlots.map(b => b.timeSlot);
  const availableSlots = allTimeSlots.filter(slot => !bookedTimes.includes(slot));
  ok(res, { date: req.params.date, availableSlots, bookedSlots: bookedTimes });
}));

// Cancel a booking
app.patch('/api/bookings/:id/cancel', protect, asyncRoute(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  if (req.user.role === 'customer' && String(booking.customer) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'You can only cancel your own bookings' });
  if (['Completed', 'Cancelled', 'Rejected'].includes(booking.status)) return res.status(422).json({ success: false, message: `Cannot cancel a ${booking.status.toLowerCase()} booking` });
  booking.status = 'Cancelled';
  booking.statusHistory.push({ status: 'Cancelled', changedBy: req.user._id, note: req.body.reason || 'Cancelled by customer' });
  await booking.save();
  await Notification.create({ user: booking.customer, title: 'Booking cancelled', message: `Your booking for ${booking.bookingDate.toLocaleDateString()} at ${booking.timeSlot} has been cancelled.`, type: 'booking' });
  ok(res, booking, 'Booking cancelled successfully');
}));

// Reschedule a booking
app.patch('/api/bookings/:id/reschedule', protect, asyncRoute(async (req, res) => {
  const { newDate, newTimeSlot } = req.body;
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  if (req.user.role === 'customer' && String(booking.customer) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'You can only reschedule your own bookings' });
  if (['Completed', 'Cancelled', 'Rejected', 'In Progress'].includes(booking.status)) return res.status(422).json({ success: false, message: `Cannot reschedule a ${booking.status.toLowerCase()} booking` });
  if (!newDate || !newTimeSlot) return res.status(422).json({ success: false, message: 'New date and time slot are required' });
  const newBookingDate = new Date(newDate);
  if (newBookingDate < new Date(new Date().setHours(0, 0, 0, 0))) return res.status(422).json({ success: false, message: 'Cannot reschedule to a past date' });
  if (await Booking.findOne({ bookingDate: newBookingDate, timeSlot: newTimeSlot, _id: { $ne: req.params.id }, status: { $nin: ['Cancelled', 'Rejected'] } })) return res.status(409).json({ success: false, message: 'That appointment slot is already taken' });
  const oldDate = booking.bookingDate;
  const oldSlot = booking.timeSlot;
  booking.bookingDate = newBookingDate;
  booking.timeSlot = newTimeSlot;
  booking.statusHistory.push({ status: booking.status, changedBy: req.user._id, note: `Rescheduled from ${oldDate.toLocaleDateString()} ${oldSlot} to ${newBookingDate.toLocaleDateString()} ${newTimeSlot}` });
  await booking.save();
  await Notification.create({ user: booking.customer, title: 'Booking rescheduled', message: `Your booking has been rescheduled to ${newBookingDate.toLocaleDateString()} at ${newTimeSlot}.`, type: 'booking' });
  ok(res, booking, 'Booking rescheduled successfully');
}));

app.get('/api/mechanics', protect, allow('admin', 'staff'), asyncRoute(async (req, res) => ok(res, await User.find({ role: 'mechanic', isActive: true }).select('name email phone specialization'))));
app.get('/api/users', protect, allow('admin', 'staff'), asyncRoute(async (req, res) => ok(res, await User.find({ role: { $ne: 'customer' } }).select('name email phone role specialization isActive').sort('role name'))));
app.post('/api/users', protect, allow('admin', 'staff'), asyncRoute(async (req, res) => {
  const { name, email, password, role, specialization } = req.body;
  if (!name || !email || !password) return res.status(422).json({ success: false, message: 'Name, email, and password are required' });
  if (password.length < 8) return res.status(422).json({ success: false, message: 'Password must be at least 8 characters' });
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) return res.status(422).json({ success: false, message: 'Password needs uppercase, lowercase and a number' });
  if (await User.findOne({ email })) return res.status(409).json({ success: false, message: 'Email is already registered' });
  ok(res, await User.create({ name, email, password, role, specialization }), 'Team member created');
}));
app.patch('/api/users/:id/status', protect, allow('admin'), asyncRoute(async (req, res) => ok(res, await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true }).select('name email role isActive'), 'Team member status updated')));
app.get('/api/parts', protect, allow('admin', 'staff', 'mechanic'), asyncRoute(async (req, res) => ok(res, await Part.find().sort('name'))));
app.post('/api/parts', protect, allow('admin', 'staff'), asyncRoute(async (req, res) => ok(res, await Part.create(req.body), 'Part added')));
app.put('/api/parts/:id', protect, allow('admin', 'staff'), asyncRoute(async (req, res) => ok(res, await Part.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }), 'Part updated')));
app.patch('/api/parts/:id/stock', protect, allow('admin', 'staff', 'mechanic'), asyncRoute(async (req, res) => { const amount = Number(req.body.amount); if (!Number.isFinite(amount) || amount === 0) return res.status(422).json({ success: false, message: 'Stock amount must be a non-zero number' }); const part = await Part.findOneAndUpdate({ _id: req.params.id, ...(amount < 0 ? { quantity: { $gte: Math.abs(amount) } } : {}) }, { $inc: { quantity: amount } }, { new: true }); if (!part) return res.status(409).json({ success: false, message: 'Insufficient stock or part not found' }); ok(res, part, 'Stock updated'); }));
app.get('/api/service-records', protect, asyncRoute(async (req, res) => ok(res, await ServiceRecord.find(req.user.role === 'customer' ? { customer: req.user._id } : req.user.role === 'mechanic' ? { mechanic: req.user._id } : {}).populate('vehicle booking mechanic').sort('-completedAt'))));
app.post('/api/service-records', protect, allow('admin', 'staff', 'mechanic'), asyncRoute(async (req, res) => { const record = await ServiceRecord.create({ ...req.body, mechanic: req.user.role === 'mechanic' ? req.user._id : req.body.mechanic }); await Booking.findByIdAndUpdate(req.body.booking, { status: 'Completed' }); ok(res, record, 'Service record created'); }));
app.get('/api/invoices', protect, asyncRoute(async (req, res) => ok(res, await Invoice.find(req.user.role === 'customer' ? { customer: req.user._id } : {}).populate('vehicle booking').sort('-createdAt'))));
app.post('/api/invoices', protect, allow('admin', 'staff'), asyncRoute(async (req, res) => { const booking = await Booking.findById(req.body.booking).populate('customer vehicle service'); if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' }); const items = (req.body.items || []).map((item) => ({ ...item, total: Number(item.quantity) * Number(item.price) })); const subtotal = items.reduce((sum, item) => sum + item.total, 0); const discount = Math.max(0, Number(req.body.discount) || 0); const tax = Math.max(0, Number(req.body.tax) || 0); const grandTotal = Math.max(0, subtotal - discount + tax); const invoiceNumber = `INV-${new Date().getFullYear()}-${String(await Invoice.countDocuments() + 1).padStart(5, '0')}`; ok(res, await Invoice.create({ invoiceNumber, booking: booking._id, customer: booking.customer._id, vehicle: booking.vehicle._id, items, subtotal, discount, tax, grandTotal }), 'Invoice generated'); }));
app.patch('/api/invoices/:id/payment', protect, allow('admin', 'staff'), asyncRoute(async (req, res) => ok(res, await Invoice.findByIdAndUpdate(req.params.id, { paymentStatus: req.body.paymentStatus, paymentMethod: req.body.paymentMethod }, { new: true }), 'Payment updated')));
app.get('/api/payments', protect, asyncRoute(async (req, res) => ok(res, await Payment.find(req.user.role === 'customer' ? { customer: req.user._id } : {}).populate('invoice booking').sort('-createdAt'))));
app.post('/api/payments', protect, allow('admin', 'staff'), asyncRoute(async (req, res) => { const invoice = await Invoice.findById(req.body.invoice); if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' }); const payment = await Payment.create({ ...req.body, booking: invoice.booking, customer: invoice.customer }); await Invoice.findByIdAndUpdate(invoice._id, { paymentStatus: req.body.status || 'Paid', paymentMethod: req.body.method }); ok(res, payment, 'Payment recorded'); }));
app.get('/api/notifications', protect, asyncRoute(async (req, res) => ok(res, await Notification.find({ user: req.user._id }).sort('-createdAt').limit(30))));
app.patch('/api/notifications/read-all', protect, asyncRoute(async (req, res) => { await Notification.updateMany({ user: req.user._id }, { isRead: true }); ok(res, null, 'Notifications marked as read'); }));
app.get('/api/dashboard/:role', protect, asyncRoute(async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const customerScope = req.user.role === 'customer' ? { customer: req.user._id } : {};
  const mechanicScope = req.user.role === 'mechanic' ? { assignedMechanic: req.user._id } : {};
  const bookingScope = { ...customerScope, ...mechanicScope };
  const [vehicles, bookings, activeServices, mechanics, pending, confirmed, active, completed, todayBookings, completedToday, customers, invoices, lowStock, statusBreakdown, recentBookings] = await Promise.all([
    Vehicle.countDocuments(req.user.role === 'customer' ? { owner: req.user._id, isActive: true } : {}),
    Booking.countDocuments(bookingScope), Service.countDocuments({ status: 'Active' }), User.countDocuments({ role: 'mechanic', isActive: true }),
    Booking.countDocuments({ ...bookingScope, status: 'Pending' }), Booking.countDocuments({ ...bookingScope, status: 'Confirmed' }), Booking.countDocuments({ ...bookingScope, status: { $in: ['Assigned', 'Inspection', 'In Progress', 'Waiting for Parts'] } }), Booking.countDocuments({ ...bookingScope, status: 'Completed' }),
    Booking.countDocuments({ ...bookingScope, bookingDate: { $gte: today, $lt: tomorrow }, status: { $nin: ['Cancelled', 'Rejected'] } }), Booking.countDocuments({ status: 'Completed', updatedAt: { $gte: today, $lt: tomorrow } }),
    User.countDocuments({ role: 'customer', isActive: true }),
    Invoice.aggregate([{ $match: req.user.role === 'customer' ? { customer: req.user._id } : {} }, { $group: { _id: null, revenue: { $sum: '$grandTotal' }, pending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Pending'] }, 1, 0] } } } }]),
    Part.countDocuments({ $expr: { $lte: ['$quantity', '$minimumStock'] } }), Booking.aggregate([{ $match: bookingScope }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Booking.find(bookingScope).populate('customer', 'name').populate('vehicle', 'registrationNumber brand model').populate('service', 'name price').populate('assignedMechanic', 'name').sort({ bookingDate: 1 }).limit(6)
  ]);
  const dashboard = { role: req.user.role, vehicles, bookings, activeServices, mechanics, pending, confirmed, active, completed, todayBookings, completedToday, customers, revenue: invoices[0]?.revenue || 0, pendingPayments: invoices[0]?.pending || 0, lowStock, statusBreakdown, recentBookings };
  dashboard.headline = { customer: 'Your service overview', admin: 'The whole service center, at a glance', staff: "Today's service desk", mechanic: 'Your assigned workshop' }[req.user.role];
  ok(res, dashboard);
}));

app.use(notFound); app.use(errorHandler);
export default app;
