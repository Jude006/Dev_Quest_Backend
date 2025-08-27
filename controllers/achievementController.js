// backend/controllers/achievementController.js
const Achievement = require('../models/Achievement');
const User = require('../models/User');
const Task = require('../models/Task');
const ErrorResponse = require('../utils/errorResponse');

// Get user stats and achievements
exports.getUserAchievementsAndStats = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('xp streak coins totalHoursCoded tasksCompleted lastTaskCompletion');
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    const achievements = await Achievement.find({ user: req.user.id }).sort({ unlockedAt: -1 });
    const completedTasksCount = user.tasksCompleted || 0;

    // Define all possible achievements with their criteria
    const allAchievements = [
      { 
        criteria: 'first_task', 
        name: 'First Quest', 
        description: 'Completed your first task', 
        icon: 'first-badge.jpg',
        check: (user, completedCount) => completedCount >= 1
      },
      { 
        criteria: 'three_tasks', 
        name: 'Task Trifecta', 
        description: 'Completed 3 tasks', 
        icon: 'trifecta-badge.jpg',
        check: (user, completedCount) => completedCount >= 3
      },
      { 
        criteria: 'streak_3', 
        name: '3-Day Sprinter', 
        description: 'Achieved a 3-day streak', 
        icon: 'streak-3-badge.jpg',
        check: (user) => user.streak >= 3
      },
      { 
        criteria: 'streak_7', 
        name: 'Streak Starter', 
        description: 'Achieved a 7-day streak', 
        icon: 'streak-badge.jpg',
        check: (user) => user.streak >= 7
      },
      { 
        criteria: 'streak_14', 
        name: 'Streak Master', 
        description: 'Achieved a 14-day streak', 
        icon: 'streak-14-badge.jpg',
        check: (user) => user.streak >= 14
      },
      { 
        criteria: 'xp_500', 
        name: 'XP Novice', 
        description: 'Earned 500 XP', 
        icon: 'xp-badge.jpg',
        check: (user) => user.xp >= 500
      },
      { 
        criteria: 'xp_1000', 
        name: 'XP Adept', 
        description: 'Earned 1000 XP', 
        icon: 'xp-adept-badge.jpg',
        check: (user) => user.xp >= 1000
      },
      { 
        criteria: 'hours_10', 
        name: 'Code Marathoner', 
        description: 'Coded for 10 hours', 
        icon: 'hours-badge.jpg',
        check: (user) => user.totalHoursCoded >= 10
      }
    ];

    const achievementStatus = allAchievements.map(ach => {
      const unlockedAchievement = achievements.find(a => a.criteria === ach.criteria);
      const isUnlocked = unlockedAchievement !== undefined;
      
      let progress = '';
      let current = 0;
      let total = 0;

      if (ach.criteria === 'first_task') {
        current = completedTasksCount;
        total = 1;
        progress = `${current}/${total}`;
      } else if (ach.criteria === 'three_tasks') {
        current = completedTasksCount;
        total = 3;
        progress = `${current}/${total}`;
      } else if (ach.criteria.includes('streak_')) {
        const target = parseInt(ach.criteria.split('_')[1]);
        current = user.streak;
        total = target;
        progress = `${current}/${total}`;
      } else if (ach.criteria.includes('xp_')) {
        const target = parseInt(ach.criteria.split('_')[1]);
        current = user.xp;
        total = target;
        progress = `${current}/${total}`;
      } else if (ach.criteria === 'hours_10') {
        current = user.totalHoursCoded;
        total = 10;
        progress = `${current.toFixed(1)}/${total}`;
      }

      return {
        ...ach,
        unlocked: isUnlocked,
        unlockedAt: unlockedAchievement ? unlockedAchievement.unlockedAt : null,
        progress: isUnlocked ? 'Completed' : progress,
        current,
        total
      };
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          xp: user.xp,
          streak: user.streak,
          coins: user.coins,
          totalHoursCoded: user.totalHoursCoded,
          tasksCompleted: user.tasksCompleted
        },
        achievements: achievementStatus
      }
    });
  } catch (err) {
    console.error('Error in getUserAchievementsAndStats:', err);
    next(new ErrorResponse('Failed to fetch achievements and stats', 500));
  }
};

// Unlock achievement
exports.unlockAchievement = async (userId, achievementData) => {
  try {
    const existing = await Achievement.findOne({ user: userId, criteria: achievementData.criteria });
    if (existing) {
      return existing;
    }

    const achievement = await Achievement.create({
      ...achievementData,
      user: userId,
    });

    const user = await User.findById(userId);
    if (user) {
      user.achievements.push(achievement._id);
      await user.save();
    }

    global.io.to(userId.toString()).emit('achievementUnlocked', achievement);
    global.io.to(userId.toString()).emit('statsUpdated', {
      xp: user.xp,
      streak: user.streak,
      coins: user.coins,
      totalHoursCoded: user.totalHoursCoded,
      tasksCompleted: user.tasksCompleted
    });

    return achievement;
  } catch (err) {
    console.error('Error unlocking achievement:', err);
    return null;
  }
};

// Check and unlock achievements
exports.checkAndUnlockAchievements = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const achievements = await Achievement.find({ user: userId });
    const completedTasksCount = user.tasksCompleted || 0;

    const achievementDefinitions = [
      { criteria: 'first_task', check: () => completedTasksCount >= 1 },
      { criteria: 'three_tasks', check: () => completedTasksCount >= 3 },
      { criteria: 'streak_3', check: () => user.streak >= 3 },
      { criteria: 'streak_7', check: () => user.streak >= 7 },
      { criteria: 'streak_14', check: () => user.streak >= 14 },
      { criteria: 'xp_500', check: () => user.xp >= 500 },
      { criteria: 'xp_1000', check: () => user.xp >= 1000 },
      { criteria: 'hours_10', check: () => user.totalHoursCoded >= 10 }
    ];

    for (const definition of achievementDefinitions) {
      const alreadyUnlocked = achievements.some(a => a.criteria === definition.criteria);
      if (!alreadyUnlocked && definition.check()) {
        const achievementData = {
          criteria: definition.criteria,
          name: definition.criteria.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          description: `Achieved ${definition.criteria.replace('_', ' ')}`,
          icon: `${definition.criteria}-badge.jpg`
        };
        
        await exports.unlockAchievement(userId, achievementData);
      }
    }
  } catch (err) {
    console.error('Error in checkAndUnlockAchievements:', err);
  }
};

exports.getAchievements = async (req, res, next) => {
  try {
    const achievements = await Achievement.find({ user: req.user.id }).sort({ unlockedAt: -1 });
    res.status(200).json({ success: true, data: achievements });
  } catch (err) {
    next(new ErrorResponse('Failed to fetch achievements', 500));
  }
};