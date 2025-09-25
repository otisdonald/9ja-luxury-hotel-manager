// Create a test customer for guest portal access
const mongoose = require('mongoose');
const Customer = require('./src/models/Customer');

async function createTestCustomer() {
    try {
        // Connect to database
        const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://otisdonald:shuaOcTvNZgTp3Lb@cluster0.mljq56g.mongodb.net/hotel-manager?retryWrites=true&w=majority&appName=Cluster0';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Check if test customer already exists
        const existingCustomer = await Customer.findOne({ email: 'test.guest@hotel.com' });
        
        if (existingCustomer) {
            console.log('🎯 Test customer already exists!');
            console.log('📋 Customer ID:', existingCustomer.customerId);
            console.log('👤 Name:', existingCustomer.name);
            console.log('📧 Email:', existingCustomer.email);
            return;
        }

        // Create a test customer
        const testCustomer = new Customer({
            name: 'Test Guest',
            email: 'test.guest@hotel.com',
            phone: '+234 801 234 5678',
            address: '123 Test Street, Lagos',
            roomNumber: 'Berlin',
            checkInDate: new Date(),
            checkOutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            totalAmount: 45000,
            isActive: true,
            notes: 'Test customer for guest portal demo'
        });

        await testCustomer.save();
        
        console.log('🎉 Test customer created successfully!');
        console.log('📋 Customer ID:', testCustomer.customerId);
        console.log('👤 Name:', testCustomer.name);
        console.log('📧 Email:', testCustomer.email);
        console.log('🏨 Room:', testCustomer.roomNumber);
        
        console.log('\n🚀 You can now login to the guest portal using:');
        console.log('🆔 Customer ID:', testCustomer.customerId);

    } catch (error) {
        console.error('❌ Error creating test customer:', error);
    } finally {
        mongoose.disconnect();
    }
}

createTestCustomer();