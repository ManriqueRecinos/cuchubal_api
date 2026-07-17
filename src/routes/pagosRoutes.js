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
    const { participante_id, cuchubal_id, mes, anio, quincena, monto, fecha_pago, nota } = req.body;

    const pago = await prisma.pago.create({
      data: {
        participante_id: Number(participante_id),
        cuchubal_id: Number(cuchubal_id),
        mes: Number(mes),
        anio: Number(anio),
        quincena,
        monto: parseFloat(monto),
        fecha_pago: new Date(fecha_pago || Date.now()),
        nota: nota || null,
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

// Reporte de pagos del mes en formato WhatsApp (copiar y pegar)
router.get('/reporte/whatsapp/:cuchubal_id', verificarCuchubal, async (req, res) => {
  try {
    const cuchubal_id = Number(req.params.cuchubal_id);
    const fechaActual = new Date();
    const mes = req.query.mes ? Number(req.query.mes) : fechaActual.getMonth() + 1;
    const anio = req.query.anio ? Number(req.query.anio) : fechaActual.getFullYear();

    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    const cuchubal = await prisma.cuchubal.findUnique({
      where: { id: cuchubal_id },
      select: { nombre: true, monto_cuota: true }
    });

    // Participantes activos del cuchubal
    const participantes = await prisma.participante.findMany({
      where: { cuchubal_id, activo: true },
      orderBy: { nombre: 'asc' }
    });

    // Pagos del mes/año indicado
    const pagos = await prisma.pago.findMany({
      where: { cuchubal_id, mes, anio },
      include: { participante: { select: { nombre: true } } },
      orderBy: { participante: { nombre: 'asc' } }
    });

    // Sumar montos por participante
    const pagosPorParticipante = new Map();
    for (const p of pagos) {
      const actual = pagosPorParticipante.get(p.participante_id) || { nombre: p.participante.nombre, total: 0, detalles: [] };
      actual.total += parseFloat(p.monto);
      actual.detalles.push({ quincena: p.quincena, monto: parseFloat(p.monto) });
      pagosPorParticipante.set(p.participante_id, actual);
    }

    const cuota = parseFloat(cuchubal.monto_cuota);
    const pagaron = [];
    const pendientes = [];

    for (const part of participantes) {
      const info = pagosPorParticipante.get(part.id);
      if (info && info.total > 0) {
        pagaron.push({ ...part, total: info.total, detalles: info.detalles });
      } else {
        pendientes.push(part);
      }
    }

    const totalRecaudado = pagaron.reduce((s, p) => s + p.total, 0);
    const totalEsperado = participantes.length * cuota;
    const totalPendiente = Math.max(totalEsperado - totalRecaudado, 0);

    // Construir mensaje WhatsApp
    let msg = `*CUCHUBAL "${cuchubal.nombre}"*\n`;
    msg += `Reporte de pagos - ${meses[mes - 1]} ${anio}\n`;
    msg += `Cuota mensual: $${cuota.toFixed(2)}\n\n`;

    msg += `*✅ Han pagado (${pagaron.length}/${participantes.length})*\n`;
    if (pagaron.length === 0) {
      msg += `_Nadie ha pagado aún._\n`;
    } else {
      pagaron.forEach((p, i) => {
        const quincenas = p.detalles.map(d => d.quincena).join(', ');
        msg += `${i + 1}. ${p.nombre} - $${p.total.toFixed(2)} (quincena${p.detalles.length > 1 ? 's' : ''}: ${quincenas}) ✓\n`;
      });
    }

    msg += `\n*❌ Pendientes (${pendientes.length})*\n`;
    if (pendientes.length === 0) {
      msg += `_¡Todos han pagado! 🎉_\n`;
    } else {
      pendientes.forEach((p, i) => {
        msg += `${i + 1}. ${p.nombre}\n`;
      });
    }

    msg += `\n*Resumen:*\n`;
    msg += `Recaudado: $${totalRecaudado.toFixed(2)}\n`;
    msg += `Esperado: $${totalEsperado.toFixed(2)}\n`;
    msg += `Pendiente: $${totalPendiente.toFixed(2)}\n`;

    res.json({
      mensaje: msg,
      resumen: {
        mes,
        anio,
        mes_nombre: meses[mes - 1],
        cuchubal: cuchubal.nombre,
        cuota,
        total_participantes: participantes.length,
        total_pagaron: pagaron.length,
        total_pendientes: pendientes.length,
        total_recaudado: totalRecaudado,
        total_esperado: totalEsperado,
        total_pendiente: totalPendiente,
      },
      pagaron,
      pendientes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar el reporte.' });
  }
});

// Registrar pago dividido automáticamente (15 y 30)
router.post('/dividido', verificarCuchubal, async (req, res) => {
  try {
    const { participante_id, cuchubal_id, mes, anio, montoTotal, fecha_pago, nota } = req.body;
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
        nota: nota || null,
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
        nota: nota || null,
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
