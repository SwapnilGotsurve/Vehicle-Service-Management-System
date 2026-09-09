import mongoose from 'mongoose';
const bookingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  bookingDate: { type: Date, required: true }, timeSlot: { type: String, required: true },
  problemDescription: String, customerNotes: String, estimatedCost: Number,
  assignedMechanic: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Assigned', 'Inspection', 'In Progress', 'Waiting for Parts', 'Completed', 'Cancelled', 'Rejected'], default: 'Pending' },
  statusHistory: [{ status: String, changedBy: mongoose.Schema.Types.ObjectId, timestamp: { type: Date, default: Date.now }, note: String }]
}, { timestamps: true });
bookingSchema.index({ bookingDate: 1, timeSlot: 1 });
export default mongoose.model('Booking', bookingSchema);
