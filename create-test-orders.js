require('dotenv').config();
const mongoose = require('mongoose');

// Define GuestOrder schema directly
const GuestOrderSchema = new mongoose.Schema({
  customerId: { type: String, required: true, index: true },
  orderType: { 
    type: String, 
    enum: ['kitchen', 'room-service', 'maintenance', 'housekeeping', 'security', 'other'], 
    required: true 
  },
  items: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    notes: { type: String }
  }],
  serviceType: { type: String },
  description: { type: String, required: true },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  roomNumber: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  requestedTime: { type: Date, default: Date.now },
  estimatedTime: { type: String },
  completedAt: { type: Date },
  totalAmount: { type: Number, default: 0 },
  assignedTo: { type: String },
  notes: { type: String }
}, { timestamps: true });

async function createTestOrders() {
    try {
        const uri = process.env.MONGODB_URI;
        console.log('🔗 Connecting to MongoDB Atlas...');
        
        await mongoose.connect(uri, {
            retryWrites: true,
            w: 'majority'
        });
        console.log('✅ Connected successfully!');

        const GuestOrder = mongoose.model('GuestOrder', GuestOrderSchema);

        // Create test orders for different departments
        const testOrders = [
            // Kitchen orders
            {
                customerId: 'CUST001',
                orderType: 'kitchen',
                roomNumber: 'Berlin',
                description: 'Grilled chicken with rice and vegetables',
                items: [
                    { name: 'Grilled Chicken', quantity: 1, price: 4500, notes: 'Well done' },
                    { name: 'Jollof Rice', quantity: 1, price: 2000 },
                    { name: 'Mixed Vegetables', quantity: 1, price: 1500 }
                ],
                priority: 'medium',
                status: 'pending',
                totalAmount: 8000
            },
            {
                customerId: 'CUST002',
                orderType: 'kitchen',
                roomNumber: 'Madrid',
                description: 'Continental breakfast',
                items: [
                    { name: 'Pancakes', quantity: 2, price: 1500 },
                    { name: 'Orange Juice', quantity: 1, price: 800 },
                    { name: 'Coffee', quantity: 1, price: 500 }
                ],
                priority: 'low',
                status: 'confirmed',
                totalAmount: 2800
            },
            
            // Room Service orders
            {
                customerId: 'CUST003',
                orderType: 'room-service',
                roomNumber: 'Prague',
                serviceType: 'extra towels',
                description: 'Need 4 extra bath towels and 2 face towels',
                priority: 'medium',
                status: 'pending'
            },
            {
                customerId: 'CUST004',
                orderType: 'room-service',
                roomNumber: 'Paris',
                serviceType: 'room amenities',
                description: 'Need extra pillows and blanket, room is too cold',
                priority: 'high',
                status: 'confirmed'
            },
            
            // Security requests
            {
                customerId: 'CUST005',
                orderType: 'security',
                roomNumber: 'New York',
                serviceType: 'visitor registration',
                description: 'Expecting business partner John Doe at 3 PM today, please register him',
                priority: 'medium',
                status: 'pending'
            },
            {
                customerId: 'CUST006',
                orderType: 'other',
                roomNumber: 'Vienna',
                serviceType: 'security',
                description: 'Suspicious activity in the hallway, heard unusual noises',
                priority: 'urgent',
                status: 'pending'
            },
            
            // Housekeeping/Maintenance orders
            {
                customerId: 'CUST007',
                orderType: 'housekeeping',
                roomNumber: 'Amsterdam',
                serviceType: 'room cleaning',
                description: 'Please clean room thoroughly, spilled wine on carpet',
                priority: 'high',
                status: 'pending'
            },
            {
                customerId: 'CUST008',
                orderType: 'maintenance',
                roomNumber: 'Barcelona',
                serviceType: 'repair',
                description: 'Air conditioning not working properly, room too warm',
                priority: 'high',
                status: 'confirmed'
            },
            {
                customerId: 'CUST009',
                orderType: 'housekeeping',
                roomNumber: 'Dallas',
                serviceType: 'laundry',
                description: 'Need urgent laundry service for business meeting tomorrow',
                priority: 'urgent',
                status: 'pending'
            }
        ];

        console.log('🧪 Creating test guest orders...');
        await GuestOrder.deleteMany({}); // Clear existing test orders
        const createdOrders = await GuestOrder.insertMany(testOrders);
        
        console.log('✅ Test orders created successfully!');
        console.log('📋 Summary:');
        
        const ordersByDepartment = {
            kitchen: createdOrders.filter(o => o.orderType === 'kitchen').length,
            roomService: createdOrders.filter(o => o.orderType === 'room-service').length,
            security: createdOrders.filter(o => o.orderType === 'security' || (o.serviceType && o.serviceType.includes('security'))).length,
            housekeeping: createdOrders.filter(o => o.orderType === 'housekeeping' || o.orderType === 'maintenance').length
        };
        
        console.log(`  🍽️ Kitchen Orders: ${ordersByDepartment.kitchen}`);
        console.log(`  🏨 Room Service Orders: ${ordersByDepartment.roomService}`);
        console.log(`  🛡️ Security Requests: ${ordersByDepartment.security}`);
        console.log(`  🧹 Housekeeping/Maintenance: ${ordersByDepartment.housekeeping}`);
        console.log(`  📊 Total Orders: ${createdOrders.length}`);
        
        console.log('\\n🚀 Now you can test the multi-department order routing!');
        console.log('📱 Open http://localhost:3001 and login as staff to see orders in different departments');

    } catch (error) {
        console.error('❌ Failed to create test orders:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed.');
    }
}

createTestOrders();