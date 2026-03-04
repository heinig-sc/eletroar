import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set("trust proxy", 1);
  app.use(express.json());

  // API Routes
  
  // Search Customers/Vehicles
  app.get("/api/search", async (req, res) => {
    const { q } = req.query;
    const searchTerm = `%${q}%`;
    
    const { data, error } = await supabase
      .from('customers')
      .select(`
        customer_id:id, name, phone,
        vehicles (
          vehicle_id:id, plate, brand, model, year, color
        )
      `)
      .or(`name.ilike.${searchTerm},phone.ilike.${searchTerm},vehicles.plate.ilike.${searchTerm},vehicles.brand.ilike.${searchTerm},vehicles.model.ilike.${searchTerm}`);
    
    if (error) return res.status(500).json({ error: error.message });
    
    // Flatten results to match previous format
    const results = data.flatMap((customer: any) => 
      customer.vehicles.map((vehicle: any) => ({
        customer_id: customer.customer_id,
        name: customer.name,
        phone: customer.phone,
        ...vehicle
      }))
    );
    
    res.json(results);
  });

  // List all customers
  app.get("/api/customers", async (req, res) => {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        vehicles (id)
      `)
      .order('name', { ascending: true });
    
    if (error) return res.status(500).json({ error: error.message });
    
    const results = data.map(c => ({
      ...c,
      vehicle_count: c.vehicles.length
    }));
    
    res.json(results);
  });

  // List all services (OS)
  app.get("/api/services", async (req, res) => {
    const { start, end } = req.query;
    let query = supabase
      .from('services')
      .select(`
        *,
        vehicles (
          plate, model,
          customers (name)
        )
      `);

    if (start) query = query.gte('service_date', start);
    if (end) query = query.lte('service_date', end);

    const { data, error } = await query.order('service_date', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    
    const results = data.map(s => ({
      ...s,
      customer_name: s.vehicles.customers.name,
      plate: s.vehicles.plate,
      model: s.vehicles.model
    }));
    
    res.json(results);
  });

  app.patch("/api/services/:id/toggle-status", async (req, res) => {
    const { id } = req.params;
    
    const { data: service, error: fetchError } = await supabase
      .from('services')
      .select('status')
      .eq('id', id)
      .single();
      
    if (fetchError) return res.status(404).json({ error: "Service not found" });
    
    const newStatus = service.status === 'completed' ? 'pending' : 'completed';
    const { error: updateError } = await supabase
      .from('services')
      .update({ status: newStatus })
      .eq('id', id);
      
    if (updateError) return res.status(500).json({ error: updateError.message });
    
    res.json({ success: true, status: newStatus });
  });

  // Get Customer History
  app.get("/api/customers/:id/history", async (req, res) => {
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        vehicles!inner (plate, model)
      `)
      .eq('vehicles.customer_id', req.params.id)
      .order('service_date', { ascending: false });
      
    if (error) return res.status(500).json({ error: error.message });
    
    const results = data.map(s => ({
      ...s,
      plate: s.vehicles.plate,
      model: s.vehicles.model
    }));
    
    res.json(results);
  });

  // CRUD for Customers
  app.post("/api/customers", async (req, res) => {
    const { name, phone, email, vehicle } = req.body;
    
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert([{ name, phone, email }])
      .select()
      .single();
      
    if (customerError) return res.status(500).json({ error: customerError.message });

    let vehicleId = null;
    if (vehicle) {
      const { data: vData, error: vehicleError } = await supabase
        .from('vehicles')
        .insert([{
          customer_id: customer.id,
          plate: vehicle.plate,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color
        }])
        .select()
        .single();
      if (vehicleError) console.error("Error creating vehicle:", vehicleError);
      vehicleId = vData?.id;
    }

    res.json({ id: customer.id, vehicle_id: vehicleId });
  });

  app.put("/api/customers/:id", async (req, res) => {
    const { id } = req.params;
    const { name, phone, email } = req.body;
    const { error } = await supabase
      .from('customers')
      .update({ name, phone, email })
      .eq('id', id);
      
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.delete("/api/customers/:id", async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
      
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Vehicles CRUD
  app.get("/api/customers/:id/vehicles", async (req, res) => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('customer_id', req.params.id);
      
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/vehicles", async (req, res) => {
    const { customer_id, plate, brand, model, year, color } = req.body;
    const { data, error } = await supabase
      .from('vehicles')
      .insert([{ customer_id, plate, brand, model, year, color }])
      .select()
      .single();
      
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data.id });
  });

  app.put("/api/vehicles/:id", async (req, res) => {
    const { id } = req.params;
    const { plate, brand, model, year, color } = req.body;
    const { error } = await supabase
      .from('vehicles')
      .update({ plate, brand, model, year, color })
      .eq('id', id);
      
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.delete("/api/vehicles/:id", async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);
      
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // CRUD for Services
  app.post("/api/services", async (req, res) => {
    const { vehicle_id, description, total_price, parts } = req.body;
    
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .insert([{ vehicle_id, description, total_price }])
      .select()
      .single();
      
    if (serviceError) return res.status(500).json({ error: serviceError.message });

    if (parts && Array.isArray(parts)) {
      const partsToInsert = parts.map(p => ({
        service_id: service.id,
        name: p.name,
        quantity: p.quantity,
        price: p.price
      }));
      const { error: partsError } = await supabase
        .from('parts')
        .insert(partsToInsert);
      if (partsError) console.error("Error creating parts:", partsError);
    }

    res.json({ id: service.id });
  });

  app.get("/api/services/:id", async (req, res) => {
    const { id } = req.params;
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select(`
        *,
        vehicles (
          plate, model,
          customers (name)
        )
      `)
      .eq('id', id)
      .single();
    
    if (serviceError) return res.status(404).json({ error: "Service not found" });
    
    const { data: parts, error: partsError } = await supabase
      .from('parts')
      .select('*')
      .eq('service_id', id);
      
    if (partsError) return res.status(500).json({ error: partsError.message });
    
    res.json({ 
      ...service, 
      customer_name: service.vehicles.customers.name,
      plate: service.vehicles.plate,
      model: service.vehicles.model,
      parts 
    });
  });

  app.put("/api/services/:id", async (req, res) => {
    const { id } = req.params;
    const { description, total_price, parts } = req.body;
    
    const { error: serviceError } = await supabase
      .from('services')
      .update({ description, total_price })
      .eq('id', id);
      
    if (serviceError) return res.status(500).json({ error: serviceError.message });
    
    if (parts && Array.isArray(parts)) {
      // Delete existing parts
      await supabase.from('parts').delete().eq('service_id', id);
      
      const partsToInsert = parts.map(p => ({
        service_id: id,
        name: p.name,
        quantity: p.quantity,
        price: p.price
      }));
      const { error: partsError } = await supabase
        .from('parts')
        .insert(partsToInsert);
      if (partsError) console.error("Error updating parts:", partsError);
    }
    
    res.json({ success: true });
  });

  app.delete("/api/services/:id", async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);
      
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Accounts Payable
  app.get("/api/accounts-payable", async (req, res) => {
    const { start, end, supplier } = req.query;
    let query = supabase.from('accounts_payable').select('*');

    if (start) query = query.gte('due_date', start);
    if (end) query = query.lte('due_date', end);
    if (supplier) query = query.ilike('supplier', `%${supplier}%`);

    const { data, error } = await query.order('due_date', { ascending: true });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.patch("/api/accounts-payable/:id/toggle-paid", async (req, res) => {
    const { id } = req.params;
    
    const { data: payable, error: fetchError } = await supabase
      .from('accounts_payable')
      .select('paid')
      .eq('id', id)
      .single();
      
    if (fetchError) return res.status(404).json({ error: "Payable not found" });
    
    const { error: updateError } = await supabase
      .from('accounts_payable')
      .update({ paid: !payable.paid })
      .eq('id', id);
      
    if (updateError) return res.status(500).json({ error: updateError.message });
    
    res.json({ success: true });
  });

  app.post("/api/accounts-payable", async (req, res) => {
    const { supplier, description, amount, due_date } = req.body;
    const { data, error } = await supabase
      .from('accounts_payable')
      .insert([{ supplier, description, amount, due_date }])
      .select()
      .single();
      
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data.id });
  });

  app.put("/api/accounts-payable/:id", async (req, res) => {
    const { id } = req.params;
    const { supplier, description, amount, due_date, paid } = req.body;
    const { error } = await supabase
      .from('accounts_payable')
      .update({ supplier, description, amount, due_date, paid })
      .eq('id', id);
      
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.delete("/api/accounts-payable/:id", async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
      .from('accounts_payable')
      .delete()
      .eq('id', id);
      
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Reports
  app.get("/api/reports/services", async (req, res) => {
    const { start, end } = req.query;
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        vehicles (
          plate,
          customers (name)
        )
      `)
      .gte('service_date', start || '1970-01-01')
      .lte('service_date', end || '2099-12-31');
      
    if (error) return res.status(500).json({ error: error.message });
    
    const results = data.map(s => ({
      ...s,
      customer_name: s.vehicles.customers.name,
      plate: s.vehicles.plate
    }));
    
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
