import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: String,
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['customer', 'admin', 'staff', 'mechanic'], default: 'customer' },
  address: String,
  specialization: String,
  experience: Number,
  availability: { type: String, default: 'Available' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.comparePassword = function comparePassword(value) { return bcrypt.compare(value, this.password); };
export default mongoose.model('User', userSchema);
