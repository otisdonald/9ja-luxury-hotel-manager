require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const roomsData = [
    // Standard Rooms: ₦35,000
    { legacyId: 1, name: 'Port Harcourt', type: 'Standard', status: 'available', price: 35000, floor: 1 },
    
    // Executive Rooms: ₦40,000
    { legacyId: 2, name: 'Berlin', type: 'Executive', status: 'occupied', price: 40000, floor: 1 },
    { legacyId: 3, name: 'Madrid', type: 'Executive', status: 'available', price: 40000, floor: 1 },
    { legacyId: 4, name: 'Barcelona', type: 'Executive', status: 'maintenance', price: 40000, floor: 2 },
    { legacyId: 5, name: 'Amsterdam', type: 'Executive', status: 'occupied', price: 40000, floor: 2 },
    
    // VIP Rooms: ₦50,000
    { legacyId: 6, name: 'Prague', type: 'VIP', status: 'available', price: 50000, floor: 2 },
    { legacyId: 7, name: 'Paris', type: 'VIP', status: 'cleaning', price: 50000, floor: 2 },
    { legacyId: 8, name: 'Vienna', type: 'VIP', status: 'available', price: 50000, floor: 2 },
    
    // V.VIP Rooms: ₦60,000
    { legacyId: 9, name: 'New York', type: 'V.VIP', status: 'occupied', price: 60000, floor: 3 },
    { legacyId: 10, name: 'Dallas', type: 'V.VIP', status: 'available', price: 60000, floor: 3 },
    { legacyId: 11, name: 'Atlanta', type: 'V.VIP', status: 'available', price: 60000, floor: 3 }
];

const seedRooms = async () => {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/9ja_luxury';
        
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected successfully.');

        // Force drop the entire rooms collection
        console.log('Dropping rooms collection...');
        try {
            await mongoose.connection.db.dropCollection('rooms');
            console.log('Rooms collection dropped.');
        } catch (err) {
            console.log('Collection might not exist, continuing...');
        }

        // Define the Room schema directly here to avoid caching issues
        const RoomSchema = new mongoose.Schema({
            legacyId: { type: Number, index: true },
            name: { type: String, required: true },
            type: { type: String, required: true },
            status: { type: String, enum: ['available','occupied','maintenance','cleaning'], default: 'available' },
            price: { type: Number, default: 0 },
            floor: { type: Number },
            currentGuest: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null }
        }, { timestamps: true });

        const Room = mongoose.model('Room', RoomSchema);

        console.log('Inserting new room data...');
        const insertedRooms = await Room.insertMany(roomsData);
        console.log('✅ Inserted', insertedRooms.length, 'rooms successfully!');

        // Verify the data
        const verification = await Room.find({}, 'name type price').lean();
        console.log('✅ Verification - Room names:', verification.map(r => r.name));

    } catch (err) {
        console.error('❌ Database seeding failed:', err.message);
        console.error(err.stack);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
};

seedRooms();