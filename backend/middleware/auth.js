const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'studyforge_secret_key_jwt_2026_authentication';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access forbidden. Admin role required.' });
  }
  next();
};

const teacherMiddleware = (req, res, next) => {
  if (!req.user || (req.user.role !== 'TEACHER' && req.user.role !== 'ADMIN')) {
    return res.status(403).json({ error: 'Access forbidden. Teacher or Admin role required.' });
  }
  next();
};

const studentMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'STUDENT') {
    return res.status(403).json({ error: 'Access forbidden. Student role required.' });
  }
  next();
};

module.exports = { 
  authMiddleware, 
  adminMiddleware, 
  teacherMiddleware, 
  studentMiddleware 
};
