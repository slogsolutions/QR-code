# QR-Gen Project Documentation

## Overview
QR-Gen is a fully offline web application built with Node.js, EJS, and Bootstrap for inventory management with QR code generation. The application allows users to add inventory items and generate QR codes that contain JSON data, which can be scanned to retrieve item information.

## Features
- **Multi-Table Support**: Manage inventory across 3 tables (IT, ATG, LPSS)
- **QR Code Generation**: Generate QR codes that encode JSON data directly
- **Admin Panel**: Password-protected admin interface to view all items
- **Offline Operation**: Works completely offline without internet access
- **Data Export**: Download QR codes as high-quality JPG files
- **Responsive Design**: Modern UI built with Bootstrap

## Technology Stack
- **Backend**: Node.js with Express.js
- **Template Engine**: EJS
- **Database**: MySQL (via XAMPP)
- **Frontend**: Bootstrap 5.3.8
- **QR Generation**: qrcode library
- **Authentication**: bcryptjs with express-session

## Prerequisites
- XAMPP (Apache + MySQL)
- Node.js 18+ (currently using v22.17.1)
- npm (currently using v9.6.6)

## Installation & Setup

### 1. Database Setup
1. Start XAMPP and ensure MySQL is running
2. Create database named `qr`
3. Import the provided SQL dump to create tables:
   - `it` - IT inventory items
   - `atg` - ATG inventory items  
   - `lpss` - LPSS inventory items

### 2. Application Setup
```bash
# Navigate to project directory
cd C:\xampp\htdocs\QR-Gen

# Install dependencies
npm install

# Create environment file (optional)
# Copy .env.example to .env and modify as needed
```

### 3. Configuration
Create a `.env` file with the following variables:
```env
APP_PORT=3000
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=qr
SESSION_SECRET=please_change_me_offline
ADMIN_USERNAME=itadmin
ADMIN_PASSWORD=it@12345
```

### 4. Start Application
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## Application Structure

```
QR-Gen/
├── server.js              # Main application file
├── package.json           # Dependencies and scripts
├── .env                   # Environment configuration
├── views/                 # EJS templates
│   ├── form.ejs          # Add item form
│   ├── success.ejs       # Success page with QR
│   ├── admin_login.ejs   # Admin login page
│   └── admin_panel.ejs   # Admin dashboard
├── public/               # Static assets
│   ├── css/
│   │   ├── bootstrap.min.css
│   │   └── app.css
│   └── js/
│       └── bootstrap.bundle.min.js
└── node_modules/         # Dependencies
```

## Usage Guide

### Adding Items
1. Navigate to `http://localhost:3000/form`
2. Select the target table (IT, ATG, or LPSS)
3. Fill in the required fields:
   - LP No: Item identifier
   - Items: Item description
   - Issue Voucher Number: Voucher reference
4. Click "Generate QR"
5. View the generated QR code and JSON data

### Admin Panel
1. Navigate to `http://localhost:3000/admin`
2. Login with credentials:
   - Username: `itadmin`
   - Password: `it@12345`
3. Use the table navigation to switch between IT, ATG, and LPSS
4. View all items with QR codes
5. Download QR codes as JPG files
6. Copy JSON data to clipboard

### QR Code Features
- **Data Format**: QR codes contain JSON data in the format:
  ```json
  {
    "s_no": 1,
    "lp_no": "03/08",
    "items": "Key board and Mouse",
    "issue_voucher_number": "RV/CRV/IT/001"
  }
  ```
- **Quality**: High-resolution QR codes (1024px) for download
- **Compatibility**: Works with any QR scanner app

## API Endpoints

### Public Routes
- `GET /` - Redirects to form
- `GET /form` - Display add item form
- `POST /form` - Process form submission
- `GET /success/:id` - Display success page with QR
- `GET /api/item/:id` - JSON API for item data

### Admin Routes
- `GET /admin/login` - Admin login page
- `POST /admin/login` - Process admin login
- `GET /admin` - Admin dashboard (requires auth)
- `POST /admin/logout` - Admin logout

## Database Schema

### Tables Structure
All tables follow the same schema:
```sql
CREATE TABLE table_name (
  s_no INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  lp_no VARCHAR(32) NOT NULL,
  items VARCHAR(256) NOT NULL,
  issue_voucher_number VARCHAR(32) NOT NULL
);
```

### Auto-increment Management
- The application automatically manages `s_no` auto-increment
- New items continue from the last `s_no` in each table
- Removes any invalid `s_no = 0` entries on startup

## Security Features
- **Session-based Authentication**: Secure admin login
- **Password Hashing**: bcryptjs for password security
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Parameterized queries

## Customization

### Adding New Tables
1. Create table in MySQL with the standard schema
2. Add table option to form dropdown in `views/form.ejs`
3. Add table link to admin navbar in `views/admin_panel.ejs`

### Changing Admin Credentials
1. Update `.env` file:
   ```env
   ADMIN_USERNAME=your_username
   ADMIN_PASSWORD=your_password
   ```
2. Restart the application

### Styling Modifications
- Edit `public/css/app.css` for custom styles
- Modify Bootstrap classes in EJS templates
- Update color scheme in CSS variables

## Troubleshooting

### Common Issues

1. **"Table doesn't exist" Error**
   - Ensure MySQL is running in XAMPP
   - Check database name in `.env` file
   - Verify table names match exactly

2. **Login Issues**
   - Check admin credentials in `.env`
   - Clear browser cache/cookies
   - Try incognito/private window

3. **QR Code Not Scanning**
   - Ensure QR contains JSON data (not URL)
   - Check QR code quality/contrast
   - Try different QR scanner apps

4. **Database Connection Issues**
   - Verify XAMPP MySQL is running
   - Check database credentials
   - Ensure database `qr` exists

### Debug Mode
- Check console output for available tables
- Look for error messages in terminal
- Verify `.env` file configuration

## Performance Considerations
- **Database Pooling**: Uses connection pooling for efficiency
- **QR Generation**: Cached QR codes for admin panel
- **Static Assets**: Local Bootstrap files for offline use
- **Session Management**: Efficient session handling

## Future Enhancements
- Bulk QR code generation
- CSV export functionality
- Search and filter capabilities
- Item editing/deletion features
- Print-friendly QR layouts
- Multi-language support

## Support
For issues or questions:
1. Check this documentation
2. Review console error messages
3. Verify database connectivity
4. Check file permissions

## License
This project is for internal use only. All rights reserved.

---
*Last Updated: January 2025*
*Version: 1.0.0*

## Adding a New Table: End-to-End Code Changes (Super-Detailed)

This guide explains every step needed to add a brand-new table (example name: `newtable`) and fully wire it into both the backend and frontend. Follow in order; copy/paste code snippets carefully.

### A. Plan and prerequisites
- Decide the new table name, e.g., `newtable` (lowercase, no spaces).
- Use the same columns as existing tables to avoid code changes elsewhere:
  - `s_no` INT AUTO_INCREMENT PRIMARY KEY
  - `lp_no` VARCHAR(32) NOT NULL
  - `items` VARCHAR(256) NOT NULL
  - `issue_voucher_number` VARCHAR(32) NOT NULL

### B. Create the table in MySQL
1) Open phpMyAdmin → database `qr` → SQL and run:
```sql
CREATE TABLE newtable (
  s_no INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  lp_no VARCHAR(32) NOT NULL,
  items VARCHAR(256) NOT NULL,
  issue_voucher_number VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
2) Verify it exists:
```sql
SHOW TABLES;
```
You should see `newtable` in the output.

### C. Backend changes (server.js)
The backend is already generic and supports any table present in the DB. It validates `table` via `SHOW TABLES`. You only need to ensure the new table is selectable and optionally restrict allowed tables.

1) Optional (recommended): Add an allow-list for safety
- Open `server.js`
- Near the imports (top of file), add:
```js
const ALLOWED_TABLES = ['it', 'atg', 'lpss', 'newtable'];
```
- In the `app.get('/admin', ...)` route (admin listing), right after determining `table`, enforce:
```js
if (!ALLOWED_TABLES.includes(table)) {
  return res.status(400).send(`Table not allowed. Allowed: ${ALLOWED_TABLES.join(', ')}`);
}
```
- In the `app.post('/form', ...)` route (insert), before running the INSERT, enforce:
```js
if (!ALLOWED_TABLES.includes(table)) {
  return res.status(400).render('form', { title: 'Add Item', error: `Table '${table}' not allowed.` });
}
```
Note: If you don’t add an allow-list, the existing code still validates the table exists by reading `SHOW TABLES`, which is safe for your current schema.

2) No other backend edits are required, provided the new table has the same 4 columns as above. The following behaviors will work automatically:
- Form submission will insert into `newtable` when posted from the updated dropdown (see frontend changes below).
- Success page `GET /success/:id?table=newtable` will read from `newtable`.
- Admin panel `GET /admin?table=newtable` will list records from `newtable`, generate QR for each row, and enable HD JPG download.

### D. Frontend changes (EJS templates)
1) Add the new table to the Form page dropdown
- Open `views/form.ejs`
- Find the table select block and add an option:
```html
<select class="form-select" name="table" required>
    <option value="">Choose a table...</option>
    <option value="it">IT</option>
    <option value="atg">ATG</option>
    <option value="lpss">LPSS</option>
    <!-- Add this line -->
    <option value="newtable">NEWTABLE</option>
</select>
```

2) Add the new table to the Admin navbar
- Open `views/admin_panel.ejs`
- Find the navbar with table links and add:
```html
<a class="nav-link <%= currentTable === 'newtable' ? 'active fw-bold' : '' %>" href="/admin?table=newtable">NEWTABLE</a>
```
Place it alongside the existing `IT`, `ATG`, and `LPSS` links.

### E. Testing checklist
Perform these after saving the changes and restarting the server (in nodemon, type `rs`).

1) Database visibility
- Start server, check terminal shows `Available tables: [..., 'newtable']`.

2) Insert via form
- Go to `http://localhost:3000/form`.
- Select `NEWTABLE` from dropdown.
- Fill `LP No`, `Items`, `Issue Voucher Number`.
- Click Generate QR.
- Expected: Redirects to `/success/:id?table=newtable`, shows QR, JSON, and buttons.

3) QR behavior
- Scan the QR on the success page with your phone: it should display JSON like:
```json
{"s_no":1,"lp_no":"03/08","items":"Key board and Mouse ","issue_voucher_number":"RV/CRV/IT/001"}
```
- Try downloading QR (JPG). It should be sharp/HD.

4) Admin listing
- Go to `http://localhost:3000/admin?table=newtable`.
- Expected: You see the new record(s) with QR, and “Download QR” works.

5) Auto-increment continuity
- Insert multiple times into `newtable` → `s_no` should keep increasing from the last value.

### F. Troubleshooting common errors
- Error: “Table not found” on Admin or Success page
  - Cause: Table name typo or not created.
  - Fix: Verify exact table name via `SHOW TABLES`. Ensure the `table` query parameter (or dropdown value) matches.

- Error: “Table not allowed” (if using ALLOWED_TABLES)
  - Cause: You added a new table but didn’t update `ALLOWED_TABLES`.
  - Fix: Add `'newtable'` to the `ALLOWED_TABLES` array.

- Error: Insert fails due to unknown column
  - Cause: Schema mismatch.
  - Fix: Ensure `lp_no`, `items`, `issue_voucher_number` columns exist and match types.

- Error: QR scan doesn’t show JSON
  - Cause: Old QR cache or scanner app issue.
  - Fix: Refresh page, regenerate QR, try another scanner app.

- Error: Duplicate key on insert (PRIMARY)
  - Cause: Auto-increment misaligned if you manually inserted rows.
  - Fix:
    ```sql
    SET @next := (SELECT COALESCE(MAX(s_no),0) + 1 FROM newtable);
    SET @sql := CONCAT('ALTER TABLE newtable AUTO_INCREMENT = ', @next);
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    ```

### G. Optional enhancements (per-table customization)
- Different columns per table: If a future table needs extra fields, you’ll need to:
  - Update `views/form.ejs` to show those fields when that table is selected (use conditional rendering on the client or split forms per table).
  - Update `POST /form` to include those fields in the INSERT (build SQL and params accordingly, safely parameterized).
  - Update admin listing table headers and row cells to show the new fields for that table.
  - Update QR JSON generation to include those fields (they are included automatically if they’re selected in the SQL query).

- Restrict which tables appear in the UI:
  - Remove the link/option in EJS navbar/dropdown.
  - Keep it in `ALLOWED_TABLES` only if you want to allow direct URL access.

### H. Rollback steps
- Remove the `<option>` from `views/form.ejs`.
- Remove the navbar link from `views/admin_panel.ejs`.
- (If used) Remove the table from `ALLOWED_TABLES` in `server.js`.
- Optionally drop the table from MySQL:
  ```sql
  DROP TABLE newtable;
  ```

Following this guide ensures a new developer can add a table end-to-end with full backend and frontend wiring, QR generation, and admin support.
