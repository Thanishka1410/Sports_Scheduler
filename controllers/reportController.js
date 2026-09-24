'use strict';

const { Session, Sport, SessionPlayer, sequelize } = require('../models');
const { Op } = require('sequelize');

module.exports = {
  getReports: async (req, res, next) => {
    try {
      let { startDate, endDate } = req.query;

      // Default date range: past 30 days to future 30 days if not provided
      if (!startDate) {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString().slice(0, 10);
      }
      if (!endDate) {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        endDate = d.toISOString().slice(0, 10);
      }

      const sessions = await Session.findAll({
        where: {
          date: {
            [Op.between]: [startDate, endDate]
          }
        },
        include: [
          { model: Sport, as: 'sport' },
          { model: SessionPlayer, as: 'players' }
        ]
      });

      const totalSessions = sessions.length;
      const cancelledSessionsCount = sessions.filter(s => s.isCancelled).length;
      const activeSessionsCount = totalSessions - cancelledSessionsCount;
      const cancellationRate = totalSessions > 0 ? ((cancelledSessionsCount / totalSessions) * 100).toFixed(1) : 0;

      // Calculate popularity metrics per sport
      const allSports = await Sport.findAll({ order: [['name', 'ASC']] });
      const sportPopularityMap = {};

      allSports.forEach(s => {
        sportPopularityMap[s.id] = {
          id: s.id,
          name: s.name,
          sessionCount: 0,
          playerCount: 0,
          cancelledCount: 0
        };
      });

      sessions.forEach(sess => {
        if (sess.sport && sportPopularityMap[sess.sport.id]) {
          sportPopularityMap[sess.sport.id].sessionCount += 1;
          sportPopularityMap[sess.sport.id].playerCount += sess.players.length;
          if (sess.isCancelled) {
            sportPopularityMap[sess.sport.id].cancelledCount += 1;
          }
        }
      });

      const sportPopularityList = Object.values(sportPopularityMap).sort(
        (a, b) => b.sessionCount - a.sessionCount
      );

      return res.render('reports/index', {
        title: 'Admin Reports & Analytics - Sports Scheduler',
        startDate,
        endDate,
        totalSessions,
        activeSessionsCount,
        cancelledSessionsCount,
        cancellationRate,
        sportPopularityList
      });
    } catch (err) {
      console.error('Error generating reports:', err);
      return next(err);
    }
  }
};
