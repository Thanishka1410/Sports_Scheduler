'use strict';

process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const { sequelize, User, Sport, Session, SessionPlayer } = require('../models');

// Date helper for generating future date strings
const getFutureDate = (daysAhead = 1) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
};

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Sports Scheduler App - Automated Integration Test Suite', () => {
  let adminAgent;
  let playerAgent;
  let createdSport;
  let createdSession;

  // 1. Authentication & Role Tests
  describe('Authentication & User Management', () => {
    test('1.1 Should register a new Admin user', async () => {
      adminAgent = request.agent(app);
      const res = await adminAgent
        .post('/auth/signup')
        .type('form')
        .send({
          name: 'Super Admin',
          email: 'admin@test.com',
          password: 'password123',
          role: 'admin'
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/dashboard');

      const adminUser = await User.findOne({ where: { email: 'admin@test.com' } });
      expect(adminUser).not.toBeNull();
      expect(adminUser.role).toBe('admin');
    });

    test('1.2 Should register a new Player user', async () => {
      playerAgent = request.agent(app);
      const res = await playerAgent
        .post('/auth/signup')
        .type('form')
        .send({
          name: 'John Player',
          email: 'player@test.com',
          password: 'password123',
          role: 'player'
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/dashboard');

      const playerUser = await User.findOne({ where: { email: 'player@test.com' } });
      expect(playerUser).not.toBeNull();
      expect(playerUser.role).toBe('player');
    });

    test('1.3 Should reject login with invalid credentials', async () => {
      const anonAgent = request.agent(app);
      const res = await anonAgent
        .post('/auth/login')
        .type('form')
        .send({
          email: 'admin@test.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/auth/login');
    });
  });

  // 2. Sport Category Management
  describe('Sports Category Management', () => {
    test('2.1 Admin can create a new sport category', async () => {
      const res = await adminAgent
        .post('/sports')
        .type('form')
        .send({ name: 'Soccer' });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/sports');

      createdSport = await Sport.findOne({ where: { name: 'Soccer' } });
      expect(createdSport).not.toBeNull();
      expect(createdSport.name).toBe('Soccer');
    });

    test('2.2 Regular player cannot create a sport category', async () => {
      const res = await playerAgent
        .post('/sports')
        .type('form')
        .send({ name: 'Cricket' });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/dashboard');

      const cricketSport = await Sport.findOne({ where: { name: 'Cricket' } });
      expect(cricketSport).toBeNull();
    });
  });

  // 3. Session Scheduling & Match Creation
  describe('Match Session Scheduling', () => {
    test('3.1 Admin can create an upcoming match session', async () => {
      const futureDate = getFutureDate(3);
      const res = await adminAgent
        .post('/sessions')
        .type('form')
        .send({
          sportId: createdSport.id,
          venue: 'National Arena Court A',
          date: futureDate,
          time: '18:00',
          additionalPlayersNeeded: 2
        });

      expect(res.status).toBe(302);

      createdSession = await Session.findOne({ where: { venue: 'National Arena Court A' } });
      expect(createdSession).not.toBeNull();
      expect(createdSession.additionalPlayersNeeded).toBe(2);

      const players = await SessionPlayer.findAll({ where: { sessionId: createdSession.id } });
      expect(players.length).toBe(1);
    });

    test('3.2 Regular player CANNOT create/host a match session', async () => {
      const futureDate = getFutureDate(4);
      const res = await playerAgent
        .post('/sessions')
        .type('form')
        .send({
          sportId: createdSport.id,
          venue: 'Unauthorized Player Court',
          date: futureDate,
          time: '19:00',
          additionalPlayersNeeded: 4
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/dashboard');

      const forbiddenSession = await Session.findOne({ where: { venue: 'Unauthorized Player Court' } });
      expect(forbiddenSession).toBeNull();
    });

    test('3.3 Prevents creating sessions in the past', async () => {
      const res = await adminAgent
        .post('/sessions')
        .type('form')
        .send({
          sportId: createdSport.id,
          venue: 'Old Stadium',
          date: '2020-01-01',
          time: '10:00',
          additionalPlayersNeeded: 5
        });

      expect(res.status).toBe(302);

      const pastSession = await Session.findOne({ where: { venue: 'Old Stadium' } });
      expect(pastSession).toBeNull();
    });
  });

  // 4. Joining & Withdrawing Sessions
  describe('Session Joining and Withdrawal Rules', () => {
    test('4.1 Player can join an available upcoming session', async () => {
      const res = await playerAgent
        .post(`/sessions/${createdSession.id}/join`)
        .type('form')
        .send({ teamName: 'Striker Team' });

      expect(res.status).toBe(302);

      const players = await SessionPlayer.findAll({ where: { sessionId: createdSession.id } });
      expect(players.length).toBe(2);

      const playerRecord = await SessionPlayer.findOne({
        where: {
          sessionId: createdSession.id,
          userId: (await User.findOne({ where: { email: 'player@test.com' } })).id
        }
      });
      expect(playerRecord).not.toBeNull();
      expect(playerRecord.teamName).toBe('Striker Team');
    });

    test('4.2 Prevents duplicate joining by the same player', async () => {
      const res = await playerAgent
        .post(`/sessions/${createdSession.id}/join`)
        .type('form')
        .send({ teamName: 'Striker Team' });

      expect(res.status).toBe(302);

      const players = await SessionPlayer.findAll({ where: { sessionId: createdSession.id } });
      expect(players.length).toBe(2);
    });

    test('4.3 Player can withdraw from a joined session', async () => {
      const res = await playerAgent
        .post(`/sessions/${createdSession.id}/withdraw`)
        .type('form')
        .send({});

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`/sessions/${createdSession.id}`);

      const playerUser = await User.findOne({ where: { email: 'player@test.com' } });
      const withdrawnRecord = await SessionPlayer.findOne({
        where: {
          sessionId: createdSession.id,
          userId: playerUser.id
        }
      });
      expect(withdrawnRecord).toBeNull();
    });

    test('4.4 Prevents joining past sessions directly created in DB', async () => {
      const pastMatch = await Session.create({
        sportId: createdSport.id,
        creatorId: (await User.findOne({ where: { email: 'admin@test.com' } })).id,
        venue: 'Historic Ground',
        date: '2019-05-15',
        time: '15:00',
        additionalPlayersNeeded: 5,
        isCancelled: false
      });

      const res = await playerAgent
        .post(`/sessions/${pastMatch.id}/join`)
        .type('form')
        .send({ teamName: 'Defenders' });

      expect(res.status).toBe(302);

      const joinedCount = await SessionPlayer.count({ where: { sessionId: pastMatch.id } });
      expect(joinedCount).toBe(0);
    });
  });

  // 5. Cancellation Logic
  describe('Session Cancellation Management', () => {
    test('5.1 Creator can cancel session with a mandatory reason', async () => {
      const res = await adminAgent
        .post(`/sessions/${createdSession.id}/cancel`)
        .type('form')
        .send({ cancellationReason: 'Bad weather forecast (heavy rain).' });

      expect(res.status).toBe(302);

      const updatedSession = await Session.findByPk(createdSession.id);
      expect(updatedSession.isCancelled).toBe(true);
      expect(updatedSession.cancellationReason).toBe('Bad weather forecast (heavy rain).');
    });

    test('5.2 Prevents joining a cancelled session', async () => {
      const newPlayerAgent = request.agent(app);
      await newPlayerAgent
        .post('/auth/signup')
        .type('form')
        .send({
          name: 'Third Player',
          email: 'third@test.com',
          password: 'password123',
          role: 'player'
        });

      const res = await newPlayerAgent
        .post(`/sessions/${createdSession.id}/join`)
        .type('form')
        .send({ teamName: 'Wildcards' });

      expect(res.status).toBe(302);

      const playersCount = await SessionPlayer.count({
        where: {
          sessionId: createdSession.id,
          userId: (await User.findOne({ where: { email: 'third@test.com' } })).id
        }
      });
      expect(playersCount).toBe(0);
    });
  });
});
