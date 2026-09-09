import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['Pending', 'Paid', 'Partially Paid', 'Refunded'], default: 'Pending' },
  method: { type: String, enum: ['Cash', 'Card', 'UPI', 'Online', 'Other'], default: 'Cash' },
  reference: String,
}, { timestamps: true });

paymentSchema.index({ invoice: 1, createdAt: -1 });
export default mongoose.model('Payment', paymentSchema);
