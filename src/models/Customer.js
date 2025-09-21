const { Schema, model } = require('mongoose');

const CustomerSchema = new Schema({
  legacyId: { type: Number, index: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  notes: { type: String },
}, { timestamps: true });

module.exports = model('Customer', CustomerSchema);
