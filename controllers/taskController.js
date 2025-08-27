const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose')
const Task = require('../models/Task');
const axios = require('axios')
const User = require('../models/User');
const calculateXP = require('../utils/calculateXP');
const checkStreak = require('../utils/checkStreak');
const { checkAndUnlockAchievements } = require('./achievementController');

// @desc    Get all tasks for user
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 });
    console.log(`Fetched ${tasks.length} tasks for user ${req.user.id}`);
    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (err) {
    console.error('Error in getTasks:', err);
    next(new ErrorResponse('Failed to fetch tasks', 500));
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || task.user.toString() !== req.user.id) {
      return next(new ErrorResponse('Task not found', 404));
    }
    console.log(`Fetched task ${req.params.id} for user ${req.user.id}`);
    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (err) {
    console.error('Error in getTask:', err);
    next(new ErrorResponse('Failed to fetch task', 500));
  }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res, next) => {
  try {
    const { name, description, difficulty, estimatedTime } = req.body;
    if (!name || !difficulty || !estimatedTime) {
      return next(new ErrorResponse('Name, difficulty, and estimated time are required', 400));
    }
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return next(new ErrorResponse('Invalid difficulty level', 400));
    }
    if (estimatedTime <= 0) {
      return next(new ErrorResponse('Estimated time must be positive', 400));
    }
    const task = await Task.create({
      name,
      description,
      difficulty,
      estimatedTime,
      user: req.user.id,
    });
    console.log(`Created task ${task._id} for user ${req.user.id}`);
    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (err) {
    console.error('Error in createTask:', err);
    next(new ErrorResponse('Failed to create task', 500));
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || task.user.toString() !== req.user.id) {
      return next(new ErrorResponse('Task not found', 404));
    }
    if (task.status === 'completed') {
      return next(new ErrorResponse('Cannot update completed task', 400));
    }
    const { name, description, difficulty, estimatedTime } = req.body;
    if (name) task.name = name;
    if (description) task.description = description;
    if (difficulty) {
      if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return next(new ErrorResponse('Invalid difficulty level', 400));
      }
      task.difficulty = difficulty;
    }
    if (estimatedTime) {
      if (estimatedTime <= 0) {
        return next(new ErrorResponse('Estimated time must be positive', 400));
      }
      task.estimatedTime = estimatedTime;
    }
    await task.save();
    console.log(`Updated task ${req.params.id} for user ${req.user.id}`);
    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (err) {
    console.error('Error in updateTask:', err);
    next(new ErrorResponse('Failed to update task', 500));
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return next(new ErrorResponse('Invalid task ID', 400));
    }
    const task = await Task.findById(req.params.id);
    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }
    if (task.user.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to delete this task', 403));
    }
    await Task.deleteOne({ _id: req.params.id });
    console.log(`Deleted task ${req.params.id} for user ${req.user.id}`);
    global.io.to(req.user.id.toString()).emit('taskDeleted', { taskId: req.params.id });
    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    console.error('Error in deleteTask:', err.message, err.stack);
    next(new ErrorResponse(`Failed to delete task: ${err.message}`, 500));
  }
};

// @desc    Complete task
// @route   PUT /api/tasks/:id/complete
// @access  Private
exports.completeTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || task.user.toString() !== req.user.id) {
      return next(new ErrorResponse('Task not found', 404));
    }
    if (task.status === 'completed') {
      return next(new ErrorResponse('Task already completed', 400));
    }
    const { actualTime, learned } = req.body;
    if (!actualTime || actualTime <= 0) {
      return next(new ErrorResponse('Actual time must be positive', 400));
    }

    const user = await User.findById(req.user.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if user already completed a task today
    const tasksToday = await Task.countDocuments({
      user: req.user.id,
      status: 'completed',
      completedAt: { $gte: today },
    });

    task.actualTime = actualTime;
    task.status = 'completed';
    task.completedAt = Date.now();
    task.learned = learned || false; // Set learned flag
    await task.save();

    const xp = calculateXP(task.difficulty);
    user.xp += xp;
    user.totalHoursCoded += actualTime / 60;
    user.tasksCompleted = (user.tasksCompleted || 0) + 1;

    let streakUpdated = false;
    if (tasksToday === 0) {
      const streakIncrement = checkStreak(user.lastTaskCompletion);
      if (streakIncrement === 0 && user.lastTaskCompletion) {
        user.streak = 0;
      } else if (streakIncrement === 1) {
        user.streak += 1;
        streakUpdated = true;
      }
    }

    let milestoneMessage = '';
    if (streakUpdated) {
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

    user.lastTaskCompletion = Date.now();
    await user.save();

    console.log(`Task ${req.params.id} completed by user ${user._id}. XP: ${user.xp}, Tasks Completed: ${user.tasksCompleted}, Streak: ${user.streak}, Learned: ${task.learned}`);
    await checkAndUnlockAchievements(user._id);

    global.io.to(req.user.id.toString()).emit('taskCompleted', {
      task,
      user: { 
        xp: user.xp, 
        coins: user.coins, 
        streak: user.streak, 
        tasksCompleted: user.tasksCompleted, 
        totalHoursCoded: user.totalHoursCoded 
      },
      milestoneMessage,
    });
    global.io.to(req.user.id.toString()).emit('statsUpdated', {
      xp: user.xp,
      tasksCompleted: user.tasksCompleted,
      coins: user.coins,
      streak: user.streak,
      totalHoursCoded: user.totalHoursCoded
    });
    global.io.emit('leaderboardUpdate', { updatedUser: user });

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (err) {
    console.error('Error in completeTask:', err);
    next(new ErrorResponse('Failed to complete task', 500));
  }
};


exports.generateLearningResources = async (req, res, next) => {
  try {
    const taskId = req.params.taskId;
    if (!mongoose.isValidObjectId(taskId)) {
      return next(new ErrorResponse('Invalid task ID', 400));
    }
    const task = await Task.findById(taskId);
    if (!task || task.user.toString() !== req.user.id) {
      return next(new ErrorResponse('Task not found', 404));
    }

    const tech = detectTechnology(task.name + ' ' + (task.description || ''));
    const prompt = `
      You are an expert coding instructor. For the following programming task, provide:
      1. A detailed explanation (2-3 paragraphs) of the task, its purpose, and key concepts, written for beginners.
      2. A sample solution or suggested approach (include code if applicable, or a step-by-step plan for non-coding tasks).
      3. Structured learning resources suitable for beginners.
      Task Name: "${task.name}"
      Description: "${task.description || 'No description provided'}"
      Technology Focus: ${tech}
      Return the response in JSON format with the following structure:
      {
        "explanation": "Detailed explanation of the task and its concepts",
        "solution": "Sample code or step-by-step approach to complete the task",
        "concept": "Core concept to learn",
        "tutorials": ["string", ...],
        "videos": ["string", ...],
        "documentation": ["string", ...],
        "exercises": ["string", ...],
        "tips": ["string", ...]
      }
      Ensure the explanation is clear, engaging, and beginner-friendly. For the solution, provide complete, working code (if applicable) or a detailed plan. Include specific, actionable resources (e.g., exact tutorial names, YouTube video titles, official documentation links).
    `;

    try {
      if (!process.env.GROK_API_KEY) {
        throw new Error('GROK_API_KEY is not defined');
      }

      const response = await axios.post(
        'https://api.x.ai/v1/chat/completions',
        {
          model: 'grok',
          messages: [
            { role: 'system', content: 'You are a helpful coding instructor.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1500,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
          },
        }
      );

      let resources;
      try {
        resources = JSON.parse(response.data.choices[0].message.content);
      } catch (parseErr) {
        console.error('Error parsing xAI API response:', parseErr.message);
        throw new Error('Invalid response format from xAI API');
      }

      // Validate required fields
      if (!resources.explanation || !resources.solution || !resources.concept) {
        throw new Error('Missing required fields in xAI API response');
      }

      console.log(`Generated learning resources for task ${taskId}`);
      res.status(200).json({
        success: true,
        data: resources,
      });
    } catch (apiErr) {
      console.error('xAI API error:', apiErr.message);
      // Provide fallback resources
      const fallbackResources = {
        explanation: `This task involves learning ${tech} to enhance your programming skills. Start by understanding the core concepts of ${tech}, such as ${tech === 'React' ? 'components, state, and hooks' : tech === 'Python' ? 'syntax, functions, and libraries' : 'basic programming principles'}. This will help you build a strong foundation for solving tasks like "${task.name}".`,
        solution: `No specific solution available. Try building a small ${tech} project, such as a ${tech === 'React' ? 'simple counter component' : tech === 'Python' ? 'basic script to process data' : 'small application'}. Break the task into smaller steps, implement each, and test thoroughly.`,
        concept: `Learn about ${tech} development`,
        tutorials: [
          `MDN Web Docs - ${tech} Guide`,
          `FreeCodeCamp - ${tech} Tutorial`,
          `W3Schools - ${tech} Basics`
        ],
        videos: [
          `YouTube: ${tech} Crash Course`,
          `YouTube: ${tech} for Beginners`,
          `YouTube: ${tech} Best Practices`
        ],
        documentation: [
          `Official ${tech} Documentation`,
          `${tech} API Reference`,
          `Community ${tech} Examples`
        ],
        exercises: [
          `Build a simple ${tech} project`,
          `Practice ${tech} concepts on CodePen`,
          `Solve ${tech} challenges on LeetCode`
        ],
        tips: [
          `Start with small ${tech} projects to build confidence`,
          `Read ${tech} documentation for deeper understanding`,
          `Join ${tech} communities on Discord or Reddit`
        ]
      };

      console.log(`Using fallback resources for task ${taskId}`);
      res.status(200).json({
        success: true,
        data: fallbackResources,
      });
    }
  } catch (err) {
    console.error('Error generating learning resources:', err.message, err.stack);
    next(new ErrorResponse(`Failed to generate learning resources: ${err.message}`, 500));
  }
};

const detectTechnology = (text) => {
  const techKeywords = {
    react: ['react', 'jsx', 'component', 'hooks'],
    javascript: ['javascript', 'js', 'es6', 'node'],
    python: ['python', 'django', 'flask'],
    database: ['mysql', 'mongodb', 'postgres', 'sql'],
    html: ['html', 'css', 'frontend'],
    api: ['api', 'rest', 'graphql'],
  };

  for (const [tech, keywords] of Object.entries(techKeywords)) {
    if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
      return tech.charAt(0).toUpperCase() + tech.slice(1);
    }
  }
  return 'Programming';
};