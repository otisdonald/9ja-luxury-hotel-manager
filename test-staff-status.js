const fetch = require('node-fetch');

// Test script to verify staff status functionality
async function testStaffStatus() {
    const baseUrl = 'http://localhost:3001';
    
    try {
        console.log('🧪 Testing Staff Status Functionality...\n');
        
        // First, get the staff list
        console.log('1️⃣ Fetching staff list...');
        const staffResponse = await fetch(`${baseUrl}/api/staff`, {
            headers: {
                'Authorization': 'Bearer eyJpZCI6MSwibmFtZSI6IkhvdGVsIERpcmVjdG9yIiwicG9zaXRpb24iOiJkaXJlY3RvciIsInBlcm1pc3Npb25zIjp7InJvb21zIjp0cnVlLCJjdXN0b21lcnMiOnRydWUsImJhciI6dHJ1ZSwia2l0Y2hlbiI6dHJ1ZSwicGF5bWVudHMiOnRydWUsInJlcG9ydHMiOnRydWUsInN0YWZmIjp0cnVlLCJzZXR0aW5ncyI6dHJ1ZX0sImV4cCI6MTc1OTMzNTk0NjI0N30=.446cfeb45ce6e910fc1d756f6512dba39a8297a2d257c7af3a9b875f744f2358'
            }
        });
        
        if (!staffResponse.ok) {
            throw new Error(`Staff API error: ${staffResponse.status}`);
        }
        
        const staff = await staffResponse.json();
        console.log(`✅ Found ${staff.length} staff members`);
        console.log('📋 Staff details:');
        staff.forEach(s => {
            console.log(`   - ${s.name} (ID: ${s.id}): ${s.status}`);
        });
        
        if (staff.length > 0) {
            // Test updating the first staff member's status
            const firstStaff = staff[0];
            const newStatus = firstStaff.status === 'on-duty' ? 'off-duty' : 'on-duty';
            
            console.log(`\n2️⃣ Testing status update for ${firstStaff.name} (ID: ${firstStaff.id})...`);
            console.log(`   Current status: ${firstStaff.status}`);
            console.log(`   New status: ${newStatus}`);
            
            const updateResponse = await fetch(`${baseUrl}/api/staff/${firstStaff.id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer eyJpZCI6MSwibmFtZSI6IkhvdGVsIERpcmVjdG9yIiwicG9zaXRpb24iOiJkaXJlY3RvciIsInBlcm1pc3Npb25zIjp7InJvb21zIjp0cnVlLCJjdXN0b21lcnMiOnRydWUsImJhciI6dHJ1ZSwia2l0Y2hlbiI6dHJ1ZSwicGF5bWVudHMiOnRydWUsInJlcG9ydHMiOnRydWUsInN0YWZmIjp0cnVlLCJzZXR0aW5ncyI6dHJ1ZX0sImV4cCI6MTc1OTMzNTk0NjI0N30=.446cfeb45ce6e910fc1d756f6512dba39a8297a2d257c7af3a9b875f744f2358'
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            if (!updateResponse.ok) {
                const error = await updateResponse.json();
                console.log(`❌ Update failed: ${error.error}`);
            } else {
                const result = await updateResponse.json();
                console.log('✅ Status update successful!');
                console.log(`   Updated status: ${result.staff.status}`);
                
                // Verify the update by fetching staff again
                console.log('\n3️⃣ Verifying update...');
                const verifyResponse = await fetch(`${baseUrl}/api/staff`, {
                    headers: {
                        'Authorization': 'Bearer eyJpZCI6MSwibmFtZSI6IkhvdGVsIERpcmVjdG9yIiwicG9zaXRpb24iOiJkaXJlY3RvciIsInBlcm1pc3Npb25zIjp7InJvb21zIjp0cnVlLCJjdXN0b21lcnMiOnRydWUsImJhciI6dHJ1ZSwia2l0Y2hlbiI6dHJ1ZSwicGF5bWVudHMiOnRydWUsInJlcG9ydHMiOnRydWUsInN0YWZmIjp0cnVlLCJzZXR0aW5ncyI6dHJ1ZX0sImV4cCI6MTc1OTMzNTk0NjI0N30=.446cfeb45ce6e910fc1d756f6512dba39a8297a2d257c7af3a9b875f744f2358'
                    }
                });
                
                const updatedStaff = await verifyResponse.json();
                const updatedMember = updatedStaff.find(s => s.id === firstStaff.id);
                console.log(`✅ Verification: ${updatedMember.name} status is now ${updatedMember.status}`);
            }
        }
        
        console.log('\n🎉 Staff status test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testStaffStatus();