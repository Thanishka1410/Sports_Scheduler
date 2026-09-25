'use strict';

const { Session, Sport, User, SessionPlayer, sequelize } = require('../models');
const { Op } = require('sequelize');

// Helper to check if a date + time string is in the past
const isSessionInPast = (dateStr, timeStr) => {
  try {
    const sessionDateTime = new Date(`${dateStr}T${timeStr || '00:00'}`);
    const now = new Date();
    if (isNaN(sessionDateTime.getTime())) {
      const todayStr = new Date().toISOString().slice(0, 10);
      return dateStr < todayStr;
    }
    return sessionDateTime < now;
  } catch (e) {
    const todayStr = new Date().toISOString().slice(0, 10);
    return dateStr < todayStr;
  }
};

module.exports = {
  getDashboard: async (req, res, next) => {
    try {
      const userId = req.user.id;

      // Fetch all sessions with relationships
      const allSessions = await Session.findAll({
        include: [
          { model: Sport, as: 'sport' },
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
          {
            model: SessionPlayer,
            as: 'players',
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
          }
        ],
        order: [['date', 'ASC'], ['time', 'ASC']]
      });

      // 1. Sessions created by user
      const createdSessions = allSessions.filter(s => s.creatorId === userId);

      // 2. Sessions joined by user (where user is enrolled in players list)
      const joinedSessions = allSessions.filter(s =>
        s.players.some(p => p.userId === userId)
      );

      // 3. Cancelled sessions
      const cancelledSessions = allSessions.filter(s => s.isCancelled);

      // 4. Available upcoming sessions
      const availableSessions = allSessions.filter(s => {
        if (s.isCancelled) return false;
        if (isSessionInPast(s.date, s.time)) return false;
        const isJoined = s.players.some(p => p.userId === userId);
        if (isJoined) return false;

        const maxPlayers = s.additionalPlayersNeeded + 1;
        return s.players.length < maxPlayers;
      });

      return res.render('dashboard', {
        title: 'Dashboard - Sports Scheduler',
        createdSessions,
        joinedSessions,
        availableSessions,
        cancelledSessions
      });
    } catch (err) {
      console.error('Error fetching dashboard sessions:', err);
      return next(err);
    }
  },

  getNewSession: async (req, res, next) => {
    try {
      const sports = await Sport.findAll({ order: [['name', 'ASC']] });
      if (sports.length === 0) {
        req.flash('error', 'No sports categories exist yet. An admin must create a sport category first.');
        return res.redirect('/sports');
      }
      return res.render('sessions/new', {
        title: 'Create Session - Sports Scheduler',
        sports
      });
    } catch (err) {
      console.error('Error loading new session form:', err);
      return next(err);
    }
  },

  postSession: async (req, res, next) => {
    try {
      const { sportId, venue, date, time, additionalPlayersNeeded } = req.body;

      if (!sportId || !venue || !date || !time) {
        req.flash('error', 'Sport, venue, date, and time are required.');
        return res.redirect('/sessions/new');
      }

      if (isSessionInPast(date, time)) {
        req.flash('error', 'Cannot schedule a session in the past.');
        return res.redirect('/sessions/new');
      }

      const extraPlayers = parseInt(additionalPlayersNeeded, 10) || 0;

      const session = await Session.create({
        sportId: parseInt(sportId, 10),
        creatorId: req.user.id,
        venue: venue.trim(),
        date,
        time,
        additionalPlayersNeeded: extraPlayers,
        isCancelled: false
      });

      // Automatically add host as player 1
      await SessionPlayer.create({
        sessionId: session.id,
        userId: req.user.id,
        teamName: 'Host / Team 1'
      });

      req.flash('success', 'Match session created successfully!');
      return res.redirect(`/sessions/${session.id}`);
    } catch (err) {
      console.error('Error creating session:', err);
      req.flash('error', 'Failed to create session. Please check your inputs.');
      return res.redirect('/sessions/new');
    }
  },

  getSessionDetails: async (req, res, next) => {
    try {
      const { id } = req.params;
      const session = await Session.findByPk(id, {
        include: [
          { model: Sport, as: 'sport' },
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
          {
            model: SessionPlayer,
            as: 'players',
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
          }
        ]
      });

      if (!session) {
        req.flash('error', 'Session not found.');
        return res.redirect('/dashboard');
      }

      const totalSlots = session.additionalPlayersNeeded + 1;
      const enrolledCount = session.players.length;
      const remainingSlots = Math.max(0, totalSlots - enrolledCount);
      const isCreator = req.user.id === session.creatorId;
      const isAdmin = req.user.role === 'admin';
      const isAlreadyJoined = session.players.some(p => p.userId === req.user.id);
      const inPast = isSessionInPast(session.date, session.time);

      return res.render('sessions/show', {
        title: `Session details - ${session.sport ? session.sport.name : 'Sports'}`,
        session,
        totalSlots,
        enrolledCount,
        remainingSlots,
        isCreator,
        isAdmin,
        isAlreadyJoined,
        inPast
      });
    } catch (err) {
      console.error('Error fetching session details:', err);
      return next(err);
    }
  },

  joinSession: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { teamName } = req.body;

      const session = await Session.findByPk(id, {
        include: [{ model: SessionPlayer, as: 'players' }]
      });

      if (!session) {
        req.flash('error', 'Session not found.');
        return res.redirect('/dashboard');
      }

      if (session.isCancelled) {
        req.flash('error', 'Cannot join a cancelled session.');
        return res.redirect(`/sessions/${id}`);
      }

      if (isSessionInPast(session.date, session.time)) {
        req.flash('error', 'Cannot join a session that has already passed.');
        return res.redirect(`/sessions/${id}`);
      }

      const alreadyJoined = session.players.some(p => p.userId === req.user.id);
      if (alreadyJoined) {
        req.flash('error', 'You are already registered for this session.');
        return res.redirect(`/sessions/${id}`);
      }

      const maxCapacity = session.additionalPlayersNeeded + 1;
      if (session.players.length >= maxCapacity) {
        req.flash('error', 'This session is already full.');
        return res.redirect(`/sessions/${id}`);
      }

      await SessionPlayer.create({
        sessionId: session.id,
        userId: req.user.id,
        teamName: teamName && teamName.trim() ? teamName.trim() : 'Player Team'
      });

      req.flash('success', 'You have successfully joined this sports session!');
      return res.redirect(`/sessions/${id}`);
    } catch (err) {
      console.error('Error joining session:', err);
      req.flash('error', 'Failed to join session. Please try again.');
      return res.redirect(`/sessions/${req.params.id}`);
    }
  },

  withdrawSession: async (req, res, next) => {
    try {
      const { id } = req.params;

      const session = await Session.findByPk(id);
      if (!session) {
        req.flash('error', 'Session not found.');
        return res.redirect('/dashboard');
      }

      if (session.isCancelled) {
        req.flash('error', 'Cannot withdraw from a cancelled session.');
        return res.redirect(`/sessions/${id}`);
      }

      if (isSessionInPast(session.date, session.time)) {
        req.flash('error', 'Cannot withdraw from a session that has already passed.');
        return res.redirect(`/sessions/${id}`);
      }

      const playerRecord = await SessionPlayer.findOne({
        where: {
          sessionId: id,
          userId: req.user.id
        }
      });

      if (!playerRecord) {
        req.flash('error', 'You are not registered in this match session.');
        return res.redirect(`/sessions/${id}`);
      }

      await playerRecord.destroy();

      req.flash('success', 'You have successfully withdrawn from this match session.');
      return res.redirect(`/sessions/${id}`);
    } catch (err) {
      console.error('Error withdrawing from session:', err);
      req.flash('error', 'Failed to withdraw from session. Please try again.');
      return res.redirect(`/sessions/${req.params.id}`);
    }
  },

  cancelSession: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { cancellationReason } = req.body;

      const session = await Session.findByPk(id);
      if (!session) {
        req.flash('error', 'Session not found.');
        return res.redirect('/dashboard');
      }

      const isCreator = req.user.id === session.creatorId;
      const isAdmin = req.user.role === 'admin';

      if (!isCreator && !isAdmin) {
        req.flash('error', 'You do not have permission to cancel this session.');
        return res.redirect(`/sessions/${id}`);
      }

      if (!cancellationReason || !cancellationReason.trim()) {
        req.flash('error', 'A mandatory cancellation reason must be provided.');
        return res.redirect(`/sessions/${id}`);
      }

      session.isCancelled = true;
      session.cancellationReason = cancellationReason.trim();
      await session.save();

      req.flash('success', 'Session has been cancelled and reason logged.');
      return res.redirect(`/sessions/${id}`);
    } catch (err) {
      console.error('Error cancelling session:', err);
      req.flash('error', 'Failed to cancel session.');
      return res.redirect(`/sessions/${req.params.id}`);
    }
  }
};
