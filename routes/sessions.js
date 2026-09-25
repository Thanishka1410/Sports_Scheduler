'use strict';

const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

router.get('/new', ensureAuthenticated, ensureAdmin, sessionController.getNewSession);
router.post('/', ensureAuthenticated, ensureAdmin, sessionController.postSession);
router.get('/:id', ensureAuthenticated, sessionController.getSessionDetails);
router.post('/:id/join', ensureAuthenticated, sessionController.joinSession);
router.post('/:id/withdraw', ensureAuthenticated, sessionController.withdrawSession);
router.post('/:id/cancel', ensureAuthenticated, sessionController.cancelSession);

module.exports = router;
