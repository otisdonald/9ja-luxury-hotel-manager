const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_STAFF_ID = 'RCP001'; // Reception Staff
const TEST_STATUS = 'break';

console.log('🧪 Testing Staff Status Functionality...\n');

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve({ status: res.statusCode, data: response });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        
        if (postData) {
            req.write(JSON.stringify(postData));
        }
        
        req.end();
    });
}

async function testStaffStatus() {
    try {
        // 1. Fetch staff list
        console.log('1️⃣ Fetching staff list...');
        const staffOptions = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/staff',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const staffResponse = await makeRequest(staffOptions);
        
        if (staffResponse.status !== 200) {
            console.log('❌ Failed to fetch staff list:', staffResponse.status);
            return;
        }

        console.log('✅ Staff list fetched successfully');
        console.log('👥 Staff count:', staffResponse.data.length);
        
        // Find test staff
        const testStaff = staffResponse.data.find(s => s.id === TEST_STAFF_ID);
        if (!testStaff) {
            console.log('❌ Test staff not found');
            return;
        }
        
        console.log('👤 Found test staff:', testStaff.name, '- Current status:', testStaff.status);

        // 2. Update staff status
        console.log('\n2️⃣ Updating staff status...');
        const updateOptions = {
            hostname: 'localhost',
            port: 3001,
            path: `/api/staff/${TEST_STAFF_ID}/status`,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const updateData = { status: TEST_STATUS };
        const updateResponse = await makeRequest(updateOptions, updateData);
        
        if (updateResponse.status !== 200) {
            console.log('❌ Failed to update staff status:', updateResponse.status);
            console.log('Response:', updateResponse.data);
            return;
        }

        console.log('✅ Staff status updated successfully');
        console.log('📝 New status:', updateResponse.data.status);

        // 3. Verify the change
        console.log('\n3️⃣ Verifying status change...');
        const verifyResponse = await makeRequest(staffOptions);
        
        if (verifyResponse.status !== 200) {
            console.log('❌ Failed to verify status change');
            return;
        }

        const updatedStaff = verifyResponse.data.find(s => s.id === TEST_STAFF_ID);
        if (!updatedStaff) {
            console.log('❌ Could not find updated staff');
            return;
        }

        if (updatedStaff.status === TEST_STATUS) {
            console.log('✅ Status change verified successfully!');
            console.log('👤', updatedStaff.name, 'is now:', updatedStaff.status);
        } else {
            console.log('❌ Status change not reflected');
            console.log('Expected:', TEST_STATUS, 'Got:', updatedStaff.status);
        }

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

// Run the test
testStaffStatus();