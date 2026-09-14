import mongoose from 'mongoose';

const photoSchema = new mongoose.Schema({
  url: { type: String, required: true },       // relative path served by express static
  caption: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const serviceRecordSchema = new mongoose.Schema({
  booking:  { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  vehicle:  { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  mechanic: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // ── Photo documentation ────────────────────────────────────────────────
  beforePhotos: { type: [photoSchema], default: [] },
  afterPhotos:  { type: [photoSchema], default: [] },

  // ── Work details ───────────────────────────────────────────────────────
  workPerformed:      [String],
  mechanicNotes:      { type: String, default: '' },
  recommendations:    { type: String, default: '' },
  inspectionDetails:  mongoose.Schema.Types.Mixed,

  partsUsed: [{
    part:     { type: mongoose.Schema.Types.ObjectId, ref: 'Part' },
    name:     String,
    quantity: Number,
    price:    Number,
  }],
  additionalServices: [{
    service:  { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    name:     String,
    quantity: Number,
    price:    Number,
  }],

  serviceStartTime: Date,
  serviceEndTime:   Date,
  completedAt:      Date,
}, { timestamps: true });

export default mongoose.model('ServiceRecord', serviceRecordSchema);
