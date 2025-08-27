const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
  },
  estimatedTime: {
    type: Number, // in minutes
    required: true,
  },
  actualTime: {
    type: Number, // in minutes, reported on completion
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending',
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  completedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  learned: {
    type: Boolean,
    default: false, 
  },
});

module.exports = mongoose.model('Task', TaskSchema);