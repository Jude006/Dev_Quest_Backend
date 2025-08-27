const multer = require('multer');
const path = require('path');

module.exports = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') {
      return callback(new Error('Only images are allowed (jpg, jpeg, png)'));
    }
    callback(null, true);
  },
  limits: {
    fileSize: 1024 * 1024 * 5
  }
}).single('avatar');