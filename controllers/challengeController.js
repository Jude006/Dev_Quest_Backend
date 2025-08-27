const ErrorResponse = require('../utils/errorResponse');
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const axios = require('axios');

// Generate AI-based challenge using xAI Grok API
const generateAIChallenge = async (user) => {
  const techStack = user.techStack.length > 0 ? user.techStack : ['General'];
  const learningGoals = user.learningGoals.length > 0 ? user.learningGoals : ['Learn to code'];
  const prompt = `
    Create a coding challenge for a developer with the following profile:
    - Tech Stack: ${techStack.join(', ')}
    - Learning Goals: ${learningGoals.join(', ')}
    The challenge should be:
    - Suitable for a daily task (30-60 minutes)
    - Focused on coding or learning a specific skill
    - Include a title (short, catchy), description (clear, 1-2 sentences), and XP bonus (50-100 based on difficulty)
    Return the response in JSON format: 
    {
      "title": "Challenge Title",
      "description": "Challenge description",
      "xpBonus": 50,
      "type": "daily_code"
    }
  `;

  try {
    const response = await axios.post('https://api.x.ai/v1/grok', {
      prompt,
      max_tokens: 200,
      temperature: 0.7,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const challengeData = JSON.parse(response.data.choices[0].text);
    console.log(`AI-generated challenge for user ${user._id}:`, challengeData);
    return challengeData;
  } catch (err) {
    console.error('Error generating AI challenge:', err.response?.data || err.message);
    // Fallback to a default challenge if AI fails
    return {
      title: `Code in ${techStack[0]}`,
      description: `Write a small program in ${techStack[0]} to practice your skills.`,
      xpBonus: 50,
      type: 'daily_code',
    };
  }
};

// @desc    Get daily challenge for user
// @route   GET /api/challenges/daily
// @access  Private
exports.getDailyChallenge = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let challenge = await Challenge.findOne({
      user: req.user.id,
      createdAt: { $gte: today },
      completed: false,
    });

    if (!challenge) {
      const user = await User.findById(req.user.id);
      if (!user) {
        return next(new ErrorResponse('User not found', 404));
      }
      const aiChallenge = await generateAIChallenge(user);
      challenge = await Challenge.create({
        ...aiChallenge,
        user: req.user.id,
      });
      user.challenges.push(challenge._id);
      await user.save();
      console.log(`Generated AI challenge ${challenge.title} for user ${req.user.id}`);
    }

    res.status(200).json({
      success: true,
      data: challenge,
    });
  } catch (err) {
    console.error('Error in getDailyChallenge:', err);
    next(new ErrorResponse('Failed to fetch daily challenge', 500));
  }
};

// @desc    Complete daily challenge
// @route   PUT /api/challenges/:id/complete
// @access  Private
// File: backend/controllers/challengeController.js
exports.completeChallenge = async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge || challenge.user.toString() !== req.user.id) {
      return next(new ErrorResponse('Challenge not found', 404));
    }
    if (challenge.completed) {
      return next(new ErrorResponse('Challenge already completed', 400));
    }

    const user = await User.findById(req.user.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if user already completed a challenge or task today
    const challengesToday = await Challenge.countDocuments({
      user: req.user.id,
      completed: true,
      completedAt: { $gte: today },
    });
    const tasksToday = await Task.countDocuments({
      user: req.user.id,
      status: 'completed',
      completedAt: { $gte: today },
    });

    if (challengesToday > 0 || tasksToday > 0) {
      return next(new ErrorResponse('You have already completed a task or challenge today', 400));
    }

    challenge.completed = true;
    challenge.completedAt = Date.now();
    await challenge.save();

    user.xp += challenge.xpBonus;
    user.coins += 10;
    const streakIncrement = checkStreak(user.lastTaskCompletion);
    if (streakIncrement === 0 && user.lastTaskCompletion) {
      user.streak = 0; // Reset streak if missed a day or same day
    } else if (streakIncrement === 1) {
      user.streak += 1; // Increment streak
    }
    // Award coins for streak milestones
    let milestoneMessage = '';
    if (streakIncrement === 1) {
      if (user.streak === 3) {
        user.coins += 10;
        milestoneMessage = '3-Day Streak! +10 coins';
      } else if (user.streak === 7) {
        user.coins += 20;
        milestoneMessage = '7-Day Streak! +20 coins';
      } else if (user.streak === 14) {
        user.coins += 50;
        milestoneMessage = '14-Day Streak! +50 coins';
      }
    }
    user.lastTaskCompletion = Date.now(); // Use same field for tasks and challenges
    await user.save();

    global.io.to(req.user.id.toString()).emit('challengeCompleted', {
      challenge,
      user: { xp: user.xp, coins: user.coins, streak: user.streak },
      milestoneMessage,
    });

    await checkAndUnlockAchievements(user._id);

    res.status(200).json({
      success: true,
      data: challenge,
    });
  } catch (err) {
    console.error('Error in completeChallenge:', err);
    next(new ErrorResponse('Failed to complete challenge', 500));
  }
};

// @desc    Reset daily challenges (scheduled task)
exports.resetDailyChallenges = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await Challenge.deleteMany({
      createdAt: { $lt: today },
      completed: false,
    });
    console.log('Cleared old incomplete daily challenges');
  } catch (err) {
    console.error('Error in resetDailyChallenges:', err);
  }
};