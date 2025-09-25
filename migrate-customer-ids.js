const Customer = require('./src/models/Customer');
const mongoose = require('mongoose');

async function migrateCustomers() {
  try {
    console.log('🔄 Starting customer ID migration...');
    
    // Find customers without customerId
    const customersWithoutId = await Customer.find({ 
      $or: [
        { customerId: { $exists: false } },
        { customerId: null },
        { customerId: '' }
      ]
    });
    
    console.log(`Found ${customersWithoutId.length} customers without Customer IDs`);
    
    for (let i = 0; i < customersWithoutId.length; i++) {
      const customer = customersWithoutId[i];
      
      // Generate unique customer ID
      let customerId;
      let isUnique = false;
      let counter = 1;
      
      while (!isUnique) {
        customerId = `CUST${String(counter).padStart(3, '0')}`;
        const existingCustomer = await Customer.findOne({ customerId });
        if (!existingCustomer) {
          isUnique = true;
        } else {
          counter++;
        }
      }
      
      // Update customer with new ID
      customer.customerId = customerId;
      customer.isActive = true; // Ensure they can use guest portal
      await customer.save();
      
      console.log(`✅ Updated ${customer.name} with ID: ${customerId}`);
    }
    
    console.log('🎉 Customer ID migration completed successfully!');
    
    // Display all customers with their IDs
    const allCustomers = await Customer.find().select('name customerId email');
    console.log('\n📋 All customers with Customer IDs:');
    allCustomers.forEach(customer => {
      console.log(`${customer.customerId}: ${customer.name} (${customer.email || 'No email'})`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run migration
migrateCustomers();