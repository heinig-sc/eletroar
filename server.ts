import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import session from "express-session";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("workshop.db");
db.exec("PRAGMA foreign_keys = ON;");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    plate TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    year INTEGER,
    color TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    total_price REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    service_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    price REAL DEFAULT 0,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS accounts_payable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    due_date DATE NOT NULL,
    paid BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  INSERT INTO customers (name, phone, email) SELECT 'João Silva', '11988887777', 'joao@email.com' WHERE NOT EXISTS (SELECT 1 FROM customers);
  INSERT INTO vehicles (customer_id, plate, brand, model, year, color) SELECT 1, 'ABC-1234', 'Toyota', 'Corolla', 2022, 'Prata' WHERE NOT EXISTS (SELECT 1 FROM vehicles);
  INSERT INTO services (vehicle_id, description, total_price, status) SELECT 1, 'Carga de Gás e Troca de Filtro', 350.00, 'completed' WHERE NOT EXISTS (SELECT 1 FROM services);
  
  INSERT INTO accounts_payable (supplier, description, amount, due_date, paid) SELECT 'Distribuidora AC', 'Filtros de Cabine', 1200.00, '2026-03-01', 0 WHERE NOT EXISTS (SELECT 1 FROM accounts_payable);
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', 1); // Trust the proxy for secure cookies
  app.use(express.json());
  app.use(session({
    secret: 'workshop-secret-key',
    resave: true,
    saveUninitialized: true,
    proxy: true, // Explicitly trust proxy for cookies
    cookie: {
      secure: true, // Required for SameSite=None
      sameSite: 'none', // Required for cross-origin iframe
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  }));

  // Seed default user with proper hash
  const adminUser = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
  if (!adminUser || adminUser.password.includes('X.X.X')) {
    const hash = bcrypt.hashSync('admin123', 10);
    if (adminUser) {
      db.prepare("UPDATE users SET password = ? WHERE username = 'admin'").run(hash);
    } else {
      db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run('admin', hash);
    }
  }

  // Auth Routes
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    
    if (user && bcrypt.compareSync(password, user.password)) {
      (req.session as any).userId = user.id;
      (req.session as any).username = user.username;
      res.json({ success: true, user: { id: user.id, username: user.username } });
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/me", (req, res) => {
    if ((req.session as any).userId) {
      res.json({ 
        authenticated: true, 
        user: { 
          id: (req.session as any).userId, 
          username: (req.session as any).username 
        } 
      });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Auth Middleware
  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if ((req.session as any).userId) {
      next();
    } else {
      res.status(401).json({ error: "Não autorizado" });
    }
  };

  // API Routes
  
  // Search Customers/Vehicles
  app.get("/api/search", requireAuth, (req, res) => {
    const { q } = req.query;
    const query = `%${q}%`;
    
    const results = db.prepare(`
      SELECT 
        c.id as customer_id, c.name, c.phone,
        v.id as vehicle_id, v.plate, v.brand, v.model, v.year, v.color
      FROM customers c
      JOIN vehicles v ON c.id = v.customer_id
      WHERE c.name LIKE ? OR c.phone LIKE ? OR v.plate LIKE ? OR v.brand LIKE ? OR v.model LIKE ?
    `).all(query, query, query, query, query);
    
    res.json(results);
  });

  // List all customers
  app.get("/api/customers", requireAuth, (req, res) => {
    const customers = db.prepare(`
      SELECT c.*, COUNT(v.id) as vehicle_count
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.customer_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();
    res.json(customers);
  });

  // List all services (OS)
  app.get("/api/services", requireAuth, (req, res) => {
    const { start, end } = req.query;
    let query = `
      SELECT s.*, c.name as customer_name, v.plate, v.model
      FROM services s
      JOIN vehicles v ON s.vehicle_id = v.id
      JOIN customers c ON v.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (start) {
      query += " AND date(s.service_date) >= ?";
      params.push(start);
    }
    if (end) {
      query += " AND date(s.service_date) <= ?";
      params.push(end);
    }

    query += " ORDER BY s.service_date DESC";
    
    const services = db.prepare(query).all(...params);
    res.json(services);
  });

  app.patch("/api/services/:id/toggle-status", requireAuth, (req, res) => {
    const { id } = req.params;
    const service = db.prepare("SELECT status FROM services WHERE id = ?").get(id);
    if (service) {
      const newStatus = service.status === 'completed' ? 'pending' : 'completed';
      db.prepare("UPDATE services SET status = ? WHERE id = ?").run(newStatus, id);
      res.json({ success: true, status: newStatus });
    } else {
      res.status(404).json({ error: "Service not found" });
    }
  });

  // Get Customer History
  app.get("/api/customers/:id/history", requireAuth, (req, res) => {
    const history = db.prepare(`
      SELECT s.*, v.plate, v.model
      FROM services s
      JOIN vehicles v ON s.vehicle_id = v.id
      WHERE v.customer_id = ?
      ORDER BY s.service_date DESC
    `).all(req.params.id);
    res.json(history);
  });

  // CRUD for Customers
  app.post("/api/customers", requireAuth, (req, res) => {
    const { name, phone, email, vehicle } = req.body;
    const insertCustomer = db.prepare("INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)");
    const result = insertCustomer.run(name, phone, email);
    const customerId = result.lastInsertRowid;

    if (vehicle) {
      const insertVehicle = db.prepare("INSERT INTO vehicles (customer_id, plate, brand, model, year, color) VALUES (?, ?, ?, ?, ?, ?)");
      insertVehicle.run(customerId, vehicle.plate, vehicle.brand, vehicle.model, vehicle.year, vehicle.color);
    }

    res.json({ id: customerId });
  });

  app.put("/api/customers/:id", requireAuth, (req, res) => {
    const { id } = req.params;
    const { name, phone, email } = req.body;
    db.prepare("UPDATE customers SET name = ?, phone = ?, email = ? WHERE id = ?").run(name, phone, email, id);
    res.json({ success: true });
  });

  app.delete("/api/customers/:id", requireAuth, (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM customers WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Vehicles CRUD
  app.get("/api/customers/:id/vehicles", requireAuth, (req, res) => {
    const vehicles = db.prepare("SELECT * FROM vehicles WHERE customer_id = ?").all(req.params.id);
    res.json(vehicles);
  });

  app.post("/api/vehicles", requireAuth, (req, res) => {
    const { customer_id, plate, brand, model, year, color } = req.body;
    const result = db.prepare("INSERT INTO vehicles (customer_id, plate, brand, model, year, color) VALUES (?, ?, ?, ?, ?, ?)")
      .run(customer_id, plate, brand, model, year, color);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/vehicles/:id", requireAuth, (req, res) => {
    const { id } = req.params;
    const { plate, brand, model, year, color } = req.body;
    db.prepare("UPDATE vehicles SET plate = ?, brand = ?, model = ?, year = ?, color = ? WHERE id = ?")
      .run(plate, brand, model, year, color, id);
    res.json({ success: true });
  });

  app.delete("/api/vehicles/:id", requireAuth, (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // CRUD for Services
  app.post("/api/services", requireAuth, (req, res) => {
    const { vehicle_id, description, total_price, parts } = req.body;
    const insertService = db.prepare("INSERT INTO services (vehicle_id, description, total_price) VALUES (?, ?, ?)");
    const result = insertService.run(vehicle_id, description, total_price);
    const serviceId = result.lastInsertRowid;

    if (parts && Array.isArray(parts)) {
      const insertPart = db.prepare("INSERT INTO parts (service_id, name, quantity, price) VALUES (?, ?, ?, ?)");
      for (const part of parts) {
        insertPart.run(serviceId, part.name, part.quantity, part.price);
      }
    }

    res.json({ id: serviceId });
  });

  app.get("/api/services/:id", requireAuth, (req, res) => {
    const { id } = req.params;
    const service = db.prepare(`
      SELECT s.*, v.plate, v.model, c.name as customer_name
      FROM services s
      JOIN vehicles v ON s.vehicle_id = v.id
      JOIN customers c ON v.customer_id = c.id
      WHERE s.id = ?
    `).get(id);
    
    if (service) {
      const parts = db.prepare("SELECT * FROM parts WHERE service_id = ?").all(id);
      res.json({ ...service, parts });
    } else {
      res.status(404).json({ error: "Service not found" });
    }
  });

  app.put("/api/services/:id", requireAuth, (req, res) => {
    const { id } = req.params;
    const { description, total_price, parts } = req.body;
    
    db.prepare("UPDATE services SET description = ?, total_price = ? WHERE id = ?").run(description, total_price, id);
    
    if (parts && Array.isArray(parts)) {
      // Simple approach: delete existing parts and re-insert
      db.prepare("DELETE FROM parts WHERE service_id = ?").run(id);
      const insertPart = db.prepare("INSERT INTO parts (service_id, name, quantity, price) VALUES (?, ?, ?, ?)");
      for (const part of parts) {
        insertPart.run(id, part.name, part.quantity, part.price);
      }
    }
    
    res.json({ success: true });
  });

  app.delete("/api/services/:id", requireAuth, (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM services WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Accounts Payable
  app.get("/api/accounts-payable", requireAuth, (req, res) => {
    const { start, end, supplier } = req.query;
    let query = "SELECT * FROM accounts_payable WHERE 1=1";
    const params = [];

    if (start) {
      query += " AND date(due_date) >= ?";
      params.push(start);
    }
    if (end) {
      query += " AND date(due_date) <= ?";
      params.push(end);
    }
    if (supplier) {
      query += " AND supplier LIKE ?";
      params.push(`%${supplier}%`);
    }

    const results = db.prepare(query).all(...params);
    res.json(results);
  });

  app.patch("/api/accounts-payable/:id/toggle-paid", requireAuth, (req, res) => {
    const { id } = req.params;
    db.prepare("UPDATE accounts_payable SET paid = NOT paid WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.post("/api/accounts-payable", requireAuth, (req, res) => {
    const { supplier, description, amount, due_date } = req.body;
    const insert = db.prepare("INSERT INTO accounts_payable (supplier, description, amount, due_date) VALUES (?, ?, ?, ?)");
    const result = insert.run(supplier, description, amount, due_date);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/accounts-payable/:id", requireAuth, (req, res) => {
    const { id } = req.params;
    const { supplier, description, amount, due_date, paid } = req.body;
    db.prepare("UPDATE accounts_payable SET supplier = ?, description = ?, amount = ?, due_date = ?, paid = ? WHERE id = ?")
      .run(supplier, description, amount, due_date, paid ? 1 : 0, id);
    res.json({ success: true });
  });

  app.delete("/api/accounts-payable/:id", requireAuth, (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM accounts_payable WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Reports
  app.get("/api/reports/services", requireAuth, (req, res) => {
    const { start, end } = req.query;
    const results = db.prepare(`
      SELECT s.*, c.name as customer_name, v.plate
      FROM services s
      JOIN vehicles v ON s.vehicle_id = v.id
      JOIN customers c ON v.customer_id = c.id
      WHERE date(s.service_date) BETWEEN ? AND ?
    `).all(start || '1970-01-01', end || '2099-12-31');
    res.json(results);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
