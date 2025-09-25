const mongoose = require('mongoose');

const kitchenItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Vegetables', 'Meat', 'Dairy', 'Grains', 'Spices', 'Beverages', 'Other']
  },
  currentStock: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'lbs', 'pieces', 'liters', 'bottles', 'bags', 'boxes']
  },
  costPerUnit: {
    type: Number,
    required: true,
    min: 0
  },
  minStock: {
    type: Number,
    required: true,
    min: 0
  },
  supplier: {
    type: String,
    trim: true
  },
  lastPurchased: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Virtual for total value
kitchenItemSchema.virtual('totalValue').get(function() {
  return this.currentStock * this.costPerUnit;
});

// Virtual for stock status
kitchenItemSchema.virtual('stockStatus').get(function() {
  if (this.currentStock <= this.minStock) {
    return 'low';
  } else if (this.currentStock <= this.minStock * 2) {
    return 'medium';
  } else {
    return 'good';
  }
});

// Ensure virtuals are included in JSON output
kitchenItemSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('KitchenItem', kitchenItemSchema);