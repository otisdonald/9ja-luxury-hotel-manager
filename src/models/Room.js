const { Schema, model } = require('mongoose');

const RoomSchema = new Schema({
  legacyId: { type: Number, index: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  status: { type: String, enum: ['available','occupied','maintenance','cleaning'], default: 'available' },
  price: { type: Number, default: 0 },
  floor: { type: Number },
  currentGuest: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
  // Price audit fields
  lastPriceUpdate: { type: Date },
  priceUpdateBy: { type: String },
  priceChangeReason: { type: String },
  priceChangeNotes: { type: String },
  previousPrice: { type: Number }
}, { timestamps: true });

module.exports = model('Room', RoomSchema);
