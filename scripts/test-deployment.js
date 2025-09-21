// Test script for deployed Hotel Manager
const testDeployment = async () => {
  const baseUrl = 'https://9ja-luxury-hotel-manager.vercel.app';
  
  console.log('🧪 Testing Hotel Manager Deployment...\n');
  
  try {
    // Test 1: Login with admin credentials
    console.log('1️⃣ Testing admin login...');
    const loginResponse = await fetch(`${baseUrl}/api/staff/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalId: 'EMP001',
        pin: '1234'
      })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Admin login successful');
      
      // Test 2: Get rooms with authentication
      console.log('2️⃣ Testing rooms API...');
      const roomsResponse = await fetch(`${baseUrl}/api/rooms`, {
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (roomsResponse.ok) {
        const rooms = await roomsResponse.json();
        console.log(`✅ Rooms API working - Found ${rooms.length} rooms`);
        console.log('🏨 Sample room:', rooms[0] ? rooms[0].number : 'No rooms');
      } else {
        console.log(`❌ Rooms API failed: ${roomsResponse.status}`);
        const error = await roomsResponse.text();
        console.log('Error:', error);
      }
      
      // Test 3: Get customers
      console.log('3️⃣ Testing customers API...');
      const customersResponse = await fetch(`${baseUrl}/api/customers`, {
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (customersResponse.ok) {
        const customers = await customersResponse.json();
        console.log(`✅ Customers API working - Found ${customers.length} customers`);
      } else {
        console.log(`❌ Customers API failed: ${customersResponse.status}`);
      }
      
    } else {
      console.log(`❌ Login failed: ${loginResponse.status}`);
      const error = await loginResponse.text();
      console.log('Error:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n🎯 Test completed!');
};

testDeployment();