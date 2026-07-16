const WebSocket = require('ws');

let wss = null;

const initWebSocket = (server) => {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    // Se puede extraer el cuchubal_id de la URL, ej: ws://localhost:3001/?cuchubal_id=1
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const cuchubal_id = urlParams.get('cuchubal_id');
    
    if (cuchubal_id) {
      ws.cuchubal_id = Number(cuchubal_id);
    }

    ws.on('message', (message) => {
      // Manejar mensajes si es necesario
    });

    ws.on('close', () => {
      // Cliente desconectado
    });
  });

  return wss;
};

const getWss = () => {
  return wss;
};

module.exports = {
  initWebSocket,
  getWss
};
