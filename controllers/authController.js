const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');
const sendEmail = require('../config/email');
const crypto = require('crypto');
const cloudinary = require('../config/cloudinary');

const generateResetCode = () => Math.floor(100000 + Math.random() * 900000);


exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const user = await User.create({
      name,
      email,
      password,
      role: 'user'
    });

    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      token,
      _id: user._id,
      id: user._id,   
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    });
  } catch (err) {
    next(err);
  }
};


exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ErrorResponse('Please provide an email and password', 400));
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        id: user._id,   // For compatibility
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile (including avatar upload)
// @route   PUT /api/auth/updateprofile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    // Update fields if provided
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;

    // Handle avatar upload if file is provided
    if (req.file) {
      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'avatars', // Optional: organize in folder
            allowed_formats: ['jpg', 'png', 'jpeg'],
            transformation: [{ width: 500, height: 500, crop: 'limit' }] // Optional: resize
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      // Update avatar with Cloudinary secure URL
      user.avatar = result.secure_url;
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Profile update error:', err);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Forgot password - Send 6-digit reset code
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(200).json({ 
        success: true, 
        message: 'If this email exists, a reset code has been sent' 
      });
    }

    // Generate 6-digit code
    const resetCode = generateResetCode();
    
    // Hash and save the code
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetCode.toString())
      .digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    // Save with error handling
    try {
      await user.save({ validateBeforeSave: false });
    } catch (saveError) {
      console.error('Failed to save user:', saveError);
      throw new Error('Failed to save reset token');
    }

    // Send email with code
    const message = `Your password reset code is: ${resetCode}\n\nThis code will expire in 10 minutes.`;

    await sendEmail({
      email: user.email,
      subject: 'Password Reset Code',
      message
    });

    res.status(200).json({ 
      success: true, 
      message: 'Reset code sent to email',
      email: user.email
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    next(error);
  }
};

// @desc    Reset password with 6-digit code
// @route   PUT /api/auth/resetpassword
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, code, password } = req.body;

    // Validate input
    if (!email || !code || !password) {
      return next(new ErrorResponse('Please provide email, code and new password', 400));
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.toString().trim();
    
    if (cleanCode.length !== 6 || isNaN(cleanCode)) {
      return next(new ErrorResponse('Code must be 6 digits', 400));
    }

    const hashedCode = crypto
      .createHash('sha256')
      .update(cleanCode)
      .digest('hex');

    const user = await User.findOne({
      email: cleanEmail,
      resetPasswordToken: hashedCode,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return next(new ErrorResponse('Invalid or expired code', 400));
    }

    // Update password and clear reset fields
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Reset password error:', error);
    next(error);
  }
};

// Helper: Send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  
  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
};