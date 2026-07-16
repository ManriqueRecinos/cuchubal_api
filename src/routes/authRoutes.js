const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin || !admin.activo) {
      return res.status(401).json({ error: 'Credenciales inválidas o cuenta inactiva.' });
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const token = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      admin: {
        id: admin.id,
        nombre: admin.nombre,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
