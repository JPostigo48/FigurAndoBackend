// middleware/auth.js
const jwt      = require('jsonwebtoken');
const Usuario  = require('../models/usuario.model');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async function auth(req, res, next) {
  try {
    // 1. Obtener el header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // 2. Extraer el token
    const token = authHeader.split(' ')[1];

    // 3. Verificar el token
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // 4. Buscar al usuario en la BD (sin incluir la contraseña)
    const user = await Usuario.findById(payload.id).select('-contra');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // 5. Inyectar el usuario en la petición y continuar
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ error: 'Authentication failed' });
  }
};
