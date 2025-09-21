# MongoDB Atlas Setup for Hotel Manager

## Step 1: Create MongoDB Atlas Account

### 1.1 Sign Up
1. Go to https://www.mongodb.com/atlas
2. Click "Try Free" 
3. Sign up with email or Google account
4. Verify your email address

### 1.2 Create Organization & Project
1. Organization name: "Hotel Management"
2. Project name: "9JA Luxury Hotel"
3. Click "Create Project"

## Step 2: Create Database Cluster

### 2.1 Build a Database
1. Click "Build a Database"
2. Choose **"M0 Sandbox"** (FREE tier)
   - 512 MB storage
   - Shared RAM and vCPU
   - No credit card required
3. Cloud Provider: **AWS** (recommended)
4. Region: Choose closest to your location
5. Cluster Name: "HotelManagerCluster"
6. Click "Create Cluster"

### 2.2 Wait for Cluster Creation
- Takes 1-3 minutes
- You'll see "Your cluster is being created..."

## Step 3: Configure Database Access

### 3.1 Create Database User
1. In "Security" → "Database Access"
2. Click "Add New Database User"
3. Authentication Method: **Password**
4. Username: `hotelmanager`
5. Password: Click "Autogenerate Secure Password" (SAVE THIS!)
6. Database User Privileges: **Read and write to any database**
7. Click "Add User"

### 3.2 Set Network Access
1. In "Security" → "Network Access"
2. Click "Add IP Address"
3. Choose **"Allow Access from Anywhere"**
   - IP Address: 0.0.0.0/0
   - Comment: "Vercel deployment and hotel access"
4. Click "Confirm"

## Step 4: Get Connection String

### 4.1 Connect to Cluster
1. Go to "Database" → "Clusters"
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Driver: **Node.js**
5. Version: **4.1 or later**

### 4.2 Copy Connection String
You'll get something like:
```
mongodb+srv://hotelmanager:<password>@hotelmanagercluster.abc123.mongodb.net/?retryWrites=true&w=majority
```

### 4.3 Replace Password
Replace `<password>` with the actual password you saved:
```
mongodb+srv://hotelmanager:YourActualPassword@hotelmanagercluster.abc123.mongodb.net/hotel-manager?retryWrites=true&w=majority
```

**Important**: Add `/hotel-manager` before the `?` to specify the database name.

## Step 5: Configure Hotel Manager App

### 5.1 Create .env File
Create a file called `.env` in your Hotel Manager folder:
```
MONGODB_URI=mongodb+srv://hotelmanager:YourPassword@hotelmanagercluster.abc123.mongodb.net/hotel-manager?retryWrites=true&w=majority
NODE_ENV=development
PORT=3001
```

### 5.2 Test Connection
Run your Hotel Manager locally:
```bash
npm start
```

Look for: "MongoDB connected" in the console.

## Step 6: Verify Database Setup

### 6.1 Check Collections
1. In Atlas, go to "Database" → "Browse Collections"
2. You should see database: `hotel-manager`
3. Collections will be created automatically when you use the app:
   - `rooms`
   - `customers`
   - `baritems`
   - `kitchenorders`
   - `payments`

### 6.2 Test Hotel Manager Features
1. Login with EMP001/1234
2. Add a customer
3. Add a bar item
4. Check if data appears in Atlas collections

## Troubleshooting

### Common Issues:
1. **"Authentication failed"**: Check username/password in connection string
2. **"Network timeout"**: Verify IP whitelist includes 0.0.0.0/0
3. **"Database not found"**: Ensure `/hotel-manager` is in connection string

### Connection String Format:
```
mongodb+srv://<username>:<password>@<cluster-name>.<random-id>.mongodb.net/<database-name>?retryWrites=true&w=majority
```

## Security Notes

### Production Best Practices:
- ✅ Use specific IP addresses instead of 0.0.0.0/0 when possible
- ✅ Rotate passwords regularly
- ✅ Use environment variables for credentials
- ✅ Enable MongoDB Atlas alerts

### Free Tier Limits:
- ✅ 512 MB storage (plenty for hotel data)
- ✅ Shared cluster (fine for small hotels)
- ✅ No time limit
- ✅ Basic monitoring included

Your MongoDB Atlas database is now ready for the Hotel Manager! 🎉