// backend/routes/leaderboardRoutes.js
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getLeaderboard, getFriendsLeaderboard } = require('../controllers/leaderboardController');

const router = express.Router();

router.get('/', protect, getLeaderboard);
router.get('/friends', protect, getFriendsLeaderboard);

module.exports = router;