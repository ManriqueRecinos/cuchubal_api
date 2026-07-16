const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Middleware para verificar que el cuchubal pertenece al admin
const verificarCuchubal = async (req, res, next) => {
  const cuchubal_id = Number(req.params.cuchubal_id || req.body.cuchubal_id);
  if (!cuchubal_id) return res.status(400).json({ error: 'cuchubal_id es requerido.' });

  const cuchubal = await prisma.cuchubal.findFirst({
    where: { id: cuchubal_id, admin_id: req.adminId }
  });

  if (!cuchubal) {
    return res.status(403).json({ error: 'No tienes acceso a este cuchubal.' });
  }
  next();
};

// Obtener participantes de un cuchubal
router.get('/cuchubal/:cuchubal_id', verificarCuchubal, async (req, res) => {
  try {
    const participantes = await prisma.participante.findMany({
      where: { cuchubal_id: Number(req.params.cuchubal_id) },
      orderBy: { id: 'asc' }
    });
    res.json(participantes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener participantes.' });
  }
});

// Agregar un participante
router.post('/', verificarCuchubal, async (req, res) => {
  try {
    const { nombre, cuchubal_id } = req.body;
    
    // Verificar que no exista ya alguien con el mismo nombre en este cuchubal
    const participanteExistente = await prisma.participante.findFirst({
      where: {
        cuchubal_id: Number(cuchubal_id),
        nombre: {
          equals: nombre,
          mode: 'insensitive'
        }
      }
    });

    if (participanteExistente) {
      return res.status(400).json({ error: 'Ya existe un participante con este nombre.' });
    }

    const participante = await prisma.participante.create({
      data: {
        nombre,
        cuchubal_id: Number(cuchubal_id),
      }
    });
    res.json(participante);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear participante.' });
  }
});

// Desactivar/Reactivar o Editar participante
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, activo } = req.body;
    
    const participanteExistente = await prisma.participante.findUnique({
      where: { id: Number(id) },
      include: { cuchubal: true }
    });

    if (!participanteExistente || participanteExistente.cuchubal.admin_id !== req.adminId) {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }

    const participante = await prisma.participante.update({
      where: { id: Number(id) },
      data: {
        nombre: nombre ?? participanteExistente.nombre,
        activo: activo ?? participanteExistente.activo,
      }
    });
    res.json(participante);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar participante.' });
  }
});

module.exports = router;
