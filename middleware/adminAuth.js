const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.isAdmin) {
      return res.status(403).json({ message: 'Нет доступа' });
    }
    
    req.userData = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Auth failed' });
  }
};