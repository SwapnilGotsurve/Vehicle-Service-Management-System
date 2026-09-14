import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
// Ensure uploads sub-folders exist at startup
['before', 'after'].forEach((sub) => {
  const dir = path.join(UPLOADS_DIR, sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer — store photos on disk under uploads/before|after/
const photoStorage = multer.diskStorage({
  destination(req, file, cb) {
    const phase = req.params.phase === 'after' ? 'after' : 'before';
    cb(null, path.join(UPLOADS_DIR, phase));
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const photoFilter = (req, file, cb) => {
  if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG, PNG, WEBP and GIF images are allowed'), false);
};
const uploadPhoto = multer({ storage: photoStorage, fileFilter: photoFilter, limits: { fileSize: 8 * 1024 * 1024, files: 10 } });

const app = express();

// ── Static uploads BEFORE helmet so we can set the correct CORP header ──────
// helmet sets Cross-Origin-Resource-Policy: same-origin by default which blocks
// the browser from loading images from a different port (e.g. :5000 vs :5174).
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(UPLOADS_DIR));

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
const invoicePopulate = [
  { path: 'customer', select: 'name email phone address' },
  { path: 'vehicle' },
  { path: 'createdBy', select: 'name role' },
  { path: 'booking', populate: [{ path: 'service', select: 'name price category' }, { path: 'customer', select: 'name email' }] },
];
function invoiceTotals(rawItems, discount, tax) {
  const items = (rawItems || []).map((item) => {
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const price = Math.max(0, Number(item.price) || 0);
    return { type: ['service', 'part', 'labor', 'other'].includes(item.type) ? item.type : 'service', name: String(item.name || '').trim(), quantity, price, total: Number((quantity * price).toFixed(2)) };
  }).filter((item) => item.name);
  const subtotal = Number(items.reduce((sum, item) => sum + item.total, 0).toFixed(2));
  const safeDiscount = Math.max(0, Number(discount) || 0);
  const safeTax = Math.max(0, Number(tax) || 0);
  return { items, subtotal, discount: safeDiscount, tax: safeTax, grandTotal: Number(Math.max(0, subtotal - safeDiscount + safeTax).toFixed(2)) };
}
function canViewInvoice(user, invoice) {
  if (!invoice) return false;
  if (user.role === 'customer') return String(invoice.customer?._id || invoice.customer) === String(user._id);
  return ['admin', 'staff'].includes(user.role);
}
async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments({ invoiceNumber: new RegExp(`^INV-${year}-`) });
  return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
}

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
app.patch('/api/bookings/:id/status', protect, allow('admin', 'staff', 'mechanic'), asyncRoute(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  if (req.user.role === 'mechanic' && String(booking.assignedMechanic) !== String(req.user._id))
    return res.status(403).json({ success: false, message: 'This job is not assigned to you' });
  booking.status = req.body.status;
  booking.statusHistory.push({ status: req.body.status, changedBy: req.user._id, note: req.body.note });
  await booking.save();
  // Auto-create invoice when booking is marked Completed
  if (req.body.status === 'Completed') {
    await autoCreateInvoice(booking, req.user._id);
  }
  await Notification.create({ user: booking.customer, title: 'Booking updated', message: `Your booking is now ${booking.status}.`, type: 'booking' });
  ok(res, booking, 'Booking status updated');
}));
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
  if (role === 'admin' && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Only admins can create admin accounts' });
  if (await User.findOne({ email })) return res.status(409).json({ success: false, message: 'Email is already registered' });
  ok(res, await User.create({ name, email, password, role, specialization }), 'Team member created');
}));
app.patch('/api/users/:id/status', protect, allow('admin', 'staff'), asyncRoute(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role === 'admin' && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Only admins can manage admin accounts' });
  ok(res, await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true }).select('name email role isActive'), 'Team member status updated');
}));
app.get('/api/parts', protect, allow('admin', 'staff', 'mechanic'), asyncRoute(async (req, res) => ok(res, await Part.find().sort('name'))));
app.post('/api/parts', protect, allow('admin', 'staff'), asyncRoute(async (req, res) => ok(res, await Part.create(req.body), 'Part added')));
app.put('/api/parts/:id', protect, allow('admin', 'staff'), asyncRoute(async (req, res) => ok(res, await Part.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }), 'Part updated')));
app.patch('/api/parts/:id/stock', protect, allow('admin', 'staff', 'mechanic'), asyncRoute(async (req, res) => { const amount = Number(req.body.amount); if (!Number.isFinite(amount) || amount === 0) return res.status(422).json({ success: false, message: 'Stock amount must be a non-zero number' }); const part = await Part.findOneAndUpdate({ _id: req.params.id, ...(amount < 0 ? { quantity: { $gte: Math.abs(amount) } } : {}) }, { $inc: { quantity: amount } }, { new: true }); if (!part) return res.status(409).json({ success: false, message: 'Insufficient stock or part not found' }); ok(res, part, 'Stock updated'); }));
// ── Shared helper: auto-create invoice from a completed booking ───────────────
async function autoCreateInvoice(booking, triggeredBy) {
  // Don't double-create
  if (await Invoice.findOne({ booking: booking._id })) return null;
  // Need a fully populated booking
  const fullBooking = await Booking.findById(booking._id).populate('customer vehicle service');
  if (!fullBooking?.customer || !fullBooking?.vehicle) return null;
  const seededItems = fullBooking.service
    ? [{ type: 'service', name: fullBooking.service.name, quantity: 1, price: fullBooking.service.price }]
    : [];
  if (!seededItems.length) return null;
  const totals = invoiceTotals(seededItems, 0, 0);
  const invoice = await Invoice.create({
    invoiceNumber: await nextInvoiceNumber(),
    booking: fullBooking._id,
    customer: fullBooking.customer._id,
    vehicle: fullBooking.vehicle._id,
    ...totals,
    notes: '',
    paymentStatus: 'Pending',
    paymentMethod: '',
    createdBy: triggeredBy,
  });
  await Notification.create({
    user: fullBooking.customer._id,
    title: 'Invoice ready',
    message: `Your service is complete. Invoice ${invoice.invoiceNumber} for ₹${totals.grandTotal.toLocaleString('en-IN')} is ready to view and download.`,
    type: 'invoice',
  });
  return invoice;
}
const srPopulate = [
  { path: 'vehicle' },
  { path: 'customer', select: 'name email phone' },
  { path: 'mechanic', select: 'name email phone specialization' },
  { path: 'booking', populate: [{ path: 'service', select: 'name price category' }, { path: 'assignedMechanic', select: 'name specialization' }] },
  { path: 'partsUsed.part', select: 'name partNumber' },
];

app.get('/api/service-records', protect, asyncRoute(async (req, res) => {
  const filter =
    req.user.role === 'customer' ? { customer: req.user._id } :
    req.user.role === 'mechanic'  ? { mechanic: req.user._id }  : {};
  ok(res, await ServiceRecord.find(filter).populate(srPopulate).sort('-createdAt'));
}));

// GET single service record by booking id (any authenticated user with access)
app.get('/api/service-records/booking/:bookingId', protect, asyncRoute(async (req, res) => {
  const record = await ServiceRecord.findOne({ booking: req.params.bookingId }).populate(srPopulate);
  if (!record) return res.status(404).json({ success: false, message: 'No service record found for this booking' });
  // Customers can only see their own records
  if (req.user.role === 'customer' && String(record.customer?._id || record.customer) !== String(req.user._id))
    return res.status(403).json({ success: false, message: 'Access denied' });
  ok(res, record);
}));

app.post('/api/service-records', protect, allow('admin', 'staff', 'mechanic'), asyncRoute(async (req, res) => {
  // Prevent duplicate records
  const existing = await ServiceRecord.findOne({ booking: req.body.booking });
  if (existing) return res.status(409).json({ success: false, message: 'A service record already exists for this booking' });
  const booking = await Booking.findById(req.body.booking);
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  const mechanicId = req.user.role === 'mechanic' ? req.user._id : (req.body.mechanic || booking.assignedMechanic);
  const record = await ServiceRecord.create({
    ...req.body,
    mechanic: mechanicId,
    customer: booking.customer,
    vehicle: booking.vehicle,
    serviceStartTime: req.body.serviceStartTime || new Date(),
  });
  await Booking.findByIdAndUpdate(req.body.booking, {
    status: 'In Progress',
    $push: { statusHistory: { status: 'In Progress', changedBy: req.user._id, note: 'Service record created' } },
  });
  ok(res, await ServiceRecord.findById(record._id).populate(srPopulate), 'Service record created');
}));

// PATCH — mechanic updates notes / work performed / mark complete
app.patch('/api/service-records/:id', protect, allow('admin', 'staff', 'mechanic'), asyncRoute(async (req, res) => {
  const record = await ServiceRecord.findById(req.params.id);
  if (!record) return res.status(404).json({ success: false, message: 'Service record not found' });
  if (req.user.role === 'mechanic' && String(record.mechanic) !== String(req.user._id))
    return res.status(403).json({ success: false, message: 'This record is not assigned to you' });

  const { workPerformed, mechanicNotes, recommendations, partsUsed, additionalServices, serviceEndTime, completedAt } = req.body;
  if (workPerformed   !== undefined) record.workPerformed   = workPerformed;
  if (mechanicNotes   !== undefined) record.mechanicNotes   = mechanicNotes;
  if (recommendations !== undefined) record.recommendations = recommendations;
  if (partsUsed       !== undefined) record.partsUsed       = partsUsed;
  if (additionalServices !== undefined) record.additionalServices = additionalServices;
  if (serviceEndTime  !== undefined) record.serviceEndTime  = serviceEndTime;
  if (completedAt     !== undefined) {
    record.completedAt = completedAt;
    // Auto-mark booking as Completed
    const completedBooking = await Booking.findByIdAndUpdate(record.booking, {
      status: 'Completed',
      $push: { statusHistory: { status: 'Completed', changedBy: req.user._id, note: 'Work completed by mechanic' } },
    });
    // Auto-generate invoice so the customer sees it immediately
    await autoCreateInvoice(completedBooking || { _id: record.booking }, req.user._id);
    await Notification.create({
      user: record.customer,
      title: 'Service completed',
      message: 'Your vehicle service has been completed. Check the before & after photos and your invoice in the app.',
      type: 'booking',
    });
  }
  await record.save();
  ok(res, await ServiceRecord.findById(record._id).populate(srPopulate), 'Record updated');
}));

// POST — upload before or after photos  (phase = 'before' | 'after')
app.post(
  '/api/service-records/:id/photos/:phase',
  protect,
  allow('admin', 'staff', 'mechanic'),
  uploadPhoto.array('photos', 10),
  asyncRoute(async (req, res) => {
    const { id, phase } = req.params;
    if (!['before', 'after'].includes(phase))
      return res.status(400).json({ success: false, message: 'Phase must be before or after' });

    const record = await ServiceRecord.findById(id);
    if (!record) return res.status(404).json({ success: false, message: 'Service record not found' });
    if (req.user.role === 'mechanic' && String(record.mechanic) !== String(req.user._id))
      return res.status(403).json({ success: false, message: 'This record is not assigned to you' });
    if (!req.files?.length)
      return res.status(422).json({ success: false, message: 'No photos received' });

    const captions = Array.isArray(req.body.captions) ? req.body.captions : [req.body.captions || ''];
    const newPhotos = req.files.map((file, i) => ({
      url: `/uploads/${phase}/${file.filename}`,
      caption: captions[i] || '',
    }));

    const field = phase === 'before' ? 'beforePhotos' : 'afterPhotos';
    record[field].push(...newPhotos);
    await record.save();
    ok(res, await ServiceRecord.findById(record._id).populate(srPopulate), `${phase} photos uploaded`);
  }),
);

// DELETE a single photo
app.delete('/api/service-records/:id/photos/:phase/:index', protect, allow('admin', 'staff', 'mechanic'), asyncRoute(async (req, res) => {
  const { id, phase, index } = req.params;
  if (!['before', 'after'].includes(phase)) return res.status(400).json({ success: false, message: 'Phase must be before or after' });
  const record = await ServiceRecord.findById(id);
  if (!record) return res.status(404).json({ success: false, message: 'Service record not found' });
  if (req.user.role === 'mechanic' && String(record.mechanic) !== String(req.user._id))
    return res.status(403).json({ success: false, message: 'This record is not assigned to you' });
  const field = phase === 'before' ? 'beforePhotos' : 'afterPhotos';
  const idx = Number(index);
  if (idx < 0 || idx >= record[field].length) return res.status(404).json({ success: false, message: 'Photo not found' });
  // Delete file from disk
  const filePath = path.join(UPLOADS_DIR, record[field][idx].url.replace('/uploads/', '').replace(/\//g, path.sep));
  fs.unlink(filePath, () => {}); // non-blocking, ignore errors if already gone
  record[field].splice(idx, 1);
  await record.save();
  ok(res, await ServiceRecord.findById(record._id).populate(srPopulate), 'Photo deleted');
}));
app.get('/api/invoices', protect, asyncRoute(async (req, res) => {
  if (!['customer', 'admin', 'staff'].includes(req.user.role))
    return res.status(403).json({ success: false, message: 'You do not have access to invoices' });
  const filter = req.user.role === 'customer' ? { customer: req.user._id } : {};
  ok(res, await Invoice.find(filter).populate(invoicePopulate).sort('-createdAt'));
}));

// ── MUST be before /api/invoices/:id so Express doesn't treat 'analytics' as an id ──
// Admin invoice analytics
app.get('/api/invoices/analytics/summary', protect, allow('admin'), asyncRoute(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [overall, thisMonth, lastMonth, thisYear, byPaymentMethod, byStatus, monthlyTrend, recentByCreator] = await Promise.all([
    // Overall totals
    Invoice.aggregate([
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$grandTotal' },
        totalPaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$grandTotal', 0] } },
        totalPending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Pending'] }, '$grandTotal', 0] } },
        totalPartial: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Partially Paid'] }, '$grandTotal', 0] } },
        totalDiscount: { $sum: '$discount' },
        totalTax: { $sum: '$tax' },
        count: { $sum: 1 },
        paidCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, 1, 0] } },
        pendingCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Pending'] }, 1, 0] } },
      }}
    ]),
    // This month
    Invoice.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, revenue: { $sum: '$grandTotal' }, count: { $sum: 1 }, paid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$grandTotal', 0] } } } }
    ]),
    // Last month
    Invoice.aggregate([
      { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
      { $group: { _id: null, revenue: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
    ]),
    // This year
    Invoice.aggregate([
      { $match: { createdAt: { $gte: startOfYear } } },
      { $group: { _id: null, revenue: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
    ]),
    // By payment method (paid invoices only)
    Invoice.aggregate([
      { $match: { paymentStatus: 'Paid', paymentMethod: { $ne: '' } } },
      { $group: { _id: '$paymentMethod', total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]),
    // By payment status
    Invoice.aggregate([
      { $group: { _id: '$paymentStatus', total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]),
    // Monthly trend — last 6 months
    Invoice.aggregate([
      { $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        revenue: { $sum: '$grandTotal' },
        paid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$grandTotal', 0] } },
        count: { $sum: 1 }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),
    // Recent invoices with creator info
    Invoice.find({}).populate(invoicePopulate).sort('-createdAt').limit(10)
  ]);

  // Growth vs last month
  const thisMonthRevenue = thisMonth[0]?.revenue || 0;
  const lastMonthRevenue = lastMonth[0]?.revenue || 0;
  const growth = lastMonthRevenue === 0 ? null : Number((((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1));

  ok(res, {
    overall: overall[0] || { totalRevenue: 0, totalPaid: 0, totalPending: 0, totalPartial: 0, totalDiscount: 0, totalTax: 0, count: 0, paidCount: 0, pendingCount: 0 },
    thisMonth: { revenue: thisMonthRevenue, count: thisMonth[0]?.count || 0, paid: thisMonth[0]?.paid || 0 },
    lastMonth: { revenue: lastMonthRevenue, count: lastMonth[0]?.count || 0 },
    thisYear: { revenue: thisYear[0]?.revenue || 0, count: thisYear[0]?.count || 0 },
    growth,
    byPaymentMethod,
    byStatus,
    monthlyTrend,
    recentInvoices: recentByCreator,
  });
}));

// ── These must come AFTER /analytics/summary to avoid param shadowing ──────
app.get('/api/invoices/:id', protect, asyncRoute(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate(invoicePopulate);
  if (!invoice || !canViewInvoice(req.user, invoice))
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  ok(res, invoice);
}));

app.post('/api/invoices', protect, allow('admin', 'staff'), asyncRoute(async (req, res) => {
  const booking = await Booking.findById(req.body.booking).populate('customer vehicle service');
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  if (['Cancelled', 'Rejected'].includes(booking.status))
    return res.status(422).json({ success: false, message: 'Cannot invoice a cancelled or rejected booking' });
  if (await Invoice.findOne({ booking: booking._id }))
    return res.status(409).json({ success: false, message: 'An invoice already exists for this booking' });
  const seededItems = req.body.items?.length
    ? req.body.items
    : booking.service ? [{ type: 'service', name: booking.service.name, quantity: 1, price: booking.service.price }] : [];
  const totals = invoiceTotals(seededItems, req.body.discount, req.body.tax);
  if (!totals.items.length)
    return res.status(422).json({ success: false, message: 'Add at least one service or line item' });
  const invoice = await Invoice.create({
    invoiceNumber: await nextInvoiceNumber(),
    booking: booking._id,
    customer: booking.customer._id,
    vehicle: booking.vehicle._id,
    ...totals,
    notes: req.body.notes || '',
    paymentStatus: req.body.paymentStatus || 'Pending',
    paymentMethod: req.body.paymentMethod || '',
    createdBy: req.user._id,
  });
  await Notification.create({
    user: booking.customer._id,
    title: 'Invoice ready',
    message: `Invoice ${invoice.invoiceNumber} for ₹${totals.grandTotal.toLocaleString('en-IN')} is ready to view and download.`,
    type: 'invoice',
  });
  ok(res, await Invoice.findById(invoice._id).populate(invoicePopulate), 'Invoice generated');
}));

app.put('/api/invoices/:id', protect, allow('admin', 'staff'), asyncRoute(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
  const totals = invoiceTotals(req.body.items, req.body.discount, req.body.tax);
  if (!totals.items.length)
    return res.status(422).json({ success: false, message: 'Add at least one service or line item' });
  invoice.set({
    ...totals,
    notes: req.body.notes ?? invoice.notes,
    paymentStatus: req.body.paymentStatus || invoice.paymentStatus,
    paymentMethod: req.body.paymentMethod ?? invoice.paymentMethod,
  });
  await invoice.save();
  ok(res, await Invoice.findById(invoice._id).populate(invoicePopulate), 'Invoice updated');
}));

app.delete('/api/invoices/:id', protect, allow('admin', 'staff'), asyncRoute(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
  if (invoice.paymentStatus === 'Paid' && req.user.role !== 'admin')
    return res.status(422).json({ success: false, message: 'Paid invoices can only be removed by an admin' });
  await Payment.deleteMany({ invoice: invoice._id });
  await invoice.deleteOne();
  ok(res, null, 'Invoice deleted');
}));

app.patch('/api/invoices/:id/payment', protect, allow('admin', 'staff'), asyncRoute(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
  if (req.body.paymentStatus !== undefined) invoice.paymentStatus = req.body.paymentStatus;
  if (req.body.paymentMethod !== undefined) invoice.paymentMethod = req.body.paymentMethod;
  await invoice.save();
  if (invoice.paymentStatus === 'Paid') {
    await Notification.create({
      user: invoice.customer,
      title: 'Payment received',
      message: `Payment for invoice ${invoice.invoiceNumber} (₹${invoice.grandTotal.toLocaleString('en-IN')}) has been confirmed. Thank you!`,
      type: 'invoice',
    });
  }
  ok(res, await Invoice.findById(invoice._id).populate(invoicePopulate), 'Payment updated');
}));

// Customer self-payment: customer confirms they have paid at the workshop
app.patch('/api/invoices/:id/customer-payment', protect, asyncRoute(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate('customer');
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
  // Customers can only pay their own invoices
  if (req.user.role === 'customer' && String(invoice.customer?._id || invoice.customer) !== String(req.user._id))
    return res.status(403).json({ success: false, message: 'You can only pay your own invoices' });
  if (invoice.paymentStatus === 'Paid')
    return res.status(422).json({ success: false, message: 'This invoice is already marked as paid' });
  invoice.paymentStatus = 'Paid';
  invoice.paymentMethod = req.body.paymentMethod || 'Cash';
  await invoice.save();
  // Notify admin/staff that customer confirmed payment
  const staffList = await User.find({ role: { $in: ['admin', 'staff'] }, isActive: true }).select('_id');
  await Promise.all(staffList.map((s) =>
    Notification.create({
      user: s._id,
      title: 'Payment received',
      message: `Customer ${req.user.name} paid invoice ${invoice.invoiceNumber} (₹${invoice.grandTotal.toLocaleString('en-IN')}) via ${invoice.paymentMethod}.`,
      type: 'invoice',
    })
  ));
  ok(res, await Invoice.findById(invoice._id).populate(invoicePopulate), 'Payment confirmed. Thank you!');
}));
// Staff/admin can call this to fix any historical gaps
app.post('/api/invoices/backfill', protect, allow('admin', 'staff'), asyncRoute(async (req, res) => {
  const completedBookings = await Booking.find({ status: 'Completed' });
  let created = 0;
  for (const booking of completedBookings) {
    const inv = await autoCreateInvoice(booking, req.user._id);
    if (inv) created++;
  }
  ok(res, { created }, `Backfilled ${created} invoice(s)`);
}));
app.post('/api/payments', protect, allow('admin', 'staff'), asyncRoute(async (req, res) => { const invoice = await Invoice.findById(req.body.invoice); if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' }); const payment = await Payment.create({ ...req.body, booking: invoice.booking, customer: invoice.customer }); await Invoice.findByIdAndUpdate(invoice._id, { paymentStatus: req.body.status || 'Paid', paymentMethod: req.body.method }); ok(res, payment, 'Payment recorded'); }));
app.get('/api/notifications', protect, asyncRoute(async (req, res) => ok(res, await Notification.find({ user: req.user._id }).sort('-createdAt').limit(30))));
app.patch('/api/notifications/read-all', protect, asyncRoute(async (req, res) => { await Notification.updateMany({ user: req.user._id }, { isRead: true }); ok(res, null, 'Notifications marked as read'); }));
app.get('/api/dashboard/:role', protect, asyncRoute(async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const customerScope = req.user.role === 'customer' ? { customer: req.user._id } : {};
  const mechanicScope = req.user.role === 'mechanic' ? { assignedMechanic: req.user._id } : {};
  const bookingScope = { ...customerScope, ...mechanicScope };
  const srScope = req.user.role === 'customer' ? { customer: req.user._id } : req.user.role === 'mechanic' ? { mechanic: req.user._id } : {};

  const srPopulateFields = [
    { path: 'vehicle', select: 'brand model registrationNumber year color' },
    { path: 'customer', select: 'name email phone' },
    { path: 'mechanic', select: 'name specialization phone' },
    { path: 'booking', populate: { path: 'service', select: 'name price category' } },
  ];

  const [
    vehicles, bookings, activeServices, mechanics,
    pending, confirmed, active, completed,
    todayBookings, completedToday, customers,
    invoices, lowStock, statusBreakdown, recentBookings,
    recentServiceRecords, invoiceHistory,
  ] = await Promise.all([
    Vehicle.countDocuments(req.user.role === 'customer' ? { owner: req.user._id, isActive: true } : {}),
    Booking.countDocuments(bookingScope),
    Service.countDocuments({ status: 'Active' }),
    User.countDocuments({ role: 'mechanic', isActive: true }),
    Booking.countDocuments({ ...bookingScope, status: 'Pending' }),
    Booking.countDocuments({ ...bookingScope, status: 'Confirmed' }),
    Booking.countDocuments({ ...bookingScope, status: { $in: ['Assigned', 'Inspection', 'In Progress', 'Waiting for Parts'] } }),
    Booking.countDocuments({ ...bookingScope, status: 'Completed' }),
    Booking.countDocuments({ ...bookingScope, bookingDate: { $gte: today, $lt: tomorrow }, status: { $nin: ['Cancelled', 'Rejected'] } }),
    Booking.countDocuments({ status: 'Completed', updatedAt: { $gte: today, $lt: tomorrow } }),
    User.countDocuments({ role: 'customer', isActive: true }),
    Invoice.aggregate([
      { $match: req.user.role === 'customer' ? { customer: req.user._id } : {} },
      { $group: { _id: null, revenue: { $sum: '$grandTotal' }, pending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Pending'] }, 1, 0] } }, paid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$grandTotal', 0] } } } },
    ]),
    Part.countDocuments({ $expr: { $lte: ['$quantity', '$minimumStock'] } }),
    Booking.aggregate([{ $match: bookingScope }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Booking.find(bookingScope)
      .populate('customer', 'name')
      .populate('vehicle', 'registrationNumber brand model')
      .populate('service', 'name price')
      .populate('assignedMechanic', 'name specialization')
      .sort({ bookingDate: 1 }).limit(6),
    // Service records with full detail for history section
    ServiceRecord.find(srScope)
      .populate(srPopulateFields)
      .sort('-createdAt')
      .limit(8),
    // Invoice history per customer or all for admin/staff
    req.user.role === 'customer'
      ? Invoice.find({ customer: req.user._id }).populate('booking', 'bookingDate').populate('vehicle', 'brand model registrationNumber').sort('-createdAt').limit(5)
      : Invoice.find({ paymentStatus: 'Pending' }).populate('customer', 'name').populate('vehicle', 'brand model registrationNumber').sort('-createdAt').limit(6),
  ]);

  const dashboard = {
    role: req.user.role,
    vehicles, bookings, activeServices, mechanics,
    pending, confirmed, active, completed,
    todayBookings, completedToday, customers,
    revenue: invoices[0]?.revenue || 0,
    revenueCollected: invoices[0]?.paid || 0,
    pendingPayments: invoices[0]?.pending || 0,
    lowStock, statusBreakdown, recentBookings,
    recentServiceRecords,
    invoiceHistory,
  };
  dashboard.headline = {
    customer: 'Your service overview',
    admin:    'The whole service center, at a glance',
    staff:    "Today's service desk",
    mechanic: 'Your assigned workshop',
  }[req.user.role];
  ok(res, dashboard);
}));

app.use(notFound); app.use(errorHandler);
export default app;
