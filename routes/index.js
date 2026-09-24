'use strict';

const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  return res.redirect('/auth/login');
});

router.get('/dashboard', ensureAuthenticated, sessionController.getDashboard);

module.exports = router;
