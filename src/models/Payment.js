const { Schema, model } = require('mongoose');

const PaymentSchema = new Schema({
  legacyId: { type: Number, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  roomId: { type: Schema.Types.ObjectId, ref: 'Room' },
  amount: { type: Number, required: true },
  method: { type: String },
  paymentType: { type: String }
}, { timestamps: true });

module.exports = model('Payment', PaymentSchema);
