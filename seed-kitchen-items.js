const mongoose = require('mongoose');
require('dotenv').config();

async function seedKitchenItems() {
  const uri = process.env.MONGODB_URI;
  
  console.log('🍽️ Seeding kitchen inventory items...');
  
  try {
    await mongoose.connect(uri, {
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ Connected to MongoDB Atlas');
    
    // Check if kitchen items already exist
    const KitchenItem = require('./src/models/KitchenItem');
    const existingItems = await KitchenItem.countDocuments();
    
    if (existingItems > 0) {
      console.log(`📦 ${existingItems} kitchen items already exist. Skipping seed.`);
      await mongoose.disconnect();
      return;
    }
    
    const defaultKitchenItems = [
      {
        name: "Rice",
        category: "Grains",
        currentStock: 50,
        unit: "kg",
        costPerUnit: 800,
        minStock: 10,
        supplier: "Local Farm Supply",
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 6 months
      },
      {
        name: "Chicken Breast",
        category: "Meat",
        currentStock: 25,
        unit: "kg",
        costPerUnit: 2500,
        minStock: 5,
        supplier: "Fresh Meat Co.",
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week
      },
      {
        name: "Tomatoes",
        category: "Vegetables",
        currentStock: 15,
        unit: "kg",
        costPerUnit: 600,
        minStock: 3,
        supplier: "Green Gardens",
        expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days
      },
      {
        name: "Onions",
        category: "Vegetables",
        currentStock: 20,
        unit: "kg",
        costPerUnit: 400,
        minStock: 5,
        supplier: "Green Gardens"
      },
      {
        name: "Milk",
        category: "Dairy",
        currentStock: 12,
        unit: "liters",
        costPerUnit: 350,
        minStock: 3,
        supplier: "Daily Fresh Dairy",
        expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days
      },
      {
        name: "Vegetable Oil",
        category: "Other",
        currentStock: 8,
        unit: "liters",
        costPerUnit: 1200,
        minStock: 2,
        supplier: "Kitchen Supplies Ltd"
      },
      {
        name: "Salt",
        category: "Spices",
        currentStock: 5,
        unit: "kg",
        costPerUnit: 200,
        minStock: 1,
        supplier: "Spice Market"
      },
      {
        name: "Black Pepper",
        category: "Spices",
        currentStock: 2,
        unit: "kg",
        costPerUnit: 3000,
        minStock: 0.5,
        supplier: "Spice Market"
      },
      {
        name: "Eggs",
        category: "Dairy",
        currentStock: 100,
        unit: "pieces",
        costPerUnit: 50,
        minStock: 20,
        supplier: "Poultry Farm",
        expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 2 weeks
      },
      {
        name: "Beef",
        category: "Meat",
        currentStock: 15,
        unit: "kg",
        costPerUnit: 4000,
        minStock: 3,
        supplier: "Premium Meat House",
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week
      }
    ];
    
    await KitchenItem.insertMany(defaultKitchenItems);
    console.log(`✅ Successfully seeded ${defaultKitchenItems.length} kitchen inventory items!`);
    
    // Display the items
    const items = await KitchenItem.find({});
    console.log('\n📦 Kitchen Inventory Items:');
    items.forEach(item => {
      console.log(`  - ${item.name} (${item.category}): ${item.currentStock} ${item.unit} @ ₦${item.costPerUnit}/${item.unit}`);
    });
    
    await mongoose.disconnect();
    console.log('✅ Database seeding completed');
    
  } catch (err) {
    console.error('❌ Kitchen inventory seeding failed:', err.message);
  }
}

seedKitchenItems();