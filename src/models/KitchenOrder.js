const { Schema, model } = require('mongoose');

const KitchenOrderSchema = new Schema({
  legacyId: { type: Number, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  roomId: { type: Schema.Types.ObjectId, ref: 'Room' },
  items: { type: String },
  type: { type: String },
  status: { type: String, default: 'pending' }
}, { timestamps: true });

module.exports = model('KitchenOrder', KitchenOrderSchema);
