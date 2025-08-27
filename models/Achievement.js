// backend/models/Achievement.js
const mongoose = require('mongoose');

const AchievementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: 'default-badge.jpg',
  },
  criteria: {
    type: String,
  },
  unlockedAt: {
    type: Date,
    default: Date.now,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
});

module.exports = mongoose.model('Achievement', AchievementSchema);