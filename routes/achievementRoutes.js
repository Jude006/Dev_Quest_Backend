// // backend/routes/achievementRoutes.js
// const express = require('express');
// const { protect } = require('../middleware/authMiddleware');
// const { getAchievements } = require('../controllers/achievementController');

// const router = express.Router();

// router.get('/', protect, getAchievements);

// module.exports = router;
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getAchievements, getUserAchievementsAndStats } = require('../controllers/achievementController');

const router = express.Router();

router.get('/', protect, getAchievements);
router.get('/stats', protect, getUserAchievementsAndStats);

module.exports = router;