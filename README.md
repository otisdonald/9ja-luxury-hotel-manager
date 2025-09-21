# 🏨 Hotel Manager - Complete Management System

A comprehensive hotel management web application for managing all aspects of hotel operations including rooms, customers, bar, kitchen, staff, housekeeping, analytics, guest services, and communication.

## 🌟 Features

### 🏠 **Core Hotel Operations**
- **Room Management**: 11 rooms with different types (Standard, Deluxe, Suite)
- **Customer Management**: Complete guest database with contact information
- **Booking System**: Room reservations with check-in/out dates
- **Bar Inventory**: Drink management with categories and stock tracking
- **Kitchen Orders**: Food service with room service, restaurant, and takeaway options

### 🚔 **Security & Compliance**
- **Police Reports**: Incident reporting system with severity levels
- **Payment Processing**: POS system with multiple payment methods
- **Security Tracking**: Comprehensive incident management

### 👥 **Staff Management**
- **Employee Database**: Complete staff records with positions and shifts
- **Scheduling System**: Shift planning and assignment
- **Time Tracking**: Clock in/out system with break management
- **Staff Status**: Real-time on-duty/off-duty tracking

### 🧹 **Housekeeping & Maintenance**
- **Cleaning Tasks**: Room cleaning assignment and tracking
- **Maintenance Requests**: Equipment and facility repair management
- **Supply Inventory**: Stock management with low-stock alerts
- **Room Status**: Cleaning status and availability tracking

### 📊 **Advanced Analytics**
- **Revenue Forecasting**: Financial performance tracking
- **Occupancy Analytics**: Room utilization metrics
- **Customer Loyalty**: Return guest analysis
- **Seasonal Patterns**: Booking trend analysis
- **Performance Metrics**: KPIs including ADR, RevPAR, retention rates

### 🎯 **Guest Services**
- **Spa & Wellness**: Spa appointment booking system
- **Event Management**: Conference and event room reservations
- **Concierge Services**: Guest request tracking
- **Guest Feedback**: Rating and review system
- **Lost & Found**: Item tracking and management

### 📢 **Communication Hub**
- **Notification System**: Real-time alerts and messaging
- **Internal Messaging**: Staff communication platform
- **Call Logging**: Phone interaction tracking
- **Emergency Contacts**: Quick access to critical numbers
- **Emergency Alerts**: Instant staff-wide emergency notifications

### 📱 **Admin Dashboard**
- **Real-time Statistics**: Live hotel performance metrics
- **Visual Charts**: Interactive graphs and analytics
- **Daily Reports**: Comprehensive operational summaries
- **Multi-section Overview**: All departments in one view

## 🛠️ Technology Stack

- **Backend**: Node.js with Express.js
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Database**: SQLite3 (in-memory for demo, easily upgradeable)
- **Charts**: Chart.js for analytics visualization
- **Icons**: Font Awesome for UI elements
- **Architecture**: RESTful API design

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd hotel-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Access the application**
   - Main Interface: http://localhost:3000
   - Admin Dashboard: http://localhost:3000/admin

## � Admin Access

The admin dashboard is password-protected for security. Use the following credentials:

- **Admin Password**: `HotelAdmin2025`
- **Access URL**: http://localhost:3000/admin

> **Security Note**: You can change the admin password in the `.env` file by updating the `ADMIN_PASSWORD` variable. The admin session is maintained using browser session storage and will automatically log out when the browser is closed.

## �📁 Project Structure

```
hotel-manager/
├── server.js              # Express server with all API routes
├── package.json           # Dependencies and scripts
├── README.md              # Project documentation
├── .env                   # Environment variables
└── public/
    ├── index.html         # Main hotel management interface
    ├── admin.html         # Admin dashboard
    ├── styles.css         # Main application styles
    ├── admin-styles.css   # Admin dashboard styles
    ├── script.js          # Main application JavaScript
    └── admin-script.js    # Admin dashboard JavaScript
```

## 🎛️ API Endpoints

### Core Operations
- `GET/POST /api/rooms` - Room management
- `GET/POST /api/customers` - Customer management
- `GET/POST /api/bookings` - Booking system
- `GET/POST /api/bar-inventory` - Bar management
- `GET/POST /api/kitchen-orders` - Kitchen operations

### Security & Payments
- `GET/POST /api/police-reports` - Security incidents
- `GET/POST /api/payments` - Payment processing
- `POST /api/payments/refund` - Refund processing

### Staff & Operations
- `GET/POST /api/staff` - Staff management
- `GET/POST /api/schedules` - Shift scheduling
- `GET/POST /api/time-records` - Time tracking
- `GET/POST /api/notifications` - Alert system

### Housekeeping & Maintenance
- `GET/POST /api/cleaning-tasks` - Cleaning management
- `GET/POST /api/maintenance` - Maintenance requests
- `GET/POST /api/supplies` - Inventory management

### Guest Services
- `GET/POST /api/service-requests` - Service bookings
- `GET/POST /api/feedback` - Guest feedback
- `GET/POST /api/lost-found` - Lost & found items

### Communication
- `GET/POST /api/messages` - Internal messaging
- `GET/POST /api/call-logs` - Call tracking
- `GET /api/emergency-contacts` - Emergency numbers

### Analytics
- `GET /api/analytics/revenue` - Revenue analysis
- `GET /api/analytics/occupancy` - Occupancy metrics
- `GET /api/analytics/customer-loyalty` - Loyalty tracking

### Admin Dashboard
- `GET /api/admin/stats` - Comprehensive statistics
- `GET /api/admin/charts` - Chart data for visualization

## 🎨 Interface Features

### Main Interface Tabs
1. **Rooms** - View and manage all 11 hotel rooms
2. **Customers** - Guest database and management
3. **Bar** - Inventory and drink management
4. **Kitchen** - Food orders and kitchen operations
5. **Police Reports** - Security incident tracking
6. **POS Payments** - Payment processing and transactions
7. **Notifications** - Alert and messaging system
8. **Staff** - Employee management and scheduling
9. **Housekeeping** - Cleaning and maintenance tasks
10. **Analytics** - Performance metrics and charts
11. **Services** - Guest services and amenities
12. **Communication** - Messaging and call logging

### Admin Dashboard
- Real-time statistics overview
- Interactive charts and graphs
- Daily operational reports
- Multi-department performance metrics

## 💼 Use Cases

### Hotel Staff
- Front desk operations and guest check-in/out
- Room status management and housekeeping coordination
- Kitchen order processing and room service
- Payment processing and billing

### Management
- Staff scheduling and time tracking
- Financial analytics and revenue reporting
- Operational oversight and performance monitoring
- Guest satisfaction tracking

### Housekeeping
- Cleaning task assignment and completion
- Supply inventory management
- Maintenance request submission
- Room status updates

### Security
- Incident reporting and tracking
- Emergency alert system
- Contact management
- Communication coordination

## 🔧 Customization

### Adding New Features
1. Create API endpoint in `server.js`
2. Add UI components in `index.html`
3. Style with CSS in `styles.css`
4. Add JavaScript functionality in `script.js`

### Database Integration
Replace in-memory arrays with your preferred database:
- PostgreSQL for production environments
- MySQL for traditional setups
- MongoDB for document-based storage

### Environment Configuration
Edit `.env` file for:
- Port configuration
- Database connection strings
- API keys for external services
- Environment-specific settings

## 📈 Performance Features

- **Real-time Updates**: Live data refresh across all modules
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Efficient Loading**: Optimized API calls and data management
- **Error Handling**: Comprehensive error management and user feedback
- **Data Validation**: Form validation and data integrity checks

## 🔒 Security Features

- **Incident Reporting**: Comprehensive security event tracking
- **Emergency Alerts**: Instant staff-wide emergency notifications
- **Access Control**: Role-based feature access (expandable)
- **Data Protection**: Secure data handling and validation
- **Audit Trail**: Complete operation logging and tracking

## 🎯 Future Enhancements

Potential additions for expansion:
- Mobile app integration
- Advanced reporting and PDF generation
- Integration with hotel management systems
- Online booking portal for guests
- Advanced analytics and AI insights
- Multi-property management
- Guest portal and self-service features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 📞 Support

For support and questions:
- Review the documentation above
- Check the API endpoints for integration
- Examine the code structure for customization
- Test with the demo data provided

---

**9JA LUXURY life hotel** - Your complete hotel operations solution! 🏨✨

## Features

### 🏨 Room Management
- **11 Rooms**: Complete management of 11 hotel rooms
- **Room Types**: Standard, Deluxe, and Suite rooms with different pricing
- **Status Tracking**: Available, Occupied, Cleaning, Maintenance
- **Booking System**: Easy room booking with check-in/check-out dates
- **Guest Management**: Track current guests in occupied rooms

### 👥 Customer Management
- **Customer Database**: Store customer information (name, email, phone, notes)
- **Customer Profiles**: View and edit customer details
- **Booking History**: Track customer booking patterns

### 🍸 Bar Operations
- **Inventory Management**: Track bar items and stock levels
- **Category Organization**: Beer, Wine, Spirits, Cocktails, Non-Alcoholic
- **Price Management**: Set and update prices for bar items
- **Stock Monitoring**: Monitor stock levels and update inventory

### 🍽️ Kitchen Management
- **Order System**: Create and manage kitchen orders
- **Order Types**: Room Service, Restaurant, Takeaway
- **Status Tracking**: Pending → Preparing → Ready → Delivered
- **Customer Integration**: Link orders to customers and rooms

### 📊 Admin Dashboard
- **Daily Reports**: Comprehensive overview of all hotel operations
- **Key Metrics**: Revenue, occupancy rates, guest counts, order statistics
- **Visual Analytics**: Charts and graphs for quick data analysis
- **Real-time Alerts**: Notifications for maintenance, low stock, pending orders
- **Export Reports**: Download daily reports for record keeping
- **Activity Monitoring**: Track recent bookings, orders, and system events

### 🚔 Police Reports & Security
- **Incident Reporting**: Document security incidents and emergencies
- **Severity Classification**: Low, Medium, High, Critical incident levels
- **Status Tracking**: Reported → Investigating → Resolved → Closed
- **Room & Guest Integration**: Link incidents to specific rooms and guests
- **Officer Details**: Record reporting staff and police contact information
- **Action Documentation**: Track actions taken and follow-up requirements

### 💳 POS Payment System
- **Multiple Payment Methods**: Cash, Credit Card, Debit Card, Mobile Pay, Bank Transfer
- **Secure Card Processing**: Encrypted card data handling (last 4 digits stored)
- **Payment Categories**: Room charges, Food & Beverage, Services, Deposits
- **Refund Management**: Process refunds with reason tracking
- **Transaction History**: Complete payment audit trail
- **Daily Sales Reports**: Real-time revenue tracking and analytics
- **Receipt Generation**: Digital payment confirmations

## Technology Stack

- **Backend**: Node.js with Express.js
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Database**: SQLite3 (upgradeable to PostgreSQL/MySQL)
- **Styling**: Custom CSS with Font Awesome icons

## Installation

1. **Clone or download** this project
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start the server**:
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```
4. **Open your browser** and navigate to `http://localhost:3000`

## Usage

### Getting Started
1. **Main Dashboard**: Manage day-to-day operations at `http://localhost:3000`
2. **Admin Dashboard**: Access director's overview at `http://localhost:3000/admin`
3. **Add Customers**: Go to the Customers tab and add customer information
4. **Manage Rooms**: View all 11 rooms and their current status
5. **Create Bookings**: Book available rooms for customers
6. **Bar Operations**: Add bar inventory items and manage stock
7. **Kitchen Orders**: Create orders for room service or restaurant

### Room Operations
- **Book Room**: Click "Book" on available rooms
- **Change Status**: Update room status (cleaning, maintenance, etc.)
- **Checkout**: Process guest checkout and change status to cleaning

### Customer Operations
- **Add Customer**: Use the "Add Customer" button to register new guests
- **View Details**: See all customer information in the table
- **Edit/Delete**: Manage existing customer records

### Bar Management
- **Add Items**: Add new bar items with categories and pricing
- **Update Stock**: Modify stock levels as items are sold
- **Category Management**: Organize items by type

### Kitchen Operations
- **New Orders**: Create orders specifying customer, room, and items
- **Status Updates**: Track order progress through the kitchen
- **Order Types**: Handle different service types

## Development

### Project Structure
```
hotel-manager/
├── server.js              # Express server and API routes
├── package.json           # Dependencies and scripts
├── public/                # Frontend files
│   ├── index.html        # Main HTML page
│   ├── styles.css        # CSS styling
│   └── script.js         # Frontend JavaScript
└── .github/
    └── copilot-instructions.md
```

### API Endpoints
- `GET /api/rooms` - Get all rooms
- `PUT /api/rooms/:id` - Update room status
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Add new customer
- `GET /api/bookings` - Get all bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bar/inventory` - Get bar inventory
- `POST /api/bar/inventory` - Add bar item
- `GET /api/kitchen/orders` - Get kitchen orders
- `POST /api/kitchen/orders` - Create kitchen order
- `PUT /api/kitchen/orders/:id` - Update order status
- `GET /api/police-reports` - Get all police reports
- `POST /api/police-reports` - Create police report
- `PUT /api/police-reports/:id` - Update report status
- `GET /api/payments` - Get all payment transactions
- `POST /api/payments` - Process new payment
- `POST /api/payments/refund` - Process refund

### Adding Features
To add new features:
1. **Backend**: Add new routes in `server.js`
2. **Frontend**: Update the HTML, CSS, and JavaScript as needed
3. **Database**: Modify the data structures or add database integration

## Environment Variables
Create a `.env` file for configuration:
```
PORT=3000
NODE_ENV=development
```

## License
MIT License - Feel free to use this project for your hotel management needs.

## Support
For support or feature requests, please check the documentation or create an issue in the project repository.
