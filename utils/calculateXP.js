module.exports = (difficulty, bonus = 0) => {
  let xp = 0;
  switch (difficulty) {
    case 'easy':
      xp = 10;
      break;
    case 'medium':
      xp = 50;
      break;
    case 'hard':
      xp = 100;
      break;
  }
  return xp + bonus;
};