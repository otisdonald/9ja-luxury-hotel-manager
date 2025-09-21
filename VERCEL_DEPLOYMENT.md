# Hotel Manager - Vercel + MongoDB Atlas Deployment Guide

## 🚀 Quick Deployment Steps

### Prerequisites
- GitHub account
- Vercel account (free)
- MongoDB Atlas account (free)

## Phase 1: MongoDB Atlas Setup (5 minutes)

### 1. Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/atlas
2. Sign up for free account
3. Create a new cluster (free tier)
4. Create database user and password
5. Whitelist IP addresses (0.0.0.0/0 for all IPs)
6. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/hotel-manager`

### 2. Configure Database
- Database name: `hotel-manager`
- Collections will be created automatically

## Phase 2: GitHub Setup (2 minutes)

### 1. Create GitHub Repository
1. Go to https://github.com
2. Create new repository: `hotel-manager`
3. Upload your project files

### 2. Push Code to GitHub
```bash
git init
git add .
git commit -m "Initial commit - Hotel Manager"
git branch -M main
git remote add origin https://github.com/yourusername/hotel-manager.git
git push -u origin main
```

## Phase 3: Vercel Deployment (3 minutes)

### 1. Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub account
3. Import your hotel-manager repository

### 2. Configure Environment Variables
In Vercel dashboard, add these environment variables:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hotel-manager
NODE_ENV=production
JWT_SECRET=your-random-secret-key-here
PORT=3000
```

### 3. Deploy
- Click "Deploy"
- Get your URL: `https://hotel-manager-xyz.vercel.app`

## Phase 4: Test Deployment (2 minutes)

### 1. Access Your Hotel Manager
- Visit your Vercel URL
- Test login with: EMP001 / PIN: 1234
- Check all features work

### 2. Share with Hotel Owner
- Owner can access from anywhere: `https://hotel-manager-xyz.vercel.app`
- Bookmark for easy access
- Works on phone, tablet, computer

## 💰 Cost Breakdown

### Free Tier Limits (Perfect for Hotels):
- **Vercel**: 100GB bandwidth/month, 100 builds/month
- **MongoDB Atlas**: 512MB storage, shared CPU
- **Total Cost**: $0/month for most hotels

### If You Exceed Free Limits:
- **Vercel Pro**: $20/month (unlikely needed)
- **MongoDB Atlas**: $9/month for dedicated cluster
- **Custom Domain**: $12/year (optional)

## 🔧 Troubleshooting

### Common Issues:
1. **Database connection**: Check MongoDB connection string
2. **Environment variables**: Ensure all variables are set in Vercel
3. **Build errors**: Check Vercel build logs

### Support:
- Vercel docs: https://vercel.com/docs
- MongoDB Atlas docs: https://docs.atlas.mongodb.com

## 🎯 Benefits for Hotel Owner

### Remote Access Features:
- ✅ Real-time room status from anywhere
- ✅ Daily revenue tracking
- ✅ Staff monitoring (clock in/out)
- ✅ Customer database access
- ✅ Bar/kitchen inventory management
- ✅ Financial reports and analytics

### Security:
- ✅ HTTPS encryption
- ✅ Secure authentication
- ✅ Regular backups
- ✅ Professional hosting

The hotel owner will have 24/7 access to monitor the business from anywhere in the world! 🌍📱