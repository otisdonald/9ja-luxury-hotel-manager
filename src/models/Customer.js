const { Schema, model } = require('mongoose');

const CustomerSchema = new Schema({
  legacyId: { type: Number, index: true },
  customerId: { 
    type: String, 
    unique: true, 
    required: true,
    index: true,
    uppercase: true
  },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  notes: { type: String },
  // Guest portal specific fields
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  roomNumber: { type: String },
  checkInDate: { type: Date },
  checkOutDate: { type: Date }
}, { timestamps: true });

// Generate unique customer ID
CustomerSchema.methods.generateCustomerId = async function() {
  const Customer = this.constructor;
  let customerId;
  let isUnique = false;
  
  while (!isUnique) {
    // Generate ID in format: CUST001, CUST002, etc.
    const count = await Customer.countDocuments();
    customerId = `CUST${String(count + 1).padStart(3, '0')}`;
    
    // Check if ID already exists
    const existingCustomer = await Customer.findOne({ customerId });
    if (!existingCustomer) {
      isUnique = true;
    }
  }
  
  this.customerId = customerId;
  return customerId;
};

// Static method to generate next customer ID
CustomerSchema.statics.generateNextCustomerId = async function() {
  let customerId;
  let isUnique = false;
  
  while (!isUnique) {
    const count = await this.countDocuments();
    customerId = `CUST${String(count + 1).padStart(3, '0')}`;
    
    const existingCustomer = await this.findOne({ customerId });
    if (!existingCustomer) {
      isUnique = true;
    }
  }
  
  return customerId;
};

// Pre-save middleware to generate customerId if not provided
CustomerSchema.pre('save', async function(next) {
  if (!this.customerId && this.isNew) {
    await this.generateCustomerId();
  }
  next();
});

module.exports = model('Customer', CustomerSchema);
