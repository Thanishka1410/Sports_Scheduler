'use strict';

const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/new', ensureAuthenticated, sessionController.getNewSession);
router.post('/', ensureAuthenticated, sessionController.postSession);
router.get('/:id', ensureAuthenticated, sessionController.getSessionDetails);
router.post('/:id/join', ensureAuthenticated, sessionController.joinSession);
router.post('/:id/cancel', ensureAuthenticated, sessionController.cancelSession);

module.exports = router;
