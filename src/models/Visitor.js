const { Schema, model } = require('mongoose');

const VisitorSchema = new Schema({
  customerId: { 
    type: String, 
    required: true,
    ref: 'Customer',
    index: true 
  },
  visitorName: { type: String, required: true },
  visitorPhone: { type: String },
  visitorIdNumber: { type: String, required: true },
  expectedDate: { type: Date, required: true },
  expectedTime: { type: String, required: true }, // Format: "14:30"
  purpose: { type: String, required: true },
  duration: { type: String }, // e.g., "2 hours", "1 day"
  status: { 
    type: String, 
    enum: ['pending', 'pending_reconfirmation', 'approved', 'rejected', 'checked-in', 'checked-out'], 
    default: 'pending' 
  },
  notes: { type: String },
  
  // Reconfirmation workflow fields
  reconfirmationRequestedBy: { type: String }, // Staff member who requested reconfirmation
  reconfirmationRequestedAt: { type: Date },
  reconfirmationMessage: { type: String }, // Message from front desk to guest
  guestReconfirmedAt: { type: Date },
  guestReconfirmationResponse: { type: String }, // Guest's response/notes
  
  // Security fields
  approvedBy: { type: String }, // Staff member who approved
  approvedAt: { type: Date },
  checkedInAt: { type: Date },
  checkedOutAt: { type: Date },
  securityNotes: { type: String }
}, { timestamps: true });

// Index for efficient queries
VisitorSchema.index({ customerId: 1, expectedDate: 1 });
VisitorSchema.index({ status: 1, expectedDate: 1 });

module.exports = model('Visitor', VisitorSchema);