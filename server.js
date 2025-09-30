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
    // Check if running in Electron
    const isElectron = req.headers['user-agent'] && req.headers['user-agent'].includes('Electron');
    
    if (isElectron) {
        // Very relaxed CSP for packaged Electron apps to avoid warnings
        res.setHeader('Content-Security-Policy', 
            "default-src * data: blob: filesystem: about: ws: wss: 'unsafe-inline' 'unsafe-eval'; " +
            "script-src * data: blob: 'unsafe-inline' 'unsafe-eval'; " +
            "connect-src * data: blob: 'unsafe-inline'; " +
            "img-src * data: blob: 'unsafe-inline'; " +
            "frame-src * data: blob:; " +
            "style-src * data: blob: 'unsafe-inline'; " +
            "font-src * data: blob: 'unsafe-inline';"
        );
    } else {
        // Standard CSP for web browsers
        res.setHeader('Content-Security-Policy', 
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://localhost:* https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com https://fonts.gstatic.com; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com; " +
            "style-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com; " +
            "img-src 'self' data: blob: http://localhost:*; " +
            "connect-src 'self' http://localhost:* https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com https://fonts.gstatic.com; " +
            "font-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.gstatic.com https://fonts.googleapis.com;"
        );
    }
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

// Create guest token for guest portal
function createGuestToken(customer) {
  const payload = {
    customerId: customer.customerId,
    name: customer.name,
    type: 'guest',
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days for guests
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

// Guest authentication middleware
function requireGuestAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization || req.headers['x-auth-token'];
  if (!authHeader) {
    console.warn('Guest auth failed: missing Authorization header');
    return res.status(401).json({ error: 'Guest authentication required' });
  }
  let token;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof authHeader === 'string' && authHeader.length > 20) {
    token = authHeader;
  }
  if (!token) {
    console.warn('Guest auth failed: malformed Authorization header', authHeader);
    return res.status(401).json({ error: 'Guest authentication required' });
  }
  
  const payload = verifyToken(token);
  if (!payload || payload.type !== 'guest') {
    console.warn('Guest auth failed: invalid or expired token');
    return res.status(401).json({ error: 'Guest authentication required' });
  }
  
  req.guest = payload;
  console.log('Guest token verified successfully for:', payload.name);
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

// Director-only middleware for price editing
function requireDirectorAuth(req, res, next) {
    requireStaffAuth(req, res, (err) => {
        if (err) return next(err);
        
        // Only Director can edit room prices
        if (req.staff.position !== 'director') {
            console.log('💰 Price edit denied for position:', req.staff.position, 'User:', req.staff.personalId);
            return res.status(403).json({ 
                error: 'Director access required',
                message: 'Only the Hotel Director can edit room prices',
                currentPosition: req.staff.position,
                requiredPosition: 'director',
                feature: 'Room Price Management'
            });
        }
        
        console.log('💰 Price edit access granted for Director:', req.staff.personalId);
        next();
    });
}

// Manager authentication middleware (Directors and Managers can manage staff)
function requireManagerAuth(req, res, next) {
    requireStaffAuth(req, res, (err) => {
        if (err) return next(err);
        
        // Directors and Managers can manage staff status
        if (!['director', 'management'].includes(req.staff.position)) {
            console.log('👥 Staff management denied for position:', req.staff.position, 'User:', req.staff.personalId);
            return res.status(403).json({ 
                error: 'Manager access required',
                message: 'Only Directors and Managers can change staff status',
                currentPosition: req.staff.position,
                requiredPositions: ['director', 'management'],
                feature: 'Staff Status Management'
            });
        }
        
        console.log('👥 Staff management access granted for:', req.staff.position, req.staff.personalId);
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
app.use('/api/guest', (req, res, next) => {
  // Allow guest auth endpoint without prior token
  if (req.path === '/authenticate') {
    return next();
  }
  return requireGuestAuth(req, res, next);
});
app.use('/api', (req, res, next) => {
  // Skip auth for guest routes (they have their own middleware)
  if (req.originalUrl.startsWith('/api/guest') || req.originalUrl.startsWith('/api/admin')) {
    return next();
  }
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

// Lounge rental system
let loungeBookings = [
    {
        id: 1,
        eventName: 'Sarah\'s Birthday Party',
        customerName: 'Sarah Johnson',
        customerPhone: '+234-800-123-4567',
        customerEmail: 'sarah.johnson@email.com',
        eventType: 'Birthday Party',
        eventDate: '2025-10-15',
        startTime: '18:00',
        endTime: '23:00',
        duration: 5, // hours
        guestCount: 25,
        totalAmount: 150000,
        depositPaid: 75000,
        remainingBalance: 75000,
        status: 'confirmed', // pending, confirmed, in-progress, completed, cancelled
        specialRequests: 'Birthday cake setup, balloon decorations',
        setupRequirements: 'DJ booth, dance floor space',
        cateringIncluded: true,
        decorationsIncluded: true,
        bookingDate: '2025-09-25T10:30:00',
        bookedBy: 'Hotel Manager',
        paymentStatus: 'partial', // paid, partial, pending
        notes: 'VIP customer - ensure premium service',
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

// Lounge pricing structure
const loungePricing = {
    eventTypes: {
        'Birthday Party': {
            basePrice: 25000, // Base price for 4 hours
            extraHourRate: 8000,
            minimumHours: 4,
            maximumHours: 8,
            description: 'Perfect for birthday celebrations with decorations and entertainment space'
        },
        'Wedding Reception': {
            basePrice: 80000, // Base price for 6 hours
            extraHourRate: 15000,
            minimumHours: 6,
            maximumHours: 12,
            description: 'Elegant venue for wedding receptions with premium service'
        },
        'Corporate Event': {
            basePrice: 60000, // Base price for 4 hours
            extraHourRate: 12000,
            minimumHours: 3,
            maximumHours: 10,
            description: 'Professional setting for business meetings and corporate functions'
        },
        'Anniversary Celebration': {
            basePrice: 35000, // Base price for 4 hours
            extraHourRate: 10000,
            minimumHours: 4,
            maximumHours: 8,
            description: 'Romantic atmosphere for anniversary and milestone celebrations'
        },
        'Graduation Party': {
            basePrice: 30000, // Base price for 4 hours
            extraHourRate: 9000,
            minimumHours: 4,
            maximumHours: 8,
            description: 'Celebratory space for academic achievements and graduations'
        },
        'Private Meeting': {
            basePrice: 15000, // Base price for 2 hours
            extraHourRate: 5000,
            minimumHours: 2,
            maximumHours: 6,
            description: 'Intimate setting for private meetings and small gatherings'
        }
    },
    addOns: {
        decorations: {
            basic: 15000,
            premium: 35000,
            luxury: 60000
        },
        catering: {
            perPerson: 3500,
            minimumGuests: 10
        },
        audioVisual: {
            basic: 20000, // Microphone and speakers
            premium: 45000, // DJ setup, lighting
            professional: 80000 // Full AV setup with projection
        },
        photography: {
            basic: 25000, // 2 hours
            full: 50000 // Full event coverage
        }
    },
    securityDeposit: 50000, // Refundable security deposit
    cancellationPolicy: {
        moreThan7Days: 0.10, // 10% penalty
        moreThan3Days: 0.25, // 25% penalty
        lessThan3Days: 0.50  // 50% penalty
    }
};

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
        supplierCode: 'SUP001',
        lastRestocked: '2025-09-18',
        purchasePrice: 85,
        sellingPrice: 120,
        totalValue: 150 * 85,
        potentialRevenue: 150 * 120,
        profitMargin: ((120 - 85) / 85 * 100).toFixed(2)
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
        supplierCode: 'SUP002',
        lastRestocked: '2025-09-15',
        purchasePrice: 1500,
        sellingPrice: 2200,
        totalValue: 45 * 1500,
        potentialRevenue: 45 * 2200,
        profitMargin: ((2200 - 1500) / 1500 * 100).toFixed(2)
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
        supplierCode: 'SUP003',
        lastRestocked: '2025-09-19',
        purchasePrice: 2800,
        sellingPrice: 4200,
        totalValue: 12 * 2800,
        potentialRevenue: 12 * 4200,
        profitMargin: ((4200 - 2800) / 2800 * 100).toFixed(2)
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
        supplierCode: 'SUP004',
        lastRestocked: '2025-09-17',
        purchasePrice: 450,
        sellingPrice: 650,
        totalValue: 85 * 450,
        potentialRevenue: 85 * 650,
        profitMargin: ((650 - 450) / 450 * 100).toFixed(2)
    }
];

// Suppliers Database
let suppliers = [
    {
        id: 1,
        name: 'CleanCorp Ltd',
        code: 'SUP001',
        email: 'orders@cleancorp.com',
        phone: '+234-701-234-5678',
        contact: 'Johnson Adebayo',
        category: 'cleaning',
        address: '15 Industrial Avenue, Ikeja, Lagos State',
        paymentTerms: 30,
        status: 'active',
        notes: 'Reliable supplier for all cleaning supplies. Bulk discount available.',
        lastOrder: '2025-09-18',
        totalOrders: 24
    },
    {
        id: 2,
        name: 'LinenPlus',
        code: 'SUP002',
        email: 'sales@linenplus.ng',
        phone: '+234-802-345-6789',
        contact: 'Mary Okafor',
        category: 'linens',
        address: '8 Textile Road, Kano State',
        paymentTerms: 21,
        status: 'active',
        notes: 'High-quality linens and towels. Fast delivery within 48hrs.',
        lastOrder: '2025-09-15',
        totalOrders: 18
    },
    {
        id: 3,
        name: 'Premium Coffee Co',
        code: 'SUP003',
        email: 'orders@premiumcoffee.com',
        phone: '+234-803-456-7890',
        contact: 'David Ibrahim',
        category: 'food-beverage',
        address: '22 Coffee Street, Jos, Plateau State',
        paymentTerms: 14,
        status: 'active',
        notes: 'Premium coffee beans, competitive pricing for bulk orders.',
        lastOrder: '2025-09-19',
        totalOrders: 12
    },
    {
        id: 4,
        name: 'LuxCare Products',
        code: 'SUP004',
        email: 'info@luxcare.ng',
        phone: '+234-804-567-8901',
        contact: 'Sarah Mohammed',
        category: 'cleaning',
        address: '5 Beauty Complex, Abuja FCT',
        paymentTerms: 30,
        status: 'active',
        notes: 'Luxury amenities and personal care products.',
        lastOrder: '2025-09-17',
        totalOrders: 15
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

// Initialize hotel staff with professional job title-based credentials
const staffList = [
  { id: 1, personalId: 'DIR001', name: 'Hotel Director', email: 'director@9jaluxury.com', phone: '555-1001', position: 'director', shift: 'all-day', hourlyRate: 25000, startDate: '2024-01-01', status: 'on-duty', pin: '1001', department: 'Executive', createdAt: new Date(), permissions: { rooms: true, customers: true, bar: true, kitchen: true, payments: true, reports: true, staff: true, settings: true } },
  { id: 2, personalId: 'MGR001', name: 'Hotel Manager', email: 'manager@9jaluxury.com', phone: '555-2001', position: 'management', shift: 'all-day', hourlyRate: 20000, startDate: '2024-01-01', status: 'on-duty', pin: '2001', department: 'Management', createdAt: new Date(), permissions: { rooms: true, customers: true, bar: true, kitchen: true, payments: true, reports: true, staff: true, settings: false } },
  { id: 3, personalId: 'RCP001', name: 'Reception Staff', email: 'reception@9jaluxury.com', phone: '555-3001', position: 'front-desk', shift: 'morning', hourlyRate: 12000, startDate: '2024-01-01', status: 'on-duty', pin: '3001', department: 'Front Office', createdAt: new Date(), permissions: { rooms: true, customers: true, bar: false, kitchen: false, payments: true, reports: false, staff: false, settings: false } },
  { id: 4, personalId: 'HKP001', name: 'Housekeeping Staff', email: 'housekeeping@9jaluxury.com', phone: '555-4001', position: 'housekeeping', shift: 'morning', hourlyRate: 10000, startDate: '2024-01-01', status: 'on-duty', pin: '4001', department: 'Housekeeping', createdAt: new Date(), permissions: { rooms: true, customers: false, bar: false, kitchen: false, payments: false, reports: false, staff: false, settings: false } },
  { id: 5, personalId: 'LND001', name: 'Laundry Staff', email: 'laundry@9jaluxury.com', phone: '555-5001', position: 'laundry', shift: 'morning', hourlyRate: 9000, startDate: '2024-01-01', status: 'on-duty', pin: '5001', department: 'Housekeeping', createdAt: new Date(), permissions: { rooms: true, customers: false, bar: false, kitchen: false, payments: false, reports: false, staff: false, settings: false } },
  { id: 6, personalId: 'KTC001', name: 'Kitchen Staff', email: 'kitchen@9jaluxury.com', phone: '555-6001', position: 'kitchen', shift: 'all-day', hourlyRate: 11000, startDate: '2024-01-01', status: 'on-duty', pin: '6001', department: 'Food & Beverage', createdAt: new Date(), permissions: { rooms: false, customers: false, bar: false, kitchen: true, payments: false, reports: false, staff: false, settings: false } },
  { id: 7, personalId: 'BAR001', name: 'Bar Manager', email: 'bar@9jaluxury.com', phone: '555-7001', position: 'bar-manager', shift: 'afternoon', hourlyRate: 15000, startDate: '2024-01-01', status: 'on-duty', pin: '7001', department: 'Food & Beverage', createdAt: new Date(), permissions: { rooms: false, customers: true, bar: true, kitchen: false, payments: true, reports: true, staff: false, settings: false } }
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
let Room, Customer, BarItem, KitchenOrder, Booking, Payment, Visitor, GuestOrder, StockItem, Supplier, PurchaseOrder, StockMovement, Department, DepartmentLoan, DepartmentTransaction, PaymentAssignment;
try {
  Room = require('./src/models/Room');
  Customer = require('./src/models/Customer');
  BarItem = require('./src/models/BarItem');
  KitchenOrder = require('./src/models/KitchenOrder');
  KitchenItem = require('./src/models/KitchenItem');
  Booking = require('./src/models/Booking');
  Payment = require('./src/models/Payment');
  Visitor = require('./src/models/Visitor');
  GuestOrder = require('./src/models/GuestOrder');
  // Stock Management Models
  const StockModels = require('./src/models/StockModels');
  StockItem = StockModels.StockItem;
  Supplier = StockModels.Supplier;
  PurchaseOrder = StockModels.PurchaseOrder;
  StockMovement = StockModels.StockMovement;
  // Department Financial Models
  Department = require('./src/models/Department');
  DepartmentLoan = require('./src/models/DepartmentLoan');
  DepartmentTransaction = require('./src/models/DepartmentTransaction');
  PaymentAssignment = require('./src/models/PaymentAssignment');
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
  const { includeArchived } = req.query;
  
  // For admin dashboard, include archived tasks. For staff view, exclude them.
  let tasks = laundryTasks;
  if (includeArchived !== 'true') {
    tasks = laundryTasks.filter(task => !task.archived);
  }
  
  res.json(tasks);
});
app.post('/api/laundry', (req, res) => {
  console.log('📋 POST /api/laundry - New request received');
  console.log('Request body:', req.body);
  console.log('Headers:', req.headers);
  
  try {
    const { title, type, roomName, priority, notes, status } = req.body;
    
    console.log('Extracted fields:', { title, type, roomName, priority, notes, status });
    
    // Validate required fields
    if (!title || !type || !roomName || !priority) {
      const missing = [];
      if (!title) missing.push('title');
      if (!type) missing.push('type');
      if (!roomName) missing.push('roomName');
      if (!priority) missing.push('priority');
      
      console.error('❌ Validation failed. Missing fields:', missing);
      return res.status(400).json({ 
        error: `Missing required fields: ${missing.join(', ')}`,
        received: req.body,
        required: ['title', 'type', 'roomName', 'priority']
      });
    }
    
    const task = {
      id: laundryTasks.length + 1,
      title: title, // Keep original title
      type: type,   // Keep original type (washing, drying, etc.)
      status: status || 'Pending',
      assignee: 'Unassigned', // Default to unassigned
      instructions: notes || 'No additional instructions',
      priority: priority,
      roomName: roomName,
      notes: notes || '',
      createdAt: new Date(),
      dueDate: new Date(Date.now() + (priority === 'urgent' ? 2 : priority === 'high' ? 4 : 8) * 60 * 60 * 1000) // 2, 4, or 8 hours based on priority
    };
    
    console.log('📝 Creating task object:', task);
    
    laundryTasks.unshift(task); // Add to beginning of array for newest first
    
    console.log('✅ New laundry task created successfully');
    console.log('Total tasks now:', laundryTasks.length);
    
    res.json({ 
      success: true, 
      task,
      message: 'Laundry task created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating laundry task:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error while creating laundry task',
      details: error.message
    });
  }
});

// Update laundry task
app.put('/api/laundry/:id', (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { status, assignee } = req.body;
    
    const taskIndex = laundryTasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Laundry task not found' });
    }
    
    // Update the task with provided fields
    if (status) {
      laundryTasks[taskIndex].status = status;
    }
    if (assignee) {
      laundryTasks[taskIndex].assignee = assignee;
    }
    
    // Update timestamp
    laundryTasks[taskIndex].updatedAt = new Date();
    
    console.log(`✅ Laundry task ${taskId} updated:`, laundryTasks[taskIndex]);
    res.json({ success: true, task: laundryTasks[taskIndex] });
  } catch (error) {
    console.error('❌ Error updating laundry task:', error);
    res.status(500).json({ error: 'Internal server error while updating laundry task' });
  }
});

// Archive completed laundry task (soft delete - keeps for admin records)
app.delete('/api/laundry/:id', (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    
    console.log(`🗑️ Archiving laundry task ${taskId}`);
    
    const taskIndex = laundryTasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      console.log(`❌ Task ${taskId} not found`);
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Only allow archiving of completed tasks
    if (laundryTasks[taskIndex].status !== 'Completed') {
      console.log(`❌ Cannot archive task ${taskId} - not completed`);
      return res.status(400).json({ error: 'Can only archive completed tasks' });
    }
    
    // Archive the task (soft delete - mark as archived but keep for admin)
    laundryTasks[taskIndex].archived = true;
    laundryTasks[taskIndex].archivedAt = new Date().toISOString();
    laundryTasks[taskIndex].updatedAt = new Date();
    
    console.log(`✅ Task ${taskId} archived successfully`);
    res.json({ success: true, message: 'Task archived successfully', task: laundryTasks[taskIndex] });
  } catch (error) {
    console.error('❌ Error archiving laundry task:', error);
    res.status(500).json({ error: 'Internal server error while archiving laundry task' });
  }
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

// Suppliers API
app.get('/api/suppliers', (req, res) => {
  res.json(suppliers);
});
app.post('/api/suppliers', (req, res) => {
  const supplier = req.body;
  supplier.id = suppliers.length + 1;
  supplier.totalOrders = 0;
  supplier.lastOrder = null;
  suppliers.push(supplier);
  res.json({ success: true, supplier });
});

// Stock Valuation API
app.get('/api/stock/valuation', (req, res) => {
  const totalValue = stockItems.reduce((sum, item) => sum + (item.totalValue || 0), 0);
  const potentialRevenue = stockItems.reduce((sum, item) => sum + (item.potentialRevenue || 0), 0);
  const averageProfit = stockItems.reduce((sum, item) => sum + parseFloat(item.profitMargin || 0), 0) / stockItems.length;
  const lowStockItems = stockItems.filter(item => item.currentStock <= item.minStock).length;
  
  res.json({
    totalStockValue: totalValue,
    afterSalesValue: potentialRevenue,
    profitMargin: averageProfit.toFixed(2),
    lowStockAlert: lowStockItems,
    itemBreakdown: stockItems.map(item => ({
      name: item.name,
      category: item.category,
      currentValue: item.totalValue,
      potentialValue: item.potentialRevenue,
      profitMargin: item.profitMargin,
      stock: item.currentStock,
      status: item.currentStock <= item.minStock ? 'low' : 'normal'
    }))
  });
});

// =========================== COMPREHENSIVE STOCK MANAGEMENT API ===========================

// Stock Items Management
app.get('/api/stock/items', requireStaffAuth, async (req, res) => {
  if (dbConnected && StockItem) {
    try {
      const items = await StockItem.find()
        .populate('supplier', 'name contactPerson')
        .sort({ name: 1 })
        .lean();
      return res.json(items);
    } catch (err) {
      console.error('Error fetching stock items:', err);
    }
  }
  // Fallback data
  res.json(stockItems || []);
});

app.post('/api/stock/items', requireStaffAuth, async (req, res) => {
  if (dbConnected && StockItem) {
    try {
      const item = await StockItem.create(req.body);
      return res.status(201).json(item);
    } catch (err) {
      console.error('Error creating stock item:', err);
      return res.status(400).json({ error: err.message });
    }
  }
  // Fallback
  const item = { id: Date.now(), ...req.body };
  stockItems.push(item);
  res.status(201).json(item);
});

app.put('/api/stock/items/:id', requireStaffAuth, async (req, res) => {
  const itemId = req.params.id;
  if (dbConnected && StockItem) {
    try {
      const updated = await StockItem.findByIdAndUpdate(itemId, req.body, { new: true }).lean();
      if (!updated) return res.status(404).json({ error: 'Item not found' });
      return res.json(updated);
    } catch (err) {
      console.error('Error updating stock item:', err);
      return res.status(400).json({ error: err.message });
    }
  }
  // Fallback
  const itemIndex = stockItems.findIndex(item => item.id == itemId);
  if (itemIndex === -1) return res.status(404).json({ error: 'Item not found' });
  Object.assign(stockItems[itemIndex], req.body);
  res.json(stockItems[itemIndex]);
});

app.delete('/api/stock/items/:id', requireStaffAuth, async (req, res) => {
  const itemId = req.params.id;
  if (dbConnected && StockItem) {
    try {
      await StockItem.findByIdAndDelete(itemId);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  // Fallback
  const itemIndex = stockItems.findIndex(item => item.id == itemId);
  if (itemIndex === -1) return res.status(404).json({ error: 'Item not found' });
  stockItems.splice(itemIndex, 1);
  res.json({ success: true });
});

// Low Stock Alert
app.get('/api/stock/alerts', requireStaffAuth, async (req, res) => {
  if (dbConnected && StockItem) {
    try {
      const lowStockItems = await StockItem.find({
        $expr: { $lte: ['$currentStock', '$minStock'] },
        status: 'active'
      }).select('name category currentStock minStock supplier').lean();
      return res.json(lowStockItems);
    } catch (err) {
      console.error('Error fetching low stock alerts:', err);
    }
  }
  // Fallback
  const alerts = stockItems.filter(item => item.currentStock <= item.minStock);
  res.json(alerts);
});

// Suppliers Management
app.get('/api/suppliers', requireStaffAuth, async (req, res) => {
  if (dbConnected && Supplier) {
    try {
      const suppliers = await Supplier.find({ isActive: true })
        .sort({ name: 1 })
        .lean();
      return res.json(suppliers);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  }
  res.json(suppliers || []);
});

app.post('/api/suppliers', requireStaffAuth, async (req, res) => {
  if (dbConnected && Supplier) {
    try {
      const supplier = await Supplier.create(req.body);
      return res.status(201).json(supplier);
    } catch (err) {
      console.error('Error creating supplier:', err);
      return res.status(400).json({ error: err.message });
    }
  }
  // Fallback
  const supplier = { id: Date.now(), ...req.body, totalOrders: 0, totalValue: 0 };
  suppliers.push(supplier);
  res.status(201).json(supplier);
});

app.put('/api/suppliers/:id', requireStaffAuth, async (req, res) => {
  const supplierId = req.params.id;
  if (dbConnected && Supplier) {
    try {
      const updated = await Supplier.findByIdAndUpdate(supplierId, req.body, { new: true }).lean();
      if (!updated) return res.status(404).json({ error: 'Supplier not found' });
      return res.json(updated);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
  // Fallback
  const supplierIndex = suppliers.findIndex(s => s.id == supplierId);
  if (supplierIndex === -1) return res.status(404).json({ error: 'Supplier not found' });
  Object.assign(suppliers[supplierIndex], req.body);
  res.json(suppliers[supplierIndex]);
});

// Purchase Orders Management
app.get('/api/purchase-orders', requireStaffAuth, async (req, res) => {
  if (dbConnected && PurchaseOrder) {
    try {
      const orders = await PurchaseOrder.find()
        .populate('supplier', 'name contactPerson')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      return res.json(orders);
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
    }
  }
  res.json([]);
});

app.post('/api/purchase-orders', requireStaffAuth, async (req, res) => {
  if (dbConnected && PurchaseOrder) {
    try {
      const order = await PurchaseOrder.create({
        ...req.body,
        createdBy: req.staff?.name || 'Admin'
      });
      return res.status(201).json(order);
    } catch (err) {
      console.error('Error creating purchase order:', err);
      return res.status(400).json({ error: err.message });
    }
  }
  res.status(500).json({ error: 'Database not available' });
});

app.put('/api/purchase-orders/:id/receive', requireStaffAuth, async (req, res) => {
  const orderId = req.params.id;
  const { receivedItems } = req.body;
  
  if (dbConnected && PurchaseOrder && StockItem && StockMovement) {
    try {
      const order = await PurchaseOrder.findById(orderId);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      
      // Update received quantities and stock levels
      for (const receivedItem of receivedItems) {
        const orderItem = order.items.find(item => item._id.toString() === receivedItem.itemId);
        if (orderItem && receivedItem.quantityReceived > 0) {
          orderItem.quantityReceived = (orderItem.quantityReceived || 0) + receivedItem.quantityReceived;
          
          // Update stock item
          const stockItem = await StockItem.findById(orderItem.stockItem);
          if (stockItem) {
            const previousStock = stockItem.currentStock;
            stockItem.currentStock += receivedItem.quantityReceived;
            stockItem.lastPurchaseDate = new Date();
            stockItem.lastPurchasePrice = orderItem.unitPrice;
            await stockItem.save();
            
            // Record stock movement
            await StockMovement.create({
              stockItem: stockItem._id,
              itemName: stockItem.name,
              movementType: 'purchase',
              quantity: receivedItem.quantityReceived,
              previousStock,
              newStock: stockItem.currentStock,
              unitPrice: orderItem.unitPrice,
              totalValue: receivedItem.quantityReceived * orderItem.unitPrice,
              reference: order.orderNumber,
              performedBy: req.staff?.name || 'Admin'
            });
          }
        }
      }
      
      // Update order status
      const allItemsReceived = order.items.every(item => 
        item.quantityReceived >= item.quantityOrdered
      );
      order.status = allItemsReceived ? 'completed' : 'partially-received';
      order.receivedBy = req.staff?.name || 'Admin';
      order.receivedDate = new Date();
      
      await order.save();
      return res.json(order);
      
    } catch (err) {
      console.error('Error receiving purchase order:', err);
      return res.status(400).json({ error: err.message });
    }
  }
  res.status(500).json({ error: 'Database not available' });
});

// Stock Movements (History)
app.get('/api/stock/movements', requireStaffAuth, async (req, res) => {
  if (dbConnected && StockMovement) {
    try {
      const { itemId, type, limit = 50 } = req.query;
      const filter = {};
      if (itemId) filter.stockItem = itemId;
      if (type) filter.movementType = type;
      
      const movements = await StockMovement.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean();
      return res.json(movements);
    } catch (err) {
      console.error('Error fetching stock movements:', err);
    }
  }
  res.json([]);
});

// Stock Adjustment
app.post('/api/stock/adjust', requireStaffAuth, async (req, res) => {
  const { itemId, newQuantity, reason, notes } = req.body;
  
  if (dbConnected && StockItem && StockMovement) {
    try {
      const stockItem = await StockItem.findById(itemId);
      if (!stockItem) return res.status(404).json({ error: 'Item not found' });
      
      const previousStock = stockItem.currentStock;
      const adjustment = newQuantity - previousStock;
      
      stockItem.currentStock = newQuantity;
      await stockItem.save();
      
      // Record movement
      await StockMovement.create({
        stockItem: itemId,
        itemName: stockItem.name,
        movementType: 'adjustment',
        quantity: adjustment,
        previousStock,
        newStock: newQuantity,
        reason: reason || 'Manual adjustment',
        notes,
        performedBy: req.staff?.name || 'Admin'
      });
      
      return res.json({ success: true, stockItem });
    } catch (err) {
      console.error('Error adjusting stock:', err);
      return res.status(400).json({ error: err.message });
    }
  }
  res.status(500).json({ error: 'Database not available' });
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
      // Fall back to fallback data
    }
  }
  
  // Fallback room data (should match what's in the database)
  console.log('⚠️ Using fallback rooms data');
  const fallbackRooms = [
    { id: 1, legacyId: 1, name: 'Port Harcourt', type: 'Standard', status: 'available', price: 35000, floor: 1 },
    { id: 2, legacyId: 2, name: 'Berlin', type: 'Executive', status: 'occupied', price: 40000, floor: 1 },
    { id: 3, legacyId: 3, name: 'Madrid', type: 'Executive', status: 'available', price: 40000, floor: 1 },
    { id: 4, legacyId: 4, name: 'Barcelona', type: 'Executive', status: 'maintenance', price: 40000, floor: 2 },
    { id: 5, legacyId: 5, name: 'Amsterdam', type: 'Executive', status: 'occupied', price: 40000, floor: 2 },
    { id: 6, legacyId: 6, name: 'Prague', type: 'VIP', status: 'available', price: 50000, floor: 2 },
    { id: 7, legacyId: 7, name: 'Paris', type: 'VIP', status: 'cleaning', price: 50000, floor: 2 },
    { id: 8, legacyId: 8, name: 'Vienna', type: 'VIP', status: 'available', price: 50000, floor: 2 },
    { id: 9, legacyId: 9, name: 'New York', type: 'V.VIP', status: 'occupied', price: 60000, floor: 3 },
    { id: 10, legacyId: 10, name: 'Dallas', type: 'V.VIP', status: 'available', price: 60000, floor: 3 },
    { id: 11, legacyId: 11, name: 'Atlanta', type: 'V.VIP', status: 'available', price: 60000, floor: 3 }
  ];
  return res.json(fallbackRooms);
});

// Get individual room by ID
app.get('/api/rooms/:id', requireStaffAuth, async (req, res) => {
  const id = req.params.id;
  console.log(`🏠 Fetching room by ID: ${id}`);
  
  if (dbConnected && Room) {
    try {
      let room;
      
      // Check if it's a MongoDB ObjectId or legacy numeric ID
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        // Treat as legacy numeric ID
        console.log(`🔍 Searching by legacy ID: ${id}`);
        room = await Room.findOne({ legacyId: parseInt(id) }).lean();
      } else {
        // Treat as MongoDB ObjectId
        console.log(`🔍 Searching by MongoDB ID: ${id}`);
        room = await Room.findById(id).lean();
      }
      
      if (!room) {
        console.log(`❌ Room not found in DB: ${id}`);
        return res.status(404).json({ error: 'Room not found' });
      }
      
      console.log(`✅ Found room: ${room.name} (${room.type})`);
      return res.json(room);
      
    } catch (err) {
      console.error('Error fetching room from DB:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }
  
  // Fallback to in-memory rooms if DB not connected
  const roomId = parseInt(id);
  const room = rooms.find(r => r.id === roomId);
  
  if (!room) {
    console.log(`❌ Room not found in memory: ${id}`);
    return res.status(404).json({ error: 'Room not found' });
  }
  
  console.log(`✅ Found room in memory: ${room.name}`);
  res.json(room);
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

// Update room price with audit trail - DIRECTOR ONLY
app.put('/api/rooms/:id/price', requireDirectorAuth, async (req, res) => {
  const id = req.params.id;
  const { price, reason, notes, updatedBy } = req.body;
  
  // Validation
  if (!price || price < 1000 || price > 1000000) {
    return res.status(400).json({ error: 'Price must be between ₦1,000 and ₦1,000,000' });
  }
  
  try {
    if (dbConnected && Room) {
      let room;
      
      // Find room by ID or legacy ID
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        room = await Room.findOne({ legacyId: parseInt(id) });
      } else {
        room = await Room.findById(id);
      }
      
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      
      // Store old price for audit
      const oldPrice = room.price;
      
      // Update room with new price and audit info
      const updateData = {
        price: price,
        lastPriceUpdate: new Date(),
        priceUpdateBy: updatedBy,
        priceChangeReason: reason,
        priceChangeNotes: notes,
        previousPrice: oldPrice
      };
      
      let updated;
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        updated = await Room.findOneAndUpdate({ legacyId: parseInt(id) }, updateData, { new: true }).lean();
      } else {
        updated = await Room.findByIdAndUpdate(id, updateData, { new: true }).lean();
      }
      
      // Log price change
      console.log(`💰 Room price updated: ${room.name} - ${oldPrice} → ${price} (${updatedBy})`);
      
      return res.json({
        success: true,
        room: updated,
        message: `Room price updated from ₦${oldPrice.toLocaleString()} to ₦${price.toLocaleString()}`
      });
      
    } else {
      // Fallback to in-memory rooms if DB not available
      const roomId = parseInt(id);
      const room = rooms.find(r => r.id === roomId);
      
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      
      const oldPrice = room.price;
      room.price = price;
      room.lastPriceUpdate = new Date().toISOString();
      room.priceUpdateBy = updatedBy;
      room.priceChangeReason = reason;
      room.priceChangeNotes = notes;
      room.previousPrice = oldPrice;
      
      console.log(`💰 Room price updated: ${room.name} - ${oldPrice} → ${price} (${updatedBy})`);
      
      return res.json({
        success: true,
        room: room,
        message: `Room price updated from ₦${oldPrice.toLocaleString()} to ₦${price.toLocaleString()}`
      });
    }
  } catch (err) {
    console.error('Error updating room price:', err);
    return res.status(500).json({ error: 'Database error while updating room price' });
  }
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
      // Generate customer ID if not provided
      if (!req.body.customerId) {
        req.body.customerId = await Customer.generateNextCustomerId();
      }
      
      const doc = await Customer.create(req.body);
      console.log('✅ Customer created with ID:', doc.customerId);
      return res.status(201).json(doc);
    } catch (err) {
      console.error('Error creating customer in DB:', err);
      if (err.code === 11000) {
        return res.status(400).json({ error: 'Customer ID already exists' });
      }
    }
  }
  const customer = { 
    id: customers.length + 1, 
    customerId: `CUST${String(customers.length + 1).padStart(3, '0')}`,
    ...req.body, 
    createdAt: new Date() 
  };
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

// =================== GUEST PORTAL API ENDPOINTS ===================

// Guest authentication endpoint
app.post('/api/guest/authenticate', async (req, res) => {
  const { customerId } = req.body;
  
  if (!customerId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Customer ID is required' 
    });
  }
  
  console.log('🔐 Guest authentication attempt for:', customerId);
  
  if (dbConnected && Customer) {
    try {
      const customer = await Customer.findOne({ 
        customerId: customerId.toUpperCase(),
        isActive: true 
      });
      
      if (customer) {
        // Update last login
        customer.lastLogin = new Date();
        await customer.save();
        
        const token = createGuestToken(customer);
        console.log('✅ Guest authenticated successfully:', customer.name);
        
        return res.json({
          success: true,
          token,
          customer: {
            customerId: customer.customerId,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            roomNumber: customer.roomNumber,
            checkInDate: customer.checkInDate,
            checkOutDate: customer.checkOutDate
          }
        });
      }
    } catch (err) {
      console.error('❌ Error authenticating guest:', err);
    }
  }
  
  console.log('❌ Guest authentication failed for:', customerId);
  res.status(401).json({ 
    success: false, 
    error: 'Invalid Customer ID. Please check your ID and try again.' 
  });
});

// Get guest profile
app.get('/api/guest/profile', requireGuestAuth, async (req, res) => {
  const customerId = req.guest.customerId;
  
  if (dbConnected && Customer) {
    try {
      const customer = await Customer.findOne({ customerId });
      if (customer) {
        return res.json({
          customerId: customer.customerId,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          roomNumber: customer.roomNumber,
          checkInDate: customer.checkInDate,
          checkOutDate: customer.checkOutDate,
          notes: customer.notes
        });
      }
    } catch (err) {
      console.error('Error fetching guest profile:', err);
    }
  }
  
  res.status(404).json({ error: 'Guest profile not found' });
});

// Get kitchen menu for guests
app.get('/api/guest/menu', requireGuestAuth, async (req, res) => {
  if (dbConnected && require('./src/models/KitchenItem')) {
    try {
      const KitchenItem = require('./src/models/KitchenItem');
      const menuItems = await KitchenItem.find({ available: true }).lean();
      return res.json(menuItems.map(item => ({
        id: item._id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        available: item.available,
        preparationTime: item.preparationTime || '15-20 minutes'
      })));
    } catch (err) {
      console.error('Error fetching menu:', err);
    }
  }
  
  // Fallback menu items
  const menuItems = [
    { id: '1', name: 'Jollof Rice', description: 'Nigerian spiced rice with chicken', price: 2500, category: 'Main Course', available: true, preparationTime: '20-25 minutes' },
    { id: '2', name: 'Fried Rice', description: 'Stir-fried rice with vegetables', price: 2200, category: 'Main Course', available: true, preparationTime: '15-20 minutes' },
    { id: '3', name: 'Pounded Yam', description: 'Traditional yam with soup', price: 3000, category: 'Main Course', available: true, preparationTime: '25-30 minutes' },
    { id: '4', name: 'Suya', description: 'Spiced grilled meat', price: 1500, category: 'Appetizer', available: true, preparationTime: '10-15 minutes' },
    { id: '5', name: 'Chin Chin', description: 'Sweet fried pastry', price: 800, category: 'Dessert', available: true, preparationTime: '5 minutes' }
  ];
  
  res.json(menuItems);
});

// Place order from guest portal
app.post('/api/guest/orders', requireGuestAuth, async (req, res) => {
  const { items, orderType, description, priority, serviceType } = req.body;
  const customerId = req.guest.customerId;
  
  if (!customerId) {
    return res.status(400).json({ error: 'Customer ID is required' });
  }
  
  // Get customer room number
  let roomNumber = 'Unknown';
  if (dbConnected && Customer) {
    try {
      const customer = await Customer.findOne({ customerId });
      if (customer && customer.roomNumber) {
        roomNumber = customer.roomNumber;
      }
    } catch (err) {
      console.error('Error fetching customer room:', err);
    }
  }
  
  const orderData = {
    customerId,
    orderType: orderType || 'kitchen',
    items: items || [],
    serviceType,
    description: description || '',
    priority: priority || 'medium',
    roomNumber,
    status: 'pending',
    requestedTime: new Date()
  };
  
  if (dbConnected && GuestOrder) {
    try {
      const order = await GuestOrder.create(orderData);
      console.log('✅ Guest order created:', order._id);
      return res.status(201).json({
        success: true,
        order: {
          id: order._id,
          orderType: order.orderType,
          status: order.status,
          totalAmount: order.totalAmount,
          estimatedTime: order.estimatedTime || '20-30 minutes',
          items: order.items
        }
      });
    } catch (err) {
      console.error('❌ Error creating guest order:', err);
    }
  }
  
  // Fallback: return success message
  const orderId = Date.now();
  console.log('⚠️ Using fallback order creation for guest:', customerId);
  
  res.status(201).json({
    success: true,
    order: {
      id: orderId,
      orderType: orderData.orderType,
      status: 'pending',
      totalAmount: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      estimatedTime: '20-30 minutes',
      items: items
    }
  });
});

// Get guest orders history
app.get('/api/guest/orders', requireGuestAuth, async (req, res) => {
  const customerId = req.guest.customerId;
  
  if (dbConnected && GuestOrder) {
    try {
      const orders = await GuestOrder.find({ customerId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      
      return res.json(orders.map(order => ({
        id: order._id,
        orderType: order.orderType,
        status: order.status,
        description: order.description,
        totalAmount: order.totalAmount,
        requestedTime: order.requestedTime,
        estimatedTime: order.estimatedTime,
        completedAt: order.completedAt,
        items: order.items
      })));
    } catch (err) {
      console.error('Error fetching guest orders:', err);
    }
  }
  
  // Fallback: empty array
  res.json([]);
});

// Register visitor
app.post('/api/guest/visitors', requireGuestAuth, async (req, res) => {
  const { visitorName, visitorPhone, visitorIdNumber, expectedDate, expectedTime, purpose, duration, notes } = req.body;
  const customerId = req.guest.customerId;
  
  if (!visitorName || !visitorIdNumber || !expectedDate || !expectedTime || !purpose) {
    return res.status(400).json({ 
      error: 'Visitor name, ID number, expected date, time, and purpose are required' 
    });
  }
  
  const visitorData = {
    customerId,
    visitorName,
    visitorPhone: visitorPhone || '',
    visitorIdNumber,
    expectedDate: new Date(expectedDate),
    expectedTime,
    purpose,
    duration: duration || '',
    notes: notes || '',
    status: 'pending'
  };
  
  if (dbConnected && Visitor) {
    try {
      const visitor = await Visitor.create(visitorData);
      console.log('✅ Visitor registered:', visitor._id);
      return res.status(201).json({
        success: true,
        visitor: {
          id: visitor._id,
          visitorName: visitor.visitorName,
          expectedDate: visitor.expectedDate,
          expectedTime: visitor.expectedTime,
          purpose: visitor.purpose,
          status: visitor.status
        },
        message: 'Visitor registered successfully. Security will be notified.'
      });
    } catch (err) {
      console.error('❌ Error registering visitor:', err);
    }
  }
  
  // Fallback success
  console.log('⚠️ Using fallback visitor registration for guest:', customerId);
  res.status(201).json({
    success: true,
    visitor: {
      id: Date.now(),
      visitorName: visitorData.visitorName,
      expectedDate: visitorData.expectedDate,
      expectedTime: visitorData.expectedTime,
      purpose: visitorData.purpose,
      status: 'pending'
    },
    message: 'Visitor registered successfully. Security will be notified.'
  });
});

// Get guest visitors
app.get('/api/guest/visitors', requireGuestAuth, async (req, res) => {
  const customerId = req.guest.customerId;
  
  if (dbConnected && Visitor) {
    try {
      const visitors = await Visitor.find({ customerId })
        .sort({ expectedDate: -1 })
        .limit(10)
        .lean();
      
      return res.json(visitors.map(visitor => ({
        id: visitor._id,
        visitorName: visitor.visitorName,
        visitorPhone: visitor.visitorPhone,
        expectedDate: visitor.expectedDate,
        expectedTime: visitor.expectedTime,
        purpose: visitor.purpose,
        status: visitor.status,
        approvedBy: visitor.approvedBy,
        checkedInAt: visitor.checkedInAt
      })));
    } catch (err) {
      console.error('Error fetching guest visitors:', err);
    }
  }
  
  // Fallback: empty array
  res.json([]);
});

// =================== END GUEST PORTAL API ===================

// =================== STAFF GUEST ORDER MANAGEMENT ===================

// Get all guest orders for staff management
app.get('/api/staff/guest-orders', requireStaffAuth, async (req, res) => {
  console.log('📋 Staff fetching all guest orders');
  const { status, orderType, limit = 50 } = req.query;
  
  // For now, return empty array until we have guest orders functionality
  // This prevents the CastError issues with customer ID population
  console.log('⚠️ Guest orders feature is under development - returning empty array');
  return res.json([]);
  
  /* TODO: Fix customer ID population issue before enabling this code
  if (dbConnected && GuestOrder) {
    try {
      let query = {};
      
      // Filter by status if provided
      if (status && status !== 'all') {
        query.status = status;
      }
      
      // Filter by order type if provided
      if (orderType && orderType !== 'all') {
        query.orderType = orderType;
      }
      
      const orders = await GuestOrder.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean();
      
      console.log(`✅ Found ${orders.length} guest orders for staff`);
      
      // Manually fetch customer data for each order
      const formattedOrders = await Promise.all(orders.map(async (order) => {
        let customer = { name: 'Unknown', roomNumber: 'N/A', customerId: order.customerId || 'Unknown' };
        
        if (order.customerId && Customer) {
          try {
            // Use a safer query that doesn't cause casting errors
            const customerData = await Customer.findOne({ customerId: order.customerId }).select('name roomNumber customerId').lean();
            if (customerData) {
              customer = {
                name: customerData.name,
                roomNumber: customerData.roomNumber || 'N/A',
                customerId: customerData.customerId
              };
            } else {
              console.warn(`⚠️ Customer not found: ${order.customerId}`);
            }
          } catch (err) {
            console.warn(`⚠️ Could not fetch customer ${order.customerId}:`, err.message);
            // Use the order.customerId as fallback
            customer.customerId = order.customerId;
          }
        }
        
        return {
          id: order._id,
          orderNumber: `GO-${order._id.toString().slice(-6).toUpperCase()}`,
          customer: customer,
          orderType: order.orderType,
          status: order.status,
          description: order.description,
          items: order.items || [],
          serviceType: order.serviceType,
          priority: order.priority || 'medium',
          totalAmount: order.totalAmount || 0,
          roomNumber: order.roomNumber || customer.roomNumber || 'N/A',
          requestedTime: order.requestedTime,
          estimatedTime: order.estimatedTime,
          completedAt: order.completedAt,
          notes: order.notes || '',
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        };
      }));
      
      return res.json(formattedOrders);
    } catch (err) {
      console.error('❌ Error fetching guest orders for staff:', err);
      return res.status(500).json({ error: 'Failed to fetch guest orders' });
    }
  }
  */
  
  // Fallback: empty array
  console.log('⚠️ Using fallback empty guest orders array');
  res.json([]);
});

// Update guest order status
app.patch('/api/staff/guest-orders/:orderId', requireStaffAuth, async (req, res) => {
  const { orderId } = req.params;
  const { status, notes, estimatedTime, completedAt } = req.body;
  const staffId = req.user.personalId;
  const staffName = req.user.name;
  
  console.log(`📝 Staff ${staffName} updating guest order ${orderId} to status: ${status}`);
  
  if (dbConnected && GuestOrder) {
    try {
      const updateData = {
        status,
        updatedAt: new Date(),
        lastUpdatedBy: staffName
      };
      
      if (notes) updateData.notes = notes;
      if (estimatedTime) updateData.estimatedTime = estimatedTime;
      if (completedAt || status === 'completed') {
        updateData.completedAt = completedAt || new Date();
      }
      
      const updatedOrder = await GuestOrder.findByIdAndUpdate(
        orderId,
        updateData,
        { new: true }
      ).populate('customerId', 'name roomNumber customerId');
      
      if (!updatedOrder) {
        return res.status(404).json({ error: 'Guest order not found' });
      }
      
      console.log('✅ Guest order updated successfully');
      
      const formattedOrder = {
        id: updatedOrder._id,
        orderNumber: `GO-${updatedOrder._id.toString().slice(-6).toUpperCase()}`,
        customer: updatedOrder.customerId || { name: 'Unknown', roomNumber: 'N/A' },
        orderType: updatedOrder.orderType,
        status: updatedOrder.status,
        description: updatedOrder.description,
        items: updatedOrder.items || [],
        serviceType: updatedOrder.serviceType,
        priority: updatedOrder.priority || 'medium',
        totalAmount: updatedOrder.totalAmount || 0,
        roomNumber: updatedOrder.roomNumber,
        requestedTime: updatedOrder.requestedTime,
        estimatedTime: updatedOrder.estimatedTime,
        completedAt: updatedOrder.completedAt,
        notes: updatedOrder.notes || '',
        lastUpdatedBy: updatedOrder.lastUpdatedBy,
        createdAt: updatedOrder.createdAt,
        updatedAt: updatedOrder.updatedAt
      };
      
      return res.json({ 
        success: true, 
        message: 'Guest order updated successfully',
        order: formattedOrder 
      });
    } catch (err) {
      console.error('❌ Error updating guest order:', err);
      return res.status(500).json({ error: 'Failed to update guest order' });
    }
  }
  
  res.status(503).json({ error: 'Database not available' });
});

// Get guest order statistics for staff dashboard
app.get('/api/staff/guest-orders/stats', requireStaffAuth, async (req, res) => {
  console.log('📊 Fetching guest order statistics');
  
  if (dbConnected && GuestOrder) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Get counts by status
      const [pending, inProgress, completed, cancelled, todayRevenue] = await Promise.all([
        GuestOrder.countDocuments({ status: 'pending' }),
        GuestOrder.countDocuments({ status: 'in-progress' }),
        GuestOrder.countDocuments({ 
          status: 'completed',
          completedAt: { $gte: today, $lt: tomorrow }
        }),
        GuestOrder.countDocuments({ status: 'cancelled' }),
        GuestOrder.aggregate([
          {
            $match: {
              status: 'completed',
              completedAt: { $gte: today, $lt: tomorrow }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalAmount' }
            }
          }
        ])
      ]);
      
      const stats = {
        pending,
        inProgress,
        completed,
        cancelled,
        todayRevenue: todayRevenue[0]?.total || 0,
        total: pending + inProgress + completed + cancelled
      };
      
      console.log('✅ Guest order stats:', stats);
      return res.json(stats);
    } catch (err) {
      console.error('❌ Error fetching guest order stats:', err);
      return res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
  
  // Fallback stats
  res.json({
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    todayRevenue: 0,
    total: 0
  });
});

// Delete/Cancel guest order
app.delete('/api/staff/guest-orders/:orderId', requireStaffAuth, async (req, res) => {
  const { orderId } = req.params;
  const staffName = req.user.name;
  
  console.log(`🗑️ Staff ${staffName} cancelling guest order ${orderId}`);
  
  if (dbConnected && GuestOrder) {
    try {
      const order = await GuestOrder.findByIdAndUpdate(
        orderId,
        { 
          status: 'cancelled',
          notes: `Cancelled by staff: ${staffName}`,
          updatedAt: new Date(),
          lastUpdatedBy: staffName
        },
        { new: true }
      );
      
      if (!order) {
        return res.status(404).json({ error: 'Guest order not found' });
      }
      
      console.log('✅ Guest order cancelled successfully');
      return res.json({ success: true, message: 'Guest order cancelled successfully' });
    } catch (err) {
      console.error('❌ Error cancelling guest order:', err);
      return res.status(500).json({ error: 'Failed to cancel guest order' });
    }
  }
  
  res.status(503).json({ error: 'Database not available' });
});

// =================== END STAFF GUEST ORDER MANAGEMENT ===================

// Booking Routes
app.get('/api/bookings', requireStaffAuth, async (req, res) => {
  console.log('📋 Fetching bookings - DB connected:', dbConnected, '- Booking model:', !!Booking);
  
  if (dbConnected && Booking) {
    try {
      const docs = await Booking.find().lean();
      console.log('✅ Fetched', docs.length, 'bookings from MongoDB');
      return res.json(docs.map(d => ({ ...d, id: d._id, legacyId: d.legacyId })));
    } catch (err) {
      console.error('❌ Error fetching bookings from DB:', err);
      // Fall back to empty array instead of error
    }
  }
  
  // Fallback: return empty array instead of 503 error
  console.log('⚠️ Using fallback empty bookings array');
  return res.json([]);
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

// LOUNGE MANAGEMENT API
// Get all lounge bookings
app.get('/api/lounge/bookings', requireManagerAuth, async (req, res) => {
  console.log('🏛️ Fetching lounge bookings...');
  
  try {
    // Filter by date range if provided
    const { startDate, endDate, status } = req.query;
    let filteredBookings = [...loungeBookings];
    
    if (startDate) {
      filteredBookings = filteredBookings.filter(booking => 
        new Date(booking.eventDate) >= new Date(startDate)
      );
    }
    
    if (endDate) {
      filteredBookings = filteredBookings.filter(booking => 
        new Date(booking.eventDate) <= new Date(endDate)
      );
    }
    
    if (status) {
      filteredBookings = filteredBookings.filter(booking => 
        booking.status === status
      );
    }
    
    console.log('✅ Fetched', filteredBookings.length, 'lounge bookings');
    res.json(filteredBookings);
  } catch (error) {
    console.error('❌ Error fetching lounge bookings:', error);
    res.status(500).json({ error: 'Failed to fetch lounge bookings' });
  }
});

// Get lounge pricing information
app.get('/api/lounge/pricing', requireStaffAuth, (req, res) => {
  console.log('💰 Fetching lounge pricing...');
  res.json(loungePricing);
});

// Calculate lounge booking cost
app.post('/api/lounge/calculate-cost', requireStaffAuth, (req, res) => {
  const { eventType, duration, guestCount, addOns = {} } = req.body;
  
  console.log('🧮 Calculating lounge cost for:', eventType, duration, 'hours,', guestCount, 'guests');
  
  if (!eventType || !loungePricing.eventTypes[eventType]) {
    return res.status(400).json({ error: 'Invalid event type' });
  }
  
  const pricing = loungePricing.eventTypes[eventType];
  let totalCost = 0;
  let breakdown = [];
  
  // Base cost calculation
  if (duration <= pricing.minimumHours) {
    totalCost += pricing.basePrice;
    breakdown.push({
      item: `${eventType} - Base Package (${pricing.minimumHours} hours)`,
      cost: pricing.basePrice
    });
  } else {
    totalCost += pricing.basePrice;
    const extraHours = duration - pricing.minimumHours;
    const extraCost = extraHours * pricing.extraHourRate;
    totalCost += extraCost;
    
    breakdown.push({
      item: `${eventType} - Base Package (${pricing.minimumHours} hours)`,
      cost: pricing.basePrice
    });
    breakdown.push({
      item: `Extra Hours (${extraHours} × ₦${pricing.extraHourRate.toLocaleString()})`,
      cost: extraCost
    });
  }
  
  // Add-ons calculation
  if (addOns.decorations) {
    const decorationCost = loungePricing.addOns.decorations[addOns.decorations];
    if (decorationCost) {
      totalCost += decorationCost;
      breakdown.push({
        item: `Decorations (${addOns.decorations})`,
        cost: decorationCost
      });
    }
  }
  
  if (addOns.catering && guestCount >= loungePricing.addOns.catering.minimumGuests) {
    const cateringCost = guestCount * loungePricing.addOns.catering.perPerson;
    totalCost += cateringCost;
    breakdown.push({
      item: `Catering (${guestCount} guests × ₦${loungePricing.addOns.catering.perPerson.toLocaleString()})`,
      cost: cateringCost
    });
  }
  
  if (addOns.audioVisual) {
    const avCost = loungePricing.addOns.audioVisual[addOns.audioVisual];
    if (avCost) {
      totalCost += avCost;
      breakdown.push({
        item: `Audio/Visual (${addOns.audioVisual})`,
        cost: avCost
      });
    }
  }
  
  if (addOns.photography) {
    const photoCost = loungePricing.addOns.photography[addOns.photography];
    if (photoCost) {
      totalCost += photoCost;
      breakdown.push({
        item: `Photography (${addOns.photography})`,
        cost: photoCost
      });
    }
  }
  
  // Security deposit
  const securityDeposit = loungePricing.securityDeposit;
  breakdown.push({
    item: 'Security Deposit (Refundable)',
    cost: securityDeposit
  });
  
  const result = {
    eventType,
    duration,
    guestCount,
    subtotal: totalCost,
    securityDeposit,
    totalAmount: totalCost + securityDeposit,
    breakdown,
    minimumDeposit: Math.ceil((totalCost + securityDeposit) * 0.5), // 50% minimum deposit
    calculatedAt: new Date()
  };
  
  console.log('✅ Cost calculation completed. Total:', result.totalAmount);
  res.json(result);
});

// Create new lounge booking
app.post('/api/lounge/bookings', requireManagerAuth, async (req, res) => {
  console.log('🏛️ Creating new lounge booking...');
  
  const {
    eventName,
    customerName,
    customerPhone,
    customerEmail,
    eventType,
    eventDate,
    startTime,
    endTime,
    duration,
    guestCount,
    totalAmount,
    depositPaid = 0,
    specialRequests = '',
    setupRequirements = '',
    cateringIncluded = false,
    decorationsIncluded = false,
    notes = ''
  } = req.body;
  
  // Validation
  if (!eventName || !customerName || !customerPhone || !eventType || !eventDate || !startTime || !endTime) {
    return res.status(400).json({ error: 'Required fields missing' });
  }
  
  // Check for conflicting bookings
  const conflictingBooking = loungeBookings.find(booking => 
    booking.eventDate === eventDate && 
    booking.status !== 'cancelled' &&
    !(
      (startTime >= booking.endTime) || 
      (endTime <= booking.startTime)
    )
  );
  
  if (conflictingBooking) {
    return res.status(409).json({ 
      error: 'Time slot conflict', 
      conflictsWith: conflictingBooking.eventName,
      conflictTime: `${conflictingBooking.startTime} - ${conflictingBooking.endTime}`
    });
  }
  
  const newBooking = {
    id: loungeBookings.length + 1,
    eventName,
    customerName,
    customerPhone,
    customerEmail,
    eventType,
    eventDate,
    startTime,
    endTime,
    duration,
    guestCount,
    totalAmount,
    depositPaid,
    remainingBalance: totalAmount - depositPaid,
    status: depositPaid >= (totalAmount * 0.5) ? 'confirmed' : 'pending',
    specialRequests,
    setupRequirements,
    cateringIncluded,
    decorationsIncluded,
    bookingDate: new Date().toISOString(),
    bookedBy: req.staff.name,
    paymentStatus: depositPaid >= totalAmount ? 'paid' : (depositPaid > 0 ? 'partial' : 'pending'),
    notes,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  loungeBookings.push(newBooking);
  
  // Create payment record if deposit was paid
  if (depositPaid > 0) {
    try {
      const paymentData = {
        customerId: customerEmail || `lounge_${newBooking.id}`,
        customerName: customerName,
        amount: depositPaid,
        method: 'cash', // Default - can be updated
        description: `Lounge booking deposit - ${eventName}`,
        category: 'lounge_rental',
        bookingReference: `LOUNGE_${newBooking.id}`,
        serviceType: 'Lounge Rental',
        eventDetails: {
          eventName,
          eventType,
          eventDate,
          duration,
          guestCount
        },
        collectedBy: req.staff.name,
        createdAt: new Date(),
        date: new Date().toISOString().split('T')[0]
      };
      
      // Add to payment system (both DB and fallback)
      if (dbConnected && Payment) {
        const payment = new Payment(paymentData);
        await payment.save();
        console.log('💳 Lounge payment saved to DB:', payment._id);
      } else {
        // Fallback to in-memory payments array (if it exists)
        if (typeof payments !== 'undefined') {
          paymentData.id = Date.now();
          payments.push(paymentData);
          console.log('💳 Lounge payment saved to memory:', paymentData.id);
        }
      }
      
      console.log('✅ Lounge booking and payment created:', newBooking.id);
      
    } catch (paymentError) {
      console.error('⚠️ Error creating payment record:', paymentError);
      // Don't fail the booking if payment recording fails
    }
  }
  
  console.log('✅ Lounge booking created:', newBooking.id, '-', newBooking.eventName);
  res.status(201).json(newBooking);
});

// Update lounge booking
app.put('/api/lounge/bookings/:id', requireManagerAuth, (req, res) => {
  const bookingId = parseInt(req.params.id);
  const bookingIndex = loungeBookings.findIndex(booking => booking.id === bookingId);
  
  if (bookingIndex === -1) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  console.log('🏛️ Updating lounge booking:', bookingId);
  
  const updatedBooking = {
    ...loungeBookings[bookingIndex],
    ...req.body,
    updatedAt: new Date()
  };
  
  // Recalculate payment status and remaining balance
  if (req.body.depositPaid !== undefined || req.body.totalAmount !== undefined) {
    updatedBooking.remainingBalance = updatedBooking.totalAmount - updatedBooking.depositPaid;
    updatedBooking.paymentStatus = updatedBooking.depositPaid >= updatedBooking.totalAmount ? 'paid' : 
                                  (updatedBooking.depositPaid > 0 ? 'partial' : 'pending');
    
    // Update confirmation status based on payment
    if (updatedBooking.depositPaid >= (updatedBooking.totalAmount * 0.5) && updatedBooking.status === 'pending') {
      updatedBooking.status = 'confirmed';
    }
  }
  
  loungeBookings[bookingIndex] = updatedBooking;
  
  console.log('✅ Lounge booking updated:', bookingId);
  res.json(updatedBooking);
});

// Cancel lounge booking
app.delete('/api/lounge/bookings/:id', requireManagerAuth, (req, res) => {
  const bookingId = parseInt(req.params.id);
  const bookingIndex = loungeBookings.findIndex(booking => booking.id === bookingId);
  
  if (bookingIndex === -1) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  console.log('🏛️ Cancelling lounge booking:', bookingId);
  
  const booking = loungeBookings[bookingIndex];
  const eventDate = new Date(booking.eventDate);
  const today = new Date();
  const daysUntilEvent = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
  
  // Calculate cancellation penalty
  let penaltyRate = 0;
  if (daysUntilEvent < 3) {
    penaltyRate = loungePricing.cancellationPolicy.lessThan3Days;
  } else if (daysUntilEvent < 7) {
    penaltyRate = loungePricing.cancellationPolicy.moreThan3Days;
  } else {
    penaltyRate = loungePricing.cancellationPolicy.moreThan7Days;
  }
  
  const penalty = booking.depositPaid * penaltyRate;
  const refundAmount = booking.depositPaid - penalty;
  
  booking.status = 'cancelled';
  booking.cancellationDate = new Date();
  booking.cancellationPenalty = penalty;
  booking.refundAmount = refundAmount;
  booking.cancelledBy = req.staff.name;
  booking.updatedAt = new Date();
  
  console.log('✅ Lounge booking cancelled with', penaltyRate * 100 + '% penalty');
  res.json({
    success: true,
    message: 'Booking cancelled successfully',
    penalty,
    refundAmount,
    booking
  });
});

// Get lounge availability for a specific date
app.get('/api/lounge/availability/:date', requireStaffAuth, (req, res) => {
  const date = req.params.date;
  console.log('📅 Checking lounge availability for:', date);
  
  const existingBookings = loungeBookings.filter(booking => 
    booking.eventDate === date && 
    booking.status !== 'cancelled'
  );
  
  // Generate available time slots (assuming lounge operates 9 AM to 11 PM)
  const operatingHours = { start: 9, end: 23 }; // 9 AM to 11 PM
  const availableSlots = [];
  
  for (let hour = operatingHours.start; hour < operatingHours.end; hour++) {
    const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
    const nextHour = `${(hour + 1).toString().padStart(2, '0')}:00`;
    
    const isBooked = existingBookings.some(booking => 
      timeSlot >= booking.startTime && timeSlot < booking.endTime
    );
    
    if (!isBooked) {
      availableSlots.push({
        startTime: timeSlot,
        endTime: nextHour,
        available: true
      });
    }
  }
  
  res.json({
    date,
    existingBookings: existingBookings.map(booking => ({
      id: booking.id,
      eventName: booking.eventName,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status
    })),
    availableSlots,
    operatingHours
  });
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

// Kitchen fetches guest food orders (for kitchen staff dashboard)
app.get('/api/kitchen/guest-orders', requireStaffAuth, async (req, res) => {
  // Only show guest orders of type 'kitchen' and status 'pending', 'preparing', or 'confirmed'
  const allowedStatuses = ['pending', 'confirmed', 'preparing', 'ready'];
  if (dbConnected && GuestOrder) {
    try {
      const orders = await GuestOrder.find({
        orderType: 'kitchen',
        status: { $in: allowedStatuses }
      })
        .sort({ requestedTime: 1 })
        .lean();
      return res.json(orders.map(order => ({
        id: order._id,
        customerId: order.customerId,
        roomNumber: order.roomNumber,
        status: order.status,
        description: order.description,
        items: order.items,
        requestedTime: order.requestedTime,
        estimatedTime: order.estimatedTime,
        priority: order.priority,
        serviceType: order.serviceType,
        assignedTo: order.assignedTo
      })));
    } catch (err) {
      console.error('Error fetching guest kitchen orders:', err);
    }
  }
  // Fallback: empty array
  res.json([]);
});

// Room Service fetches guest service orders
app.get('/api/room-service/guest-orders', requireStaffAuth, async (req, res) => {
  const allowedStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];
  if (dbConnected && GuestOrder) {
    try {
      const orders = await GuestOrder.find({
        orderType: 'room-service',
        status: { $in: allowedStatuses }
      })
        .sort({ requestedTime: 1 })
        .lean();
      return res.json(orders.map(order => ({
        id: order._id,
        customerId: order.customerId,
        roomNumber: order.roomNumber,
        status: order.status,
        description: order.description,
        serviceType: order.serviceType,
        items: order.items || [],
        requestedTime: order.requestedTime,
        priority: order.priority,
        assignedTo: order.assignedTo,
        notes: order.notes
      })));
    } catch (err) {
      console.error('Error fetching guest room service orders:', err);
    }
  }
  res.json([]);
});

// Security fetches security-related guest requests
app.get('/api/security/guest-orders', requireStaffAuth, async (req, res) => {
  const allowedStatuses = ['pending', 'confirmed', 'investigating', 'resolved'];
  if (dbConnected && GuestOrder) {
    try {
      const orders = await GuestOrder.find({
        $or: [
          { orderType: 'security' },
          { serviceType: { $regex: /(security|visitor|access|emergency)/i } },
          { priority: 'urgent' }
        ],
        status: { $in: allowedStatuses }
      })
        .sort({ priority: -1, requestedTime: 1 })
        .lean();
      return res.json(orders.map(order => ({
        id: order._id,
        customerId: order.customerId,
        roomNumber: order.roomNumber,
        status: order.status,
        description: order.description,
        serviceType: order.serviceType,
        requestedTime: order.requestedTime,
        priority: order.priority,
        assignedTo: order.assignedTo,
        orderType: order.orderType
      })));
    } catch (err) {
      console.error('Error fetching guest security orders:', err);
    }
  }
  res.json([]);
});

// Laundry/Housekeeping fetches housekeeping and maintenance orders
app.get('/api/housekeeping/guest-orders', requireStaffAuth, async (req, res) => {
  const allowedStatuses = ['pending', 'confirmed', 'in-progress', 'completed'];
  if (dbConnected && GuestOrder) {
    try {
      const orders = await GuestOrder.find({
        $or: [
          { orderType: 'housekeeping' },
          { orderType: 'maintenance' },
          { serviceType: { $regex: /(cleaning|laundry|towel|bedding|maintenance|repair)/i } }
        ],
        status: { $in: allowedStatuses }
      })
        .sort({ requestedTime: 1 })
        .lean();
      return res.json(orders.map(order => ({
        id: order._id,
        customerId: order.customerId,
        roomNumber: order.roomNumber,
        status: order.status,
        description: order.description,
        serviceType: order.serviceType,
        requestedTime: order.requestedTime,
        priority: order.priority,
        assignedTo: order.assignedTo,
        orderType: order.orderType
      })));
    } catch (err) {
      console.error('Error fetching guest housekeeping orders:', err);
    }
  }
  res.json([]);
});

// Update guest order status (for all departments)
app.put('/api/guest/orders/:id', requireStaffAuth, async (req, res) => {
  const orderId = req.params.id;
  const { status, assignedTo, notes, completedAt } = req.body;
  
  if (dbConnected && GuestOrder) {
    try {
      const updateData = { status };
      if (assignedTo) updateData.assignedTo = assignedTo;
      if (notes) updateData.notes = notes;
      if (status === 'completed' && !completedAt) updateData.completedAt = new Date();
      
      const updated = await GuestOrder.findByIdAndUpdate(orderId, updateData, { new: true }).lean();
      if (!updated) return res.status(404).json({ error: 'Order not found' });
      
      return res.json({
        id: updated._id,
        status: updated.status,
        assignedTo: updated.assignedTo,
        notes: updated.notes,
        completedAt: updated.completedAt
      });
    } catch (err) {
      console.error('Error updating guest order:', err);
      return res.status(500).json({ error: 'Failed to update order' });
    }
  }
  res.status(500).json({ error: 'Database not available' });
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
  console.log('💳 Fetching payments - DB connected:', dbConnected, '- Payment model:', !!Payment);
  
  if (dbConnected && Payment) {
    try {
      const docs = await Payment.find().populate('customerId', 'name').lean();
      console.log('✅ Fetched', docs.length, 'payments from MongoDB');
      return res.json(docs.map(d => ({ ...d, id: d._id, legacyId: d.legacyId, customerName: d.customerId ? d.customerId.name : null })));
    } catch (err) {
      console.error('❌ Error fetching payments from DB:', err);
      // Fall back to empty array instead of error
    }
  }
  
  // Fallback to empty array
  console.log('⚠️ Using fallback empty payments array');
  return res.json([]);
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
  console.log('📋 Fetching staff data...');
  console.log('👥 Staff count:', staffList.length);
  console.log('📊 Staff statuses:', staffList.map(s => `${s.name}: ${s.status || 'undefined'}`));
  res.json(staffList);
});

app.post('/api/staff', requireAdminAuth, (req, res) => {
  const newStaff = {
    id: staffList.length + 1,
    ...req.body,
    createdAt: new Date(),
    status: 'off-duty'
  };
  staffList.push(newStaff);
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
  const staffMember = staffList.find(s => s.id === parseInt(req.params.id));
  if (!staffMember) {
    return res.status(404).json({ error: 'Staff member not found' });
  }
  Object.assign(staffMember, req.body);
  res.json(staffMember);
});

// Staff status can be updated by Directors and Managers
app.put('/api/staff/:id/status', requireManagerAuth, (req, res) => {
  const staffId = parseInt(req.params.id);
  const { status } = req.body;
  
  console.log(`👥 Staff status update request by ${req.staff.position} (${req.staff.name}) for ID: ${staffId}, new status: ${status}`);
  
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  
  if (!['on-duty', 'off-duty', 'break', 'sick'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  
  const staffMember = staffList.find(s => s.id === staffId);
  if (!staffMember) {
    console.log(`❌ Staff member not found: ${staffId}`);
    return res.status(404).json({ error: 'Staff member not found' });
  }
  
  // Update status and timestamp
  const oldStatus = staffMember.status;
  staffMember.status = status;
  staffMember.lastStatusUpdate = new Date().toISOString();
  staffMember.statusUpdatedBy = req.staff.name; // Track who made the change
  
  console.log(`✅ Staff status updated by ${req.staff.position}: ${staffMember.name} (${staffId}) from ${oldStatus} to ${status}`);
  
  res.json({ 
    success: true, 
    message: 'Status updated successfully',
    staff: staffMember,
    updatedBy: req.staff.name
  });
});

app.delete('/api/staff/:id', requireAdminAuth, (req, res) => {
  const index = staffList.findIndex(s => s.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Staff member not found' });
  }
  staffList.splice(index, 1);
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

app.get('/api/staff/current-status', requireManagerAuth, (req, res) => {
  console.log('📋 Fetching current staff status...');
  const currentTime = new Date();
  const statusSummary = staffList.map(member => {
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
      lastActionTime: latestRecord ? latestRecord.timestamp : null,
      lastStatusUpdate: member.lastStatusUpdate || null,
      statusUpdatedBy: member.statusUpdatedBy || null
    };
  });
  
  console.log('✅ Current status summary:', statusSummary.length, 'staff members');
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

// =================== ADMIN GUEST PORTAL API ENDPOINTS ===================

// Get all guest orders for admin management
app.get('/api/admin/guest-orders', requireStaffAuth, async (req, res) => {
  console.log('📋 Admin fetching guest orders - DB connected:', dbConnected);
  
  if (dbConnected && GuestOrder) {
    try {
      const orders = await GuestOrder.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      
      const formattedOrders = orders.map(order => ({
        _id: order._id,
        customerId: order.customerId,
        orderType: order.orderType,
        items: order.items,
        totalAmount: order.totalAmount,
        status: order.status,
        notes: order.notes,
        roomNumber: order.roomNumber,
        createdAt: order.createdAt,
        serviceType: order.serviceType,
        priority: order.priority,
        assignedStaff: order.assignedStaff
      }));
      
      console.log('✅ Fetched', formattedOrders.length, 'guest orders for admin');
      return res.json(formattedOrders);
    } catch (err) {
      console.error('❌ Error fetching guest orders for admin:', err);
    }
  }
  
  // Fallback: empty array
  res.json([]);
});

// Update guest order status (admin)
app.put('/api/admin/guest-orders/:id/status', requireStaffAuth, async (req, res) => {
  const orderId = req.params.id;
  const { status, staffNotes } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  
  console.log('🔄 Admin updating guest order status:', orderId, 'to', status);
  
  if (dbConnected && GuestOrder) {
    try {
      const order = await GuestOrder.findByIdAndUpdate(
        orderId,
        { 
          status,
          staffNotes: staffNotes || '',
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (order) {
        console.log('✅ Guest order status updated successfully');
        return res.json({
          success: true,
          order: {
            id: order._id,
            status: order.status,
            updatedAt: order.updatedAt
          }
        });
      }
    } catch (err) {
      console.error('❌ Error updating guest order status:', err);
    }
  }
  
  res.status(404).json({ error: 'Order not found' });
});

// Get all visitors for admin management
app.get('/api/admin/visitors', requireStaffAuth, async (req, res) => {
  console.log('📋 Admin fetching visitors - DB connected:', dbConnected);
  
  if (dbConnected && Visitor) {
    try {
      const visitors = await Visitor.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      
      const formattedVisitors = visitors.map(visitor => ({
        _id: visitor._id,
        customerId: visitor.customerId,
        visitorName: visitor.visitorName,
        visitorPhone: visitor.visitorPhone,
        visitorIdNumber: visitor.visitorIdNumber,
        expectedDate: visitor.expectedDate,
        expectedTime: visitor.expectedTime,
        visitPurpose: visitor.visitPurpose,
        expectedDuration: visitor.expectedDuration,
        status: visitor.status,
        securityNotes: visitor.securityNotes,
        approvedBy: visitor.approvedBy,
        approvedAt: visitor.approvedAt,
        rejectedReason: visitor.rejectedReason,
        createdAt: visitor.createdAt
      }));
      
      console.log('✅ Fetched', formattedVisitors.length, 'visitors for admin');
      return res.json(formattedVisitors);
    } catch (err) {
      console.error('❌ Error fetching visitors for admin:', err);
    }
  }
  
  // Fallback: empty array
  res.json([]);
});

// Approve visitor (admin)
app.put('/api/admin/visitors/:id/approve', requireStaffAuth, async (req, res) => {
  const visitorId = req.params.id;
  const { securityNotes } = req.body;
  
  console.log('✅ Admin approving visitor:', visitorId);
  
  if (dbConnected && Visitor) {
    try {
      const visitor = await Visitor.findByIdAndUpdate(
        visitorId,
        { 
          status: 'approved',
          securityNotes: securityNotes || '',
          approvedBy: 'Admin', // In real app, get from auth token
          approvedAt: new Date(),
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (visitor) {
        console.log('✅ Visitor approved successfully');
        return res.json({
          success: true,
          visitor: {
            id: visitor._id,
            status: visitor.status,
            approvedAt: visitor.approvedAt
          }
        });
      }
    } catch (err) {
      console.error('❌ Error approving visitor:', err);
    }
  }
  
  res.status(404).json({ error: 'Visitor not found' });
});

// Reject visitor (admin)
app.put('/api/admin/visitors/:id/reject', requireStaffAuth, async (req, res) => {
  const visitorId = req.params.id;
  const { reason } = req.body;
  
  console.log('❌ Admin rejecting visitor:', visitorId);
  
  if (dbConnected && Visitor) {
    try {
      const visitor = await Visitor.findByIdAndUpdate(
        visitorId,
        { 
          status: 'rejected',
          rejectedReason: reason || 'Rejected by security',
          rejectedBy: 'Admin', // In real app, get from auth token
          rejectedAt: new Date(),
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (visitor) {
        console.log('❌ Visitor rejected successfully');
        return res.json({
          success: true,
          visitor: {
            id: visitor._id,
            status: visitor.status,
            rejectedAt: visitor.rejectedAt
          }
        });
      }
    } catch (err) {
      console.error('❌ Error rejecting visitor:', err);
    }
  }
  
  res.status(404).json({ error: 'Visitor not found' });
});

// Get guest portal analytics for admin
app.get('/api/admin/guest-analytics', requireStaffAuth, async (req, res) => {
  console.log('📊 Admin fetching guest analytics');
  
  let guestOrders = [];
  let visitors = [];
  
  if (dbConnected && GuestOrder && Visitor) {
    try {
      [guestOrders, visitors] = await Promise.all([
        GuestOrder.find().lean(),
        Visitor.find().lean()
      ]);
    } catch (err) {
      console.error('❌ Error fetching guest analytics data:', err);
    }
  }
  
  // Calculate analytics
  const analytics = {
    orders: {
      total: guestOrders.length,
      pending: guestOrders.filter(o => o.status === 'pending').length,
      completed: guestOrders.filter(o => o.status === 'delivered').length,
      revenue: guestOrders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    },
    visitors: {
      total: visitors.length,
      pending: visitors.filter(v => v.status === 'pending').length,
      approved: visitors.filter(v => v.status === 'approved').length,
      rejected: visitors.filter(v => v.status === 'rejected').length,
      approvalRate: visitors.length > 0 
        ? Math.round((visitors.filter(v => v.status === 'approved').length / visitors.length) * 100)
        : 0
    },
    activeGuests: new Set(guestOrders.map(o => o.customerId)).size,
    topOrderItems: getTopOrderItems(guestOrders),
    ordersByHour: getOrdersByHour(guestOrders)
  };
  
  res.json(analytics);
});

// Helper function to get top ordered items
function getTopOrderItems(orders) {
  const itemCounts = {};
  orders.forEach(order => {
    if (order.items) {
      order.items.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    }
  });
  
  return Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
}

// Helper function to get orders by hour
function getOrdersByHour(orders) {
  const hourCounts = {};
  orders.forEach(order => {
    const hour = new Date(order.createdAt).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  return Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => a.hour - b.hour);
}

// =================== END ADMIN GUEST PORTAL API ===================

// ===== DEPARTMENT FINANCIAL MANAGEMENT ROUTES =====

// Get all departments
app.get('/api/departments', requireManagerAuth, async (req, res) => {
  console.log('🏢 Fetching departments...');
  
  try {
    let departments;
    
    if (dbConnected && Department) {
      departments = await Department.find().sort({ name: 1 });
      console.log(`✅ Fetched ${departments.length} departments from MongoDB`);
    } else {
      // Fallback default departments
      departments = [
        {
          _id: 'dept001',
          name: 'Front Office',
          code: 'FO',
          description: 'Reception, guest services, and front desk operations',
          budget: { monthly: 500000, remaining: 450000, spent: 50000 },
          manager: { name: 'Reception Manager', contact: '+234-xxx-xxxx' },
          category: 'Operations',
          status: 'active',
          creditLimit: 100000,
          currentDebt: 0,
          creditRating: 'A'
        },
        {
          _id: 'dept002',
          name: 'Housekeeping',
          code: 'HK',
          description: 'Room cleaning, maintenance, and housekeeping services',
          budget: { monthly: 400000, remaining: 320000, spent: 80000 },
          manager: { name: 'Housekeeping Manager', contact: '+234-xxx-xxxx' },
          category: 'Housekeeping',
          status: 'active',
          creditLimit: 80000,
          currentDebt: 0,
          creditRating: 'B'
        },
        {
          _id: 'dept003',
          name: 'Food & Beverage',
          code: 'FB',
          description: 'Restaurant, bar, and food service operations',
          budget: { monthly: 800000, remaining: 600000, spent: 200000 },
          manager: { name: 'F&B Manager', contact: '+234-xxx-xxxx' },
          category: 'Food & Beverage',
          status: 'active',
          creditLimit: 150000,
          currentDebt: 25000,
          creditRating: 'B'
        },
        {
          _id: 'dept004',
          name: 'Maintenance',
          code: 'MT',
          description: 'Building maintenance, repairs, and technical services',
          budget: { monthly: 300000, remaining: 180000, spent: 120000 },
          manager: { name: 'Maintenance Manager', contact: '+234-xxx-xxxx' },
          category: 'Maintenance',
          status: 'active',
          creditLimit: 100000,
          currentDebt: 15000,
          creditRating: 'C'
        },
        {
          _id: 'dept005',
          name: 'Administration',
          code: 'AD',
          description: 'Human resources, accounting, and general administration',
          budget: { monthly: 600000, remaining: 550000, spent: 50000 },
          manager: { name: 'Admin Manager', contact: '+234-xxx-xxxx' },
          category: 'Administration',
          status: 'active',
          creditLimit: 200000,
          currentDebt: 0,
          creditRating: 'A'
        }
      ];
      console.log('⚠️ Using fallback departments data');
    }
    
    res.json(departments);
  } catch (error) {
    console.error('❌ Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Create new department
app.post('/api/departments', requireManagerAuth, async (req, res) => {
  console.log('🏢 Creating new department...');
  
  try {
    const {
      name,
      code,
      description,
      monthlyBudget,
      manager,
      category,
      creditLimit
    } = req.body;
    
    // Validation
    if (!name || !code || !category) {
      return res.status(400).json({ error: 'Name, code, and category are required' });
    }
    
    let newDepartment;
    
    if (dbConnected && Department) {
      // Check if department code already exists
      const existingDept = await Department.findOne({ code: code.toUpperCase() });
      if (existingDept) {
        return res.status(409).json({ error: 'Department code already exists' });
      }
      
      newDepartment = new Department({
        name,
        code: code.toUpperCase(),
        description,
        budget: {
          monthly: monthlyBudget || 0,
          remaining: monthlyBudget || 0,
          spent: 0
        },
        manager,
        category,
        creditLimit: creditLimit || 0
      });
      
      await newDepartment.save();
      console.log(`✅ Department created: ${name} (${code})`);
    } else {
      // Create in-memory for fallback
      newDepartment = {
        _id: `dept_${Date.now()}`,
        name,
        code: code.toUpperCase(),
        description,
        budget: {
          monthly: monthlyBudget || 0,
          remaining: monthlyBudget || 0,
          spent: 0
        },
        manager,
        category,
        status: 'active',
        creditLimit: creditLimit || 0,
        currentDebt: 0,
        creditRating: 'B',
        createdAt: new Date()
      };
      console.log('⚠️ Department created in fallback mode');
    }
    
    res.status(201).json(newDepartment);
  } catch (error) {
    console.error('❌ Error creating department:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// Create department loan
app.post('/api/departments/loans', requireManagerAuth, async (req, res) => {
  console.log('🏦 Creating new department loan...');
  
  try {
    const {
      borrowerDepartmentCode,
      lenderDepartmentCode,
      principalAmount,
      interestRate,
      termDays,
      purpose,
      purposeDescription
    } = req.body;
    
    // Validation
    if (!borrowerDepartmentCode || !lenderDepartmentCode || !principalAmount || !termDays || !purpose) {
      return res.status(400).json({ error: 'Missing required loan information' });
    }
    
    if (borrowerDepartmentCode === lenderDepartmentCode) {
      return res.status(400).json({ error: 'Borrower and lender departments cannot be the same' });
    }
    
    let newLoan;
    
    if (dbConnected && DepartmentLoan && Department) {
      // Verify departments exist
      const borrowerDept = await Department.findOne({ code: borrowerDepartmentCode.toUpperCase() });
      const lenderDept = await Department.findOne({ code: lenderDepartmentCode.toUpperCase() });
      
      if (!borrowerDept || !lenderDept) {
        return res.status(404).json({ error: 'One or both departments not found' });
      }
      
      const startDate = new Date();
      const dueDate = new Date(startDate.getTime() + (termDays * 24 * 60 * 60 * 1000));
      
      newLoan = new DepartmentLoan({
        borrowerDepartment: {
          code: borrowerDept.code,
          name: borrowerDept.name
        },
        lenderDepartment: {
          code: lenderDept.code,
          name: lenderDept.name
        },
        principalAmount,
        interestRate: interestRate || 5, // Default 5% annual
        termDays,
        purpose,
        purposeDescription,
        startDate,
        dueDate,
        status: 'pending'
      });
      
      await newLoan.save();
      console.log(`✅ Loan created: ${newLoan.loanId}`);
    } else {
      // Fallback mode
      newLoan = {
        loanId: `LOAN-${borrowerDepartmentCode}-${Date.now().toString().slice(-6)}`,
        borrowerDepartment: { code: borrowerDepartmentCode },
        lenderDepartment: { code: lenderDepartmentCode },
        principalAmount,
        interestRate: interestRate || 5,
        termDays,
        purpose,
        status: 'pending',
        createdAt: new Date()
      };
      console.log('⚠️ Loan created in fallback mode');
    }
    
    res.status(201).json(newLoan);
  } catch (error) {
    console.error('❌ Error creating loan:', error);
    res.status(500).json({ error: 'Failed to create loan' });
  }
});

// Get department loans
app.get('/api/departments/loans', requireManagerAuth, async (req, res) => {
  console.log('🏦 Fetching all department loans...');
  
  try {
    const { status, departmentCode } = req.query;
    
    let query = {};
    if (status) {
      query.status = status;
    }
    if (departmentCode) {
      query.$or = [
        { 'borrowerDepartment.code': departmentCode.toUpperCase() },
        { 'lenderDepartment.code': departmentCode.toUpperCase() }
      ];
    }
    
    let loans;
    
    if (dbConnected && DepartmentLoan) {
      loans = await DepartmentLoan.find(query).sort({ createdAt: -1 });
    } else {
      // Fallback empty array
      loans = [];
    }
    
    res.json(loans);
  } catch (error) {
    console.error('❌ Error fetching department loans:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

// Approve loan
app.put('/api/departments/loans/:loanId/approve', requireManagerAuth, async (req, res) => {
  console.log(`✅ Approving loan ${req.params.loanId}...`);
  
  try {
    const { staffId, staffName, staffPosition } = req.user;
    
    let updatedLoan;
    
    if (dbConnected && DepartmentLoan) {
      updatedLoan = await DepartmentLoan.findOneAndUpdate(
        { loanId: req.params.loanId },
        {
          $set: {
            status: 'approved',
            approvedBy: {
              staffId,
              name: staffName,
              position: staffPosition,
              approvalDate: new Date()
            }
          }
        },
        { new: true }
      );
      
      if (!updatedLoan) {
        return res.status(404).json({ error: 'Loan not found' });
      }
    } else {
      // Fallback mode
      updatedLoan = { 
        message: 'Loan approved in fallback mode',
        loanId: req.params.loanId,
        status: 'approved'
      };
    }
    
    res.json(updatedLoan);
  } catch (error) {
    console.error('❌ Error approving loan:', error);
    res.status(500).json({ error: 'Failed to approve loan' });
  }
});

// Create payment assignment for orders
app.post('/api/payment-assignments', requireManagerAuth, async (req, res) => {
  console.log('📋 Creating payment assignment...');
  
  try {
    const {
      orderType,
      orderId,
      originalAmount,
      assignedDepartments,
      assignmentReason,
      dueDate,
      priority
    } = req.body;
    
    const { staffId, staffName, staffPosition } = req.user;
    
    // Validation
    if (!orderType || !orderId || !originalAmount || !assignedDepartments || assignedDepartments.length === 0) {
      return res.status(400).json({ error: 'Missing required assignment information' });
    }
    
    // Validate total assigned amount
    const totalAssigned = assignedDepartments.reduce((sum, dept) => sum + dept.assignedAmount, 0);
    if (Math.abs(totalAssigned - originalAmount) > 0.01) {
      return res.status(400).json({ error: 'Total assigned amount must equal original amount' });
    }
    
    let newAssignment;
    
    if (dbConnected && PaymentAssignment) {
      newAssignment = new PaymentAssignment({
        orderType,
        orderId,
        originalAmount,
        assignedDepartments: assignedDepartments.map(dept => ({
          ...dept,
          status: 'pending',
          dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days default
        })),
        assignmentReason,
        priority: priority || 'normal',
        assignedBy: {
          staffId,
          name: staffName,
          position: staffPosition
        },
        dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      
      await newAssignment.save();
      console.log(`✅ Payment assignment created: ${newAssignment.assignmentId}`);
    } else {
      // Fallback mode
      newAssignment = {
        assignmentId: `PA-${Date.now().toString().slice(-6)}`,
        orderType,
        orderId,
        originalAmount,
        assignedDepartments,
        status: 'pending',
        createdAt: new Date()
      };
      console.log('⚠️ Payment assignment created in fallback mode');
    }
    
    res.status(201).json(newAssignment);
  } catch (error) {
    console.error('❌ Error creating payment assignment:', error);
    res.status(500).json({ error: 'Failed to create payment assignment' });
  }
});

// Get payment assignments
app.get('/api/payment-assignments', requireManagerAuth, async (req, res) => {
  console.log('📋 Fetching payment assignments...');
  
  try {
    const { status, departmentCode, orderType, limit = 50 } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (departmentCode) {
      query['assignedDepartments.departmentCode'] = departmentCode.toUpperCase();
    }
    
    if (orderType) {
      query.orderType = orderType;
    }
    
    let assignments;
    
    if (dbConnected && PaymentAssignment) {
      assignments = await PaymentAssignment.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
    } else {
      // Fallback empty array
      assignments = [];
    }
    
    res.json(assignments);
  } catch (error) {
    console.error('❌ Error fetching payment assignments:', error);
    res.status(500).json({ error: 'Failed to fetch payment assignments' });
  }
});

// Get department transactions
app.get('/api/departments/transactions', requireManagerAuth, async (req, res) => {
  console.log('💳 Fetching department transactions...');
  
  try {
    const { departmentCode, startDate, endDate, type, limit = 50 } = req.query;
    
    let query = {};
    
    if (departmentCode) {
      query.$or = [
        { 'fromDepartment.code': departmentCode.toUpperCase() },
        { 'toDepartment.code': departmentCode.toUpperCase() }
      ];
    }
    
    if (type) {
      query.type = type;
    }
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    let transactions;
    
    if (dbConnected && DepartmentTransaction) {
      transactions = await DepartmentTransaction.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
    } else {
      // Fallback empty array
      transactions = [];
    }
    
    res.json(transactions);
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ===== END DEPARTMENT FINANCIAL MANAGEMENT ROUTES =====

// Catch-all handler: serve index.html for any non-API routes
// This ensures that frontend routing works properly
app.get('*', (req, res) => {
  // Skip API routes - they should return their own 404s
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // For all other routes, serve index.html (for frontend routing)
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
