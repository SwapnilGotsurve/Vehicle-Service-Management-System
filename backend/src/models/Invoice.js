import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  type: { type: String, enum: ['service', 'part', 'labor', 'other'], default: 'service' },
  name: { type: String, required: true },
  quantity: { type: Number, default: 1, min: 1 },
  price: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  items: [invoiceItemSchema],
  subtotal: Number,
  discount: { type: Number, default: 0, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  grandTotal: Number,
  notes: { type: String, default: '' },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Partially Paid', 'Refunded'], default: 'Pending' },
  paymentMethod: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

invoiceSchema.index({ customer: 1, createdAt: -1 });
invoiceSchema.index({ booking: 1 });
export default mongoose.model('Invoice', invoiceSchema);
