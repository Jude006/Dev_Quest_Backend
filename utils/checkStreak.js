// File: backend/utils/checkStreak.js
module.exports = (lastTaskCompletion) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!lastTaskCompletion) return 1; // First completion starts streak

  const last = new Date(lastTaskCompletion);
  const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
  const diffDays = (today - lastDay) / (1000 * 60 * 60 * 24);

  if (diffDays === 1) return 1; // Completed yesterday, increment streak
  if (diffDays > 1) return 0; // Missed a day, reset streak
  return 0; // Same day, no increment
};