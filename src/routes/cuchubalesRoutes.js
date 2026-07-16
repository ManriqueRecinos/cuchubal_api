const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Obtener todos los cuchubales del admin autenticado
router.get('/', async (req, res) => {
  try {
    const cuchubales = await prisma.cuchubal.findMany({
      where: { admin_id: req.adminId },
      include: {
        _count: {
          select: { participantes: true }
        }
      },
      orderBy: { creado_en: 'desc' }
    });
    res.json(cuchubales);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cuchubales.' });
  }
});

// Crear un cuchubal
router.post('/', async (req, res) => {
  try {
    const { nombre, monto_cuota } = req.body;
    const cuchubal = await prisma.cuchubal.create({
      data: {
        nombre,
        monto_cuota: parseFloat(monto_cuota) || 20.00,
        admin_id: req.adminId,
      }
    });
    res.json(cuchubal);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear cuchubal.' });
  }
});

// Actualizar un cuchubal
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, monto_cuota, activo } = req.body;
    
    // Verificar propiedad
    const cuchubalExistente = await prisma.cuchubal.findFirst({
      where: { id: Number(id), admin_id: req.adminId }
    });

    if (!cuchubalExistente) {
      return res.status(404).json({ error: 'Cuchubal no encontrado.' });
    }

    const cuchubal = await prisma.cuchubal.update({
      where: { id: Number(id) },
      data: {
        nombre: nombre ?? cuchubalExistente.nombre,
        monto_cuota: monto_cuota ? parseFloat(monto_cuota) : cuchubalExistente.monto_cuota,
        activo: activo ?? cuchubalExistente.activo,
      }
    });
    res.json(cuchubal);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar cuchubal.' });
  }
});

module.exports = router;
