// MongoDB Atlas Connection Test Script
const mongoose = require('mongoose');
require('dotenv').config();

async function testMongoDBAtlas() {
  console.log('🔍 Testing MongoDB Atlas Connection...\n');
  
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.log('❌ MONGODB_URI not found in .env file');
    console.log('📝 Please create a .env file with your MongoDB Atlas connection string');
    return;
  }
  
  console.log('🔗 Connection URI:', uri.replace(/:[^:@]*@/, ':****@'));
  
  try {
    console.log('⏳ Connecting to MongoDB Atlas...');
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ MongoDB Atlas connected successfully!');
    console.log('📍 Database:', mongoose.connection.name);
    console.log('🌐 Host:', mongoose.connection.host);
    console.log('📊 Ready state:', mongoose.connection.readyState);
    
    // Test basic operation
    console.log('\n🧪 Testing basic database operation...');
    const testCollection = mongoose.connection.db.collection('connection_test');
    await testCollection.insertOne({ 
      test: true, 
      timestamp: new Date(),
      message: 'Hotel Manager connection test'
    });
    
    const testDoc = await testCollection.findOne({ test: true });
    console.log('✅ Test document created:', testDoc._id);
    
    // Cleanup
    await testCollection.deleteOne({ _id: testDoc._id });
    console.log('🧹 Test document cleaned up');
    
    console.log('\n🎉 MongoDB Atlas is ready for Hotel Manager!');
    
  } catch (error) {
    console.error('\n❌ MongoDB Atlas connection failed:');
    console.error(error.message);
    
    if (error.message.includes('authentication')) {
      console.log('\n💡 Troubleshooting Tips:');
      console.log('   1. Check your username and password in the connection string');
      console.log('   2. Ensure the database user has read/write permissions');
      console.log('   3. Verify the password doesn\'t contain special characters that need encoding');
    }
    
    if (error.message.includes('network') || error.message.includes('timeout')) {
      console.log('\n💡 Troubleshooting Tips:');
      console.log('   1. Check your internet connection');
      console.log('   2. Verify IP address is whitelisted (0.0.0.0/0 for testing)');
      console.log('   3. Check if your firewall blocks MongoDB Atlas');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB Atlas');
    process.exit(0);
  }
}

testMongoDBAtlas();