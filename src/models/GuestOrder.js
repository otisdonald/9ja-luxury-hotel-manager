const { Schema, model } = require('mongoose');

const GuestOrderSchema = new Schema({
  customerId: { 
    type: String, 
    required: true,
    ref: 'Customer',
    index: true 
  },
  orderType: { 
    type: String, 
    enum: ['kitchen', 'room-service', 'maintenance', 'housekeeping', 'security', 'other'], 
    required: true 
  },
  // Kitchen/Food orders
  items: [{
    itemId: { type: Schema.Types.ObjectId, ref: 'KitchenItem' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    notes: { type: String } // Special instructions
  }],
  // Service requests
  serviceType: { type: String }, // e.g., "extra towels", "room cleaning", "maintenance"
  description: { type: String, required: true },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  roomNumber: { type: String, required: true },
  // Status tracking
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  // Timing
  requestedTime: { type: Date, default: Date.now },
  estimatedTime: { type: String }, // e.g., "20 minutes"
  completedAt: { type: Date },
  // Financial
  totalAmount: { type: Number, default: 0 },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'billed-to-room'], 
    default: 'billed-to-room' 
  },
  // Staff handling
  assignedTo: { type: String }, // Staff member handling the order
  handledBy: { type: String }, // Staff who completed it
  notes: { type: String } // Internal staff notes
}, { timestamps: true });

// Indexes for efficient queries
GuestOrderSchema.index({ customerId: 1, createdAt: -1 });
GuestOrderSchema.index({ status: 1, createdAt: -1 });
GuestOrderSchema.index({ roomNumber: 1, status: 1 });

// Calculate total amount before saving
GuestOrderSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }
  next();
});

module.exports = model('GuestOrder', GuestOrderSchema);