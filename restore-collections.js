require('dotenv').config();
const mongoose = require('mongoose');

// Define schemas directly to avoid import issues
const RoomSchema = new mongoose.Schema({
    legacyId: { type: Number, index: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    status: { type: String, enum: ['available','occupied','maintenance','cleaning'], default: 'available' },
    price: { type: Number, default: 0 },
    floor: { type: Number },
    currentGuest: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null }
}, { timestamps: true });

const CustomerSchema = new mongoose.Schema({
    legacyId: { type: Number, index: true },
    customerId: { type: String, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    roomNumber: { type: String },
    checkInDate: { type: Date },
    checkOutDate: { type: Date },
    totalAmount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    notes: { type: String }
}, { timestamps: true });

const BarItemSchema = new mongoose.Schema({
    legacyId: { type: Number, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    description: { type: String }
}, { timestamps: true });

const KitchenItemSchema = new mongoose.Schema({
    legacyId: { type: Number, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    currentStock: { type: Number, default: 0 },
    unit: { type: String, required: true },
    costPerUnit: { type: Number, required: true },
    minStock: { type: Number, default: 0 },
    supplier: { type: String },
    expiryDate: { type: Date }
}, { timestamps: true });

// Auto-generate customerId
CustomerSchema.pre('save', function(next) {
    if (!this.customerId) {
        this.customerId = 'CUST' + Math.random().toString(36).substr(2, 6).toUpperCase();
    }
    next();
});

async function restoreCollections() {
    try {
        const uri = process.env.MONGODB_URI;
        console.log('🔗 Connecting to MongoDB Atlas...');
        
        await mongoose.connect(uri, {
            retryWrites: true,
            w: 'majority'
        });
        console.log('✅ Connected successfully!');

        // Create models
        const Room = mongoose.model('Room', RoomSchema);
        const Customer = mongoose.model('Customer', CustomerSchema);
        const BarItem = mongoose.model('BarItem', BarItemSchema);
        const KitchenItem = mongoose.model('KitchenItem', KitchenItemSchema);

        // Sample data
        const roomsData = [
            { legacyId: 1, name: 'Port Harcourt', type: 'Standard', status: 'available', price: 35000, floor: 1 },
            { legacyId: 2, name: 'Berlin', type: 'Executive', status: 'available', price: 40000, floor: 1 },
            { legacyId: 3, name: 'Madrid', type: 'Executive', status: 'available', price: 40000, floor: 1 },
            { legacyId: 4, name: 'Barcelona', type: 'Executive', status: 'available', price: 40000, floor: 2 },
            { legacyId: 5, name: 'Amsterdam', type: 'Executive', status: 'available', price: 40000, floor: 2 },
            { legacyId: 6, name: 'Prague', type: 'VIP', status: 'available', price: 50000, floor: 2 },
            { legacyId: 7, name: 'Paris', type: 'VIP', status: 'available', price: 50000, floor: 2 },
            { legacyId: 8, name: 'Vienna', type: 'VIP', status: 'available', price: 50000, floor: 2 },
            { legacyId: 9, name: 'New York', type: 'V.VIP', status: 'available', price: 60000, floor: 3 },
            { legacyId: 10, name: 'Dallas', type: 'V.VIP', status: 'available', price: 60000, floor: 3 },
            { legacyId: 11, name: 'Atlanta', type: 'V.VIP', status: 'available', price: 60000, floor: 3 }
        ];

        const customersData = [
            {
                legacyId: 1,
                name: 'Test Guest',
                email: 'test.guest@hotel.com',
                phone: '+234 801 234 5678',
                address: '123 Test Street, Lagos',
                roomNumber: 'Berlin',
                checkInDate: new Date(),
                checkOutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                totalAmount: 40000,
                isActive: true,
                notes: 'Test customer for guest portal'
            }
        ];

        const barItemsData = [
            { legacyId: 1, name: 'Hennessy VSOP', category: 'Cognac', price: 45000, stock: 12 },
            { legacyId: 2, name: 'Johnnie Walker Black Label', category: 'Whiskey', price: 35000, stock: 8 },
            { legacyId: 3, name: 'Dom Pérignon', category: 'Champagne', price: 85000, stock: 6 },
            { legacyId: 4, name: 'Absolut Vodka', category: 'Vodka', price: 25000, stock: 15 },
            { legacyId: 5, name: 'Coca Cola', category: 'Soft Drinks', price: 500, stock: 50 },
            { legacyId: 6, name: 'Guinness Stout', category: 'Beer', price: 800, stock: 24 }
        ];

        const kitchenItemsData = [
            { legacyId: 1, name: "Rice", category: "Grains", currentStock: 50, unit: "kg", costPerUnit: 800, minStock: 10, supplier: "Local Farm Supply" },
            { legacyId: 2, name: "Chicken Breast", category: "Meat", currentStock: 25, unit: "kg", costPerUnit: 2500, minStock: 5, supplier: "Fresh Meat Co." },
            { legacyId: 3, name: "Tomatoes", category: "Vegetables", currentStock: 15, unit: "kg", costPerUnit: 600, minStock: 3, supplier: "Green Gardens" },
            { legacyId: 4, name: "Beef", category: "Meat", currentStock: 20, unit: "kg", costPerUnit: 4000, minStock: 3, supplier: "Premium Meat House" },
            { legacyId: 5, name: "Eggs", category: "Dairy", currentStock: 100, unit: "pieces", costPerUnit: 50, minStock: 20, supplier: "Poultry Farm" }
        ];

        // Restore collections
        console.log('🏨 Restoring Rooms collection...');
        await Room.deleteMany({});
        const rooms = await Room.insertMany(roomsData);
        console.log(`✅ Created ${rooms.length} rooms`);

        console.log('👥 Restoring Customers collection...');
        await Customer.deleteMany({});
        const customers = await Customer.insertMany(customersData);
        console.log(`✅ Created ${customers.length} customers`);
        
        // Log the test customer ID for guest portal access
        const testCustomer = customers[0];
        console.log(`🔑 Test Customer ID: ${testCustomer.customerId}`);

        console.log('🍺 Restoring Bar Items collection...');
        await BarItem.deleteMany({});
        const barItems = await BarItem.insertMany(barItemsData);
        console.log(`✅ Created ${barItems.length} bar items`);

        console.log('🍽️ Restoring Kitchen Items collection...');
        await KitchenItem.deleteMany({});
        const kitchenItems = await KitchenItem.insertMany(kitchenItemsData);
        console.log(`✅ Created ${kitchenItems.length} kitchen items`);

        console.log('\n🎉 Database restoration completed!');
        console.log('📋 Summary:');
        console.log(`  - Rooms: ${rooms.length}`);
        console.log(`  - Customers: ${customers.length}`);
        console.log(`  - Bar Items: ${barItems.length}`);
        console.log(`  - Kitchen Items: ${kitchenItems.length}`);
        
        console.log(`\n🚀 Guest Portal Access:`);
        console.log(`  Customer ID: ${testCustomer.customerId}`);
        console.log(`  Room: ${testCustomer.roomNumber}`);

    } catch (error) {
        console.error('❌ Database restoration failed:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed.');
    }
}

restoreCollections();