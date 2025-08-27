const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getTasks, getTask, createTask, updateTask, deleteTask, completeTask } = require('../controllers/taskController');

const router = express.Router();

router.get('/', protect, getTasks);
router.get('/:id', protect, getTask);
router.post('/', protect, createTask);
router.put('/:id', protect, updateTask);
router.delete('/:id', protect, deleteTask);
router.put('/:id/complete', protect, completeTask);

module.exports = router;