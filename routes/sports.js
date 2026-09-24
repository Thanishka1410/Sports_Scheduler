'use strict';

const express = require('express');
const router = express.Router();
const sportController = require('../controllers/sportController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

router.get('/', ensureAuthenticated, sportController.getSports);
router.get('/new', ensureAuthenticated, ensureAdmin, sportController.getNewSport);
router.post('/', ensureAuthenticated, ensureAdmin, sportController.postSport);

module.exports = router;
