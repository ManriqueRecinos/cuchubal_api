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
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/cuchubales', cuchubalesRoutes);
app.use('/api/participantes', participantesRoutes);
app.use('/api/pagos', pagosRoutes);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
