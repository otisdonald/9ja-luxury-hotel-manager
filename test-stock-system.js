const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const StockItem = require('./src/models/StockModels').StockItem;
const Supplier = require('./src/models/StockModels').Supplier;
const PurchaseOrder = require('./src/models/StockModels').PurchaseOrder;
const StockMovement = require('./src/models/StockModels').StockMovement;

console.log('🧪 Testing Stock Management System...');

// Connect to MongoDB
async function connectToMongoDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB Atlas');
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        return false;
    }
}

// Sample suppliers data
const sampleSuppliers = [
    {
        name: "Lagos Cleaning Supplies Co.",
        contactPerson: "Adebayo Johnson",
        phone: "+234-801-234-5678",
        email: "adebayo@lagoscleaning.ng",
        address: "123 Ikeja Industrial Estate, Lagos",
        category: "Cleaning Supplies",
        paymentTerms: "Net 30",
        rating: 4
    },
    {
        name: "Abuja Office Supplies Ltd",
        contactPerson: "Fatima Ahmad",
        phone: "+234-802-345-6789",
        email: "fatima@abujaoffice.ng",
        address: "45 Maitama District, Abuja",
        category: "Office Supplies",
        paymentTerms: "Net 15",
        rating: 5
    },
    {
        name: "Nigerian Linen Company",
        contactPerson: "Chinedu Okafor",
        phone: "+234-803-456-7890",
        email: "chinedu@nigerianlinen.ng",
        address: "67 Victoria Island, Lagos",
        category: "Linens",
        paymentTerms: "Cash on Delivery",
        rating: 4
    },
    {
        name: "General Supplies Nigeria",
        contactPerson: "Sarah Williams",
        phone: "+234-804-567-8901",
        email: "sarah@generalsupplies.ng",
        address: "89 Computer Village, Lagos",
        category: "General",
        paymentTerms: "Net 7",
        rating: 5
    }
];

// Sample stock items data
const sampleStockItems = [
    {
        name: "All-Purpose Cleaner",
        category: "Cleaning Supplies",
        currentStock: 25,
        minStock: 10,
        maxStock: 100,
        unit: "bottles",
        costPerUnit: 1500,
        location: "Storage Room A, Shelf 1",
        description: "Multi-surface cleaner for guest rooms and common areas"
    },
    {
        name: "Toilet Paper (24-pack)",
        category: "Guest Amenities",
        currentStock: 8,
        minStock: 15,
        maxStock: 50,
        unit: "packs",
        costPerUnit: 3200,
        location: "Storage Room B, Shelf 2",
        description: "Premium 3-ply toilet paper for guest bathrooms"
    },
    {
        name: "Bed Sheets (Queen Size)",
        category: "Linens",
        currentStock: 45,
        minStock: 20,
        maxStock: 80,
        unit: "sets",
        costPerUnit: 8500,
        location: "Linen Closet, Section C",
        description: "100% cotton bed sheets, white"
    },
    {
        name: "Hand Towels",
        category: "Linens",
        currentStock: 12,
        minStock: 25,
        maxStock: 75,
        unit: "pieces",
        costPerUnit: 2200,
        location: "Linen Closet, Section A",
        description: "Premium cotton hand towels for guest rooms"
    },
    {
        name: "A4 Copy Paper",
        category: "Office Supplies",
        currentStock: 35,
        minStock: 10,
        maxStock: 100,
        unit: "reams",
        costPerUnit: 2800,
        location: "Office Storage, Shelf 3",
        description: "White A4 copy paper, 80gsm"
    },
    {
        name: "LED Light Bulbs",
        category: "Electronics",
        currentStock: 5,
        minStock: 20,
        maxStock: 60,
        unit: "pieces",
        costPerUnit: 1200,
        location: "Maintenance Room, Drawer 1",
        description: "12W LED bulbs for room lighting"
    },
    {
        name: "Fire Extinguisher",
        category: "Safety Equipment",
        currentStock: 0,
        minStock: 8,
        maxStock: 15,
        unit: "pieces",
        costPerUnit: 15000,
        location: "Safety Equipment Room",
        description: "2kg dry powder fire extinguisher"
    },
    {
        name: "Vacuum Cleaner Bags",
        category: "Cleaning Supplies",
        currentStock: 18,
        minStock: 12,
        maxStock: 40,
        unit: "pieces",
        costPerUnit: 850,
        location: "Housekeeping Storage",
        description: "Universal vacuum cleaner bags"
    }
];

async function seedStockData() {
    try {
        console.log('🌱 Clearing existing stock data...');
        await StockItem.deleteMany({});
        await Supplier.deleteMany({});
        await PurchaseOrder.deleteMany({});
        await StockMovement.deleteMany({});

        console.log('📦 Creating sample suppliers...');
        const createdSuppliers = await Supplier.insertMany(sampleSuppliers);
        console.log(`✅ Created ${createdSuppliers.length} suppliers`);

        console.log('🏷️  Creating sample stock items...');
        // Assign suppliers to stock items
        const stockItemsWithSuppliers = sampleStockItems.map((item, index) => {
            const supplierIndex = index % createdSuppliers.length;
            return {
                ...item,
                supplier: createdSuppliers[supplierIndex]._id
            };
        });

        const createdItems = await StockItem.insertMany(stockItemsWithSuppliers);
        console.log(`✅ Created ${createdItems.length} stock items`);

        console.log('📊 Stock summary:');
        const totalValue = createdItems.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0);
        const lowStockItems = createdItems.filter(item => item.currentStock <= item.minStock);
        const outOfStockItems = createdItems.filter(item => item.currentStock === 0);

        console.log(`   💰 Total inventory value: ₦${totalValue.toLocaleString()}`);
        console.log(`   ⚠️  Low stock items: ${lowStockItems.length}`);
        console.log(`   🚫 Out of stock items: ${outOfStockItems.length}`);

        if (lowStockItems.length > 0) {
            console.log('\n📋 Low/Out of Stock Items:');
            lowStockItems.forEach(item => {
                const status = item.currentStock === 0 ? 'OUT OF STOCK' : 'LOW STOCK';
                console.log(`   - ${item.name}: ${item.currentStock} ${item.unit} [${status}]`);
            });
        }

        console.log('\n✅ Stock management system seeded successfully!');
        console.log('🌐 You can now test the stock management features in the admin dashboard');
        
    } catch (error) {
        console.error('❌ Error seeding stock data:', error);
    }
}

async function testStockOperations() {
    console.log('\n🧪 Testing stock management operations...');
    
    try {
        // Test 1: Get stock overview
        console.log('\n📊 Test 1: Stock Overview');
        const totalItems = await StockItem.countDocuments();
        const lowStockCount = await StockItem.countDocuments({ $expr: { $lte: ["$currentStock", "$minStock"] } });
        const stockItems = await StockItem.find().populate('supplier');
        const totalValue = stockItems.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0);
        const activeSuppliers = await Supplier.countDocuments();

        console.log(`   Total Items: ${totalItems}`);
        console.log(`   Low Stock Alerts: ${lowStockCount}`);
        console.log(`   Total Value: ₦${totalValue.toLocaleString()}`);
        console.log(`   Active Suppliers: ${activeSuppliers}`);

        // Test 2: Create a sample purchase order
        console.log('\n📝 Test 2: Creating Purchase Order');
        const supplier = await Supplier.findOne();
        const stockItem = await StockItem.findOne();
        
        if (supplier && stockItem) {
            const poData = {
                supplier: supplier._id,
                items: [
                    {
                        item: stockItem._id,
                        quantity: 20,
                        unitPrice: stockItem.costPerUnit
                    }
                ],
                expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                notes: 'Test purchase order for stock replenishment'
            };

            const purchaseOrder = new PurchaseOrder(poData);
            await purchaseOrder.save();
            console.log(`   ✅ Created Purchase Order: ${purchaseOrder.orderNumber}`);
        }

        // Test 3: Create stock movement
        console.log('\n📦 Test 3: Creating Stock Movement');
        const item = await StockItem.findOne();
        if (item) {
            const previousStock = item.currentStock;
            const adjustmentQuantity = 10;
            const newStock = previousStock + adjustmentQuantity;

            // Update stock
            item.currentStock = newStock;
            await item.save();

            // Create movement record
            const movement = new StockMovement({
                item: item._id,
                type: 'in',
                quantity: adjustmentQuantity,
                previousStock: previousStock,
                newStock: newStock,
                reason: 'Stock adjustment - test',
                reference: 'TEST-001',
                staff: 'Test System'
            });
            await movement.save();
            
            console.log(`   ✅ Stock Movement Created: ${item.name}`);
            console.log(`   📈 ${previousStock} → ${newStock} (${adjustmentQuantity})`);
        }

        console.log('\n✅ All stock management operations tested successfully!');
        
    } catch (error) {
        console.error('❌ Error testing stock operations:', error);
    }
}

async function main() {
    const connected = await connectToMongoDB();
    
    if (connected) {
        await seedStockData();
        await testStockOperations();
        
        console.log('\n🎉 Stock Management System Testing Complete!');
        console.log('💻 Open http://localhost:3001/admin.html and go to Stock Management tab');
        
        mongoose.connection.close();
    } else {
        console.error('❌ Failed to connect to database');
    }
    
    process.exit(0);
}

main();