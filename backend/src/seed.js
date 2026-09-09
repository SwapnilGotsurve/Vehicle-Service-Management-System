import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import Service from './models/Service.js';
import Part from './models/Part.js';

await mongoose.connect(process.env.MONGODB_URI);
await Promise.all([User.deleteMany({}), Service.deleteMany({}), Part.deleteMany({})]);
await User.create([
  { name: 'System Admin', email: 'admin@example.com', password: 'Admin@123', role: 'admin' },
  { name: 'Service Advisor', email: 'staff@example.com', password: 'Staff@123', role: 'staff' },
  { name: 'Amit Verma', email: 'mechanic@example.com', password: 'Mechanic@123', role: 'mechanic', specialization: 'General Service' }
]);
await Service.insertMany([
  ['General Service', 'Complete preventive maintenance check.', 'Maintenance', 1499], ['Oil Change', 'Engine oil and filter replacement.', 'Maintenance', 899], ['Brake Service', 'Brake inspection and adjustment.', 'Safety', 1299], ['AC Service', 'Cooling performance and gas check.', 'Electrical', 1799], ['Full Inspection', 'Comprehensive vehicle health inspection.', 'Inspection', 699]
].map(([name, description, category, price]) => ({ name, description, category, price, estimatedDuration: 90 })));
await Part.insertMany([{ name: 'Premium Brake Pads', partNumber: 'BP-1001', category: 'Brakes', sellingPrice: 2200, quantity: 24, minimumStock: 5, location: 'A-12' }, { name: 'Engine Oil 5W-30', partNumber: 'EO-530', category: 'Fluids', sellingPrice: 850, quantity: 40, minimumStock: 10, location: 'B-03' }]);
console.log('Seed complete. Demo accounts: admin@example.com / Admin@123, staff@example.com / Staff@123, mechanic@example.com / Mechanic@123');
await mongoose.disconnect();
