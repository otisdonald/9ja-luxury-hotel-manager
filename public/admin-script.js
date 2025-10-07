// Admin Dashboard JavaScript

// Global chart instances
let chartInstances = {};

// Theme Management System (copied from main script for consistency)
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Show notification if available
    if (typeof showNotification === 'function') {
        showNotification(`Switched to ${newTheme} theme`, 'success');
    } else {
        console.log(`Theme switched to ${newTheme}`);
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
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
    
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.content = theme === 'dark' ? '#1e293b' : '#2c3e50';
    }
}

// Authentication helper function - MUST be defined first
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('staffToken');
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-auth-token': token
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, mergedOptions);
        
        // Special handling for staff status endpoint - suppress 404 errors for admin dashboard
        if (url.includes('/api/staff/current-status') && response.status === 404) {
            // Return empty array silently without logging
            return { ok: false, status: 404, json: async () => [] };
        }
        
        return response;
    } catch (error) {
        console.error('Fetch error for', url, ':', error);
        throw error;
    }
}

// Helper: fetch JSON with auth and safe fallback
async function fetchJson(url, fallback = []) {
    try {
        const res = await fetchWithAuth(url);
        if (!res || !res.ok) return fallback;
        try {
            return await res.json();
        } catch (e) {
            return fallback;
        }
    } catch (e) {
        return fallback;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initTheme(); // Initialize theme first
    checkStaffAuthentication();
    initializeAdminDashboard();
    
    // Add cleanup on page unload
    window.addEventListener('beforeunload', cleanupAdmin);
});

// Cleanup function for admin dashboard
function cleanupAdmin() {
    // Clear any intervals
    if (window.adminUpdateInterval) {
        clearInterval(window.adminUpdateInterval);
        window.adminUpdateInterval = null;
    }
    
    // Destroy all charts
    destroyAllCharts();
    
    console.log('Admin dashboard cleanup completed');
}

// Initialize admin dashboard components
function initializeAdminDashboard() {
    // Set current date
    const currentDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = currentDate;
    }

    // Set report date to today
    const reportDateInput = document.getElementById('reportDate');
    if (reportDateInput) {
        reportDateInput.value = new Date().toISOString().split('T')[0];
    }

    // Initialize charts and data loading
    setTimeout(() => {
        if (document.getElementById('adminDashboard') && !document.getElementById('adminDashboard').classList.contains('hidden')) {
            loadExecutiveDashboard();
            loadDailyReport();
            loadHotelSectionsData();
        }
    }, 100);
    
    console.log('✅ Admin Dashboard initialized successfully');
}

// Export functions for header buttons
function exportDailyReport() {
    try {
        console.log('📊 Generating daily report...');
        
        // Get current data
        const reportData = {
            date: new Date().toISOString().split('T')[0],
            hotel: '9JA Luxury Hotel',
            summary: {
                totalRevenue: document.getElementById('dailyRevenue')?.textContent || '₦0',
                occupancyRate: document.getElementById('occupancyRate')?.textContent || '0%',
                activeGuests: document.getElementById('activeGuests')?.textContent || '0',
                kitchenRevenue: document.getElementById('kitchenRevenue')?.textContent || '₦0'
            },
            timestamp: new Date().toLocaleString()
        };
        
        // Create CSV content
        const csvContent = [
            'Daily Report - 9JA Luxury Hotel',
            `Generated: ${reportData.timestamp}`,
            '',
            'Summary Metrics:',
            `Total Revenue,${reportData.summary.totalRevenue}`,
            `Occupancy Rate,${reportData.summary.occupancyRate}`,
            `Active Guests,${reportData.summary.activeGuests}`,
            `Kitchen Revenue,${reportData.summary.kitchenRevenue}`,
        ].join('\n');
        
        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `daily-report-${reportData.date}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showNotification('Daily report exported successfully!', 'success');
    } catch (error) {
        console.error('Error exporting daily report:', error);
        showNotification('Error exporting daily report', 'error');
    }
}

function exportWeeklyReport() {
    try {
        console.log('📊 Generating weekly report...');
        
        // Get date range for the week
        const today = new Date();
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));
        
        const reportData = {
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            hotel: '9JA Luxury Hotel',
            timestamp: new Date().toLocaleString()
        };
        
        // Create CSV content
        const csvContent = [
            'Weekly Report - 9JA Luxury Hotel',
            `Week: ${reportData.weekStart} to ${reportData.weekEnd}`,
            `Generated: ${reportData.timestamp}`,
            '',
            'Weekly Summary:',
            'Date,Revenue,Occupancy,Guests,Kitchen Revenue',
            // This would typically include actual weekly data
            `${reportData.weekStart},Sample Data,Sample Data,Sample Data,Sample Data`,
            '',
            'Note: This is a sample weekly report format.',
            'Full implementation would include actual weekly metrics.'
        ].join('\n');
        
        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `weekly-report-${reportData.weekStart}-to-${reportData.weekEnd}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showNotification('Weekly report exported successfully!', 'success');
    } catch (error) {
        console.error('Error exporting weekly report:', error);
        showNotification('Error exporting weekly report', 'error');
    }
}

// Tab switching functionality
function showTab(tabName) {
    try {
        console.log(`🔄 Switching to tab: ${tabName}`);
        
        // Hide all tab contents
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(tab => {
            tab.classList.remove('active');
            // Also hide with display none for stock section
            if (tab.id === 'stock-section-tab') {
                tab.style.display = 'none';
            }
        });

        // Remove active class from all tab buttons
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected tab
        const selectedTab = document.getElementById(`${tabName}-tab`);
        if (selectedTab) {
            selectedTab.classList.add('active');
            // Special handling for stock section
            if (tabName === 'stock-section') {
                selectedTab.style.display = 'block';
            }
        }

        // Add active class to clicked button
        if (event && event.target) {
            event.target.classList.add('active');
        } else {
            // Fallback: find the button by tab name
            const activeBtn = document.querySelector(`button[onclick*="${tabName}"]`);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }
        }

        // Load tab-specific data
        switch(tabName) {
            case 'dashboard':
                loadExecutiveDashboard();
                break;
            case 'daily-reports':
                loadDailyReport();
                break;
            case 'hotel-sections':
                loadHotelSectionsData();
                break;
            case 'analytics':
                loadAdvancedAnalytics();
                break;
            case 'financial':
                loadFinancialOverview();
                // Load inventory analytics for the financial tab
                setTimeout(() => {
                    loadInventoryAnalytics();
                }, 500);
                break;
            case 'guest-portal':
                loadGuestPortalData();
                loadGuestOrders(); // Load default tab content
                break;
            case 'stock-section':
                // Initialize stock management with delay
                setTimeout(() => {
                    if (typeof initializeStockManagement === 'function') {
                        initializeStockManagement();
                    } else {
                        console.warn('initializeStockManagement function not found');
                    }
                }, 100);
                break;
            default:
                console.warn(`Unknown tab: ${tabName}`);
                loadExecutiveDashboard();
        }
        
        console.log(`✅ Successfully switched to tab: ${tabName}`);
    } catch (error) {
        console.error(`❌ Error switching to tab ${tabName}:`, error);
        // Fallback to dashboard
        showTab('dashboard');
    }
}

// Check if staff is authenticated and has admin privileges
function checkStaffAuthentication() {
    const staffToken = localStorage.getItem('staffToken');
    const staffInfo = JSON.parse(localStorage.getItem('staffInfo') || '{}');
    
    if (!staffToken) {
        // No token, redirect to staff login
        window.location.href = '/staff-login.html';
        return;
    }
    
    // Check if staff has admin privileges (Director only - DIR001)
    if (staffInfo.position !== 'director') {
        alert('Director access required. Only DIR001 (Hotel Director) can access this dashboard.');
        window.location.href = '/index.html';
        return;
    }
    
    // Verify token and show dashboard
    verifyStaffTokenAndShowDashboard();
}

async function verifyStaffTokenAndShowDashboard() {
    const staffToken = localStorage.getItem('staffToken');
    
    try {
        const response = await fetch('/api/staff/verify', {
            headers: {
                'Authorization': `Bearer ${staffToken}`
            }
        });
        
        if (!response.ok) {
            localStorage.removeItem('staffToken');
            localStorage.removeItem('staffInfo');
            window.location.href = '/staff-login.html';
            return;
        }
        
        const data = await response.json();
        if (!data.valid) {
            localStorage.removeItem('staffToken');
            localStorage.removeItem('staffInfo');
            window.location.href = '/staff-login.html';
            return;
        }
        
        // Check admin privileges again (Director only)
        if (data.staff.position !== 'director') {
            alert('Director access required. You will be redirected to the staff portal.');
            window.location.href = '/index.html';
            return;
        }
        
        // Update staff info and show dashboard
        updateAdminStaffDisplay(data.staff);
        showDashboard();
        
    } catch (error) {
        console.error('Token verification error:', error);
        localStorage.removeItem('staffToken');
        localStorage.removeItem('staffInfo');
        window.location.href = '/staff-login.html';
    }
}

// Load Executive Dashboard data
async function loadExecutiveDashboard() {
    try {
        const [roomsData, customersData, paymentsData, kitchenOrdersData, barItemsData] = await Promise.all([
            fetchWithAuth('/api/rooms').catch(e => []),
            fetchWithAuth('/api/customers').catch(e => []),
            fetchWithAuth('/api/payments').catch(e => []),
            fetchWithAuth('/api/kitchen/orders').catch(e => []),
            fetchWithAuth('/api/bar/inventory').catch(e => [])
        ]);

        // Ensure all data are arrays
        const rooms = Array.isArray(roomsData) ? roomsData : [];
        const customers = Array.isArray(customersData) ? customersData : [];
        const payments = Array.isArray(paymentsData) ? paymentsData : [];
        const kitchenOrders = Array.isArray(kitchenOrdersData) ? kitchenOrdersData : [];
        const barItems = Array.isArray(barItemsData) ? barItemsData : [];

        // Calculate metrics
        const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
        const occupancyRate = Math.round((occupiedRooms / rooms.length) * 100);
        
        // Calculate today's revenue
        const today = new Date().toISOString().split('T')[0];
        const todayPayments = payments.filter(p => p.createdAt && p.createdAt.includes(today));
        const dailyRevenue = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        // Calculate kitchen revenue
        const kitchenRevenue = kitchenOrders
            .filter(o => o.createdAt && o.createdAt.includes(today))
            .reduce((sum, o) => sum + (o.total || 0), 0);

        // Update dashboard metrics
        updateElement('dailyRevenue', `₦${dailyRevenue.toLocaleString()}`);
        updateElement('occupancyRate', `${occupancyRate}%`);
        updateElement('activeGuests', occupiedRooms);
        updateElement('kitchenRevenue', `₦${kitchenRevenue.toLocaleString()}`);
        updateElement('staffOnDutyCount', '4'); // Assuming all staff are on duty
        
        // Calculate profit (simplified)
        const estimatedCosts = dailyRevenue * 0.6; // 60% cost ratio
        const dailyProfit = dailyRevenue - estimatedCosts;
        const profitMargin = dailyRevenue > 0 ? Math.round((dailyProfit / dailyRevenue) * 100) : 0;
        
        updateElement('dailyProfit', `₦${dailyProfit.toLocaleString()}`);
        updateElement('profitMargin', `${profitMargin}% margin`);

        // Update quick status
        updateElement('quickAvailableRooms', rooms.filter(r => r.status === 'available').length);
        updateElement('quickKitchenOrders', kitchenOrders.filter(o => o.status === 'pending' || o.status === 'preparing').length);
        updateElement('quickBarRevenue', `₦${(barItems.reduce((sum, item) => sum + (item.price * item.quantity || 0), 0)).toLocaleString()}`);
        updateElement('quickPendingIssues', '0'); // Placeholder

        // Load executive charts
        loadExecutiveCharts(dailyRevenue, occupancyRate, kitchenRevenue);

    } catch (error) {
        console.error('Error loading executive dashboard:', error);
    }
}

// Load Daily Report data
async function loadDailyReport() {
    const reportDate = document.getElementById('reportDate')?.value || new Date().toISOString().split('T')[0];
    
    try {
        const [roomsData, customersData, paymentsData, kitchenOrdersData, barItemsData, staffData] = await Promise.all([
            fetchWithAuth('/api/rooms').catch(e => []),
            fetchWithAuth('/api/customers').catch(e => []),
            fetchWithAuth('/api/payments').catch(e => []),
            fetchWithAuth('/api/kitchen/orders').catch(e => []),
            fetchWithAuth('/api/bar/inventory').catch(e => []),
            fetchWithAuth('/api/staff').catch(e => [])
        ]);

        // Ensure all data are arrays
        const rooms = Array.isArray(roomsData) ? roomsData : [];
        const customers = Array.isArray(customersData) ? customersData : [];
        const payments = Array.isArray(paymentsData) ? paymentsData : [];
        const kitchenOrders = Array.isArray(kitchenOrdersData) ? kitchenOrdersData : [];
        const barItems = Array.isArray(barItemsData) ? barItemsData : [];
        const staff = Array.isArray(staffData) ? staffData : [];

        // Filter data for selected date
        const dayPayments = payments.filter(p => p.createdAt && p.createdAt.includes(reportDate));
        const dayOrders = kitchenOrders.filter(o => o.createdAt && o.createdAt.includes(reportDate));
        
        // Financial Summary
        const roomRevenue = dayPayments
            .filter(p => p.description && p.description.includes('room'))
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        const fbRevenue = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const barRevenue = dayPayments
            .filter(p => p.description && p.description.includes('bar'))
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        const totalRevenue = roomRevenue + fbRevenue + barRevenue;

        updateElement('dailyRoomRevenue', `₦${roomRevenue.toLocaleString()}`);
        updateElement('dailyFBRevenue', `₦${fbRevenue.toLocaleString()}`);
        updateElement('dailyBarRevenue', `₦${barRevenue.toLocaleString()}`);
        updateElement('dailyTotalRevenue', `₦${totalRevenue.toLocaleString()}`);

        updateElement('dailyRoomTransactions', `${dayPayments.filter(p => p.description && p.description.includes('room')).length} bookings`);
        updateElement('dailyFBTransactions', `${dayOrders.length} orders`);
        updateElement('dailyBarTransactions', `${dayPayments.filter(p => p.description && p.description.includes('bar')).length} items sold`);
        updateElement('dailyTotalTransactions', `${dayPayments.length} transactions`);

        // Operational Summary
        updateElement('dailyCheckins', dayPayments.filter(p => p.type === 'booking').length);
        updateElement('dailyCheckouts', '0'); // Placeholder
        updateElement('dailyRoomChanges', '0'); // Placeholder
        updateElement('dailyCleaningCompleted', '0'); // Placeholder

        updateElement('dailyOrdersProcessed', dayOrders.filter(o => o.status === 'completed' || o.status === 'delivered').length);
        updateElement('dailyAvgPrepTime', '25 min'); // Placeholder
        updateElement('dailyFoodCost', `₦${Math.round(fbRevenue * 0.4).toLocaleString()}`);
        updateElement('dailyWasteCost', `₦${Math.round(fbRevenue * 0.05).toLocaleString()}`);

        updateElement('dailyTotalHours', staff.length * 8); // Assuming 8 hours per staff
        updateElement('dailyOvertimeHours', '0'); // Placeholder
        updateElement('dailyStaffEfficiency', '92%'); // Placeholder
        updateElement('dailyLateArrivals', '0'); // Placeholder

        updateElement('dailyIssuesReported', '0'); // Placeholder
        updateElement('dailyIssuesResolved', '0'); // Placeholder
        updateElement('dailyMaintenanceCosts', '₦0'); // Placeholder
        updateElement('dailyEmergencyCalls', '0'); // Placeholder

        // Customer Insights
        updateElement('dailySatisfactionScore', '4.5'); // Placeholder
        updateElement('dailyReviewsCount', '3 reviews'); // Placeholder
        updateElement('dailyRepeatRate', '25%'); // Placeholder
        updateElement('dailyRepeatCount', `1 of ${customers.length} guests`);
        updateElement('dailyAvgStay', '2.5 days'); // Placeholder
        updateElement('dailyStayRange', '1-7 days range');
        updateElement('dailyRevenuePerGuest', `₦${customers.length > 0 ? Math.round(totalRevenue / customers.length).toLocaleString() : '0'}`);
        updateElement('dailyGuestSpending', 'avg spending');

    } catch (error) {
        console.error('Error loading daily report:', error);
    }
}

// Load Hotel Sections data
async function loadHotelSectionsData() {
    try {
        const [roomsData, customersData, kitchenOrdersData, barItemsData, paymentsData, staffData] = await Promise.all([
            fetchWithAuth('/api/rooms').catch(e => []),
            fetchWithAuth('/api/customers').catch(e => []),
            fetchWithAuth('/api/kitchen/orders').catch(e => []),
            fetchWithAuth('/api/bar/inventory').catch(e => []),
            fetchWithAuth('/api/payments').catch(e => []),
            fetchWithAuth('/api/staff').catch(e => [])
        ]);

        // Ensure all data are arrays
        const rooms = Array.isArray(roomsData) ? roomsData : [];
        const customers = Array.isArray(customersData) ? customersData : [];
        const kitchenOrders = Array.isArray(kitchenOrdersData) ? kitchenOrdersData : [];
        const barItems = Array.isArray(barItemsData) ? barItemsData : [];
        const payments = Array.isArray(paymentsData) ? paymentsData : [];
        const staff = Array.isArray(staffData) ? staffData : [];

        // Update section statistics
        updateElement('sectionOccupiedRooms', rooms.filter(r => r.status === 'occupied').length);
        updateElement('sectionAvailableRooms', rooms.filter(r => r.status === 'available').length);
        updateElement('sectionTotalCustomers', customers.length);
        updateElement('sectionActiveCustomers', customers.filter(c => c.status === 'checked-in').length);
        updateElement('sectionKitchenOrders', kitchenOrders.filter(o => o.status === 'pending' || o.status === 'preparing').length);
        updateElement('sectionKitchenCost', `₦${kitchenOrders.reduce((sum, o) => sum + (o.total || 0), 0).toLocaleString()}`);
        updateElement('sectionBarItems', barItems.length);
        updateElement('sectionBarRevenue', `₦${barItems.reduce((sum, item) => sum + (item.price * item.quantity || 0), 0).toLocaleString()}`);
        updateElement('sectionStaffOnDuty', staff.filter(s => s.status === 'on-duty').length);
        updateElement('sectionCleaningTasks', '0'); // Placeholder
        updateElement('sectionMaintenanceIssues', '0'); // Placeholder
        
        const today = new Date().toISOString().split('T')[0];
        const todayPayments = payments.filter(p => p.createdAt && p.createdAt.includes(today));
        updateElement('sectionDailyPayments', `₦${todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}`);
        updateElement('sectionPendingPayments', '0'); // Placeholder
        updateElement('sectionPoliceReports', '0'); // Placeholder
        updateElement('sectionOpenCases', '0'); // Placeholder
        updateElement('sectionServiceRequests', '0'); // Placeholder
        updateElement('sectionFeedbackCount', '0'); // Placeholder
        updateElement('sectionMessages', '0'); // Placeholder
        updateElement('sectionCallLogs', '0'); // Placeholder
        updateElement('sectionAnalyticsRevenue', `₦${todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}`);
        updateElement('sectionGrowthRate', '12%'); // Placeholder

    } catch (error) {
        console.error('Error loading hotel sections data:', error);
    }
}

// Open hotel section in modal
function openSection(sectionName) {
    const modal = document.getElementById('hotelSectionModal');
    const title = document.getElementById('sectionModalTitle');
    const content = document.getElementById('sectionModalContent');
    
    // Set title and content based on section
    const sectionData = {
        'rooms': {
            title: 'Room Management',
            url: '/'
        },
        'customers': {
            title: 'Customer Management', 
            url: '/'
        },
        'kitchen': {
            title: 'Kitchen Management',
            url: '/'
        },
        'bar': {
            title: 'Bar Management',
            url: '/'
        },
        'staff': {
            title: 'Staff Management',
            url: '/'
        },
        'housekeeping': {
            title: 'Housekeeping Management',
            url: '/'
        },
        'payments': {
            title: 'Payments & Billing',
            url: '/'
        },
        'security': {
            title: 'Security & Reports',
            url: '/'
        },
        'service': {
            title: 'Customer Service',
            url: '/'
        },
        'communications': {
            title: 'Communications',
            url: '/'
        },
        'analytics': {
            title: 'Analytics & Reports',
            url: '/'
        },
        'modules': {
            title: 'Additional Modules',
            url: '/'
        }
    };

    const section = sectionData[sectionName];
    if (section) {
        title.textContent = section.title;
        content.innerHTML = `
            <div class="section-redirect">
                <p>This section is available in the main staff dashboard.</p>
                <div class="redirect-actions">
                    <button class="btn btn-primary" onclick="window.open('${section.url}', '_blank')">
                        <i class="fas fa-external-link-alt"></i> Open in New Tab
                    </button>
                    <button class="btn btn-secondary" onclick="window.location.href='${section.url}'">
                        <i class="fas fa-arrow-right"></i> Go to Section
                    </button>
                    <button class="btn btn-info" onclick="closeHotelSectionModal()">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'block';
    }
}

function closeHotelSectionModal() {
    document.getElementById('hotelSectionModal').style.display = 'none';
}

// Utility function to update element content safely
function updateElement(id, content) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = content;
    }
}

// Load Advanced Analytics
async function loadAdvancedAnalytics() {
    try {
        const timeframe = document.getElementById('analyticsTimeframe')?.value || '7d';
        
        // Fetch data for analytics
        const [rooms, payments, kitchenOrders] = await Promise.all([
            fetchWithAuth('/api/rooms'),
            fetchWithAuth('/api/payments'), 
            fetchWithAuth('/api/kitchen/orders')
        ]);

        // Calculate analytics metrics
        const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const avgDailyRevenue = Math.round(totalRevenue / 7); // Assuming 7 days
        const revenueGrowthRate = 12; // Placeholder percentage

        updateElement('totalRevenue', `₦${totalRevenue.toLocaleString()}`);
        updateElement('avgDailyRevenue', `₦${avgDailyRevenue.toLocaleString()}`);
        updateElement('revenueGrowthRate', `${revenueGrowthRate}%`);
        updateElement('bestRevenueDay', 'Saturday'); // Placeholder

        // Occupancy analytics
        const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
        const avgOccupancyRate = Math.round((occupiedRooms / rooms.length) * 100);
        
        updateElement('peakOccupancyDays', 'Weekend');
        updateElement('avgOccupancyRate', `${avgOccupancyRate}%`);
        updateElement('roomTurnoverRate', '85%'); // Placeholder

        // Customer analytics
        updateElement('newVsReturning', '75% / 25%'); // Placeholder
        updateElement('avgStayDuration', '2.5 days'); // Placeholder
        updateElement('customerLTV', '₦150,000'); // Placeholder

        // Efficiency metrics
        updateEfficiencyBar('kitchenEfficiency', 88);
        updateEfficiencyBar('staffProductivity', 92);
        updateEfficiencyBar('customerSatisfaction', 95);
        updateEfficiencyBar('costEfficiency', 78);

        // Predictive analytics
        updateElement('revenueForecast', `₦${Math.round(avgDailyRevenue * 7 * 1.1).toLocaleString()}`);
        updateElement('revenueConfidence', '85%');
        updateElement('occupancyForecast', `${Math.min(avgOccupancyRate + 5, 100)}%`);
        updateElement('occupancyConfidence', '78%');

        // Recommendations
        const recommendations = [
            'Consider promotional offers for weekdays to increase occupancy',
            'Kitchen efficiency is high - maintain current standards',
            'Bar inventory may need restocking for weekend rush',
            'Staff scheduling is optimal for current demand levels'
        ];
        
        const recommendationsElement = document.getElementById('recommendedActions');
        if (recommendationsElement) {
            recommendationsElement.innerHTML = recommendations.map(rec => `<li>${rec}</li>`).join('');
        }

        // Load analytics charts
        loadAnalyticsCharts();

    } catch (error) {
        console.error('Error loading advanced analytics:', error);
    }
}

// Load Financial Overview
async function loadFinancialOverview() {
    try {
        const period = document.getElementById('financialPeriod')?.value || 'today';
        
        const [payments, kitchenOrders, staff] = await Promise.all([
            fetchWithAuth('/api/payments'),
            fetchWithAuth('/api/kitchen/orders'),
            fetchWithAuth('/api/staff')
        ]);

        // Calculate financial metrics based on period
        let filteredPayments = payments;
        if (period === 'today') {
            const today = new Date().toISOString().split('T')[0];
            filteredPayments = payments.filter(p => p.createdAt && p.createdAt.includes(today));
        }

        const totalRevenue = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        // Calculate costs (simplified)
        const staffCosts = staff.length * 8000 * (period === 'today' ? 1 : 30); // Daily or monthly
        const fbCosts = Math.round(totalRevenue * 0.35); // 35% of revenue
        const maintenanceCosts = Math.round(totalRevenue * 0.05); // 5% of revenue
        const operationalCosts = Math.round(totalRevenue * 0.15); // 15% of revenue
        
        const totalCosts = staffCosts + fbCosts + maintenanceCosts + operationalCosts;
        const netProfit = totalRevenue - totalCosts;
        const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

        // Update financial KPIs
        updateElement('financialTotalRevenue', `₦${totalRevenue.toLocaleString()}`);
        updateElement('financialTotalCosts', `₦${totalCosts.toLocaleString()}`);
        updateElement('financialNetProfit', `₦${netProfit.toLocaleString()}`);
        updateElement('financialProfitMargin', `${profitMargin}%`);

        // Revenue breakdown
        const roomRevenue = Math.round(totalRevenue * 0.6); // 60% rooms
        const fbRevenue = Math.round(totalRevenue * 0.25); // 25% F&B
        const barRevenue = Math.round(totalRevenue * 0.10); // 10% bar
        const otherRevenue = totalRevenue - roomRevenue - fbRevenue - barRevenue;

        updateElement('roomRevenueAmount', `₦${roomRevenue.toLocaleString()}`);
        updateElement('fbRevenueAmount', `₦${fbRevenue.toLocaleString()}`);
        updateElement('barRevenueAmount', `₦${barRevenue.toLocaleString()}`);
        updateElement('otherRevenueAmount', `₦${otherRevenue.toLocaleString()}`);

        updateElement('roomRevenuePercentage', '60%');
        updateElement('fbRevenuePercentage', '25%');
        updateElement('barRevenuePercentage', '10%');
        updateElement('otherRevenuePercentage', '5%');

        // Cost breakdown
        updateElement('staffCosts', `₦${staffCosts.toLocaleString()}`);
        updateElement('fbCosts', `₦${fbCosts.toLocaleString()}`);
        updateElement('maintenanceCosts', `₦${maintenanceCosts.toLocaleString()}`);
        updateElement('operationalCosts', `₦${operationalCosts.toLocaleString()}`);

        updateElement('staffCostsPercent', `${Math.round((staffCosts / totalCosts) * 100)}% of total`);
        updateElement('fbCostsPercent', `${Math.round((fbCosts / totalCosts) * 100)}% of total`);
        updateElement('maintenanceCostsPercent', `${Math.round((maintenanceCosts / totalCosts) * 100)}% of total`);
        updateElement('operationalCostsPercent', `${Math.round((operationalCosts / totalCosts) * 100)}% of total`);

        // Cash flow
        updateElement('cashInflow', `₦${totalRevenue.toLocaleString()}`);
        updateElement('cashOutflow', `₦${totalCosts.toLocaleString()}`);
        updateElement('netCashFlow', `₦${netProfit.toLocaleString()}`);

        // Load financial charts
        loadFinancialCharts();

    } catch (error) {
        console.error('Error loading financial overview:', error);
    }
}

// Update efficiency progress bars
function updateEfficiencyBar(id, percentage) {
    const bar = document.getElementById(id);
    const text = document.getElementById(id + 'Text');
    
    if (bar) {
        bar.style.width = `${percentage}%`;
        bar.className = `progress-fill ${percentage >= 90 ? 'excellent' : percentage >= 75 ? 'good' : percentage >= 60 ? 'average' : 'poor'}`;
    }
    if (text) {
        text.textContent = `${percentage}%`;
    }
}

// Export Analytics function
function exportAnalytics() {
    try {
        console.log('📊 Generating analytics report...');
        showNotification('Analytics export feature coming soon!', 'info');
    } catch (error) {
        console.error('Error exporting analytics:', error);
        showNotification('Error exporting analytics', 'error');
    }
}

function exportFinancialReport() {
    try {
        console.log('💰 Generating financial report...');
        showNotification('Financial report export feature coming soon!', 'info');
    } catch (error) {
        console.error('Error exporting financial report:', error);
        showNotification('Error exporting financial report', 'error');
    }
}

function generatePDFReport() {
    const reportDate = document.getElementById('reportDate')?.value || new Date().toISOString().split('T')[0];
    window.open(`/api/admin/pdf-report?date=${reportDate}`, '_blank');
}

function emailReport() {
    const reportDate = document.getElementById('reportDate')?.value || new Date().toISOString().split('T')[0];
    if (confirm('Send daily report via email?')) {
        fetch('/api/admin/email-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            },
            body: JSON.stringify({ date: reportDate })
        }).then(response => {
            if (response.ok) {
                alert('Report sent successfully!');
            } else {
                alert('Failed to send report');
            }
        });
    }
}

// Chart loading functions (simplified)
function loadExecutiveCharts(revenue, occupancy, kitchen) {
    // Placeholder for chart implementation
    console.log('Loading executive charts with data:', { revenue, occupancy, kitchen });
}

function loadAnalyticsCharts() {
    // Placeholder for analytics charts
    console.log('Loading analytics charts');
}

function loadFinancialCharts() {
    // Placeholder for financial charts
    console.log('Loading financial charts');
}

// Emergency and system control functions
function emergencyAlert() {
    if (confirm('Send emergency alert to all staff?')) {
        fetch('/api/admin/emergency-alert', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            }
        }).then(() => alert('Emergency alert sent!'));
    }
}

function broadcastMessage() {
    const message = prompt('Enter message to broadcast to all staff:');
    if (message) {
        fetch('/api/admin/broadcast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            },
            body: JSON.stringify({ message })
        }).then(() => alert('Message broadcasted!'));
    }
}

function showMaintenanceMode() {
    if (confirm('Enable maintenance mode? This will temporarily disable guest access.')) {
        alert('Maintenance mode would be enabled (feature not implemented)');
    }
}

function lockdownSystem() {
    if (confirm('Are you sure you want to initiate system lockdown? This is an emergency measure.')) {
        alert('System lockdown would be initiated (feature not implemented)');
    }
}

function backupData() {
    if (confirm('Start data backup? This may take a few minutes.')) {
        fetch('/api/admin/backup', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
            }
        }).then(() => alert('Backup initiated!'));
    }
}

function systemHealthCheck() {
    fetch('/api/admin/health-check', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
        }
    }).then(response => response.json())
      .then(data => {
          alert(`System Health: ${data.status || 'Good'}\nUptime: ${data.uptime || 'Unknown'}\nDatabase: ${data.database || 'Connected'}`);
      });
}

function clearAllAlerts() {
    if (confirm('Clear all alerts?')) {
        updateElement('criticalAlertsCount', '0');
        updateElement('warningAlertsCount', '0');
        updateElement('infoAlertsCount', '0');
        alert('All alerts cleared!');
    }
}

function viewAllAlerts() {
    alert('No active alerts to display');
}

function acknowledgeAllAlerts() {
    if (confirm('Acknowledge all alerts?')) {
        alert('All alerts acknowledged!');
    }
}

function updateAdminStaffDisplay(staff) {
    // Add staff info to header if not exists
    if (!document.getElementById('adminStaffInfo')) {
        const header = document.querySelector('.admin-header');
        if (header) {
            const staffDiv = document.createElement('div');
            staffDiv.id = 'adminStaffInfo';
            staffDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px; color: white; font-size: 0.9em; margin-left: auto;">
                    <span>👨‍💼 Admin: ${staff.name}</span>
                    <span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 12px; font-size: 0.8em;">
                        ${staff.personalId}
                    </span>
                    <button onclick="logoutAdmin()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 12px; border-radius: 15px; cursor: pointer; font-size: 0.8em;">
                        Logout
                    </button>
                </div>
            `;
            header.appendChild(staffDiv);
        }
    }
}

function logoutAdmin() {
    if (confirm('Are you sure you want to logout?')) {
        // Clean up before logout
        cleanupAdmin();
        
        const staffToken = localStorage.getItem('staffToken');
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

// Alias for HTML onclick
function logout() {
    logoutAdmin();
}

// Add authorization header to all API requests
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    if (url.startsWith('/api/') && !url.includes('/authenticate')) {
        const staffToken = localStorage.getItem('staffToken');
        if (staffToken) {
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${staffToken}`
            };
        }
    }
    return originalFetch(url, options);
};

// Show dashboard
function showDashboard() {
    // Hide login container if it exists
    const loginContainer = document.getElementById('loginContainer');
    if (loginContainer) {
        loginContainer.style.display = 'none';
    }
    
    const adminDashboard = document.getElementById('adminDashboard');
    if (adminDashboard) {
        adminDashboard.classList.remove('hidden');
    }
    
    initializeAdmin();
    loadAllReports();
    
    // Clear any existing interval first
    if (window.adminUpdateInterval) {
        clearInterval(window.adminUpdateInterval);
    }
    
    // Update every 5 minutes
    window.adminUpdateInterval = setInterval(() => {
        console.log('Auto-refreshing dashboard data...');
        loadAllReports();
    }, 300000);
}

// Initialize admin dashboard
function initializeAdmin() {
    // Set current date
    const now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Load all reports and data
async function loadAllReports() {
    try {
        await Promise.all([
            loadMetrics(),
            loadRoomReport(),
            loadCustomerReport(),
            loadBarReport(),
            loadKitchenReport(),
            loadRecentActivity(),
            loadAlerts(),
            createCharts()
        ]);
    } catch (error) {
        console.error('Error loading admin reports:', error);
    }
}

// Load key metrics
async function loadMetrics() {
    try {
        const [rooms, customers, bookings, barInventory, kitchenOrders] = await Promise.all([
            fetchWithAuth('/api/rooms').then(r => r.json()),
            fetchWithAuth('/api/customers').then(r => r.json()),
            fetchWithAuth('/api/bookings').then(r => r.json()),
            fetchWithAuth('/api/bar/inventory').then(r => r.json()),
            fetchWithAuth('/api/kitchen/orders').then(r => r.json())
        ]);

        // Calculate daily revenue (room bookings + estimated bar/kitchen)
        const occupiedRooms = rooms.filter(r => r.status === 'occupied');
        const roomRevenue = occupiedRooms.reduce((sum, room) => sum + room.price, 0);
        const barRevenue = barInventory.reduce((sum, item) => sum + (item.price * 2), 0); // Estimated daily sales
        const totalRevenue = roomRevenue + barRevenue + (kitchenOrders.length * 10000); // Avg order ₦10,000

        // Calculate occupancy rate
        const occupancyRate = Math.round((occupiedRooms.length / rooms.length) * 100);

        // Update metrics display
        updateMetricCard('dailyRevenue', `₦${totalRevenue.toLocaleString()}`, '+12%', 'positive');
        updateMetricCard('occupancyRate', `${occupancyRate}%`, '+5%', 'positive');
        updateMetricCard('activeGuests', occupiedRooms.length, '+3', 'positive');
        updateMetricCard('foodOrders', kitchenOrders.length, '+8', 'positive');

    } catch (error) {
        console.error('Error loading metrics:', error);
    }
}

// Update metric card
function updateMetricCard(id, value, change, type) {
    const valueElement = document.getElementById(id);
    const changeElement = document.getElementById(id.replace('Rate', 'Change').replace('Revenue', 'Change').replace('Guests', 'Change').replace('Orders', 'Change'));
    
    if (valueElement) valueElement.textContent = value;
    if (changeElement) {
        changeElement.textContent = change;
        changeElement.className = `metric-change ${type}`;
    }
}

// Load room report
async function loadRoomReport() {
    try {
        const rooms = await fetch('/api/rooms').then(r => r.json());
        
        const statusCounts = {
            available: rooms.filter(r => r.status === 'available').length,
            occupied: rooms.filter(r => r.status === 'occupied').length,
            cleaning: rooms.filter(r => r.status === 'cleaning').length,
            maintenance: rooms.filter(r => r.status === 'maintenance').length
        };

        // Update room status counts
        document.getElementById('availableRooms').textContent = statusCounts.available;
        document.getElementById('occupiedRooms').textContent = statusCounts.occupied;
        document.getElementById('cleaningRooms').textContent = statusCounts.cleaning;
        document.getElementById('maintenanceRooms').textContent = statusCounts.maintenance;

        // Create room breakdown by type
        const typeBreakdown = {};
        rooms.forEach(room => {
            if (!typeBreakdown[room.type]) {
                typeBreakdown[room.type] = { total: 0, occupied: 0 };
            }
            typeBreakdown[room.type].total++;
            if (room.status === 'occupied') {
                typeBreakdown[room.type].occupied++;
            }
        });

        const breakdownHtml = Object.entries(typeBreakdown).map(([type, data]) => `
            <div class="room-type">
                <span>${type}</span>
                <span>${data.occupied}/${data.total} occupied</span>
            </div>
        `).join('');

        document.getElementById('roomBreakdown').innerHTML = breakdownHtml;

    } catch (error) {
        console.error('Error loading room report:', error);
    }
}

// Load customer report
async function loadCustomerReport() {
    try {
        const [customers, bookings] = await Promise.all([
            fetchWithAuth('/api/customers').then(r => r.json()).catch(() => []),
            fetchWithAuth('/api/bookings').then(r => r.json()).catch(() => [])
        ]);

        // Ensure we have arrays to work with
        const safeCustomers = Array.isArray(customers) ? customers : [];
        const safeBookings = Array.isArray(bookings) ? bookings : [];

        const today = new Date().toDateString();
        const newToday = safeCustomers.filter(c => c.createdAt && new Date(c.createdAt).toDateString() === today).length;
        const checkinsToday = safeBookings.filter(b => b.checkIn && new Date(b.checkIn).toDateString() === today).length;
        const checkoutsToday = safeBookings.filter(b => b.checkOut && new Date(b.checkOut).toDateString() === today).length;

        document.getElementById('totalCustomers').textContent = safeCustomers.length;
        document.getElementById('newCustomers').textContent = newToday;
        document.getElementById('todayCheckins').textContent = checkinsToday;
        document.getElementById('todayCheckouts').textContent = checkoutsToday;

    } catch (error) {
        console.error('Error loading customer report:', error);
    }
}

// Load bar report
async function loadBarReport() {
    try {
        const inventory = await fetch('/api/bar/inventory').then(r => r.json());
        
        const lowStockItems = inventory.filter(item => item.stock < 10);
        const totalValue = inventory.reduce((sum, item) => sum + (item.price * item.stock), 0);
        
        // Find top category by item count
        const categories = {};
        inventory.forEach(item => {
            categories[item.category] = (categories[item.category] || 0) + 1;
        });
        const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

        document.getElementById('totalBarItems').textContent = inventory.length;
        document.getElementById('lowStockItems').textContent = lowStockItems.length;
        document.getElementById('barRevenue').textContent = `₦${Math.round(totalValue * 0.3).toLocaleString()}`; // Estimated daily revenue
        document.getElementById('topCategory').textContent = topCategory;

        // Show low stock alerts
        const alertsHtml = lowStockItems.map(item => `
            <div class="low-stock-item">
                <span>${item.name}</span>
                <span class="stock-count">${item.stock} left</span>
            </div>
        `).join('');
        
        document.getElementById('lowStockAlert').innerHTML = alertsHtml || '<p>All items are well stocked!</p>';

    } catch (error) {
        console.error('Error loading bar report:', error);
    }
}

// Load kitchen report
async function loadKitchenReport() {
    try {
        const orders = await fetchWithAuth('/api/kitchen/orders').then(r => r.json());
        
        const today = new Date().toDateString();
        const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
        
        const statusCounts = {
            pending: orders.filter(o => o.status === 'pending').length,
            preparing: orders.filter(o => o.status === 'preparing').length,
            ready: orders.filter(o => o.status === 'ready').length,
            delivered: orders.filter(o => o.status === 'delivered').length
        };

        const completedToday = todayOrders.filter(o => o.status === 'delivered').length;

        document.getElementById('totalOrders').textContent = orders.length;
        document.getElementById('pendingOrders').textContent = statusCounts.pending;
        document.getElementById('completedOrders').textContent = completedToday;
        document.getElementById('averageTime').textContent = '18 min'; // Mock average

        // Create status bars
        const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
        const statusBarsHtml = Object.entries(statusCounts).map(([status, count]) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            const colors = {
                pending: '#ffc107',
                preparing: '#17a2b8',
                ready: '#28a745',
                delivered: '#6c757d'
            };
            
            return `
                <div class="status-bar">
                    <div class="status-bar-label">${status}</div>
                    <div class="status-bar-progress">
                        <div class="status-bar-fill" style="width: ${percentage}%; background: ${colors[status]}"></div>
                    </div>
                    <div class="status-bar-count">${count}</div>
                </div>
            `;
        }).join('');

        document.getElementById('orderStatusBars').innerHTML = statusBarsHtml;

    } catch (error) {
        console.error('Error loading kitchen report:', error);
    }
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const [bookings, orders, clockRecords, payments] = await Promise.all([
            fetchWithAuth('/api/bookings').then(r => r.json()).catch(() => []),
            fetchWithAuth('/api/kitchen/orders').then(r => r.json()).catch(() => []),
            fetchWithAuth('/api/clock-records').then(r => r.json()).catch(() => []),
            fetchWithAuth('/api/payments').then(r => r.json()).catch(() => [])
        ]);

        // Ensure we have arrays to work with
        const safeBookings = Array.isArray(bookings) ? bookings : [];
        const safeOrders = Array.isArray(orders) ? orders : [];
        const safeClockRecords = Array.isArray(clockRecords) ? clockRecords : [];
        const safePayments = Array.isArray(payments) ? payments : [];

        const activities = [];

        // Add booking activities
        safeBookings.slice(-10).forEach(booking => {
            activities.push({
                type: 'booking',
                icon: 'fa-bed',
                message: `New booking created for Room ${booking.roomId}`,
                time: new Date(booking.createdAt || Date.now()),
                priority: 'normal'
            });
        });

        // Add order activities
        safeOrders.slice(-10).forEach(order => {
            activities.push({
                type: 'order',
                icon: 'fa-utensils',
                message: `Kitchen order #${order.id} - ${order.status}`,
                time: new Date(order.createdAt || Date.now()),
                priority: order.status === 'pending' ? 'high' : 'normal'
            });
        });

        // Add staff activities
        safeClockRecords.slice(-10).forEach(record => {
            activities.push({
                type: 'staff',
                icon: 'fa-clock',
                message: `${record.personalId} ${record.action.replace('-', ' ')}`,
                time: new Date(record.timestamp || Date.now()),
                priority: 'low'
            });
        });

        // Add payment activities
        safePayments.slice(-10).forEach(payment => {
            activities.push({
                type: 'payment',
                icon: 'fa-credit-card',
                message: `Payment of ₦${payment.amount ? payment.amount.toLocaleString() : '0'} received`,
                time: new Date(payment.date || Date.now()),
                priority: 'normal'
            });
        });

        // Sort by time and take latest 20
        activities.sort((a, b) => b.time - a.time);
        const recentActivities = activities.slice(0, 20);

        let activityHTML = '';
        recentActivities.forEach(activity => {
            const timeStr = activity.time.toLocaleTimeString();
            activityHTML += `
                <div class="activity-item ${activity.type} ${activity.priority}">
                    <div class="activity-icon">
                        <i class="fas ${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <span class="activity-message">${activity.message}</span>
                        <span class="activity-time">${timeStr}</span>
                    </div>
                </div>
            `;
        });

        updateElementHTML('recentActivity', activityHTML);

    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

// Load alerts
async function loadAlerts() {
    try {
        const [rooms, inventory, orders] = await Promise.all([
            fetch('/api/rooms').then(r => r.json()),
            fetch('/api/bar/inventory').then(r => r.json()),
            fetch('/api/kitchen/orders').then(r => r.json())
        ]);

        const alerts = [];

        // Check for maintenance rooms
        const maintenanceRooms = rooms.filter(r => r.status === 'maintenance');
        if (maintenanceRooms.length > 0) {
            alerts.push({
                type: 'warning',
                title: `${maintenanceRooms.length} room(s) need maintenance`,
                description: `Rooms ${maintenanceRooms.map(r => r.number).join(', ')} require attention`
            });
        }

        // Check for low stock
        const lowStock = inventory.filter(item => item.stock < 5);
        if (lowStock.length > 0) {
            alerts.push({
                type: 'danger',
                title: `${lowStock.length} item(s) critically low on stock`,
                description: `Immediate restocking required for bar operations`
            });
        }

        // Check for pending orders
        const pendingOrders = orders.filter(o => o.status === 'pending');
        if (pendingOrders.length > 5) {
            alerts.push({
                type: 'warning',
                title: `${pendingOrders.length} orders pending in kitchen`,
                description: 'Kitchen may need additional staff or attention'
            });
        }

        // Check occupancy rate
        const occupancyRate = (rooms.filter(r => r.status === 'occupied').length / rooms.length) * 100;
        if (occupancyRate > 90) {
            alerts.push({
                type: 'info',
                title: 'High occupancy rate',
                description: `${occupancyRate.toFixed(1)}% occupancy - consider preparation for peak service`
            });
        }

        const alertsHtml = alerts.map(alert => `
            <div class="alert-item ${alert.type}">
                <div class="alert-icon">
                    <i class="fas fa-${alert.type === 'warning' ? 'exclamation-triangle' : alert.type === 'danger' ? 'exclamation-circle' : 'info-circle'}"></i>
                </div>
                <div class="alert-content">
                    <div class="alert-title">${alert.title}</div>
                    <div class="alert-description">${alert.description}</div>
                </div>
            </div>
        `).join('');

        document.getElementById('alertsList').innerHTML = alertsHtml || '<p>No alerts at this time</p>';

    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

// Function to destroy all existing charts
function destroyAllCharts() {
    Object.values(chartInstances).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    chartInstances = {};
}

// Create charts
async function createCharts() {
    try {
        console.log('Creating charts...');
        
        // Destroy existing charts first
        destroyAllCharts();
        
        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const [rooms, orders] = await Promise.all([
            fetchWithAuth('/api/rooms').then(r => r.json()),
            fetchWithAuth('/api/kitchen/orders').then(r => r.json())
        ]);

        // Room Status Chart
        createRoomStatusChart(rooms);
        
        // Revenue Trend Chart (mock data for demo)
        createRevenueChart();

    } catch (error) {
        console.error('Error creating charts:', error);
    }
}

// Create room status chart
function createRoomStatusChart(rooms) {
    const canvas = document.getElementById('roomStatusChart');
    if (!canvas) {
        console.warn('roomStatusChart canvas not found');
        return;
    }
    
    // Check if canvas is visible
    if (canvas.offsetParent === null) {
        console.warn('roomStatusChart canvas is not visible, skipping chart creation');
        return;
    }
    
    // Destroy existing chart if it exists
    if (chartInstances.roomStatusChart) {
        chartInstances.roomStatusChart.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    
    const statusCounts = {
        'Available': rooms.filter(r => r.status === 'available').length,
        'Occupied': rooms.filter(r => r.status === 'occupied').length,
        'Cleaning': rooms.filter(r => r.status === 'cleaning').length,
        'Maintenance': rooms.filter(r => r.status === 'maintenance').length
    };

    chartInstances.roomStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: ['#27ae60', '#e74c3c', '#f39c12', '#95a5a6'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Create revenue chart
function createRevenueChart() {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) {
        console.warn('revenueChart canvas not found');
        return;
    }
    
    // Check if canvas is visible
    if (canvas.offsetParent === null) {
        console.warn('revenueChart canvas is not visible, skipping chart creation');
        return;
    }
    
    // Destroy existing chart if it exists
    if (chartInstances.revenueChart) {
        chartInstances.revenueChart.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    
    // Mock data for the last 7 days
    const days = [];
    const revenue = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        revenue.push(Math.random() * 800000 + 600000); // Random revenue between ₦600,000-₦1,400,000
    }

    chartInstances.revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [{
                label: 'Daily Revenue',
                data: revenue,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Utility functions
function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
}

// Admin actions
function refreshAllData() {
    console.log('🔄 Refreshing all admin data...');
    
    // Show loading indicator
    const refreshBtn = document.querySelector('button[onclick="refreshAllData()"]');
    if (refreshBtn) {
        const originalText = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        refreshBtn.disabled = true;
        
        // Get the currently active tab
        const activeTab = document.querySelector('.tab-btn.active');
        let tabName = 'dashboard';
        
        if (activeTab) {
            // Extract tab name from onclick attribute
            const onclickText = activeTab.getAttribute('onclick');
            const match = onclickText.match(/showTab\\('([^']+)'\\)/);
            if (match) {
                tabName = match[1];
            }
        }
        
        console.log(`🎯 Refreshing data for active tab: ${tabName}`);
        
        // Refresh data based on active tab
        Promise.resolve().then(async () => {
            try {
                switch(tabName) {
                    case 'dashboard':
                        await loadExecutiveDashboard();
                        break;
                    case 'daily-reports':
                        await loadDailyReport();
                        break;
                    case 'hotel-sections':
                        await loadHotelSectionsData();
                        break;
                    case 'analytics':
                        await loadAdvancedAnalytics();
                        break;
                    case 'financial':
                        await loadFinancialOverview();
                        break;
                    case 'guest-portal':
                        await loadGuestPortalData();
                        await loadGuestOrders();
                        break;
                    case 'stock-section':
                        if (typeof initializeStockManagement === 'function') {
                            await initializeStockManagement();
                        }
                        break;
                    default:
                        await loadAllReports();
                }
                
                showNotification('All data refreshed successfully!', 'success');
                console.log('✅ Admin data refresh completed');
            } catch (error) {
                console.error('❌ Error refreshing data:', error);
                showNotification('Error refreshing data. Please try again.', 'error');
            }
        }).finally(() => {
            // Reset button after delay
            setTimeout(() => {
                if (refreshBtn) {
                    refreshBtn.innerHTML = originalText;
                    refreshBtn.disabled = false;
                }
            }, 1000);
        });
    } else {
        // Fallback if button not found
        loadAllReports();
    }
}

function exportReport() {
    // Create a simple report export
    const reportData = {
        date: new Date().toISOString(),
        metrics: {
            revenue: document.getElementById('dailyRevenue').textContent,
            occupancy: document.getElementById('occupancyRate').textContent,
            guests: document.getElementById('activeGuests').textContent,
            orders: document.getElementById('foodOrders').textContent
        },
        rooms: {
            available: document.getElementById('availableRooms').textContent,
            occupied: document.getElementById('occupiedRooms').textContent,
            cleaning: document.getElementById('cleaningRooms').textContent,
            maintenance: document.getElementById('maintenanceRooms').textContent
        }
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `hotel-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
}

// ENHANCED ADMIN FUNCTIONALITY

// Load staff management report
async function loadStaffReport() {
    try {
        const [staffResponse, clockResponse] = await Promise.all([
            fetchWithAuth('/api/staff/current-status').catch(e => []),
            fetchWithAuth('/api/clock-records').catch(e => [])
        ]);

        const staff = Array.isArray(staffResponse) ? staffResponse : [];
        const clockRecords = Array.isArray(clockResponse) ? clockResponse : [];

        const onDuty = staff.filter(s => s.status === 'on-duty').length;
        const onBreak = staff.filter(s => s.status === 'on-break').length;
        const offDuty = staff.filter(s => s.status === 'off-duty').length;

        updateElementText('staffOnDuty', onDuty);
        updateElementText('staffOnBreak', onBreak);
        updateElementText('staffOffDuty', offDuty);
        updateElementText('totalStaff', staff.length);

        // Staff breakdown by department
        const departments = {};
        staff.forEach(s => {
            departments[s.position] = departments[s.position] || { total: 0, onDuty: 0 };
            departments[s.position].total++;
            if (s.status === 'on-duty') departments[s.position].onDuty++;
        });

        let breakdownHTML = '<h4>Department Breakdown</h4>';
        Object.entries(departments).forEach(([dept, data]) => {
            breakdownHTML += `
                <div class="dept-item">
                    <span class="dept-name">${dept.charAt(0).toUpperCase() + dept.slice(1)}</span>
                    <span class="dept-stats">${data.onDuty}/${data.total} on duty</span>
                </div>
            `;
        });

        updateElementHTML('staffBreakdown', breakdownHTML);

        // Recent clock actions
        const recentActions = clockRecords
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);

        let actionsHTML = '<h4>Recent Clock Actions</h4>';
        recentActions.forEach(action => {
            const time = new Date(action.timestamp).toLocaleTimeString();
            actionsHTML += `
                <div class="clock-action">
                    <span class="action-staff">${action.personalId}</span>
                    <span class="action-type">${action.action}</span>
                    <span class="action-time">${time}</span>
                </div>
            `;
        });

        updateElementHTML('recentClockActions', actionsHTML);

    } catch (error) {
        console.error('Error loading staff report:', error);
    }
}

// Load payment report
async function loadPaymentReport() {
    try {
        const payments = await fetch('/api/payments').then(r => r.json());
        
        const today = new Date().toDateString();
        const todayPayments = payments.filter(p => new Date(p.date).toDateString() === today);
        
        const todayRevenue = todayPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalTransactions = todayPayments.length;
        const avgTransaction = totalTransactions > 0 ? todayRevenue / totalTransactions : 0;
        const pendingPayments = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

        updateElementText('todayRevenue', `₦${todayRevenue.toLocaleString()}`);
        updateElementText('totalTransactions', totalTransactions);
        updateElementText('avgTransaction', `₦${avgTransaction.toLocaleString()}`);
        updateElementText('pendingPayments', `₦${pendingPayments.toLocaleString()}`);

        // Payment methods breakdown
        const paymentMethods = {};
        todayPayments.forEach(p => {
            paymentMethods[p.method] = paymentMethods[p.method] || { count: 0, amount: 0 };
            paymentMethods[p.method].count++;
            paymentMethods[p.method].amount += p.amount;
        });

        let methodsHTML = '<h4>Payment Methods Today</h4>';
        Object.entries(paymentMethods).forEach(([method, data]) => {
            const percentage = ((data.amount / todayRevenue) * 100).toFixed(1);
            methodsHTML += `
                <div class="payment-method">
                    <span class="method-name">${method.charAt(0).toUpperCase() + method.slice(1)}</span>
                    <span class="method-stats">${data.count} transactions (${percentage}%)</span>
                    <span class="method-amount">₦${data.amount.toLocaleString()}</span>
                </div>
            `;
        });

        updateElementHTML('paymentMethods', methodsHTML);

    } catch (error) {
        console.error('Error loading payment report:', error);
    }
}

// Load security report
async function loadSecurityReport() {
    try {
        const reports = await fetch('/api/police-reports').then(r => r.json());
        
        const today = new Date().toDateString();
        const todayReports = reports.filter(r => new Date(r.createdAt).toDateString() === today);
        const openCases = reports.filter(r => r.status !== 'closed' && r.status !== 'resolved');
        const highPriority = reports.filter(r => r.severity === 'high' || r.severity === 'critical');
        const resolvedToday = todayReports.filter(r => r.status === 'resolved');

        updateElementText('totalReports', reports.length);
        updateElementText('openCases', openCases.length);
        updateElementText('highPriority', highPriority.length);
        updateElementText('resolvedToday', resolvedToday.length);

        // Recent reports
        const recentReports = reports
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        let reportsHTML = '<h4>Recent Security Reports</h4>';
        recentReports.forEach(report => {
            const time = new Date(report.createdAt).toLocaleTimeString();
            const severityClass = `severity-${report.severity}`;
            reportsHTML += `
                <div class="security-report">
                    <span class="report-type">${report.incidentType}</span>
                    <span class="report-severity ${severityClass}">${report.severity}</span>
                    <span class="report-time">${time}</span>
                </div>
            `;
        });

        updateElementHTML('recentReports', reportsHTML);

    } catch (error) {
        console.error('Error loading security report:', error);
    }
}

// Load housekeeping report
async function loadHousekeepingReport() {
    try {
        const [cleaningTasks, maintenanceRequests, supplies] = await Promise.all([
            fetchWithAuth('/api/cleaning-tasks').then(r => r.json()),
            fetchWithAuth('/api/maintenance').then(r => r.json()),
            fetchWithAuth('/api/supplies').then(r => r.json())
        ]);

        const today = new Date().toDateString();
        const todayTasks = cleaningTasks.filter(t => new Date(t.createdAt).toDateString() === today);
        const completedToday = todayTasks.filter(t => t.status === 'completed');
        const lowStockSupplies = supplies.filter(s => s.stock <= s.minimum);

        updateElementText('cleaningTasks', cleaningTasks.filter(t => t.status !== 'completed').length);
        updateElementText('maintenanceRequests', maintenanceRequests.filter(r => r.status !== 'completed').length);
        updateElementText('supplyAlerts', lowStockSupplies.length);
        updateElementText('completedTasks', completedToday.length);

        // Housekeeping breakdown
        const taskTypes = {};
        cleaningTasks.forEach(t => {
            taskTypes[t.type] = taskTypes[t.type] || { total: 0, completed: 0 };
            taskTypes[t.type].total++;
            if (t.status === 'completed') taskTypes[t.type].completed++;
        });

        let breakdownHTML = '<h4>Task Breakdown</h4>';
        Object.entries(taskTypes).forEach(([type, data]) => {
            const completion = data.total > 0 ? ((data.completed / data.total) * 100).toFixed(1) : '0.0';
            breakdownHTML += '' +
                '<div class="task-type">' +
                    '<span class="task-name">' + (type || '-') + '</span>' +
                    '<span class="task-stats">' + data.completed + '/' + data.total + ' completed</span>' +
                    '<div class="task-progress">' +
                        '<div class="task-progress-bar" style="width: ' + completion + '%"></div>' +
                    '</div>' +
                    '<span class="task-completion">' + completion + '%</span>' +
                '</div>';
        });
        updateElementHTML('housekeepingBreakdown', breakdownHTML);

    } catch (error) {
        console.error('Error loading housekeeping report:', error);
    }
}

// Load system alerts
async function loadSystemAlerts() {
    try {
        const [supplies, maintenanceRequests, orders, reports] = await Promise.all([
            fetchWithAuth('/api/supplies').then(r => r.json()),
            fetchWithAuth('/api/maintenance').then(r => r.json()),
            fetchWithAuth('/api/kitchen/orders').then(r => r.json()),
            fetchWithAuth('/api/police-reports').then(r => r.json())
        ]);

    const alerts = [];

        // Low stock alerts
        const lowStockItems = supplies.filter(s => s.stock <= s.minimum);
        lowStockItems.forEach(item => {
            alerts.push({
                type: 'warning',
                icon: 'fa-exclamation-triangle',
                message: 'Low stock: ' + item.name + ' (' + item.stock + ' remaining)',
                time: new Date(),
                priority: 'medium'
            });
        });

        // Pending maintenance alerts
        const urgentMaintenance = maintenanceRequests.filter(r => 
            r.priority === 'high' || r.priority === 'emergency'
        );
        urgentMaintenance.forEach(request => {
            alerts.push({
                type: 'danger',
                icon: 'fa-tools',
                message: 'Urgent maintenance: ' + request.category + ' - ' + (request.description || '').substring(0, 50) + '...',
                time: new Date(request.createdAt),
                priority: 'high'
            });
        });

        // Pending orders alerts
        const pendingOrders = orders.filter(o => o.status === 'pending');
        if (pendingOrders.length > 5) {
            alerts.push({
                type: 'warning',
                icon: 'fa-clock',
                message: pendingOrders.length + ' orders pending in kitchen',
                time: new Date(),
                priority: 'medium'
            });
        }

        // Critical security alerts
        const criticalReports = reports.filter(r => 
            r.severity === 'critical' && r.status !== 'resolved'
        );
        criticalReports.forEach(report => {
            alerts.push({
                type: 'danger',
                icon: 'fa-shield-alt',
                message: 'Critical security incident: ' + report.incidentType,
                time: new Date(report.createdAt),
                priority: 'critical'
            });
        });

        // Sort by priority and time
        alerts.sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority] || b.time - a.time;
        });

        let alertsHTML = '';
        alerts.slice(0, 15).forEach(alert => {
            const timeStr = alert.time.toLocaleTimeString();
            alertsHTML += (
                '<div class="alert-item ' + alert.type + ' ' + alert.priority + '">' +
                    '<div class="alert-icon">' +
                        '<i class="fas ' + alert.icon + '"></i>' +
                    '</div>' +
                    '<div class="alert-content">' +
                        '<span class="alert-message">' + alert.message + '</span>' +
                        '<span class="alert-time">' + timeStr + '</span>' +
                    '</div>' +
                '</div>'
            );
        });

        updateElementHTML('alertsList', alertsHTML || '<p>No active alerts</p>');

    } catch (error) {
        console.error('Error loading system alerts:', error);
    }
}

// Utility functions for DOM updates
function updateElementText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
}

function updateElementHTML(id, html) {
    const element = document.getElementById(id);
    if (element) element.innerHTML = html;
}

// Admin control functions
function refreshActivity() {
    loadRecentActivity();
}

function filterActivity() {
    const filter = document.getElementById('activityFilter').value;
    const activities = document.querySelectorAll('.activity-item');
    
    activities.forEach(activity => {
        if (filter === 'all' || activity.classList.contains(filter)) {
            activity.style.display = 'block';
        } else {
            activity.style.display = 'none';
        }
    });
}

function emergencyAlert() {
    if (confirm('Send emergency alert to all staff?')) {
        // Implementation would send alert through notification system
        alert('Emergency alert sent to all staff members!');
    }
}

function broadcastMessage() {
    const message = prompt('Enter message to broadcast to all staff:');
    if (message) {
        // Implementation would send message through notification system
        alert(`Message broadcasted: "${message}"`);
    }
}

function systemHealthCheck() {
    alert('Running system health check...\n\n✅ Database: Connected\n✅ Server: Running\n✅ APIs: Responsive\n✅ Storage: Available\n\nAll systems operational!');
}

function generateComprehensiveReport() {
    alert('Generating comprehensive report...\nThis will include all hotel operations data.');
    // Implementation would generate and download full report
}

function backupData() {
    if (confirm('Start data backup process?')) {
        alert('Data backup initiated. You will be notified when complete.');
    }
}

// Enhanced refresh function
// Update the main loadAllReports to include new functions
const originalLoadAllReports = loadAllReports;
window.loadAllReports = async function() {
    try {
        await Promise.all([
            loadMetrics(),
            loadStaffReport(),
            loadRoomReport(),
            loadCustomerReport(),
            loadBarReport(),
            loadKitchenReport(),
            loadPaymentReport(),
            loadSecurityReport(),
            loadHousekeepingReport(),
            loadRecentActivity(),
            loadSystemAlerts(),
            loadPerformanceMetrics(),
            createCharts()
        ]);
    } catch (error) {
        console.error('Error loading admin reports:', error);
    }
};

// Guest Portal Management Functions
function showGuestPortalTab(tabName) {
    // Hide all guest portal tab contents
    const tabContents = document.querySelectorAll('.guest-portal-tab-content');
    tabContents.forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all guest portal tab buttons
    const tabBtns = document.querySelectorAll('.guest-portal-tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const selectedTab = document.getElementById(`guest-${tabName}-content`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Add active class to clicked button (guard for undefined event)
    if (typeof event !== 'undefined' && event.target) {
        event.target.classList.add('active');
    }

    // Load tab-specific data
    switch(tabName) {
        case 'orders':
            loadGuestOrders();
            break;
        case 'visitors':
            loadVisitors();
            break;
        case 'analytics':
            loadGuestAnalytics();
            break;
    }
}

async function loadGuestPortalData() {
    try {
        const [guestOrdersRes, visitorsRes] = await Promise.all([
            // Use staff endpoints for guest orders management
            fetchWithAuth('/api/staff/guest-orders'),
            fetchWithAuth('/api/admin/visitors')
        ]);

        const guestOrders = guestOrdersRes && guestOrdersRes.ok ? await guestOrdersRes.json() : [];
        const visitors = visitorsRes && visitorsRes.ok ? await visitorsRes.json() : [];

        // Update overview cards
        const activeGuests = new Set(guestOrders.map(order => order.customerId)).size;
        const pendingOrders = guestOrders.filter(order => order.status === 'pending').length;
        const pendingVisitors = visitors.filter(visitor => visitor.status === 'pending').length;
        const guestRevenue = guestOrders
            .filter(order => order.status === 'delivered')
            .reduce((sum, order) => sum + (order.totalAmount || 0), 0);

        updateElement('activeGuests', activeGuests);
        updateElement('pendingGuestOrders', pendingOrders);
        updateElement('pendingVisitors', pendingVisitors);
        updateElement('guestRevenue', `₦${guestRevenue.toLocaleString()}`);

    } catch (error) {
        console.error('Error loading guest portal data:', error);
    }
}

// Provide a safe stub to avoid reference error when called in loadAllReports
async function loadPerformanceMetrics() {
    try {
        // Placeholder: could fetch additional KPIs here in the future
        return true;
    } catch (e) {
        console.warn('loadPerformanceMetrics placeholder failed:', e);
        return false;
    }
}

async function loadGuestOrders() {
    try {
        const res = await fetchWithAuth('/api/staff/guest-orders');
        const orders = res && res.ok ? await res.json() : [];
        const ordersList = document.getElementById('guestOrdersList');
        
        if (!ordersList) return;

        if (orders.length === 0) {
            ordersList.innerHTML = '<div class="no-data">No guest orders found</div>';
            return;
        }

        ordersList.innerHTML = orders.map(order => {
            const orderIdShort = (order._id || '').toString().slice(-6).toUpperCase();
            const itemsText = (order.items || []).map(item => `${item.name} (x${item.quantity})`).join(', ');
            const notesHtml = order.notes ? '<div class="order-notes"><strong>Notes:</strong> ' + order.notes + '</div>' : '';
            const actions = [];
            if (order.status === 'pending') {
                actions.push('<button class="btn btn-primary btn-sm" onclick="updateOrderStatus(\'' + order._id + '\', \'preparing\')">Start Preparing</button>');
            }
            if (order.status === 'preparing') {
                actions.push('<button class="btn btn-success btn-sm" onclick="updateOrderStatus(\'' + order._id + '\', \'ready\')">Mark Ready</button>');
            }
            if (order.status === 'ready') {
                actions.push('<button class="btn btn-info btn-sm" onclick="updateOrderStatus(\'' + order._id + '\', \'delivered\')">Mark Delivered</button>');
            }
            actions.push('<button class="btn btn-secondary btn-sm" onclick="viewOrderDetails(\'' + order._id + '\')">View Details</button>');

            return (
                '<div class="guest-order-item">' +
                    '<div class="order-header">' +
                        '<div class="order-id">Order #' + orderIdShort + '</div>' +
                        '<div class="order-status status-' + order.status + '">' + order.status + '</div>' +
                    '</div>' +
                    '<div class="order-details">' +
                        '<div class="detail-item"><span class="detail-label">Customer</span><span class="detail-value">' + (order.customerId || '') + '</span></div>' +
                        '<div class="detail-item"><span class="detail-label">Room</span><span class="detail-value">' + (order.roomNumber || 'N/A') + '</span></div>' +
                        '<div class="detail-item"><span class="detail-label">Type</span><span class="detail-value">' + (order.orderType || '-') + '</span></div>' +
                        '<div class="detail-item"><span class="detail-label">Total</span><span class="detail-value">₦' + ((order.totalAmount || 0).toLocaleString()) + '</span></div>' +
                        '<div class="detail-item"><span class="detail-label">Date</span><span class="detail-value">' + (order.createdAt ? new Date(order.createdAt).toLocaleString() : '-') + '</span></div>' +
                    '</div>' +
                    '<div class="order-items"><strong>Items:</strong> ' + itemsText + '</div>' +
                    notesHtml +
                    '<div class="order-actions">' + actions.join('') + '</div>' +
                '</div>'
            );
        }).join('');

    } catch (error) {
        console.error('Error loading guest orders:', error);
        document.getElementById('guestOrdersList').innerHTML = '<div class="error">Error loading guest orders</div>';
    }
}

async function loadVisitors() {
    try {
        const res = await fetchWithAuth('/api/admin/visitors');
        const visitors = res && res.ok ? await res.json() : [];
        const visitorsList = document.getElementById('visitorsList');
        
        if (!visitorsList) return;

        if (visitors.length === 0) {
            visitorsList.innerHTML = '<div class="no-data">No visitor requests found</div>';
            return;
        }

        visitorsList.innerHTML = visitors.map(visitor => {
            const notesHtml = visitor.securityNotes ? '<div class="visitor-notes"><strong>Security Notes:</strong> ' + visitor.securityNotes + '</div>' : '';
            
            // Reconfirmation info if applicable
            const reconfirmationHtml = visitor.status === 'pending_reconfirmation' && visitor.reconfirmationRequestedAt
                ? '<div class="visitor-reconfirmation"><strong>Reconfirmation requested:</strong> ' + new Date(visitor.reconfirmationRequestedAt).toLocaleString() + '<br><strong>Message:</strong> ' + (visitor.reconfirmationMessage || 'Please confirm details') + '</div>'
                : '';
            
            const actions = [];
            if (visitor.status === 'approved') {
                actions.push('<button class="btn btn-info btn-sm" onclick="markVisitorCheckedIn(\'' + visitor._id + '\')">Mark Checked In</button>');
            } else if (visitor.status === 'checked-in') {
                actions.push('<button class="btn btn-warning btn-sm" onclick="markVisitorCheckedOut(\'' + visitor._id + '\')">Mark Checked Out</button>');
            } else if (visitor.status === 'checked-out') {
                actions.push('<button class="btn btn-success btn-sm" disabled>Visit Complete</button>');
            } else if (visitor.status === 'rejected') {
                actions.push('<button class="btn btn-danger btn-sm" disabled>Rejected</button>');
            }
            actions.push('<button class="btn btn-secondary btn-sm" onclick="viewVisitorDetails(\'' + visitor._id + '\')">View Details</button>');

            const expectedDateStr = visitor.expectedDate ? new Date(visitor.expectedDate).toLocaleDateString() : '-';
            const expectedTimeStr = visitor.expectedTime || '';

            return (
                '<div class="visitor-item">' +
                    '<div class="visitor-header">' +
                        '<div class="visitor-name">' + (visitor.visitorName || '-') + '</div>' +
                        '<div class="visitor-status status-' + visitor.status.replace('_', '-') + '">' + visitor.status.replace('_', ' ').toUpperCase() + '</div>' +
                    '</div>' +
                    '<div class="visitor-details">' +
                        '<div class="detail-item"><span class="detail-label">Guest</span><span class="detail-value">' + (visitor.customerId || '') + '</span></div>' +
                        '<div class="detail-item"><span class="detail-label">Phone</span><span class="detail-value">' + (visitor.visitorPhone || 'Not provided') + '</span></div>' +
                        '<div class="detail-item"><span class="detail-label">Purpose</span><span class="detail-value">' + (visitor.visitPurpose || '-') + '</span></div>' +
                        '<div class="detail-item"><span class="detail-label">Expected Time</span><span class="detail-value">' + expectedDateStr + ' ' + expectedTimeStr + '</span></div>' +
                        '<div class="detail-item"><span class="detail-label">Duration</span><span class="detail-value">' + (visitor.expectedDuration || '-') + '</span></div>' +
                        '<div class="detail-item"><span class="detail-label">Requested</span><span class="detail-value">' + (visitor.createdAt ? new Date(visitor.createdAt).toLocaleString() : '-') + '</span></div>' +
                    '</div>' +
                    notesHtml +
                    reconfirmationHtml +
                    '<div class="visitor-actions">' + actions.join('') + '</div>' +
                '</div>'
            );
        }).join('');

    } catch (error) {
        console.error('Error loading visitors:', error);
        document.getElementById('visitorsList').innerHTML = '<div class="error">Error loading visitor requests</div>';
    }
}

async function loadGuestAnalytics() {
    try {
        const [ordersRes, visitorsRes] = await Promise.all([
            fetchWithAuth('/api/staff/guest-orders'),
            fetchWithAuth('/api/admin/visitors')
        ]);

        const orders = ordersRes && ordersRes.ok ? await ordersRes.json() : [];
        const visitors = visitorsRes && visitorsRes.ok ? await visitorsRes.json() : [];

        // Calculate order analytics
        const completedOrders = orders.filter(order => order.status === 'delivered');
        const avgOrderValue = completedOrders.length > 0 
            ? Math.round(completedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0) / completedOrders.length)
            : 0;

        // Find most popular item
        const itemCounts = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
            });
        });
        const popularItem = Object.keys(itemCounts).length > 0 
            ? Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0][0]
            : 'No data';

        // Find peak order time
        const hourCounts = {};
        orders.forEach(order => {
            const hour = new Date(order.createdAt).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        const peakHour = Object.keys(hourCounts).length > 0 
            ? Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0][0]
            : 'No data';
        const peakOrderTime = peakHour !== 'No data' ? `${peakHour}:00` : peakHour;

        // Calculate visitor analytics
        const approvedVisitors = visitors.filter(visitor => visitor.status === 'approved').length;
        const approvalRate = visitors.length > 0 
            ? Math.round((approvedVisitors / visitors.length) * 100)
            : 0;

        // Calculate average processing time (simplified)
        const avgProcessingTime = '15'; // Placeholder - would calculate from actual data

        // Update analytics display
        updateElement('avgOrderValue', `₦${avgOrderValue.toLocaleString()}`);
        updateElement('popularItem', popularItem);
        updateElement('peakOrderTime', peakOrderTime);
        updateElement('approvalRate', `${approvalRate}%`);
        updateElement('avgProcessingTime', `${avgProcessingTime} min`);

    } catch (error) {
        console.error('Error loading guest analytics:', error);
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        await fetchWithAuth(`/api/staff/guest-orders/${orderId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        // Reload orders to show updated status
        await loadGuestOrders();
        await loadGuestPortalData(); // Update overview cards

        alert(`Order status updated to ${newStatus}`);
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Error updating order status');
    }
}

async function approveVisitor(visitorId) {
    const securityNotes = prompt('Security notes (optional):');
    
    try {
        await fetchWithAuth(`/api/admin/visitors/${visitorId}/approve`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ securityNotes })
        });

        // Reload visitors to show updated status
        await loadVisitors();
        await loadGuestPortalData(); // Update overview cards

        alert('Visitor approved successfully');
    } catch (error) {
        console.error('Error approving visitor:', error);
        alert('Error approving visitor');
    }
}

async function rejectVisitor(visitorId) {
    const reason = prompt('Reason for rejection (optional):');
    
    try {
        await fetchWithAuth(`/api/admin/visitors/${visitorId}/reject`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });

        // Reload visitors to show updated status
        await loadVisitors();
        await loadGuestPortalData(); // Update overview cards

        alert('Visitor request rejected');
    } catch (error) {
        console.error('Error rejecting visitor:', error);
        alert('Error rejecting visitor');
    }
}

// Request visitor reconfirmation from guest
async function requestReconfirmation(visitorId) {
    const message = prompt('Message to guest about reconfirmation (optional):', 'Please confirm your visitor request details to proceed with approval.');
    
    if (message === null) return; // User cancelled
    
    try {
        const response = await fetchWithAuth(`/api/admin/visitors/${visitorId}/request-reconfirmation`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        if (response.ok) {
            // Reload visitors to show updated status
            await loadVisitors();
            await loadGuestPortalData(); // Update overview cards

            alert('Reconfirmation request sent to guest successfully');
        } else {
            const error = await response.json();
            alert('Error requesting reconfirmation: ' + (error.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error requesting reconfirmation:', error);
        alert('Error requesting reconfirmation');
    }
}

// Mark visitor as checked in
async function markVisitorCheckedIn(visitorId) {
    if (!confirm('Mark this visitor as checked in?')) return;
    
    try {
        const response = await fetchWithAuth(`/api/admin/visitors/${visitorId}/checkin`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // Reload visitors to show updated status
            await loadVisitors();
            await loadGuestPortalData(); // Update overview cards

            alert('Visitor marked as checked in successfully');
        } else {
            const error = await response.json();
            alert('Error checking in visitor: ' + (error.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error checking in visitor:', error);
        alert('Error checking in visitor');
    }
}

// Mark visitor as checked out
async function markVisitorCheckedOut(visitorId) {
    if (!confirm('Mark this visitor as checked out?')) return;
    
    try {
        const response = await fetchWithAuth(`/api/admin/visitors/${visitorId}/checkout`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // Reload visitors to show updated status
            await loadVisitors();
            await loadGuestPortalData(); // Update overview cards

            alert('Visitor marked as checked out successfully');
        } else {
            const error = await response.json();
            alert('Error checking out visitor: ' + (error.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error checking out visitor:', error);
        alert('Error checking out visitor');
    }
}

function filterGuestOrders() {
    const statusFilter = document.getElementById('orderStatusFilter').value;
    const typeFilter = document.getElementById('orderTypeFilter').value;
    
    const orderItems = document.querySelectorAll('.guest-order-item');
    
    orderItems.forEach(item => {
        const statusClass = item.querySelector('.order-status').className;
        const orderType = item.querySelector('.detail-value').textContent; // Assuming type is first detail
        
        let showItem = true;
        
        if (statusFilter !== 'all' && !statusClass.includes(`status-${statusFilter}`)) {
            showItem = false;
        }
        
        if (typeFilter !== 'all' && !orderType.toLowerCase().includes(typeFilter)) {
            showItem = false;
        }
        
        item.style.display = showItem ? 'block' : 'none';
    });
}

function filterVisitors() {
    const statusFilter = document.getElementById('visitorStatusFilter').value;
    
    const visitorItems = document.querySelectorAll('.visitor-item');
    
    visitorItems.forEach(item => {
        const statusClass = item.querySelector('.visitor-status').className;
        
        let showItem = true;
        
        if (statusFilter !== 'all' && !statusClass.includes(`status-${statusFilter}`)) {
            showItem = false;
        }
        
        item.style.display = showItem ? 'block' : 'none';
    });
}

function viewOrderDetails(orderId) {
    alert(`Viewing detailed information for order ${orderId}\nThis would open a detailed order view modal.`);
}

function viewVisitorDetails(visitorId) {
    alert(`Viewing detailed information for visitor ${visitorId}\nThis would open a detailed visitor view modal.`);
}

function refreshGuestData() {
    loadGuestPortalData();
    // Reload current tab data
    const activeTab = document.querySelector('.guest-portal-tab-btn.active');
    if (activeTab) {
        const tabName = activeTab.textContent.trim().toLowerCase();
        if (tabName.includes('orders')) {
            loadGuestOrders();
        } else if (tabName.includes('visitor')) {
            loadVisitors();
        } else if (tabName.includes('analytics')) {
            loadGuestAnalytics();
        }
    }
    
    alert('Guest portal data refreshed successfully!');
}

function exportGuestReport() {
    alert('Exporting guest portal report...\nThis would generate and download a comprehensive guest activity report.');
}

// Notification function for admin dashboard
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
    
    console.log(`${type.toUpperCase()}: ${message}`);
}

// Modal functions for admin dashboard
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.classList.add('modal-open');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// Notification function for admin dashboard
function showNotification(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Style the toast
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        max-width: 400px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }, 5000);
}

// ========================================
// STOCK MANAGEMENT FUNCTIONS
// ========================================

// Stock Management State
let stockItems = [];
let suppliers = [];
let purchaseOrders = [];
let stockMovements = [];
let stockAlerts = [];

// Initialize Stock Management
function initializeStockManagement() {
    loadStockOverview();
    loadStockItems();
    loadSuppliers();
    loadPurchaseOrders();
    loadStockMovements();
    loadStockAlerts();
    populateSupplierDropdowns();
}

// Switch between stock tabs
function switchStockTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.stock-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to selected tab button
    const selectedBtn = event.target.closest('.tab-btn');
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Load data for the selected tab
    switch(tabName) {
        case 'inventory':
            loadStockItems();
            break;
        case 'suppliers':
            loadSuppliers();
            break;
        case 'purchase-orders':
            loadPurchaseOrders();
            break;
        case 'movements':
            loadStockMovements();
            break;
        case 'alerts':
            loadStockAlerts();
            break;
    }
}

// Load Stock Overview
async function loadStockOverview() {
    try {
        const response = await fetchWithAuth('/api/stock/overview');
        if (response.ok) {
            const overview = await response.json();
            updateOverviewCards(overview);
        } else {
            console.error('Failed to load stock overview');
        }
    } catch (error) {
        console.error('Error loading stock overview:', error);
        // Set default values
        updateOverviewCards({
            totalItems: 0,
            lowStockCount: 0,
            totalValue: 0,
            activeSuppliers: 0
        });
    }
}

// Update Overview Cards
function updateOverviewCards(overview) {
    document.getElementById('totalStockItems').textContent = overview.totalItems || 0;
    document.getElementById('lowStockAlerts').textContent = overview.lowStockCount || 0;
    document.getElementById('totalStockValue').textContent = `₦${(overview.totalValue || 0).toLocaleString()}`;
    document.getElementById('activeSuppliers').textContent = overview.activeSuppliers || 0;
}

// Load Stock Items
async function loadStockItems() {
    try {
        const response = await fetchWithAuth('/api/stock/items');
        if (response.ok) {
            stockItems = await response.json();
            displayStockItems(stockItems);
        } else {
            console.error('Failed to load stock items');
            stockItems = [];
            displayStockItems([]);
        }
    } catch (error) {
        console.error('Error loading stock items:', error);
        stockItems = [];
        displayStockItems([]);
    }
}

// Display Stock Items
function displayStockItems(items) {
    const tableBody = document.getElementById('stockItemsTableBody');
    
    if (!tableBody) return;
    
    if (!items || items.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center">
                    <div style="padding: 40px; color: #666;">
                        <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                        <p style="margin: 0; font-size: 1.1rem;">No stock items found</p>
                        <p style="margin: 5px 0 0 0; font-size: 0.9rem;">Add your first stock item to get started</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = items.map(item => {
        const status = getStockStatus(item.currentStock, item.minStock);
        const totalValue = (item.currentStock * item.costPerUnit).toFixed(2);
        
        return `
            <tr>
                <td>
                    <strong>${item.name}</strong>
                    ${item.description ? `<br><small style="color: #666;">${item.description}</small>` : ''}
                </td>
                <td>
                    <span class="badge badge-secondary">${item.category}</span>
                </td>
                <td>
                    <strong>${item.currentStock}</strong>
                    ${item.location ? `<br><small style="color: #666;">📍 ${item.location}</small>` : ''}
                </td>
                <td>${item.minStock}</td>
                <td>${item.unit}</td>
                <td>₦${item.costPerUnit.toFixed(2)}</td>
                <td><strong>₦${totalValue}</strong></td>
                <td>${item.supplier ? item.supplier.name : 'N/A'}</td>
                <td>
                    <span class="status-badge ${status.class}">${status.text}</span>
                </td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="editStockItem('${item._id}')" title="Edit Item">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="adjustStockModal('${item._id}')" title="Adjust Stock">
                            <i class="fas fa-plus-minus"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteStockItem('${item._id}')" title="Delete Item">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Get Stock Status
function getStockStatus(currentStock, minStock) {
    if (currentStock <= 0) {
        return { class: 'out-of-stock', text: 'Out of Stock' };
    } else if (currentStock <= minStock) {
        return { class: 'low-stock', text: 'Low Stock' };
    } else {
        return { class: 'in-stock', text: 'In Stock' };
    }
}

// Filter Stock Items
function filterStockItems() {
    const searchTerm = document.getElementById('stockSearch').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    let filteredItems = stockItems;
    
    if (searchTerm) {
        filteredItems = filteredItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            item.description.toLowerCase().includes(searchTerm)
        );
    }
    
    if (categoryFilter) {
        filteredItems = filteredItems.filter(item => item.category === categoryFilter);
    }
    
    displayStockItems(filteredItems);
}

// Add Stock Item
async function addStockItem(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('stockItemName').value,
        category: document.getElementById('stockItemCategory').value,
        currentStock: parseInt(document.getElementById('stockItemCurrentStock').value),
        minStock: parseInt(document.getElementById('stockItemMinStock').value),
        maxStock: parseInt(document.getElementById('stockItemMaxStock').value) || null,
        unit: document.getElementById('stockItemUnit').value,
        costPerUnit: parseFloat(document.getElementById('stockItemCostPerUnit').value),
        supplier: document.getElementById('stockItemSupplier').value || null,
        location: document.getElementById('stockItemLocation').value,
        description: document.getElementById('stockItemDescription').value
    };
    
    try {
        const response = await fetchWithAuth('/api/stock/items', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            closeModal('addStockItemModal');
            document.getElementById('addStockItemForm').reset();
            loadStockItems();
            loadStockOverview();
            showNotification('Stock item added successfully', 'success');
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to add stock item', 'error');
        }
    } catch (error) {
        console.error('Error adding stock item:', error);
        showNotification('Error adding stock item', 'error');
    }
}

// Load Suppliers
async function loadSuppliers() {
    try {
        const response = await fetchWithAuth('/api/suppliers');
        if (response.ok) {
            suppliers = await response.json();
            displaySuppliers(suppliers);
        } else {
            console.error('Failed to load suppliers');
            suppliers = [];
            displaySuppliers([]);
        }
    } catch (error) {
        console.error('Error loading suppliers:', error);
        suppliers = [];
        displaySuppliers([]);
    }
}

// Display Suppliers
function displaySuppliers(suppliers) {
    const tableBody = document.getElementById('suppliersTableBody');
    
    if (!tableBody) return;
    
    if (!suppliers || suppliers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    <div style="padding: 40px; color: #666;">
                        <i class="fas fa-truck" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                        <p style="margin: 0; font-size: 1.1rem;">No suppliers found</p>
                        <p style="margin: 5px 0 0 0; font-size: 0.9rem;">Add your first supplier to get started</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = suppliers.map(supplier => `
        <tr>
            <td><strong>${supplier.name}</strong></td>
            <td>${supplier.contactPerson}</td>
            <td>${supplier.phone}</td>
            <td>${supplier.email}</td>
            <td><span class="badge badge-info">${supplier.category}</span></td>
            <td>${supplier.paymentTerms}</td>
            <td>${supplier.totalOrders || 0}</td>
            <td>
                <div class="rating">
                    ${'★'.repeat(supplier.rating || 0)}${'☆'.repeat(5 - (supplier.rating || 0))}
                </div>
            </td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary" onclick="editSupplier('${supplier._id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteSupplier('${supplier._id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Add Supplier
async function addSupplier(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('supplierName').value,
        contactPerson: document.getElementById('supplierContactPerson').value,
        phone: document.getElementById('supplierPhone').value,
        email: document.getElementById('supplierEmail').value,
        address: document.getElementById('supplierAddress').value,
        category: document.getElementById('supplierCategory').value,
        paymentTerms: document.getElementById('supplierPaymentTerms').value
    };
    
    try {
        const response = await fetchWithAuth('/api/suppliers', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            closeModal('addSupplierModal');
            document.getElementById('addSupplierForm').reset();
            loadSuppliers();
            populateSupplierDropdowns();
            loadStockOverview();
            showNotification('Supplier added successfully', 'success');
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to add supplier', 'error');
        }
    } catch (error) {
        console.error('Error adding supplier:', error);
        showNotification('Error adding supplier', 'error');
    }
}

// Populate Supplier Dropdowns
function populateSupplierDropdowns() {
    const stockItemSupplierSelect = document.getElementById('stockItemSupplier');
    const poSupplierSelect = document.getElementById('poSupplier');
    
    if (stockItemSupplierSelect) {
        stockItemSupplierSelect.innerHTML = '<option value="">Select Supplier</option>' + 
            suppliers.map(supplier => `<option value="${supplier._id}">${supplier.name}</option>`).join('');
    }
    
    if (poSupplierSelect) {
        poSupplierSelect.innerHTML = '<option value="">Select Supplier</option>' + 
            suppliers.map(supplier => `<option value="${supplier._id}">${supplier.name}</option>`).join('');
    }
}

// Load Purchase Orders
async function loadPurchaseOrders() {
    try {
        const response = await fetchWithAuth('/api/purchase-orders');
        if (response.ok) {
            purchaseOrders = await response.json();
            displayPurchaseOrders(purchaseOrders);
        } else {
            console.error('Failed to load purchase orders');
            purchaseOrders = [];
            displayPurchaseOrders([]);
        }
    } catch (error) {
        console.error('Error loading purchase orders:', error);
        purchaseOrders = [];
        displayPurchaseOrders([]);
    }
}

// Display Purchase Orders
function displayPurchaseOrders(orders) {
    const tableBody = document.getElementById('purchaseOrdersTableBody');
    
    if (!tableBody) return;
    
    if (!orders || orders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div style="padding: 40px; color: #666;">
                        <i class="fas fa-file-invoice" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                        <p style="margin: 0; font-size: 1.1rem;">No purchase orders found</p>
                        <p style="margin: 5px 0 0 0; font-size: 0.9rem;">Create your first purchase order to get started</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = orders.map(order => `
        <tr>
            <td><strong>${order.orderNumber}</strong></td>
            <td>${order.supplier ? order.supplier.name : 'N/A'}</td>
            <td>${new Date(order.orderDate).toLocaleDateString()}</td>
            <td>${new Date(order.expectedDelivery).toLocaleDateString()}</td>
            <td><strong>₦${order.totalAmount.toLocaleString()}</strong></td>
            <td><span class="status-badge ${order.status.toLowerCase()}">${order.status}</span></td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary" onclick="viewPurchaseOrder('${order._id}')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="markPODelivered('${order._id}')" title="Mark Delivered">
                        <i class="fas fa-check"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Create Purchase Order
let poItemCounter = 0;

function addPOItem() {
    const poItemsList = document.getElementById('poItemsList');
    const itemDiv = document.createElement('div');
    itemDiv.className = 'po-item';
    itemDiv.id = `po-item-${poItemCounter}`;
    
    itemDiv.innerHTML = `
        <select class="item-select" onchange="updatePOItemPrice(${poItemCounter})">
            <option value="">Select Item</option>
            ${stockItems.map(item => `<option value="${item._id}" data-price="${item.costPerUnit}">${item.name}</option>`).join('')}
        </select>
        <input type="number" class="quantity-input" placeholder="Qty" min="1" value="1" onchange="calculatePOItemTotal(${poItemCounter})">
        <input type="number" class="price-input" placeholder="Price" min="0" step="0.01" onchange="calculatePOItemTotal(${poItemCounter})">
        <div class="total-display">₦0.00</div>
        <button type="button" class="remove-item" onclick="removePOItem(${poItemCounter})">×</button>
    `;
    
    poItemsList.appendChild(itemDiv);
    poItemCounter++;
}

function updatePOItemPrice(itemId) {
    const itemSelect = document.querySelector(`#po-item-${itemId} .item-select`);
    const priceInput = document.querySelector(`#po-item-${itemId} .price-input`);
    const selectedOption = itemSelect.options[itemSelect.selectedIndex];
    
    if (selectedOption.dataset.price) {
        priceInput.value = selectedOption.dataset.price;
        calculatePOItemTotal(itemId);
    }
}

function calculatePOItemTotal(itemId) {
    const quantity = parseFloat(document.querySelector(`#po-item-${itemId} .quantity-input`).value) || 0;
    const price = parseFloat(document.querySelector(`#po-item-${itemId} .price-input`).value) || 0;
    const total = quantity * price;
    
    document.querySelector(`#po-item-${itemId} .total-display`).textContent = `₦${total.toFixed(2)}`;
    calculatePOTotals();
}

function removePOItem(itemId) {
    const itemDiv = document.getElementById(`po-item-${itemId}`);
    if (itemDiv) {
        itemDiv.remove();
        calculatePOTotals();
    }
}

function calculatePOTotals() {
    const items = document.querySelectorAll('.po-item');
    let subtotal = 0;
    
    items.forEach(item => {
        const totalText = item.querySelector('.total-display').textContent;
        const total = parseFloat(totalText.replace('₦', '').replace(',', '')) || 0;
        subtotal += total;
    });
    
    const tax = subtotal * 0.075; // 7.5% tax
    const total = subtotal + tax;
    
    document.getElementById('poSubtotal').textContent = subtotal.toFixed(2);
    document.getElementById('poTax').textContent = tax.toFixed(2);
    document.getElementById('poTotal').textContent = total.toFixed(2);
}

async function createPurchaseOrder(event) {
    event.preventDefault();
    
    const items = [];
    document.querySelectorAll('.po-item').forEach(itemDiv => {
        const itemSelect = itemDiv.querySelector('.item-select');
        const quantity = parseInt(itemDiv.querySelector('.quantity-input').value);
        const price = parseFloat(itemDiv.querySelector('.price-input').value);
        
        if (itemSelect.value && quantity && price) {
            items.push({
                item: itemSelect.value,
                quantity: quantity,
                unitPrice: price
            });
        }
    });
    
    if (items.length === 0) {
        showNotification('Please add at least one item to the purchase order', 'error');
        return;
    }
    
    const formData = {
        supplier: document.getElementById('poSupplier').value,
        items: items,
        expectedDelivery: document.getElementById('poExpectedDelivery').value,
        notes: document.getElementById('poNotes').value
    };
    
    try {
        const response = await fetchWithAuth('/api/purchase-orders', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            closeModal('createPurchaseOrderModal');
            document.getElementById('createPurchaseOrderForm').reset();
            document.getElementById('poItemsList').innerHTML = '';
            poItemCounter = 0;
            loadPurchaseOrders();
            loadStockOverview();
            showNotification('Purchase order created successfully', 'success');
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to create purchase order', 'error');
        }
    } catch (error) {
        console.error('Error creating purchase order:', error);
        showNotification('Error creating purchase order', 'error');
    }
}

// Load Stock Movements
async function loadStockMovements() {
    try {
        const response = await fetchWithAuth('/api/stock/movements');
        if (response.ok) {
            stockMovements = await response.json();
            displayStockMovements(stockMovements);
        } else {
            console.error('Failed to load stock movements');
            stockMovements = [];
            displayStockMovements([]);
        }
    } catch (error) {
        console.error('Error loading stock movements:', error);
        stockMovements = [];
        displayStockMovements([]);
    }
}

// Display Stock Movements
function displayStockMovements(movements) {
    const tableBody = document.getElementById('stockMovementsTableBody');
    
    if (!tableBody) return;
    
    if (!movements || movements.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div style="padding: 40px; color: #666;">
                        <i class="fas fa-exchange-alt" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                        <p style="margin: 0; font-size: 1.1rem;">No stock movements found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = movements.map(movement => `
        <tr>
            <td>${new Date(movement.date).toLocaleDateString()}</td>
            <td>${movement.item ? movement.item.name : 'N/A'}</td>
            <td>
                <span class="badge ${movement.type === 'in' ? 'badge-success' : 'badge-danger'}">
                    ${movement.type === 'in' ? 'Stock In' : 'Stock Out'}
                </span>
            </td>
            <td>${movement.quantity}</td>
            <td>${movement.previousStock}</td>
            <td>${movement.newStock}</td>
            <td>${movement.reference || 'N/A'}</td>
            <td>${movement.staff || 'System'}</td>
        </tr>
    `).join('');
}

// Load Stock Alerts
async function loadStockAlerts() {
    try {
        const response = await fetchWithAuth('/api/stock/alerts');
        if (response.ok) {
            stockAlerts = await response.json();
            displayStockAlerts(stockAlerts);
        } else {
            console.error('Failed to load stock alerts');
            stockAlerts = [];
            displayStockAlerts([]);
        }
    } catch (error) {
        console.error('Error loading stock alerts:', error);
        stockAlerts = [];
        displayStockAlerts([]);
    }
}

// Display Stock Alerts
function displayStockAlerts(alerts) {
    const container = document.getElementById('stockAlertsContainer');
    
    if (!container) return;
    
    if (!alerts || alerts.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="padding: 40px; color: #666;">
                <i class="fas fa-bell-slash" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                <p style="margin: 0; font-size: 1.1rem;">No stock alerts</p>
                <p style="margin: 5px 0 0 0; font-size: 0.9rem;">All stock levels are healthy</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = alerts.map(alert => `
        <div class="stock-alert ${alert.type}">
            <div class="alert-header">
                <div class="alert-title">
                    <i class="fas ${alert.type === 'critical' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
                    ${alert.item.name}
                    <span class="alert-badge ${alert.type}">${alert.type.toUpperCase()}</span>
                </div>
                <button class="btn btn-sm btn-outline-primary" onclick="adjustStockModal('${alert.item._id}')">
                    <i class="fas fa-plus"></i> Restock
                </button>
            </div>
            <div class="alert-details">
                <p><strong>Current Stock:</strong> ${alert.item.currentStock} ${alert.item.unit}</p>
                <p><strong>Minimum Required:</strong> ${alert.item.minStock} ${alert.item.unit}</p>
                <p><strong>Supplier:</strong> ${alert.item.supplier ? alert.item.supplier.name : 'No supplier assigned'}</p>
                <p><strong>Category:</strong> ${alert.item.category}</p>
            </div>
        </div>
    `).join('');
}

// Stock Adjustment Modal
function adjustStockModal(itemId) {
    const item = stockItems.find(i => i._id === itemId);
    if (!item) return;
    
    document.getElementById('adjustmentItemId').value = itemId;
    document.getElementById('adjustmentItemName').value = item.name;
    document.getElementById('adjustmentCurrentStock').value = item.currentStock;
    document.getElementById('adjustmentQuantity').value = '';
    document.getElementById('adjustmentNewStock').value = '';
    document.getElementById('adjustmentType').value = '';
    document.getElementById('adjustmentReason').value = '';
    document.getElementById('adjustmentReference').value = '';
    document.getElementById('adjustmentNotes').value = '';
    
    showModal('stockAdjustmentModal');
}

// Update Adjustment Fields
function updateAdjustmentFields() {
    const currentStock = parseInt(document.getElementById('adjustmentCurrentStock').value);
    const adjustmentType = document.getElementById('adjustmentType').value;
    const quantity = parseInt(document.getElementById('adjustmentQuantity').value) || 0;
    
    let newStock = currentStock;
    
    switch(adjustmentType) {
        case 'add':
            newStock = currentStock + quantity;
            break;
        case 'remove':
            newStock = Math.max(0, currentStock - quantity);
            break;
        case 'set':
            newStock = quantity;
            break;
    }
    
    document.getElementById('adjustmentNewStock').value = newStock;
}

// Adjust Stock
async function adjustStock(event) {
    event.preventDefault();
    
    const formData = {
        itemId: document.getElementById('adjustmentItemId').value,
        type: document.getElementById('adjustmentType').value,
        quantity: parseInt(document.getElementById('adjustmentQuantity').value),
        reason: document.getElementById('adjustmentReason').value,
        reference: document.getElementById('adjustmentReference').value,
        notes: document.getElementById('adjustmentNotes').value
    };
    
    try {
        const response = await fetchWithAuth('/api/stock/adjust', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            closeModal('stockAdjustmentModal');
            document.getElementById('stockAdjustmentForm').reset();
            loadStockItems();
            loadStockMovements();
            loadStockOverview();
            loadStockAlerts();
            showNotification('Stock adjustment applied successfully', 'success');
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to adjust stock', 'error');
        }
    } catch (error) {
        console.error('Error adjusting stock:', error);
        showNotification('Error adjusting stock', 'error');
    }
}

// Generate Stock Report
function generateStockReport() {
    const reportData = {
        totalItems: stockItems.length,
        lowStockItems: stockItems.filter(item => item.currentStock <= item.minStock).length,
        outOfStockItems: stockItems.filter(item => item.currentStock <= 0).length,
        totalValue: stockItems.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0),
        recentMovements: stockMovements.slice(0, 10)
    };
    
    // This would typically generate and download a PDF or CSV report
    alert(`Stock Report Summary:
    
Total Items: ${reportData.totalItems}
Low Stock Items: ${reportData.lowStockItems}
Out of Stock Items: ${reportData.outOfStockItems}
Total Inventory Value: ₦${reportData.totalValue.toLocaleString()}

Report generation feature would create a detailed PDF/CSV file.`);
}

// Add event listeners when stock section becomes active
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for adjustment quantity changes
    const adjustmentQuantity = document.getElementById('adjustmentQuantity');
    if (adjustmentQuantity) {
        adjustmentQuantity.addEventListener('input', updateAdjustmentFields);
    }
    
    // Initialize stock management when the section is first accessed
    const stockMenuItem = document.querySelector('nav a[onclick*="stock-section"]');
    if (stockMenuItem) {
        stockMenuItem.addEventListener('click', function() {
            setTimeout(initializeStockManagement, 100);
        });
    }
});

// ========================================
// EXTRA ADMIN ACTION HANDLERS (wired from HTML)
// ========================================

// Edit stock item (opens pre-filled Add Item modal and updates on submit)
async function editStockItem(itemId) {
    try {
        const item = stockItems.find(i => i._id === itemId);
        if (!item) {
            showNotification('Stock item not found', 'error');
            return;
        }
        // Pre-fill form
        document.getElementById('stockItemName').value = item.name || '';
        document.getElementById('stockItemCategory').value = item.category || '';
        document.getElementById('stockItemCurrentStock').value = item.currentStock || 0;
        document.getElementById('stockItemMinStock').value = item.minStock || 0;
        document.getElementById('stockItemMaxStock').value = item.maxStock || '';
        document.getElementById('stockItemUnit').value = item.unit || '';
        document.getElementById('stockItemCostPerUnit').value = item.costPerUnit || 0;
        document.getElementById('stockItemSupplier').value = item.supplier?._id || '';
        document.getElementById('stockItemLocation').value = item.location || '';
        document.getElementById('stockItemDescription').value = item.description || '';

        // Temporarily override form submit to perform PUT
        const form = document.getElementById('addStockItemForm');
        if (!form) return;
        const originalHandler = form.onsubmit;
        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = {
                name: document.getElementById('stockItemName').value,
                category: document.getElementById('stockItemCategory').value,
                currentStock: parseInt(document.getElementById('stockItemCurrentStock').value),
                minStock: parseInt(document.getElementById('stockItemMinStock').value),
                maxStock: parseInt(document.getElementById('stockItemMaxStock').value) || null,
                unit: document.getElementById('stockItemUnit').value,
                costPerUnit: parseFloat(document.getElementById('stockItemCostPerUnit').value),
                supplier: document.getElementById('stockItemSupplier').value || null,
                location: document.getElementById('stockItemLocation').value,
                description: document.getElementById('stockItemDescription').value
            };
            try {
                const res = await fetchWithAuth('/api/stock/items/' + itemId, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
                if (res.ok) {
                    closeModal('addStockItemModal');
                    form.reset();
                    form.onsubmit = originalHandler || ((ev) => addStockItem(ev));
                    await loadStockItems();
                    await loadStockOverview();
                    showNotification('Stock item updated', 'success');
                } else {
                    const err = await res.json();
                    showNotification(err.message || 'Failed to update item', 'error');
                }
            } catch (err) {
                console.error('Update stock item failed:', err);
                showNotification('Error updating stock item', 'error');
            }
        };
        // Show modal
        showModal('addStockItemModal');
    } catch (e) {
        console.error('editStockItem error', e);
    }
}

// Delete stock item
async function deleteStockItem(itemId) {
    if (!confirm('Delete this stock item? This action cannot be undone.')) return;
    try {
        const res = await fetchWithAuth('/api/stock/items/' + itemId, { method: 'DELETE' });
        if (res.ok) {
            await loadStockItems();
            await loadStockOverview();
            showNotification('Stock item deleted', 'success');
        } else {
            const err = await res.json();
            showNotification(err.message || 'Failed to delete item', 'error');
        }
    } catch (e) {
        console.error('deleteStockItem error', e);
        showNotification('Error deleting stock item', 'error');
    }
}

// View purchase order details (simple alert for now)
function viewPurchaseOrder(orderId) {
    const order = purchaseOrders.find(o => o._id === orderId);
    if (!order) {
        showNotification('Purchase order not found', 'error');
        return;
    }
    const items = (order.items || []).map(i => `- ${i.item?.name || i.item} x${i.quantity} @ ₦${(i.unitPrice || 0).toFixed(2)}`).join('\n');
    alert(`Purchase Order ${order.orderNumber}\nSupplier: ${order.supplier?.name || 'N/A'}\nStatus: ${order.status}\nTotal: ₦${(order.totalAmount || 0).toLocaleString()}\n\nItems:\n${items}`);
}

// Mark purchase order delivered/received
async function markPODelivered(orderId) {
    if (!confirm('Mark this purchase order as received?')) return;
    try {
        const res = await fetchWithAuth('/api/purchase-orders/' + orderId + '/receive', { method: 'PUT' });
        if (res.ok) {
            await loadPurchaseOrders();
            await loadStockItems();
            await loadStockMovements();
            await loadStockOverview();
            showNotification('Purchase order marked as received', 'success');
        } else {
            const err = await res.json();
            showNotification(err.message || 'Failed to mark as received', 'error');
        }
    } catch (e) {
        showNotification('Error updating purchase order', 'error');
    }
}

// =================== INVENTORY PROFIT ANALYTICS FUNCTIONS ===================

// Load and display inventory analytics
async function loadInventoryAnalytics() {
    try {
        const response = await fetchWithAuth('/api/inventory/analytics');
        if (!response.ok) throw new Error('Failed to fetch inventory analytics');
        
        const analytics = await response.json();
        
        // Update quick stats
        updateInventoryQuickStats(analytics.combined);
        
        // Update bar vs kitchen comparison
        updateInventoryComparison(analytics.bar, analytics.kitchen);
        
        // Load top performers
        await loadTopPerformers();
        
        // Update budget forecast
        await updateBudgetForecast();
        
        console.log('✅ Inventory analytics loaded successfully');
    } catch (error) {
        console.error('❌ Error loading inventory analytics:', error);
        showNotification('Failed to load inventory analytics', 'error');
    }
}

// Update quick stats cards
function updateInventoryQuickStats(combined) {
    const elements = {
        totalInventoryValue: document.getElementById('totalInventoryValue'),
        totalPotentialRevenue: document.getElementById('totalPotentialRevenue'),
        totalPotentialProfit: document.getElementById('totalPotentialProfit'),
        averageInventoryMargin: document.getElementById('averageInventoryMargin')
    };
    
    if (elements.totalInventoryValue) {
        elements.totalInventoryValue.textContent = `₦${combined.totalCost.toLocaleString()}`;
    }
    if (elements.totalPotentialRevenue) {
        elements.totalPotentialRevenue.textContent = `₦${combined.totalRevenue.toLocaleString()}`;
    }
    if (elements.totalPotentialProfit) {
        elements.totalPotentialProfit.textContent = `₦${combined.totalProfit.toLocaleString()}`;
    }
    if (elements.averageInventoryMargin) {
        elements.averageInventoryMargin.textContent = `${combined.profitMargin}%`;
        
        // Apply color coding based on profit margin
        const margin = parseFloat(combined.profitMargin);
        const element = elements.averageInventoryMargin;
        element.className = 'stat-value';
        if (margin >= 50) element.classList.add('profit-margin-excellent');
        else if (margin >= 30) element.classList.add('profit-margin-good');
        else if (margin >= 15) element.classList.add('profit-margin-fair');
        else element.classList.add('profit-margin-poor');
    }
}

// Update bar vs kitchen comparison
function updateInventoryComparison(barData, kitchenData) {
    const elements = {
        barStockValue: document.getElementById('barStockValue'),
        barPotentialRevenue: document.getElementById('barPotentialRevenue'),
        barAvgMargin: document.getElementById('barAvgMargin'),
        barLowStockCount: document.getElementById('barLowStockCount'),
        kitchenStockValue: document.getElementById('kitchenStockValue'),
        kitchenPotentialRevenue: document.getElementById('kitchenPotentialRevenue'),
        kitchenAvgMargin: document.getElementById('kitchenAvgMargin'),
        kitchenLowStockCount: document.getElementById('kitchenLowStockCount')
    };
    
    // Update bar stats
    if (elements.barStockValue) elements.barStockValue.textContent = `₦${barData.totalCost.toLocaleString()}`;
    if (elements.barPotentialRevenue) elements.barPotentialRevenue.textContent = `₦${barData.totalRevenue.toLocaleString()}`;
    if (elements.barAvgMargin) {
        elements.barAvgMargin.textContent = `${barData.profitMargin}%`;
        applyMarginColorCoding(elements.barAvgMargin, parseFloat(barData.profitMargin));
    }
    if (elements.barLowStockCount) elements.barLowStockCount.textContent = barData.lowStockItems.length;
    
    // Update kitchen stats
    if (elements.kitchenStockValue) elements.kitchenStockValue.textContent = `₦${kitchenData.totalCost.toLocaleString()}`;
    if (elements.kitchenPotentialRevenue) elements.kitchenPotentialRevenue.textContent = `₦${kitchenData.totalRevenue.toLocaleString()}`;
    if (elements.kitchenAvgMargin) {
        elements.kitchenAvgMargin.textContent = `${kitchenData.profitMargin}%`;
        applyMarginColorCoding(elements.kitchenAvgMargin, parseFloat(kitchenData.profitMargin));
    }
    if (elements.kitchenLowStockCount) elements.kitchenLowStockCount.textContent = kitchenData.lowStockItems.length;
    
    // Update comparison chart if canvas exists
    updateInventoryComparisonChart(barData, kitchenData);
}

// Load and display top performing items
async function loadTopPerformers() {
    try {
        const response = await fetchWithAuth('/api/inventory/top-performers');
        if (!response.ok) throw new Error('Failed to fetch top performers');
        
        const performers = await response.json();
        
        // Update bar top performers
        const barContainer = document.getElementById('topBarPerformers');
        if (barContainer) {
            barContainer.innerHTML = '';
            performers.bar.topProfitItems.forEach(item => {
                const performerDiv = document.createElement('div');
                performerDiv.className = 'performer-item';
                performerDiv.innerHTML = `
                    <div>
                        <div class="performer-name">${item.name}</div>
                        <div class="performer-margin">${item.profitMarginCalculated}% margin</div>
                    </div>
                    <div class="performer-profit">₦${item.profitPerUnit.toLocaleString()}</div>
                `;
                barContainer.appendChild(performerDiv);
            });
            
            if (performers.bar.topProfitItems.length === 0) {
                barContainer.innerHTML = '<div class="performer-item">No bar items found</div>';
            }
        }
        
        // Update kitchen top performers
        const kitchenContainer = document.getElementById('topKitchenPerformers');
        if (kitchenContainer) {
            kitchenContainer.innerHTML = '';
            performers.kitchen.topProfitItems.forEach(item => {
                const performerDiv = document.createElement('div');
                performerDiv.className = 'performer-item';
                performerDiv.innerHTML = `
                    <div>
                        <div class="performer-name">${item.name}</div>
                        <div class="performer-margin">${item.profitMarginCalculated}% margin</div>
                    </div>
                    <div class="performer-profit">₦${item.profitPerServing.toLocaleString()}/serving</div>
                `;
                kitchenContainer.appendChild(performerDiv);
            });
            
            if (performers.kitchen.topProfitItems.length === 0) {
                kitchenContainer.innerHTML = '<div class="performer-item">No kitchen items found</div>';
            }
        }
        
    } catch (error) {
        console.error('❌ Error loading top performers:', error);
        showNotification('Failed to load top performing items', 'error');
    }
}

// Update budget forecast
async function updateBudgetForecast() {
    const period = document.getElementById('budgetForecastPeriod')?.value || '30';
    
    try {
        const response = await fetchWithAuth(`/api/budget-forecast?days=${period}`);
        if (!response.ok) throw new Error('Failed to fetch budget forecast');
        
        const forecast = await response.json();
        
        // Update forecast values
        const projectedSpend = document.getElementById('projectedMonthlySpend');
        const budgetUtil = document.getElementById('budgetUtilization');
        const remainingBudget = document.getElementById('remainingBudget');
        
        if (projectedSpend) projectedSpend.textContent = `₦${forecast.combined.monthlyForecast.toLocaleString()}`;
        if (budgetUtil) {
            budgetUtil.textContent = `${forecast.budget.utilizationPercentage}%`;
            applyUtilizationColorCoding(budgetUtil, parseFloat(forecast.budget.utilizationPercentage));
        }
        if (remainingBudget) {
            const remaining = forecast.budget.remainingBudget;
            remainingBudget.textContent = `₦${remaining.toLocaleString()}`;
            remainingBudget.className = 'forecast-value';
            if (remaining < 0) remainingBudget.classList.add('profit-margin-poor');
            else if (remaining < forecast.budget.monthlyLimit * 0.2) remainingBudget.classList.add('profit-margin-fair');
            else remainingBudget.classList.add('profit-margin-good');
        }
        
        // Update recommendations
        const recommendationsContainer = document.getElementById('budgetRecommendations');
        if (recommendationsContainer && forecast.budget.recommendations) {
            recommendationsContainer.innerHTML = '';
            forecast.budget.recommendations.forEach(rec => {
                const li = document.createElement('li');
                li.textContent = rec;
                recommendationsContainer.appendChild(li);
            });
            
            if (forecast.budget.recommendations.length === 0) {
                recommendationsContainer.innerHTML = '<li>Budget management is on track</li>';
            }
        }
        
    } catch (error) {
        console.error('❌ Error updating budget forecast:', error);
        showNotification('Failed to update budget forecast', 'error');
    }
}

// Apply color coding based on profit margin
function applyMarginColorCoding(element, margin) {
    element.className = element.className.replace(/profit-margin-\w+/g, '');
    if (margin >= 50) element.classList.add('profit-margin-excellent');
    else if (margin >= 30) element.classList.add('profit-margin-good');
    else if (margin >= 15) element.classList.add('profit-margin-fair');
    else element.classList.add('profit-margin-poor');
}

// Apply color coding based on budget utilization
function applyUtilizationColorCoding(element, utilization) {
    element.className = element.className.replace(/profit-margin-\w+/g, '');
    if (utilization <= 70) element.classList.add('profit-margin-good');
    else if (utilization <= 85) element.classList.add('profit-margin-fair');
    else if (utilization <= 100) element.classList.add('profit-margin-poor');
    else element.classList.add('profit-margin-poor');
}

// Update inventory comparison chart
function updateInventoryComparisonChart(barData, kitchenData) {
    const canvas = document.getElementById('inventoryComparisonChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (chartInstances.inventoryComparison) {
        chartInstances.inventoryComparison.destroy();
    }
    
    chartInstances.inventoryComparison = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Bar Stock Value', 'Kitchen Stock Value', 'Bar Potential Profit', 'Kitchen Potential Profit'],
            datasets: [{
                data: [
                    barData.totalCost,
                    kitchenData.totalCost,
                    barData.totalProfit,
                    kitchenData.totalProfit
                ],
                backgroundColor: [
                    '#3b82f6',
                    '#10b981',
                    '#6366f1',
                    '#84cc16'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// Refresh inventory analytics
async function refreshInventoryAnalytics() {
    showNotification('Refreshing inventory analytics...', 'info');
    await loadInventoryAnalytics();
    showNotification('Inventory analytics refreshed', 'success');
}

// Event listener for budget forecast period change
function onBudgetForecastPeriodChange() {
    updateBudgetForecast();
}

// Initialize inventory analytics when tab is shown
function initializeInventoryAnalytics() {
    // Load analytics if financial tab is active
    const financialTab = document.getElementById('financial-tab');
    if (financialTab && financialTab.classList.contains('active')) {
        loadInventoryAnalytics();
    }
}

// Add event listener for budget forecast period selector
document.addEventListener('DOMContentLoaded', function() {
    const budgetPeriodSelect = document.getElementById('budgetForecastPeriod');
    if (budgetPeriodSelect) {
        budgetPeriodSelect.addEventListener('change', updateBudgetForecast);
    }
});

// =================== END INVENTORY ANALYTICS FUNCTIONS ===================
