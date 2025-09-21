const connectDB = require('../src/db');
const Room = require('../src/models/Room');
const Customer = require('../src/models/Customer');
const BarItem = require('../src/models/BarItem');
const KitchenOrder = require('../src/models/KitchenOrder');
const Booking = require('../src/models/Booking');
const Payment = require('../src/models/Payment');

// Build minimal demo data locally for seeding (legacy numeric ids present)
const inMemory = {
  rooms: [],
  customers: [],
  barInventory: [],
  kitchenOrders: [],
  bookings: [],
  payments: []
};

for (let i = 1; i <= 11; i++) {
  inMemory.rooms.push({ id: i, number: `Room ${i}`, type: i <= 4 ? 'Standard' : i <= 8 ? 'Deluxe' : 'Suite', status: i <= 6 ? 'occupied' : 'available', price: i <= 4 ? 25000 : i <= 8 ? 40000 : 65000 });
}

inMemory.customers.push(
  { id: 1, name: 'John Smith', email: 'john@email.com', phone: '555-0101' },
  { id: 2, name: 'Sarah Johnson', email: 'sarah@email.com', phone: '555-0102' },
  { id: 3, name: 'Mike Wilson', email: 'mike@email.com', phone: '555-0103' }
);

inMemory.barInventory.push(
  { id: 1, name: 'Premium Whiskey', price: 18000, stock: 12, category: 'spirits' },
  { id: 2, name: 'Red Wine', price: 10000, stock: 8, category: 'wine' }
);

inMemory.kitchenOrders.push(
  { id: 1, customerId: 1, roomId: 1, items: 'Caesar Salad', type: 'room-service', status: 'preparing' }
);

inMemory.bookings.push(
  { id: 1, roomId: 1, customerId: 1, checkIn: new Date(), checkOut: new Date(Date.now() + 86400000) }
);

async function seed() {
  await connectDB();

  // Rooms
  const roomCount = await Room.countDocuments();
  let roomMap = {};
  if (roomCount === 0) {
    const roomsToInsert = inMemory.rooms.map(r => ({ legacyId: r.id, number: r.number, type: r.type, status: r.status, price: r.price }));
    const insertedRooms = await Room.insertMany(roomsToInsert);
    insertedRooms.forEach(d => { if (d.legacyId) roomMap[d.legacyId] = d._id; });
    console.log('Seeded rooms');
  } else {
    const existing = await Room.find().lean();
    existing.forEach(d => { if (d.legacyId) roomMap[d.legacyId] = d._id; });
  }

  // Customers
  const custCount = await Customer.countDocuments();
  let customerMap = {};
  if (custCount === 0) {
    const customersToInsert = inMemory.customers.map(c => ({ legacyId: c.id, name: c.name, email: c.email, phone: c.phone }));
    const insertedCustomers = await Customer.insertMany(customersToInsert);
    insertedCustomers.forEach(d => { if (d.legacyId) customerMap[d.legacyId] = d._id; });
    console.log('Seeded customers');
  } else {
    const existingCust = await Customer.find().lean();
    existingCust.forEach(d => { if (d.legacyId) customerMap[d.legacyId] = d._id; });
  }

  // Bar items
  const barCount = await BarItem.countDocuments();
  if (barCount === 0) {
    const items = inMemory.barInventory.map(b => ({ legacyId: b.id, name: b.name, price: b.price, stock: b.stock, category: b.category }));
    await BarItem.insertMany(items);
    console.log('Seeded bar inventory');
  }

  // Kitchen orders
  const orderCount = await KitchenOrder.countDocuments();
  if (orderCount === 0) {
    const orders = inMemory.kitchenOrders.map(o => ({ legacyId: o.id, customerId: customerMap[o.customerId] || null, roomId: roomMap[o.roomId] || null, items: o.items, type: o.type, status: o.status }));
    await KitchenOrder.insertMany(orders);
    console.log('Seeded kitchen orders');
  }

  // Bookings
  const bookingCount = await Booking.countDocuments();
  if (bookingCount === 0) {
    const bookingsToInsert = inMemory.bookings.map(b => ({ legacyId: b.id, roomId: roomMap[b.roomId] || null, customerId: customerMap[b.customerId] || null, checkIn: b.checkIn, checkOut: b.checkOut, status: b.status || 'confirmed' }));
    await Booking.insertMany(bookingsToInsert);
    console.log('Seeded bookings');
  }

  // Payments (left empty unless provided)
  const paymentCount = await Payment.countDocuments();
  if (paymentCount === 0 && inMemory.payments && inMemory.payments.length) {
    const paymentsToInsert = inMemory.payments.map(p => ({ legacyId: p.id, customerId: customerMap[p.customerId] || null, roomId: roomMap[p.roomId] || null, amount: p.amount, method: p.method, paymentType: p.paymentType || p.type || 'charge', createdAt: p.createdAt }));
    await Payment.insertMany(paymentsToInsert);
    console.log('Seeded payments');
  }

  console.log('Seeding complete');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
