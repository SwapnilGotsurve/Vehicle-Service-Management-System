import mongoose from 'mongoose';
const serviceRecordSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mechanic: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, inspectionDetails: mongoose.Schema.Types.Mixed,
  workPerformed: [String], partsUsed: [{ part: { type: mongoose.Schema.Types.ObjectId, ref: 'Part' }, name: String, quantity: Number, price: Number }],
  additionalServices: [{ service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' }, name: String, quantity: Number, price: Number }],
  mechanicNotes: String, recommendations: String, serviceStartTime: Date, serviceEndTime: Date, completedAt: Date
}, { timestamps: true });
export default mongoose.model('ServiceRecord', serviceRecordSchema);
