const { Schema, model } = require('mongoose');

const BarItemSchema = new Schema({
  legacyId: { type: Number, index: true },
  name: { type: String, required: true },
  price: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  category: { type: String }
}, { timestamps: true });

module.exports = model('BarItem', BarItemSchema);
