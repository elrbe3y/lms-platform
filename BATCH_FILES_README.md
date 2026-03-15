# Windows Batch Files Guide

These `.bat` files make it easy to setup and run the Mohamed Rabiei LMS Platform on Windows.

## Available Commands

### 1. **install.bat** - First Time Setup (Recommended)
Complete installation wizard that sets up everything automatically.

**Usage:**
- Double-click `install.bat`
- Follow the on-screen instructions

**What it does:**
- Checks Node.js installation
- Installs npm packages
- Creates .env file
- Sets up database (optional)
- Adds seed data (optional)

---

### 2. **start.bat** - Run the Project
Quick start command for development.

**Usage:**
- Double-click `start.bat`
- Open browser at http://localhost:3000

**Requirements:**
- Node.js installed
- Packages installed (run install.bat first)
- .env file configured

---

### 3. **setup.bat** - Manual Setup
Alternative to install.bat if you want more control.

**Usage:**
- Double-click `setup.bat`

**What it does:**
- Creates .env file
- Installs packages
- Sets up database

---

### 4. **build.bat** - Build for Production
Compiles the project for deployment.

**Usage:**
- Double-click `build.bat`

**Output:**
- Production-ready build in `.next/` folder

---

### 5. **db-studio.bat** - Database Manager
Opens Prisma Studio for visual database management.

**Usage:**
- Double-click `db-studio.bat`
- Opens at http://localhost:5555

**Use for:**
- Viewing data
- Adding/editing records
- Database testing

---

### 6. **db-reset.bat** - Reset Database
**⚠️ DANGEROUS** - Deletes all data and recreates database.

**Usage:**
- Double-click `db-reset.bat`
- Type YES to confirm

**Warning:**
- This will DELETE all data
- Cannot be undone
- Only use for development

---

## Quick Start Guide

### For First Time:
```
1. Double-click: install.bat
2. Follow the wizard
3. Edit .env file with your database credentials
4. Double-click: start.bat
```

### After Setup:
```
Just double-click: start.bat
```

---

## Troubleshooting

### Problem: "Node.js is not installed"
**Solution:**
1. Download Node.js from https://nodejs.org/
2. Install LTS version (v18 or newer)
3. Restart computer
4. Try again

---

### Problem: "Database connection failed"
**Solution:**
1. Make sure PostgreSQL is running
2. Check DATABASE_URL in .env file
3. Test connection:
   ```
   psql -U lms_user -d mohamed_rabiei_lms
   ```

---

### Problem: "Port 3000 already in use"
**Solution:**
1. Close other applications using port 3000
2. Or change port in .env:
   ```
   PORT=3001
   ```

---

### Problem: Characters display incorrectly
**Solution:**
This is normal if your terminal doesn't support UTF-8.
The application will work fine - just ignore display issues in the console.

---

## Environment File (.env)

After running install.bat or setup.bat, edit `.env` file:

```env
# Database (REQUIRED)
DATABASE_URL="postgresql://username:password@localhost:5432/dbname"

# Security (REQUIRED)
JWT_SECRET="your-random-secret-key-here"
VIDEO_SIGNING_SECRET="another-random-secret-here"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Important:**
- Change the secrets to random strings
- Update database credentials
- Don't commit .env to git

---

## File Structure

```
d:/LMS/
├── install.bat        ← Start here (first time)
├── start.bat          ← Use this to run
├── setup.bat          ← Manual setup
├── build.bat          ← Production build
├── db-studio.bat      ← Database UI
├── db-reset.bat       ← Reset database
├── .env               ← Configuration (auto-created)
└── .env.example       ← Template
```

---

## Support

If you encounter issues:
1. Check this README
2. Review QUICKSTART.md
3. Check error messages carefully
4. Ensure all requirements are installed

---

## Requirements

- Windows 10/11
- Node.js v18+ (https://nodejs.org/)
- PostgreSQL v14+ (https://www.postgresql.org/)
- 4GB RAM minimum
- 10GB free disk space

---

© 2024 Mohamed Rabiei Educational Platform
