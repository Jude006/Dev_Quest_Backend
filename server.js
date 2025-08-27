const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
require('./config/cloudinary');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const taskRoutes = require('./routes/taskRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const challengeRoutes = require('./routes/challengeRoutes');
const scheduleTasks = require('./cron');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const http = require('http');
const socketio = require('socket.io');
const learnRoutes = require('./routes/learn');

dotenv.config();

const app = express();

// Increase body-parser limits
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

app.use(cors({
  origin: ['http://localhost:5173', 'https://dev-quest-ochre.vercel.app/', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With']
}));

app.use(express.json());
app.use(cookieParser());

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/challenges', challengeRoutes);
scheduleTasks(); 
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/learn', learnRoutes);
app.use(errorHandler);

app.use((err, req, res, next) => {
  if (err instanceof require('multer').MulterError) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next(err);
});

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: ['http://localhost:5173', 'https://dev-quest-ochre.vercel.app/'],
    methods: ['GET', 'POST'],
  },
});

// Socket.io for real-time
io.on('connection', (socket) => {
  console.log('User connected');
  socket.on('join', ({ userId }) => {
    socket.join(userId);
  });
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Emit leaderboard update (call this from controllers when XP changes)
global.io = io; // Make io available globally for controllers

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});