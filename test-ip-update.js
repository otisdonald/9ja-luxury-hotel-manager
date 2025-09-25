
const mongoose = require('mongoose');
require('dotenv').config();

async function testNewIPConnection() {
  const uri = process.env.MONGODB_URI;
  
  console.log('🔄 Testing MongoDB Atlas connection with new IP...');
  console.log('🌐 Current IP should be: 102.90.116.204');
  console.log('🔑 MongoDB URI configured:', !!uri);
  
  try {
    console.log('⏳ Attempting connection...');
    
    await mongoose.connect(uri, {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 10000 // 10 second timeout
    });
    
    console.log('✅ SUCCESS! MongoDB Atlas connected with new IP!');
    console.log('📍 Database:', mongoose.connection.name);
    console.log('🌐 Host:', mongoose.connection.host);
    console.log('📊 Connection state:', mongoose.connection.readyState);
    
    // Quick data check
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📋 Collections found: ${collections.length}`);
    
    // Check rooms data
    const roomsCollection = mongoose.connection.db.collection('rooms');
    const roomCount = await roomsCollection.countDocuments();
    console.log(`🏨 Rooms in database: ${roomCount}`);
    
    await mongoose.disconnect();
    console.log('✅ Test completed successfully - IP whitelist is working!');
    
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    
    if (err.message.includes('IP')) {
      console.log('💡 Solution: Make sure 102.90.116.204 is added to MongoDB Atlas Network Access');
      console.log('🔗 Or use "Allow Access from Anywhere" (0.0.0.0/0) for testing');
    }
    
    console.log('⚠️ App will continue using localStorage until connection is restored');
  }
}

// Run test every 30 seconds until connection succeeds
async function monitorConnection() {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`\n=== Attempt ${attempts}/${maxAttempts} ===`);
    
    try {
      await testNewIPConnection();
      console.log('🎉 Connection successful - monitoring complete!');
      break;
    } catch (err) {
      console.log(`⏳ Waiting 30 seconds before retry... (${attempts}/${maxAttempts})`);
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
  }
  
  if (attempts >= maxAttempts) {
    console.log('⚠️ Max attempts reached. Please check MongoDB Atlas settings manually.');
  }
}

monitorConnection();