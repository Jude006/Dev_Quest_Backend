const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');

// @desc    Get user profile
// @route   GET /api/profile
// @access  Private
// In your profileController.js
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    // Return the user object directly, not nested in data property
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    // ... your update logic
    
    // Return the updated user directly
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile
// @route   PUT /api/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email, bio, username, techStack, learningGoals } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return next(new ErrorResponse('Email already taken', 400));
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (bio) user.bio = bio;
    if (username) user.username = username;
    if (techStack) user.techStack = techStack;
    if (learningGoals) user.learningGoals = learningGoals;

    await user.save();

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

exports.updateAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    if (!req.file) {
      return next(new ErrorResponse('Please upload an image', 400));
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'avatars',
          allowed_formats: ['jpg', 'png', 'jpeg'],
          transformation: [{ width: 300, height: 300, crop: 'fill' }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    // Update avatar
    user.avatar = result.secure_url;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error('Update avatar error:', err);
    if (err.message.includes('Only images are allowed')) {
      return next(new ErrorResponse('Only images are allowed (jpg, jpeg, png)', 400));
    }
    if (err.message.includes('File too large')) {
      return next(new ErrorResponse('File size exceeds 10MB limit', 400));
    }
    next(new ErrorResponse('Failed to update avatar', 500));
  }
};


// @desc    Get user stats
// @route   GET /api/profile/stats
// @access  Private
exports.getStats = async (req, res, next) => {
  try {
    // This would typically come from your gamification system
    // For now, we'll return mock data - you'll want to implement this properly
    const stats = {
      level: 27,
      xp: 8450,
      streak: 42,
      rank: '#124',
      tasksCompleted: 156,
      hoursCoded: 287,
      achievements: 8
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
};