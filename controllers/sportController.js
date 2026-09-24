'use strict';

const { Sport, User, Session } = require('../models');

module.exports = {
  getSports: async (req, res, next) => {
    try {
      const sports = await Sport.findAll({
        include: [
          { model: User, as: 'admin', attributes: ['id', 'name', 'email'] },
          { model: Session, as: 'sessions' }
        ],
        order: [['name', 'ASC']]
      });

      return res.render('sports/index', {
        title: 'Sports Categories - Sports Scheduler',
        sports
      });
    } catch (err) {
      console.error('Error fetching sports:', err);
      return next(err);
    }
  },

  getNewSport: (req, res) => {
    return res.render('sports/new', {
      title: 'Create New Sport - Sports Scheduler'
    });
  },

  postSport: async (req, res, next) => {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) {
        req.flash('error', 'Sport name is required.');
        return res.redirect('/sports/new');
      }

      const existing = await Sport.findOne({ where: { name: name.trim() } });
      if (existing) {
        req.flash('error', `A sport named "${name.trim()}" already exists.`);
        return res.redirect('/sports/new');
      }

      await Sport.create({
        name: name.trim(),
        adminId: req.user.id
      });

      req.flash('success', `Sport "${name.trim()}" created successfully!`);
      return res.redirect('/sports');
    } catch (err) {
      console.error('Error creating sport:', err);
      req.flash('error', 'Failed to create sport. Please try again.');
      return res.redirect('/sports/new');
    }
  }
};
