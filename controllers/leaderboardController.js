// backend/controllers/leaderboardController.js
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// @desc    Get leaderboard with timeframe filtering
// @route   GET /api/leaderboard
// @access  Private
exports.getLeaderboard = async (req, res, next) => {
  try {
    const { timeframe = 'all-time' } = req.query;
    const userId = req.user.id;

    // Base query
    let query = User.find().select('name xp streak tasksCompleted totalHoursCoded avatar');

    // Apply timeframe filtering (you'll need to add these fields to your User model)
    if (timeframe === 'weekly') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      query = query.where('lastActivity').gte(oneWeekAgo);
    } else if (timeframe === 'monthly') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      query = query.where('lastActivity').gte(oneMonthAgo);
    }

    const users = await query.sort({ xp: -1 }).limit(20).lean();

    // Find current user's rank
    let userRank = null;
    const userIndex = users.findIndex(user => user._id.toString() === userId);
    if (userIndex !== -1) {
      userRank = {
        ...users[userIndex],
        rank: userIndex + 1
      };
    } else {
      // If user isn't in top 20, get their rank separately
      const user = await User.findById(userId).select('name xp streak tasksCompleted totalHoursCoded avatar');
      if (user) {
        const usersAbove = await User.countDocuments({ xp: { $gt: user.xp } });
        userRank = {
          ...user.toObject(),
          rank: usersAbove + 1
        };
      }
    }

    // Mark current user in the leaderboard
    const leaderboard = users.map((user, index) => ({
      ...user,
      rank: index + 1,
      isCurrentUser: user._id.toString() === userId
    }));

    res.status(200).json({
      success: true,
      data: {
        leaderboard,
        userRank,
        timeframe
      }
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    next(new ErrorResponse('Failed to fetch leaderboard', 500));
  }
};

// @desc    Get friends leaderboard
// @route   GET /api/leaderboard/friends
// @access  Private
exports.getFriendsLeaderboard = async (req, res, next) => {
  try {
    // This would require a friends system implementation
    // For now, return regular leaderboard as fallback
    return exports.getLeaderboard(req, res, next);
  } catch (err) {
    next(new ErrorResponse('Failed to fetch friends leaderboard', 500));
  }
};