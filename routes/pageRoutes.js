const express = require('express');
const pageController = require('../controllers/pageController');

const router = express.Router();

router.get('/', (req, res) => res.redirect('/catalog'));
router.get('/catalog', pageController.catalog);
router.get('/provision', pageController.provisionForm);
router.post('/provision', pageController.createService);
router.get('/service/:name', pageController.serviceDetails);
router.post('/service/:name/delete', pageController.removeService);
router.get('/gateway', pageController.gateway);
router.get('/governance', pageController.governance);
router.get('/observability', pageController.observability);

module.exports = router;
