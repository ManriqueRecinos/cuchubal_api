require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');

const { initWebSocket } = require('./websocket');
const authRoutes = require('./routes/authRoutes');
const cuchubalesRoutes = require('./routes/cuchubalesRoutes');
const participantesRoutes = require('./routes/participantesRoutes');
const pagosRoutes = require('./routes/pagosRoutes');

const app = express();
const server = http.createServer(app);

// Inicializar WebSockets
initWebSocket(server);

// Middlewares
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://cuchubalfrontend-production.up.railway.app',
    'https://cuchubalfrontend-development.up.railway.app'
  ],
  credentials: true
}));
app.use(express.json());

// Rutas de prueba (Health check)
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API de Cuchubales en línea y funcionando correctamente 🚀' });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/cuchubales', cuchubalesRoutes);
app.use('/api/participantes', participantesRoutes);
app.use('/api/pagos', pagosRoutes);

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en 0.0.0.0:${PORT}`);
});
