const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authRequired, requireRoles } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { logAudit } = require('../utils/audit');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role, station: user.station },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/v1/auth/login
router.post('/login', validate(schemas.login), async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const user = await User.findOne({ $or: [{ username }, { email: username }] });
  if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await user.comparePassword(password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken(user);
  logAudit({ user: { id: user._id, username: user.username, role: user.role } }, 'login', 'User', user._id, { details: 'login success' });
  res.json({
    token,
    user: { id: user._id, username: user.username, fullName: user.fullName, role: user.role, station: user.station }
  });
});

// GET /api/v1/auth/me
router.get('/me', authRequired, async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// GET /api/v1/auth/users (directory of active polar personnel & officers)
router.get('/users', authRequired, async (req, res) => {
  res.json(await User.find({ isActive: true }).select('-passwordHash').sort({ createdAt: -1 }).limit(200));
});

// PATCH /api/v1/auth/users/:id (SuperAdmin only) — manage roles/status
router.patch('/users/:id', authRequired, requireRoles('SuperAdmin'), async (req, res) => {
  const { role, isActive, station, fullName } = req.body || {};
  const update = {};
  if (role) update.role = role;
  if (isActive !== undefined) update.isActive = isActive;
  if (station) update.station = station;
  if (fullName) update.fullName = fullName;
  try {
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// POST /api/v1/auth/register (SuperAdmin only)
router.post('/register', authRequired, requireRoles('SuperAdmin'), validate(schemas.register), async (req, res) => {
  const { username, email, password, fullName, role, station, bloodGroup, emergencyContact } = req.body || {};
  if (!username || !email || !password || !fullName || !role) {
    return res.status(400).json({ error: 'username, email, password, fullName, role required' });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const user = await User.create({
      username, email, passwordHash, fullName, role, station, bloodGroup, emergencyContact
    });
    res.status(201).json({ id: user._id, username: user.username, role: user.role });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /api/v1/auth/password — self-service password change.
// Requires the current password so a stolen session alone is not enough.
router.patch('/password', authRequired, validate(schemas.passwordChange), async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const ok = await user.comparePassword(req.body.currentPassword);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
  user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  await user.save();
  logAudit(req, 'update', 'User', user._id, { details: 'password changed' });
  res.json({ changed: true });
});

// Bootstrap endpoint (only works when DB has zero users) — for first setup & tests
router.post('/bootstrap', async (req, res) => {
  const count = await User.countDocuments();
  if (count > 0) return res.status(403).json({ error: 'Already initialized' });
  const { username, email, password, fullName } = req.body || {};
  if (!username || !email || !password) return res.status(400).json({ error: 'username, email, password required' });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    username, email, passwordHash, fullName: fullName || 'Super Admin', role: 'SuperAdmin', station: 'Headquarters_Goa'
  });
  res.status(201).json({ token: signToken(user), user: { id: user._id, username: user.username, role: user.role } });
});

module.exports = router;
