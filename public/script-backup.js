// Hotel Manager JavaScript
console.log('Script loading...');

// Custom notification system for packaged app compatibility
function showAlert(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="closeNotification(this)">&times;</button>
    `;
    
    // Add styles if not already present
    if (!document.getElementById('notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                padding: 15px 20px;
                border-radius: 5px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                color: white;
                font-weight: bold;
                max-width: 400px;
                word-wrap: break-word;
                animation: slideIn 0.3s ease-out;
            }
            .notification-info { background-color: #2196F3; }
            .notification-success { background-color: #4CAF50; }
            .notification-warning { background-color: #FF9800; }
            .notification-error { background-color: #f44336; }
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                margin-left: 15px;
                float: right;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

function closeNotification(button) {
    const notification = button.parentNode;
    if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
    }
}

// Modal management functions
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        // Reset form if it exists
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

// Authentication check and setup
let staffToken = localStorage.getItem('staffToken');
let staffInfo = JSON.parse(localStorage.getItem('staffInfo') || '{}');

console.log('Initial token check:', staffToken ? 'Token found' : 'No token');

if (!staffToken) {
    console.log('No token found, redirecting to login');
    window.location.href = '/staff-login.html';
} else {
    console.log('Token found, verifying...');
    // Verify token validity (stay on staff portal; no admin routing here)
    verifyStaffToken();
}

// Add authorization header to all API requests
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    // Always add auth headers for API calls (except authenticate)
    if (url.startsWith('/api/') && !url.includes('/authenticate') && !url.includes('/clock')) {
        const currentToken = localStorage.getItem('staffToken');
        console.debug('🔐 API request:', url, 'with token:', currentToken ? 'present' : 'missing');
        
        if (!currentToken) {
            console.warn('⚠️ No auth token found for API call:', url);
        }
        
        // Ensure headers object exists
        options.headers = options.headers || {};
        
        // Add authorization headers
        if (currentToken) {
            options.headers['Authorization'] = `Bearer ${currentToken}`;
            options.headers['x-auth-token'] = currentToken;
        }
        
        // Ensure content-type for POST/PUT requests
        if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
            options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
        }
    }
    return originalFetch(url, options);
};

async function verifyStaffToken() {
    // Get fresh token from localStorage
    const currentToken = localStorage.getItem('staffToken');
    console.log('=== TOKEN VERIFICATION START ===');
    console.log('Token from localStorage:', currentToken);
    
    if (!currentToken) {
        console.log('No token in localStorage, redirecting to login');
        window.location.href = '/staff-login.html';
        return;
    }
    
    try {
        console.log('Making verification request to /api/staff/verify');
        console.log('Authorization header will be: Bearer', currentToken);
        
        const response = await fetch('/api/staff/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'x-auth-token': currentToken,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Verify response received:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            url: response.url
        });
        console.debug('Verify response status:', response.status);
        
        if (!response.ok) {
            console.log('Token verification failed with status:', response.status);
            const responseText = await response.text();
            console.log('Response text:', responseText);
            localStorage.removeItem('staffToken');
            localStorage.removeItem('staffInfo');
            window.location.href = '/staff-login.html';
            return;
        }
        
        const data = await response.json();
        console.log('Verification response data:', data);
        if (!data.valid) {
            console.log('Token is invalid according to server');
            localStorage.removeItem('staffToken');
            localStorage.removeItem('staffInfo');
            window.location.href = '/staff-login.html';
            return;
        }
        
        console.log('Token verified successfully for:', data.staff.name);
        // Stay on staff portal; do not route to admin here.
        // Update staff info display
        updateStaffDisplay(data.staff);
        
    } catch (error) {
        console.error('Token verification error:', error);
        localStorage.removeItem('staffToken');
        localStorage.removeItem('staffInfo');
        window.location.href = '/staff-login.html';
    }
}

function updateStaffDisplay(staff) {
    // Store staff info globally
    window.currentStaff = staff;
    
    // Add staff info to header if not exists
    if (!document.getElementById('staffInfo')) {
        const header = document.querySelector('.header');
        if (header) {
            const staffDiv = document.createElement('div');
            staffDiv.id = 'staffInfo';
            staffDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px; color: white; font-size: 0.9em;">
                    <span>👤 Welcome, ${staff.name}</span>
                    <span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 12px; font-size: 0.8em;">
                        ${staff.personalId} - ${staff.position.charAt(0).toUpperCase() + staff.position.slice(1)}
                    </span>
                    <button onclick="logoutStaff()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 12px; border-radius: 15px; cursor: pointer; font-size: 0.8em;">
                        Logout
                    </button>
                </div>
            `;
            header.appendChild(staffDiv);
        }
    }
    
    // Update UI based on permissions
    updateUIPermissions(staff);
}

// Function to update UI elements based on staff permissions
function updateUIPermissions(staff) {
    // Hide "Add Staff" button for non-directors
    const addStaffButtons = document.querySelectorAll('button[onclick="showStaffModal()"]');
    addStaffButtons.forEach(button => {
        if (staff.position === 'director') {
            button.style.display = 'inline-block';
        } else {
            button.style.display = 'none';
            // Add a message for non-directors
            if (!button.parentNode.querySelector('.permission-notice')) {
                const notice = document.createElement('div');
                notice.className = 'permission-notice';
                notice.style.cssText = 'background: #f8d7da; color: #721c24; padding: 8px 12px; border-radius: 4px; font-size: 0.9em; margin-left: 10px;';
                notice.innerHTML = '<i class="fas fa-info-circle"></i> Only the Hotel Director can add staff members';
                button.parentNode.appendChild(notice);
            }
        }
    });
    
    // Control admin dashboard button visibility (Director only)
    const adminButton = document.querySelector('button[onclick*="/admin"]');
    if (adminButton) {
        if (staff.position === 'director') {
            adminButton.style.display = 'inline-block';
        } else {
            adminButton.style.display = 'none';
        }
    }
}

function logoutStaff() {
    if (confirm('Are you sure you want to logout?')) {
        fetch('/api/staff/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${staffToken}`
            }
        }).finally(() => {
            localStorage.removeItem('staffToken');
            localStorage.removeItem('staffInfo');
            window.location.href = '/staff-login.html';
        });
    }
}

// Debug function to clear authentication (can be called from browser console)
window.clearAuth = function() {
    console.log('Clearing authentication...');
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staffInfo');
    console.log('Authentication cleared. Redirecting to login...');
    window.location.href = '/staff-login.html';
};

// Debug function to inspect and clean customer data
window.debugCustomers = function() {
    console.log('=== CUSTOMER DEBUG INFO ===');
    const localCustomers = getCustomersFromLocal() || [];
    console.log('Local customers count:', localCustomers.length);
    
    localCustomers.forEach((customer, index) => {
        const isValid = isValidCustomerId(customer.id);
        console.log(`Customer ${index}:`, {
            id: customer.id,
            name: customer.name,
            validId: isValid,
            hasRequiredFields: !!(customer.id && customer.name && customer.email)
        });
    });
    
    const cleaned = cleanupCustomerData();
    console.log('After cleanup:', cleaned.length);
    console.log('=== END DEBUG ===');
    
    return {
        original: localCustomers.length,
        cleaned: cleaned.length,
        removed: localCustomers.length - cleaned.length
    };
};

document.addEventListener('DOMContentLoaded', function() {
    window.addEventListener('error', function(e) {
        console.error('Global error:', e.message, e.filename, e.lineno);
    });
    console.log('DOM loaded, initializing...');
    
    // Add keyboard shortcut for logout (Ctrl+L)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            logoutStaff();
        }
    });
    
    // Tab switching functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            console.log('Tab clicked:', targetTab);
            
            // Remove active class from all tabs and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            btn.classList.add('active');
            const targetElement = document.getElementById(targetTab);
            console.log('Target element found:', targetElement);
            
            if (targetElement) {
                targetElement.classList.add('active');
                console.log('Active class added to:', targetTab);
            } else {
                console.error('Target element not found:', targetTab);
            }
            
            // Load content for the selected tab
            loadTabContent(targetTab);
        });
    });
    
    // Load initial content
    console.log('Loading initial content...');
    loadTabContent('rooms');
    setupModalEventListeners();
    setupKitchenTabs(); // Add kitchen tab functionality
    updateBadgeCounts();
    
    // Control admin dashboard button visibility on page load
    const staffInfo = JSON.parse(localStorage.getItem('staffInfo') || '{}');
    const adminButton = document.querySelector('button[onclick*="/admin"]');
    if (adminButton) {
        if (staffInfo.position === 'director') {
            adminButton.style.display = 'inline-block';
        } else {
            adminButton.style.display = 'none';
        }
    }
    
    // Debug: Check if elements exist
    console.log('Tab buttons found:', document.querySelectorAll('.tab-btn').length);
    console.log('Tab contents found:', document.querySelectorAll('.tab-content').length);
    console.log('Rooms tab element:', document.getElementById('rooms'));
});

// Global refresh function
function refreshAllData() {
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    loadTabContent(activeTab);
    updateBadgeCounts();
    
    // Show refresh feedback
    const refreshBtn = event.target.closest('.btn');
    const originalText = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    refreshBtn.disabled = true;
    
    setTimeout(() => {
        refreshBtn.innerHTML = originalText;
        refreshBtn.disabled = false;
    }, 1000);
}

// Helper to compare IDs (string-safe)
function idEq(a, b) {
    if (a === undefined || b === undefined) return false;
    return String(a) === String(b);
}

// Update badge counts
async function updateBadgeCounts() {
    try {
        const [rooms, customers] = await Promise.all([
            fetch('/api/rooms').then(r => r.json()),
            fetch('/api/customers').then(r => r.json())
        ]);
        
        const roomsCount = document.getElementById('roomsCount');
        const customersCount = document.getElementById('customersCount');
        
        if (roomsCount) {
            const occupiedCount = rooms.filter(r => r.status === 'occupied').length;
            roomsCount.textContent = `${rooms.length} Rooms (${occupiedCount} Occupied)`;
        }
        
        if (customersCount) {
            customersCount.textContent = `${customers.length} Customers`;
        }
    } catch (error) {
        console.error('Error updating badge counts:', error);
    }
}

// Load content based on active tab
async function loadTabContent(tab) {
    switch(tab) {
        case 'rooms':
            await loadRooms();
            break;
        case 'customers':
            await loadCustomers();
            break;
        case 'bar':
            await loadBarInventory();
            break;
        case 'kitchen':
            await loadKitchenInventory();
            await loadKitchenOrders();
            await updateKitchenOverview();
            break;
        case 'reports':
            await loadPoliceReports();
            break;
        case 'payments':
            await loadPayments();
            break;
        case 'notifications':
            await loadNotifications();
            break;
        case 'staff':
            await loadStaff();
            await loadCurrentStaffStatus();
            break;
        case 'housekeeping':
            await loadHousekeeping();
            break;
        case 'analytics':
            await loadAnalytics();
            break;
        case 'services':
            await loadServices();
            break;
        case 'communication':
            await loadCommunication();
            break;
            case 'laundry':
                await loadLaundryTasks();
                break;
            case 'scanpay':
                await loadScanPayOrders();
                break;
            case 'hr':
                await loadHRRecords();
                break;
            case 'stock':
                await loadStockItems();
                break;
            case 'messaging':
                await loadAutomatedMessages();
                break;
            case 'locations':
                await loadLocationBranches();
                break;
    }
}

// Enhanced Rooms Management
async function loadRooms() {
    try {
        console.log('🏠 Loading rooms...');
        const token = localStorage.getItem('staffToken');
        console.log('🔑 Auth token available:', !!token);
        
        const response = await fetch('/api/rooms', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 Rooms API response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const rooms = await response.json();
        console.log('✅ Loaded rooms:', rooms.length);
        
        const roomsGrid = document.getElementById('roomsGrid');
        roomsGrid.innerHTML = '';
        
        rooms.forEach(room => {
            const roomCard = document.createElement('div');
            roomCard.className = 'room-card';
            roomCard.innerHTML = `
                <div class="room-header">
                    <div>
                        <div class="room-name">${room.name}</div>
                        <div class="room-type">${room.type}</div>
                    </div>
                    <span class="room-status ${room.status}">${room.status}</span>
                </div>
                <div class="room-price">₦${room.price.toLocaleString()}</div>
                ${room.currentGuest ? `<div class="room-guest">
                    <i class="fas fa-user"></i> Guest: Customer #${room.currentGuest}
                </div>` : '<div class="room-guest"><i class="fas fa-bed"></i> Available for booking</div>'}
                <div class="room-actions">
                    <button class="btn btn-small btn-secondary" onclick="changeRoomStatus('${room.id}')" title="Change Status">
                        <i class="fas fa-edit"></i> Status
                    </button>
                    ${room.status === 'occupied' ? 
                        `<button class="btn btn-small btn-success" onclick="checkoutRoom('${room.id}')" title="Checkout Guest">
                            <i class="fas fa-sign-out-alt"></i> Checkout
                        </button>
                        <button class="btn btn-small btn-danger" onclick="cancelBooking('${room.id}')" title="Cancel Booking">
                            <i class="fas fa-times"></i> Cancel
                        </button>` : 
                        `<button class="btn btn-small btn-primary" onclick="showBookingModal('${room.id}')" title="Book Room">
                            <i class="fas fa-calendar-plus"></i> Book
                        </button>`
                    }
                    <button class="btn btn-small btn-secondary" onclick="viewRoomDetails('${room.id}')" title="View Details">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
            `;
            roomsGrid.appendChild(roomCard);
        });
        
        // Update badge count
        const occupiedCount = rooms.filter(r => r.status === 'occupied').length;
        const roomsCountBadge = document.getElementById('roomsCount');
        if (roomsCountBadge) {
            roomsCountBadge.textContent = `${rooms.length} Rooms (${occupiedCount} Occupied)`;
        }
        
    } catch (error) {
        console.error('Error loading rooms:', error);
        showNotification('Error loading rooms', 'error');
    }
}

// View room details
function viewRoomDetails(roomId) {
    // This could open a detailed modal with room information
    fetch(`/api/rooms`)
        .then(response => response.json())
        .then(rooms => {
            const room = rooms.find(r => idEq(r.id, roomId));
            if (room) {
                alert(`Room Details:\n\nRoom: ${room.name}\nType: ${room.type}\nStatus: ${room.status}\nPrice: ₦${room.price}/night\n${room.currentGuest ? `Guest: Customer #${room.currentGuest}` : 'No current guest'}`);
            }
        })
        .catch(error => {
            console.error('Error loading room details:', error);
            showNotification('Error loading room details', 'error');
        });
}

// Show notification helper
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Enhanced Customer Management
// Local Storage Persistence Functions
function saveCustomersToLocal(customers) {
    try {
        localStorage.setItem('hotelCustomers', JSON.stringify(customers));
        console.log('✅ Customers saved to localStorage');
    } catch (error) {
        console.error('❌ Failed to save customers to localStorage:', error);
    }
}

function getCustomersFromLocal() {
    try {
        const stored = localStorage.getItem('hotelCustomers');
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('❌ Failed to load customers from localStorage:', error);
        return null;
    }
}

function clearLocalCustomers() {
    localStorage.removeItem('hotelCustomers');
    console.log('🗑️ Local customers cleared');
}

// Kitchen Items Local Storage Functions
function saveKitchenItemsToLocal(items) {
    try {
        localStorage.setItem('hotelKitchenItems', JSON.stringify(items));
        console.log('✅ Kitchen items saved to localStorage');
    } catch (error) {
        console.error('❌ Failed to save kitchen items to localStorage:', error);
    }
}

function getKitchenItemsFromLocal() {
    try {
        const items = localStorage.getItem('hotelKitchenItems');
        return items ? JSON.parse(items) : null;
    } catch (error) {
        console.error('❌ Failed to get kitchen items from localStorage:', error);
        return null;
    }
}

// Kitchen Orders Local Storage Functions
function saveKitchenOrdersToLocal(orders) {
    try {
        localStorage.setItem('hotelKitchenOrders', JSON.stringify(orders));
        console.log('✅ Kitchen orders saved to localStorage');
    } catch (error) {
        console.error('❌ Failed to save kitchen orders to localStorage:', error);
    }
}

function getKitchenOrdersFromLocal() {
    try {
        const orders = localStorage.getItem('hotelKitchenOrders');
        return orders ? JSON.parse(orders) : null;
    } catch (error) {
        console.error('❌ Failed to get kitchen orders from localStorage:', error);
        return null;
    }
}

// Rooms Local Storage Functions
function saveRoomsToLocal(rooms) {
    try {
        localStorage.setItem('hotelRooms', JSON.stringify(rooms));
        console.log('✅ Rooms saved to localStorage');
    } catch (error) {
        console.error('❌ Failed to save rooms to localStorage:', error);
    }
}

function getRoomsFromLocal() {
    try {
        const rooms = localStorage.getItem('hotelRooms');
        return rooms ? JSON.parse(rooms) : null;
    } catch (error) {
        console.error('❌ Failed to get rooms from localStorage:', error);
        return null;
    }
}

async function loadCustomers() {
    try {
        console.log('👥 Loading customers...');
        const token = localStorage.getItem('staffToken');
        
        const response = await fetch('/api/customers', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        let customers = await response.json();
        
        // Clean up any invalid local data first
        const cleanedLocalCustomers = cleanupCustomerData();
        
        // Check if we're in offline mode and have valid local customers
        if (cleanedLocalCustomers && cleanedLocalCustomers.length > 0) {
            // Merge server customers with local customers, prioritizing local changes
            const serverIds = customers.map(c => c.id);
            const newLocalCustomers = cleanedLocalCustomers.filter(c => !serverIds.includes(c.id));
            customers = [...customers, ...newLocalCustomers];
            console.log(`📱 Merged ${newLocalCustomers.length} local customers with server data`);
        }
        
        // Save merged data to local storage
        saveCustomersToLocal(customers);
        
        console.log('✅ Loaded customers:', customers.length);
        
        const tableBody = document.querySelector('#customersTable tbody');
        if (!tableBody) {
            console.error('Customer table body not found in DOM');
            return;
        }
        
        tableBody.innerHTML = '';
        
        customers.forEach((customer, index) => {
            if (!customer.id) {
                console.warn('Customer missing ID at index:', index, customer);
                customer.id = `temp_${Date.now()}_${index}`;
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td title="Customer ID: ${customer.id}">${customer.id.substring(0, 8)}...</td>
                <td>${customer.name || 'N/A'}</td>
                <td>${customer.email || 'N/A'}</td>
                <td>${customer.phone || 'N/A'}</td>
                <td>
                    <button class="btn btn-primary" onclick="editCustomer('${customer.id}')" title="Edit Customer">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteCustomer('${customer.id}')" title="Delete Customer">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Update customer selects in modals
        updateCustomerSelects(customers);
    } catch (error) {
        console.error('Error loading customers:', error);
        
        // Fall back to local storage if API fails
        const localCustomers = getCustomersFromLocal();
        if (localCustomers && localCustomers.length > 0) {
            console.log('📱 Loading customers from localStorage');
            
            const tableBody = document.querySelector('#customersTable tbody');
            tableBody.innerHTML = '';
            
            localCustomers.forEach(customer => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${customer.id}</td>
                    <td>${customer.name}</td>
                    <td>${customer.email}</td>
                    <td>${customer.phone}</td>
                    <td>
                        <button class="btn btn-primary" onclick="editCustomer('${customer.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deleteCustomer('${customer.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            updateCustomerSelects(localCustomers);
            showAlert('Loaded customers from local storage', 'info');
        } else {
            showAlert('Unable to load customers. Check your connection.', 'error');
        }
    }
}

// Bar Inventory Management
async function loadBarInventory() {
    try {
        const response = await fetch('/api/bar/inventory');
        const inventory = await response.json();
        
        const inventoryGrid = document.getElementById('barInventory');
        inventoryGrid.innerHTML = '';
        
        inventory.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = 'inventory-item';
            itemCard.innerHTML = `
                <div class="item-category">${item.category}</div>
                <h4>${item.name}</h4>
                <p><strong>Price:</strong> ₦${item.price}</p>
                <p><strong>Stock:</strong> ${item.stock}</p>
                <div class="item-actions">
                    <button class="btn btn-warning" onclick="updateStock('${item.id}')">
                        <i class="fas fa-edit"></i> Update Stock
                    </button>
                    <button class="btn btn-danger" onclick="removeBarItem('${item.id}')">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            `;
            inventoryGrid.appendChild(itemCard);
        });
    } catch (error) {
        console.error('Error loading bar inventory:', error);
    }
}

// Update stock for bar item
async function updateStock(itemId) {
    try {
        // Find the item details first
        const response = await fetch('/api/bar/inventory');
        const inventory = await response.json();
        const item = inventory.find(i => i.id == itemId || i._id == itemId);
        
        if (!item) {
            showNotification('Item not found', 'error');
            return;
        }
        
        // Populate modal with item details
        document.getElementById('updateStockItemName').value = item.name;
        document.getElementById('updateStockCurrentStock').value = item.stock;
        document.getElementById('updateStockNewStock').value = item.stock;
        
        // Store the item ID for form submission
        document.getElementById('updateStockForm').dataset.itemId = itemId;
        
        // Show the modal
        const modal = document.getElementById('updateStockModal');
        modal.style.display = 'flex';
        modal.classList.add('show');
        
        // Focus on first input after a short delay
        setTimeout(() => {
            const firstInput = modal.querySelector('input, select');
            if (firstInput) firstInput.focus();
        }, 100);
        
    } catch (error) {
        console.error('Error preparing stock update:', error);
        showNotification('Error loading item details', 'error');
    }
}

// Handle stock update form submission
async function handleUpdateStockSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const itemId = form.dataset.itemId;
    const newStock = parseInt(document.getElementById('updateStockNewStock').value);
    
    if (isNaN(newStock) || newStock < 0) {
        showNotification('Please enter a valid stock number', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/bar/inventory/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            },
            body: JSON.stringify({ stock: newStock })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Stock updated successfully', 'success');
            closeModal('updateStockModal');
            loadBarInventory(); // Refresh the inventory display
        } else {
            showNotification(data.error || 'Failed to update stock', 'error');
        }
    } catch (error) {
        console.error('Error updating stock:', error);
        showNotification('Error updating stock', 'error');
    }
}

// Remove bar item
async function removeBarItem(itemId) {
    if (!confirm('Are you sure you want to remove this item from inventory?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/bar/inventory/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Item removed successfully', 'success');
            loadBarInventory(); // Refresh the inventory display
        } else {
            showNotification(data.error || 'Failed to remove item', 'error');
        }
    } catch (error) {
        console.error('Error removing item:', error);
        showNotification('Error removing item', 'error');
    }
}

// Kitchen Orders Management
async function loadKitchenOrders() {
    try {
        const response = await fetch('/api/kitchen/orders');
        const orders = await response.json();
        
        const ordersContainer = document.getElementById('kitchenOrders');
        ordersContainer.innerHTML = '';
        
        orders.forEach(order => {
            const orderCard = document.createElement('div');
            orderCard.className = 'order-card';
            orderCard.innerHTML = `
                <div>
                    <h4>Order #${order.id}</h4>
                    <p><strong>Customer:</strong> ${order.customerId}</p>
                    <p><strong>Type:</strong> ${order.type}</p>
                    <p><strong>Items:</strong> ${order.items}</p>
                    <p><strong>Created:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div>
                    <span class="order-status status-${order.status}">${order.status}</span>
                    <button class="btn btn-success" onclick="updateOrderStatus('${order.id}')">
                        <i class="fas fa-check"></i> Update Status
                    </button>
                    <button class="btn btn-danger" onclick="deleteKitchenOrder('${order.id}')">
                        <i class="fas fa-trash"></i> Cancel Order
                    </button>
                </div>
            `;
            ordersContainer.appendChild(orderCard);
        });
    } catch (error) {
        console.error('Error loading kitchen orders:', error);
    }
}

// Enhanced Kitchen Management Functions
async function loadKitchenInventory() {
    try {
        console.log('📦 Loading kitchen inventory...');
        const response = await fetch('/api/kitchen/inventory');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const inventory = await response.json();
        console.log('📦 Received', inventory.length, 'kitchen items');
        console.log('📦 Sample item:', inventory[0]); // Debug: Log first item structure
        
        const tableBody = document.querySelector('#kitchenInventoryTable');
        if (tableBody) {
            tableBody.innerHTML = '';
            
            if (inventory.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No kitchen inventory items found</td></tr>';
                return;
            }
            
            try {
                inventory.forEach(item => {
                    try {
                        console.log('Processing item:', item); // Debug individual item
                        
                        // Extract the actual ID from Mongoose document
                        const itemId = item._id || item.id || (item._doc && item._doc._id) || '';
                        console.log('Extracted ID:', itemId); // Debug ID extraction
                        
                        // Ensure all values are valid numbers with extra safety
                        const currentStock = isNaN(Number(item.currentStock)) ? 0 : Number(item.currentStock);
                        const costPerUnit = isNaN(Number(item.costPerUnit)) ? 0 : Number(item.costPerUnit);
                        const minStock = isNaN(Number(item.minStock)) ? 0 : Number(item.minStock);
                        const totalValue = currentStock * costPerUnit;
                        
                        // Validate that totalValue and costPerUnit are safe for toFixed
                        const safeCostPerUnit = isFinite(costPerUnit) ? costPerUnit : 0;
                        const safeTotalValue = isFinite(totalValue) ? totalValue : 0;
                        
                        const stockStatus = getStockStatus(currentStock, minStock);
                        
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${item.name || 'N/A'}</td>
                            <td>${item.category || 'N/A'}</td>
                            <td>${currentStock}</td>
                            <td>${item.unit || 'N/A'}</td>
                            <td>₦${safeCostPerUnit.toFixed(2)}</td>
                            <td>₦${safeTotalValue.toFixed(2)}</td>
                            <td>${minStock}</td>
                            <td><span class="stock-status ${stockStatus.class}">${stockStatus.text}</span></td>
                            <td>
                                <button class="btn btn-primary btn-sm" onclick="editKitchenItem('${itemId}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-warning btn-sm" onclick="adjustStock('${itemId}')">
                                    <i class="fas fa-plus-minus"></i>
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="deleteKitchenItem('${itemId}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        `;
                        tableBody.appendChild(row);
                    } catch (itemProcessError) {
                        console.error('Error processing individual item:', itemProcessError, item);
                        // Continue processing other items instead of breaking the whole loop
                    }
                });
            } catch (itemError) {
                console.error('Error processing kitchen inventory item:', itemError);
                tableBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error displaying inventory items</td></tr>';
            }
        }
        
        // Update overview stats
        updateKitchenOverview(inventory);
    } catch (error) {
        console.error('Error loading kitchen inventory:', error);
    }
}

function getStockStatus(currentStock, minStock) {
    if (currentStock <= minStock) {
        return { class: 'low', text: 'Low Stock' };
    } else if (currentStock <= minStock * 2) {
        return { class: 'medium', text: 'Medium' };
    } else {
        return { class: 'good', text: 'Good' };
    }
}

async function deleteKitchenItem(itemId) {
    if (confirm('Are you sure you want to delete this kitchen inventory item?')) {
        try {
            const response = await fetch(`/api/kitchen/inventory/${itemId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadKitchenInventory();
                showAlert('Kitchen item deleted successfully!', 'success');
            } else {
                throw new Error('API request failed');
            }
        } catch (error) {
            console.error('Error deleting kitchen item via API, removing locally:', error);
            
            // Remove from local storage as fallback
            let localItems = getKitchenItemsFromLocal() || [];
            localItems = localItems.filter(item => item.id != itemId);
            saveKitchenItemsToLocal(localItems);
            
            loadKitchenInventory();
            showAlert('Kitchen item removed locally!', 'warning');
        }
    }
}

async function updateKitchenOverview(inventory = null) {
    try {
        // Get today's costs
        const todayCosts = await fetch('/api/kitchen/costs/today');
        const todayData = await todayCosts.json();
        
        // Get monthly budget
        const monthlyBudget = await fetch('/api/kitchen/budget/month');
        const budgetData = await monthlyBudget.json();
        
        // Calculate low stock items
        if (!inventory) {
            const inventoryResponse = await fetch('/api/kitchen/inventory');
            inventory = await inventoryResponse.json();
        }
        
        const lowStockItems = inventory.filter(item => item.currentStock <= item.minStock);
        
        // Update overview cards
        document.getElementById('todayCosts').textContent = `₦${todayData.total?.toFixed(2) || '0.00'}`;
        document.getElementById('monthlyBudget').textContent = `₦${budgetData.budget?.toFixed(2) || '0.00'}`;
        document.getElementById('lowStockCount').textContent = lowStockItems.length;
        
    } catch (error) {
        console.error('Error updating kitchen overview:', error);
    }
}

async function loadPurchaseHistory() {
    try {
        const response = await fetch('/api/kitchen/purchases');
        const purchases = await response.json();
        
        const tableBody = document.querySelector('#purchaseHistoryTable');
        if (tableBody) {
            tableBody.innerHTML = '';
            
            purchases.forEach(purchase => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${new Date(purchase.date).toLocaleDateString()}</td>
                    <td>${purchase.supplier}</td>
                    <td>${purchase.itemCount} items</td>
                    <td>₦${purchase.totalCost.toFixed(2)}</td>
                    <td>${purchase.paymentMethod}</td>
                    <td><span class="status-badge status-${purchase.status}">${purchase.status}</span></td>
                    <td>
                        <button class="btn btn-info btn-sm" onclick="viewPurchaseDetails('${purchase.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading purchase history:', error);
    }
}

async function loadCostAnalysis() {
    try {
        const period = document.getElementById('costPeriod').value;
        const response = await fetch(`/api/kitchen/analysis/${period}`);
        const analysis = await response.json();
        
        // Update cost summary cards
        document.getElementById('totalPurchases').textContent = `₦${analysis.totalPurchases?.toFixed(2) || '0.00'}`;
        document.getElementById('foodCostPercentage').textContent = `${analysis.foodCostPercentage?.toFixed(1) || '0'}%`;
        document.getElementById('wasteCost').textContent = `₦${analysis.wasteCost?.toFixed(2) || '0.00'}`;
        document.getElementById('avgDailyCost').textContent = `₦${analysis.avgDailyCost?.toFixed(2) || '0.00'}`;
        
        // Update cost chart
        updateCostChart(analysis.chartData);
        
    } catch (error) {
        console.error('Error loading cost analysis:', error);
    }
}

function updateCostChart(chartData) {
    const ctx = document.getElementById('costChart')?.getContext('2d');
    if (!ctx || !chartData) return;
    
    // Destroy existing chart if it exists
    if (window.kitchenCostChart) {
        window.kitchenCostChart.destroy();
    }
    
    window.kitchenCostChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels || [],
            datasets: [{
                label: 'Daily Costs',
                data: chartData.costs || [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Kitchen Cost Trends'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₦' + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}

// Kitchen Tab Management
function setupKitchenTabs() {
    document.querySelectorAll('.kitchen-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all tabs and content
            document.querySelectorAll('.kitchen-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.kitchen-tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            btn.classList.add('active');
            
            // Show corresponding content
            const tabName = btn.getAttribute('data-kitchen-tab');
            const content = document.getElementById(`kitchen-${tabName}`);
            if (content) {
                content.classList.add('active');
                
                // Load data for the active tab
                switch(tabName) {
                    case 'inventory':
                        loadKitchenInventory();
                        break;
                    case 'orders':
                        loadKitchenOrders();
                        break;
                    case 'purchases':
                        loadPurchaseHistory();
                        break;
                    case 'costs':
                        loadCostAnalysis();
                        break;
                }
            }
        });
    });
}

// Modal Functions
function showKitchenItemModal() {
    const modal = document.getElementById('kitchenItemModal');
    const form = document.getElementById('kitchenItemForm');
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Reset form for adding new item
    form.removeAttribute('data-edit-id');
    submitButton.textContent = 'Add Item';
    form.reset();
    
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('input');
        if (firstInput) firstInput.focus();
    }, 100);
}

function showPurchaseModal() {
    const modal = document.getElementById('purchaseModal');
    loadKitchenItemsForPurchase();
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('input');
        if (firstInput) firstInput.focus();
    }, 100);
}

async function loadKitchenItemsForPurchase() {
    try {
        const response = await fetch('/api/kitchen/inventory');
        const items = await response.json();
        
        const selects = document.querySelectorAll('select[name="itemName[]"]');
        selects.forEach(select => {
            select.innerHTML = '<option value="">Select Item</option>';
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.name;
                option.textContent = `${item.name} (${item.unit})`;
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error loading items for purchase:', error);
    }
}

function addPurchaseItem() {
    const container = document.getElementById('purchaseItemsList');
    const newRow = document.createElement('div');
    newRow.className = 'purchase-item-row';
    newRow.innerHTML = `
        <select name="itemName[]" required>
            <option value="">Select Item</option>
        </select>
        <input type="number" name="quantity[]" placeholder="Quantity" step="0.01" required>
        <input type="number" name="unitCost[]" placeholder="Cost per Unit" step="0.01" required>
        <input type="number" name="total[]" placeholder="Total" step="0.01" readonly>
        <button type="button" class="btn btn-danger btn-sm" onclick="removePurchaseItem(this)">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(newRow);
    
    // Load items for the new select
    loadKitchenItemsForPurchase();
    
    // Add event listeners for calculation
    setupPurchaseCalculation(newRow);
}

function removePurchaseItem(button) {
    button.closest('.purchase-item-row').remove();
    calculatePurchaseTotal();
}

function setupPurchaseCalculation(row) {
    const quantityInput = row.querySelector('input[name="quantity[]"]');
    const unitCostInput = row.querySelector('input[name="unitCost[]"]');
    const totalInput = row.querySelector('input[name="total[]"]');
    
    [quantityInput, unitCostInput].forEach(input => {
        input.addEventListener('input', () => {
            const quantity = parseFloat(quantityInput.value) || 0;
            const unitCost = parseFloat(unitCostInput.value) || 0;
            const total = quantity * unitCost;
            totalInput.value = total.toFixed(2);
            calculatePurchaseTotal();
        });
    });
}

function calculatePurchaseTotal() {
    const totalInputs = document.querySelectorAll('input[name="total[]"]');
    let grandTotal = 0;
    
    totalInputs.forEach(input => {
        grandTotal += parseFloat(input.value) || 0;
    });
    
    document.getElementById('purchaseTotalAmount').textContent = grandTotal.toFixed(2);
}

// Kitchen Item Form Handler
async function handleKitchenItemSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const editId = form.getAttribute('data-edit-id');
    const isEditing = !!editId;
    
    const formData = new FormData(e.target);
    const itemData = {
        name: formData.get('name'),
        category: formData.get('category'), // This should match the enum values in the model
        unit: formData.get('unit'), // This should match the enum values in the model
        minStock: parseInt(formData.get('minimumStock')) || 0, // Fixed field name to match model
        currentStock: parseInt(formData.get('currentStock')) || 0, // Fixed field name to match model
        costPerUnit: parseFloat(formData.get('costPerUnit')) || 0,
        supplier: formData.get('supplier') || '' // Add supplier field
    };
    
    console.log(isEditing ? 'Updating kitchen item:' : 'Creating kitchen item:', itemData); // Debug log
    
    try {
        const url = isEditing ? `/api/kitchen/inventory/${editId}` : '/api/kitchen/inventory';
        const method = isEditing ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            },
            body: JSON.stringify(itemData)
        });
        
        if (response.ok) {
            const successMessage = isEditing ? 'Kitchen item updated successfully!' : 'Kitchen item added successfully!';
            showAlert(successMessage, 'success');
            closeModal('kitchenItemModal');
            
            // Reset form state
            form.removeAttribute('data-edit-id');
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.textContent = 'Add Item';
            form.reset();
            
            loadKitchenInventory();
        } else {
            const error = await response.json();
            const errorMessage = isEditing ? 'Failed to update kitchen item' : 'Failed to add kitchen item';
            showAlert(error.message || errorMessage, 'error');
        }
    } catch (error) {
        console.error('Error with kitchen item:', error);
        const errorMessage = isEditing ? 'Error updating kitchen item' : 'Error adding kitchen item';
        showAlert(errorMessage, 'error');
    }
}

// Purchase Form Handler
async function handlePurchaseSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    // Get all item data
    const itemNames = formData.getAll('itemName[]');
    const quantities = formData.getAll('quantity[]');
    const unitCosts = formData.getAll('unitCost[]');
    const totals = formData.getAll('total[]');
    
    const items = [];
    for (let i = 0; i < itemNames.length; i++) {
        if (itemNames[i] && quantities[i] && unitCosts[i]) {
            items.push({
                name: itemNames[i],
                quantity: parseFloat(quantities[i]),
                unitCost: parseFloat(unitCosts[i]),
                total: parseFloat(totals[i])
            });
        }
    }
    
    if (items.length === 0) {
        showAlert('Please add at least one item to the purchase', 'error');
        return;
    }
    
    const purchaseData = {
        supplier: formData.get('supplier'),
        date: formData.get('date'),
        paymentMethod: formData.get('paymentMethod'),
        invoiceNumber: formData.get('invoiceNumber'),
        items: items,
        totalAmount: items.reduce((sum, item) => sum + item.total, 0)
    };
    
    try {
        const response = await fetch('/api/kitchen/purchases', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            },
            body: JSON.stringify(purchaseData)
        });
        
        if (response.ok) {
            showAlert('Purchase recorded successfully!', 'success');
            closeModal('purchaseModal');
            loadKitchenInventory();
            e.target.reset();
            
            // Reset purchase items to just one row
            const itemsList = document.getElementById('purchaseItemsList');
            const firstRow = itemsList.querySelector('.purchase-item-row');
            itemsList.innerHTML = '';
            itemsList.appendChild(firstRow);
            if (firstRow) {
                firstRow.querySelectorAll('input, select').forEach(input => input.value = '');
            }
            calculatePurchaseTotal();
        } else {
            const error = await response.json();
            showAlert(error.message || 'Failed to record purchase', 'error');
        }
    } catch (error) {
        console.error('Error recording purchase:', error);
        showAlert('Error recording purchase', 'error');
    }
}

async function generateCostReport() {
    try {
        const period = document.getElementById('costPeriod').value;
        const response = await fetch(`/api/kitchen/report/${period}`);
        const report = await response.json();
        
        // Create and download report
        const reportContent = generateReportContent(report);
        downloadReport(reportContent, `kitchen-cost-report-${period}-${new Date().toISOString().split('T')[0]}.txt`);
        
        showAlert('Cost report generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating cost report:', error);
        showAlert('Error generating cost report', 'error');
    }
}

// Missing Kitchen Functions
function viewPurchaseDetails(purchaseId) {
    try {
        // Find the purchase from the purchases list
        const purchaseRows = document.querySelectorAll('#kitchenPurchases .purchase-row');
        let purchaseData = null;
        
        purchaseRows.forEach(row => {
            const id = row.getAttribute('data-purchase-id');
            if (id === purchaseId) {
                const cells = row.querySelectorAll('td');
                purchaseData = {
                    id: purchaseId,
                    date: cells[0]?.textContent || '',
                    supplier: cells[1]?.textContent || '',
                    items: cells[2]?.textContent || '',
                    cost: cells[3]?.textContent || '',
                    status: cells[4]?.textContent || ''
                };
            }
        });
        
        if (purchaseData) {
            // Show purchase details in a modal or alert
            const details = `Purchase Details:
Date: ${purchaseData.date}
Supplier: ${purchaseData.supplier}
Items: ${purchaseData.items}
Total Cost: ${purchaseData.cost}
Status: ${purchaseData.status}`;
            
            showAlert(details, 'info');
        } else {
            showAlert('Purchase details not found', 'error');
        }
    } catch (error) {
        console.error('Error viewing purchase details:', error);
        showAlert('Error loading purchase details', 'error');
    }
}

function editKitchenItem(itemId) {
    try {
        console.log('Editing kitchen item with ID:', itemId);
        
        // Find the item from the current inventory table
        const tableRows = document.querySelectorAll('#kitchenInventoryTable tr');
        let itemData = null;
        
        tableRows.forEach(row => {
            const deleteButton = row.querySelector(`button[onclick*="deleteKitchenItem('${itemId}')"]`);
            if (deleteButton) {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 8) {
                    itemData = {
                        id: itemId,
                        name: cells[0]?.textContent || '',
                        category: cells[1]?.textContent || '',
                        currentStock: cells[2]?.textContent || '',
                        unit: cells[3]?.textContent || '',
                        costPerUnit: cells[4]?.textContent.replace(/[₦$,]/g, '') || '',
                        minStock: cells[6]?.textContent || ''
                    };
                }
            }
        });
        
        if (itemData) {
            console.log('Found item data for editing:', itemData);
            
            // Pre-fill the kitchen item form with existing data
            document.getElementById('kitchenItemName').value = itemData.name;
            document.getElementById('kitchenItemCategory').value = itemData.category;
            document.getElementById('kitchenItemStock').value = itemData.currentStock;
            document.getElementById('kitchenItemUnit').value = itemData.unit;
            document.getElementById('kitchenItemCost').value = itemData.costPerUnit;
            document.getElementById('kitchenItemMinStock').value = itemData.minStock;
            
            // Change form to edit mode
            const form = document.getElementById('kitchenItemForm');
            const submitButton = form.querySelector('button[type="submit"]');
            
            // Store the item ID for updating
            form.setAttribute('data-edit-id', itemId);
            submitButton.textContent = 'Update Item';
            
            // Show the modal
            showKitchenItemModal();
        } else {
            console.error('Could not find item data for ID:', itemId);
            showAlert('Could not find item to edit', 'error');
        }
    } catch (error) {
        console.error('Error in editKitchenItem:', error);
        showAlert('Error opening edit form', 'error');
    }
}

function adjustStock(itemId) {
    try {
        console.log('Adjusting stock for item ID:', itemId);
        
        // Find the item from the current inventory table
        const tableRows = document.querySelectorAll('#kitchenInventoryTable tr');
        let itemData = null;
        
        tableRows.forEach(row => {
            const deleteButton = row.querySelector(`button[onclick*="deleteKitchenItem('${itemId}')"]`);
            if (deleteButton) {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 8) {
                    itemData = {
                        id: itemId,
                        name: cells[0]?.textContent || '',
                        currentStock: parseFloat(cells[2]?.textContent) || 0,
                        unit: cells[3]?.textContent || ''
                    };
                }
            }
        });
        
        if (itemData) {
            const adjustment = prompt(`Adjust stock for ${itemData.name}\nCurrent quantity: ${itemData.currentStock} ${itemData.unit}\nEnter adjustment (+/- amount):`);
            
            if (adjustment !== null && adjustment.trim() !== '') {
                const adjustmentValue = parseFloat(adjustment);
                if (!isNaN(adjustmentValue)) {
                    const newQuantity = Math.max(0, itemData.currentStock + adjustmentValue);
                    
                    // Make API call to update the stock
                    updateKitchenItemStock(itemId, newQuantity);
                } else {
                    showAlert('Please enter a valid number', 'error');
                }
            }
        } else {
            console.error('Could not find item data for ID:', itemId);
            showAlert('Could not find item to adjust', 'error');
        }
    } catch (error) {
        console.error('Error in adjustStock:', error);
        showAlert('Error adjusting stock', 'error');
    }
}

// Helper function to update stock via API
async function updateKitchenItemStock(itemId, newStock) {
    try {
        const response = await fetch(`/api/kitchen/inventory/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            },
            body: JSON.stringify({ currentStock: newStock })
        });
        
        if (response.ok) {
            showAlert('Stock updated successfully!', 'success');
            loadKitchenInventory(); // Refresh the inventory display
        } else {
            throw new Error('Failed to update stock');
        }
    } catch (error) {
        console.error('Error updating stock:', error);
        showAlert('Failed to update stock', 'error');
    }
}

function generateReportContent(report) {
    return `
KITCHEN COST REPORT
Generated: ${new Date().toLocaleString()}
Period: ${report.period}

=== SUMMARY ===
Total Purchases: ₦${report.totalPurchases?.toFixed(2) || '0.00'}
Food Cost Percentage: ${report.foodCostPercentage?.toFixed(1) || '0'}%
Waste Cost: ₦${report.wasteCost?.toFixed(2) || '0.00'}
Average Daily Cost: ₦${report.avgDailyCost?.toFixed(2) || '0.00'}

=== TOP EXPENSES ===
${report.topExpenses?.map(expense => `${expense.category}: ₦${expense.amount.toFixed(2)}`).join('\n') || 'No data available'}

=== RECOMMENDATIONS ===
${report.recommendations?.join('\n') || 'No recommendations available'}
    `.trim();
}

function downloadReport(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Modal Management
function setupModalEventListeners() {
    // Close modal when clicking X or outside
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').style.display = 'none';
        });
    });
    
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // Form submissions
    document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
    document.getElementById('customerForm').addEventListener('submit', handleCustomerSubmit);
    document.getElementById('barItemForm').addEventListener('submit', handleBarItemSubmit);
    document.getElementById('updateStockForm').addEventListener('submit', handleUpdateStockSubmit);
    document.getElementById('orderForm').addEventListener('submit', handleOrderSubmit);
    document.getElementById('policeReportForm').addEventListener('submit', handlePoliceReportSubmit);
    document.getElementById('paymentForm').addEventListener('submit', handlePaymentSubmit);
    document.getElementById('refundForm').addEventListener('submit', handleRefundSubmit);
    
    // New form handlers
    document.getElementById('notificationForm').addEventListener('submit', handleNotificationSubmit);
    document.getElementById('staffForm').addEventListener('submit', handleStaffSubmit);
    document.getElementById('scheduleForm').addEventListener('submit', handleScheduleSubmit);
    document.getElementById('clockInForm').addEventListener('submit', handleClockInSubmit);
    document.getElementById('maintenanceForm').addEventListener('submit', handleMaintenanceSubmit);
    document.getElementById('supplyForm').addEventListener('submit', handleSupplySubmit);
    document.getElementById('cleaningForm').addEventListener('submit', handleCleaningSubmit);
    document.getElementById('serviceForm').addEventListener('submit', handleServiceSubmit);
    document.getElementById('feedbackForm').addEventListener('submit', handleFeedbackSubmit);
    document.getElementById('lostFoundForm').addEventListener('submit', handleLostFoundSubmit);
    document.getElementById('messageForm').addEventListener('submit', handleMessageSubmit);
    document.getElementById('callLogForm').addEventListener('submit', handleCallLogSubmit);
    document.getElementById('emergencyForm').addEventListener('submit', handleEmergencySubmit);
    
    // Kitchen management form handlers
    document.getElementById('kitchenItemForm').addEventListener('submit', handleKitchenItemSubmit);
    document.getElementById('purchaseForm').addEventListener('submit', handlePurchaseSubmit);
    
    // Payment method change handler
    document.getElementById('paymentMethod').addEventListener('change', handlePaymentMethodChange);
    document.getElementById('paymentAmount').addEventListener('input', updatePaymentTotal);

        // ERP module modals (if present)
        if (document.getElementById('laundryTaskForm')) {
            document.getElementById('laundryTaskForm').addEventListener('submit', handleLaundryTaskSubmit);
        }
        if (document.getElementById('scanPayOrderForm')) {
            document.getElementById('scanPayOrderForm').addEventListener('submit', handleScanPayOrderSubmit);
        }
        if (document.getElementById('hrRecordForm')) {
            document.getElementById('hrRecordForm').addEventListener('submit', handleHRRecordSubmit);
        }
        if (document.getElementById('stockItemForm')) {
            document.getElementById('stockItemForm').addEventListener('submit', handleStockItemSubmit);
        }
        if (document.getElementById('stockTransferForm')) {
            document.getElementById('stockTransferForm').addEventListener('submit', handleStockTransferSubmit);
        }
        if (document.getElementById('automatedMessageForm')) {
            document.getElementById('automatedMessageForm').addEventListener('submit', handleAutomatedMessageSubmit);
        }
        if (document.getElementById('locationBranchForm')) {
            document.getElementById('locationBranchForm').addEventListener('submit', handleLocationBranchSubmit);
        }
}

// Modal Functions
function showBookingModal(roomId = null) {
    const modal = document.getElementById('bookingModal');
    loadAvailableRooms();
    loadCustomers(); // Load customers into the dropdown when modal opens
    
    // If a specific room is passed, pre-select it
    if (roomId) {
        setTimeout(() => {
            const roomSelect = document.getElementById('roomSelect');
            if (roomSelect) {
                roomSelect.value = roomId;
            }
        }, 100);
    }
    
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('select, input');
        if (firstInput) firstInput.focus();
    }, 100);
}

function showCustomerModal() {
    const modal = document.getElementById('customerModal');
    // Reset form for adding new customer
    const form = document.getElementById('customerForm');
    form.reset();
    delete form.dataset.customerId;
    
    // Reset submit button text
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Add Customer';
    
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('input');
        if (firstInput) firstInput.focus();
    }, 100);
}

function showBarItemModal() {
    const modal = document.getElementById('barItemModal');
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('input');
        if (firstInput) firstInput.focus();
    }, 100);
}

function showOrderModal() {
    const modal = document.getElementById('orderModal');
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('input');
        if (firstInput) firstInput.focus();
    }, 100);
}

// Form Handlers
async function handleBookingSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    const booking = {
        roomId: formData.get('roomId'),
        customerId: formData.get('customerId'),
        checkIn: formData.get('checkIn'),
        checkOut: formData.get('checkOut')
    };
    
    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(booking)
        });
        
        if (response.ok) {
            document.getElementById('bookingModal').style.display = 'none';
            event.target.reset();
            loadRooms();
            showAlert('Booking created successfully!', 'success');
        }
    } catch (error) {
        console.error('Error creating booking:', error);
        showAlert('Error creating booking', 'error');
    }
}

async function handleCustomerSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    const customer = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        notes: formData.get('notes')
    };
    
    const customerId = event.target.dataset.customerId;
    const isUpdate = !!customerId;
    
    try {
        const response = await fetch(isUpdate ? `/api/customers/${customerId}` : '/api/customers', {
            method: isUpdate ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customer)
        });
        
        if (response.ok) {
            document.getElementById('customerModal').style.display = 'none';
            event.target.reset();
            
            // Reset form state
            delete event.target.dataset.customerId;
            const submitBtn = event.target.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Add Customer';
            
            loadCustomers();
            showAlert(isUpdate ? 'Customer updated successfully!' : 'Customer added successfully!', 'success');
        } else {
            throw new Error('API request failed');
        }
    } catch (error) {
        console.error('Error saving customer via API, saving locally:', error);
        
        // Save to local storage as fallback
        let localCustomers = getCustomersFromLocal() || [];
        
        if (isUpdate) {
            // Update existing customer
            const index = localCustomers.findIndex(c => c.id == customerId);
            if (index !== -1) {
                localCustomers[index] = { ...customer, id: customerId };
            }
        } else {
            // Add new customer with generated ID
            const newId = Date.now().toString(); // Simple ID generation
            customer.id = newId;
            localCustomers.push(customer);
        }
        
        saveCustomersToLocal(localCustomers);
        
        document.getElementById('customerModal').style.display = 'none';
        event.target.reset();
        
        // Reset form state
        delete event.target.dataset.customerId;
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Add Customer';
        
        loadCustomers();
        showAlert(
            isUpdate ? 'Customer updated locally!' : 'Customer saved locally!', 
            'warning'
        );
    }
}

// Edit customer function
async function editCustomer(customerId) {
    try {
        const response = await fetch(`/api/customers/${customerId}`);
        if (response.ok) {
            const customer = await response.json();
            
            // Populate the form with customer data
            document.getElementById('customerName').value = customer.name;
            document.getElementById('customerEmail').value = customer.email;
            document.getElementById('customerPhone').value = customer.phone;
            document.getElementById('customerNotes').value = customer.notes || '';
            
            // Store customer ID for update
            document.getElementById('customerForm').dataset.customerId = customerId;
            
            // Show modal
            const modal = document.getElementById('customerModal');
            modal.style.display = 'flex';
            modal.classList.add('show');
            
            // Focus on first input after a short delay
            setTimeout(() => {
                const firstInput = modal.querySelector('input');
                if (firstInput) firstInput.focus();
            }, 100);
            
            // Change submit button text
            const submitBtn = document.querySelector('#customerForm button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Update Customer';
        }
    } catch (error) {
        console.error('Error loading customer for edit:', error);
        showAlert('Error loading customer data', 'error');
    }
}

// Helper function to validate customer ID format
function isValidCustomerId(customerId) {
    if (!customerId) return false;
    
    // Check for MongoDB ObjectId format (24 hex characters)
    const mongoIdPattern = /^[0-9a-fA-F]{24}$/;
    
    // Check for UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    // Check for simple numeric ID
    const numericPattern = /^\d+$/;
    
    return mongoIdPattern.test(customerId) || uuidPattern.test(customerId) || numericPattern.test(customerId);
}

// Clean up invalid customer records
function cleanupCustomerData() {
    try {
        let localCustomers = getCustomersFromLocal() || [];
        const originalLength = localCustomers.length;
        
        // Remove customers with invalid IDs or missing required fields
        localCustomers = localCustomers.filter(customer => {
            return customer && 
                   customer.id && 
                   isValidCustomerId(customer.id) &&
                   customer.name && 
                   customer.name.trim().length > 0;
        });
        
        if (localCustomers.length < originalLength) {
            console.log(`🧹 Cleaned up ${originalLength - localCustomers.length} invalid customer records`);
            saveCustomersToLocal(localCustomers);
        }
        
        return localCustomers;
    } catch (error) {
        console.error('Error cleaning up customer data:', error);
        return [];
    }
}

// Delete customer function
async function deleteCustomer(customerId) {
    // Validate customer ID first
    if (!isValidCustomerId(customerId)) {
        console.error('Invalid customer ID format:', customerId);
        showAlert('Invalid customer ID format. Please refresh and try again.', 'error');
        loadCustomers(); // Refresh the customer list
        return;
    }
    
    if (confirm('Are you sure you want to delete this customer?')) {
        try {
            console.log('Attempting to delete customer with ID:', customerId);
            
            const response = await fetch(`/api/customers/${customerId}`, {
                method: 'DELETE'
            });
            
            console.log('Delete response status:', response.status);
            
            if (response.ok) {
                loadCustomers();
                showAlert('Customer deleted successfully!', 'success');
            } else if (response.status === 404) {
                console.log('Customer not found on server, cleaning up locally');
                
                // Customer doesn't exist on server, remove from local storage
                let localCustomers = getCustomersFromLocal() || [];
                const originalLength = localCustomers.length;
                localCustomers = localCustomers.filter(c => c.id != customerId);
                
                if (localCustomers.length < originalLength) {
                    saveCustomersToLocal(localCustomers);
                    loadCustomers();
                    showAlert('Customer was already removed. Display updated.', 'info');
                } else {
                    // Customer not found locally either, refresh the list
                    loadCustomers();
                    showAlert('Customer not found. List refreshed.', 'info');
                }
            } else {
                const errorText = await response.text();
                console.error('Server error:', response.status, errorText);
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('Error deleting customer:', error);
            
            // If it's a network error or server error, try local fallback
            if (error.message.includes('Failed to fetch') || error.message.includes('Server error')) {
                // Remove from local storage as fallback
                let localCustomers = getCustomersFromLocal() || [];
                const originalLength = localCustomers.length;
                localCustomers = localCustomers.filter(c => c.id != customerId);
                
                if (localCustomers.length < originalLength) {
                    saveCustomersToLocal(localCustomers);
                    loadCustomers();
                    showAlert('Connection error. Customer removed from local display.', 'warning');
                } else {
                    showAlert('Connection error and customer not found locally.', 'error');
                }
            } else {
                showAlert('Failed to delete customer. Please try again.', 'error');
            }
        }
    }
}

async function handleBarItemSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    const item = {
        name: formData.get('name'),
        price: parseFloat(formData.get('price')),
        stock: parseInt(formData.get('stock')),
        category: formData.get('category')
    };
    
    try {
        const response = await fetch('/api/bar/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        
        if (response.ok) {
            document.getElementById('barItemModal').style.display = 'none';
            event.target.reset();
            loadBarInventory();
            showAlert('Bar item added successfully!', 'success');
        }
    } catch (error) {
        console.error('Error adding bar item:', error);
        showAlert('Error adding bar item', 'error');
    }
}

async function handleOrderSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    const order = {
        customerId: formData.get('customerId') || null,
        roomId: formData.get('roomId') || null,
        items: formData.get('items'),
        type: formData.get('type')
    };
    
    try {
        const response = await fetch('/api/kitchen/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });
        
        if (response.ok) {
            document.getElementById('orderModal').style.display = 'none';
            event.target.reset();
            loadKitchenOrders();
            showAlert('Order created successfully!', 'success');
        }
    } catch (error) {
        console.error('Error creating order:', error);
        showAlert('Error creating order', 'error');
    }
}

// Helper Functions
async function loadAvailableRooms() {
    try {
        const response = await fetch('/api/rooms');
        const rooms = await response.json();
        
        const roomSelect = document.getElementById('roomSelect');
        roomSelect.innerHTML = '<option value="">Select Room</option>';
        
        rooms.filter(room => room.status === 'available').forEach(room => {
            const option = document.createElement('option');
            option.value = String(room.id);
            option.textContent = `${room.number} - ${room.type} (${room.price}/night)`;
            roomSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading available rooms:', error);
    }
}

function updateCustomerSelects(customers) {
    const selects = document.querySelectorAll('#customerSelect, #orderCustomer');
    
    selects.forEach(select => {
        select.innerHTML = '<option value="">Select Customer</option>';
        customers.forEach(customer => {
                const option = document.createElement('option');
                option.value = String(customer.id);
                option.textContent = customer.name;
                select.appendChild(option);
            });
    });
}

// Action Functions
let currentRoomId = null;

async function changeRoomStatus(roomId) {
    currentRoomId = roomId;
    const modal = document.getElementById('roomStatusModal');
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('select, input');
        if (firstInput) firstInput.focus();
    }, 100);
}

// Handle room status form submission
document.addEventListener('DOMContentLoaded', function() {
    const roomStatusForm = document.getElementById('roomStatusForm');
    if (roomStatusForm) {
        roomStatusForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const newStatus = document.getElementById('roomStatusSelect').value;
            
            if (newStatus && currentRoomId) {
                try {
                    const response = await fetch(`/api/rooms/${currentRoomId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus })
                    });
                    
                    if (response.ok) {
                        loadRooms();
                        closeModal('roomStatusModal');
                        showAlert('Room status updated!', 'success');
                        currentRoomId = null;
                    }
                } catch (error) {
                    console.error('Error updating room status:', error);
                    showAlert('Error updating room status', 'error');
                }
            }
        });
    }
    
    // Handle order status form submission
    const orderStatusForm = document.getElementById('orderStatusForm');
    if (orderStatusForm) {
        orderStatusForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const newStatus = document.getElementById('orderStatusSelect').value;
            
            if (newStatus && currentOrderId) {
                try {
                    const response = await fetch(`/api/kitchen/orders/${currentOrderId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus })
                    });
                    
                    if (response.ok) {
                        loadKitchenOrders();
                        closeModal('orderStatusModal');
                        showAlert('Order status updated!', 'success');
                        currentOrderId = null;
                    }
                } catch (error) {
                    console.error('Error updating order status:', error);
                    showAlert('Error updating order status', 'error');
                }
            }
        });
    }
    
    // Handle report status form submission
    const reportStatusForm = document.getElementById('reportStatusForm');
    if (reportStatusForm) {
        reportStatusForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const newStatus = document.getElementById('reportStatusSelect').value;
            
            if (newStatus && currentReportId) {
                try {
                    const response = await fetch(`/api/police-reports/${currentReportId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus })
                    });
                    
                    if (response.ok) {
                        loadPoliceReports();
                        closeModal('reportStatusModal');
                        showAlert('Report status updated!', 'success');
                        currentReportId = null;
                    }
                } catch (error) {
                    console.error('Error updating report status:', error);
                    showAlert('Error updating report status', 'error');
                }
            }
        });
    }
    
    // Handle staff status form submission
    const staffStatusForm = document.getElementById('staffStatusForm');
    if (staffStatusForm) {
        staffStatusForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const newStatus = document.getElementById('staffStatusSelect').value;
            
            if (newStatus && currentStaffId) {
                try {
                    await fetch(`/api/staff/${currentStaffId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus })
                    });
                    
                    loadStaff();
                    closeModal('staffStatusModal');
                    showAlert('Staff status updated!', 'success');
                    currentStaffId = null;
                } catch (error) {
                    console.error('Error updating staff status:', error);
                    showAlert('Error updating staff status', 'error');
                }
            }
        });
    }
});

async function checkoutRoom(roomId) {
    if (confirm('Confirm checkout for this room?')) {
        try {
            const response = await fetch(`/api/rooms/${roomId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'cleaning', currentGuest: null })
            });
            
            if (response.ok) {
                loadRooms();
                showAlert('Room checked out successfully!', 'success');
            }
        } catch (error) {
            console.error('Error checking out room:', error);
        }
    }
}

async function cancelBooking(roomId) {
    if (confirm('Are you sure you want to cancel this booking? The room will become available.')) {
        try {
            const response = await fetch(`/api/rooms/${roomId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'available', currentGuest: null })
            });
            
            if (response.ok) {
                loadRooms();
                showAlert('Booking cancelled successfully! Room is now available.', 'success');
            } else {
                throw new Error('API request failed');
            }
        } catch (error) {
            console.error('Error cancelling booking via API, updating locally:', error);
            
            // Update local storage as fallback
            let localRooms = getRoomsFromLocal() || [];
            const roomIndex = localRooms.findIndex(r => r.id == roomId);
            if (roomIndex !== -1) {
                localRooms[roomIndex].status = 'available';
                localRooms[roomIndex].currentGuest = null;
                saveRoomsToLocal(localRooms);
            }
            
            loadRooms();
            showAlert('Booking cancelled locally!', 'warning');
        }
    }
}

function bookRoom(roomId) {
    document.getElementById('roomSelect').value = roomId;
    showBookingModal();
}

let currentOrderId = null;

async function updateOrderStatus(orderId) {
    currentOrderId = orderId;
    const modal = document.getElementById('orderStatusModal');
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('select, input');
        if (firstInput) firstInput.focus();
    }, 100);
}

async function deleteKitchenOrder(orderId) {
    if (confirm('Are you sure you want to cancel this kitchen order?')) {
        try {
            const response = await fetch(`/api/kitchen/orders/${orderId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadKitchenOrders();
                showAlert('Kitchen order cancelled successfully!', 'success');
            } else {
                throw new Error('API request failed');
            }
        } catch (error) {
            console.error('Error deleting kitchen order via API, removing locally:', error);
            
            // Remove from local storage as fallback
            let localOrders = getKitchenOrdersFromLocal() || [];
            localOrders = localOrders.filter(order => order.id != orderId);
            saveKitchenOrdersToLocal(localOrders);
            
            loadKitchenOrders();
            showAlert('Kitchen order cancelled locally!', 'warning');
        }
    }
}

// Police Reports Management
async function loadPoliceReports() {
    try {
        const response = await fetch('/api/police-reports');
        const reports = await response.json();
        
        const reportsContainer = document.getElementById('policeReports');
        reportsContainer.innerHTML = '';
        
        if (reports.length === 0) {
            reportsContainer.innerHTML = '<p>No police reports filed.</p>';
            return;
        }
        
        reports.forEach(report => {
            const reportCard = document.createElement('div');
            reportCard.className = 'report-card';
            reportCard.innerHTML = `
                <div class="report-header">
                    <div>
                        <h4>Report #${report.id} - ${report.incidentType}</h4>
                        <p><strong>Date:</strong> ${new Date(report.incidentDateTime).toLocaleString()}</p>
                    </div>
                    <div>
                        <span class="report-severity severity-${report.severity}">${report.severity}</span>
                        <span class="report-status status-${report.status}">${report.status}</span>
                    </div>
                </div>
                <div class="report-content">
                    <p><strong>Description:</strong> ${report.incidentDescription}</p>
                    ${report.roomId ? `<p><strong>Room:</strong> ${report.roomId}</p>` : ''}
                    ${report.customerId ? `<p><strong>Customer:</strong> Customer #${report.customerId}</p>` : ''}
                    <p><strong>Reported by:</strong> ${report.reportingOfficer}</p>
                    ${report.policeContactNumber ? `<p><strong>Police Contact:</strong> ${report.policeContactNumber}</p>` : ''}
                    ${report.actionsTaken ? `<p><strong>Actions Taken:</strong> ${report.actionsTaken}</p>` : ''}
                </div>
                <div class="report-actions">
                    <button class="btn btn-warning" onclick="updateReportStatus('${report.id}')">
                        <i class="fas fa-edit"></i> Update Status
                    </button>
                </div>
            `;
            reportsContainer.appendChild(reportCard);
        });
    } catch (error) {
        console.error('Error loading police reports:', error);
    }
}

// Payments Management
async function loadPayments() {
    try {
        const response = await fetch('/api/payments');
        const payments = await response.json();
        
        // Update payment statistics
        const todayPayments = payments.filter(p => 
            new Date(p.createdAt).toDateString() === new Date().toDateString()
        );
        
        const todaysSales = todayPayments.reduce((sum, payment) => 
            payment.type !== 'refund' ? sum + payment.amount : sum - payment.amount, 0
        );
        
        const avgTransaction = todayPayments.length > 0 ? 
            todaysSales / todayPayments.filter(p => p.type !== 'refund').length : 0;
        
        document.getElementById('todaysSales').textContent = `₦${todaysSales.toFixed(2)}`;
        document.getElementById('totalTransactions').textContent = payments.length;
        document.getElementById('avgTransaction').textContent = `₦${avgTransaction.toFixed(2)}`;
        
        // Load transactions list
        const transactionsList = document.getElementById('transactionsList');
        transactionsList.innerHTML = '';
        
        payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(payment => {
            const transactionItem = document.createElement('div');
            transactionItem.className = 'transaction-item';
            transactionItem.innerHTML = `
                <div class="transaction-details">
                    <div class="transaction-id">Transaction #${payment.id}</div>
                    <div class="transaction-info">
                        ${payment.customerName || 'Walk-in'} • ${payment.paymentType} • 
                        ${new Date(payment.createdAt).toLocaleString()}
                        ${payment.roomId ? ` • Room ${payment.roomId}` : ''}
                    </div>
                </div>
                <div class="transaction-amount">
                    ${payment.type === 'refund' ? '-' : ''}₦${payment.amount.toFixed(2)}
                    <span class="transaction-method method-${payment.method}">${payment.method.replace('_', ' ')}</span>
                </div>
            `;
            transactionsList.appendChild(transactionItem);
        });
        
        // Update refund transaction options
        updateRefundOptions(payments.filter(p => p.type !== 'refund'));
        
    } catch (error) {
        console.error('Error loading payments:', error);
    }
}

// Modal Functions
function showPoliceReportModal() {
    const modal = document.getElementById('policeReportModal');
    populateRoomAndCustomerSelects('reportRoom', 'reportCustomer');
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('input, select');
        if (firstInput) firstInput.focus();
    }, 100);
}

function showPaymentModal() {
    const modal = document.getElementById('paymentModal');
    populateRoomAndCustomerSelects('paymentRoom', 'paymentCustomer');
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('input, select');
        if (firstInput) firstInput.focus();
    }, 100);
}

function showRefundModal() {
    const modal = document.getElementById('refundModal');
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('input');
        if (firstInput) firstInput.focus();
    }, 100);
}

// Form Handlers
async function handlePoliceReportSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    const report = {
        incidentType: formData.get('incidentType'),
        incidentDateTime: formData.get('incidentDateTime'),
        roomId: formData.get('roomId') || null,
        customerId: formData.get('customerId') || null,
        incidentDescription: formData.get('incidentDescription'),
        reportingOfficer: formData.get('reportingOfficer'),
        policeContactNumber: formData.get('policeContactNumber') || null,
        severity: formData.get('severity'),
        status: formData.get('status'),
        actionsTaken: formData.get('actionsTaken') || null
    };
    
    try {
        const response = await fetch('/api/police-reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
        });
        
        if (response.ok) {
            document.getElementById('policeReportModal').style.display = 'none';
            event.target.reset();
            loadPoliceReports();
            alert('Police report submitted successfully!');
        }
    } catch (error) {
        console.error('Error submitting police report:', error);
        alert('Error submitting police report');
    }
}

async function handlePaymentSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    const payment = {
        customerId: formData.get('customerId') || null,
        roomId: formData.get('roomId') || null,
        amount: parseFloat(formData.get('amount')),
        paymentType: formData.get('paymentType'),
        method: formData.get('method'),
        referenceNumber: formData.get('referenceNumber') || null,
        notes: formData.get('notes') || null,
        type: 'payment'
    };
    
    // Add card details if credit/debit card
    if (['credit', 'debit'].includes(payment.method)) {
        payment.cardDetails = {
            number: formData.get('cardNumber'),
            expiry: formData.get('cardExpiry'),
            cvv: formData.get('cardCVV'),
            holderName: formData.get('cardHolderName')
        };
    }
    
    try {
        const response = await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payment)
        });
        
        if (response.ok) {
            document.getElementById('paymentModal').style.display = 'none';
            event.target.reset();
            loadPayments();
            alert('Payment processed successfully!');
        }
    } catch (error) {
        console.error('Error processing payment:', error);
        alert('Error processing payment');
    }
}

async function handleRefundSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    const refund = {
        originalTransactionId: formData.get('originalTransactionId'),
        amount: parseFloat(formData.get('amount')),
        reason: formData.get('reason'),
        notes: formData.get('notes'),
        type: 'refund'
    };
    
    try {
        const response = await fetch('/api/payments/refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(refund)
        });
        
        if (response.ok) {
            document.getElementById('refundModal').style.display = 'none';
            event.target.reset();
            loadPayments();
            alert('Refund processed successfully!');
        }
    } catch (error) {
        console.error('Error processing refund:', error);
        alert('Error processing refund');
    }
}

// Helper Functions
function handlePaymentMethodChange(event) {
    const cardSection = document.getElementById('cardPaymentSection');
    if (['credit', 'debit'].includes(event.target.value)) {
        cardSection.style.display = 'block';
    } else {
        cardSection.style.display = 'none';
    }
}

function updatePaymentTotal() {
    const amount = document.getElementById('paymentAmount').value;
    document.getElementById('totalAmount').textContent = parseFloat(amount || 0).toFixed(2);
}

function populateRoomAndCustomerSelects(roomSelectId, customerSelectId) {
    // This function will be called to populate room and customer dropdowns
    loadAvailableRooms().then(() => {
        const roomSelect = document.getElementById(roomSelectId);
        const mainRoomSelect = document.getElementById('roomSelect');
        roomSelect.innerHTML = mainRoomSelect.innerHTML;
        roomSelect.innerHTML = roomSelect.innerHTML.replace('Select Room', 'Room (if applicable)');
    });
    
    // Populate customers
    fetch('/api/customers').then(r => r.json()).then(customers => {
        const customerSelect = document.getElementById(customerSelectId);
        customerSelect.innerHTML = '<option value="">Customer (if applicable)</option>';
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            customerSelect.appendChild(option);
        });
    });
}

function updateRefundOptions(transactions) {
    const refundSelect = document.getElementById('refundTransaction');
    refundSelect.innerHTML = '<option value="">Select Original Transaction</option>';
    
    transactions.forEach(transaction => {
        const option = document.createElement('option');
        option.value = transaction.id;
        option.textContent = `#${transaction.id} - ₦${transaction.amount.toFixed(2)} (${transaction.method})`;
        refundSelect.appendChild(option);
    });
}

let currentReportId = null;
let currentStaffId = null;

async function updateReportStatus(reportId) {
    currentReportId = reportId;
    const modal = document.getElementById('reportStatusModal');
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('select, input');
        if (firstInput) firstInput.focus();
    }, 100);
}

// NEW FEATURES FUNCTIONS

// NOTIFICATIONS FUNCTIONALITY
async function loadNotifications() {
    try {
        const response = await fetch('/api/notifications');
        const notifications = await response.json();
        displayNotifications(notifications);
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function displayNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    if (!container) return;

    if (!notifications || notifications.length === 0) {
        container.innerHTML = '<div class="no-notifications">No notifications at this time</div>';
        return;
    }

    container.innerHTML = notifications.map(notification => {
        const date = new Date(notification.createdAt);
        const timeString = isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString();
        const priorityClass = notification.priority ? notification.priority.toLowerCase() : 'normal';
        
        return `
        <div class="notification-item ${notification.read ? '' : 'unread'} ${priorityClass === 'high' || priorityClass === 'urgent' ? 'urgent' : ''}">
            <div class="notification-header">
                <h4 class="notification-title">${notification.title || 'Notification'}</h4>
                <span class="notification-time">${timeString}</span>
            </div>
            <p>${notification.message || 'No message'}</p>
            <div class="notification-meta">
                <span class="recipient">${notification.recipient || 'All Staff'}</span>
                <span class="priority priority-${priorityClass}">${priorityClass.charAt(0).toUpperCase() + priorityClass.slice(1)}</span>
                ${!notification.read ? `<button class="btn btn-sm" onclick="markAsRead('${notification.id}')">Mark Read</button>` : ''}
            </div>
        </div>
    `;
    }).join('');
}

function showNotificationModal() {
    const modal = document.getElementById('notificationModal');
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }, 100);
}

async function markAsRead(notificationId) {
    try {
        await fetch(`/api/notifications/${notificationId}/read`, { method: 'PUT' });
        loadNotifications();
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllAsRead() {
    try {
        const response = await fetch('/api/notifications');
        const notifications = await response.json();
        
        for (const notification of notifications.filter(n => !n.read)) {
            await fetch(`/api/notifications/${notification.id}/read`, { method: 'PUT' });
        }
        
        loadNotifications();
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
}

// STAFF MANAGEMENT FUNCTIONALITY
async function loadStaff() {
    try {
        const response = await fetch('/api/staff');
        const staff = await response.json();
        displayStaff(staff);
        updateStaffStats(staff);
    } catch (error) {
        console.error('Error loading staff:', error);
    }
}

function displayStaff(staff) {
    const container = document.getElementById('staffList');
    if (!container) return;
    
    // Check if current user is director for showing edit/delete buttons
    const isDirector = window.currentStaff && window.currentStaff.position === 'director';

    container.innerHTML = staff.map(member => `
        <div class="staff-card ${member.status === 'off-duty' ? 'off-duty' : ''}">
            <div class="staff-header">
                <h4 class="staff-name">${member.name}</h4>
                <span class="staff-status ${member.status}">${member.status}</span>
            </div>
            <p><strong>ID:</strong> ${member.personalId}</p>
            <p><strong>Position:</strong> ${member.position}</p>
            <p><strong>Shift:</strong> ${member.shift}</p>
            <p><strong>Phone:</strong> ${member.phone}</p>
            <p><strong>Email:</strong> ${member.email}</p>
            <p><strong>Rate:</strong> ₦${member.hourlyRate}/hour</p>
            <div class="staff-actions">
                <button class="btn btn-sm btn-info" onclick="updateStaffStatus('${member.id}')" title="Update Status">
                    <i class="fas fa-sync"></i> Status
                </button>
                ${isDirector ? `
                    <button class="btn btn-sm btn-warning" onclick="editStaff('${member.id}')" title="Edit Staff Member">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteStaff('${member.id}')" title="Delete Staff Member">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                ` : `
                    <span class="permission-notice" style="font-size: 0.8em; color: #6c757d; font-style: italic;">
                        <i class="fas fa-lock"></i> Director only
                    </span>
                `}
            </div>
        </div>
    `).join('');
}

function updateStaffStats(staff) {
    const onDuty = staff.filter(s => s.status === 'on-duty').length;
    const total = staff.length;
    
    // Safely update elements if they exist
    const onDutyElement = document.getElementById('onDutyCount');
    const totalStaffElement = document.getElementById('totalStaffCount');
    const scheduledTodayElement = document.getElementById('scheduledTodayCount');
    
    if (onDutyElement) onDutyElement.textContent = onDuty;
    if (totalStaffElement) totalStaffElement.textContent = total;
    if (scheduledTodayElement) scheduledTodayElement.textContent = total; // Simplified
}

function showStaffModal() {
    // Check if user has permission to add staff (Director only)
    if (window.currentStaff && window.currentStaff.position !== 'director') {
        showAlert('Access Denied: Only the Hotel Director can add staff members', 'error');
        return;
    }
    
    const modal = document.getElementById('staffModal');
    const form = document.getElementById('staffForm');
    
    // Reset form for adding new staff
    form.reset();
    form.removeAttribute('data-edit-id');
    
    // Reset submit button text
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Add Staff Member';
    
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('input');
        if (firstInput) firstInput.focus();
    }, 100);
}

// Edit staff member function
async function editStaff(staffId) {
    // Check if user has permission to edit staff (Director only)
    if (window.currentStaff && window.currentStaff.position !== 'director') {
        showAlert('Access Denied: Only the Hotel Director can edit staff members', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/staff/${staffId}`);
        if (response.ok) {
            const staff = await response.json();
            
            // Populate the staff form with existing data
            document.getElementById('staffPersonalId').value = staff.personalId;
            document.getElementById('staffName').value = staff.name;
            document.getElementById('staffEmail').value = staff.email;
            document.getElementById('staffPhone').value = staff.phone;
            document.getElementById('staffPosition').value = staff.position;
            document.getElementById('staffShift').value = staff.shift;
            document.getElementById('staffSalary').value = staff.hourlyRate;
            document.getElementById('staffStartDate').value = staff.startDate;
            document.getElementById('staffNotes').value = staff.notes || '';
            
            // Set form to edit mode
            const form = document.getElementById('staffForm');
            form.setAttribute('data-edit-id', staffId);
            
            // Change submit button text
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Update Staff Member';
            
            // Show the modal
            showStaffModal();
            
        } else {
            throw new Error('Failed to load staff data');
        }
    } catch (error) {
        console.error('Error loading staff for edit:', error);
        showAlert('Error loading staff data', 'error');
    }
}

// Delete staff member function
async function deleteStaff(staffId) {
    // Check if user has permission to delete staff (Director only)
    if (window.currentStaff && window.currentStaff.position !== 'director') {
        showAlert('Access Denied: Only the Hotel Director can delete staff members', 'error');
        return;
    }
    
    if (confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
        try {
            const response = await fetch(`/api/staff/${staffId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadStaff();
                await loadCurrentStaffStatus();
                showAlert('Staff member deleted successfully!', 'success');
            } else if (response.status === 403) {
                const errorData = await response.json();
                showAlert(`Access Denied: ${errorData.message || 'Only the Hotel Director can delete staff members'}`, 'error');
            } else {
                const errorText = await response.text();
                console.error('Server error:', response.status, errorText);
                showAlert(`Failed to delete staff member. Server error: ${response.status}`, 'error');
            }
        } catch (error) {
            console.error('Error deleting staff member:', error);
            showAlert('Failed to delete staff member. Please check your connection and try again.', 'error');
        }
    }
}

function showScheduleModal() {
    const modal = document.getElementById('scheduleModal');
    loadStaffOptions('scheduleStaff');
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('select, input');
        if (firstInput) firstInput.focus();
    }, 100);
}

function showClockInModal() {
    const modal = document.getElementById('clockInModal');
    loadStaffOptions('clockStaff');
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('select, input');
        if (firstInput) firstInput.focus();
    }, 100);
}

async function loadStaffOptions(selectId) {
    try {
        const response = await fetch('/api/staff');
        const staff = await response.json();
        const select = document.getElementById(selectId);
        
        select.innerHTML = '<option value="">Select Staff Member</option>';
        staff.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = `${member.name} (${member.position})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading staff options:', error);
    }
}

// STAFF CLOCK-IN SYSTEM FUNCTIONALITY
async function loadCurrentStaffStatus() {
    try {
        const response = await fetch('/api/staff/current-status');
        const staffStatus = await response.json();
        
        const statusContainer = document.getElementById('currentStaffStatus');
        if (!statusContainer) return;
        
        let statusHTML = '<h4>Current Staff Status</h4><div class="status-grid">';
        
        staffStatus.forEach(staff => {
            const statusClass = getStatusClass(staff.status);
            const lastActionTime = staff.lastActionTime ? 
                new Date(staff.lastActionTime).toLocaleString() : 'Never';
            
            statusHTML += `
                <div class="staff-status-card ${statusClass}">
                    <div class="staff-info">
                        <strong>${staff.name}</strong>
                        <span class="personal-id">${staff.personalId}</span>
                        <span class="position">${staff.position}</span>
                    </div>
                    <div class="status-info">
                        <span class="status">${staff.status}</span>
                        <span class="last-action">Last: ${staff.lastAction} at ${lastActionTime}</span>
                    </div>
                </div>
            `;
        });
        
        statusHTML += '</div>';
        statusContainer.innerHTML = statusHTML;
        
        // Update stats
        const onDuty = staffStatus.filter(s => s.status === 'on-duty').length;
        const onBreak = staffStatus.filter(s => s.status === 'on-break').length;
        const offDuty = staffStatus.filter(s => s.status === 'off-duty').length;
        
        document.getElementById('onDutyCount').textContent = onDuty;
        document.getElementById('onBreakCount').textContent = onBreak;
        document.getElementById('offDutyCount').textContent = offDuty;
        document.getElementById('totalStaffCount').textContent = staffStatus.length;
        
    } catch (error) {
        console.error('Error loading staff status:', error);
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'on-duty': return 'status-on-duty';
        case 'on-break': return 'status-on-break';
        case 'off-duty': return 'status-off-duty';
        default: return 'status-unknown';
    }
}

function showTimesheetModal() {
    const modal = document.getElementById('timesheetModal');
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('select, input');
        if (firstInput) firstInput.focus();
    }, 100);
}

async function quickClock(action) {
    const personalId = document.getElementById('quickPersonalId').value.trim();
    
    if (!personalId) {
        alert('Please enter your Personal ID');
        return;
    }
    
    try {
        const response = await fetch('/api/clock-in', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                personalId: personalId,
                action: action,
                location: 'Quick Clock',
                notes: `Quick ${action} action`
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(`${action.replace('-', ' ').toUpperCase()} recorded successfully!`);
            document.getElementById('quickPersonalId').value = '';
            await loadCurrentStaffStatus();
            await loadStaff();
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        console.error('Error recording clock action:', error);
        alert('Error recording clock action');
    }
}

async function loadTimesheet() {
    const personalId = document.getElementById('timesheetPersonalId').value.trim();
    const date = document.getElementById('timesheetDate').value;
    
    if (!personalId) {
        alert('Please enter Personal ID');
        return;
    }
    
    try {
        const url = `/api/timesheet/${personalId}${date ? `?date=${date}` : ''}`;
        const response = await fetch(url);
        const timesheet = await response.json();
        
        const content = document.getElementById('timesheetContent');
        
        let html = `
            <div class="timesheet-header">
                <h4>Timesheet for ${personalId} - ${timesheet.date}</h4>
                <div class="timesheet-summary">
                    <div class="summary-item">
                        <label>Total Hours:</label>
                        <span>${timesheet.summary.totalHours}</span>
                    </div>
                    <div class="summary-item">
                        <label>Break Time:</label>
                        <span>${timesheet.summary.totalBreakTime}</span>
                    </div>
                    <div class="summary-item">
                        <label>Status:</label>
                        <span class="${timesheet.summary.clockedIn ? 'clocked-in' : 'clocked-out'}">
                            ${timesheet.summary.clockedIn ? 'Clocked In' : 'Clocked Out'}
                        </span>
                    </div>
                </div>
            </div>
            <div class="timesheet-records">
                <table class="timesheet-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Action</th>
                            <th>Location</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        timesheet.records.forEach(record => {
            const time = new Date(record.timestamp).toLocaleTimeString();
            html += `
                <tr>
                    <td>${time}</td>
                    <td class="action-${record.action}">${record.action.replace('-', ' ').toUpperCase()}</td>
                    <td>${record.location}</td>
                    <td>${record.notes}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        content.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading timesheet:', error);
        alert('Error loading timesheet');
    }
}

// HOUSEKEEPING FUNCTIONALITY
async function loadHousekeeping() {
    setupHousekeepingTabs();
    await loadCleaningTasks();
    await loadMaintenanceRequests();
    await loadSupplies();
    updateHousekeepingStats();
}

function setupHousekeepingTabs() {
    const tabBtns = document.querySelectorAll('.hk-tab-btn');
    const tabContents = document.querySelectorAll('.hk-tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.hkTab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

async function loadCleaningTasks() {
    try {
        const response = await fetch('/api/cleaning-tasks');
        const tasks = await response.json();
        displayCleaningTasks(tasks);
    } catch (error) {
        console.error('Error loading cleaning tasks:', error);
    }
}

function displayCleaningTasks(tasks) {
    const container = document.getElementById('cleaningTasks');
    if (!container) return;

    container.innerHTML = tasks.map(task => `
        <div class="cleaning-task ${task.status === 'completed' ? 'completed' : ''}">
            <h4>${task.roomName ? `${task.roomName}` : 'General Area'} - ${task.type}</h4>
            <p><strong>Status:</strong> ${task.status}</p>
            <p><strong>Assigned to:</strong> ${task.assignee || 'Unassigned'}</p>
            <p><strong>Instructions:</strong> ${task.instructions || 'Standard cleaning'}</p>
            <p><strong>Created:</strong> ${new Date(task.createdAt).toLocaleString()}</p>
            <button class="btn btn-sm btn-success" onclick="updateTaskStatus('${task.id}', 'completed')">Mark Complete</button>
        </div>
    `).join('');
}

async function loadMaintenanceRequests() {
    try {
        const response = await fetch('/api/maintenance');
        const requests = await response.json();
        displayMaintenanceRequests(requests);
    } catch (error) {
        console.error('Error loading maintenance requests:', error);
    }
}

function displayMaintenanceRequests(requests) {
    const container = document.getElementById('maintenanceRequests');
    if (!container) return;

    container.innerHTML = requests.map(request => `
        <div class="maintenance-request ${request.status === 'resolved' ? 'resolved' : ''}">
            <h4>${request.category} - Priority: ${request.priority}</h4>
            <p><strong>Location:</strong> ${request.roomId ? `Room ${request.roomId}` : 'Common Area'}</p>
            <p><strong>Reporter:</strong> ${request.reporter}</p>
            <p><strong>Description:</strong> ${request.description}</p>
            <p><strong>Status:</strong> ${request.status}</p>
            <p><strong>Created:</strong> ${new Date(request.createdAt).toLocaleString()}</p>
            <button class="btn btn-sm btn-success" onclick="updateMaintenanceStatus('${request.id}', 'resolved')">Mark Resolved</button>
        </div>
    `).join('');
}

async function loadSupplies() {
    try {
        const response = await fetch('/api/supplies');
        const supplies = await response.json();
        displaySupplies(supplies);
    } catch (error) {
        console.error('Error loading supplies:', error);
    }
}

function displaySupplies(supplies) {
    const container = document.getElementById('supplyInventory');
    if (!container) return;

    container.innerHTML = supplies.map(supply => {
        const isLowStock = supply.stock <= supply.minimum;
        const isOutOfStock = supply.stock === 0;
        
        return `
            <div class="supply-item ${isOutOfStock ? 'out-of-stock' : isLowStock ? 'low-stock' : ''}">
                <div>
                    <h4>${supply.name}</h4>
                    <p><strong>Category:</strong> ${supply.category}</p>
                    <p><strong>Supplier:</strong> ${supply.supplier}</p>
                    <p><strong>Unit Cost:</strong> ₦${supply.unitCost}</p>
                </div>
                <div>
                    <p><strong>Stock:</strong> ${supply.stock} / ${supply.minimum} min</p>
                    ${isLowStock ? '<span class="status-indicator red"></span>Low Stock' : '<span class="status-indicator green"></span>In Stock'}
                </div>
            </div>
        `;
    }).join('');
}

function updateHousekeepingStats() {
    // This would be calculated from actual data
    document.getElementById('roomsToClean').textContent = '3';
    document.getElementById('maintenanceIssues').textContent = '2';
    document.getElementById('lowStockItems').textContent = '1';
}

function showMaintenanceModal() {
    const modal = document.getElementById('maintenanceModal');
    loadRoomOptions('maintenanceRoom');
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('select, input');
        if (firstInput) firstInput.focus();
    }, 100);
}

function showSupplyModal() {
    const modal = document.getElementById('supplyModal');
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('input, select');
        if (firstInput) firstInput.focus();
    }, 100);
}

function showCleaningModal() {
    const modal = document.getElementById('cleaningModal');
    loadRoomOptions('cleaningRoom');
    loadStaffOptions('cleaningAssignee');
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus on first input after a short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('select, input');
        if (firstInput) firstInput.focus();
    }, 100);
}

// ANALYTICS FUNCTIONALITY
async function loadAnalytics() {
    await updateAnalytics();
    initializeCharts();
}

async function updateAnalytics() {
    try {
        const [revenueData, occupancyData, loyaltyData] = await Promise.all([
            fetch('/api/analytics/revenue').then(r => r.json()),
            fetch('/api/analytics/occupancy').then(r => r.json()),
            fetch('/api/analytics/customer-loyalty').then(r => r.json())
        ]);
        
        document.getElementById('averageRate').textContent = `₦${(revenueData.total / revenueData.transactions || 0).toFixed(2)}`;
        document.getElementById('revpar').textContent = `₦${(revenueData.total / 11).toFixed(2)}`;
        document.getElementById('retention').textContent = `${loyaltyData.loyaltyRate}%`;
        
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

function initializeCharts() {
    // Initialize Chart.js charts here
    const revenueCtx = document.getElementById('revenueChart');
    const occupancyCtx = document.getElementById('occupancyChart');
    const loyaltyCtx = document.getElementById('loyaltyChart');
    const seasonalCtx = document.getElementById('seasonalChart');
    
    if (revenueCtx) {
        new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Revenue',
                    data: [12000, 15000, 13000, 17000, 16000, 18000],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

function generateReport() {
    alert('Report generation feature would export PDF/Excel reports here');
}

// SERVICES FUNCTIONALITY
async function loadServices() {
    setupServiceTabs();
    await loadServiceRequests();
    await loadGuestFeedback();
    await loadLostFoundItems();
    }

    // LAUNDRY FUNCTIONALITY
    async function loadLaundryTasks() {
        try {
            const response = await fetch('/api/laundry');
            const tasks = await response.json();
            displayLaundryTasks(tasks);
        } catch (error) {
            console.error('Error loading laundry tasks:', error);
        }
    }

    function displayLaundryTasks(tasks) {
        const container = document.getElementById('laundryTasksList');
        if (!container) return;
        container.innerHTML = tasks.map(task => `
            <div class="laundry-task">
                <h4>${task.type} - ${task.status}</h4>
                <p><strong>Assigned to:</strong> ${task.assignee || 'Unassigned'}</p>
                <p><strong>Instructions:</strong> ${task.instructions || ''}</p>
                <p><strong>Created:</strong> ${new Date(task.createdAt).toLocaleString()}</p>
            </div>
        `).join('');
    }

    function showLaundryTaskModal() {
        document.getElementById('laundryTaskModal').style.display = 'block';
    }

    async function handleLaundryTaskSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const task = {
            title: formData.get('title'),
            type: formData.get('type'),
            roomName: formData.get('roomName'),
            priority: formData.get('priority'),
            notes: formData.get('notes'),
            status: 'pending'
        };
        try {
            const response = await fetch('/api/laundry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task)
            });
            if (response.ok) {
                closeModal('laundryTaskModal');
                loadLaundryTasks();
                showAlert('Laundry task created successfully!', 'success');
            } else {
                showAlert('Error creating laundry task', 'error');
            }
        } catch (error) {
            console.error('Error creating laundry task:', error);
            showAlert('Error creating laundry task', 'error');
        }
    }

    // SCAN & PAY FUNCTIONALITY
    async function loadScanPayOrders() {
        try {
            const response = await fetch('/api/scanpay');
            const orders = await response.json();
            displayScanPayOrders(orders);
        } catch (error) {
            console.error('Error loading scan & pay orders:', error);
        }
    }

    function displayScanPayOrders(orders) {
        const container = document.getElementById('scanPayOrdersList');
        if (!container) return;
        
        if (!orders || orders.length === 0) {
            container.innerHTML = '<div class="no-data">No scan & pay orders found</div>';
            return;
        }
        
        container.innerHTML = orders.map(order => {
            const statusClass = order.status === 'completed' ? 'status-completed' : 
                               order.status === 'pending' ? 'status-pending' : 
                               order.status === 'preparing' ? 'status-preparing' : '';
            
            return `
                <div class="scanpay-order ${statusClass}">
                    <div class="order-header">
                        <h4>Order ${order.orderNumber || `#${order.id}`}</h4>
                        <span class="order-status status-${order.status}">${order.status || 'Unknown'}</span>
                    </div>
                    <div class="order-details">
                        <p><strong>Customer:</strong> ${order.customerId || 'Unknown'}</p>
                        <p><strong>Type:</strong> ${order.orderType || 'Not specified'}</p>
                        ${order.tableNumber ? `<p><strong>Table:</strong> ${order.tableNumber}</p>` : ''}
                        <p><strong>Items:</strong> ${order.items || 'No items listed'}</p>
                        <p><strong>Amount:</strong> ₦${(order.amount || 0).toLocaleString()}</p>
                        <p><strong>Payment:</strong> ${order.paymentMethod || 'Not specified'}</p>
                        ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ''}
                        <p><strong>Created:</strong> ${order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Unknown'}</p>
                    </div>
                    <div class="order-actions">
                        ${order.status === 'pending' ? '<button class="btn btn-sm btn-success" onclick="updateOrderStatus(' + order.id + ', \'completed\')">Mark Complete</button>' : ''}
                        <button class="btn btn-sm btn-secondary" onclick="viewOrderDetails(' + order.id + ')">View Details</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function showScanPayOrderModal() {
        const modal = document.getElementById('scanPayOrderModal');
        loadCustomerOptions('scanPayCustomer');
        modal.style.display = 'flex';
        modal.classList.add('show');
        
        // Focus on first input after a short delay
        setTimeout(() => {
            const firstInput = modal.querySelector('select, input');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    async function handleScanPayOrderSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const order = {
            customerId: formData.get('customerId'),
            orderNumber: formData.get('orderNumber'),
            orderType: formData.get('orderType'),
            tableNumber: formData.get('tableNumber'),
            items: formData.get('items'),
            amount: parseFloat(formData.get('amount')),
            paymentMethod: formData.get('paymentMethod'),
            notes: formData.get('notes'),
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/scanpay', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(order)
            });
            
            if (response.ok) {
                closeModal('scanPayOrderModal');
                event.target.reset();
                loadScanPayOrders();
                showAlert('Scan & Pay order created successfully!', 'success');
            } else {
                throw new Error('Failed to create order');
            }
        } catch (error) {
            console.error('Error creating Scan & Pay order:', error);
            showAlert('Failed to create order. Please try again.', 'error');
        }
    }

    async function updateOrderStatus(orderId, status) {
        try {
            const token = localStorage.getItem('staffToken');
            const response = await fetch(`/api/scanpay/${orderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (response.ok) {
                loadScanPayOrders();
                showAlert('Order status updated successfully!', 'success');
            } else {
                throw new Error('Failed to update status');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            showAlert('Failed to update order status. Please try again.', 'error');
        }
    }

    function viewOrderDetails(orderId) {
        // For now, just show an alert with order ID
        // In a full implementation, this could open a detailed modal
        showAlert(`Viewing details for Order #${orderId}`, 'info');
    }

    // HR FUNCTIONALITY
    async function loadHRRecords() {
        try {
            const response = await fetch('/api/hr');
            const records = await response.json();
            displayHRRecords(records);
        } catch (error) {
            console.error('Error loading HR records:', error);
        }
    }

    function displayHRRecords(records) {
        const container = document.getElementById('hrRecordsList');
        if (!container) return;
        container.innerHTML = records.map(record => `
            <div class="hr-record">
                <h4>${record.name} - ${record.position}</h4>
                <p><strong>Salary:</strong> ₦${record.salary}</p>
                <p><strong>Leave:</strong> ${record.leave}</p>
                <p><strong>Sick Days:</strong> ${record.sickDays}</p>
                <p><strong>Created:</strong> ${new Date(record.createdAt).toLocaleString()}</p>
            </div>
        `).join('');
    }

    function showHRRecordModal() {
        document.getElementById('hrRecordModal').style.display = 'block';
    }

    async function handleHRRecordSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const record = {
            name: formData.get('name'),
            position: formData.get('position'),
            salary: parseFloat(formData.get('salary')),
            leave: formData.get('leave'),
            sickDays: formData.get('sickDays')
        };
        try {
            const response = await fetch('/api/hr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record)
            });
            if (response.ok) {
                document.getElementById('hrRecordModal').style.display = 'none';
                event.target.reset();
                loadHRRecords();
                alert('HR record added!');
            }
        } catch (error) {
            console.error('Error adding HR record:', error);
        }
    }

    // STOCK CONTROL FUNCTIONALITY
    async function loadStockItems() {
        try {
            const response = await fetch('/api/stock');
            const items = await response.json();
            displayStockItems(items);
            await loadStockTransfers();
        } catch (error) {
            console.error('Error loading stock items:', error);
        }
    }

    function displayStockItems(items) {
        const container = document.getElementById('stockItemsList');
        if (!container) return;
        container.innerHTML = items.map(item => `
            <div class="stock-item">
                <h4>${item.name} (${item.category})</h4>
                <p><strong>Quantity:</strong> ${item.quantity}</p>
                <p><strong>Location:</strong> ${item.location}</p>
                <p><strong>Created:</strong> ${new Date(item.createdAt).toLocaleString()}</p>
            </div>
        `).join('');
    }

    function showStockItemModal() {
        document.getElementById('stockItemModal').style.display = 'block';
    }

    async function handleStockItemSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const item = {
            name: formData.get('name'),
            category: formData.get('category'),
            quantity: parseInt(formData.get('quantity')),
            location: formData.get('location')
        };
        try {
            const response = await fetch('/api/stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            if (response.ok) {
                document.getElementById('stockItemModal').style.display = 'none';
                event.target.reset();
                loadStockItems();
                alert('Stock item added!');
            }
        } catch (error) {
            console.error('Error adding stock item:', error);
        }
    }

    // STOCK TRANSFER FUNCTIONALITY
    async function loadStockTransfers() {
        try {
            const response = await fetch('/api/stock-transfer');
            const transfers = await response.json();
            displayStockTransfers(transfers);
        } catch (error) {
            console.error('Error loading stock transfers:', error);
        }
    }

    function displayStockTransfers(transfers) {
        const container = document.getElementById('stockTransfersList');
        if (!container) return;
        container.innerHTML = transfers.map(transfer => `
            <div class="stock-transfer">
                <h4>Transfer #${transfer.id}</h4>
                <p><strong>Item:</strong> ${transfer.itemName}</p>
                <p><strong>From:</strong> ${transfer.fromLocation}</p>
                <p><strong>To:</strong> ${transfer.toLocation}</p>
                <p><strong>Quantity:</strong> ${transfer.quantity}</p>
                <p><strong>Date:</strong> ${new Date(transfer.createdAt).toLocaleString()}</p>
            </div>
        `).join('');
    }

    function showStockTransferModal() {
        document.getElementById('stockTransferModal').style.display = 'block';
    }

    async function handleStockTransferSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const transfer = {
            itemName: formData.get('itemName'),
            fromLocation: formData.get('fromLocation'),
            toLocation: formData.get('toLocation'),
            quantity: parseInt(formData.get('quantity'))
        };
        try {
            const response = await fetch('/api/stock-transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transfer)
            });
            if (response.ok) {
                document.getElementById('stockTransferModal').style.display = 'none';
                event.target.reset();
                loadStockTransfers();
                alert('Stock transfer recorded!');
            }
        } catch (error) {
            console.error('Error recording stock transfer:', error);
        }
    }

    // AUTOMATED MESSAGING FUNCTIONALITY
    async function loadAutomatedMessages() {
        try {
            const response = await fetch('/api/messaging');
            const messages = await response.json();
            displayAutomatedMessages(messages);
        } catch (error) {
            console.error('Error loading automated messages:', error);
        }
    }

    function displayAutomatedMessages(messages) {
        const container = document.getElementById('automatedMessagesList');
        if (!container) return;
        container.innerHTML = messages.map(msg => `
            <div class="automated-message">
                <h4>${msg.subject}</h4>
                <p><strong>Recipient:</strong> ${msg.recipient}</p>
                <p><strong>Message:</strong> ${msg.content}</p>
                <p><strong>Created:</strong> ${new Date(msg.createdAt).toLocaleString()}</p>
            </div>
        `).join('');
    }

    function showAutomatedMessageModal() {
        document.getElementById('automatedMessageModal').style.display = 'block';
    }

    async function handleAutomatedMessageSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const message = {
            subject: formData.get('subject'),
            recipient: formData.get('recipient'),
            content: formData.get('content')
        };
        try {
            const response = await fetch('/api/messaging', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message)
            });
            if (response.ok) {
                document.getElementById('automatedMessageModal').style.display = 'none';
                event.target.reset();
                loadAutomatedMessages();
                alert('Automated message sent!');
            }
        } catch (error) {
            console.error('Error sending automated message:', error);
        }
    }

    // LOCATIONS FUNCTIONALITY
    async function loadLocationBranches() {
        try {
            const response = await fetch('/api/locations');
            const branches = await response.json();
            displayLocationBranches(branches);
        } catch (error) {
            console.error('Error loading location branches:', error);
        }
    }

    function displayLocationBranches(branches) {
        const container = document.getElementById('locationBranchesList');
        if (!container) return;
        container.innerHTML = branches.map(branch => `
            <div class="location-branch">
                <h4>${branch.name}</h4>
                <p><strong>Address:</strong> ${branch.address}</p>
                <p><strong>Manager:</strong> ${branch.manager}</p>
                <p><strong>Created:</strong> ${new Date(branch.createdAt).toLocaleString()}</p>
            </div>
        `).join('');
    }

    function showLocationBranchModal() {
        document.getElementById('locationBranchModal').style.display = 'block';
    }

    async function handleLocationBranchSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const branch = {
            name: formData.get('name'),
            address: formData.get('address'),
            manager: formData.get('manager')
        };
        try {
            const response = await fetch('/api/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(branch)
            });
            if (response.ok) {
                document.getElementById('locationBranchModal').style.display = 'none';
                event.target.reset();
                loadLocationBranches();
                alert('Location/branch added!');
            }
        } catch (error) {
            console.error('Error adding location/branch:', error);
        }
    }
// Removed stray closing curly brace

function setupServiceTabs() {
    const tabBtns = document.querySelectorAll('.service-tab-btn');
    const tabContents = document.querySelectorAll('.service-tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.serviceTab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

async function loadServiceRequests() {
    try {
        const response = await fetch('/api/service-requests');
        const requests = await response.json();
        displayServiceRequests(requests);
    } catch (error) {
        console.error('Error loading service requests:', error);
    }
}

function displayServiceRequests(requests) {
    const containers = {
        spa: document.getElementById('spaBookings'),
        events: document.getElementById('eventBookings'),
        concierge: document.getElementById('conciergeRequests')
    };
    
    Object.keys(containers).forEach(type => {
        if (containers[type]) {
            const filteredRequests = requests.filter(r => r.serviceType === type);
            containers[type].innerHTML = filteredRequests.map(request => `
                <div class="service-booking ${request.status}">
                    <h4>${request.serviceType} - ${request.customerId}</h4>
                    <p><strong>Date:</strong> ${new Date(request.serviceDateTime).toLocaleString()}</p>
                    <p><strong>Guests:</strong> ${request.serviceGuests}</p>
                    <p><strong>Details:</strong> ${request.serviceDetails}</p>
                    <p><strong>Status:</strong> ${request.status}</p>
                </div>
            `).join('');
        }
    });
}

async function loadGuestFeedback() {
    try {
        const response = await fetch('/api/feedback');
        const feedback = await response.json();
        displayGuestFeedback(feedback);
    } catch (error) {
        console.error('Error loading guest feedback:', error);
    }
}

function displayGuestFeedback(feedback) {
    const container = document.getElementById('guestFeedback');
    if (!container) return;

    container.innerHTML = feedback.map(item => `
        <div class="feedback-item">
            <h4>Customer ${item.customerId} - ${item.category}</h4>
            <div class="rating-stars">${'★'.repeat(item.rating)}${'☆'.repeat(5-item.rating)}</div>
            <p>${item.comments}</p>
            <p><strong>Date:</strong> ${new Date(item.createdAt).toLocaleString()}</p>
        </div>
    `).join('');
}

async function loadLostFoundItems() {
    try {
        const response = await fetch('/api/lost-found');
        const items = await response.json();
        displayLostFoundItems(items);
    } catch (error) {
        console.error('Error loading lost & found items:', error);
    }
}

function displayLostFoundItems(items) {
    const container = document.getElementById('lostFoundItems');
    if (!container) return;

    container.innerHTML = items.map(item => `
        <div class="lost-found-item ${item.status === 'claimed' ? 'claimed' : ''}">
            <h4>${item.type}: ${item.item}</h4>
            <p><strong>Location:</strong> ${item.location}</p>
            <p><strong>Date:</strong> ${new Date(item.dateTime || item.createdAt).toLocaleString()}</p>
            <p><strong>Status:</strong> ${item.status}</p>
            <p><strong>Notes:</strong> ${item.notes}</p>
            <button class="btn btn-sm btn-success" onclick="updateLostFoundStatus('${item.id}', 'claimed')">Mark as Claimed</button>
        </div>
    `).join('');
}

function showServiceModal() {
    loadCustomerOptions('serviceCustomer');
    document.getElementById('serviceModal').style.display = 'block';
}

function showFeedbackModal() {
    loadCustomerOptions('feedbackCustomer');
    document.getElementById('feedbackModal').style.display = 'block';
}

function showLostFoundModal() {
    loadCustomerOptions('lostFoundCustomer');
    document.getElementById('lostFoundModal').style.display = 'block';
}

// COMMUNICATION FUNCTIONALITY
async function loadCommunication() {
    await loadInternalMessages();
    await loadCallLogs();
    await loadEmergencyContacts();
}

async function loadInternalMessages() {
    try {
        const response = await fetch('/api/messages');
        const messages = await response.json();
        displayInternalMessages(messages);
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function displayInternalMessages(messages) {
    const container = document.getElementById('messagesList');
    if (!container) return;

    container.innerHTML = messages.map(message => `
        <div class="message-item ${message.priority === 'urgent' ? 'urgent' : ''}">
            <h5>${message.subject}</h5>
            <p><strong>To:</strong> ${message.recipient}</p>
            <p>${message.content}</p>
            <small>${new Date(message.createdAt).toLocaleString()}</small>
        </div>
    `).join('');
}

async function loadCallLogs() {
    try {
        const response = await fetch('/api/call-logs');
        const calls = await response.json();
        displayCallLogs(calls);
    } catch (error) {
        console.error('Error loading call logs:', error);
    }
}

function displayCallLogs(calls) {
    const container = document.getElementById('callsList');
    if (!container) return;

    container.innerHTML = calls.map(call => `
        <div class="call-item">
            <h5>${call.type}: ${call.contact || call.number}</h5>
            <p><strong>Purpose:</strong> ${call.purpose}</p>
            <p>${call.notes}</p>
            <small>${new Date(call.callDateTime || call.loggedAt).toLocaleString()}</small>
        </div>
    `).join('');
}

async function loadEmergencyContacts() {
    try {
        const response = await fetch('/api/emergency-contacts');
        const contacts = await response.json();
        displayEmergencyContacts(contacts);
    } catch (error) {
        console.error('Error loading emergency contacts:', error);
    }
}

function displayEmergencyContacts(contacts) {
    const container = document.getElementById('emergencyList');
    if (!container) return;

    container.innerHTML = contacts.map(contact => `
        <div class="emergency-contact">
            <div class="contact-name">${contact.name}</div>
            <div class="contact-number">${contact.number}</div>
            <div class="contact-type">${contact.type}</div>
        </div>
    `).join('');
}

function showMessageModal() {
    document.getElementById('messageModal').style.display = 'block';
}

function showCallLogModal() {
    document.getElementById('callLogModal').style.display = 'block';
}

function showEmergencyModal() {
    document.getElementById('emergencyModal').style.display = 'block';
}

function callEmergencyServices() {
    alert('🚨 EMERGENCY SERVICES CONTACTED 🚨\nThis would automatically dial 911 in a real implementation.');
}

// HELPER FUNCTIONS FOR FORM HANDLING
async function loadCustomerOptions(selectId) {
    try {
        const response = await fetch('/api/customers');
        const customers = await response.json();
        const select = document.getElementById(selectId);
        
        select.innerHTML = '<option value="">Select Customer</option>';
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name} (${customer.email})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading customer options:', error);
    }
}

async function loadRoomOptions(selectId) {
    try {
        const response = await fetch('/api/rooms');
        const rooms = await response.json();
        const select = document.getElementById(selectId);
        
        select.innerHTML = '<option value="">Select Room</option>';
        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = String(room.id);
            option.textContent = `${room.name} (${room.type})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading room options:', error);
    }
}

// STATUS UPDATE FUNCTIONS
async function updateTaskStatus(taskId, status) {
    try {
        await fetch(`/api/cleaning-tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        loadCleaningTasks();
    } catch (error) {
        console.error('Error updating task status:', error);
    }
}

async function updateMaintenanceStatus(requestId, status) {
    try {
        await fetch(`/api/maintenance/${requestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        loadMaintenanceRequests();
    } catch (error) {
        console.error('Error updating maintenance status:', error);
    }
}

async function updateLostFoundStatus(itemId, status) {
    try {
        await fetch(`/api/lost-found/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        loadLostFoundItems();
    } catch (error) {
        console.error('Error updating lost & found status:', error);
    }
}

async function updateStaffStatus(staffId) {
    currentStaffId = staffId;
    document.getElementById('staffStatusModal').style.display = 'block';
}

// NEW FORM HANDLERS

async function handleNotificationSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: formData.get('notificationRecipient') || document.getElementById('notificationRecipient').value,
                priority: formData.get('notificationPriority') || document.getElementById('notificationPriority').value,
                title: formData.get('notificationTitle') || document.getElementById('notificationTitle').value,
                message: formData.get('notificationMessage') || document.getElementById('notificationMessage').value
            })
        });
        
        if (response.ok) {
            document.getElementById('notificationModal').style.display = 'none';
            e.target.reset();
            loadNotifications();
            alert('Notification sent successfully!');
        }
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

async function handleStaffSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    // Check if this is an edit or create operation
    const editId = form.getAttribute('data-edit-id');
    const isEdit = editId !== null;
    
    const staffData = {
        personalId: formData.get('staffPersonalId') || document.getElementById('staffPersonalId').value,
        name: formData.get('staffName') || document.getElementById('staffName').value,
        email: formData.get('staffEmail') || document.getElementById('staffEmail').value,
        phone: formData.get('staffPhone') || document.getElementById('staffPhone').value,
        position: formData.get('staffPosition') || document.getElementById('staffPosition').value,
        shift: formData.get('staffShift') || document.getElementById('staffShift').value,
        hourlyRate: parseFloat(formData.get('staffSalary') || document.getElementById('staffSalary').value),
        startDate: formData.get('staffStartDate') || document.getElementById('staffStartDate').value,
        notes: formData.get('staffNotes') || document.getElementById('staffNotes').value
    };
    
    try {
        const url = isEdit ? `/api/staff/${editId}` : '/api/staff';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(staffData)
        });
        
        if (response.ok) {
            closeModal('staffModal');
            
            // Reset form and clear edit mode
            form.reset();
            form.removeAttribute('data-edit-id');
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Add Staff Member';
            
            // Reload staff data
            loadStaff();
            await loadCurrentStaffStatus();
            
            const message = isEdit ? 'Staff member updated successfully!' : 'Staff member added successfully!';
            showAlert(message, 'success');
            
        } else if (response.status === 403) {
            const errorData = await response.json();
            console.error('Access denied:', errorData);
            showAlert(`Access Denied: ${errorData.message || 'Only the Hotel Director can manage staff members'}`, 'error');
        } else {
            const errorText = await response.text();
            console.error('Server error:', response.status, errorText);
            showAlert(`Failed to ${isEdit ? 'update' : 'add'} staff member. Server error: ${response.status}`, 'error');
        }
    } catch (error) {
        console.error('Error submitting staff data:', error);
        showAlert(`Failed to ${isEdit ? 'update' : 'add'} staff member. Please check your connection and try again.`, 'error');
    }
}

async function handleClockInSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const personalId = formData.get('clockPersonalId') || document.getElementById('clockPersonalId').value;
        const action = formData.get('clockAction') || document.getElementById('clockAction').value;
        const location = formData.get('clockLocation') || document.getElementById('clockLocation').value;
        const notes = formData.get('clockNotes') || document.getElementById('clockNotes').value;
        const clockTime = formData.get('clockTime') || document.getElementById('clockTime').value;
        
        const requestBody = {
            personalId: personalId,
            action: action,
            location: location || 'Manual Entry',
            notes: notes || ''
        };
        
        // If specific time is provided, you might want to handle it differently
        // For now, we'll use current time as per the API design
        
        const response = await fetch('/api/clock-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        if (response.ok) {
            const result = await response.json();
            document.getElementById('clockInModal').style.display = 'none';
            e.target.reset();
            await loadCurrentStaffStatus();
            await loadStaff();
            alert(`${action.replace('-', ' ').toUpperCase()} recorded successfully!`);
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        console.error('Error recording clock action:', error);
        alert('Error recording clock action');
    }
}

async function handleScheduleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                staffId: parseInt(formData.get('scheduleStaff') || document.getElementById('scheduleStaff').value),
                date: formData.get('scheduleDate') || document.getElementById('scheduleDate').value,
                shift: formData.get('scheduleShift') || document.getElementById('scheduleShift').value,
                notes: formData.get('scheduleNotes') || document.getElementById('scheduleNotes').value
            })
        });
        
        if (response.ok) {
            document.getElementById('scheduleModal').style.display = 'none';
            e.target.reset();
            alert('Schedule created successfully!');
        }
    } catch (error) {
        console.error('Error creating schedule:', error);
    }
}

async function handleClockInSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/time-records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                staffId: parseInt(formData.get('clockStaff') || document.getElementById('clockStaff').value),
                action: formData.get('clockAction') || document.getElementById('clockAction').value,
                time: formData.get('clockTime') || document.getElementById('clockTime').value,
                notes: formData.get('clockNotes') || document.getElementById('clockNotes').value
            })
        });
        
        if (response.ok) {
            document.getElementById('clockInModal').style.display = 'none';
            e.target.reset();
            loadStaff(); // Refresh staff status
            alert('Time recorded successfully!');
        }
    } catch (error) {
        console.error('Error recording time:', error);
    }
}

async function handleMaintenanceSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/maintenance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId: formData.get('maintenanceRoom') || document.getElementById('maintenanceRoom').value || null,
                category: formData.get('maintenanceCategory') || document.getElementById('maintenanceCategory').value,
                priority: formData.get('maintenancePriority') || document.getElementById('maintenancePriority').value,
                reporter: formData.get('maintenanceReporter') || document.getElementById('maintenanceReporter').value,
                description: formData.get('maintenanceDescription') || document.getElementById('maintenanceDescription').value
            })
        });
        
        if (response.ok) {
            document.getElementById('maintenanceModal').style.display = 'none';
            e.target.reset();
            loadMaintenanceRequests();
            alert('Maintenance request submitted successfully!');
        }
    } catch (error) {
        console.error('Error submitting maintenance request:', error);
    }
}

async function handleSupplySubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/supplies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: formData.get('supplyName') || document.getElementById('supplyName').value,
                category: formData.get('supplyCategory') || document.getElementById('supplyCategory').value,
                stock: parseInt(formData.get('supplyStock') || document.getElementById('supplyStock').value),
                minimum: parseInt(formData.get('supplyMinimum') || document.getElementById('supplyMinimum').value),
                supplier: formData.get('supplySupplier') || document.getElementById('supplySupplier').value,
                unitCost: parseFloat(formData.get('supplyCost') || document.getElementById('supplyCost').value)
            })
        });
        
        if (response.ok) {
            document.getElementById('supplyModal').style.display = 'none';
            e.target.reset();
            loadSupplies();
            alert('Supply added successfully!');
        }
    } catch (error) {
        console.error('Error adding supply:', error);
    }
}

async function handleCleaningSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/cleaning-tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId: formData.get('cleaningRoom') || document.getElementById('cleaningRoom').value,
                type: formData.get('cleaningType') || document.getElementById('cleaningType').value,
                assignee: formData.get('cleaningAssignee') || document.getElementById('cleaningAssignee').value || null,
                instructions: formData.get('cleaningInstructions') || document.getElementById('cleaningInstructions').value
            })
        });
        
        if (response.ok) {
            document.getElementById('cleaningModal').style.display = 'none';
            e.target.reset();
            loadCleaningTasks();
            alert('Cleaning task created successfully!');
        }
    } catch (error) {
        console.error('Error creating cleaning task:', error);
    }
}

async function handleServiceSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/service-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId: parseInt(formData.get('serviceCustomer') || document.getElementById('serviceCustomer').value),
                serviceType: formData.get('serviceType') || document.getElementById('serviceType').value,
                serviceDateTime: formData.get('serviceDateTime') || document.getElementById('serviceDateTime').value,
                serviceGuests: parseInt(formData.get('serviceGuests') || document.getElementById('serviceGuests').value),
                serviceDetails: formData.get('serviceDetails') || document.getElementById('serviceDetails').value
            })
        });
        
        if (response.ok) {
            document.getElementById('serviceModal').style.display = 'none';
            e.target.reset();
            loadServiceRequests();
            alert('Service request submitted successfully!');
        }
    } catch (error) {
        console.error('Error submitting service request:', error);
    }
}

async function handleFeedbackSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId: parseInt(formData.get('feedbackCustomer') || document.getElementById('feedbackCustomer').value),
                category: formData.get('feedbackCategory') || document.getElementById('feedbackCategory').value,
                rating: parseInt(formData.get('feedbackRating') || document.getElementById('feedbackRating').value),
                comments: formData.get('feedbackComments') || document.getElementById('feedbackComments').value
            })
        });
        
        if (response.ok) {
            document.getElementById('feedbackModal').style.display = 'none';
            e.target.reset();
            loadGuestFeedback();
            alert('Feedback submitted successfully!');
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
    }
}

async function handleLostFoundSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/lost-found', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: formData.get('lostFoundType') || document.getElementById('lostFoundType').value,
                item: formData.get('lostFoundItem') || document.getElementById('lostFoundItem').value,
                location: formData.get('lostFoundLocation') || document.getElementById('lostFoundLocation').value,
                dateTime: formData.get('lostFoundDateTime') || document.getElementById('lostFoundDateTime').value,
                customerId: formData.get('lostFoundCustomer') || document.getElementById('lostFoundCustomer').value || null,
                notes: formData.get('lostFoundNotes') || document.getElementById('lostFoundNotes').value
            })
        });
        
        if (response.ok) {
            document.getElementById('lostFoundModal').style.display = 'none';
            e.target.reset();
            loadLostFoundItems();
            alert('Lost & found item recorded successfully!');
        }
    } catch (error) {
        console.error('Error recording lost & found item:', error);
    }
}

async function handleMessageSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: formData.get('messageRecipient') || document.getElementById('messageRecipient').value,
                priority: formData.get('messagePriority') || document.getElementById('messagePriority').value,
                subject: formData.get('messageSubject') || document.getElementById('messageSubject').value,
                content: formData.get('messageContent') || document.getElementById('messageContent').value
            })
        });
        
        if (response.ok) {
            document.getElementById('messageModal').style.display = 'none';
            e.target.reset();
            loadInternalMessages();
            alert('Message sent successfully!');
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

async function handleCallLogSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/call-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: formData.get('callType') || document.getElementById('callType').value,
                number: formData.get('callNumber') || document.getElementById('callNumber').value,
                contact: formData.get('callContact') || document.getElementById('callContact').value,
                callDateTime: formData.get('callDateTime') || document.getElementById('callDateTime').value,
                purpose: formData.get('callPurpose') || document.getElementById('callPurpose').value,
                notes: formData.get('callNotes') || document.getElementById('callNotes').value
            })
        });
        
        if (response.ok) {
            document.getElementById('callLogModal').style.display = 'none';
            e.target.reset();
            loadCallLogs();
            alert('Call logged successfully!');
        }
    } catch (error) {
        console.error('Error logging call:', error);
    }
}

async function handleEmergencySubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        // Emergency notification - send to all staff
        const response = await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: 'all',
                priority: 'urgent',
                title: `🚨 EMERGENCY: ${formData.get('emergencyType') || document.getElementById('emergencyType').value}`,
                message: `Location: ${formData.get('emergencyLocation') || document.getElementById('emergencyLocation').value}\n${formData.get('emergencyDescription') || document.getElementById('emergencyDescription').value}`
            })
        });
        
        if (response.ok) {
            document.getElementById('emergencyModal').style.display = 'none';
            e.target.reset();
            alert('🚨 EMERGENCY ALERT SENT TO ALL STAFF! 🚨');
        }
    } catch (error) {
        console.error('Error sending emergency alert:', error);
    }
}
