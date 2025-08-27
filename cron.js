const cron = require('node-cron');
const { resetDailyChallenges } = require('./controllers/challengeController');

const scheduleTasks = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily challenge reset');
    await resetDailyChallenges();
  });
};

module.exports = scheduleTasks;