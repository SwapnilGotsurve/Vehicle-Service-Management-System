import mongoose from 'mongoose';
const partSchema = new mongoose.Schema({ name: { type: String, required: true }, partNumber: { type: String, unique: true }, category: String, description: String, supplier: String, purchasePrice: Number, sellingPrice: Number, quantity: { type: Number, default: 0, min: 0 }, minimumStock: { type: Number, default: 5 }, location: String, status: { type: String, default: 'Active' } }, { timestamps: true });
export default mongoose.model('Part', partSchema);
