// Load and display guest kitchen orders for kitchen staff
async function loadKitchenGuestOrders() {
    const container = document.getElementById('kitchenGuestOrdersContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading guest orders...</div>';
    try {
        const response = await fetch('/api/kitchen/guest-orders', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch guest kitchen orders');
        const orders = await response.json();
        if (!orders.length) {
            container.innerHTML = '<div class="empty">No guest food orders at the moment.</div>';
            return;
        }
        container.innerHTML = '';
        orders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'order-card guest-order-card';
            card.innerHTML = `
                <div>
                    <h4>Order #${order.id}</h4>
                    <p><strong>Room:</strong> ${order.roomNumber}</p>
                    <p><strong>Customer:</strong> ${order.customerId}</p>
                    <p><strong>Priority:</strong> ${order.priority || 'medium'}</p>
                    <p><strong>Items:</strong> ${order.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</p>
                    <p><strong>Requested:</strong> ${order.requestedTime ? new Date(order.requestedTime).toLocaleString() : ''}</p>
                    <p><strong>Description:</strong> ${order.description || ''}</p>
                </div>
                <div>
                    <span class="order-status status-${order.status}">${order.status}</span>
                    <button class="btn btn-success" onclick="updateGuestOrderStatus('${order.id}', '${order.status}')">
                        <i class="fas fa-check"></i> Next Status
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = '<div class="error">Error loading guest orders.</div>';
        console.error('Error loading guest kitchen orders:', err);
    }
}

// Update guest order status (advance to next stage)
async function updateGuestOrderStatus(orderId, currentStatus) {
    const statusFlow = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed'];
    const idx = statusFlow.indexOf(currentStatus);
    const nextStatus = idx >= 0 && idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
    if (!nextStatus) {
        showAlert('Order is already completed or cannot be advanced.', 'info');
        return;
    }
    try {
        const response = await fetch(`/api/guest/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            },
            body: JSON.stringify({ status: nextStatus })
        });
        if (!response.ok) throw new Error('Failed to update order status');
        showAlert('Order status updated!', 'success');
        // Refresh all department order lists
        loadKitchenGuestOrders();
        loadRoomServiceGuestOrders();
        loadSecurityGuestOrders();
        loadHousekeepingGuestOrders();
    } catch (err) {
        showAlert('Error updating order status', 'error');
        console.error('Error updating guest order status:', err);
    }
}

// Load and display room service guest orders
async function loadRoomServiceGuestOrders() {
    const container = document.getElementById('roomServiceGuestOrdersContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading room service orders...</div>';
    try {
        const response = await fetch('/api/room-service/guest-orders', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch room service orders');
        const orders = await response.json();
        if (!orders.length) {
            container.innerHTML = '<div class="empty">No room service orders at the moment.</div>';
            return;
        }
        container.innerHTML = '';
        orders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'order-card guest-order-card room-service-order';
            card.innerHTML = `
                <div>
                    <h4>Order #${order.id.slice(-6)}</h4>
                    <p><strong>Room:</strong> ${order.roomNumber}</p>
                    <p><strong>Customer:</strong> ${order.customerId}</p>
                    <p><strong>Service:</strong> ${order.serviceType || 'Room Service'}</p>
                    <p><strong>Priority:</strong> ${order.priority || 'medium'}</p>
                    ${order.items && order.items.length ? `<p><strong>Items:</strong> ${order.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</p>` : ''}
                    <p><strong>Request:</strong> ${order.description}</p>
                    <p><strong>Requested:</strong> ${order.requestedTime ? new Date(order.requestedTime).toLocaleString() : ''}</p>
                </div>
                <div>
                    <span class="order-status status-${order.status}">${order.status}</span>
                    <button class="btn btn-success" onclick="updateGuestOrderStatus('${order.id}', '${order.status}')">
                        <i class="fas fa-check"></i> Next Status
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = '<div class="error">Error loading room service orders.</div>';
        console.error('Error loading room service guest orders:', err);
    }
}

// Load and display security guest orders
async function loadSecurityGuestOrders() {
    const container = document.getElementById('securityGuestOrdersContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading security requests...</div>';
    try {
        const response = await fetch('/api/security/guest-orders', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch security requests');
        const orders = await response.json();
        if (!orders.length) {
            container.innerHTML = '<div class="empty">No security requests at the moment.</div>';
            return;
        }
        container.innerHTML = '';
        orders.forEach(order => {
            const card = document.createElement('div');
            card.className = `order-card guest-order-card security-order priority-${order.priority}`;
            card.innerHTML = `
                <div>
                    <h4>Request #${order.id.slice(-6)}</h4>
                    <p><strong>Room:</strong> ${order.roomNumber}</p>
                    <p><strong>Customer:</strong> ${order.customerId}</p>
                    <p><strong>Type:</strong> ${order.serviceType || order.orderType}</p>
                    <p><strong>Priority:</strong> <span class="priority-${order.priority}">${(order.priority || 'medium').toUpperCase()}</span></p>
                    <p><strong>Description:</strong> ${order.description}</p>
                    <p><strong>Requested:</strong> ${order.requestedTime ? new Date(order.requestedTime).toLocaleString() : ''}</p>
                    ${order.assignedTo ? `<p><strong>Assigned to:</strong> ${order.assignedTo}</p>` : ''}
                </div>
                <div>
                    <span class="order-status status-${order.status}">${order.status}</span>
                    <button class="btn btn-warning" onclick="assignSecurityOrder('${order.id}')">
                        <i class="fas fa-user-shield"></i> Assign
                    </button>
                    <button class="btn btn-success" onclick="updateGuestOrderStatus('${order.id}', '${order.status}')">
                        <i class="fas fa-check"></i> Update
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = '<div class="error">Error loading security requests.</div>';
        console.error('Error loading security guest orders:', err);
    }
}

// Load and display housekeeping guest orders
async function loadHousekeepingGuestOrders() {
    const container = document.getElementById('housekeepingGuestOrdersContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading housekeeping requests...</div>';
    try {
        const response = await fetch('/api/housekeeping/guest-orders', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch housekeeping requests');
        const orders = await response.json();
        if (!orders.length) {
            container.innerHTML = '<div class="empty">No housekeeping requests at the moment.</div>';
            return;
        }
        container.innerHTML = '';
        orders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'order-card guest-order-card housekeeping-order';
            card.innerHTML = `
                <div>
                    <h4>Request #${order.id.slice(-6)}</h4>
                    <p><strong>Room:</strong> ${order.roomNumber}</p>
                    <p><strong>Customer:</strong> ${order.customerId}</p>
                    <p><strong>Type:</strong> ${order.serviceType || order.orderType}</p>
                    <p><strong>Priority:</strong> ${order.priority || 'medium'}</p>
                    <p><strong>Description:</strong> ${order.description}</p>
                    <p><strong>Requested:</strong> ${order.requestedTime ? new Date(order.requestedTime).toLocaleString() : ''}</p>
                    ${order.assignedTo ? `<p><strong>Assigned to:</strong> ${order.assignedTo}</p>` : ''}
                </div>
                <div>
                    <span class="order-status status-${order.status}">${order.status}</span>
                    <button class="btn btn-info" onclick="assignHousekeepingOrder('${order.id}')">
                        <i class="fas fa-user-check"></i> Assign
                    </button>
                    <button class="btn btn-success" onclick="updateGuestOrderStatus('${order.id}', '${order.status}')">
                        <i class="fas fa-check"></i> Next Status
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = '<div class="error">Error loading housekeeping requests.</div>';
        console.error('Error loading housekeeping guest orders:', err);
    }
}

// Helper function to assign security orders
async function assignSecurityOrder(orderId) {
    const staffName = prompt('Assign to security staff member:');
    if (!staffName) return;
    
    try {
        const response = await fetch(`/api/guest/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            },
            body: JSON.stringify({ assignedTo: staffName })
        });
        if (!response.ok) throw new Error('Failed to assign order');
        showAlert('Security request assigned successfully!', 'success');
        loadSecurityGuestOrders();
    } catch (err) {
        showAlert('Error assigning security request', 'error');
        console.error('Error assigning security order:', err);
    }
}

// Helper function to assign housekeeping orders
async function assignHousekeepingOrder(orderId) {
    const staffName = prompt('Assign to housekeeping staff member:');
    if (!staffName) return;
    
    try {
        const response = await fetch(`/api/guest/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            },
            body: JSON.stringify({ assignedTo: staffName })
        });
        if (!response.ok) throw new Error('Failed to assign order');
        showAlert('Housekeeping request assigned successfully!', 'success');
        loadHousekeepingGuestOrders();
    } catch (err) {
        showAlert('Error assigning housekeeping request', 'error');
        console.error('Error assigning housekeeping order:', err);
    }
}
// Hotel Manager JavaScript
console.log('Script loading...');

// Global variables
let customers = []; // Store customers globally for helper functions

// Theme Management System
function initTheme() {
    // Get saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Show theme change notification
    showAlert(`Switched to ${newTheme} theme`, 'success');
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update theme toggle icon
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        if (theme === 'dark') {
            themeIcon.className = 'fas fa-sun';
            themeIcon.title = 'Switch to Light Theme';
        } else {
            themeIcon.className = 'fas fa-moon';  
            themeIcon.title = 'Switch to Dark Theme';
        }
    }
    
    // Update meta theme color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.content = theme === 'dark' ? '#1e293b' : '#2c3e50';
    }
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initializeDashboard();
    // Load guest orders for all departments if containers are present
    if (document.getElementById('kitchenGuestOrdersContainer')) {
        loadKitchenGuestOrders();
    }
    if (document.getElementById('roomServiceGuestOrdersContainer')) {
        loadRoomServiceGuestOrders();
    }
    if (document.getElementById('securityGuestOrdersContainer')) {
        loadSecurityGuestOrders();
    }
    if (document.getElementById('housekeepingGuestOrdersContainer')) {
        loadHousekeepingGuestOrders();
    }
});

// Initialize dashboard counts
async function initializeDashboard() {
    // Check if user is authenticated before making API calls
    const currentToken = localStorage.getItem('staffToken');
    if (!currentToken) {
        console.log('No authentication token, skipping dashboard initialization');
        return;
    }
    
    try {
        // Load laundry tasks count
        const laundryResponse = await fetch('/api/laundry');
        if (laundryResponse.ok) {
            const laundryTasks = await laundryResponse.json();
            updateLaundryCount(laundryTasks);
        }
        
        // Load stock valuation for dashboard
        const stockResponse = await fetch('/api/stock/valuation');
        if (stockResponse.ok) {
            const stockValuation = await stockResponse.json();
            updateDashboardStockValue(stockValuation.totalStockValue);
        }
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        // Don't redirect here, just log the error
    }
}

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
            
            // Clear any editing state attributes
            form.removeAttribute('data-edit-id');
            form.removeAttribute('data-customer-id');
            
            // Reset submit button text to default
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                const btnText = submitBtn.getAttribute('data-default-text');
                if (btnText) {
                    submitBtn.textContent = btnText;
                } else {
                    // Set common default texts based on modal
                    if (modalId.includes('customer')) submitBtn.textContent = 'Add Customer';
                    else if (modalId.includes('booking')) submitBtn.textContent = 'Create Booking';
                    else if (modalId.includes('bar')) submitBtn.textContent = 'Add Item';
                    else if (modalId.includes('kitchen')) submitBtn.textContent = 'Add Item';
                    else if (modalId.includes('order')) submitBtn.textContent = 'Place Order';
                    else submitBtn.textContent = 'Submit';
                }
            }
        }
        
        console.log(`Modal ${modalId} closed and form reset`);
    } else {
        console.warn(`Modal with ID ${modalId} not found`);
    }
}

// Show modal function
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
        
        // Focus on first input after a short delay
        setTimeout(() => {
            const firstInput = modal.querySelector('input, select');
            if (firstInput) firstInput.focus();
        }, 100);
        
        console.log(`Modal ${modalId} opened`);
    } else {
        console.warn(`Modal with ID ${modalId} not found`);
    }
}

// Authentication check and setup
let staffToken = localStorage.getItem('staffToken');
let staffInfo = JSON.parse(localStorage.getItem('staffInfo') || '{}');

console.log('Initial token check:', staffToken ? 'Token found' : 'No token');

// Check if we're on the staff login page
const isStaffLoginPage = window.location.pathname.includes('staff-login');
const isGuestPortal = window.location.pathname.includes('guest');
const isAdminPage = window.location.pathname.includes('admin');

if (!staffToken && !isStaffLoginPage && !isGuestPortal && !isAdminPage) {
    console.log('No token found, redirecting to login');
    // Show a brief message before redirect
    document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: 'Inter', sans-serif; background: #2c3e50; color: white; text-align: center;">
            <div>
                <i class="fas fa-lock" style="font-size: 3rem; margin-bottom: 1rem; color: #D4AF37;"></i>
                <h2>Authentication Required</h2>
                <p>Redirecting to staff login...</p>
                <div style="margin-top: 1rem;">
                    <a href="/staff-login.html" style="color: #D4AF37; text-decoration: none; font-weight: 500;">Click here if not redirected automatically</a>
                </div>
            </div>
        </div>
    `;
    setTimeout(() => {
        window.location.href = '/staff-login.html';
    }, 2000);
} else if (staffToken && !isStaffLoginPage) {
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
            // Return a rejected promise for unauthorized requests
            return Promise.reject(new Error('Authentication required'));
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
    return originalFetch(url, options)
        .then(response => {
            // Handle 401 unauthorized responses
            if (response.status === 401 && !window.location.pathname.includes('staff-login')) {
                console.warn('🔒 Unauthorized request, redirecting to login');
                localStorage.removeItem('staffToken');
                localStorage.removeItem('staffInfo');
                window.location.href = '/staff-login.html';
                return Promise.reject(new Error('Authentication expired'));
            }
            return response;
        });
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
    
    // Initialize category overview system
    if (!window.location.pathname.includes('admin')) {
        console.log('Initializing category overview...');
        // Show overview by default
        showOverview();
        
        // Update stats initially
        setTimeout(updateCategoryStats, 1000);
        
        // Update stats every 30 seconds
        setInterval(updateCategoryStats, 30000);
    }
});

// Global refresh function
function refreshAllData() {
    // Force cache clear
    if ('caches' in window) {
        caches.keys().then(function(names) {
            for (let name of names) {
                caches.delete(name);
            }
        });
    }
    
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'rooms';
    loadTabContent(activeTab);
    updateBadgeCounts();
    
    // Update category stats if on overview
    if (document.getElementById('categoryOverview').style.display !== 'none') {
        updateCategoryStats();
    }
    
    // Show refresh feedback
    const refreshBtn = event?.target.closest('.btn');
    if (refreshBtn) {
        const originalText = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        refreshBtn.disabled = true;
        
        setTimeout(() => {
            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
        }, 1000);
    }
}

// Helper to compare IDs (string-safe)
function idEq(a, b) {
    if (a === undefined || b === undefined) return false;
    return String(a) === String(b);
}

// Update badge counts
async function updateBadgeCounts() {
    try {
        const token = localStorage.getItem('staffToken');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const [rooms, customers] = await Promise.all([
            fetch('/api/rooms', { headers }).then(r => r.ok ? r.json() : []),
            fetch('/api/customers', { headers }).then(r => r.ok ? r.json() : [])
        ]);
        
        const roomsCount = document.getElementById('roomsCount');
        const customersCount = document.getElementById('customersCount');
        
        if (roomsCount) {
            const safeRooms = Array.isArray(rooms) ? rooms : [];
            const occupiedCount = safeRooms.filter(r => r.status === 'occupied').length;
            roomsCount.textContent = `${safeRooms.length} Rooms (${occupiedCount} Occupied)`;
        }
        
        if (customersCount) {
            const safeCustomers = Array.isArray(customers) ? customers : [];
            customersCount.textContent = `${safeCustomers.length} Customers`;
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
            initializeLoungeManagement();
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
        case 'guest-orders':
            await loadGuestOrders();
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
        console.log('🔍 First room data:', rooms[0]);
        console.log('🔍 Room names:', rooms.map(r => ({ id: r._id, name: r.name, number: r.number })));
        
        // Debug: Check for rooms with undefined names
        const undefinedNameRooms = rooms.filter(r => !r.name);
        if (undefinedNameRooms.length > 0) {
            console.warn('⚠️ Found rooms with undefined names:', undefinedNameRooms);
        }
        
        const roomsGrid = document.getElementById('roomsGrid');
        roomsGrid.innerHTML = '';
        
        rooms.forEach(room => {
            // Ensure we have a fallback name system
            const roomName = room.name || room.number || `Room ${room.legacyId || room.id}` || 'Unnamed Room';
            console.log('🏠 Displaying room:', { id: room.id, originalName: room.name, displayName: roomName });
            
            const roomCard = document.createElement('div');
            roomCard.className = 'room-card';
            roomCard.innerHTML = `
                <div class="room-header">
                    <div>
                        <div class="room-name">${roomName}</div>
                        <div class="room-type">${room.type}</div>
                    </div>
                    <span class="room-status ${room.status}">${room.status}</span>
                </div>
                <div class="room-price">
                    ₦${room.price.toLocaleString()}
                    ${staffInfo.position === 'director' ? `
                    <button class="btn-price-edit" onclick="editRoomPrice('${room.id}', ${room.price})" title="Edit Price - Director Only">
                        <i class="fas fa-edit"></i>
                    </button>` : ''}
                </div>
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
    const token = localStorage.getItem('staffToken');
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    fetch(`/api/rooms`, { headers })
        .then(response => response.ok ? response.json() : [])
        .then(rooms => {
            const safeRooms = Array.isArray(rooms) ? rooms : [];
            const room = safeRooms.find(r => idEq(r.id, roomId));
            if (room) {
                const roomName = room.name || room.number || `Room ${room.legacyId || room.id}` || 'Unnamed Room';
                alert(`Room Details:\n\nRoom: ${roomName}\nType: ${room.type}\nStatus: ${room.status}\nPrice: ₦${room.price}/night\n${room.currentGuest ? `Guest: Customer #${room.currentGuest}` : 'No current guest'}`);
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
        
        customers = await response.json(); // Update global customers array
        
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
                <td>
                    <div class="customer-id-display">
                        <strong class="customer-id-main">${customer.customerId || `CUST${String(customer.id).padStart(3, '0')}`}</strong>
                        <button class="copy-id-btn" onclick="copyCustomerId('${customer.customerId || `CUST${String(customer.id).padStart(3, '0')}`}')" title="Copy Customer ID">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <small class="customer-id-note">Give this ID to guest for portal access</small>
                </td>
                <td>${customer.name || 'N/A'}</td>
                <td>${customer.email || 'N/A'}</td>
                <td>${customer.phone || 'N/A'}</td>
                <td><span class="room-badge">${customer.roomNumber || 'Not assigned'}</span></td>
                <td><span class="status-badge ${customer.isActive ? 'status-active' : 'status-inactive'}">${customer.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <button class="btn btn-primary" onclick="editCustomer('${customer.id}')" title="Edit Customer">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-success" onclick="printCustomerCard('${customer.id}')" title="Print Customer Card">
                        <i class="fas fa-id-card"></i>
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
                    <td>
                        <div class="customer-id-display">
                            <strong class="customer-id-main">${customer.customerId || `CUST${String(customer.id).padStart(3, '0')}`}</strong>
                            <button class="copy-id-btn" onclick="copyCustomerId('${customer.customerId || `CUST${String(customer.id).padStart(3, '0')}`}')" title="Copy Customer ID">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                        <small class="customer-id-note">Give this ID to guest</small>
                    </td>
                    <td>${customer.name}</td>
                    <td>${customer.email}</td>
                    <td>${customer.phone}</td>
                    <td><span class="room-badge">${customer.roomNumber || 'Not assigned'}</span></td>
                    <td><span class="status-badge ${customer.isActive !== false ? 'status-active' : 'status-inactive'}">${customer.isActive !== false ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn btn-primary" onclick="editCustomer('${customer.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-success" onclick="printCustomerCard('${customer.id}')" title="Print Customer Card">
                            <i class="fas fa-id-card"></i>
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
            const modal = closeBtn.closest('.modal');
            if (modal && modal.id) {
                closeModal(modal.id);
            } else {
                // Fallback if modal doesn't have ID
                modal.style.display = 'none';
            }
        });
    });
    
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            if (event.target.id) {
                closeModal(event.target.id);
            } else {
                // Fallback if modal doesn't have ID
                event.target.style.display = 'none';
            }
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
            closeModal('bookingModal');
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
            closeModal('customerModal');
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
        
        closeModal('customerModal');
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

// Copy customer ID to clipboard
function copyCustomerId(customerId) {
    navigator.clipboard.writeText(customerId).then(() => {
        showAlert(`Customer ID ${customerId} copied to clipboard!`, 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = customerId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showAlert(`Customer ID ${customerId} copied to clipboard!`, 'success');
    });
}

// Print customer card with ID
function printCustomerCard(customerId) {
    // Find customer data
    const customer = customers.find(c => c.id == customerId);
    if (!customer) {
        showAlert('Customer not found!', 'error');
        return;
    }
    
    const customerIdFormatted = customer.customerId || `CUST${String(customer.id).padStart(3, '0')}`;
    
    // Create printable customer card
    const cardContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 2px solid #333; border-radius: 10px; max-width: 400px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #2c3e50; margin: 0;">🏨 9JA LUXURY HOTEL</h2>
                <p style="color: #7f8c8d; margin: 5px 0;">Guest Access Card</p>
            </div>
            <hr style="border: 1px solid #bdc3c7; margin: 20px 0;">
            <div style="margin: 15px 0;">
                <strong style="color: #e74c3c; font-size: 18px;">CUSTOMER ID:</strong>
                <div style="font-size: 24px; font-weight: bold; color: #2c3e50; text-align: center; background: #ecf0f1; padding: 10px; border-radius: 5px; margin: 10px 0;">${customerIdFormatted}</div>
            </div>
            <div style="margin: 15px 0;">
                <strong>Guest Name:</strong> ${customer.name}<br>
                <strong>Room:</strong> ${customer.roomNumber || 'Not assigned'}<br>
                <strong>Check-in:</strong> ${customer.checkInDate ? new Date(customer.checkInDate).toLocaleDateString() : 'N/A'}
            </div>
            <hr style="border: 1px solid #bdc3c7; margin: 20px 0;">
            <div style="font-size: 12px; color: #7f8c8d;">
                <p><strong>🌐 Guest Portal Access:</strong></p>
                <p>1. Go to guest portal on any device</p>
                <p>2. Enter your Customer ID: <strong>${customerIdFormatted}</strong></p>
                <p>3. Access kitchen ordering, visitor registration & room services</p>
            </div>
        </div>
    `;
    
    // Open print window
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    printWindow.document.write(`
        <html>
            <head>
                <title>Customer Card - ${customer.name}</title>
                <style>
                    body { margin: 20px; }
                    @media print {
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>
                ${cardContent}
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(() => window.close(), 100);
                    };
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
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
            closeModal('barItemModal');
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
            closeModal('orderModal');
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
            option.textContent = `${room.name} - ${room.type} (${room.price}/night)`;
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
    
    // ROOM PRICE EDITING FUNCTIONS
    let currentEditingRoomId = null;
    
    // Show room price editing modal
    async function editRoomPrice(roomId, currentPrice) {
        // Check if user is director
        if (staffInfo.position !== 'director') {
            showAlert('Access denied. Only the Hotel Director can edit room prices.', 'danger');
            return;
        }
        
        currentEditingRoomId = roomId;
        
        try {
            // Fetch room details
            const token = localStorage.getItem('staffToken');
            const response = await fetch(`/api/rooms/${roomId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const room = await response.json();
                
                // Populate modal with room information
                document.getElementById('priceEditRoomName').textContent = room.name || `Room ${room.number || room.legacyId}`;
                document.getElementById('priceEditRoomType').textContent = room.type;
                document.getElementById('currentPriceDisplay').textContent = `₦${currentPrice.toLocaleString()}`;
                document.getElementById('newRoomPrice').value = currentPrice;
                document.getElementById('roomIdToEdit').value = roomId;
                
                // Show modal
                const modal = document.getElementById('roomPriceModal');
                modal.style.display = 'flex';
                modal.classList.add('show');
                
                // Focus on price input
                setTimeout(() => {
                    document.getElementById('newRoomPrice').focus();
                    document.getElementById('newRoomPrice').select();
                }, 100);
            }
        } catch (error) {
            console.error('Error fetching room details:', error);
            showAlert('Error loading room details', 'error');
        }
    }
    
    // Set quick price option
    function setQuickPrice(price) {
        document.getElementById('newRoomPrice').value = price;
    }
    
    // Handle room price form submission
    async function handleRoomPriceSubmit(event) {
        event.preventDefault();
        
        // Check if user is director
        if (staffInfo.position !== 'director') {
            showAlert('Access denied. Only the Hotel Director can edit room prices.', 'danger');
            return;
        }
        
        const formData = new FormData(event.target);
        const newPrice = parseInt(formData.get('price'));
        const roomId = formData.get('roomId');
        const reason = formData.get('reason');
        const notes = formData.get('notes');
        
        // Validation
        if (!newPrice || newPrice < 1000 || newPrice > 1000000) {
            showAlert('Please enter a valid price between ₦1,000 and ₦1,000,000', 'error');
            return;
        }
        
        // Confirmation dialog
        const currentPriceText = document.getElementById('currentPriceDisplay').textContent;
        const confirmMessage = `Are you sure you want to change the room price from ${currentPriceText} to ₦${newPrice.toLocaleString()}?`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        try {
            const token = localStorage.getItem('staffToken');
            const response = await fetch(`/api/rooms/${roomId}/price`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    price: newPrice,
                    reason: reason,
                    notes: notes,
                    updatedBy: 'Hotel Director' // This could be dynamic based on logged-in user
                })
            });
            
            if (response.ok) {
                closeModal('roomPriceModal');
                loadRooms(); // Refresh rooms display
                showAlert(`Room price updated to ₦${newPrice.toLocaleString()}!`, 'success');
                
                // Reset form
                event.target.reset();
                currentEditingRoomId = null;
            } else {
                const errorData = await response.json();
                showAlert(errorData.error || 'Error updating room price', 'error');
            }
        } catch (error) {
            console.error('Error updating room price:', error);
            showAlert('Error updating room price', 'error');
        }
    }
    
    // Make functions globally available
    window.editRoomPrice = editRoomPrice;
    window.setQuickPrice = setQuickPrice;
    window.handleRoomPriceSubmit = handleRoomPriceSubmit;
    
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
                    console.log(`🔄 Updating staff status for ID: ${currentStaffId} to: ${newStatus}`);
                    
                    const response = await fetch(`/api/staff/${currentStaffId}/status`, {
                        method: 'PUT',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                        },
                        body: JSON.stringify({ status: newStatus })
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        console.log('✅ Staff status updated successfully:', result);
                        
                        await loadStaff(); // Reload staff list
                        await loadCurrentStaffStatus(); // Update current status display
                        closeModal('staffStatusModal');
                        showAlert('Staff status updated successfully!', 'success');
                        currentStaffId = null;
                    } else {
                        const error = await response.json();
                        console.error('❌ Error response:', error);
                        showAlert(error.error || 'Error updating staff status', 'error');
                    }
                } catch (error) {
                    console.error('❌ Network error updating staff status:', error);
                    showAlert('Network error: Could not update staff status', 'error');
                }
            } else {
                showAlert('Please select a status', 'error');
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
            closeModal('policeReportModal');
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
            closeModal('paymentModal');
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
            closeModal('refundModal');
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
        console.log('🔄 Loading staff data...');
        const response = await fetch('/api/staff', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const staff = await response.json();
        console.log('✅ Staff data loaded:', staff.length, 'members');
        console.log('📊 Staff statuses:', staff.map(s => `${s.name}: ${s.status}`));
        
        // Store staff globally for reference
        window.staff = staff;
        
        displayStaff(staff);
        updateStaffStats(staff);
    } catch (error) {
        console.error('❌ Error loading staff:', error);
        showAlert('Failed to load staff data', 'error');
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
        
        if (!response.ok) {
            // If staff authentication is not available, show a message instead
            const statusContainer = document.getElementById('currentStaffStatus');
            if (statusContainer) {
                statusContainer.innerHTML = `
                    <h4>Current Staff Status</h4>
                    <div class="info-message">
                        <p>Staff status tracking requires staff authentication.</p>
                        <p>Please use the Staff Login portal to track individual staff status.</p>
                    </div>
                `;
            }
            return;
        }
        
        const staffStatus = await response.json();
        
        const statusContainer = document.getElementById('currentStaffStatus');
        if (!statusContainer) return;

        // Check if staffStatus is an array
        if (!Array.isArray(staffStatus)) {
            console.warn('Staff status data is not an array:', staffStatus);
            statusContainer.innerHTML = `
                <h4>Current Staff Status</h4>
                <div class="info-message">
                    <p>No staff status data available.</p>
                </div>
            `;
            return;
        }
        
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

    // =================== GUEST ORDERS MANAGEMENT ===================

let guestOrders = [];
let guestOrderFilters = {
  status: 'all',
  orderType: 'all',
  search: ''
};

// Load guest orders data
async function loadGuestOrders() {
  console.log('🔄 Loading guest orders...');
  
  try {
    const response = await fetch('/api/staff/guest-orders', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    guestOrders = data || [];
    
    console.log(`✅ Loaded ${guestOrders.length} guest orders`);
    
    // Load statistics
    await loadGuestOrderStats();
    
    // Display orders
    displayGuestOrders();
    
  } catch (error) {
    console.error('❌ Error loading guest orders:', error);
    showNotification('Failed to load guest orders', 'error');
    guestOrders = [];
    displayGuestOrders();
  }
}

// Load guest order statistics
async function loadGuestOrderStats() {
  try {
    const response = await fetch('/api/staff/guest-orders/stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const stats = await response.json();
    
    // Update stat cards
    document.getElementById('pending-orders-count').textContent = stats.pending || 0;
    document.getElementById('progress-orders-count').textContent = stats.inProgress || 0;
    document.getElementById('completed-orders-count').textContent = stats.completed || 0;
    document.getElementById('today-revenue-count').textContent = `₦${(stats.todayRevenue || 0).toLocaleString()}`;
    
    console.log('✅ Updated guest order statistics');
    
  } catch (error) {
    console.error('❌ Error loading guest order stats:', error);
    // Set default values
    document.getElementById('pending-orders-count').textContent = '0';
    document.getElementById('progress-orders-count').textContent = '0';
    document.getElementById('completed-orders-count').textContent = '0';
    document.getElementById('today-revenue-count').textContent = '₦0';
  }
}

// Display guest orders with filtering
function displayGuestOrders() {
  const container = document.getElementById('guest-orders-grid');
  if (!container) {
    console.warn('Guest orders grid container not found');
    return;
  }
  
  // Filter orders
  let filteredOrders = guestOrders.filter(order => {
    const matchesStatus = guestOrderFilters.status === 'all' || order.status === guestOrderFilters.status;
    const matchesType = guestOrderFilters.orderType === 'all' || order.orderType === guestOrderFilters.orderType;
    const matchesSearch = !guestOrderFilters.search || 
      order.orderNumber.toLowerCase().includes(guestOrderFilters.search.toLowerCase()) ||
      (order.customer.name && order.customer.name.toLowerCase().includes(guestOrderFilters.search.toLowerCase())) ||
      order.description.toLowerCase().includes(guestOrderFilters.search.toLowerCase());
    
    return matchesStatus && matchesType && matchesSearch;
  });
  
  if (filteredOrders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No guest orders found matching your filters.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = filteredOrders.map(order => `
    <div class="guest-order-card" data-order-id="${order.id}">
      <div class="order-header">
        <div class="order-info">
          <h4 class="order-number">${order.orderNumber}</h4>
          <span class="order-type">${order.orderType}</span>
        </div>
        <span class="status-badge status-${order.status}">${order.status}</span>
      </div>
      
      <div class="order-details">
        <div class="customer-info">
          <strong>${order.customer.name || 'Unknown Guest'}</strong>
          <span class="room-number">Room ${order.roomNumber}</span>
        </div>
        
        <div class="order-description">
          <p>${order.description}</p>
        </div>
        
        ${order.items && order.items.length > 0 ? `
          <div class="order-items">
            <strong>Items:</strong>
            <ul>
              ${order.items.map(item => `
                <li>${item.name} x${item.quantity} - ₦${item.price}</li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
        
        <div class="order-meta">
          <div class="time-info">
            <span class="created-time">Created: ${formatDateTime(order.createdAt)}</span>
            ${order.requestedTime ? `<span class="requested-time">Requested: ${formatDateTime(order.requestedTime)}</span>` : ''}
            ${order.estimatedTime ? `<span class="estimated-time">Estimated: ${formatDateTime(order.estimatedTime)}</span>` : ''}
            ${order.completedAt ? `<span class="completed-time">Completed: ${formatDateTime(order.completedAt)}</span>` : ''}
          </div>
          
          ${order.totalAmount ? `
            <div class="amount-info">
              <strong>Total: ₦${order.totalAmount.toLocaleString()}</strong>
            </div>
          ` : ''}
        </div>
        
        ${order.notes ? `
          <div class="order-notes">
            <strong>Notes:</strong> ${order.notes}
          </div>
        ` : ''}
      </div>
      
      <div class="order-actions">
        ${order.status === 'pending' ? `
          <button class="btn btn-primary" onclick="updateGuestOrderStatus('${order.id}', 'in-progress')">
            Start Processing
          </button>
        ` : ''}
        
        ${order.status === 'in-progress' ? `
          <button class="btn btn-success" onclick="updateGuestOrderStatus('${order.id}', 'completed')">
            Mark Complete
          </button>
        ` : ''}
        
        ${order.status !== 'completed' && order.status !== 'cancelled' ? `
          <button class="btn btn-secondary" onclick="showOrderNotesModal('${order.id}')">
            Add Notes
          </button>
          <button class="btn btn-danger" onclick="cancelGuestOrder('${order.id}')">
            Cancel
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
  
  console.log(`📋 Displayed ${filteredOrders.length} guest orders`);
}

// Update guest order status
async function updateGuestOrderStatus(orderId, newStatus, notes = '', estimatedTime = null) {
  console.log(`🔄 Updating guest order ${orderId} to status: ${newStatus}`);
  
  try {
    const updateData = { status: newStatus };
    if (notes) updateData.notes = notes;
    if (estimatedTime) updateData.estimatedTime = estimatedTime;
    if (newStatus === 'completed') updateData.completedAt = new Date().toISOString();
    
    const response = await fetch(`/api/staff/guest-orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      showNotification(`Order status updated to ${newStatus}`, 'success');
      await loadGuestOrders(); // Reload to get fresh data
    } else {
      throw new Error(result.error || 'Failed to update order');
    }
    
  } catch (error) {
    console.error('❌ Error updating guest order status:', error);
    showNotification('Failed to update order status', 'error');
  }
}

// Cancel guest order
async function cancelGuestOrder(orderId) {
  if (!confirm('Are you sure you want to cancel this guest order?')) {
    return;
  }
  
  console.log(`🗑️ Cancelling guest order ${orderId}`);
  
  try {
    const response = await fetch(`/api/staff/guest-orders/${orderId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      showNotification('Guest order cancelled successfully', 'success');
      await loadGuestOrders(); // Reload to get fresh data
    } else {
      throw new Error(result.error || 'Failed to cancel order');
    }
    
  } catch (error) {
    console.error('❌ Error cancelling guest order:', error);
    showNotification('Failed to cancel order', 'error');
  }
}

// Filter guest orders
function filterGuestOrders() {
  const statusFilter = document.getElementById('order-status-filter');
  const typeFilter = document.getElementById('order-type-filter');
  const searchInput = document.getElementById('order-search');
  
  if (statusFilter) guestOrderFilters.status = statusFilter.value;
  if (typeFilter) guestOrderFilters.orderType = typeFilter.value;
  if (searchInput) guestOrderFilters.search = searchInput.value;
  
  console.log('🔍 Filtering guest orders:', guestOrderFilters);
  displayGuestOrders();
}

// Show order notes modal
function showOrderNotesModal(orderId) {
  const order = guestOrders.find(o => o.id === orderId);
  if (!order) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
      <h3>Add Notes - ${order.orderNumber}</h3>
      
      <form onsubmit="handleOrderNotesSubmit(event, '${orderId}')">
        <div class="form-group">
          <label for="order-notes">Notes:</label>
          <textarea id="order-notes" name="notes" rows="4" 
                    placeholder="Add notes about this order...">${order.notes || ''}</textarea>
        </div>
        
        <div class="form-group">
          <label for="estimated-time">Estimated Completion Time (optional):</label>
          <input type="datetime-local" id="estimated-time" name="estimatedTime" 
                 value="${order.estimatedTime ? new Date(order.estimatedTime).toISOString().slice(0, 16) : ''}">
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Update Notes</button>
          <button type="button" class="btn btn-secondary" 
                  onclick="this.closest('.modal').remove()">Cancel</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.style.display = 'block';
}

// Handle order notes form submission
async function handleOrderNotesSubmit(event, orderId) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const notes = formData.get('notes');
  const estimatedTime = formData.get('estimatedTime') || null;
  
  const order = guestOrders.find(o => o.id === orderId);
  await updateGuestOrderStatus(orderId, order.status, notes, estimatedTime);
  
  // Close modal
  event.target.closest('.modal').remove();
}

// =================== END GUEST ORDERS MANAGEMENT ===================

    // LAUNDRY FUNCTIONALITY
    async function loadLaundryTasks() {
        try {
            const response = await fetch('/api/laundry');
            const tasks = await response.json();
            displayLaundryTasks(tasks);
            updateLaundryCount(tasks);
        } catch (error) {
            console.error('Error loading laundry tasks:', error);
        }
    }

    function updateLaundryCount(tasks) {
        const activeTasks = tasks.filter(task => 
            task.status !== 'completed' && task.status !== 'cancelled'
        );
        const countElement = document.getElementById('laundryTasksCount');
        if (countElement) {
            countElement.textContent = `${activeTasks.length} active task${activeTasks.length !== 1 ? 's' : ''}`;
        }
    }

    function displayLaundryTasks(tasks) {
        const container = document.getElementById('laundryTasksList');
        if (!container) return;
        
        if (!tasks || tasks.length === 0) {
            container.innerHTML = '<div class="no-data">No laundry tasks found</div>';
            return;
        }
        
        container.innerHTML = tasks.map(task => {
            const createdDate = new Date(task.createdAt);
            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
            const isOverdue = dueDate && dueDate < new Date();
            const priorityClass = task.priority ? `priority-${task.priority}` : '';
            const statusClass = task.status ? task.status.toLowerCase().replace(' ', '-') : 'pending';
            
            return `
                <div class="laundry-task ${priorityClass} ${statusClass}" data-type="${task.type}">
                    <div class="task-header">
                        <h4>${task.title || 'Laundry Task'}</h4>
                        <span class="status-badge ${statusClass}">${task.status || 'Pending'}</span>
                    </div>
                    <div class="task-details">
                        <div class="task-detail-item">
                            <i class="fas fa-cogs"></i>
                            <span class="task-detail-label">Type:</span>
                            <span class="task-detail-value">${task.type || 'General'}</span>
                        </div>
                        <div class="task-detail-item">
                            <i class="fas fa-door-open"></i>
                            <span class="task-detail-label">Room:</span>
                            <span class="task-detail-value">${task.roomName || 'N/A'}</span>
                        </div>
                        <div class="task-detail-item">
                            <i class="fas fa-user"></i>
                            <span class="task-detail-label">Assigned to:</span>
                            <span class="task-detail-value">${task.assignee || 'Unassigned'}</span>
                        </div>
                        ${task.priority ? `
                        <div class="task-detail-item">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span class="task-detail-label">Priority:</span>
                            <span class="task-detail-value priority-${task.priority}">${task.priority.toUpperCase()}</span>
                        </div>` : ''}
                        ${task.instructions && task.instructions !== 'No additional instructions' ? `
                        <div class="task-detail-item">
                            <i class="fas fa-sticky-note"></i>
                            <span class="task-detail-label">Instructions:</span>
                            <span class="task-detail-value">${task.instructions}</span>
                        </div>` : ''}
                        <div class="task-detail-item">
                            <i class="fas fa-clock"></i>
                            <span class="task-detail-label">Created:</span>
                            <span class="task-detail-value">${createdDate.toLocaleString()}</span>
                        </div>
                        ${dueDate ? `
                        <div class="task-detail-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span class="task-detail-label">Due:</span>
                            <span class="task-detail-value ${isOverdue ? 'overdue' : ''}">${dueDate.toLocaleString()}</span>
                        </div>` : ''}
                    </div>
                    <div class="task-actions">
                        ${task.status !== 'Completed' ? `
                            <button class="btn btn-sm btn-primary" onclick="updateTaskStatus(${task.id}, 'In Progress')">
                                <i class="fas fa-play"></i> Start
                            </button>
                            <button class="btn btn-sm btn-success" onclick="updateTaskStatus(${task.id}, 'Completed')">
                                <i class="fas fa-check"></i> Complete
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="assignTask(${task.id})">
                                <i class="fas fa-user"></i> Assign
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-danger" onclick="archiveLaundryTask(${task.id})">
                                <i class="fas fa-trash"></i> Remove from List
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="assignTask(${task.id})">
                                <i class="fas fa-user"></i> Assign
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }

    async function showLaundryTaskModal() {
        console.log('Opening laundry task modal...');
        const modal = document.getElementById('laundryTaskModal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('show');
            
            // Reset form
            const form = modal.querySelector('#laundryTaskForm');
            if (form) {
                form.reset();
                console.log('Laundry task form reset');
            }
            
            // Load and populate room options
            await populateRoomOptions();
        } else {
            console.error('Laundry task modal not found!');
        }
    }

    async function populateRoomOptions() {
        try {
            console.log('🏠 Loading rooms for laundry task dropdown...');
            const token = localStorage.getItem('staffToken');
            
            const response = await fetch('/api/rooms', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const rooms = await response.json();
            console.log('✅ Loaded rooms for dropdown:', rooms.length);
            
            const roomSelect = document.getElementById('laundryTaskRoom');
            if (roomSelect) {
                // Clear existing options except the first one
                roomSelect.innerHTML = '<option value="">Select Room</option>';
                
                // Add room options with proper names
                rooms.forEach(room => {
                    const roomName = room.name || room.number || `Room ${room.legacyId || room.id}` || 'Unnamed Room';
                    const roomValue = room.name || room.number || room.legacyId || room.id;
                    
                    const option = document.createElement('option');
                    option.value = roomValue;
                    option.textContent = roomName;
                    roomSelect.appendChild(option);
                    
                    console.log('🏠 Added room option:', { value: roomValue, text: roomName });
                });
                
                console.log('✅ Room dropdown populated with', rooms.length, 'rooms');
            } else {
                console.error('❌ Room select element not found!');
            }
        } catch (error) {
            console.error('❌ Error loading rooms for dropdown:', error);
            // Fallback to hardcoded options if API fails
            const roomSelect = document.getElementById('laundryTaskRoom');
            if (roomSelect && roomSelect.children.length === 1) {
                console.log('🔄 Using fallback room options...');
                const fallbackRooms = [
                    'Port Harcourt', 'Berlin', 'Madrid', 'Barcelona', 'Amsterdam',
                    'Prague', 'Paris', 'Vienna', 'New York', 'Dallas', 'Atlanta'
                ];
                
                fallbackRooms.forEach((roomName) => {
                    const option = document.createElement('option');
                    option.value = roomName;
                    option.textContent = roomName;
                    roomSelect.appendChild(option);
                });
            }
        }
    }

    async function handleLaundryTaskSubmit(event) {
        event.preventDefault();
        console.log('Laundry form submission started...');
        
        const formData = new FormData(event.target);
        const task = {
            title: formData.get('title'),
            type: formData.get('type'),
            roomName: formData.get('roomName'),
            priority: formData.get('priority'),
            notes: formData.get('notes'),
            status: 'pending'
        };
        
        console.log('Task data to submit:', task);
        
        // Validate required fields
        if (!task.title || !task.type || !task.roomName || !task.priority) {
            const missing = [];
            if (!task.title) missing.push('title');
            if (!task.type) missing.push('type');
            if (!task.roomName) missing.push('room');
            if (!task.priority) missing.push('priority');
            
            showAlert(`Please fill in all required fields: ${missing.join(', ')}`, 'error');
            console.error('Form validation failed. Missing fields:', missing);
            return;
        }
        
        try {
            console.log('Sending POST request to /api/laundry...');
            const response = await fetch('/api/laundry', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(task)
            });
            
            console.log('Response status:', response.status);
            const responseText = await response.text();
            console.log('Response text:', responseText);
            
            if (response.ok) {
                let result;
                try {
                    result = JSON.parse(responseText);
                } catch (e) {
                    console.warn('Response is not JSON:', responseText);
                    result = { success: true };
                }
                
                console.log('Task created successfully:', result);
                closeModal('laundryTaskModal');
                await loadLaundryTasks();
                showAlert('Laundry task created successfully!', 'success');
            } else {
                let errorMsg = 'Error creating laundry task';
                try {
                    const errorData = JSON.parse(responseText);
                    errorMsg = errorData.error || errorMsg;
                } catch (e) {
                    errorMsg = responseText || errorMsg;
                }
                console.error('Server error:', response.status, errorMsg);
                showAlert(errorMsg, 'error');
            }
        } catch (error) {
            console.error('Network error creating laundry task:', error);
            showAlert('Network error: Could not create laundry task. Please check your connection.', 'error');
        }
    }

    // Update task status
    async function updateTaskStatus(taskId, newStatus) {
        try {
            const response = await fetch(`/api/laundry/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            
            if (response.ok) {
                await loadLaundryTasks();
                showAlert(`Task ${newStatus.toLowerCase()} successfully!`, 'success');
            } else {
                showAlert('Error updating task status', 'error');
            }
        } catch (error) {
            console.error('Error updating task status:', error);
            showAlert('Error updating task status', 'error');
        }
    }

    // Archive completed laundry task (removes from staff view but keeps for admin records)
    async function archiveLaundryTask(taskId) {
        if (!confirm('Are you sure you want to remove this completed task from the list? The record will still be preserved in the admin dashboard.')) {
            return;
        }
        
        try {
            console.log(`🗑️ Archiving laundry task ${taskId}`);
            
            const response = await fetch(`/api/laundry/${taskId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Task archived successfully:', result);
                await loadLaundryTasks(); // Reload the task list
                showAlert('Task removed from list. Record preserved in admin dashboard.', 'success');
            } else {
                const error = await response.json();
                console.error('❌ Error archiving task:', error);
                showAlert(error.error || 'Error removing task from list', 'error');
            }
        } catch (error) {
            console.error('❌ Network error archiving task:', error);
            showAlert('Network error: Could not remove task. Please check your connection.', 'error');
        }
    }

    // Assign task to staff member
    function assignTask(taskId) {
        const assignee = prompt('Assign task to:');
        if (assignee && assignee.trim()) {
            updateTaskAssignee(taskId, assignee.trim());
        }
    }

    // Update task assignee
    async function updateTaskAssignee(taskId, assignee) {
        try {
            const response = await fetch(`/api/laundry/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignee: assignee })
            });
            
            if (response.ok) {
                await loadLaundryTasks();
                showAlert(`Task assigned to ${assignee} successfully!`, 'success');
            } else {
                showAlert('Error assigning task', 'error');
            }
        } catch (error) {
            console.error('Error assigning task:', error);
            showAlert('Error assigning task', 'error');
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
                closeModal('hrRecordModal');
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
            await loadStockValuation();
            initializeStockNavigation();
        } catch (error) {
            console.error('Error loading stock items:', error);
        }
    }

    function displayStockItems(items) {
        const container = document.getElementById('stockItemsList');
        if (!container) return;
        container.innerHTML = items.map(item => `
            <div class="stock-item">
                <div class="stock-item-header">
                    <h4>${item.name} (${item.category})</h4>
                    <span class="stock-status ${item.currentStock <= item.minStock ? 'low-stock' : 'normal-stock'}">
                        ${item.currentStock <= item.minStock ? 'LOW STOCK' : 'NORMAL'}
                    </span>
                </div>
                <div class="stock-item-details">
                    <div class="stock-detail">
                        <strong>Current Stock:</strong> ${item.currentStock} ${item.unit}
                    </div>
                    <div class="stock-detail">
                        <strong>Min/Max Level:</strong> ${item.minStock}/${item.maxStock} ${item.unit}
                    </div>
                    <div class="stock-detail">
                        <strong>Supplier:</strong> ${item.supplier} (${item.supplierCode || 'N/A'})
                    </div>
                    <div class="stock-detail">
                        <strong>Purchase Price:</strong> ₦${item.purchasePrice || item.cost || 0}
                    </div>
                    <div class="stock-detail">
                        <strong>Selling Price:</strong> ₦${item.sellingPrice || 'N/A'}
                    </div>
                    <div class="stock-detail">
                        <strong>Total Value:</strong> ₦${(item.totalValue || (item.currentStock * (item.purchasePrice || item.cost || 0))).toLocaleString()}
                    </div>
                    <div class="stock-detail">
                        <strong>Profit Margin:</strong> ${item.profitMargin || 'N/A'}%
                    </div>
                    <div class="stock-detail">
                        <strong>Last Restocked:</strong> ${item.lastRestocked || 'N/A'}
                    </div>
                </div>
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
                closeModal('stockItemModal');
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
                closeModal('stockTransferModal');
                event.target.reset();
                loadStockTransfers();
                alert('Stock transfer recorded!');
            }
        } catch (error) {
            console.error('Error recording stock transfer:', error);
        }
    }

    // ENHANCED STOCK MANAGEMENT FUNCTIONALITY
    
    // Initialize stock navigation tabs
    function initializeStockNavigation() {
        const stockNavButtons = document.querySelectorAll('.stock-nav-btn');
        const stockTabContents = document.querySelectorAll('.stock-tab-content');
        
        stockNavButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.stockTab;
                
                // Remove active class from all buttons and tabs
                stockNavButtons.forEach(btn => btn.classList.remove('active'));
                stockTabContents.forEach(tab => tab.classList.remove('active'));
                
                // Add active class to clicked button and target tab
                button.classList.add('active');
                const targetTabContent = document.getElementById(`stock${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}Tab`);
                if (targetTabContent) {
                    targetTabContent.classList.add('active');
                    
                    // Load tab-specific content
                    switch(targetTab) {
                        case 'suppliers':
                            loadSuppliers();
                            break;
                        case 'valuation':
                            loadStockValuation();
                            break;
                        case 'sales':
                            loadSalesTracking();
                            break;
                    }
                }
            });
        });
    }

    // Load stock valuation data
    async function loadStockValuation() {
        try {
            const response = await fetch('/api/stock/valuation');
            const valuation = await response.json();
            updateStockOverview(valuation);
            updateDashboardStockValue(valuation.totalStockValue);
        } catch (error) {
            console.error('Error loading stock valuation:', error);
        }
    }

    // Update stock overview cards
    function updateStockOverview(valuation) {
        const elements = {
            totalStockValue: document.getElementById('totalStockValue'),
            afterSalesValue: document.getElementById('afterSalesValue'),
            profitMargin: document.getElementById('profitMargin'),
            lowStockAlert: document.getElementById('lowStockAlert')
        };

        if (elements.totalStockValue) {
            elements.totalStockValue.textContent = `₦${valuation.totalStockValue.toLocaleString()}`;
        }
        if (elements.afterSalesValue) {
            elements.afterSalesValue.textContent = `₦${valuation.afterSalesValue.toLocaleString()}`;
        }
        if (elements.profitMargin) {
            elements.profitMargin.textContent = `${valuation.profitMargin}%`;
        }
        if (elements.lowStockAlert) {
            elements.lowStockAlert.textContent = valuation.lowStockAlert;
        }

        // Update valuation details tab
        const valuationSummary = document.getElementById('valuationSummary');
        if (valuationSummary) {
            valuationSummary.innerHTML = `
                <div class="valuation-overview-cards">
                    <div class="valuation-card">
                        <h4>Total Inventory Investment</h4>
                        <div class="value">₦${valuation.totalStockValue.toLocaleString()}</div>
                    </div>
                    <div class="valuation-card">
                        <h4>Potential Revenue</h4>
                        <div class="value">₦${valuation.afterSalesValue.toLocaleString()}</div>
                    </div>
                    <div class="valuation-card">
                        <h4>Expected Profit</h4>
                        <div class="value">₦${(valuation.afterSalesValue - valuation.totalStockValue).toLocaleString()}</div>
                    </div>
                </div>
                <div class="item-breakdown">
                    <h4>Item-wise Breakdown</h4>
                    <div class="breakdown-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Category</th>
                                    <th>Stock</th>
                                    <th>Current Value</th>
                                    <th>Potential Value</th>
                                    <th>Profit Margin</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${valuation.itemBreakdown.map(item => `
                                    <tr class="${item.status}">
                                        <td>${item.name}</td>
                                        <td>${item.category}</td>
                                        <td>${item.stock}</td>
                                        <td>₦${item.currentValue.toLocaleString()}</td>
                                        <td>₦${item.potentialValue.toLocaleString()}</td>
                                        <td>${item.profitMargin}%</td>
                                        <td><span class="status-badge ${item.status}">${item.status.toUpperCase()}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    }

    // Update dashboard stock value display
    function updateDashboardStockValue(value) {
        const stockValueDisplay = document.getElementById('stockValueDisplay');
        if (stockValueDisplay) {
            stockValueDisplay.textContent = `₦${value.toLocaleString()} total value`;
        }
    }

    // Load suppliers data
    async function loadSuppliers() {
        try {
            const response = await fetch('/api/suppliers');
            const suppliers = await response.json();
            displaySuppliers(suppliers);
        } catch (error) {
            console.error('Error loading suppliers:', error);
        }
    }

    // Display suppliers
    function displaySuppliers(suppliers) {
        const container = document.getElementById('suppliersList');
        if (!container) return;
        
        container.innerHTML = suppliers.map(supplier => `
            <div class="supplier-card">
                <div class="supplier-header">
                    <h4>${supplier.name}</h4>
                    <span class="supplier-code">${supplier.code}</span>
                    <span class="supplier-status ${supplier.status}">${supplier.status.toUpperCase()}</span>
                </div>
                <div class="supplier-details">
                    <div class="supplier-contact">
                        <p><i class="fas fa-user"></i> <strong>Contact:</strong> ${supplier.contact}</p>
                        <p><i class="fas fa-envelope"></i> <strong>Email:</strong> ${supplier.email}</p>
                        <p><i class="fas fa-phone"></i> <strong>Phone:</strong> ${supplier.phone}</p>
                    </div>
                    <div class="supplier-info">
                        <p><i class="fas fa-tag"></i> <strong>Category:</strong> ${supplier.category}</p>
                        <p><i class="fas fa-calendar"></i> <strong>Payment Terms:</strong> ${supplier.paymentTerms} days</p>
                        <p><i class="fas fa-shopping-cart"></i> <strong>Total Orders:</strong> ${supplier.totalOrders}</p>
                        <p><i class="fas fa-clock"></i> <strong>Last Order:</strong> ${supplier.lastOrder || 'Never'}</p>
                    </div>
                </div>
                <div class="supplier-address">
                    <p><i class="fas fa-map-marker-alt"></i> ${supplier.address}</p>
                </div>
                ${supplier.notes ? `<div class="supplier-notes"><p><i class="fas fa-sticky-note"></i> ${supplier.notes}</p></div>` : ''}
            </div>
        `).join('');
    }

    // Show supplier modal
    function showSupplierModal() {
        document.getElementById('supplierModal').style.display = 'block';
    }

    // Handle supplier form submission
    async function handleSupplierSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const supplier = {
            name: formData.get('name'),
            code: formData.get('code'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            contact: formData.get('contact'),
            category: formData.get('category'),
            address: formData.get('address'),
            paymentTerms: parseInt(formData.get('paymentTerms')) || 30,
            status: formData.get('status'),
            notes: formData.get('notes')
        };
        
        try {
            const response = await fetch('/api/suppliers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(supplier)
            });
            if (response.ok) {
                closeModal('supplierModal');
                event.target.reset();
                loadSuppliers();
                showAlert('Supplier added successfully!', 'success');
            }
        } catch (error) {
            console.error('Error adding supplier:', error);
            showAlert('Error adding supplier', 'error');
        }
    }

    // Show stock valuation modal
    function showStockValuationModal() {
        document.getElementById('stockValuationModal').style.display = 'block';
        loadStockValuation();
    }

    // Load sales tracking data (placeholder for now)
    function loadSalesTracking() {
        const container = document.getElementById('salesTracking');
        if (!container) return;
        
        container.innerHTML = `
            <div class="sales-tracking-placeholder">
                <h4>Sales Tracking Coming Soon</h4>
                <p>This section will track:</p>
                <ul>
                    <li>Items sold and revenue generated</li>
                    <li>Top-selling products</li>
                    <li>Profit margins by category</li>
                    <li>Sales trends over time</li>
                    <li>Stock turnover rates</li>
                </ul>
                <button class="btn btn-primary" onclick="showAlert('Sales tracking integration coming in next update!', 'info')">
                    <i class="fas fa-chart-line"></i> Enable Sales Tracking
                </button>
            </div>
        `;
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
                closeModal('automatedMessageModal');
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
                closeModal('locationBranchModal');
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
    console.log(`👥 Opening status modal for staff ID: ${staffId}`);
    
    currentStaffId = staffId;
    
    // Find the staff member to get current status
    const staffMember = window.staff ? window.staff.find(s => s.id === parseInt(staffId)) : null;
    if (staffMember) {
        console.log(`📋 Found staff member: ${staffMember.name}, current status: ${staffMember.status}`);
        // Pre-select current status in dropdown
        const statusSelect = document.getElementById('staffStatusSelect');
        if (statusSelect) {
            statusSelect.value = staffMember.status || 'on-duty';
            console.log(`✅ Pre-selected status: ${statusSelect.value}`);
        }
    } else {
        console.warn(`⚠️ Staff member not found with ID: ${staffId}`);
        console.log('📋 Available staff:', window.staff ? window.staff.map(s => `${s.id}: ${s.name}`) : 'No staff data');
    }
    
    const modal = document.getElementById('staffStatusModal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        console.error('❌ Staff status modal not found');
        showAlert('Error: Status update form not available', 'error');
    }
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
            closeModal('notificationModal');
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

// ================================
// CATEGORY NAVIGATION SYSTEM
// ================================

// Category navigation functions
function showCategory(categoryName) {
    const overview = document.getElementById('categoryOverview');
    const detail = document.getElementById('categoryDetail');
    const title = document.getElementById('categoryTitle');
    const content = document.getElementById('detailContent');
    
    // Set category title
    const categoryTitles = {
        'rooms': 'Rooms Management',
        'customers': 'Customer Management', 
        'bar': 'Bar Operations',
        'kitchen': 'Kitchen Management',
        'payments': 'Financial Management',
        'reports': 'Security & Reports',
        'staff': 'Staff Management',
        'housekeeping': 'Housekeeping',
        'notifications': 'Notifications & Alerts',
        'laundry': 'Laundry Service',
        'stock': 'Stock & Inventory Management',
        'analytics': 'Analytics & Reports'
    };
    
    title.textContent = categoryTitles[categoryName] || 'Category';
    
    // Find and move the corresponding tab content
    const tabContent = document.getElementById(categoryName);
    if (tabContent) {
        // Clone the content instead of moving it to preserve original
        content.innerHTML = tabContent.innerHTML;
        
        // Re-initialize any event listeners for the moved content
        initializeCategoryContent(categoryName);
    } else {
        console.warn(`Tab content for ${categoryName} not found`);
        content.innerHTML = `<div class="no-data">Content for ${categoryTitles[categoryName] || categoryName} is loading...</div>`;
    }
    
    // Animate transition
    overview.classList.add('fade-out');
    setTimeout(() => {
        overview.style.display = 'none';
        detail.style.display = 'block';
        detail.classList.add('fade-in');
        
        // Load the category content
        loadTabContent(categoryName);
    }, 300);
}

function showOverview() {
    const overview = document.getElementById('categoryOverview');
    const detail = document.getElementById('categoryDetail');
    
    // Animate transition
    detail.classList.add('fade-out');
    setTimeout(() => {
        detail.style.display = 'none';
        overview.style.display = 'block';
        overview.classList.add('fade-in');
        
        // Update category stats
        updateCategoryStats();
    }, 300);
}

function initializeCategoryContent(categoryName) {
    // Re-run initialization for specific categories
    switch(categoryName) {
        case 'rooms':
            loadRooms();
            // Note: No separate loadBookings function, bookings are loaded with rooms
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'bar':
            loadBarInventory();
            break;
        case 'kitchen':
            loadKitchenInventory();
            loadKitchenOrders();
            break;
        case 'payments':
            loadPayments();
            break;
        case 'reports':
            loadPoliceReports();
            break;
        case 'staff':
            loadStaff();
            break;
        case 'housekeeping':
            loadHousekeeping();
            break;
        case 'notifications':
            loadNotifications();
            break;
        case 'analytics':
            loadAnalytics();
            break;
    }
}

function updateCategoryStats() {
    // Update room statistics
    const roomsAvailable = document.getElementById('roomsAvailable');
    if (roomsAvailable) {
        // This will be updated by loadRooms() function
        fetch('/api/rooms')
            .then(response => response.json())
            .then(rooms => {
                const available = rooms.filter(room => room.status === 'available').length;
                roomsAvailable.textContent = `${available} available`;
            })
            .catch(() => {
                roomsAvailable.textContent = '0 available';
            });
    }
    
    // Update customer count
    const totalCustomers = document.getElementById('totalCustomers');
    if (totalCustomers) {
        fetch('/api/customers')
            .then(response => response.json())
            .then(customers => {
                totalCustomers.textContent = `${customers.length} customers`;
            })
            .catch(() => {
                totalCustomers.textContent = '0 customers';
            });
    }
    
    // Update bar items count
    const barItems = document.getElementById('barItems');
    if (barItems) {
        fetch('/api/bar/inventory')
            .then(response => response.json())
            .then(items => {
                barItems.textContent = `${items.length} items`;
            })
            .catch(() => {
                barItems.textContent = '0 items';
            });
    }
    
    // Update pending orders
    const pendingOrders = document.getElementById('pendingOrders');
    if (pendingOrders) {
        fetch('/api/kitchen/orders')
            .then(response => response.json())
            .then(orders => {
                const pending = orders.filter(order => order.status === 'pending' || order.status === 'preparing').length;
                pendingOrders.textContent = `${pending} pending orders`;
            })
            .catch(() => {
                pendingOrders.textContent = '0 pending orders';
            });
    }
    
    // Update daily revenue
    const dailyRevenue = document.getElementById('dailyRevenue');
    if (dailyRevenue) {
        const today = new Date().toISOString().split('T')[0];
        fetch(`/api/payments?date=${today}`)
            .then(response => response.json())
            .then(payments => {
                const total = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
                dailyRevenue.textContent = `₦${total.toLocaleString()} today`;
            })
            .catch(() => {
                dailyRevenue.textContent = '₦0 today';
            });
    }
    
    // Update active reports
    const activeReports = document.getElementById('activeReports');
    if (activeReports) {
        fetch('/api/police-reports')
            .then(response => response.json())
            .then(reports => {
                const active = reports.filter(report => report.status === 'reported' || report.status === 'investigating').length;
                activeReports.textContent = `${active} active reports`;
            })
            .catch(() => {
                activeReports.textContent = '0 active reports';
            });
    }
    
    // Update staff on duty
    const staffOnDuty = document.getElementById('staffOnDuty');
    if (staffOnDuty) {
        fetch('/api/staff')
            .then(response => response.json())
            .then(staff => {
                const onDuty = staff.filter(member => member.status === 'on-duty').length;
                staffOnDuty.textContent = `${onDuty} on duty`;
            })
            .catch(() => {
                staffOnDuty.textContent = '0 on duty';
            });
    }
    
    // Update cleaning tasks
    const cleaningTasks = document.getElementById('cleaningTasks');
    if (cleaningTasks) {
        // This would need to be implemented based on your housekeeping system
        cleaningTasks.textContent = '0 pending tasks';
    }
    
    // Update unread notifications
    const unreadNotifications = document.getElementById('unreadNotifications');
    if (unreadNotifications) {
        fetch('/api/notifications')
            .then(response => response.json())
            .then(notifications => {
                const unread = notifications.filter(notif => !notif.read).length;
                unreadNotifications.textContent = `${unread} unread`;
            })
            .catch(() => {
                unreadNotifications.textContent = '0 unread';
            });
    }
    
    // Update guest orders count
    const guestOrdersCount = document.getElementById('guestOrdersCount');
    if (guestOrdersCount) {
        fetch('/api/staff/guest-orders', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            }
        })
            .then(response => response.json())
            .then(orders => {
                const activeOrders = orders.filter(order => 
                    order.status && !['delivered', 'cancelled'].includes(order.status.toLowerCase())
                ).length;
                guestOrdersCount.textContent = `${activeOrders} active orders`;
            })
            .catch(() => {
                guestOrdersCount.textContent = '0 active orders';
            });
    }
}

// ================================
// LOUNGE MANAGEMENT FUNCTIONS
// ================================

// Global variables for lounge management
let loungeBookings = [];
let loungePricing = {};
let selectedLoungeCost = null;

// Initialize lounge management when bar tab is opened
function initializeLoungeManagement() {
    console.log('🏛️ Initializing lounge management...');
    
    // Setup bar tab navigation
    setupBarTabNavigation();
    
    // Load lounge data
    loadLoungeBookings();
    loadLoungePricing();
    updateLoungeOverview();
    
    // Setup form handlers
    setupLoungeFormHandlers();
}

// Setup bar tab navigation
function setupBarTabNavigation() {
    const barTabBtns = document.querySelectorAll('.bar-tab-btn');
    const barTabContents = document.querySelectorAll('.bar-tab-content');
    
    barTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            barTabBtns.forEach(b => b.classList.remove('active'));
            barTabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Show corresponding content
            const tabName = btn.getAttribute('data-bar-tab');
            const content = document.getElementById(`bar-${tabName}`);
            if (content) {
                content.classList.add('active');
                
                // Load specific data when tab is opened
                if (tabName === 'lounge') {
                    loadLoungeBookings();
                    updateLoungeOverview();
                } else if (tabName === 'events') {
                    refreshEventCalendar();
                } else if (tabName === 'inventory') {
                    loadBarInventory();
                }
            }
        });
    });
}

// Load lounge bookings
async function loadLoungeBookings() {
    console.log('📋 Loading lounge bookings...');
    
    try {
        const response = await fetch('/api/lounge/bookings', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        loungeBookings = await response.json();
        console.log('✅ Loaded', loungeBookings.length, 'lounge bookings');
        
        displayLoungeBookings();
        updateLoungeOverview();
        
    } catch (error) {
        console.error('❌ Error loading lounge bookings:', error);
        showNotification('Failed to load lounge bookings: ' + error.message, 'error');
        loungeBookings = [];
        displayLoungeBookings();
    }
}

// Load lounge pricing
async function loadLoungePricing() {
    try {
        const response = await fetch('/api/lounge/pricing', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load pricing');
        }
        
        loungePricing = await response.json();
        console.log('✅ Loaded lounge pricing structure');
        
    } catch (error) {
        console.error('❌ Error loading lounge pricing:', error);
        showNotification('Failed to load pricing information', 'error');
    }
}

// Display lounge bookings in table
function displayLoungeBookings() {
    const tableBody = document.querySelector('#loungeBookingsTable tbody');
    if (!tableBody) return;
    
    if (!loungeBookings.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 2rem; color: var(--gray-500);">
                    <i class="fas fa-calendar-times" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    No lounge bookings found
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = loungeBookings.map(booking => {
        const eventDateTime = `${booking.eventDate} ${booking.startTime}-${booking.endTime}`;
        const amount = booking.totalAmount?.toLocaleString() || '0';
        
        return `
            <tr>
                <td><strong>#${booking.id}</strong></td>
                <td>${booking.eventName}</td>
                <td>
                    <strong>${booking.customerName}</strong><br>
                    <small>${booking.customerPhone}</small>
                </td>
                <td>${booking.eventType}</td>
                <td>
                    <strong>${new Date(booking.eventDate).toLocaleDateString()}</strong><br>
                    <small>${booking.startTime} - ${booking.endTime}</small>
                </td>
                <td>${booking.guestCount} guests</td>
                <td>₦${amount}</td>
                <td>
                    <span class="lounge-status ${booking.status}">
                        ${booking.status}
                    </span><br>
                    <small class="payment-status ${booking.paymentStatus}">
                        ${booking.paymentStatus}
                    </small>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-info" onclick="viewLoungeBooking(${booking.id})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="editLoungeBooking(${booking.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="cancelLoungeBooking(${booking.id})" title="Cancel">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Update lounge overview cards
function updateLoungeOverview() {
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    
    // This month's bookings
    const monthlyBookings = loungeBookings.filter(booking => {
        const bookingDate = new Date(booking.eventDate);
        return bookingDate.getMonth() === thisMonth && 
               bookingDate.getFullYear() === thisYear &&
               booking.status !== 'cancelled';
    });
    
    // Monthly revenue
    const monthlyRevenue = monthlyBookings.reduce((total, booking) => {
        return total + (booking.totalAmount || 0);
    }, 0);
    
    // Today's events
    const todayStr = today.toISOString().split('T')[0];
    const todayEvents = loungeBookings.filter(booking => 
        booking.eventDate === todayStr && booking.status !== 'cancelled'
    );
    
    // Pending bookings
    const pendingBookings = loungeBookings.filter(booking => 
        booking.status === 'pending'
    );
    
    // Update DOM elements
    updateElementText('monthlyBookings', `${monthlyBookings.length} Bookings`);
    updateElementText('monthlyLoungeRevenue', `₦${monthlyRevenue.toLocaleString()}`);
    updateElementText('todayEvents', `${todayEvents.length} Events`);
    updateElementText('pendingBookings', `${pendingBookings.length} Pending`);
}

// Helper function to safely update element text
function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

// Show lounge pricing modal
function showLoungePricingModal() {
    console.log('💰 Opening pricing calculator...');
    
    // Reset form
    resetPricingCalculator();
    
    // Setup event listeners for calculator
    setupPricingCalculatorEvents();
    
    // Show modal
    showModal('loungePricingModal');
}

// Reset pricing calculator
function resetPricingCalculator() {
    document.getElementById('calcEventType').value = '';
    document.getElementById('calcDuration').value = '';
    document.getElementById('calcGuestCount').value = '';
    
    // Reset checkboxes and disable selects
    const checkboxes = ['calcDecorations', 'calcCatering', 'calcAudioVisual', 'calcPhotography'];
    checkboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.checked = false;
            checkbox.dispatchEvent(new Event('change'));
        }
    });
    
    // Clear breakdown
    document.getElementById('pricingBreakdown').innerHTML = '';
    selectedLoungeCost = null;
}

// Setup pricing calculator event listeners
function setupPricingCalculatorEvents() {
    // Checkbox handlers for enabling/disabling selects
    const checkboxSelects = [
        { checkbox: 'calcDecorations', select: 'calcDecorationsType' },
        { checkbox: 'calcAudioVisual', select: 'calcAVType' },
        { checkbox: 'calcPhotography', select: 'calcPhotoType' }
    ];
    
    checkboxSelects.forEach(pair => {
        const checkbox = document.getElementById(pair.checkbox);
        const select = document.getElementById(pair.select);
        
        if (checkbox && select) {
            checkbox.addEventListener('change', () => {
                select.disabled = !checkbox.checked;
                if (!checkbox.checked) {
                    select.value = '';
                }
            });
        }
    });
}

// Calculate lounge cost
async function calculateLoungeCost() {
    console.log('🧮 Calculating lounge cost...');
    
    const eventType = document.getElementById('calcEventType').value;
    const duration = parseInt(document.getElementById('calcDuration').value);
    const guestCount = parseInt(document.getElementById('calcGuestCount').value);
    
    if (!eventType || !duration || !guestCount) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }
    
    // Build add-ons object
    const addOns = {};
    
    if (document.getElementById('calcDecorations').checked) {
        addOns.decorations = document.getElementById('calcDecorationsType').value;
    }
    
    if (document.getElementById('calcCatering').checked) {
        addOns.catering = true;
    }
    
    if (document.getElementById('calcAudioVisual').checked) {
        addOns.audioVisual = document.getElementById('calcAVType').value;
    }
    
    if (document.getElementById('calcPhotography').checked) {
        addOns.photography = document.getElementById('calcPhotoType').value;
    }
    
    try {
        const response = await fetch('/api/lounge/calculate-cost', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            },
            body: JSON.stringify({
                eventType,
                duration,
                guestCount,
                addOns
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to calculate cost');
        }
        
        const costData = await response.json();
        selectedLoungeCost = costData;
        
        displayPricingBreakdown(costData);
        
    } catch (error) {
        console.error('❌ Error calculating cost:', error);
        showNotification('Failed to calculate cost: ' + error.message, 'error');
    }
}

// Display pricing breakdown
function displayPricingBreakdown(costData) {
    const container = document.getElementById('pricingBreakdown');
    
    const breakdown = costData.breakdown.map(item => `
        <div class="breakdown-item">
            <span class="breakdown-label">${item.item}</span>
            <span class="breakdown-amount">₦${item.cost.toLocaleString()}</span>
        </div>
    `).join('');
    
    container.innerHTML = `
        <h4><i class="fas fa-receipt"></i> Pricing Breakdown</h4>
        ${breakdown}
        <div class="breakdown-item">
            <span class="breakdown-label"><strong>Total Amount</strong></span>
            <span class="breakdown-amount"><strong>₦${costData.totalAmount.toLocaleString()}</strong></span>
        </div>
        <div style="margin-top: 1rem; padding: 1rem; background: var(--gray-50); border-radius: 8px;">
            <p><strong>Minimum Deposit:</strong> ₦${costData.minimumDeposit.toLocaleString()}</p>
            <p><small>Security deposit of ₦${costData.securityDeposit.toLocaleString()} is refundable upon event completion.</small></p>
        </div>
    `;
}

// Proceed to booking with calculated cost
function proceedToBooking() {
    if (!selectedLoungeCost) {
        showNotification('Please calculate cost first', 'warning');
        return;
    }
    
    // Close pricing modal
    closeModal('loungePricingModal');
    
    // Open booking modal with pre-filled data
    showLoungeBookingModal();
    
    // Pre-fill form with calculated data
    document.getElementById('eventType').value = selectedLoungeCost.eventType;
    document.getElementById('duration').value = selectedLoungeCost.duration;
    document.getElementById('guestCount').value = selectedLoungeCost.guestCount;
    document.getElementById('totalAmount').value = selectedLoungeCost.totalAmount;
}

// Show lounge booking modal
function showLoungeBookingModal() {
    console.log('📝 Opening lounge booking form...');
    
    // Reset form
    document.getElementById('loungeBookingForm').reset();
    
    // Setup form handlers
    setupLoungeFormHandlers();
    
    // Show modal
    showModal('loungeBookingModal');
}

// Setup lounge form handlers
function setupLoungeFormHandlers() {
    const form = document.getElementById('loungeBookingForm');
    if (!form) return;
    
    // Remove existing event listeners to prevent duplicates
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // Add form submission handler
    newForm.addEventListener('submit', handleLoungeBookingSubmit);
    
    // Add duration calculation handler
    const startTime = document.getElementById('startTime');
    const endTime = document.getElementById('endTime');
    const durationField = document.getElementById('duration');
    const guestCountField = document.getElementById('guestCount');
    const totalAmountField = document.getElementById('totalAmount');
    
    function calculateDurationAndCost() {
        if (startTime.value && endTime.value) {
            const start = new Date(`2000-01-01T${startTime.value}`);
            const end = new Date(`2000-01-01T${endTime.value}`);
            
            let duration = (end - start) / (1000 * 60 * 60); // Convert to hours
            if (duration < 0) duration += 24; // Handle overnight events
            
            durationField.value = duration.toFixed(1);
            
            // Calculate total cost based on duration and guest count
            const guestCount = parseInt(guestCountField.value) || 0;
            if (guestCount > 0) {
                calculateLoungePrice();
            }
        }
    }
    
    startTime.addEventListener('change', calculateDurationAndCost);
    endTime.addEventListener('change', calculateDurationAndCost);
    guestCountField.addEventListener('input', calculateDurationAndCost);
    
    // Add event listeners for pricing calculation
    document.getElementById('eventType').addEventListener('change', calculateLoungePrice);
    document.getElementById('cateringIncluded').addEventListener('change', calculateLoungePrice);
    document.getElementById('decorationsIncluded').addEventListener('change', calculateLoungePrice);
    
    if (startTime && endTime && durationField) {
        [startTime, endTime].forEach(field => {
            field.addEventListener('change', () => {
                if (startTime.value && endTime.value) {
                    const start = new Date(`2000-01-01T${startTime.value}`);
                    const end = new Date(`2000-01-01T${endTime.value}`);
                    
                    if (end > start) {
                        const hours = (end - start) / (1000 * 60 * 60);
                        durationField.value = hours;
                    }
                }
            });
        });
    }
}

// Calculate lounge pricing based on duration and guest count
function calculateLoungePrice() {
    const duration = parseFloat(document.getElementById('duration').value) || 0;
    const guestCount = parseInt(document.getElementById('guestCount').value) || 0;
    const eventType = document.getElementById('eventType').value;
    const cateringIncluded = document.getElementById('cateringIncluded').checked;
    const decorationsIncluded = document.getElementById('decorationsIncluded').checked;
    
    if (duration <= 0 || guestCount <= 0) {
        document.getElementById('totalAmount').value = '';
        return;
    }
    
    // Base pricing structure
    let hourlyRate = 50000; // Base rate per hour
    let guestMultiplier = 1000; // Additional cost per guest per hour
    
    // Event type multipliers
    const eventMultipliers = {
        'Wedding Reception': 1.5,
        'Corporate Event': 1.3,
        'Birthday Party': 1.0,
        'Anniversary Celebration': 1.2,
        'Graduation Party': 1.1,
        'Private Meeting': 0.8
    };
    
    const multiplier = eventMultipliers[eventType] || 1.0;
    
    // Calculate base cost
    let totalCost = (hourlyRate + (guestCount * guestMultiplier)) * duration * multiplier;
    
    // Add-ons
    if (cateringIncluded) {
        totalCost += guestCount * 2500; // ₦2,500 per guest for catering
    }
    
    if (decorationsIncluded) {
        totalCost += 25000; // Flat ₦25,000 for decorations
    }
    
    document.getElementById('totalAmount').value = Math.round(totalCost);
}

// Handle lounge booking form submission
async function handleLoungeBookingSubmit(event) {
    event.preventDefault();
    
    console.log('📝 Submitting lounge booking...');
    
    // Get form data directly from elements (more reliable than FormData for this form)
    const bookingData = {
        eventName: document.getElementById('eventName').value.trim(),
        customerName: document.getElementById('customerName').value.trim(),
        customerPhone: document.getElementById('customerPhone').value.trim(),
        customerEmail: document.getElementById('customerEmail').value.trim(),
        eventType: document.getElementById('eventType').value,
        eventDate: document.getElementById('eventDate').value,
        startTime: document.getElementById('startTime').value,
        endTime: document.getElementById('endTime').value,
        duration: parseFloat(document.getElementById('duration').value) || 0,
        guestCount: parseInt(document.getElementById('guestCount').value) || 0,
        totalAmount: parseFloat(document.getElementById('totalAmount').value) || 0,
        depositPaid: parseFloat(document.getElementById('depositPaid').value) || 0,
        specialRequests: document.getElementById('specialRequests').value.trim(),
        setupRequirements: document.getElementById('setupRequirements').value.trim(),
        cateringIncluded: document.getElementById('cateringIncluded').checked,
        decorationsIncluded: document.getElementById('decorationsIncluded').checked,
        notes: document.getElementById('bookingNotes').value.trim()
    };
    
    // Debug: Log the booking data
    console.log('🔍 Booking data to send:', bookingData);
    
    // Validate required fields
    const requiredFields = ['eventName', 'customerName', 'customerPhone', 'eventType', 'eventDate', 'startTime', 'endTime'];
    const missingFields = requiredFields.filter(field => !bookingData[field]);
    
    if (missingFields.length > 0) {
        alert(`Please fill in the following required fields: ${missingFields.join(', ')}`);
        console.log('❌ Missing required fields:', missingFields);
        return;
    }
    
    try {
        const response = await fetch('/api/lounge/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            },
            body: JSON.stringify(bookingData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create booking');
        }
        
        const newBooking = await response.json();
        console.log('✅ Lounge booking created:', newBooking.id);
        
        showNotification('Lounge booking created successfully!', 'success');
        closeModal('loungeBookingModal');
        
        // Refresh data
        loadLoungeBookings();
        
    } catch (error) {
        console.error('❌ Error creating lounge booking:', error);
        showNotification('Failed to create booking: ' + error.message, 'error');
    }
}

// Check lounge availability
async function checkAvailability() {
    const eventDate = document.getElementById('eventDate').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    
    if (!eventDate) {
        showNotification('Please select an event date first', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/lounge/availability/${eventDate}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to check availability');
        }
        
        const availabilityData = await response.json();
        displayAvailability(availabilityData, startTime, endTime);
        
    } catch (error) {
        console.error('❌ Error checking availability:', error);
        showNotification('Failed to check availability: ' + error.message, 'error');
    }
}

// Display availability results
function displayAvailability(data, requestedStart, requestedEnd) {
    const container = document.getElementById('availabilityCheck');
    
    // Check for conflicts
    const hasConflict = data.existingBookings.some(booking => {
        if (!requestedStart || !requestedEnd) return false;
        
        return !(requestedEnd <= booking.startTime || requestedStart >= booking.endTime);
    });
    
    if (hasConflict) {
        const conflictingBookings = data.existingBookings.filter(booking => 
            !(requestedEnd <= booking.startTime || requestedStart >= booking.endTime)
        );
        
        container.innerHTML = `
            <div class="availability-conflict">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Time Conflict Detected!</strong>
                <p>The requested time slot conflicts with:</p>
                ${conflictingBookings.map(booking => `
                    <p>• ${booking.eventName} (${booking.startTime} - ${booking.endTime})</p>
                `).join('')}
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="availability-success">
                <i class="fas fa-check-circle"></i>
                <strong>Time Slot Available!</strong>
                <p>The lounge is available for your requested time on ${data.date}.</p>
            </div>
        `;
    }
    
    // Show existing bookings for the day
    if (data.existingBookings.length > 0) {
        container.innerHTML += `
            <div style="margin-top: 1rem;">
                <h5>Other bookings on ${data.date}:</h5>
                <ul style="margin: 0.5rem 0;">
                    ${data.existingBookings.map(booking => `
                        <li>${booking.eventName}: ${booking.startTime} - ${booking.endTime}</li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
}

// View lounge booking details
function viewLoungeBooking(bookingId) {
    const booking = loungeBookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    // You can implement a detailed view modal here
    console.log('👁️ Viewing booking:', booking);
    showNotification('Booking details view - to be implemented', 'info');
}

// Edit lounge booking
function editLoungeBooking(bookingId) {
    const booking = loungeBookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    // Pre-fill the booking form with existing data
    showLoungeBookingModal();
    
    // Fill form fields
    document.getElementById('eventName').value = booking.eventName || '';
    document.getElementById('customerName').value = booking.customerName || '';
    document.getElementById('customerPhone').value = booking.customerPhone || '';
    document.getElementById('customerEmail').value = booking.customerEmail || '';
    document.getElementById('eventType').value = booking.eventType || '';
    document.getElementById('eventDate').value = booking.eventDate || '';
    document.getElementById('startTime').value = booking.startTime || '';
    document.getElementById('endTime').value = booking.endTime || '';
    document.getElementById('duration').value = booking.duration || '';
    document.getElementById('guestCount').value = booking.guestCount || '';
    document.getElementById('totalAmount').value = booking.totalAmount || '';
    document.getElementById('depositPaid').value = booking.depositPaid || '';
    document.getElementById('specialRequests').value = booking.specialRequests || '';
    document.getElementById('setupRequirements').value = booking.setupRequirements || '';
    document.getElementById('cateringIncluded').checked = booking.cateringIncluded || false;
    document.getElementById('decorationsIncluded').checked = booking.decorationsIncluded || false;
    document.getElementById('bookingNotes').value = booking.notes || '';
    
    // Store booking ID for update
    document.getElementById('loungeBookingForm').dataset.editingId = bookingId;
    
    console.log('✏️ Editing booking:', bookingId);
}

// Cancel lounge booking
async function cancelLoungeBooking(bookingId) {
    const booking = loungeBookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    if (!confirm(`Are you sure you want to cancel "${booking.eventName}"?\n\nCancellation penalties may apply based on the timing.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/lounge/bookings/${bookingId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to cancel booking');
        }
        
        const result = await response.json();
        console.log('✅ Booking cancelled:', result);
        
        showNotification(`Booking cancelled. Refund amount: ₦${result.refundAmount.toLocaleString()}`, 'success');
        
        // Refresh data
        loadLoungeBookings();
        
    } catch (error) {
        console.error('❌ Error cancelling booking:', error);
        showNotification('Failed to cancel booking: ' + error.message, 'error');
    }
}

// Refresh event calendar
function refreshEventCalendar() {
    console.log('📅 Refreshing event calendar...');
    
    const calendarContainer = document.getElementById('eventCalendar');
    if (!calendarContainer) return;
    
    // Simple calendar implementation - you can enhance this
    calendarContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--gray-500);">
            <i class="fas fa-calendar-alt" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
            <h4>Event Calendar</h4>
            <p>Advanced calendar view coming soon...</p>
            <p>Current bookings: ${loungeBookings.length}</p>
        </div>
    `;
}

// ===== DEPARTMENT FINANCE MANAGEMENT =====

// Global variables for departments
let departmentsData = [];
let loansData = [];
let assignmentsData = [];
let transactionsData = [];

// Load departments data
async function loadDepartments() {
    console.log('🏢 Loading departments...');
    
    try {
        const token = localStorage.getItem('staffToken');
        if (!token) {
            showNotification('Please log in to access departments', 'error');
            return;
        }
        
        const response = await fetch('/api/departments', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch departments');
        }
        
        departmentsData = await response.json();
        console.log(`✅ Loaded ${departmentsData.length} departments`);
        
        // Update dashboard
        updateDepartmentDashboard();
        displayDepartments();
        updateDepartmentDropdowns();
        
    } catch (error) {
        console.error('❌ Error loading departments:', error);
        showNotification('Failed to load departments', 'error');
    }
}

// Update department dashboard statistics
function updateDepartmentDashboard() {
    if (!departmentsData.length) return;
    
    const totalDepartments = departmentsData.length;
    const totalBudget = departmentsData.reduce((sum, dept) => sum + (dept.budget?.monthly || 0), 0);
    const activeLoans = loansData.filter(loan => loan.status === 'active').length;
    const pendingAssignments = assignmentsData.filter(assignment => assignment.status === 'pending').length;
    
    // Update counters
    updateElementText('totalDepartments', totalDepartments.toString());
    updateElementText('totalBudget', formatCurrency(totalBudget));
    updateElementText('activeLoans', activeLoans.toString());
    updateElementText('pendingAssignments', pendingAssignments.toString());
    updateElementText('departmentsCount', `${totalDepartments} Departments`);
    updateElementText('departmentLoans', `${activeLoans} active loans`);
    
    // Generate alerts
    generateDepartmentAlerts();
}

// Generate department alerts and warnings
function generateDepartmentAlerts() {
    const alertsContainer = document.getElementById('departmentAlerts');
    if (!alertsContainer) return;
    
    const alerts = [];
    
    departmentsData.forEach(dept => {
        if (dept.budget) {
            const utilizationRate = dept.budget.spent / dept.budget.monthly;
            
            if (utilizationRate > 0.9) {
                alerts.push({
                    type: 'danger',
                    message: `${dept.name} has exceeded 90% of monthly budget`
                });
            } else if (utilizationRate > 0.75) {
                alerts.push({
                    type: 'warning',
                    message: `${dept.name} has used ${Math.round(utilizationRate * 100)}% of monthly budget`
                });
            }
            
            if (dept.currentDebt > dept.creditLimit * 0.8) {
                alerts.push({
                    type: 'danger',
                    message: `${dept.name} is near credit limit (${formatCurrency(dept.currentDebt)})`
                });
            }
        }
    });
    
    if (alerts.length === 0) {
        alertsContainer.innerHTML = `
            <div class="alert-item info">
                <i class="fas fa-check-circle"></i>
                All departments are operating within normal parameters
            </div>
        `;
    } else {
        alertsContainer.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.type}">
                <i class="fas fa-exclamation-triangle"></i>
                ${alert.message}
            </div>
        `).join('');
    }
}

// Display departments in grid
function displayDepartments() {
    const grid = document.getElementById('departmentsGrid');
    if (!grid || !departmentsData.length) return;
    
    grid.innerHTML = departmentsData.map(dept => {
        const budgetUtilization = dept.budget ? (dept.budget.spent / dept.budget.monthly) * 100 : 0;
        
        return `
            <div class="department-card">
                <div class="dept-header">
                    <div class="dept-info">
                        <h3>${dept.name}</h3>
                        <span class="dept-code">${dept.code}</span>
                        <div class="dept-category">${dept.category}</div>
                    </div>
                    <span class="dept-status ${dept.status}">${dept.status}</span>
                </div>
                
                <div class="dept-budget">
                    <div class="budget-item">
                        <span class="amount">${formatCurrency(dept.budget?.monthly || 0)}</span>
                        <span class="label">Monthly Budget</span>
                    </div>
                    <div class="budget-item">
                        <span class="amount">${formatCurrency(dept.budget?.remaining || 0)}</span>
                        <span class="label">Remaining</span>
                    </div>
                    <div class="budget-item">
                        <span class="amount">${formatCurrency(dept.budget?.spent || 0)}</span>
                        <span class="label">Spent</span>
                    </div>
                    <div class="budget-item">
                        <span class="amount">${formatCurrency(dept.currentDebt || 0)}</span>
                        <span class="label">Current Debt</span>
                    </div>
                </div>
                
                <div class="dept-progress">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 0.875rem; color: var(--text-secondary);">Budget Utilization</span>
                        <span style="font-size: 0.875rem; font-weight: 600;">${budgetUtilization.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(budgetUtilization, 100)}%"></div>
                    </div>
                </div>
                
                <div class="dept-actions">
                    <button class="btn btn-primary btn-sm" onclick="viewDepartmentDetails('${dept._id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="editDepartmentBudget('${dept._id}')">
                        <i class="fas fa-edit"></i> Edit Budget
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Show department sub-tabs
function showDepartmentSubTab(tabName) {
    // Hide all sub-tab contents
    document.querySelectorAll('.sub-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all sub-tab buttons
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected sub-tab content
    const selectedContent = document.getElementById(`dept-${tabName}`);
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Load data for specific tabs
    switch(tabName) {
        case 'loans':
            loadDepartmentLoans();
            break;
        case 'assignments':
            loadPaymentAssignments();
            break;
        case 'transactions':
            loadDepartmentTransactions();
            break;
    }
}

// Show department modal
function showDepartmentModal() {
    document.getElementById('departmentForm').reset();
    showModal('departmentModal');
}

// Handle department form submission
async function handleDepartmentSubmit(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('staffToken');
    if (!token) {
        showNotification('Please log in to create departments', 'error');
        return;
    }
    
    const formData = {
        name: document.getElementById('deptName').value.trim(),
        code: document.getElementById('deptCode').value.trim().toUpperCase(),
        category: document.getElementById('deptCategory').value,
        monthlyBudget: parseFloat(document.getElementById('deptBudget').value) || 0,
        manager: {
            name: document.getElementById('deptManagerName').value.trim(),
            contact: document.getElementById('deptManagerContact').value.trim()
        },
        creditLimit: parseFloat(document.getElementById('deptCreditLimit').value) || 0,
        description: document.getElementById('deptDescription').value.trim()
    };
    
    try {
        const response = await fetch('/api/departments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create department');
        }
        
        showNotification('Department created successfully!', 'success');
        closeModal('departmentModal');
        await loadDepartments();
        
    } catch (error) {
        console.error('❌ Error creating department:', error);
        showNotification(error.message, 'error');
    }
}

// Show loan modal
function showLoanModal() {
    document.getElementById('loanForm').reset();
    updateDepartmentDropdowns();
    showModal('loanModal');
}

// Handle loan form submission  
async function handleLoanSubmit(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('staffToken');
    if (!token) {
        showNotification('Please log in to create loans', 'error');
        return;
    }
    
    const formData = {
        borrowerDepartmentCode: document.getElementById('loanBorrowerDept').value,
        lenderDepartmentCode: document.getElementById('loanLenderDept').value,
        principalAmount: parseFloat(document.getElementById('loanAmount').value),
        interestRate: parseFloat(document.getElementById('loanInterestRate').value),
        termDays: parseInt(document.getElementById('loanTermDays').value),
        purpose: document.getElementById('loanPurpose').value,
        purposeDescription: document.getElementById('loanPurposeDescription').value
    };
    
    // Validation
    if (formData.borrowerDepartmentCode === formData.lenderDepartmentCode) {
        showNotification('Borrower and lender departments cannot be the same', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/departments/loans', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create loan');
        }
        
        showNotification('Loan created successfully!', 'success');
        closeModal('loanModal');
        await loadDepartmentLoans();
        
    } catch (error) {
        console.error('❌ Error creating loan:', error);
        showNotification(error.message, 'error');
    }
}

// Update department dropdowns in forms
function updateDepartmentDropdowns() {
    const selectors = ['loanBorrowerDept', 'loanLenderDept', 'transactionDeptFilter'];
    
    selectors.forEach(selectorId => {
        const select = document.getElementById(selectorId);
        if (select && departmentsData.length) {
            const currentValue = select.value;
            select.innerHTML = select.querySelector('option[value=""]')?.outerHTML || '<option value="">Select Department</option>';
            
            departmentsData.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.code;
                option.textContent = `${dept.name} (${dept.code})`;
                select.appendChild(option);
            });
            
            if (currentValue) {
                select.value = currentValue;
            }
        }
    });
}

// Utility functions for department finance
function formatCurrency(amount) {
    if (typeof amount !== 'number') return '₦0';
    return `₦${amount.toLocaleString()}`;
}

function updateElementText(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

// Initialize department finance when departments tab is shown
function initDepartmentFinance() {
    if (departmentsData.length === 0) {
        loadDepartments();
    }
}

// Load department loans
async function loadDepartmentLoans() {
    console.log('💰 Loading department loans...');
    
    try {
        const token = localStorage.getItem('staffToken');
        if (!token) {
            showNotification('Please log in to access loans', 'error');
            return;
        }
        
        const response = await fetch('/api/departments/loans', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch loans');
        }
        
        loansData = await response.json();
        console.log(`✅ Loaded ${loansData.length} loans`);
        
        displayDepartmentLoans();
        updateDepartmentDashboard();
        
    } catch (error) {
        console.error('❌ Error loading loans:', error);
        showNotification('Failed to load loans', 'error');
    }
}

// Display department loans
function displayDepartmentLoans() {
    const container = document.getElementById('loansContainer');
    if (!container) return;
    
    if (!loansData.length) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <i class="fas fa-hand-holding-usd" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                <h4>No Loans Found</h4>
                <p>Create a new department loan to get started</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = loansData.map(loan => {
        const statusClass = loan.status === 'active' ? 'success' : 
                           loan.status === 'pending' ? 'warning' : 'info';
        
        return `
            <div class="loan-card">
                <div class="loan-header">
                    <div class="loan-info">
                        <h3>Loan #${loan.loanId}</h3>
                        <div class="loan-departments">
                            <span class="borrower">${loan.borrowerDepartmentCode}</span>
                            <i class="fas fa-arrow-right"></i>
                            <span class="lender">${loan.lenderDepartmentCode}</span>
                        </div>
                    </div>
                    <span class="loan-status ${statusClass}">${loan.status}</span>
                </div>
                
                <div class="loan-details">
                    <div class="loan-amounts">
                        <div class="amount-item">
                            <span class="amount">${formatCurrency(loan.principalAmount)}</span>
                            <span class="label">Principal</span>
                        </div>
                        <div class="amount-item">
                            <span class="amount">${loan.interestRate}%</span>
                            <span class="label">Interest Rate</span>
                        </div>
                        <div class="amount-item">
                            <span class="amount">${loan.termDays} days</span>
                            <span class="label">Term</span>
                        </div>
                        <div class="amount-item">
                            <span class="amount">${formatCurrency(loan.totalDue)}</span>
                            <span class="label">Total Due</span>
                        </div>
                    </div>
                    
                    <div class="loan-purpose">
                        <strong>Purpose:</strong> ${loan.purpose}
                        ${loan.purposeDescription ? `<br><em>${loan.purposeDescription}</em>` : ''}
                    </div>
                    
                    <div class="loan-dates">
                        <div>Start: ${new Date(loan.startDate).toLocaleDateString()}</div>
                        <div>Due: ${new Date(loan.dueDate).toLocaleDateString()}</div>
                        ${loan.completedDate ? `<div>Completed: ${new Date(loan.completedDate).toLocaleDateString()}</div>` : ''}
                    </div>
                </div>
                
                <div class="loan-actions">
                    ${loan.status === 'pending' ? `
                        <button class="btn btn-success btn-sm" onclick="approveLoan('${loan._id}')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="rejectLoan('${loan._id}')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    ` : ''}
                    ${loan.status === 'active' ? `
                        <button class="btn btn-primary btn-sm" onclick="recordLoanPayment('${loan._id}')">
                            <i class="fas fa-money-bill"></i> Record Payment
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary btn-sm" onclick="viewLoanDetails('${loan._id}')">
                        <i class="fas fa-eye"></i> Details
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Approve loan
async function approveLoan(loanId) {
    if (!confirm('Are you sure you want to approve this loan?')) return;
    
    try {
        const token = localStorage.getItem('staffToken');
        const response = await fetch(`/api/departments/loans/${loanId}/approve`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to approve loan');
        }
        
        showNotification('Loan approved successfully!', 'success');
        await loadDepartmentLoans();
        
    } catch (error) {
        console.error('❌ Error approving loan:', error);
        showNotification('Failed to approve loan', 'error');
    }
}

// Reject loan
async function rejectLoan(loanId) {
    const reason = prompt('Please provide a reason for rejection (optional):');
    if (reason === null) return; // User cancelled
    
    try {
        const token = localStorage.getItem('staffToken');
        const response = await fetch(`/api/departments/loans/${loanId}/reject`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ rejectionReason: reason })
        });
        
        if (!response.ok) {
            throw new Error('Failed to reject loan');
        }
        
        showNotification('Loan rejected', 'info');
        await loadDepartmentLoans();
        
    } catch (error) {
        console.error('❌ Error rejecting loan:', error);
        showNotification('Failed to reject loan', 'error');
    }
}

// Load payment assignments
async function loadPaymentAssignments() {
    console.log('📋 Loading payment assignments...');
    
    try {
        const token = localStorage.getItem('staffToken');
        if (!token) {
            showNotification('Please log in to access assignments', 'error');
            return;
        }
        
        const response = await fetch('/api/departments/assignments', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch assignments');
        }
        
        assignmentsData = await response.json();
        console.log(`✅ Loaded ${assignmentsData.length} assignments`);
        
        displayPaymentAssignments();
        updateDepartmentDashboard();
        
    } catch (error) {
        console.error('❌ Error loading assignments:', error);
        showNotification('Failed to load assignments', 'error');
    }
}

// Display payment assignments
function displayPaymentAssignments() {
    const container = document.getElementById('assignmentsContainer');
    if (!container) return;
    
    if (!assignmentsData.length) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <i class="fas fa-clipboard-list" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                <h4>No Payment Assignments</h4>
                <p>Create assignments to split order payments across departments</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = assignmentsData.map(assignment => {
        const statusClass = assignment.status === 'completed' ? 'success' : 
                           assignment.status === 'processing' ? 'warning' : 'info';
        
        return `
            <div class="assignment-card">
                <div class="assignment-header">
                    <div class="assignment-info">
                        <h3>Assignment #${assignment.assignmentId}</h3>
                        <div class="assignment-meta">
                            <span>${assignment.orderType}: ${assignment.orderId}</span>
                            <span class="assignment-total">${formatCurrency(assignment.totalAmount)}</span>
                        </div>
                    </div>
                    <span class="assignment-status ${statusClass}">${assignment.status}</span>
                </div>
                
                <div class="assignment-details">
                    <div class="department-assignments">
                        ${assignment.departmentAssignments.map(dept => `
                            <div class="dept-assignment">
                                <div class="dept-name">${dept.departmentCode}</div>
                                <div class="dept-amount">${formatCurrency(dept.amount)} (${dept.percentage}%)</div>
                                <div class="dept-reason">${dept.reason || 'No reason specified'}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="assignment-progress">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span>Completion Progress</span>
                            <span>${assignment.completionPercentage.toFixed(1)}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${assignment.completionPercentage}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="assignment-actions">
                    <button class="btn btn-primary btn-sm" onclick="viewAssignmentDetails('${assignment._id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    ${assignment.status === 'pending' ? `
                        <button class="btn btn-success btn-sm" onclick="processAssignment('${assignment._id}')">
                            <i class="fas fa-play"></i> Process
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Load department transactions
async function loadDepartmentTransactions() {
    console.log('💳 Loading department transactions...');
    
    try {
        const token = localStorage.getItem('staffToken');
        if (!token) {
            showNotification('Please log in to access transactions', 'error');
            return;
        }
        
        const response = await fetch('/api/departments/transactions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch transactions');
        }
        
        transactionsData = await response.json();
        console.log(`✅ Loaded ${transactionsData.length} transactions`);
        
        displayDepartmentTransactions();
        
    } catch (error) {
        console.error('❌ Error loading transactions:', error);
        showNotification('Failed to load transactions', 'error');
    }
}

// Display department transactions with filtering
function displayDepartmentTransactions() {
    const container = document.getElementById('transactionsContainer');
    if (!container) return;
    
    let filteredTransactions = [...transactionsData];
    
    // Apply filters
    const typeFilter = document.getElementById('transactionTypeFilter')?.value;
    const deptFilter = document.getElementById('transactionDeptFilter')?.value;
    const statusFilter = document.getElementById('transactionStatusFilter')?.value;
    
    if (typeFilter) {
        filteredTransactions = filteredTransactions.filter(t => t.type === typeFilter);
    }
    
    if (deptFilter) {
        filteredTransactions = filteredTransactions.filter(t => 
            t.fromDepartment === deptFilter || t.toDepartment === deptFilter
        );
    }
    
    if (statusFilter) {
        filteredTransactions = filteredTransactions.filter(t => t.status === statusFilter);
    }
    
    if (!filteredTransactions.length) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <i class="fas fa-receipt" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                <h4>No Transactions Found</h4>
                <p>No transactions match your current filters</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredTransactions.map(transaction => {
        const statusClass = transaction.status === 'completed' ? 'success' : 
                           transaction.status === 'pending' ? 'warning' : 'info';
        
        return `
            <div class="transaction-item">
                <div class="transaction-header">
                    <div class="transaction-info">
                        <h4>Transaction #${transaction.transactionId}</h4>
                        <div class="transaction-type">${transaction.type} - ${transaction.category}</div>
                    </div>
                    <div class="transaction-amount">${formatCurrency(transaction.amount)}</div>
                    <span class="transaction-status ${statusClass}">${transaction.status}</span>
                </div>
                
                <div class="transaction-details">
                    <div class="transaction-flow">
                        <span class="from-dept">${transaction.fromDepartment}</span>
                        <i class="fas fa-arrow-right"></i>
                        <span class="to-dept">${transaction.toDepartment}</span>
                    </div>
                    
                    <div class="transaction-meta">
                        <div>Date: ${new Date(transaction.createdAt).toLocaleDateString()}</div>
                        ${transaction.loanId ? `<div>Loan: #${transaction.loanId}</div>` : ''}
                        ${transaction.description ? `<div>Description: ${transaction.description}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Filter transactions
function filterTransactions() {
    displayDepartmentTransactions();
}

// Show assignment modal
function showAssignmentModal() {
    document.getElementById('assignmentForm').reset();
    updateDepartmentDropdowns();
    showModal('assignmentModal');
}

// Show payment assignment modal (alias for showAssignmentModal)
function showPaymentAssignmentModal() {
    showAssignmentModal();
}

// Show payment assignment modal (alias for showAssignmentModal)
function showPaymentAssignmentModal() {
    showAssignmentModal();
}

// Handle assignment form submission
async function handleAssignmentSubmit(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('staffToken');
    if (!token) {
        showNotification('Please log in to create assignments', 'error');
        return;
    }
    
    // Get department assignments from the form
    const departmentAssignments = [];
    const assignmentItems = document.querySelectorAll('.assignment-item');
    
    assignmentItems.forEach(item => {
        const deptCode = item.querySelector('.assignment-dept').value;
        const percentage = parseFloat(item.querySelector('.assignment-percentage').value) || 0;
        const reason = item.querySelector('.assignment-reason').value;
        
        if (deptCode && percentage > 0) {
            departmentAssignments.push({
                departmentCode: deptCode,
                percentage: percentage,
                reason: reason
            });
        }
    });
    
    if (departmentAssignments.length === 0) {
        showNotification('Please add at least one department assignment', 'error');
        return;
    }
    
    const totalPercentage = departmentAssignments.reduce((sum, dept) => sum + dept.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
        showNotification('Total assignment percentage must equal 100%', 'error');
        return;
    }
    
    const formData = {
        orderId: document.getElementById('assignmentOrderId').value,
        orderType: document.getElementById('assignmentOrderType').value,
        totalAmount: parseFloat(document.getElementById('assignmentTotalAmount').value),
        departmentAssignments: departmentAssignments
    };
    
    try {
        const response = await fetch('/api/departments/assignments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create assignment');
        }
        
        showNotification('Payment assignment created successfully!', 'success');
        closeModal('assignmentModal');
        await loadPaymentAssignments();
        
    } catch (error) {
        console.error('❌ Error creating assignment:', error);
        showNotification(error.message, 'error');
    }
}

// Add assignment item to form
function addAssignmentItem() {
    const container = document.getElementById('assignmentItemsContainer');
    const itemCount = container.children.length;
    
    const newItem = document.createElement('div');
    newItem.className = 'assignment-item';
    newItem.innerHTML = `
        <select class="assignment-dept" required>
            <option value="">Select Department</option>
            ${departmentsData.map(dept => 
                `<option value="${dept.code}">${dept.name} (${dept.code})</option>`
            ).join('')}
        </select>
        <input type="number" class="assignment-percentage" placeholder="Percentage" min="0" max="100" step="0.01" required>
        <input type="text" class="assignment-reason" placeholder="Reason (optional)">
        <button type="button" class="btn btn-danger btn-sm" onclick="removeAssignmentItem(this)">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    container.appendChild(newItem);
}

// Remove assignment item from form
function removeAssignmentItem(button) {
    button.closest('.assignment-item').remove();
}

// Helper function to view department details (placeholder)
function viewDepartmentDetails(deptId) {
    console.log('Viewing department details for:', deptId);
    showNotification('Department details view coming soon!', 'info');
}

// Helper function to edit department budget (placeholder)
function editDepartmentBudget(deptId) {
    console.log('Editing budget for department:', deptId);
    showNotification('Budget editing feature coming soon!', 'info');
}

// Helper function to view loan details (placeholder)
function viewLoanDetails(loanId) {
    console.log('Viewing loan details for:', loanId);
    showNotification('Loan details view coming soon!', 'info');
}

// Helper function to record loan payment (placeholder)
function recordLoanPayment(loanId) {
    console.log('Recording payment for loan:', loanId);
    showNotification('Loan payment recording coming soon!', 'info');
}

// Helper function to view assignment details (placeholder)
function viewAssignmentDetails(assignmentId) {
    console.log('Viewing assignment details for:', assignmentId);
    showNotification('Assignment details view coming soon!', 'info');
}

// Helper function to process assignment (placeholder)
function processAssignment(assignmentId) {
    console.log('Processing assignment:', assignmentId);
    showNotification('Assignment processing coming soon!', 'info');
}
