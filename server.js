const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Content Security Policy for Electron packaged apps
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', 
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://localhost:* https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com https://fonts.gstatic.com; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com; " +
        "style-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com; " +
        "img-src 'self' data: blob: http://localhost:*; " +
        "connect-src 'self' http://localhost:* https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com https://fonts.gstatic.com; " +
        "font-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.gstatic.com https://fonts.googleapis.com;"
    );
    next();
});

// Session management for staff authentication
const crypto = require('crypto');

// Simple JWT-like token system for serverless compatibility
function createToken(staff) {
  const payload = {
    id: staff.id,
    name: staff.name,
    position: staff.position,
    permissions: staff.permissions,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  const secret = process.env.JWT_SECRET || 'hotel-manager-secret-key';
  const token = Buffer.from(JSON.stringify(payload)).toString('base64') + '.' + 
                crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  return token;
}

function verifyToken(token) {
  try {
    const [payloadB64, signature] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
    
    // Check expiration
    if (payload.exp < Date.now()) {
      return null;
    }
    
    // Verify signature
    const secret = process.env.JWT_SECRET || 'hotel-manager-secret-key';
    const expectedSignature = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    return payload;
  } catch (err) {
    return null;
  }
}

// Authentication middleware
function requireStaffAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization || req.headers['x-auth-token'];
  if (!authHeader) {
    console.warn('Auth failed: missing Authorization header');
    return res.status(401).json({ error: 'Authentication required' });
  }
  let token;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof authHeader === 'string' && authHeader.length > 20) {
    // Fallback: raw token in x-auth-token or non-Bearer header
    token = authHeader;
  }
  if (!token) {
    console.warn('Auth failed: malformed Authorization header', authHeader);
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const payload = verifyToken(token);
  if (!payload) {
    console.warn('Auth failed: invalid or expired token');
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  req.staff = payload;
  console.log('Token verified successfully for:', payload.name);
  next();
}

// Admin authentication middleware
function requireAdminAuth(req, res, next) {
    requireStaffAuth(req, res, (err) => {
        if (err) return next(err);
        
        // Only Director (position: 'director') has admin access for staff management
        if (req.staff.position !== 'director') {
            console.log('Access denied for position:', req.staff.position, 'User:', req.staff.personalId);
            return res.status(403).json({ 
                error: 'Director access required',
                message: 'Only the Hotel Director can manage staff members',
                currentPosition: req.staff.position,
                requiredPosition: 'director'
            });
        }
        
        console.log('Admin access granted for Director:', req.staff.personalId);
        next();
    });
}

// Publicly serve static assets (HTML/CSS/JS). Auth is enforced on API routes.
app.use(express.static(path.join(__dirname, 'public')));

// Routes that don't require authentication
app.get('/', (req, res) => {
  res.redirect('/staff-login.html');
});

// Explicit route (optional): serve login page
app.get('/staff-login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'staff-login.html'));
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Protect API routes only
app.use('/api/admin', requireAdminAuth);
app.use('/api', (req, res, next) => {
  // Allow auth endpoints and quick clock endpoint without prior token
  if (req.path === '/staff/authenticate' || 
      req.path === '/staff/logout' || 
      req.path === '/staff/clock') {
    return next();
  }
  return requireStaffAuth(req, res, next);
});

// Normalize JSON responses globally: ensure `id` is a string (from _id when present)
// and include `legacyId` explicitly when available (or fall back to numeric `id`).
const originalJson = app.response.json;
app.response.json = function (body) {
  function transform(obj) {
    if (Array.isArray(obj)) return obj.map(transform);
    if (obj && typeof obj === 'object' && !(obj instanceof Error)) {
      const out = { ...obj };
      if (out._id && !out.id) out.id = out._id.toString();
      // ensure id is a string when it's an ObjectId
      if (out.id && typeof out.id !== 'string') out.id = String(out.id);
      // populate legacyId for in-memory objects that use numeric `id`
      if (out.legacyId === undefined) {
        if (typeof out.id === 'string' && /^[0-9]+$/.test(out.id)) {
          out.legacyId = Number(out.id);
        } else if (typeof out.id === 'number') {
          out.legacyId = out.id;
        }
      }
      return out;
    }
    return obj;
  }
  const transformed = transform(body);
  return originalJson.call(this, transformed);
};

// In-memory storage (replace with database in production)
// Core hotel data arrays with sample data
let rooms = [];

let customers = [
    { 
        id: 1, 
        name: 'John Smith', 
        email: 'john.smith@email.com', 
        phone: '+234 901 234 5678',
        address: '123 Victoria Island, Lagos',
        checkIn: '2025-09-19',
        checkOut: '2025-09-22',
        roomName: 'Berlin',
        totalAmount: 120000,
        status: 'Checked In'
    },
    { 
        id: 2, 
        name: 'Sarah Johnson', 
        email: 'sarah.johnson@email.com', 
        phone: '+234 802 345 6789',
        address: '456 Lekki Phase 1, Lagos',
        checkIn: '2025-09-20',
        checkOut: '2025-09-23',
        roomName: 'Amsterdam',
        totalAmount: 120000,
        status: 'Checked In'
    },
    { 
        id: 3, 
        name: 'Michael Chen', 
        email: 'michael.chen@email.com', 
        phone: '+234 703 456 7890',
        address: '789 Ikeja GRA, Lagos',
        checkIn: '2025-09-18',
        checkOut: '2025-09-21',
        roomName: 'New York',
        totalAmount: 180000,
        status: 'Checked In'
    },
    { 
        id: 4, 
        name: 'Emma Williams', 
        email: 'emma.williams@email.com', 
        phone: '+234 804 567 8901',
        address: '321 Ajah, Lagos',
        checkIn: '2025-09-25',
        checkOut: '2025-09-28',
        roomNumber: null,
        totalAmount: 0,
        status: 'Reservation'
    }
];

let barInventory = [
    { id: 1, name: 'Heineken Beer', category: 'Beer', quantity: 48, unit: 'bottles', price: 800, minStock: 20 },
    { id: 2, name: 'Wine - Cabernet Sauvignon', category: 'Wine', quantity: 12, unit: 'bottles', price: 8500, minStock: 5 },
    { id: 3, name: 'Whiskey - Johnny Walker Black', category: 'Spirits', quantity: 8, unit: 'bottles', price: 15000, minStock: 3 },
    { id: 4, name: 'Coca Cola', category: 'Soft Drinks', quantity: 36, unit: 'bottles', price: 300, minStock: 24 },
    { id: 5, name: 'Orange Juice', category: 'Juices', quantity: 18, unit: 'bottles', price: 600, minStock: 12 },
    { id: 6, name: 'Vodka - Grey Goose', category: 'Spirits', quantity: 6, unit: 'bottles', price: 18000, minStock: 2 }
];

let kitchenOrders = [
    {
        id: 1,
        customerName: 'John Smith',
        roomNumber: 102,
        items: [
            { name: 'Grilled Chicken', quantity: 1, price: 4500 },
            { name: 'Jollof Rice', quantity: 1, price: 2000 },
            { name: 'Bottled Water', quantity: 2, price: 300 }
        ],
        total: 7100,
        status: 'Preparing',
        orderTime: '2025-09-20T08:30:00',
        estimatedReady: '2025-09-20T09:15:00',
        assignedChef: 'David Kitchen'
    },
    {
        id: 2,
        customerName: 'Sarah Johnson',
        roomNumber: 202,
        items: [
            { name: 'Continental Breakfast', quantity: 2, price: 3500 },
            { name: 'Fresh Orange Juice', quantity: 2, price: 800 }
        ],
        total: 8600,
        status: 'Ready',
        orderTime: '2025-09-20T07:45:00',
        readyTime: '2025-09-20T08:20:00',
        assignedChef: 'David Kitchen'
    },
    {
        id: 3,
        customerName: 'Michael Chen',
        roomNumber: 301,
        items: [
            { name: 'Pizza Margherita', quantity: 1, price: 5000 },
            { name: 'Caesar Salad', quantity: 1, price: 2500 }
        ],
        total: 7500,
        status: 'Delivered',
        orderTime: '2025-09-20T07:00:00',
        deliveredTime: '2025-09-20T07:45:00',
        assignedChef: 'David Kitchen'
    }
];

// Kitchen inventory management
let kitchenInventory = [
    { 
        id: 1, 
        name: 'Rice (25kg bag)', 
        category: 'Grains', 
        currentStock: 5, 
        unit: 'bags', 
        costPerUnit: 15000, 
        totalValue: 75000, 
        minStock: 2, 
        supplier: 'Rice Mills Ltd', 
        lastPurchased: '2025-01-10', 
        expiryDate: '2025-12-31' 
    },
    { 
        id: 2, 
        name: 'Chicken (whole)', 
        category: 'Meat', 
        currentStock: 20, 
        unit: 'pcs', 
        costPerUnit: 3500, 
        totalValue: 70000, 
        minStock: 5, 
        supplier: 'Fresh Farm Poultry', 
        lastPurchased: '2025-01-15', 
        expiryDate: '2025-01-20' 
    },
    { 
        id: 3, 
        name: 'Tomatoes', 
        category: 'Vegetables', 
        currentStock: 30, 
        unit: 'kg', 
        costPerUnit: 800, 
        totalValue: 24000, 
        minStock: 10, 
        supplier: 'Green Valley Farms', 
        lastPurchased: '2025-01-16', 
        expiryDate: '2025-01-23' 
    },
    { 
        id: 4, 
        name: 'Onions', 
        category: 'Vegetables', 
        currentStock: 25, 
        unit: 'kg', 
        costPerUnit: 600, 
        totalValue: 15000, 
        minStock: 8, 
        supplier: 'Green Valley Farms', 
        lastPurchased: '2025-01-16', 
        expiryDate: '2025-02-15' 
    },
    { 
        id: 5, 
        name: 'Vegetable Oil', 
        category: 'Cooking Oil', 
        currentStock: 10, 
        unit: 'liters', 
        costPerUnit: 1200, 
        totalValue: 12000, 
        minStock: 3, 
        supplier: 'Golden Oil Co', 
        lastPurchased: '2025-01-12', 
        expiryDate: '2025-12-31' 
    },
    { 
        id: 6, 
        name: 'Salt', 
        category: 'Seasoning', 
        currentStock: 5, 
        unit: 'kg', 
        costPerUnit: 300, 
        totalValue: 1500, 
        minStock: 2, 
        supplier: 'Crystal Salt Ltd', 
        lastPurchased: '2025-01-10', 
        expiryDate: '2026-01-10' 
    }
];

let kitchenPurchases = [
    { id: 1, itemName: 'Rice (25kg bag)', quantity: 5, costPerUnit: 15000, totalCost: 75000, supplier: 'Rice Mills Ltd', purchaseDate: '2025-01-10', staffName: 'David Kitchen', notes: 'Monthly rice supply' },
    { id: 2, itemName: 'Chicken (whole)', quantity: 20, costPerUnit: 3500, totalCost: 70000, supplier: 'Fresh Farm Poultry', purchaseDate: '2025-01-15', staffName: 'David Kitchen', notes: 'Fresh chicken for weekend orders' },
    { id: 3, itemName: 'Mixed Vegetables', quantity: 50, costPerUnit: 500, totalCost: 25000, supplier: 'Green Valley Farms', purchaseDate: '2025-01-16', staffName: 'David Kitchen', notes: 'Tomatoes, onions, peppers mix' }
];

let bookings = [
    {
        id: 1,
        customerId: 1,
        customerName: 'John Smith',
        roomId: 2,
        roomNumber: 102,
        checkIn: '2025-09-19',
        checkOut: '2025-09-22',
        nights: 3,
        totalAmount: 75000,
        status: 'Active',
        bookingDate: '2025-09-15'
    },
    {
        id: 2,
        customerId: 2,
        customerName: 'Sarah Johnson',
        roomId: 5,
        roomNumber: 202,
        checkIn: '2025-09-20',
        checkOut: '2025-09-23',
        nights: 3,
        totalAmount: 105000,
        status: 'Active',
        bookingDate: '2025-09-17'
    },
    {
        id: 3,
        customerId: 4,
        customerName: 'Emma Williams',
        roomId: 8,
        roomNumber: 205,
        checkIn: '2025-09-25',
        checkOut: '2025-09-28',
        nights: 3,
        totalAmount: 165000,
        status: 'Confirmed',
        bookingDate: '2025-09-18'
    }
];

let policeReports = [
    {
        id: 1,
        incident: 'Noise Complaint',
        location: 'Room 302',
        reportedBy: 'Bob Reception',
        description: 'Guest in room 301 reported loud music from neighboring room',
        status: 'Resolved',
        reportTime: '2025-09-19T23:30:00',
        resolvedTime: '2025-09-19T23:45:00',
        actionTaken: 'Spoke with guests, volume reduced'
    },
    {
        id: 2,
        incident: 'Lost Property',
        location: 'Hotel Lobby',
        reportedBy: 'Carol Housekeeping',
        description: 'Expensive watch found during cleaning',
        status: 'Reported to Police',
        reportTime: '2025-09-20T06:15:00',
        policeReference: 'LP2025092001'
    }
];

let payments = [
    {
        id: 1,
        customerId: 1,
        customerName: 'John Smith',
        amount: 75000,
        paymentMethod: 'Card',
        description: 'Room booking payment - Room 102',
        status: 'Completed',
        transactionId: 'TXN20250919001',
        timestamp: '2025-09-19T14:30:00'
    },
    {
        id: 2,
        customerId: 2,
        customerName: 'Sarah Johnson',
        amount: 105000,
        paymentMethod: 'Bank Transfer',
        description: 'Room booking payment - Room 202',
        status: 'Completed',
        transactionId: 'TXN20250920001',
        timestamp: '2025-09-20T09:15:00'
    },
    {
        id: 3,
        customerId: 1,
        customerName: 'John Smith',
        amount: 7100,
        paymentMethod: 'Room Charge',
        description: 'Kitchen order - Grilled Chicken & Rice',
        status: 'Pending',
        timestamp: '2025-09-20T08:30:00'
    }
];

let notifications = [
    {
        id: 1,
        title: 'Room 205 Maintenance Required',
        message: 'Air conditioning unit needs immediate attention',
        type: 'Alert',
        priority: 'high',
        recipient: 'Maintenance Team',
        status: 'Unread',
        read: false,
        createdAt: '2025-09-24T08:20:00Z'
    },
    {
        id: 2,
        title: 'Low Stock Alert',
        message: 'Coffee beans running low - current stock: 12kg',
        type: 'Warning',
        priority: 'medium',
        recipient: 'All Staff',
        status: 'Read',
        read: true,
        createdAt: '2025-09-24T06:00:00Z'
    },
    {
        id: 3,
        title: 'New Booking Confirmed',
        message: 'Emma Williams - Room 205, Check-in: Sept 25',
        type: 'Info',
        priority: 'normal',
        recipient: 'Reception',
        status: 'Unread',
        read: false,
        createdAt: '2025-09-24T07:45:00Z'
    }
];
let staff = [
    {
        id: 1,
        personalId: 'EMP001',
        name: 'Alice Manager',
        position: 'Hotel Manager',
        department: 'Administration',
        email: 'alice.manager@hotel.com',
        phone: '+234 901 111 1111',
        status: 'on-duty',
        shift: 'Day',
        clockIn: '2025-09-20T08:00:00',
        salary: 350000
    },
    {
        id: 2,
        personalId: 'EMP002',
        name: 'Bob Reception',
        position: 'Front Desk Agent',
        department: 'Reception',
        email: 'bob.reception@hotel.com',
        phone: '+234 902 222 2222',
        status: 'on-duty',
        shift: 'Day',
        clockIn: '2025-09-20T08:00:00',
        salary: 180000
    },
    {
        id: 3,
        personalId: 'EMP003',
        name: 'Carol Housekeeping',
        position: 'Housekeeping Supervisor',
        department: 'Housekeeping',
        email: 'carol.housekeeping@hotel.com',
        phone: '+234 903 333 3333',
        status: 'on-duty',
        shift: 'Day',
        clockIn: '2025-09-20T06:00:00',
        salary: 200000
    },
    {
        id: 4,
        personalId: 'EMP004',
        name: 'David Kitchen',
        position: 'Head Chef',
        department: 'Kitchen',
        email: 'david.kitchen@hotel.com',
        phone: '+234 904 444 4444',
        status: 'on-duty',
        shift: 'Day',
        clockIn: '2025-09-20T06:30:00',
        salary: 250000
    }
];

let schedules = [
    {
        id: 1,
        employeeId: 'EMP001',
        employeeName: 'Alice Manager',
        date: '2025-09-20',
        shift: 'Day',
        startTime: '08:00',
        endTime: '18:00',
        status: 'Scheduled'
    },
    {
        id: 2,
        employeeId: 'EMP002',
        employeeName: 'Bob Reception',
        date: '2025-09-20',
        shift: 'Day',
        startTime: '08:00',
        endTime: '16:00',
        status: 'Scheduled'
    },
    {
        id: 3,
        employeeId: 'EMP003',
        employeeName: 'Carol Housekeeping',
        date: '2025-09-20',
        shift: 'Day',
        startTime: '06:00',
        endTime: '14:00',
        status: 'Scheduled'
    }
];

let timeRecords = [
    {
        id: 1,
        employeeId: 'EMP001',
        employeeName: 'Alice Manager',
        date: '2025-09-20',
        clockIn: '08:00:00',
        clockOut: null,
        totalHours: 0,
        status: 'Active'
    },
    {
        id: 2,
        employeeId: 'EMP002',
        employeeName: 'Bob Reception',
        date: '2025-09-20',
        clockIn: '08:00:00',
        clockOut: null,
        totalHours: 0,
        status: 'Active'
    },
    {
        id: 3,
        employeeId: 'EMP003',
        employeeName: 'Carol Housekeeping',
        date: '2025-09-19',
        clockIn: '06:00:00',
        clockOut: '14:00:00',
        totalHours: 8,
        status: 'Completed'
    }
];

let maintenanceRequests = [
    {
        id: 1,
        roomNumber: 205,
        issue: 'Air conditioning not working',
        description: 'AC unit makes loud noise and not cooling properly',
        priority: 'High',
        status: 'Open',
        requestedBy: 'Carol Housekeeping',
        requestDate: '2025-09-20T08:20:00',
        estimatedCompletion: '2025-09-20T16:00:00'
    },
    {
        id: 2,
        roomNumber: 201,
        issue: 'Leaky faucet',
        description: 'Bathroom sink faucet dripping constantly',
        priority: 'Medium',
        status: 'In Progress',
        requestedBy: 'Bob Reception',
        requestDate: '2025-09-19T14:30:00',
        assignedTo: 'Maintenance Team',
        startedAt: '2025-09-20T07:00:00'
    }
];

let supplies = [
    {
        id: 1,
        name: 'Bed Sheets (Queen)',
        category: 'Linens',
        currentStock: 45,
        minStock: 20,
        unit: 'sets',
        location: 'Housekeeping Storage',
        lastRestocked: '2025-09-18'
    },
    {
        id: 2,
        name: 'Bathroom Cleaner',
        category: 'Cleaning',
        currentStock: 18,
        minStock: 10,
        unit: 'bottles',
        location: 'Cleaning Supplies',
        lastRestocked: '2025-09-19'
    },
    {
        id: 3,
        name: 'Mini Shampoo',
        category: 'Amenities',
        currentStock: 120,
        minStock: 50,
        unit: 'bottles',
        location: 'Guest Amenities',
        lastRestocked: '2025-09-17'
    }
];

let cleaningTasks = [
    {
        id: 1,
        roomName: 'Madrid',
        type: 'Checkout Cleaning',
        status: 'completed',
        assignee: 'Carol Housekeeping',
        instructions: 'Deep cleaned, restocked amenities',
        createdAt: '2025-09-20T06:00:00',
        completedTime: '2025-09-20T07:30:00'
    },
    {
        id: 2,
        roomName: 'Barcelona',
        type: 'Maintenance Cleaning',
        status: 'in-progress',
        assignee: 'Carol Housekeeping',
        instructions: 'Preparing room after plumbing repair',
        createdAt: '2025-09-20T08:00:00'
    },
    {
        id: 3,
        roomName: 'Dallas',
        type: 'Daily Cleaning',
        status: 'pending',
        assignee: 'Carol Housekeeping',
        instructions: 'Standard daily room cleaning',
        createdAt: '2025-09-20T10:00:00'
    },
    {
        id: 4,
        roomName: null,
        type: 'Lobby Cleaning',
        status: 'pending',
        assignee: 'Housekeeping Team',
        instructions: 'Clean lobby area, vacuum carpets, dust furniture',
        createdAt: '2025-09-24T09:00:00'
    }
];
let serviceRequests = [
    {
        id: 1,
        guestName: 'John Smith',
        roomNumber: 102,
        serviceType: 'Room Service',
        description: 'Extra towels and pillows',
        priority: 'Normal',
        status: 'Completed',
        requestTime: '2025-09-20T07:30:00',
        completedTime: '2025-09-20T08:00:00',
        assignedTo: 'Carol Housekeeping'
    },
    {
        id: 2,
        guestName: 'Sarah Johnson',
        roomNumber: 202,
        serviceType: 'Concierge',
        description: 'Restaurant reservation for tonight',
        priority: 'Normal',
        status: 'In Progress',
        requestTime: '2025-09-20T08:15:00',
        assignedTo: 'Bob Reception'
    },
    {
        id: 3,
        guestName: 'Michael Chen',
        roomNumber: 301,
        serviceType: 'Transportation',
        description: 'Airport pickup service tomorrow 6 AM',
        priority: 'High',
        status: 'Confirmed',
        requestTime: '2025-09-20T06:45:00',
        scheduledTime: '2025-09-21T06:00:00',
        assignedTo: 'Transportation Team'
    }
];

let guestFeedback = [
    {
        id: 1,
        guestName: 'John Smith',
        roomNumber: 102,
        rating: 5,
        category: 'Service',
        comment: 'Excellent service from the front desk team!',
        timestamp: '2025-09-20T07:15:00',
        status: 'Acknowledged'
    },
    {
        id: 2,
        guestName: 'Sarah Johnson',
        roomNumber: 202,
        rating: 4,
        category: 'Room Quality',
        comment: 'Room was clean but AC could be better',
        timestamp: '2025-09-20T06:30:00',
        status: 'Under Review'
    },
    {
        id: 3,
        guestName: 'Michael Chen',
        roomNumber: 301,
        rating: 5,
        category: 'Food & Beverage',
        comment: 'Amazing breakfast! Chef David is fantastic',
        timestamp: '2025-09-20T08:45:00',
        status: 'New'
    }
];

let lostFoundItems = [
    {
        id: 1,
        itemDescription: 'Black leather wallet',
        location: 'Room 103',
        foundDate: '2025-09-19',
        foundBy: 'Carol Housekeeping',
        status: 'Unclaimed',
        storedLocation: 'Front Desk Safe'
    },
    {
        id: 2,
        itemDescription: 'Gold watch - Rolex',
        location: 'Hotel Lobby',
        foundDate: '2025-09-20',
        foundBy: 'Bob Reception',
        status: 'Claimed',
        claimedBy: 'Guest - Room 205',
        claimedDate: '2025-09-20T08:30:00'
    },
    {
        id: 3,
        itemDescription: 'iPhone 14 Pro',
        location: 'Restaurant Area',
        foundDate: '2025-09-20',
        foundBy: 'David Kitchen',
        status: 'Unclaimed',
        storedLocation: 'Manager Office'
    }
];

let internalMessages = [
    {
        id: 1,
        from: 'Alice Manager',
        to: 'All Staff',
        subject: 'Weekly Team Meeting',
        message: 'Team meeting scheduled for tomorrow at 2 PM in conference room',
        timestamp: '2025-09-20T07:00:00',
        priority: 'Normal',
        status: 'Sent'
    },
    {
        id: 2,
        from: 'Carol Housekeeping',
        to: 'Alice Manager',
        subject: 'Room 205 Maintenance',
        message: 'AC unit in room 205 needs immediate attention',
        timestamp: '2025-09-20T08:20:00',
        priority: 'High',
        status: 'Read'
    }
];

let callLogs = [
    {
        id: 1,
        caller: 'External',
        number: '+234 801 234 5678',
        direction: 'Incoming',
        duration: '00:03:45',
        timestamp: '2025-09-20T07:30:00',
        handledBy: 'Bob Reception',
        purpose: 'Room availability inquiry',
        outcome: 'Booking created'
    },
    {
        id: 2,
        caller: 'Room 102',
        number: 'Ext. 102',
        direction: 'Incoming',
        duration: '00:02:15',
        timestamp: '2025-09-20T08:15:00',
        handledBy: 'Bob Reception',
        purpose: 'Room service request',
        outcome: 'Transferred to housekeeping'
    }
];
// Initialize arrays with sample data
let laundryTasks = [
    {
        id: 1,
        type: 'Towels & Linens - Room 101',
        status: 'In Progress', 
        assignee: 'Maria Santos',
        instructions: 'Standard wash cycle, extra fabric softener',
        createdAt: new Date('2025-09-20T06:00:00'),
        dueDate: new Date('2025-09-20T12:00:00')
    },
    {
        id: 2,
        type: 'Dry Cleaning - Guest Clothes',
        status: 'Pending',
        assignee: 'John Peterson',
        instructions: 'Formal wear, handle with care',
        createdAt: new Date('2025-09-20T07:30:00'),
        dueDate: new Date('2025-09-21T10:00:00')
    },
    {
        id: 3,
        type: 'Bedding - Room 205',
        status: 'Completed',
        assignee: 'Maria Santos',
        instructions: 'Deep clean stains, sanitize',
        createdAt: new Date('2025-09-19T14:00:00'),
        dueDate: new Date('2025-09-20T08:00:00'),
        completedAt: new Date('2025-09-20T07:45:00')
    }
];

let scanPayOrders = [
    {
        id: 1,
        customerId: 'CUST001',
        orderNumber: 'SP-001',
        orderType: 'dine-in',
        tableNumber: '3',
        items: 'Coffee, Sandwich, Bottled Water',
        amount: 2850,
        paymentMethod: 'qr-code',
        notes: 'Extra napkins requested',
        status: 'completed',
        createdAt: '2025-09-20T08:15:00'
    },
    {
        id: 2,
        customerId: 'CUST002',
        orderNumber: 'SP-002',
        orderType: 'room-service',
        tableNumber: null,
        items: 'Room Service - Breakfast (Full English)',
        amount: 5500,
        paymentMethod: 'mobile-app',
        notes: 'Deliver to Room 304',
        status: 'pending',
        createdAt: '2025-09-20T08:30:00'
    },
    {
        id: 3,
        customerId: 'CUST003',
        orderNumber: 'SP-003',
        orderType: 'takeaway',
        tableNumber: null,
        items: 'Chicken Burger, Fries, Coke',
        amount: 3200,
        paymentMethod: 'nfc',
        notes: 'Ready in 15 minutes',
        status: 'preparing',
        createdAt: '2025-09-24T22:30:00'
    }
];

let hrRecords = [
    {
        id: 1,
        employeeId: 'EMP001',
        name: 'Alice Manager',
        position: 'Hotel Manager',
        department: 'Administration',
        salary: 350000,
        hireDate: '2023-01-15',
        status: 'Active',
        performance: 'Excellent',
        lastReview: '2024-06-15'
    },
    {
        id: 2,
        employeeId: 'EMP002',
        name: 'Bob Reception',
        position: 'Front Desk Agent',
        department: 'Reception',
        salary: 180000,
        hireDate: '2023-03-01',
        status: 'Active',
        performance: 'Good',
        lastReview: '2024-07-20'
    },
    {
        id: 3,
        employeeId: 'EMP003',
        name: 'Carol Housekeeping',
        position: 'Housekeeping Supervisor',
        department: 'Housekeeping',
        salary: 200000,
        hireDate: '2023-02-10',
        status: 'Active',
        performance: 'Very Good',
        lastReview: '2024-08-05'
    }
];

let stockItems = [
    {
        id: 1,
        name: 'Toilet Paper',
        category: 'Hygiene',
        currentStock: 150,
        minStock: 50,
        maxStock: 200,
        unit: 'rolls',
        supplier: 'CleanCorp Ltd',
        lastRestocked: '2025-09-18',
        cost: 85
    },
    {
        id: 2,
        name: 'Towels (Bath)',
        category: 'Linens',
        currentStock: 45,
        minStock: 30,
        maxStock: 80,
        unit: 'pieces',
        supplier: 'LinenPlus',
        lastRestocked: '2025-09-15',
        cost: 1500
    },
    {
        id: 3,
        name: 'Coffee Beans',
        category: 'F&B',
        currentStock: 12,
        minStock: 20,
        maxStock: 50,
        unit: 'kg',
        supplier: 'Premium Coffee Co',
        lastRestocked: '2025-09-19',
        cost: 2800
    },
    {
        id: 4,
        name: 'Shampoo',
        category: 'Amenities',
        currentStock: 85,
        minStock: 40,
        maxStock: 120,
        unit: 'bottles',
        supplier: 'LuxCare Products',
        lastRestocked: '2025-09-17',
        cost: 450
    }
];

let stockTransfers = [
    {
        id: 1,
        from: 'Main Store',
        to: 'Housekeeping Department',
        items: [
            { name: 'Toilet Paper', quantity: 25, unit: 'rolls' },
            { name: 'Towels (Bath)', quantity: 10, unit: 'pieces' }
        ],
        requestedBy: 'Carol Housekeeping',
        approvedBy: 'Alice Manager',
        status: 'Completed',
        requestDate: '2025-09-20T06:00:00',
        completedDate: '2025-09-20T07:30:00'
    },
    {
        id: 2,
        from: 'Main Store',
        to: 'Bar',
        items: [
            { name: 'Coffee Beans', quantity: 3, unit: 'kg' }
        ],
        requestedBy: 'David Kitchen',
        approvedBy: 'Alice Manager',
        status: 'Pending',
        requestDate: '2025-09-20T08:00:00'
    }
];

let messagingThreads = [
    {
        id: 1,
        title: 'Staff Meeting - Weekly Update',
        participants: ['Alice Manager', 'Bob Reception', 'Carol Housekeeping', 'David Kitchen'],
        lastMessage: 'Meeting scheduled for tomorrow at 2 PM',
        lastMessageTime: '2025-09-20T07:45:00',
        unreadCount: 2,
        priority: 'Normal'
    },
    {
        id: 2,
        title: 'Room 205 Maintenance Issue',
        participants: ['Alice Manager', 'Carol Housekeeping'],
        lastMessage: 'Air conditioning unit needs repair',
        lastMessageTime: '2025-09-20T08:20:00',
        unreadCount: 1,
        priority: 'High'
    }
];

let locations = [
    {
        id: 1,
        name: 'Hotel Reception',
        type: 'Public Area',
        floor: 'Ground Floor',
        capacity: 20,
        amenities: ['WiFi', 'Seating', 'Information Desk'],
        status: 'Active',
        coordinates: { lat: 6.5244, lng: 3.3792 }
    },
    {
        id: 2,
        name: 'Pool Area',
        type: 'Recreation',
        floor: 'Ground Floor',
        capacity: 50,
        amenities: ['Swimming Pool', 'Pool Bar', 'Loungers'],
        status: 'Active',
        coordinates: { lat: 6.5245, lng: 3.3794 }
    },
    {
        id: 3,
        name: 'Spa & Wellness Center',
        type: 'Service',
        floor: 'First Floor',
        capacity: 15,
        amenities: ['Massage Rooms', 'Sauna', 'Jacuzzi'],
        status: 'Active',
        coordinates: { lat: 6.5243, lng: 3.3790 }
    }
];

let automatedMessages = [];
let clockInRecords = [];
let staffShifts = [];
let emergencyContacts = [];

// Initialize hotel staff with demo credentials that match the frontend
const staffList = [
  // Demo staff that match the frontend login screen
  { id: 1, personalId: 'EMP001', name: 'Alice Manager', email: 'alice@9jaluxury.com', phone: '555-1001', position: 'management', shift: 'all-day', hourlyRate: 25000, startDate: '2024-01-01', status: 'on-duty', pin: '1234', department: 'Management', createdAt: new Date(), permissions: { rooms: true, customers: true, bar: true, kitchen: true, payments: true, reports: true, staff: true, settings: true } },
  { id: 2, personalId: 'EMP002', name: 'Bob Reception', email: 'bob@9jaluxury.com', phone: '555-2002', position: 'front-desk', shift: 'morning', hourlyRate: 12000, startDate: '2024-01-01', status: 'on-duty', pin: '2345', department: 'Front Office', createdAt: new Date(), permissions: { rooms: true, customers: true, bar: false, kitchen: false, payments: true, reports: false, staff: false, settings: false } },
  { id: 3, personalId: 'EMP003', name: 'Carol Housekeeping', email: 'carol@9jaluxury.com', phone: '555-3003', position: 'housekeeping', shift: 'morning', hourlyRate: 10000, startDate: '2024-01-01', status: 'on-duty', pin: '3456', department: 'Housekeeping', createdAt: new Date(), permissions: { rooms: true, customers: false, bar: false, kitchen: false, payments: false, reports: false, staff: false, settings: false } },
  { id: 4, personalId: 'EMP004', name: 'David Kitchen', email: 'david@9jaluxury.com', phone: '555-4004', position: 'kitchen', shift: 'all-day', hourlyRate: 11000, startDate: '2024-01-01', status: 'on-duty', pin: '4567', department: 'Food & Beverage', createdAt: new Date(), permissions: { rooms: false, customers: false, bar: false, kitchen: true, payments: false, reports: false, staff: false, settings: false } },
  
  // Additional production staff (keeping original IDs for backwards compatibility)
  { id: 10, personalId: 'DIR001', name: 'Hotel Director', email: 'director@9jaluxury.com', phone: '555-1001', position: 'director', shift: 'all-day', hourlyRate: 25000, startDate: '2024-01-01', status: 'on-duty', pin: '1001', department: 'Executive', createdAt: new Date(), permissions: { rooms: true, customers: true, bar: true, kitchen: true, payments: true, reports: true, staff: true, settings: true } },
  { id: 11, personalId: 'MGR001', name: 'Hotel Manager', email: 'manager@9jaluxury.com', phone: '555-2001', position: 'management', shift: 'all-day', hourlyRate: 20000, startDate: '2024-01-01', status: 'on-duty', pin: '2001', department: 'Management', createdAt: new Date(), permissions: { rooms: true, customers: true, bar: true, kitchen: true, payments: true, reports: true, staff: true, settings: false } },
  { id: 12, personalId: 'RCP001', name: 'Reception Staff', email: 'reception@9jaluxury.com', phone: '555-3001', position: 'front-desk', shift: 'morning', hourlyRate: 12000, startDate: '2024-01-01', status: 'on-duty', pin: '3001', department: 'Front Office', createdAt: new Date(), permissions: { rooms: true, customers: true, bar: false, kitchen: false, payments: true, reports: false, staff: false, settings: false } },
  { id: 13, personalId: 'HKP001', name: 'Housekeeping Staff', email: 'housekeeping@9jaluxury.com', phone: '555-4001', position: 'housekeeping', shift: 'morning', hourlyRate: 10000, startDate: '2024-01-01', status: 'on-duty', pin: '4001', department: 'Housekeeping', createdAt: new Date(), permissions: { rooms: true, customers: false, bar: false, kitchen: false, payments: false, reports: false, staff: false, settings: false } },
  { id: 14, personalId: 'LND001', name: 'Laundry Staff', email: 'laundry@9jaluxury.com', phone: '555-5001', position: 'laundry', shift: 'morning', hourlyRate: 9000, startDate: '2024-01-01', status: 'on-duty', pin: '5001', department: 'Housekeeping', createdAt: new Date(), permissions: { rooms: true, customers: false, bar: false, kitchen: false, payments: false, reports: false, staff: false, settings: false } },
  { id: 15, personalId: 'KTC001', name: 'Kitchen Staff', email: 'kitchen@9jaluxury.com', phone: '555-6001', position: 'kitchen', shift: 'all-day', hourlyRate: 11000, startDate: '2024-01-01', status: 'on-duty', pin: '6001', department: 'Food & Beverage', createdAt: new Date(), permissions: { rooms: false, customers: false, bar: false, kitchen: true, payments: false, reports: false, staff: false, settings: false } },
  { id: 16, personalId: 'BAR001', name: 'Bar Manager', email: 'bar@9jaluxury.com', phone: '555-7001', position: 'bar-manager', shift: 'afternoon', hourlyRate: 15000, startDate: '2024-01-01', status: 'on-duty', pin: '7001', department: 'Food & Beverage', createdAt: new Date(), permissions: { rooms: false, customers: true, bar: true, kitchen: false, payments: true, reports: true, staff: false, settings: false } }
];

// Add test user from environment variables only if different from existing staff
const testStaffId = process.env.TEST_STAFF_ID || 'TEST001';
const testStaffPin = process.env.TEST_STAFF_PIN || '9999';

// Only add test user if it's not already in the staff list
if (!staffList.find(s => s.personalId === testStaffId)) {
  staffList.push({
    id: 99,
    personalId: testStaffId,
    name: 'Test Staff',
    email: 'test@hotel.com',
    phone: '555-9999',
    position: 'front-desk',
    shift: 'all-day',
    hourlyRate: 7500,
    startDate: '2024-01-01',
    status: 'on-duty',
    pin: testStaffPin,
    department: 'Testing',
    createdAt: new Date()
  });
}

staff.push(...staffList);

// Debug: Log all staff members to verify data
console.log('=== STAFF LIST DEBUG ===');
staffList.forEach(s => {
  console.log(`ID: ${s.personalId}, Name: ${s.name}, Position: ${s.position}, PIN: ${s.pin}`);
});
console.log('========================');

// The in-memory arrays below are for fallback purposes and are no longer the primary data source.
// The application connects to MongoDB and uses the models in /src/models.
// To populate the database with initial data, run the seeding script: node scripts/seed.js

// Database (optional MongoDB) - attempt connection and load models
const connectDB = require('./src/db');
let dbConnected = false;

// Load models immediately (they handle their own mongoose connection)
let Room, Customer, BarItem, KitchenOrder, Booking, Payment;
try {
  Room = require('./src/models/Room');
  Customer = require('./src/models/Customer');
  BarItem = require('./src/models/BarItem');
  KitchenOrder = require('./src/models/KitchenOrder');
  KitchenItem = require('./src/models/KitchenItem');
  Booking = require('./src/models/Booking');
  Payment = require('./src/models/Payment');
  console.log('✅ Models loaded successfully');
} catch (err) {
  console.warn('⚠️ Models not available:', err.message);
}

// Initialize database connection
async function initializeDatabase() {
  try {
    await connectDB();
    dbConnected = true;
    console.log('✅ Database connected and ready');
  } catch (err) {
    dbConnected = false;
    console.warn('⚠️ Database connection failed, using fallback data:', err.message);
  }
}

// Initialize DB when server starts
initializeDatabase();

// Admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Statistics endpoint for dashboard
app.get('/api/stats', requireStaffAuth, (req, res) => {
    const stats = {
        totalRooms: rooms.length,
        occupiedRooms: rooms.filter(r => r.status === 'occupied').length,
        availableRooms: rooms.filter(r => r.status === 'available').length,
        maintenanceRooms: rooms.filter(r => r.status === 'maintenance').length,
        totalCustomers: customers.length,
        activeBookings: bookings.filter(b => b.status === 'Active').length,
        confirmedBookings: bookings.filter(b => b.status === 'Confirmed').length,
        totalRevenue: payments.filter(p => p.status === 'Completed').reduce((sum, p) => sum + p.amount, 0),
        pendingPayments: payments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0),
        kitchenOrders: {
            preparing: kitchenOrders.filter(o => o.status === 'Preparing').length,
            ready: kitchenOrders.filter(o => o.status === 'Ready').length,
            delivered: kitchenOrders.filter(o => o.status === 'Delivered').length
        },
        staffOnDuty: staff.filter(s => s.status === 'on-duty').length,
        maintenanceRequests: maintenanceRequests.filter(r => r.status === 'Open').length,
        lowStockItems: barInventory.filter(item => item.quantity <= item.minStock).length,
        unreadNotifications: notifications.filter(n => n.status === 'Unread').length
    };
    res.json(stats);
});

// Staff authentication endpoints
app.post('/api/staff/authenticate', (req, res) => {
    const { personalId, pin } = req.body;
    
    console.log('Authentication attempt:', { personalId, pin });
    
    if (!personalId || !pin) {
        return res.status(400).json({ error: 'Personal ID and PIN required' });
    }
    
    // Find staff member by personal ID
    const staff = staffList.find(s => s.personalId === personalId);
    
    console.log('Found staff:', staff ? { id: staff.id, name: staff.name, position: staff.position } : 'NOT FOUND');
    
    if (!staff) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check PIN (in production, this would be hashed)
    if (staff.pin !== pin) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = createToken(staff);
    
    const responseData = {
        success: true,
        token: token,
        staff: {
            name: staff.name,
            personalId: staff.personalId,
            position: staff.position,
            department: staff.department,
            permissions: staff.permissions || {}
        },
        message: `Welcome, ${staff.name}!`
    };
    
    console.log('Authentication successful, sending response:', responseData);
    
    res.json(responseData);
});

app.post('/api/staff/logout', (req, res) => {
    // With JWT tokens, logout is handled client-side by removing the token
    // No server-side session to clean up
    res.json({ success: true });
});

app.get('/api/staff/verify', (req, res) => {
    console.log('[DEBUG] Token verification request received');
    
    // Manual token verification for this endpoint
    const authHeader = req.headers.authorization;
    console.log('[DEBUG] Auth header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[DEBUG] No valid auth header found');
        return res.json({ valid: false, error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    console.log('[DEBUG] Extracted token:', token);
    
    const payload = verifyToken(token);
    console.log('[DEBUG] Token payload:', payload ? 'valid' : 'invalid');
    
    if (!payload) {
        console.log('[DEBUG] Invalid token - verification failed');
        return res.json({ valid: false, error: 'Invalid token' });
    }
    
    console.log('[DEBUG] Token verified successfully for:', payload.name);
    res.json({
        valid: true,
        staff: {
            name: payload.name,
            personalId: payload.id,
            position: payload.position,
            department: payload.department || 'General'
        }
    });
});

// Quick Clock In/Out endpoint (no authentication required for quick access)
app.post('/api/staff/clock', (req, res) => {
    const { personalId, action, timestamp } = req.body;
    
    console.log('Clock request:', { personalId, action, timestamp });
    
    if (!personalId || !action) {
        return res.status(400).json({ error: 'Personal ID and action required' });
    }
    
    if (!['in', 'out'].includes(action)) {
        return res.status(400).json({ error: 'Action must be "in" or "out"' });
    }
    
    // Find staff member by personal ID
    const staff = staffList.find(s => s.personalId === personalId);
    
    if (!staff) {
        return res.status(404).json({ error: 'Staff member not found' });
    }
    
    // Create clock record
    const clockRecord = {
        id: Date.now(),
        personalId: staff.personalId,
        staffName: staff.name,
        action: action,
        timestamp: timestamp || new Date().toISOString(),
        location: 'Front Desk', // Default location
        device: 'Staff Login Portal'
    };
    
    // Store the clock record (in a real app, this would go to a database)
    if (!global.clockRecords) {
        global.clockRecords = [];
    }
    global.clockRecords.push(clockRecord);
    
    console.log('Clock record created:', clockRecord);
    
    res.json({
        success: true,
        message: `Successfully clocked ${action}`,
        staff: {
            name: staff.name,
            personalId: staff.personalId,
            position: staff.position
        },
        record: clockRecord
    });
});

// Authentication endpoint
app.post('/api/admin/authenticate', (req, res) => {
  console.log('Authentication request received');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'HotelAdmin2025';
  
  console.log('Received password:', password);
  console.log('Expected password:', adminPassword);
  
  if (password === adminPassword) {
    console.log('Authentication successful');
    res.json({ success: true, message: 'Authentication successful' });
  } else {
    console.log('Authentication failed');
    res.status(401).json({ success: false, message: 'Invalid password' });
  }
});

// Admin API Routes
// Laundry API
app.get('/api/laundry', (req, res) => {
  res.json(laundryTasks);
});
app.post('/api/laundry', (req, res) => {
  const task = req.body;
  task.id = laundryTasks.length + 1;
  laundryTasks.push(task);
  res.json({ success: true, task });
});

// Scan & Pay API
app.get('/api/scanpay', (req, res) => {
  res.json(scanPayOrders);
});
app.post('/api/scanpay', (req, res) => {
  const order = req.body;
  order.id = scanPayOrders.length + 1;
  scanPayOrders.push(order);
  res.json({ success: true, order });
});

app.put('/api/scanpay/:id', (req, res) => {
  const orderId = parseInt(req.params.id);
  const orderIndex = scanPayOrders.findIndex(order => order.id === orderId);
  
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }
  
  // Update the order with the new data
  scanPayOrders[orderIndex] = { ...scanPayOrders[orderIndex], ...req.body };
  res.json({ success: true, order: scanPayOrders[orderIndex] });
});

// HR API
app.get('/api/hr', (req, res) => {
  res.json(hrRecords);
});
app.post('/api/hr', (req, res) => {
  const record = req.body;
  record.id = hrRecords.length + 1;
  hrRecords.push(record);
  res.json({ success: true, record });
});

// Stock Control API
app.get('/api/stock', (req, res) => {
  res.json(stockItems);
});
app.post('/api/stock', (req, res) => {
  const item = req.body;
  item.id = stockItems.length + 1;
  stockItems.push(item);
  res.json({ success: true, item });
});

// Stock Transfer API
app.get('/api/stock-transfer', (req, res) => {
  res.json(stockTransfers);
});
app.post('/api/stock-transfer', (req, res) => {
  const transfer = req.body;
  transfer.id = stockTransfers.length + 1;
  stockTransfers.push(transfer);
  res.json({ success: true, transfer });
});

// Messaging API
app.get('/api/messaging', (req, res) => {
  res.json(automatedMessages);
});
app.post('/api/messaging', (req, res) => {
  const message = req.body;
  message.id = automatedMessages.length + 1;
  automatedMessages.push(message);
  res.json({ success: true, message });
});

// Locations API
app.get('/api/locations', (req, res) => {
  res.json(locationBranches);
});
app.post('/api/locations', (req, res) => {
  const branch = req.body;
  branch.id = locationBranches.length + 1;
  locationBranches.push(branch);
  res.json({ success: true, branch });
});
app.get('/api/admin/stats', requireAdminAuth, (req, res) => {
  const stats = {
    totalRooms: rooms.length,
    occupiedRooms: rooms.filter(r => r.status === 'occupied').length,
    totalCustomers: customers.length,
    totalBookings: bookings.length,
    totalOrders: kitchenOrders.length,
    barItems: barInventory.length,
    dailyRevenue: calculateDailyRevenue()
  };
  res.json(stats);
});

app.get('/api/admin/alerts', requireAdminAuth, (req, res) => {
  const alerts = [];
  
  // Check for maintenance rooms
  const maintenanceRooms = rooms.filter(r => r.status === 'maintenance');
  if (maintenanceRooms.length > 0) {
    alerts.push({
      type: 'warning',
      message: `${maintenanceRooms.length} room(s) need maintenance`,
      priority: 'high'
    });
  }
  
  // Check for low stock (mock implementation)
  const lowStockItems = barInventory.filter(item => item.stock < 10);
  if (lowStockItems.length > 0) {
    alerts.push({
      type: 'danger',
      message: `${lowStockItems.length} bar item(s) low on stock`,
      priority: 'critical'
    });
  }
  
  res.json(alerts);
});

function calculateDailyRevenue() {
  const occupiedRooms = rooms.filter(r => r.status === 'occupied');
  const roomRevenue = occupiedRooms.reduce((sum, room) => sum + room.price, 0);
  const estimatedBarRevenue = barInventory.length * 50; // Estimated
  const orderRevenue = kitchenOrders.length * 25; // Average order value
  return roomRevenue + estimatedBarRevenue + orderRevenue;
}

// Room Management Routes
app.get('/api/rooms', requireStaffAuth, async (req, res) => {
  console.log('🏠 Fetching rooms - DB connected:', dbConnected, '- Room model:', !!Room);
  
  if (dbConnected && Room) {
    try {
      const docs = await Room.find().lean();
      console.log('✅ Fetched', docs.length, 'rooms from MongoDB');
      const transformedDocs = docs.map(d => ({ ...d, id: d._id, legacyId: d.legacyId }));
      console.log('🔍 First room being sent to client:', JSON.stringify(transformedDocs[0], null, 2));
      return res.json(transformedDocs);
    } catch (err) {
      console.error('❌ Error fetching rooms from DB:', err);
      // Fall back to in-memory data if DB fails
    }
  }
  
  // Fallback to in-memory rooms data
  console.log('⚠️ Using fallback rooms data');
  return res.json(rooms.map(room => ({ ...room, id: room.id || room.legacyId })));
});

app.put('/api/rooms/:id', requireStaffAuth, async (req, res) => {
  const id = req.params.id;
  if (dbConnected && Room) {
    try {
      let updated;
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        // treat as legacy numeric id
        updated = await Room.findOneAndUpdate({ legacyId: parseInt(id) }, req.body, { new: true }).lean();
      } else {
        updated = await Room.findByIdAndUpdate(id, req.body, { new: true }).lean();
      }
      if (!updated) return res.status(404).json({ error: 'Room not found' });
      return res.json(updated);
    } catch (err) {
      console.error('Error updating room in DB:', err);
      return res.status(500).json({ error: 'DB error' });
    }
  }
  const roomId = parseInt(id);
  const room = rooms.find(r => r.id === roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  Object.assign(room, req.body);
  res.json(room);
});

// Customer Management Routes
app.get('/api/customers', requireStaffAuth, async (req, res) => {
  console.log('👥 Fetching customers - DB connected:', dbConnected, '- Customer model:', !!Customer);
  
  if (dbConnected && Customer) {
    try {
      const docs = await Customer.find().lean();
      console.log('✅ Fetched', docs.length, 'customers from MongoDB');
      return res.json(docs.map(d => ({ ...d, id: d._id, legacyId: d.legacyId })));
    } catch (err) {
      console.error('❌ Error fetching customers from DB:', err);
      // Fall back to in-memory data if DB fails
    }
  }
  
  // Fallback to in-memory customers data
  console.log('⚠️ Using fallback customers data');
  return res.json(customers.map(customer => ({ ...customer, id: customer.id || customer.legacyId })));
});

app.post('/api/customers', requireStaffAuth, async (req, res) => {
  if (dbConnected && Customer) {
    try {
      const doc = await Customer.create(req.body);
      return res.status(201).json(doc);
    } catch (err) {
      console.error('Error creating customer in DB:', err);
    }
  }
  const customer = { id: customers.length + 1, ...req.body, createdAt: new Date() };
  customers.push(customer);
  res.status(201).json(customer);
});

// Get single customer
app.get('/api/customers/:id', requireStaffAuth, async (req, res) => {
  const customerId = req.params.id;
  
  if (dbConnected && Customer) {
    try {
      const customer = await Customer.findById(customerId);
      if (customer) {
        return res.json(customer);
      }
    } catch (err) {
      console.error('Error finding customer in DB:', err);
    }
  }
  
  const customer = customers.find(c => c.id == customerId);
  if (customer) {
    res.json(customer);
  } else {
    res.status(404).json({ error: 'Customer not found' });
  }
});

// Update customer
app.put('/api/customers/:id', requireStaffAuth, async (req, res) => {
  const customerId = req.params.id;
  
  if (dbConnected && Customer) {
    try {
      const customer = await Customer.findByIdAndUpdate(customerId, req.body, { new: true });
      if (customer) {
        return res.json(customer);
      }
    } catch (err) {
      console.error('Error updating customer in DB:', err);
    }
  }
  
  const customerIndex = customers.findIndex(c => c.id == customerId);
  if (customerIndex !== -1) {
    customers[customerIndex] = { ...customers[customerIndex], ...req.body };
    res.json(customers[customerIndex]);
  } else {
    res.status(404).json({ error: 'Customer not found' });
  }
});

// Delete customer
app.delete('/api/customers/:id', requireStaffAuth, async (req, res) => {
  const customerId = req.params.id;
  
  if (dbConnected && Customer) {
    try {
      const customer = await Customer.findByIdAndDelete(customerId);
      if (customer) {
        return res.json({ message: 'Customer deleted successfully' });
      }
    } catch (err) {
      console.error('Error deleting customer in DB:', err);
    }
  }
  
  const customerIndex = customers.findIndex(c => c.id == customerId);
  if (customerIndex !== -1) {
    customers.splice(customerIndex, 1);
    res.json({ message: 'Customer deleted successfully' });
  } else {
    res.status(404).json({ error: 'Customer not found' });
  }
});

// Booking Routes
app.get('/api/bookings', requireStaffAuth, async (req, res) => {
  if (dbConnected && Booking) {
    try {
      const docs = await Booking.find().lean();
      return res.json(docs.map(d => ({ ...d, id: d._id, legacyId: d.legacyId })));
    } catch (err) {
      console.error('Error fetching bookings from DB:', err);
      return res.status(500).json({ error: 'DB error' });
    }
  }
  return res.status(503).json({ error: 'Database not available' });
});

app.post('/api/bookings', requireStaffAuth, async (req, res) => {
  if (dbConnected && Booking && Room) {
    try {
      const payload = { ...req.body, status: 'confirmed' };
      if (payload.roomId && !/^[0-9a-fA-F]{24}$/.test(payload.roomId)) {
        const numeric = parseInt(payload.roomId);
        let roomDoc = await Room.findOne({ legacyId: numeric });
        if (!roomDoc) {
          roomDoc = await Room.findOne({ number: `Room ${numeric}` });
        }
        if (!roomDoc) {
          // broader search: find any room containing the numeric in its number string
          const allRooms = await Room.find().lean();
          const maybe = allRooms.find(r => r.number && r.number.toString().includes(numeric.toString()));
          if (maybe) roomDoc = await Room.findById(maybe._id);
        }
        if (roomDoc) {
          payload.roomId = roomDoc._id;
        } else {
          console.log('Could not resolve roomId for legacy id', payload.roomId);
        }
      }
      if (payload.customerId && !/^[0-9a-fA-F]{24}$/.test(payload.customerId)) {
        const numericCust = parseInt(payload.customerId);
        let custDoc = await Customer.findOne({ legacyId: numericCust });
        if (!custDoc) {
          custDoc = await Customer.findOne({ $or: [{ email: payload.customerId }, { name: payload.customerId }] });
        }
        if (!custDoc) {
          const allCust = await Customer.find().lean();
          const maybe = allCust.find(c => (c.phone && c.phone.includes(payload.customerId)) || (c.name && c.name.toString().includes(payload.customerId.toString())) );
          if (maybe) custDoc = await Customer.findById(maybe._id);
        }
        if (custDoc) {
          payload.customerId = custDoc._id;
        } else {
          console.log('Could not resolve customerId for legacy id', payload.customerId);
        }
      }
      const doc = await Booking.create(payload);
      // update room status
      await Room.findByIdAndUpdate(doc.roomId, { status: 'occupied', currentGuest: doc.customerId });
      return res.status(201).json(doc);
    } catch (err) {
      console.error('Error creating booking in DB:', err.message);
      console.error('Booking payload:', { roomId: req.body.roomId, customerId: req.body.customerId });
    }
  }
  const booking = { id: bookings.length + 1, ...req.body, createdAt: new Date(), status: 'confirmed' };
  bookings.push(booking);
  const room = rooms.find(r => r.id === booking.roomId);
  if (room) {
    room.status = 'occupied';
    room.currentGuest = booking.customerId;
  }
  res.status(201).json(booking);
});

// Bar Management Routes
app.get('/api/bar/inventory', requireStaffAuth, async (req, res) => {
  console.log('🍺 Fetching bar inventory - DB connected:', dbConnected, '- BarItem model:', !!BarItem);
  
  if (dbConnected && BarItem) {
    try {
      const docs = await BarItem.find().lean();
      console.log('✅ Fetched', docs.length, 'bar items from MongoDB');
      return res.json(docs.map(d => ({ ...d, id: d._id, legacyId: d.legacyId })));
    } catch (err) {
      console.error('❌ Error fetching bar inventory from DB:', err);
      // Fall back to in-memory data if DB fails
    }
  }
  
  // Fallback to in-memory bar inventory data
  console.log('⚠️ Using fallback bar inventory data');
  return res.json(barInventory.map(item => ({ ...item, id: item.id || item.legacyId })));
});

app.post('/api/bar/inventory', requireStaffAuth, async (req, res) => {
  if (dbConnected && BarItem) {
    try {
      const doc = await BarItem.create(req.body);
      return res.status(201).json(doc);
    } catch (err) {
      console.error('Error creating bar item in DB:', err);
    }
  }
  const item = { id: barInventory.length + 1, ...req.body, addedAt: new Date() };
  barInventory.push(item);
  res.status(201).json(item);
});

// Update bar inventory item
app.put('/api/bar/inventory/:id', requireStaffAuth, async (req, res) => {
  const itemId = req.params.id;
  
  if (dbConnected && BarItem) {
    try {
      const doc = await BarItem.findByIdAndUpdate(itemId, req.body, { new: true });
      if (!doc) {
        return res.status(404).json({ error: 'Item not found' });
      }
      return res.json(doc);
    } catch (err) {
      console.error('Error updating bar item in DB:', err);
      return res.status(500).json({ error: 'DB error' });
    }
  }
  
  // Fallback to in-memory array
  const itemIndex = barInventory.findIndex(item => item.id == itemId);
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }
  
  barInventory[itemIndex] = { ...barInventory[itemIndex], ...req.body };
  res.json(barInventory[itemIndex]);
});

// Delete bar inventory item
app.delete('/api/bar/inventory/:id', requireStaffAuth, async (req, res) => {
  const itemId = req.params.id;
  
  if (dbConnected && BarItem) {
    try {
      const doc = await BarItem.findByIdAndDelete(itemId);
      if (!doc) {
        return res.status(404).json({ error: 'Item not found' });
      }
      return res.json({ success: true, message: 'Item deleted successfully' });
    } catch (err) {
      console.error('Error deleting bar item from DB:', err);
      return res.status(500).json({ error: 'DB error' });
    }
  }
  
  // Fallback to in-memory array
  const itemIndex = barInventory.findIndex(item => item.id == itemId);
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }
  
  barInventory.splice(itemIndex, 1);
  res.json({ success: true, message: 'Item deleted successfully' });
});

// Kitchen Management Routes
app.get('/api/kitchen/orders', requireStaffAuth, async (req, res) => {
  if (dbConnected && KitchenOrder) {
    try {
      const docs = await KitchenOrder.find().lean();
      return res.json(docs.map(d => ({ ...d, id: d._id, legacyId: d.legacyId })));
    } catch (err) {
      console.error('Error fetching kitchen orders from DB:', err);
      // Fall back to in-memory data if DB fails
    }
  }
  
  // Fallback to in-memory kitchen orders data
  console.log('⚠️ Using fallback kitchen orders data');
  return res.json(kitchenOrders.map(order => ({ ...order, id: order.id })));
});

app.post('/api/kitchen/orders', requireStaffAuth, async (req, res) => {
  if (dbConnected && KitchenOrder) {
    try {
      const doc = await KitchenOrder.create({ ...req.body, status: 'pending' });
      return res.status(201).json(doc);
    } catch (err) {
      console.error('Error creating kitchen order in DB:', err);
    }
  }
  const order = { id: kitchenOrders.length + 1, ...req.body, status: 'pending', createdAt: new Date() };
  kitchenOrders.push(order);
  res.status(201).json(order);
});

app.put('/api/kitchen/orders/:id', requireStaffAuth, async (req, res) => {
  const id = req.params.id;
  if (dbConnected && KitchenOrder) {
    try {
      let updated;
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        updated = await KitchenOrder.findOneAndUpdate({ legacyId: parseInt(id) }, req.body, { new: true }).lean();
      } else {
        updated = await KitchenOrder.findByIdAndUpdate(id, req.body, { new: true }).lean();
      }
      if (!updated) return res.status(404).json({ error: 'Order not found' });
      return res.json(updated);
    } catch (err) {
      console.error('Error updating kitchen order in DB:', err);
      return res.status(500).json({ error: 'DB error' });
    }
  }
  const orderId = parseInt(id);
  const order = kitchenOrders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  Object.assign(order, req.body);
  res.json(order);
});

// Kitchen Inventory Routes
app.get('/api/kitchen/inventory', requireStaffAuth, async (req, res) => {
  try {
    console.log('🍽️ Fetching kitchen inventory - DB connected:', dbConnected, '- KitchenItem model:', !!KitchenItem);
    
    if (dbConnected && KitchenItem) {
      const items = await KitchenItem.find({}).sort({ name: 1 });
      console.log('✅ Fetched', items.length, 'kitchen items from MongoDB');
      // Convert Mongoose documents to plain JSON objects
      const plainItems = items.map(item => item.toJSON());
      res.json(plainItems);
    } else {
      console.log('⚠️ Using fallback kitchen inventory data');
      res.json(kitchenInventory);
    }
  } catch (error) {
    console.error('Error fetching kitchen inventory:', error);
    console.log('⚠️ Using fallback kitchen inventory data');
    res.json(kitchenInventory);
  }
});

app.post('/api/kitchen/inventory', requireStaffAuth, async (req, res) => {
  try {
    console.log('🍽️ Creating kitchen item - DB connected:', dbConnected, '- KitchenItem model:', !!KitchenItem);
    
    if (dbConnected && KitchenItem) {
      const item = new KitchenItem(req.body);
      await item.save();
      console.log('✅ Kitchen item created in MongoDB:', item.name);
      res.status(201).json(item);
    } else {
      // Fallback to local array
      const item = {
        id: kitchenInventory.length + 1,
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      kitchenInventory.push(item);
      console.log('⚠️ Kitchen item created in fallback array');
      res.status(201).json(item);
    }
  } catch (error) {
    console.error('Error creating kitchen item in DB:', error);
    // Fallback to local array
    const item = {
      id: kitchenInventory.length + 1,
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    kitchenInventory.push(item);
    console.log('⚠️ Kitchen item created in fallback array');
    res.status(201).json(item);
  }
});

app.put('/api/kitchen/inventory/:id', requireStaffAuth, async (req, res) => {
  try {
    console.log('🍽️ Updating kitchen item - DB connected:', dbConnected, '- KitchenItem model:', !!KitchenItem);
    
    if (dbConnected && KitchenItem) {
      const item = await KitchenItem.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      
      if (!item) {
        return res.status(404).json({ error: 'Kitchen item not found' });
      }
      
      console.log('✅ Kitchen item updated in MongoDB:', item.name);
      res.json(item);
    } else {
      // Fallback to local array
      const itemId = parseInt(req.params.id);
      const item = kitchenInventory.find(i => i.id === itemId);
      
      if (!item) {
        return res.status(404).json({ error: 'Kitchen item not found' });
      }
      
      Object.assign(item, req.body, { updatedAt: new Date() });
      console.log('⚠️ Kitchen item updated in fallback array');
      res.json(item);
    }
  } catch (error) {
    console.error('Error updating kitchen item:', error);
    res.status(500).json({ error: 'Failed to update kitchen item' });
  }
});

app.delete('/api/kitchen/inventory/:id', requireStaffAuth, async (req, res) => {
  try {
    console.log('🍽️ Deleting kitchen item - DB connected:', dbConnected, '- KitchenItem model:', !!KitchenItem);
    
    if (dbConnected && KitchenItem) {
      const item = await KitchenItem.findByIdAndDelete(req.params.id);
      
      if (!item) {
        return res.status(404).json({ error: 'Kitchen item not found' });
      }
      
      console.log('✅ Kitchen item deleted from MongoDB:', item.name);
      res.json({ message: 'Kitchen item deleted successfully' });
    } else {
      // Fallback to local array
      const itemId = parseInt(req.params.id);
      const index = kitchenInventory.findIndex(i => i.id === itemId);
      
      if (index === -1) {
        return res.status(404).json({ error: 'Kitchen item not found' });
      }
      
      kitchenInventory.splice(index, 1);
      console.log('⚠️ Kitchen item deleted from fallback array');
      res.json({ message: 'Kitchen item deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting kitchen item:', error);
    res.status(500).json({ error: 'Failed to delete kitchen item' });
  }
});

// Kitchen Purchases Routes
app.get('/api/kitchen/purchases', requireStaffAuth, (req, res) => {
  res.json(kitchenPurchases);
});

app.post('/api/kitchen/purchases', requireStaffAuth, (req, res) => {
  const purchase = {
    id: kitchenPurchases.length + 1,
    ...req.body,
    totalCost: req.body.quantity * req.body.costPerUnit,
    purchaseDate: new Date().toISOString().split('T')[0]
  };
  kitchenPurchases.push(purchase);
  
  // Update inventory if item exists
  const inventoryItem = kitchenInventory.find(i => i.name === req.body.itemName);
  if (inventoryItem) {
    inventoryItem.quantity += req.body.quantity;
    inventoryItem.totalCost = inventoryItem.quantity * inventoryItem.costPerUnit;
    inventoryItem.lastPurchased = purchase.purchaseDate;
  }
  
  res.status(201).json(purchase);
});

app.put('/api/kitchen/purchases/:id', requireStaffAuth, (req, res) => {
  const purchaseId = parseInt(req.params.id);
  const purchase = kitchenPurchases.find(p => p.id === purchaseId);
  
  if (!purchase) {
    return res.status(404).json({ error: 'Purchase not found' });
  }
  
  Object.assign(purchase, req.body);
  if (req.body.quantity && req.body.costPerUnit) {
    purchase.totalCost = req.body.quantity * req.body.costPerUnit;
  }
  
  res.json(purchase);
});

app.delete('/api/kitchen/purchases/:id', requireStaffAuth, (req, res) => {
  const purchaseId = parseInt(req.params.id);
  const index = kitchenPurchases.findIndex(p => p.id === purchaseId);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Purchase not found' });
  }
  
  kitchenPurchases.splice(index, 1);
  res.json({ message: 'Purchase deleted successfully' });
});

// Kitchen Cost Analysis Route
app.get('/api/kitchen/cost-analysis', requireStaffAuth, (req, res) => {
  const { period = '30' } = req.query;
  const days = parseInt(period);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const recentPurchases = kitchenPurchases.filter(p => 
    new Date(p.purchaseDate) >= cutoffDate
  );
  
  const totalCost = recentPurchases.reduce((sum, p) => sum + p.totalCost, 0);
  const purchaseCount = recentPurchases.length;
  const averagePurchase = purchaseCount > 0 ? totalCost / purchaseCount : 0;
  
  const categoryBreakdown = recentPurchases.reduce((acc, p) => {
    const inventoryItem = kitchenInventory.find(i => i.name === p.itemName);
    const category = inventoryItem ? inventoryItem.category : 'Other';
    acc[category] = (acc[category] || 0) + p.totalCost;
    return acc;
  }, {});
  
  const lowStockItems = kitchenInventory.filter(i => i.quantity <= i.minStock);
  
  res.json({
    period: days,
    totalCost,
    purchaseCount,
    averagePurchase,
    categoryBreakdown,
    lowStockItems,
    recentPurchases: recentPurchases.slice(0, 10) // Last 10 purchases
  });
});

// Kitchen costs and budget endpoints
app.get('/api/kitchen/costs/today', requireStaffAuth, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayPurchases = kitchenPurchases.filter(p => 
    p.purchaseDate === today
  );
  const totalCost = todayPurchases.reduce((sum, p) => sum + p.totalCost, 0);
  res.json({ totalCost });
});

app.get('/api/kitchen/budget/month', requireStaffAuth, (req, res) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyPurchases = kitchenPurchases.filter(p => {
    const purchaseDate = new Date(p.purchaseDate);
    return purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear;
  });
  
  const spentThisMonth = monthlyPurchases.reduce((sum, p) => sum + p.totalCost, 0);
  const budgetLimit = 500000; // Monthly budget of 500,000 NGN
  const remainingBudget = budgetLimit - spentThisMonth;
  
  res.json({ 
    budget: budgetLimit,
    spent: spentThisMonth,
    remaining: remainingBudget,
    percentage: (spentThisMonth / budgetLimit) * 100
  });
});

app.get('/api/kitchen/report/today', requireStaffAuth, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Get today's orders
  const todayOrders = kitchenOrders.filter(order => {
    const orderDate = new Date(order.orderTime).toISOString().split('T')[0];
    return orderDate === today;
  });
  
  // Get today's purchases  
  const todayPurchases = kitchenPurchases.filter(purchase => {
    const purchaseDate = new Date(purchase.purchaseDate).toISOString().split('T')[0];
    return purchaseDate === today;
  });
  
  // Calculate metrics
  const totalRevenue = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalCost = todayPurchases.reduce((sum, purchase) => sum + (purchase.totalCost || 0), 0);
  const ordersCount = todayOrders.length;
  const purchasesCount = todayPurchases.length;
  
  res.json({
    date: today,
    orders: {
      count: ordersCount,
      revenue: totalRevenue,
      details: todayOrders
    },
    purchases: {
      count: purchasesCount,
      cost: totalCost,
      details: todayPurchases
    },
    netProfit: totalRevenue - totalCost,
    summary: {
      totalRevenue,
      totalCost,
      netProfit: totalRevenue - totalCost,
      ordersCount,
      purchasesCount
    }
  });
});

app.get('/api/kitchen/analysis/:period', requireStaffAuth, (req, res) => {
  const { period } = req.params;
  const days = parseInt(period) || 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const recentPurchases = kitchenPurchases.filter(p => 
    new Date(p.purchaseDate) >= cutoffDate
  );
  
  const totalCost = recentPurchases.reduce((sum, p) => sum + p.totalCost, 0);
  const averageDailyCost = totalCost / days;
  
  // Group by day for chart data
  const dailyCosts = {};
  recentPurchases.forEach(p => {
    const date = p.purchaseDate;
    dailyCosts[date] = (dailyCosts[date] || 0) + p.totalCost;
  });
  
  // Category breakdown
  const categoryBreakdown = recentPurchases.reduce((acc, p) => {
    const inventoryItem = kitchenInventory.find(i => i.name === p.itemName);
    const category = inventoryItem ? inventoryItem.category : 'Other';
    acc[category] = (acc[category] || 0) + p.totalCost;
    return acc;
  }, {});
  
  res.json({
    period: days,
    totalCost,
    averageDailyCost,
    dailyCosts,
    categoryBreakdown,
    purchaseCount: recentPurchases.length
  });
});

// Police Reports Routes
app.get('/api/police-reports', (req, res) => {
  res.json(policeReports);
});

app.post('/api/police-reports', (req, res) => {
  const report = {
    id: policeReports.length + 1,
    ...req.body,
    createdAt: new Date()
  };
  policeReports.push(report);
  res.status(201).json(report);
});

app.put('/api/police-reports/:id', (req, res) => {
  const reportId = parseInt(req.params.id);
  const report = policeReports.find(r => r.id === reportId);
  
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  
  Object.assign(report, req.body);
  res.json(report);
});

// Payment Routes
app.get('/api/payments', requireStaffAuth, async (req, res) => {
  if (dbConnected && Payment) {
    try {
      const docs = await Payment.find().populate('customerId', 'name').lean();
      return res.json(docs.map(d => ({ ...d, id: d._id, legacyId: d.legacyId, customerName: d.customerId ? d.customerId.name : null })));
    } catch (err) {
      console.error('Error fetching payments from DB:', err);
      // Fall back to in-memory data if DB fails
    }
  }
  
  // Fallback to in-memory payments data
  console.log('⚠️ Using fallback payments data');
  return res.json(payments.map(payment => ({ ...payment, id: payment.id })));
});

app.post('/api/payments', requireStaffAuth, async (req, res) => {
  if (dbConnected && Payment) {
    try {
      const doc = await Payment.create(req.body);
      return res.status(201).json(doc);
    } catch (err) {
      console.error('Error creating payment in DB:', err);
    }
  }
  const payment = { id: payments.length + 1, ...req.body, createdAt: new Date() };
  if (payment.cardDetails) {
    payment.cardDetails = { lastFour: payment.cardDetails.number.slice(-4), type: payment.cardDetails.number.startsWith('4') ? 'Visa' : 'Mastercard' };
  }
  payments.push(payment);
  res.status(201).json(payment);
});

app.post('/api/payments/refund', (req, res) => {
  const refund = {
    id: payments.length + 1,
    ...req.body,
    createdAt: new Date()
  };
  
  // Find original transaction
  const originalTransaction = payments.find(p => p.id === refund.originalTransactionId);
  if (originalTransaction) {
    refund.customerId = originalTransaction.customerId;
    refund.roomId = originalTransaction.roomId;
    refund.paymentType = 'refund';
    refund.method = originalTransaction.method;
  }
  
  payments.push(refund);
  res.status(201).json(refund);
});

// NOTIFICATIONS API
app.get('/api/notifications', (req, res) => {
  res.json(notifications);
});

app.post('/api/notifications', (req, res) => {
  const notification = {
    id: notifications.length + 1,
    ...req.body,
    createdAt: new Date(),
    read: false
  };
  notifications.push(notification);
  res.status(201).json(notification);
});

app.put('/api/notifications/:id/read', (req, res) => {
  const notification = notifications.find(n => n.id === parseInt(req.params.id));
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  notification.read = true;
  res.json(notification);
});

app.delete('/api/notifications/:id', (req, res) => {
  const index = notifications.findIndex(n => n.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  notifications.splice(index, 1);
  res.status(204).send();
});

// STAFF MANAGEMENT API
app.get('/api/staff', requireStaffAuth, (req, res) => {
  res.json(staff);
});

app.post('/api/staff', requireAdminAuth, (req, res) => {
  const newStaff = {
    id: staff.length + 1,
    ...req.body,
    createdAt: new Date(),
    status: 'off-duty'
  };
  staff.push(newStaff);
  res.status(201).json(newStaff);
});

// Get individual staff member
app.get('/api/staff/:id', requireAdminAuth, (req, res) => {
  const staffMember = staff.find(s => s.id === parseInt(req.params.id));
  if (!staffMember) {
    return res.status(404).json({ error: 'Staff member not found' });
  }
  res.json(staffMember);
});

app.put('/api/staff/:id', requireAdminAuth, (req, res) => {
  const staffMember = staff.find(s => s.id === parseInt(req.params.id));
  if (!staffMember) {
    return res.status(404).json({ error: 'Staff member not found' });
  }
  Object.assign(staffMember, req.body);
  res.json(staffMember);
});

app.delete('/api/staff/:id', requireAdminAuth, (req, res) => {
  const index = staff.findIndex(s => s.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Staff member not found' });
  }
  staff.splice(index, 1);
  res.status(204).send();
});

// STAFF CLOCK-IN SYSTEM API
app.get('/api/clock-records', requireStaffAuth, (req, res) => {
  res.json(clockInRecords);
});

app.get('/api/clock-records/staff/:personalId', (req, res) => {
  const personalId = req.params.personalId;
  const records = clockInRecords.filter(record => record.personalId === personalId);
  res.json(records);
});

app.post('/api/clock-in', requireStaffAuth, (req, res) => {
  const { personalId, action, location, notes } = req.body;
  
  // Find staff member by personal ID
  const staffMember = staff.find(s => s.personalId === personalId);
  if (!staffMember) {
    return res.status(404).json({ error: 'Staff member not found' });
  }
  
  const newRecord = {
    id: clockInRecords.length + 1,
    staffId: staffMember.id,
    personalId: personalId,
    action: action, // 'clock-in', 'clock-out', 'break-start', 'break-end'
    timestamp: new Date(),
    location: location || 'Unknown',
    notes: notes || '',
    createdAt: new Date()
  };
  
  clockInRecords.push(newRecord);
  
  // Update staff status based on action
  if (action === 'clock-in') {
    staffMember.status = 'on-duty';
  } else if (action === 'clock-out') {
    staffMember.status = 'off-duty';
  } else if (action === 'break-start') {
    staffMember.status = 'on-break';
  } else if (action === 'break-end') {
    staffMember.status = 'on-duty';
  }
  
  res.status(201).json(newRecord);
});

app.get('/api/staff-shifts', requireStaffAuth, (req, res) => {
  res.json(staffShifts);
});

app.get('/api/staff-shifts/today', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayShifts = staffShifts.filter(shift => shift.date === today);
  res.json(todayShifts);
});

app.post('/api/staff-shifts', requireStaffAuth, (req, res) => {
  const { staffId, personalId, date, shift, startTime, endTime } = req.body;
  
  const newShift = {
    id: staffShifts.length + 1,
    staffId: parseInt(staffId),
    personalId: personalId,
    date: date,
    shift: shift,
    startTime: startTime,
    endTime: endTime,
    status: 'scheduled',
    createdAt: new Date()
  };
  
  staffShifts.push(newShift);
  res.status(201).json(newShift);
});

app.get('/api/staff/current-status', requireStaffAuth, (req, res) => {
  const currentTime = new Date();
  const statusSummary = staff.map(member => {
    const latestRecord = clockInRecords
      .filter(record => record.personalId === member.personalId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    
    return {
      id: member.id,
      personalId: member.personalId,
      name: member.name,
      position: member.position,
      status: member.status,
      lastAction: latestRecord ? latestRecord.action : 'none',
      lastActionTime: latestRecord ? latestRecord.timestamp : null
    };
  });
  
  res.json(statusSummary);
});

app.get('/api/timesheet/:personalId', requireStaffAuth, (req, res) => {
  const { personalId } = req.params;
  const { date } = req.query;
  
  const targetDate = date ? new Date(date) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  const dayRecords = clockInRecords.filter(record => 
    record.personalId === personalId &&
    new Date(record.timestamp) >= startOfDay &&
    new Date(record.timestamp) <= endOfDay
  ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  // Calculate total hours worked
  let totalHours = 0;
  let clockInTime = null;
  let totalBreakTime = 0;
  let breakStartTime = null;
  
  dayRecords.forEach(record => {
    if (record.action === 'clock-in') {
      clockInTime = new Date(record.timestamp);
    } else if (record.action === 'clock-out' && clockInTime) {
      const workTime = (new Date(record.timestamp) - clockInTime) / (1000 * 60 * 60);
      totalHours += workTime;
      clockInTime = null;
    } else if (record.action === 'break-start') {
      breakStartTime = new Date(record.timestamp);
    } else if (record.action === 'break-end' && breakStartTime) {
      const breakTime = (new Date(record.timestamp) - breakStartTime) / (1000 * 60 * 60);
      totalBreakTime += breakTime;
      breakStartTime = null;
    }
  });
  
  // Subtract break time from total hours
  totalHours -= totalBreakTime;
  
  res.json({
    personalId,
    date: targetDate.toISOString().split('T')[0],
    records: dayRecords,
    summary: {
      totalHours: Math.max(0, totalHours).toFixed(2),
      totalBreakTime: totalBreakTime.toFixed(2),
      clockedIn: clockInTime !== null
    }
  });
});

// SCHEDULE API
app.get('/api/schedules', (req, res) => {
  res.json(schedules);
});

app.post('/api/schedules', (req, res) => {
  const schedule = {
    id: schedules.length + 1,
    ...req.body,
    createdAt: new Date()
  };
  schedules.push(schedule);
  res.status(201).json(schedule);
});

// TIME RECORDS API
app.get('/api/time-records', (req, res) => {
  res.json(timeRecords);
});

app.post('/api/time-records', (req, res) => {
  const timeRecord = {
    id: timeRecords.length + 1,
    ...req.body,
    timestamp: new Date()
  };
  timeRecords.push(timeRecord);
  res.status(201).json(timeRecord);
});

// MAINTENANCE API
app.get('/api/maintenance', (req, res) => {
  res.json(maintenanceRequests);
});

app.post('/api/maintenance', (req, res) => {
  const maintenance = {
    id: maintenanceRequests.length + 1,
    ...req.body,
    status: 'pending',
    createdAt: new Date()
  };
  maintenanceRequests.push(maintenance);
  res.status(201).json(maintenance);
});

app.put('/api/maintenance/:id', (req, res) => {
  const maintenance = maintenanceRequests.find(m => m.id === parseInt(req.params.id));
  if (!maintenance) {
    return res.status(404).json({ error: 'Maintenance request not found' });
  }
  Object.assign(maintenance, req.body);
  res.json(maintenance);
});

// SUPPLIES API
app.get('/api/supplies', (req, res) => {
  res.json(supplies);
});

app.post('/api/supplies', (req, res) => {
  const supply = {
    id: supplies.length + 1,
    ...req.body,
    addedAt: new Date()
  };
  supplies.push(supply);
  res.status(201).json(supply);
});

app.put('/api/supplies/:id', (req, res) => {
  const supply = supplies.find(s => s.id === parseInt(req.params.id));
  if (!supply) {
    return res.status(404).json({ error: 'Supply not found' });
  }
  Object.assign(supply, req.body);
  res.json(supply);
});

// CLEANING TASKS API
app.get('/api/cleaning-tasks', (req, res) => {
  res.json(cleaningTasks);
});

app.post('/api/cleaning-tasks', (req, res) => {
  const task = {
    id: cleaningTasks.length + 1,
    ...req.body,
    status: 'pending',
    createdAt: new Date()
  };
  cleaningTasks.push(task);
  res.status(201).json(task);
});

app.put('/api/cleaning-tasks/:id', (req, res) => {
  const task = cleaningTasks.find(t => t.id === parseInt(req.params.id));
  if (!task) {
    return res.status(404).json({ error: 'Cleaning task not found' });
  }
  Object.assign(task, req.body);
  res.json(task);
});

// SERVICE REQUESTS API
app.get('/api/service-requests', (req, res) => {
  res.json(serviceRequests);
});

app.post('/api/service-requests', (req, res) => {
  const service = {
    id: serviceRequests.length + 1,
    ...req.body,
    status: 'pending',
    createdAt: new Date()
  };
  serviceRequests.push(service);
  res.status(201).json(service);
});

app.put('/api/service-requests/:id', (req, res) => {
  const service = serviceRequests.find(s => s.id === parseInt(req.params.id));
  if (!service) {
    return res.status(404).json({ error: 'Service request not found' });
  }
  Object.assign(service, req.body);
  res.json(service);
});

// GUEST FEEDBACK API
app.get('/api/feedback', (req, res) => {
  res.json(guestFeedback);
});

app.post('/api/feedback', (req, res) => {
  const feedback = {
    id: guestFeedback.length + 1,
    ...req.body,
    createdAt: new Date()
  };
  guestFeedback.push(feedback);
  res.status(201).json(feedback);
});

// LOST & FOUND API
app.get('/api/lost-found', (req, res) => {
  res.json(lostFoundItems);
});

app.post('/api/lost-found', (req, res) => {
  const item = {
    id: lostFoundItems.length + 1,
    ...req.body,
    status: req.body.type === 'found' ? 'unclaimed' : 'searching',
    createdAt: new Date()
  };
  lostFoundItems.push(item);
  res.status(201).json(item);
});

app.put('/api/lost-found/:id', (req, res) => {
  const item = lostFoundItems.find(i => i.id === parseInt(req.params.id));
  if (!item) {
    return res.status(404).json({ error: 'Lost & found item not found' });
  }
  Object.assign(item, req.body);
  res.json(item);
});

// INTERNAL MESSAGES API
app.get('/api/messages', (req, res) => {
  res.json(internalMessages);
});

app.post('/api/messages', (req, res) => {
  const message = {
    id: internalMessages.length + 1,
    ...req.body,
    read: false,
    createdAt: new Date()
  };
  internalMessages.push(message);
  res.status(201).json(message);
});

app.put('/api/messages/:id/read', (req, res) => {
  const message = internalMessages.find(m => m.id === parseInt(req.params.id));
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }
  message.read = true;
  res.json(message);
});

// CALL LOGS API
app.get('/api/call-logs', (req, res) => {
  res.json(callLogs);
});

app.post('/api/call-logs', (req, res) => {
  const callLog = {
    id: callLogs.length + 1,
    ...req.body,
    loggedAt: new Date()
  };
  callLogs.push(callLog);
  res.status(201).json(callLog);
});

// EMERGENCY CONTACTS API
app.get('/api/emergency-contacts', (req, res) => {
  res.json(emergencyContacts);
});

app.post('/api/emergency-contacts', (req, res) => {
  const contact = {
    id: emergencyContacts.length + 1,
    ...req.body,
    createdAt: new Date()
  };
  emergencyContacts.push(contact);
  res.status(201).json(contact);
});

// ANALYTICS API
app.get('/api/analytics/revenue', (req, res) => {
  const { timeframe } = req.query;
  // Calculate revenue based on timeframe
  const revenueData = payments
    .filter(p => p.paymentType !== 'refund')
    .reduce((acc, payment) => {
      acc.total += payment.amount;
      return acc;
    }, { total: 0, transactions: payments.length });
  
  res.json(revenueData);
});

app.get('/api/analytics/occupancy', (req, res) => {
  const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
  const totalRooms = rooms.length;
  const occupancyRate = (occupiedRooms / totalRooms) * 100;
  
  res.json({
    occupiedRooms,
    totalRooms,
    occupancyRate: occupancyRate.toFixed(1)
  });
});

app.get('/api/analytics/customer-loyalty', (req, res) => {
  // Calculate return customers based on multiple bookings
  const customerBookings = bookings.reduce((acc, booking) => {
    acc[booking.customerId] = (acc[booking.customerId] || 0) + 1;
    return acc;
  }, {});
  
  const returnCustomers = Object.values(customerBookings).filter(count => count > 1).length;
  const totalCustomers = customers.length;
  const loyaltyRate = totalCustomers > 0 ? (returnCustomers / totalCustomers) * 100 : 0;
  
  res.json({
    returnCustomers,
    totalCustomers,
    loyaltyRate: loyaltyRate.toFixed(1)
  });
});

// Admin API Endpoints
app.get('/api/admin/daily-report', requireStaffAuth, (req, res) => {
  const reportDate = req.query.date || new Date().toISOString().split('T')[0];
  
  // Filter data for the selected date
  const dayPayments = payments.filter(p => p.createdAt && p.createdAt.includes(reportDate));
  const dayOrders = kitchenOrders.filter(o => o.createdAt && o.createdAt.includes(reportDate));
  
  // Calculate daily metrics
  const totalRevenue = dayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const roomRevenue = dayPayments.filter(p => p.description && p.description.includes('room')).reduce((sum, p) => sum + (p.amount || 0), 0);
  const fbRevenue = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const barRevenue = dayPayments.filter(p => p.description && p.description.includes('bar')).reduce((sum, p) => sum + (p.amount || 0), 0);
  
  const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
  const occupancyRate = Math.round((occupiedRooms / rooms.length) * 100);
  
  const report = {
    date: reportDate,
    financial: {
      totalRevenue,
      roomRevenue,
      fbRevenue,
      barRevenue,
      transactions: dayPayments.length
    },
    operations: {
      occupancyRate,
      occupiedRooms,
      availableRooms: rooms.length - occupiedRooms,
      ordersProcessed: dayOrders.length,
      completedOrders: dayOrders.filter(o => o.status === 'completed' || o.status === 'delivered').length
    },
    staff: {
      totalStaff: staff.length,
      onDuty: staff.filter(s => s.status === 'on-duty').length,
      totalHours: staff.length * 8
    }
  };
  
  res.json(report);
});

app.get('/api/admin/weekly-report', requireStaffAuth, (req, res) => {
  // Calculate weekly metrics
  const weeklyRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const weeklyOrders = kitchenOrders.length;
  const avgOccupancy = Math.round((rooms.filter(r => r.status === 'occupied').length / rooms.length) * 100);
  
  const report = {
    period: 'Last 7 Days',
    revenue: weeklyRevenue,
    orders: weeklyOrders,
    averageOccupancy: avgOccupancy,
    customerCount: customers.length,
    staffPerformance: 'Excellent'
  };
  
  res.json(report);
});

app.get('/api/admin/analytics-export', requireStaffAuth, (req, res) => {
  const analytics = {
    revenue: {
      total: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
      average: Math.round(payments.reduce((sum, p) => sum + (p.amount || 0), 0) / 7),
      growth: 12.5
    },
    occupancy: {
      current: Math.round((rooms.filter(r => r.status === 'occupied').length / rooms.length) * 100),
      average: 78,
      peak: 95
    },
    customer: {
      total: customers.length,
      new: Math.round(customers.length * 0.3),
      returning: Math.round(customers.length * 0.7)
    }
  };
  
  res.json(analytics);
});

app.get('/api/admin/financial-report', requireStaffAuth, (req, res) => {
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const estimatedCosts = totalRevenue * 0.65; // 65% cost ratio
  const netProfit = totalRevenue - estimatedCosts;
  
  const financial = {
    revenue: {
      total: totalRevenue,
      room: Math.round(totalRevenue * 0.6),
      fb: Math.round(totalRevenue * 0.25),
      bar: Math.round(totalRevenue * 0.15)
    },
    costs: {
      total: estimatedCosts,
      staff: Math.round(estimatedCosts * 0.4),
      food: Math.round(estimatedCosts * 0.35),
      maintenance: Math.round(estimatedCosts * 0.15),
      operational: Math.round(estimatedCosts * 0.1)
    },
    profit: {
      net: netProfit,
      margin: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0
    }
  };
  
  res.json(financial);
});

app.get('/api/admin/pdf-report', requireStaffAuth, (req, res) => {
  const reportDate = req.query.date || new Date().toISOString().split('T')[0];
  
  // In a real implementation, this would generate a PDF
  // For now, return JSON that could be used to generate PDF
  const pdfData = {
    title: `Hotel Daily Report - ${reportDate}`,
    date: reportDate,
    hotel: '9JA LUXURY life hotel',
    summary: 'Daily operations and financial summary',
    data: {
      revenue: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
      occupancy: Math.round((rooms.filter(r => r.status === 'occupied').length / rooms.length) * 100),
      orders: kitchenOrders.length,
      customers: customers.length
    }
  };
  
  res.json(pdfData);
});

app.post('/api/admin/email-report', requireStaffAuth, (req, res) => {
  const { date } = req.body;
  
  // In a real implementation, this would send an email
  console.log(`Email report requested for date: ${date}`);
  
  res.json({ 
    success: true, 
    message: 'Report sent successfully',
    date: date,
    recipient: 'hotel.owner@9jaluxury.com'
  });
});

app.post('/api/admin/emergency-alert', requireStaffAuth, (req, res) => {
  console.log('Emergency alert triggered by admin');
  
  // In a real implementation, this would send notifications to all staff
  res.json({ 
    success: true, 
    message: 'Emergency alert sent to all staff',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/admin/broadcast', requireStaffAuth, (req, res) => {
  const { message } = req.body;
  
  console.log(`Broadcast message: ${message}`);
  
  res.json({ 
    success: true, 
    message: 'Message broadcasted to all staff',
    broadcastMessage: message,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/admin/backup', requireStaffAuth, (req, res) => {
  console.log('Data backup initiated by admin');
  
  // In a real implementation, this would start a backup process
  res.json({ 
    success: true, 
    message: 'Backup process initiated',
    timestamp: new Date().toISOString(),
    estimatedTime: '5-10 minutes'
  });
});

// Clock records endpoint for admin dashboard
app.get('/api/clock-records', requireStaffAuth, (req, res) => {
  // Mock clock records data for admin dashboard
  const mockClockRecords = [
    {
      id: 1,
      staffId: 'EMP001',
      staffName: 'Alice Manager',
      action: 'clock-in',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      department: 'Management'
    },
    {
      id: 2,
      staffId: 'EMP002',
      staffName: 'Bob Reception',
      action: 'clock-in',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
      department: 'Front Desk'
    }
  ];
  
  res.json(mockClockRecords);
});

app.get('/api/admin/health-check', requireStaffAuth, (req, res) => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  
  res.json({
    status: 'Good',
    uptime: `${hours}h ${minutes}m`,
    database: dbConnected ? 'Connected' : 'Disconnected',
    server: 'Online',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    activeSessions: Object.keys(sessions).length
  });
});

// Start server only when run directly, not when required (e.g., by seed scripts)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🏨 Hotel Manager Server running on port ${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} to access the application`);
  });
}

// Export app for testing and programmatic use
module.exports = app;
