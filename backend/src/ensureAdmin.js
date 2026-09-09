import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';

const adminDetails = {
  name: 'System Admin',
  email: 'admin@example.com',
  password: 'Admin@123',
  role: 'admin',
  isActive: true,
};

try {
  await mongoose.connect(process.env.MONGODB_URI);
  let admin = await User.findOne({ email: adminDetails.email }).select('+password');
  if (!admin) {
    admin = await User.create(adminDetails);
  } else {
    Object.assign(admin, adminDetails);
    await admin.save();
  }
  console.log(`Admin account ready: ${admin.email}`);
} finally {
  await mongoose.disconnect();
}
