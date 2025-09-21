const mongoose = require('mongoose');
require('dotenv').config();

async function connectDB() {
  // Try MongoDB Atlas first (production), then local (development)
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/9ja_luxury';
  
  console.log('🔗 Attempting MongoDB connection...');
  console.log('🌐 Environment:', process.env.NODE_ENV || 'development');
  console.log('🔑 MongoDB URI available:', !!process.env.MONGODB_URI);
  
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ MongoDB connected successfully');
    console.log('📍 Database:', mongoose.connection.name);
    console.log('🌐 Host:', mongoose.connection.host);
    console.log('📊 Connection state:', mongoose.connection.readyState);
    
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️  App will continue in local mode');
    // Re-throw error so calling code knows connection failed
    throw err;
  }
}

module.exports = connectDB;
