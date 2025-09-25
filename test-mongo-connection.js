const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  
  console.log('🔗 Testing MongoDB Atlas connection...');
  console.log('🔑 URI configured:', !!uri);
  console.log('🌐 Database name: hotel-manager');
  
  try {
    // Remove deprecated options
    await mongoose.connect(uri, {
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ MongoDB Atlas connected successfully!');
    console.log('📍 Database:', mongoose.connection.name);
    console.log('🌐 Host:', mongoose.connection.host);
    console.log('📊 Connection state:', mongoose.connection.readyState);
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Collections found:', collections.length);
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    await mongoose.disconnect();
    console.log('✅ Test completed successfully');
    
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    if (err.code) console.error('🔴 Error code:', err.code);
    if (err.codeName) console.error('🔴 Error codeName:', err.codeName);
  }
}

testConnection();