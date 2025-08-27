const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  avatar: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false,
  },
  favorites: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Attraction',
  }],
  notifications: [{
    type: {
      type: String,
      enum: ['review', 'system', 'update'],
      required: true,
    },
    message: String,
    data: mongoose.Schema.Types.Mixed,
    read: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  bio: {
    type: String,
    maxlength: 500,
  },
  techStack: [{
    type: String,
  }],
  learningGoals: [{
    type: String,
  }],
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Added for Dev Quest
  xp: {
    type: Number,
    default: 0,
  },
  streak: {
    type: Number,
    default: 0,
  },
  lastTaskCompletion: {
    type: Date,
  },
  totalHoursCoded: {
    type: Number,
    default: 0,
  },
  achievements: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Achievement',
  }],
  challenges: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Challenge',
  }],
  avatarItems: [{
    type: String, // e.g., 'hacker_hat'
  }],
  coins: {
    type: Number,
    default: 0,
  },
  tasksCompleted: {
    type: Number,
    default: 0, 
  },
  lastChallengeCompletion: {
    type: Date,
  },
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

UserSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.getResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

module.exports = mongoose.model('User', UserSchema);