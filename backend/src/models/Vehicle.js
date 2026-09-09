import mongoose from 'mongoose';
const vehicleSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  registrationNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  brand: { type: String, required: true }, model: { type: String, required: true },
  vehicleType: { type: String, default: 'Car' }, fuelType: { type: String, default: 'Petrol' },
  manufacturingYear: Number, color: String, mileage: Number, vin: String, engineNumber: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
export default mongoose.model('Vehicle', vehicleSchema);
