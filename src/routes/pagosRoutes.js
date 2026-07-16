const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/authMiddleware');
const { getWss } = require('../websocket');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Verificar propiedad del cuchubal
const verificarCuchubal = async (req, res, next) => {
  const cuchubal_id = Number(req.params.cuchubal_id || req.query.cuchubal_id || req.body.cuchubal_id);
  if (!cuchubal_id) return res.status(400).json({ error: 'cuchubal_id es requerido.' });

  const cuchubal = await prisma.cuchubal.findFirst({
    where: { id: cuchubal_id, admin_id: req.adminId }
  });

  if (!cuchubal) {
    return res.status(403).json({ error: 'No tienes acceso a este cuchubal.' });
  }
  next();
};

// Obtener pagos de un cuchubal (opcional: filtrar por mes/anio)
router.get('/cuchubal/:cuchubal_id', verificarCuchubal, async (req, res) => {
  try {
    const { mes, anio } = req.query;
    
    let whereClause = {
      cuchubal_id: Number(req.params.cuchubal_id),
    };
    
    if (mes) whereClause.mes = Number(mes);
    if (anio) whereClause.anio = Number(anio);

    const pagos = await prisma.pago.findMany({
      where: whereClause,
      include: {
        participante: { select: { nombre: true, id: true } }
      },
      orderBy: { fecha_pago: 'desc' }
    });
    res.json(pagos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pagos.' });
  }
});

// Registrar un nuevo pago
router.post('/', verificarCuchubal, async (req, res) => {
  try {
    const { participante_id, cuchubal_id, mes, anio, quincena, monto, fecha_pago } = req.body;

    const pago = await prisma.pago.create({
      data: {
        participante_id: Number(participante_id),
        cuchubal_id: Number(cuchubal_id),
        mes: Number(mes),
        anio: Number(anio),
        quincena,
        monto: parseFloat(monto),
        fecha_pago: new Date(fecha_pago || Date.now()),
        registrado_por: req.adminId,
      },
      include: {
        participante: { select: { nombre: true } }
      }
    });

    // Notificar por WebSocket a los clientes de este cuchubal
    const wss = getWss();
    if (wss) {
      wss.clients.forEach(client => {
        // Se asume que en el frontend se maneja a qué cuchubal está conectado,
        // o se envían todos los eventos del cuchubal
        if (client.readyState === 1 && client.cuchubal_id === Number(cuchubal_id)) {
          client.send(JSON.stringify({ type: 'NUEVO_PAGO', payload: pago }));
        }
      });
    }

    res.json(pago);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar pago.' });
  }
});

// Registrar pago dividido automáticamente (15 y 30)
router.post('/dividido', verificarCuchubal, async (req, res) => {
  try {
    const { participante_id, cuchubal_id, mes, anio, montoTotal, fecha_pago } = req.body;
    const mitad = parseFloat(montoTotal) / 2;
    const fecha = new Date(fecha_pago || Date.now());

    const pago15 = await prisma.pago.create({
      data: {
        participante_id: Number(participante_id),
        cuchubal_id: Number(cuchubal_id),
        mes: Number(mes),
        anio: Number(anio),
        quincena: '15',
        monto: mitad,
        fecha_pago: fecha,
        registrado_por: req.adminId,
      },
      include: { participante: { select: { nombre: true } } }
    });

    const pago30 = await prisma.pago.create({
      data: {
        participante_id: Number(participante_id),
        cuchubal_id: Number(cuchubal_id),
        mes: Number(mes),
        anio: Number(anio),
        quincena: '30',
        monto: mitad,
        fecha_pago: fecha,
        registrado_por: req.adminId,
      },
      include: { participante: { select: { nombre: true } } }
    });

    const wss = getWss();
    if (wss) {
      wss.clients.forEach(client => {
        if (client.readyState === 1 && client.cuchubal_id === Number(cuchubal_id)) {
          client.send(JSON.stringify({ type: 'NUEVO_PAGO', payload: pago15 }));
          client.send(JSON.stringify({ type: 'NUEVO_PAGO', payload: pago30 }));
        }
      });
    }

    res.json({ pago15, pago30 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar pago dividido.' });
  }
});

module.exports = router;
