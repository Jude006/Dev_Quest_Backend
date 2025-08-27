const mongoose = require('mongoose');

const ChallengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  xpBonus: {
    type: Number,
    default: 50,
  },
  type: {
    type: String, // e.g., 'daily_code', 'github_share'
  },
  completed: {
    type: Boolean,
    default: false,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Challenge', ChallengeSchema);