const express = require('express');
const { generateLearningResources } = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/resources/:taskId').get(protect, generateLearningResources);

module.exports = router;