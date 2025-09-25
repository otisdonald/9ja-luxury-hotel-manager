# Files to Exclude from Distribution Package

## Development Files (DO NOT COPY)
node_modules/
.git/
.gitignore
.vscode/

## Test Files
tests/
*.test.js

## Development Scripts  
scripts/test-*.js
scripts/force-seed.js

## Temporary Files
*.log
*.tmp
.env.local
.env.development

## Documentation (Optional - Include if desired)
README.md
MONGODB_ATLAS_SETUP.md
REMOTE_ACCESS_GUIDE.md
VERCEL_DEPLOYMENT.md

---

# Essential Files to Include in Distribution

## Core Application Files
✓ server.js
✓ package.json
✓ .env (with production settings)
✓ Procfile
✓ railway.toml
✓ vercel.json

## Database and Models
✓ src/
  ✓ db.js
  ✓ models/
    ✓ BarItem.js
    ✓ Booking.js
    ✓ Customer.js
    ✓ KitchenItem.js
    ✓ KitchenOrder.js
    ✓ Payment.js
    ✓ Room.js

## Web Application
✓ public/
  ✓ index.html
  ✓ admin.html
  ✓ staff-login.html
  ✓ script.js
  ✓ admin-script.js
  ✓ styles.css
  ✓ admin-styles.css
  ✓ manifest.json
  ✓ service-worker.js
  ✓ icons/
  ✓ screenshots/

## Utility Scripts
✓ main.js
✓ preload.js
✓ check-rooms.js
✓ seed-kitchen-items.js

## Production Scripts (Essential)
✓ scripts/seed.js

## Installation Files
✓ INSTALL.bat
✓ INSTALLATION_GUIDE.md

## Asset Files
✓ assets/ (if any)

---

# Distribution Folder Structure

```
9JA-LUXURY-Hotel-Manager/
├── INSTALL.bat                    (Automated installer)
├── INSTALLATION_GUIDE.md          (Setup instructions)
├── START_HOTEL_MANAGER.bat        (Created by installer)
├── OPEN_ADMIN_DASHBOARD.bat       (Created by installer)
├── server.js                      (Main application)
├── package.json                   (Dependencies)
├── .env                          (Configuration)
├── main.js                       (Electron main)
├── preload.js                    (Electron preload)
├── src/
│   ├── db.js
│   └── models/
├── public/
│   ├── index.html
│   ├── admin.html
│   ├── *.js
│   ├── *.css
│   └── icons/
└── scripts/
    └── seed.js
```