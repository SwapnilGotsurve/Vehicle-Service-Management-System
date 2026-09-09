import mongoose from 'mongoose';
const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true }, description: String, category: String,
  price: { type: Number, required: true, min: 0 }, estimatedDuration: Number,
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });
export default mongoose.model('Service', serviceSchema);
