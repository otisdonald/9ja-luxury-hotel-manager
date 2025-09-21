const { Schema, model } = require('mongoose');

const BookingSchema = new Schema({
  legacyId: { type: Number, index: true },
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  status: { type: String, default: 'confirmed' }
}, { timestamps: true });

module.exports = model('Booking', BookingSchema);
