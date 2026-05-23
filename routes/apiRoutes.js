const express = require('express');
const apiController = require('../controllers/apiController');

const router = express.Router();

router.get('/status/:name', apiController.serviceStatus);
router.post('/service/:name/aws-url', apiController.updateAwsUrl);

module.exports = router;
