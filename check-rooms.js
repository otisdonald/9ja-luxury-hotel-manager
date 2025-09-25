const mongoose = require('mongoose');
require('dotenv').config();

async function checkRoomsData() {
  const uri = process.env.MONGODB_URI;
  
  console.log('🔍 Checking rooms data in MongoDB Atlas...');
  
  try {
    await mongoose.connect(uri, {
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ Connected to MongoDB Atlas');
    
    // Check rooms collection
    const db = mongoose.connection.db;
    const roomsCollection = db.collection('rooms');
    
    const roomCount = await roomsCollection.countDocuments();
    console.log(`📊 Total rooms in database: ${roomCount}`);
    
    if (roomCount === 0) {
      console.log('⚠️ No rooms found in database. Creating default rooms...');
      
      const defaultRooms = [
        { number: 101, type: 'Standard', price: 5000, status: 'available', amenities: ['WiFi', 'TV', 'AC'] },
        { number: 102, type: 'Standard', price: 5000, status: 'available', amenities: ['WiFi', 'TV', 'AC'] },
        { number: 103, type: 'Deluxe', price: 8000, status: 'available', amenities: ['WiFi', 'TV', 'AC', 'Minibar'] },
        { number: 104, type: 'Deluxe', price: 8000, status: 'available', amenities: ['WiFi', 'TV', 'AC', 'Minibar'] },
        { number: 105, type: 'Suite', price: 12000, status: 'available', amenities: ['WiFi', 'TV', 'AC', 'Minibar', 'Balcony'] },
        { number: 201, type: 'Standard', price: 5000, status: 'available', amenities: ['WiFi', 'TV', 'AC'] },
        { number: 202, type: 'Standard', price: 5000, status: 'available', amenities: ['WiFi', 'TV', 'AC'] },
        { number: 203, type: 'Deluxe', price: 8000, status: 'available', amenities: ['WiFi', 'TV', 'AC', 'Minibar'] },
        { number: 204, type: 'Deluxe', price: 8000, status: 'available', amenities: ['WiFi', 'TV', 'AC', 'Minibar'] },
        { number: 205, type: 'Suite', price: 12000, status: 'available', amenities: ['WiFi', 'TV', 'AC', 'Minibar', 'Balcony'] },
        { number: 301, type: 'Presidential Suite', price: 20000, status: 'available', amenities: ['WiFi', 'TV', 'AC', 'Minibar', 'Balcony', 'Jacuzzi'] }
      ];
      
      await roomsCollection.insertMany(defaultRooms);
      console.log('✅ Default rooms created successfully!');
    } else {
      console.log('📋 Existing rooms:');
      const rooms = await roomsCollection.find({}).toArray();
      rooms.forEach(room => {
        console.log(`  - Room ${room.number}: ${room.type} (${room.status})`);
      });
    }
    
    await mongoose.disconnect();
    console.log('✅ Database check completed');
    
  } catch (err) {
    console.error('❌ Database check failed:', err.message);
  }
}

checkRoomsData();