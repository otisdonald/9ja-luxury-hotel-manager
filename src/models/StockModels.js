const { Schema, model } = require('mongoose');

// General Stock Item Schema (for hotel supplies, cleaning materials, etc.)
const StockItemSchema = new Schema({
  legacyId: { type: Number, index: true },
  name: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['Cleaning Supplies', 'Maintenance', 'Office Supplies', 'Guest Amenities', 'Linens', 'Electronics', 'Safety Equipment', 'Other']
  },
  currentStock: { type: Number, default: 0, min: 0 },
  minStock: { type: Number, default: 0, min: 0 },
  maxStock: { type: Number, default: 1000, min: 0 },
  unit: { type: String, required: true }, // pieces, liters, kg, boxes, etc.
  costPerUnit: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, default: 0, min: 0 }, // For items sold to guests
  supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
  supplierName: { type: String }, // Fallback supplier name
  location: { type: String, default: 'Main Warehouse' }, // Storage location
  barcode: { type: String, unique: true, sparse: true },
  description: { type: String },
  expiryDate: { type: Date },
  lastPurchaseDate: { type: Date },
  lastPurchasePrice: { type: Number },
  totalValue: { type: Number, default: 0 }, // currentStock * costPerUnit
  reorderPoint: { type: Number, default: 0 }, // When to reorder
  status: { 
    type: String, 
    enum: ['active', 'discontinued', 'out-of-stock'], 
    default: 'active' 
  },
  notes: { type: String }
}, { timestamps: true });

// Supplier Schema
const SupplierSchema = new Schema({
  legacyId: { type: Number, index: true },
  name: { type: String, required: true },
  contactPerson: { type: String },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  category: { 
    type: String, 
    enum: ['Food & Beverage', 'Cleaning Supplies', 'Maintenance', 'Office Supplies', 'Linens', 'General'], 
    default: 'General' 
  },
  paymentTerms: { type: String, default: 'Net 30' },
  leadTime: { type: Number, default: 7 }, // Days
  minOrderValue: { type: Number, default: 0 },
  rating: { type: Number, min: 1, max: 5, default: 5 },
  isActive: { type: Boolean, default: true },
  lastOrderDate: { type: Date },
  totalOrders: { type: Number, default: 0 },
  totalValue: { type: Number, default: 0 },
  notes: { type: String }
}, { timestamps: true });

// Purchase Order Schema
const PurchaseOrderSchema = new Schema({
  orderNumber: { type: String, unique: true, required: true },
  supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
  supplierName: { type: String, required: true },
  orderDate: { type: Date, default: Date.now },
  expectedDeliveryDate: { type: Date },
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'confirmed', 'partially-received', 'completed', 'cancelled'], 
    default: 'draft' 
  },
  items: [{
    stockItem: { type: Schema.Types.ObjectId, ref: 'StockItem' },
    itemName: { type: String, required: true },
    quantityOrdered: { type: Number, required: true, min: 1 },
    quantityReceived: { type: Number, default: 0 },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  notes: { type: String },
  createdBy: { type: String }, // Staff member who created the order
  receivedBy: { type: String }, // Staff member who received the goods
  receivedDate: { type: Date }
}, { timestamps: true });

// Stock Movement Schema (for tracking all stock changes)
const StockMovementSchema = new Schema({
  stockItem: { type: Schema.Types.ObjectId, ref: 'StockItem', required: true },
  itemName: { type: String, required: true },
  movementType: { 
    type: String, 
    enum: ['purchase', 'sale', 'adjustment', 'transfer', 'waste', 'return'], 
    required: true 
  },
  quantity: { type: Number, required: true }, // Positive for in, negative for out
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  unitPrice: { type: Number, default: 0 },
  totalValue: { type: Number, default: 0 },
  reason: { type: String }, // Reason for adjustment, waste, etc.
  reference: { type: String }, // PO number, sale ID, etc.
  location: { type: String }, // From/to location
  performedBy: { type: String }, // Staff member
  notes: { type: String }
}, { timestamps: true });

// Indexes for better performance
StockItemSchema.index({ name: 1, category: 1 });
StockItemSchema.index({ currentStock: 1, minStock: 1 });
StockItemSchema.index({ supplier: 1 });
SupplierSchema.index({ name: 1, isActive: 1 });
PurchaseOrderSchema.index({ orderNumber: 1 });
PurchaseOrderSchema.index({ supplier: 1, status: 1 });
StockMovementSchema.index({ stockItem: 1, createdAt: -1 });
StockMovementSchema.index({ movementType: 1, createdAt: -1 });

// Calculate total value before saving
StockItemSchema.pre('save', function(next) {
  this.totalValue = this.currentStock * this.costPerUnit;
  next();
});

// Auto-generate order number
PurchaseOrderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString().slice(-6);
    this.orderNumber = `PO-${timestamp}`;
  }
  next();
});

module.exports = {
  StockItem: model('StockItem', StockItemSchema),
  Supplier: model('Supplier', SupplierSchema),
  PurchaseOrder: model('PurchaseOrder', PurchaseOrderSchema),
  StockMovement: model('StockMovement', StockMovementSchema)
};