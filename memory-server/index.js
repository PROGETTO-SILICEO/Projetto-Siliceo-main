require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const prisma = require('./services/db');

// Services & Daemons
const MemoryDaemon = require('./services/memoryDaemon');
const memoryDaemon = new MemoryDaemon();

// Routers
const agentsRouter = require('./routes/agents');
const dreamsRouter = require('./routes/dreams');
const convRouter = require('./routes/conversations');
const memoryRouter = require('./routes/memory');
const graphRouter = require('./routes/graph');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_PATH = path.join(__dirname, 'public');
const runtimeConfig = {
    CANDLE_MODEL: process.env.CANDLE_MODEL || 'qwen3:0.6b',
    ENVIRONMENT: 'SQL-Pure'
};

// ========================================
// SECURITY & MIDDLEWARE
// ========================================
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.match(/100\.[\d.]+/)) {
            return callback(null, true);
        }
        callback(new Error('CORS: Accesso non autorizzato'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static(PUBLIC_PATH));

// Security Headers & IP Filter
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next();
    const ip = req.ip || req.connection.remoteAddress || '';
    const clientIP = req.headers['x-forwarded-for'] || ip;
    const isLocal = clientIP.includes('127.0.0.1') || clientIP.includes('::1') || clientIP.includes('::ffff:127.0.0.1');
    const isTailscale = clientIP.match(/100\.\d+\.\d+\.\d+/);

    if (isLocal || isTailscale) return next();
    res.status(403).json({ error: 'Accesso non autorizzato' });
});

// ========================================
// ROUTES MOUNTING
// ========================================
app.use('/api/agents', agentsRouter);
app.use('/api/dreams', dreamsRouter);
app.use('/api/conversations', convRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/graph', graphRouter);

// System Routes
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        server: 'Siliceo Memory Server',
        version: '3.1.4',
        engine: 'SQL-Pure',
        timestamp: new Date().toISOString(),
        daemon: memoryDaemon.isRunning ? 'active' : 'inactive'
    });
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(PUBLIC_PATH, 'index.html'));
});

app.get('/api/config', (req, res) => {
    res.json(runtimeConfig);
});

app.put('/api/config', (req, res) => {
    Object.assign(runtimeConfig, req.body || {});
    res.json({ success: true, config: runtimeConfig });
});

// ========================================
// STARTUP
// ========================================
async function start() {
    try {
        await prisma.$connect();
        console.log('✅ Connected to SQLite via Prisma');
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Memory Server v3.1.4 in ascolto su porta ${PORT}`);
            
            // Avvio Daemon Memoria
            memoryDaemon.start();
            console.log('🕯️ Memory Daemon avviato');
        });
    } catch (e) {
        console.error('❌ Startup failed:', e);
        process.exit(1);
    }
}

start();
