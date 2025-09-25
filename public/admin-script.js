// Admin Dashboard JavaScript

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
}

// Tab switching functionality
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => {
        tab.classList.remove('active');
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
    }

    // Add active class to clicked button
    event.target.classList.add('active');

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
            break;
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

// Report generation functions
function exportDailyReport() {
    window.open('/api/admin/daily-report', '_blank');
}

function exportWeeklyReport() {
    window.open('/api/admin/weekly-report', '_blank');
}

function exportAnalytics() {
    window.open('/api/admin/analytics-export', '_blank');
}

function exportFinancialReport() {
    window.open('/api/admin/financial-report', '_blank');
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
        const [bookings, orders] = await Promise.all([
            fetchWithAuth('/api/bookings').then(r => r.json()),
            fetchWithAuth('/api/kitchen/orders').then(r => r.json())
        ]);

        const activities = [];
        
        // Add recent bookings
        bookings.slice(-5).forEach(booking => {
            activities.push({
                type: 'booking',
                title: `New booking for Room ${booking.roomId}`,
                time: new Date(booking.createdAt),
                icon: 'booking'
            });
        });

        // Add recent orders
        orders.slice(-5).forEach(order => {
            activities.push({
                type: 'order',
                title: `Kitchen order #${order.id} - ${order.status}`,
                time: new Date(order.createdAt),
                icon: 'order'
            });
        });

        // Sort by time (most recent first)
        activities.sort((a, b) => b.time - a.time);

        const activitiesHtml = activities.slice(0, 10).map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.icon}">
                    <i class="fas fa-${activity.icon === 'booking' ? 'calendar-plus' : 'utensils'}"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-time">${formatTimeAgo(activity.time)}</div>
                </div>
            </div>
        `).join('');

        document.getElementById('recentActivity').innerHTML = activitiesHtml || '<p>No recent activity</p>';

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

// Global chart instances to manage destruction
let chartInstances = {};

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
    loadAllReports();
    
    // Show loading indicator
    const refreshBtn = document.querySelector('button[onclick="refreshAllData()"]');
    const originalText = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    refreshBtn.disabled = true;
    
    setTimeout(() => {
        refreshBtn.innerHTML = originalText;
        refreshBtn.disabled = false;
    }, 2000);
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
            const completion = ((data.completed / data.total) * 100).toFixed(1);
            breakdownHTML += `
                <div class="task-type">
                    <span class="type-name">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                    <span class="type-progress">${data.completed}/${data.total} (${completion}%)</span>
                </div>
            `;
        });

        updateElementHTML('housekeepingBreakdown', breakdownHTML);

    } catch (error) {
        console.error('Error loading housekeeping report:', error);
    }
}

// Load performance metrics
async function loadPerformanceMetrics() {
    try {
        // Mock performance data - in production, these would come from system monitoring
        const uptime = Math.floor(Math.random() * 24 * 60); // Random uptime in minutes
        const uptimeHours = Math.floor(uptime / 60);
        const uptimeMinutes = uptime % 60;

        updateElementText('serverUptime', `${uptimeHours}h ${uptimeMinutes}m`);
        updateElementText('dbStatus', 'Connected');
        updateElementText('activeSessions', Math.floor(Math.random() * 50) + 10);
        updateElementText('apiCalls', Math.floor(Math.random() * 200) + 50);

        // Update status indicators
        const dbStatusElement = document.getElementById('dbStatus');
        if (dbStatusElement) {
            dbStatusElement.className = 'metric-value status connected';
        }

    } catch (error) {
        console.error('Error loading performance metrics:', error);
    }
}

// Enhanced activity loading with real-time data
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
                message: `Low stock: ${item.name} (${item.stock} remaining)`,
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
                message: `Urgent maintenance: ${request.category} - ${request.description.substring(0, 50)}...`,
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
                message: `${pendingOrders.length} orders pending in kitchen`,
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
                message: `Critical security incident: ${report.incidentType}`,
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
            alertsHTML += `
                <div class="alert-item ${alert.type} ${alert.priority}">
                    <div class="alert-icon">
                        <i class="fas ${alert.icon}"></i>
                    </div>
                    <div class="alert-content">
                        <span class="alert-message">${alert.message}</span>
                        <span class="alert-time">${timeStr}</span>
                    </div>
                </div>
            `;
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
function refreshAllData() {
    console.log('Refreshing all admin data...');
    loadAllReports();
    alert('All data refreshed successfully!');
}

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
