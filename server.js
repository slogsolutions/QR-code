const path = require("path");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const QRCode = require("qrcode");

dotenv.config();

const app = express();

// Config
const APP_PORT = process.env.APP_PORT || 3000;
const SESSION_SECRET =
  process.env.SESSION_SECRET || "change_this_secret_offline";
const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "qr";

// Views and static
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use("/static", express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    name: "qrgen.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" },
  })
);

// Database pool
let pool;
async function initDb() {
  pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    connectionLimit: 10,
  });

  // Check available tables and set up the default one
  try {
    const [tables] = await pool.query("SHOW TABLES");
    console.log(
      "Available tables:",
      tables.map((t) => Object.values(t)[0])
    );

    // Use the first available table as default if 'it' doesn't exist
    const availableTables = tables.map((t) => Object.values(t)[0]);
    if (!availableTables.includes("it")) {
      console.log(
        'Table "it" not found, using first available table:',
        availableTables[0]
      );
    }
  } catch (e) {
    console.warn("Table check note:", e.message);
  }
}

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect("/admin/login");
}

// Hardcoded admin user for fully offline usage
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
// Pre-hash default password 'admin123' for offline use
const ADMIN_HASH =
  process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync("admin123", 10);
const ADMIN_PASSWORD_PLAIN = process.env.ADMIN_PASSWORD || "";

// Routes
app.get("/", (req, res) => {
  res.redirect("/form");
});

// Public form to insert records into it table
app.get("/form", (req, res) => {
  res.render("form", { title: "Add Item" });
});

app.post("/form", async (req, res) => {
  const { table, lp_no, items, issue_voucher_number } = req.body;
  if (!table || !lp_no || !items || !issue_voucher_number) {
    return res
      .status(400)
      .render("form", { title: "Add Item", error: "All fields are required." });
  }

  try {
    // Check if table exists
    const [tables] = await pool.query("SHOW TABLES");
    const availableTables = tables.map((t) => Object.values(t)[0]);

    if (!availableTables.includes(table)) {
      return res
        .status(400)
        .render("form", {
          title: "Add Item",
          error: `Table '${table}' not found.`,
        });
    }

    const [result] = await pool.execute(
      `INSERT INTO ${table} (lp_no, items, issue_voucher_number) VALUES (?, ?, ?)`,
      [lp_no, items, issue_voucher_number]
    );
    return res.redirect(`/success/${result.insertId}?table=${table}`);
  } catch (err) {
    return res
      .status(500)
      .render("form", {
        title: "Add Item",
        error: "Database error: " + err.message,
      });
  }
});

app.get("/success/:id", async (req, res) => {
  const { id } = req.params;
  const table = req.query.table || "it";
  try {
    const [rows] = await pool.execute(
      `SELECT s_no, lp_no, items, issue_voucher_number FROM ${table} WHERE s_no = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).send("Not found");
    const record = rows[0];
    const jsonText = JSON.stringify(record);
    const qrDataUrl = await QRCode.toDataURL(jsonText, {
      margin: 1,
      width: 256,
    });
    const jsonUrl = `${req.protocol}://${req.get("host")}/api/item/${
      record.s_no
    }`; // optional API link
    res.render("success", {
      title: "Saved",
      record,
      qrDataUrl,
      jsonUrl,
      jsonText,
      table,
    });
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

// Admin auth
app.get("/admin/login", (req, res) => {
  res.render("admin_login", { title: "Admin Login", error: null });
});

app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;
  let ok = false;
  if (username === ADMIN_USERNAME) {
    if (ADMIN_PASSWORD_PLAIN) {
      ok = password === ADMIN_PASSWORD_PLAIN;
    } else {
      ok = await bcrypt.compare(password, ADMIN_HASH);
    }
  }
  if (ok) {
    req.session.user = { username };
    return res.redirect("/admin");
  }
  return res
    .status(401)
    .render("admin_login", {
      title: "Admin Login",
      error: "Invalid credentials",
    });
});

app.post("/admin/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

// Admin panel: list all entries with QR codes
app.get("/admin", requireAuth, async (req, res) => {
  const table = req.query.table || "it";
  try {
    // First check if table exists
    const [tables] = await pool.query("SHOW TABLES");
    const availableTables = tables.map((t) => Object.values(t)[0]);

    if (!availableTables.includes(table)) {
      return res
        .status(404)
        .send(
          `Table '${table}' not found. Available tables: ${availableTables.join(
            ", "
          )}`
        );
    }

    const [rows] = await pool.execute(
      `SELECT s_no, lp_no, items, issue_voucher_number FROM ${table} ORDER BY s_no ASC`
    );
    // Build QR for each row encoding the JSON payload directly
    const withQr = await Promise.all(
      rows.map(async (r) => {
        const jsonText = JSON.stringify(r);
        const qr = await QRCode.toDataURL(jsonText, { margin: 1, width: 128 });
        const qrHd = await QRCode.toDataURL(jsonText, {
          margin: 1,
          width: 1024,
        });
        const jsonUrl = `${req.protocol}://${req.get("host")}/api/item/${
          r.s_no
        }`; // optional API link
        return { ...r, qr, qrHd, jsonUrl, jsonText };
      })
    );
    res.render("admin_panel", {
      title: "Admin Panel",
      items: withQr,
      user: req.session.user,
      currentTable: table,
    });
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

// JSON endpoint for scanned QR
app.get("/api/item/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.execute(
      "SELECT s_no, lp_no, items, issue_voucher_number FROM it WHERE s_no = ?",
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start
initDb()
  .then(() => {
    app.listen(APP_PORT, () => {
      console.log(`Server running on http://localhost:${APP_PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to init DB", err);
    process.exit(1);
  });
