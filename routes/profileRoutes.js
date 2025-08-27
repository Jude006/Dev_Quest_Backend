const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { 
  getProfile, 
  updateProfile, 
  updateAvatar,
  getStats 
} = require('../controllers/profilecontroller');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', protect, getProfile);
router.put('/', protect, updateProfile);
router.put('/avatar', protect, upload, updateAvatar);
router.get('/stats', protect, getStats);

module.exports = router; 