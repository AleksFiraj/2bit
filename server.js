require('dotenv').config();
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const { Sequelize, DataTypes, Op } = require('sequelize');

const app = express();

app.use(cors());
app.use(bodyParser.json());

const usersFile = './users.json';
if (!fs.existsSync(usersFile)) {
  fs.writeFileSync(usersFile, JSON.stringify([
    {
      username: 'admin',
      password: 'admin123',
      role: 'admin_it'
    },
    {
      username: 'sales',
      password: 'sales123',
      role: 'sales_support'
    }
  ], null, 2));
}

const otpMap = {}; // phone: otp

// Twilio config (you MUST replace these)
const accountSid = 'ACb792e3020ea1d72ae6e0ed7b6eb907d6';
const authToken = '1b8d413b58cc15a148400ac72a9bf825';
const twilioPhone = '+15073532965';

const client = twilio(accountSid, authToken);

function sendOtp(phone, otp) {
  if (!client) {
    console.warn(`[MOCK] Would send OTP ${otp} to ${phone}`);
    return Promise.resolve();
  }
  return client.messages.create({
    body: `Kodi juaj OTP: ${otp}`,
    from: twilioPhone,
    to: phone
  });
}

// ────────────────────────────────────────────────────────────
// DB INITIALISATION (SQLite for local dev, swap to Postgres in prod)
// ────────────────────────────────────────────────────────────
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './sme.db',
  logging: false
});

const Company = sequelize.define('Company', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: DataTypes.STRING,
  contractNumber: DataTypes.STRING,
  monthlyBudget: DataTypes.FLOAT
});

const Line = sequelize.define('Line', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  companyId: DataTypes.INTEGER,
  msisdn: DataTypes.STRING,
  user: DataTypes.STRING,
  role: DataTypes.STRING,
  planName: DataTypes.STRING,
  monthlyFee: DataTypes.FLOAT,
  includedData: DataTypes.INTEGER,
  includedMinutes: DataTypes.INTEGER,
  includedSMS: DataTypes.INTEGER,
  budgetLimit: DataTypes.FLOAT,
  status: DataTypes.STRING
});

const Usage = sequelize.define('Usage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  lineId: DataTypes.INTEGER,
  dataUsedMB: { type: DataTypes.INTEGER, defaultValue: 0 },
  callMinutes: { type: DataTypes.INTEGER, defaultValue: 0 },
  smsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  roamingMinutes: { type: DataTypes.INTEGER, defaultValue: 0 },
  internationalMinutes: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const Order = sequelize.define('Order', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  lineId: DataTypes.INTEGER,
  type: DataTypes.STRING, // e.g., 'plan_change', 'package_activation'
  status: DataTypes.STRING, // Created, Pending, In Progress, Completed, Failed
  payload: DataTypes.JSON, // JSON object with details of the change
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING, unique: true },
  password: DataTypes.STRING, // In prod, use hashed passwords
  role: DataTypes.STRING, // admin_it, sales_support, sme_admin
  phone: DataTypes.STRING,
  companyId: DataTypes.INTEGER,
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

const SystemLog = sequelize.define('SystemLog', {
  action: DataTypes.STRING,
  user: DataTypes.STRING,
  timestamp: DataTypes.DATE,
  details: DataTypes.JSON,
});

Company.hasMany(Line, { foreignKey: 'companyId' });
Line.belongsTo(Company, { foreignKey: 'companyId' });
Line.hasMany(Usage, { foreignKey: 'lineId' });
Usage.belongsTo(Line, { foreignKey: 'lineId' });
Line.hasMany(Order, { foreignKey: 'lineId' });
Order.belongsTo(Line, { foreignKey: 'lineId' });
Company.hasMany(User, { foreignKey: 'companyId' }); // Assume users belong to companies
User.belongsTo(Company, { foreignKey: 'companyId' });

// sync and seed if DB empty
(async () => {
  await sequelize.sync();
  const companyCount = await Company.count();
  if (companyCount === 0 && fs.existsSync('./data/userData.json')) {
    const seed = JSON.parse(fs.readFileSync('./data/userData.json'));
    const c = await Company.create({
      name: seed.businessName,
      contractNumber: seed.contractNumber,
      monthlyBudget: seed.monthlyBudget
    });
    for (const l of seed.lines) {
      await Line.create({
        companyId: c.id,
        msisdn: l.msisdn,
        user: l.user,
        role: l.role,
        planName: l.plan.name,
        monthlyFee: l.plan.monthlyFee,
        includedData: l.plan.includedData,
        includedMinutes: l.plan.includedMinutes,
        includedSMS: l.plan.includedSMS,
        budgetLimit: l.budgetLimit,
        status: l.status
      });
    }
    console.log('📦 Demo data seeded into SQLite DB');
  }
  const userCount = await User.count();
  if (userCount === 0 && fs.existsSync('./users.json')) {
    const usersData = JSON.parse(fs.readFileSync('./users.json'));
    for (const u of usersData) {
      await User.create(u); // Simple migration; in prod, handle hashing
    }
    console.log('👤 Users migrated from JSON to DB');
  }
})();

// Utility function to// Log system actions for auditing
async function logSystemAction(action, user, details = {}) {
  try {
    // Only try to create log if the SystemLog model exists
    if (SystemLog) {
      await SystemLog.create({
        action,
        user,
        details: JSON.stringify(details),
        createdAt: new Date()
      });
    } else {
      console.log(`System Log (mock): ${action} by ${user}`);
    }
  } catch (err) {
    // Just log to console if database isn't available
    console.error('Error logging action:', err);
    console.log(`System Log (fallback): ${action} by ${user}`);
  }
};

// ────────────────────────────────────────────────────────────
// UTILITIES
// ────────────────────────────────────────────────────────────
function getCycleStart(date = new Date()) {
  // assumes billing cycle aligns with calendar month for demo
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

async function getCurrentUsage(lineId) {
  const start = getCycleStart();
  const records = await Usage.findAll({
    where: { lineId, createdAt: { [Op.gte]: start } }
  });
  const agg = {
    dataUsedMB: 0,
    callMinutes: 0,
    smsCount: 0,
    roamingMinutes: 0,
    internationalMinutes: 0
  };
  for (const r of records) {
    agg.dataUsedMB += r.dataUsedMB;
    agg.callMinutes += r.callMinutes;
    agg.smsCount += r.smsCount;
    agg.roamingMinutes += r.roamingMinutes;
    agg.internationalMinutes += r.internationalMinutes;
  }
  return agg;
}

async function maybeTriggerAlert(line, usageTotals) {
  if (!line.budgetLimit || !line.includedData) return;
  const dataSpentPct = (usageTotals.dataUsedMB / line.includedData) * 100;
  const callSpentPct = (usageTotals.callMinutes / line.includedMinutes) * 100;
  const smsSpentPct = (usageTotals.smsCount / line.includedSMS) * 100;
  const thresholds = [80, 90, 100];
  thresholds.forEach(level => {
    if ((dataSpentPct >= level && line.alerts?.dataThreshold === level) ||
        (callSpentPct >= level && line.alerts?.callThreshold === level) ||
        (smsSpentPct >= level && line.alerts?.smsThreshold === level)) {
      console.log(`⚠️ Alert: ${level}% threshold reached for ${line.msisdn} on ${level === 80 ? 'data' : level === 90 ? 'calls' : 'sms'}`);
      // Send notification via Twilio or email; placeholder
    }
  });
}

// ────────────────────────────────────────────────────────────
// USAGE & SELF-SERVICE ROUTES
// ────────────────────────────────────────────────────────────
// Provide mock data for development purposes
app.get('/mock-data/companies/:companyId/usage', (req, res) => {
  // This is a simplified, static mock data endpoint for testing without DB
  const mockData = [
    {
      id: 1,
      user: 'Test User',
      msisdn: '355000000001',
      planName: 'Business Pro',
      includedData: 5000,
      dataUsedMB: 2500,
      remainingDataMB: 2500,
      includedMinutes: 500,
      callMinutes: 250,
      includedSMS: 100,
      smsCount: 50,
      budgetLimit: 2000
    },
    {
      id: 2,
      user: 'Test User 2',
      msisdn: '355000000002',
      planName: 'Business Basic',
      includedData: 2000,
      dataUsedMB: 1000,
      remainingDataMB: 1000,
      includedMinutes: 200,
      callMinutes: 150,
      includedSMS: 50,
      smsCount: 20,
      budgetLimit: 1000
    }
  ];
  
  res.json(mockData);
});

// List current usage of all lines for a company (real-time dashboard)
app.get('/companies/:companyId/usage', async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const lines = await Line.findAll({ where: { companyId } });
    
    // If no lines found, return empty array instead of 404
    if (!lines.length) {
      console.log(`No lines found for company ID: ${companyId}`);
      return res.json([]);
    }
    
    const out = [];
    for (const line of lines) {
      const totals = await getCurrentUsage(line.id);
      const remainingData = Math.max(0, line.includedData - totals.dataUsedMB);
      
      out.push({
        id: line.id,
        user: line.user || 'Company User',
        msisdn: line.msisdn || '35500000000',
        planName: line.planName || 'Basic Plan',
        includedData: line.includedData || 1000,
        dataUsedMB: totals.dataUsedMB || 0,
        remainingDataMB: remainingData,
        includedMinutes: line.includedMinutes || 100,
        callMinutes: totals.callMinutes || 0,
        includedSMS: line.includedSMS || 50,
        smsCount: totals.smsCount || 0,
        budgetLimit: line.budgetLimit || 1000
      });
    }
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch usage' });
  }
});

// Historical monthly trend for a line (default 6 months)
app.get('/lines/:lineId/usage', async (req, res) => {
  try {
    const { lineId } = req.params;
    const months = parseInt(req.query.months || '6', 10);
    const line = await Line.findByPk(lineId);
    if (!line) return res.status(404).json({ message: 'Line not found' });

    const now = new Date();
    const history = [];
    for (let i = 0; i < months; i++) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const recs = await Usage.findAll({
        where: {
          lineId,
          createdAt: { [Op.gte]: from, [Op.lt]: to }
        }
      });
      const m = { month: from.toISOString().substring(0, 7), dataUsedMB: 0, callMinutes: 0, smsCount: 0 };
      recs.forEach(r => {
        m.dataUsedMB += r.dataUsedMB;
        m.callMinutes += r.callMinutes;
        m.smsCount += r.smsCount;
      });
      history.push(m);
    }
    res.json(history.reverse()); // oldest first
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch history' });
  }
});

// Ingest real-time usage event (mock billing feed)
app.post('/usage/ingest', async (req, res) => {
  try {
    const { lineId, dataUsedMB = 0, callMinutes = 0, smsCount = 0 } = req.body;
    const line = await Line.findByPk(lineId);
    if (!line) return res.status(404).json({ message: 'Line not found' });
    await Usage.create({ lineId, dataUsedMB, callMinutes, smsCount });
    const totals = await getCurrentUsage(lineId);
    maybeTriggerAlert(line, totals);
    res.json({ message: 'Usage ingested' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ingest failed' });
  }
});

// Update budget / usage limit (self-service)
app.patch('/lines/:lineId/limit', async (req, res) => {
  try {
    const { lineId } = req.params;
    const { budgetLimit } = req.body;
    const line = await Line.findByPk(lineId);
    if (!line) return res.status(404).json({ message: 'Line not found' });
    line.budgetLimit = budgetLimit;
    await line.save();
    res.json({ message: 'Limit updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Update failed' });
  }
});

// Register SME Admins only
app.post('/register', async (req, res) => {
  try {
    const { contractNumber, username, password, phone } = req.body;

    // Check all required fields
    if (!contractNumber || !username || !password || !phone) {
      return res.status(400).json({ message: 'Të gjitha fushat janë të detyrueshme.' });
    }

    // Validate phone number format
    const phoneRegex = /^\+355\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Numri i telefonit duhet të jetë në formatin +355 e ndjekur nga 9 shifra.' });
    }

    // Load users
    const usersData = JSON.parse(fs.readFileSync(usersFile));

    // Check if username already exists
    if (usersData.some(user => user.username === username)) {
      return res.status(400).json({ message: 'Ky username ekziston tashmë. Zgjidhni një tjetër.' });
    }

    // Create new user
    const newUser = {
      contractNumber,
      username,
      password,
      phone,
      role: 'sme_admin'
    };

    usersData.push(newUser);
    fs.writeFileSync(usersFile, JSON.stringify(usersData, null, 2));

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpMap[phone] = otp;

    // Send OTP via Twilio
    await sendOtp(phone, otp);
    console.log(`📲 OTP dërguar te ${phone}: ${otp}`);

    res.status(200).json({ message: 'Regjistrimi u krye me sukses. Kodi OTP u dërgua në telefonin tuaj.' });
  } catch (err) {
    console.error('❌ Gabim gjatë regjistrimit:', err.message);
    res.status(500).json({ message: 'Regjistrimi dështoi. Provo përsëri.', error: err.message });
  }
});


// Login
app.post('/login', async (req, res) => {
  try {
    console.log('Login attempt with:', req.body);
    const { username, password, role } = req.body;
    
    if (!username || !password || !role) {
      console.log('Missing required login fields');
      return res.status(400).json({ message: 'Username, password, and role are required' });
    }
    
    // Read users from the JSON file
    let usersData = [];
    try {
      usersData = JSON.parse(fs.readFileSync(usersFile));
    } catch (err) {
      console.error('Error reading users file:', err);
      // Create demo user if file doesn't exist or is empty
      usersData = [
        {
          username: 'admin',
          password: 'admin123',
          role: 'admin_it'
        },
        {
          username: 'sales',
          password: 'sales123',
          role: 'sales_support'
        },
        {
          username: 'smeadmin',
          password: 'sme123',
          role: 'sme_admin',
          phone: '+355683123456',
          contractNumber: 'CORP-2023-001'
        }
      ];
      fs.writeFileSync(usersFile, JSON.stringify(usersData));
    }
    
    const user = usersData.find(u => u.username === username && u.password === password && u.role === role);
    
    if (!user) {
      console.log('Invalid credentials for:', username, role);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    console.log('Login successful for user:', username, 'with role:', role);
    
    // Log the login action - handle cases where logging might fail gracefully
    try {
      await logSystemAction('User login', username, { role });
    } catch (logError) {
      console.warn('Failed to log action, but continuing:', logError.message);
    }

    if (user.role === 'sme_admin') {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Make sure phone is defined
      if (!user.phone) {
        console.log('User missing phone number:', username);
        return res.status(400).json({ message: 'User does not have a phone number configured' });
      }
      
      otpMap[user.phone] = otp;
      try {
        // Send OTP via Twilio if configured, otherwise just log it
        await sendOtp(user.phone, otp);
        console.log(`🔐 OTP sent to ${user.phone}: ${otp}`);
        res.json({ message: 'OTP sent', phone: user.phone, role: user.role });
      } catch (err) {
        console.error('Failed to send OTP:', err);
        // Still return success with OTP for development
        console.log('Returning success response even though OTP sending failed (for development)');
        res.json({ message: 'OTP sent (mock)', phone: user.phone, role: user.role, mockOtp: otp });
      }
    } else {
      res.json({ 
        message: 'Login successful', 
        role: user.role,
        contractNumber: user.contractNumber || null
      });
    }
  } catch (error) {
    console.error('Unexpected login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP
app.post('/verify', (req, res) => {
  const { phone, otp } = req.body;
  console.log(`Verifying OTP: ${otp} for phone: ${phone}. Stored OTP is: ${otpMap[phone]}`);
  
  // Basic validation
  if (!phone || !otp) {
    console.log('Missing phone or OTP');
    return res.status(400).json({ message: 'Phone and OTP are required' });
  }

  // For development, accept any OTP for testing
  if (process.env.NODE_ENV !== 'production' && otp === '123456') {
    console.log('Development mode: Accepting test OTP code');
    if (phone in otpMap) delete otpMap[phone];
    return res.status(200).json({ message: 'OTP verified' });
  }
  
  if (otpMap[phone] === otp) {
    delete otpMap[phone];
    console.log('OTP verified successfully for:', phone);
    return res.status(200).json({ message: 'OTP verified' });
  } else {
    console.log('Invalid OTP for:', phone, 'Expected:', otpMap[phone], 'Got:', otp);
    return res.status(400).json({ message: 'Invalid OTP' });
  }
});

// Endpoint implementation for Twilio notification service
app.post('/notify', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    // Log the notification attempt
    await logSystemAction('Notification sent', 'system', { phone, messagePreview: message.substring(0, 50) });
    
    // Here's where you would call Twilio API
    // For demo, we'll just log the message
    console.log(`NOTIFICATION to ${phone}: ${message}`);
    
    // In production use:
    // await client.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phone
    // });
    
    res.json({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get system logs
app.get('/logs', async (req, res) => {
  try {
    // Optional query parameters for filtering
    const { user, action, from, to, limit = 100 } = req.query;
    
    const where = {};
    if (user) where.user = user;
    if (action) where.action = action;
    
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp[Op.gte] = new Date(from);
      if (to) where.timestamp[Op.lte] = new Date(to);
    }
    
    const logs = await SystemLog.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit)
    });
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// ORDER MANAGEMENT (for service change requests)
// ────────────────────────────────────────────────────────────
// Create a new order (e.g., for plan change or package activation)
app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [{ model: Line, attributes: ['user', 'msisdn'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

app.post('/orders', async (req, res) => {
  try {
    const { lineId, type, payload } = req.body;
    const line = await Line.findByPk(lineId);
    
    if (!line) {
      return res.status(404).json({ message: 'Line not found' });
    }
    
    const order = await Order.create({
      lineId,
      type,
      payload,
      status: 'pending',
      date: new Date()
    });
    
    // Log the order creation
    await logSystemAction('Order created', 'admin', { 
      lineId, 
      type, 
      orderId: order.id
    });
    
    // If it's a package activation, handle it immediately
    if (type === 'service_activation' && payload.packageId) {
      // In a real system, you might want to do this asynchronously
      order.status = 'completed';
      await order.save();
      
      // Log the immediate completion
      await logSystemAction('Order completed', 'system', { 
        orderId: order.id, 
        type,
        lineId
      });
      
      // Simulate activating the package
      // In real system, you would update the line's services
    }
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Order creation failed' });
  }
});

// Update order status (e.g., by admin or auto via webhook)
app.patch('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Expect status like 'Pending', 'Completed', etc.
    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.status = status;
    await order.save();
    // If status is 'Completed', potentially apply changes to Line or trigger alerts
    res.json({ message: 'Order status updated', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Update failed' });
  }
});

// ────────────────────────────────────────────────────────────
// CRUD FOR COMPANIES
// ────────────────────────────────────────────────────────────
app.post('/companies', async (req, res) => {
  try {
    const { name, contractNumber, monthlyBudget } = req.body;
    const company = await Company.create({ name, contractNumber, monthlyBudget });
    res.status(201).json(company);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Company creation failed' });
  }
});

app.get('/companies/:id', async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id, { include: [Line] });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json(company);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Fetch failed' });
  }
});

app.put('/companies/:id', async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const { name, contractNumber, monthlyBudget } = req.body;
    company.name = name || company.name;
    company.contractNumber = contractNumber || company.contractNumber;
    company.monthlyBudget = monthlyBudget || company.monthlyBudget;
    await company.save();
    res.json(company);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Update failed' });
  }
});

app.delete('/companies/:id', async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    await company.destroy();
    res.json({ message: 'Company deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Deletion failed' });
  }
});

// ────────────────────────────────────────────────────────────
// CRUD FOR LINES (with plan changes and package activation)
// ────────────────────────────────────────────────────────────

// Get all lines
app.get('/lines', async (req, res) => {
  try {
    const lines = await Line.findAll();
    res.json(lines);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch lines' });
  }
});

app.post('/lines', async (req, res) => {
  try {
    const { companyId, msisdn, user, role, planName, monthlyFee, includedData, includedMinutes, includedSMS, budgetLimit, status } = req.body;
    const line = await Line.create({ companyId, msisdn, user, role, planName, monthlyFee, includedData, includedMinutes, includedSMS, budgetLimit, status });
    res.status(201).json(line);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Line creation failed' });
  }
});

app.put('/lines/:id', async (req, res) => {
  try {
    const line = await Line.findByPk(req.params.id);
    if (!line) return res.status(404).json({ message: 'Line not found' });
    const { msisdn, user, role, planName, monthlyFee, includedData, includedMinutes, includedSMS, budgetLimit, status } = req.body;
    // Update fields for upsell/downsell or other changes
    line.msisdn = msisdn || line.msisdn;
    line.user = user || line.user;
    line.role = role || line.role;
    line.planName = planName || line.planName;
    line.monthlyFee = monthlyFee || line.monthlyFee;
    line.includedData = includedData || line.includedData;
    line.includedMinutes = includedMinutes || line.includedMinutes;
    line.includedSMS = includedSMS || line.includedSMS;
    line.budgetLimit = budgetLimit || line.budgetLimit;
    line.status = status || line.status;
    await line.save();
    // Trigger alert check after update
    const totals = await getCurrentUsage(line.id);
    maybeTriggerAlert(line, totals);
    res.json(line);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Line update failed' });
  }
});

app.delete('/lines/:id', async (req, res) => {
  try {
    const line = await Line.findByPk(req.params.id);
    if (!line) return res.status(404).json({ message: 'Line not found' });
    await line.destroy();
    res.json({ message: 'Line deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Deletion failed' });
  }
});

app.patch('/lines/bulk', async (req, res) => {
  try {
    const { updates } = req.body; // Array of { id, planName, monthlyFee, ... } objects
    const updatePromises = updates.map(update => {
      const { id, ...updateValues } = update;
      return Line.update(updateValues, { where: { id } });
    });
    
    await Promise.all(updatePromises);
    
    // Log the bulk update action
    await logSystemAction('Bulk line update', 'admin', { count: updates.length });
    
    res.json({ message: 'Bulk update successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// STUBBED AI ANALYTICS ENDPOINT
// This endpoint provides recommendations for a line's plan based on usage patterns
app.get('/analytics/:lineId/recommendations', async (req, res) => {
  try {
    const { lineId } = req.params;
    const line = await Line.findByPk(lineId, {
      include: [Usage]
    });
    
    if (!line) {
      return res.status(404).json({ message: 'Line not found' });
    }
    
    // Log analytics request
    await logSystemAction('Analytics requested', 'user', { lineId });
    
    // This is where you would run your ML model or analytics
    // For demo, we'll just return mock recommendations
    const recommendations = {
      optimalProfile: 'Based on your usage patterns, you might benefit from upgrading to Biz Plus',
      potentialSavings: 500,
      alternativePlans: ['Biz Plus', 'Biz Premium'],
      primaryAction: 'upgrade',
      insights: [
        'You regularly exceed your data limit',
        'You rarely use all your included minutes',
        'Your roaming usage is significant'
      ]
    };
    
    res.json(recommendations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete database seeding endpoint for development
app.post('/seed-complete-data', async (req, res) => {
  try {
    // 1. Create company if none exists
    const companyCount = await Company.count();
    let company;
    
    if (companyCount === 0) {
      company = await Company.create({
        name: 'Telekom Albania',
        contractNumber: 'CORP-2025-1001',
        monthlyBudget: 15000
      });
      console.log('Created demo company with ID:', company.id);
    } else {
      company = await Company.findOne();
    }
    
    // 2. Create lines if none exist
    const lineCount = await Line.count();
    let createdLines = [];
    
    if (lineCount === 0) {
      const demoLines = [
        {
          companyId: company.id,
          msisdn: '355671234567',
          user: 'John Smith',
          role: 'manager',
          planName: 'Biz Premium',
          monthlyFee: 5000,
          includedData: 20000,
          includedMinutes: 5000,
          includedSMS: 500,
          budgetLimit: 6000,
          status: 'active'
        },
        {
          companyId: company.id,
          msisdn: '355672345678',
          user: 'Maria Doe',
          role: 'employee',
          planName: 'Biz Plus',
          monthlyFee: 3000,
          includedData: 10000,
          includedMinutes: 2000,
          includedSMS: 200,
          budgetLimit: 3500,
          status: 'active'
        },
        {
          companyId: company.id,
          msisdn: '355673456789',
          user: 'Robert Brown',
          role: 'employee',
          planName: 'Biz Basic',
          monthlyFee: 2000,
          includedData: 5000,
          includedMinutes: 1000,
          includedSMS: 100,
          budgetLimit: 2500,
          status: 'active'
        }
      ];
      
      for (const lineData of demoLines) {
        const line = await Line.create(lineData);
        createdLines.push(line);
      }
      console.log(`Created ${createdLines.length} demo lines`);
    } else {
      createdLines = await Line.findAll();
    }
    
    // 3. Create usage data for each line
    const usageCount = await Usage.count();
    if (usageCount === 0) {
      const now = new Date();
      
      for (const line of createdLines) {
        // Create usage for current month
        await Usage.create({
          lineId: line.id,
          dataUsedMB: Math.floor(line.includedData * 0.7), // 70% usage
          callMinutes: Math.floor(line.includedMinutes * 0.6), // 60% usage
          smsCount: Math.floor(line.includedSMS * 0.5), // 50% usage
          createdAt: now
        });
        
        // Create usage for previous month
        const lastMonth = new Date(now);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        await Usage.create({
          lineId: line.id,
          dataUsedMB: Math.floor(line.includedData * 0.9), // 90% usage
          callMinutes: Math.floor(line.includedMinutes * 0.8), // 80% usage
          smsCount: Math.floor(line.includedSMS * 0.7), // 70% usage
          createdAt: lastMonth
        });
      }
      console.log('Created usage data for all lines');
    }
    
    // 4. Create orders
    const orderCount = await Order.count();
    if (orderCount === 0) {
      const orderTypes = ['plan_change', 'package_activation', 'budget_increase'];
      const orderStatuses = ['completed', 'pending', 'in_progress'];
      
      for (const line of createdLines) {
        const type = orderTypes[Math.floor(Math.random() * orderTypes.length)];
        const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
        
        let payload;
        if (type === 'plan_change') {
          payload = {
            previousPlan: 'Biz Basic',
            newPlan: 'Biz Plus',
            priceDifference: 1000
          };
        } else if (type === 'package_activation') {
          payload = {
            packageName: 'Roaming Bundle',
            price: 500,
            validity: '30 days'
          };
        } else {
          payload = {
            previousLimit: 2000,
            newLimit: 3000,
            reason: 'Business travel'
          };
        }
        
        await Order.create({
          lineId: line.id,
          type,
          status,
          payload,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
        });
      }
      console.log('Created demo orders');
    }
    
    // 5. Create system logs
    const logCount = await SystemLog.count();
    if (logCount === 0) {
      const actions = ['Login successful', 'Order created', 'Budget limit changed', 'Plan changed'];
      const users = ['admin', 'system', 'user'];
      
      for (let i = 0; i < 10; i++) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        const user = users[Math.floor(Math.random() * users.length)];
        
        await SystemLog.create({
          action,
          user,
          timestamp: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
          details: { source: 'demo seeding' }
        });
      }
      console.log('Created system logs');
    }
    
    res.json({
      message: 'Complete data seeding successful',
      companyCount: await Company.count(),
      lineCount: await Line.count(),
      usageCount: await Usage.count(),
      orderCount: await Order.count(),
      logCount: await SystemLog.count()
    });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ message: 'Data seeding failed', error: err.message });
  }
});

// Legacy endpoint for backward compatibility
app.post('/seed-demo-lines', async (req, res) => {
  try {
    return res.redirect(307, '/seed-complete-data');
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to seed demo lines.' });
  }
});

app.listen(3001, () => console.log('🚀 Backend running at http://localhost:3001'));