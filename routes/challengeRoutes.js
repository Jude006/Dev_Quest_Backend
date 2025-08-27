const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getDailyChallenge, completeChallenge } = require('../controllers/challengeController');

const router = express.Router();

router.get('/daily', protect, getDailyChallenge);
router.put('/:id/complete', protect, completeChallenge);

module.exports = router;