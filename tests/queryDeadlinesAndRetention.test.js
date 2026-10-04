const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const APIFeatures = require('../src/utils/APIFeatures');
const Track = require('../src/models/track.model');
const Course = require('../src/models/course.model');
const ActivityLog = require('../src/models/activitylog.model');
const dashboardStatsService = require('../src/services/dashboardStats.service');
const { createTestUser } = require('./helpers/testUser');
const { startQueryCount } = require('./helpers/queryCounter');

describe('list queries carry a server-side time limit', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sets maxTimeMS 10000 on the page query and on the count', async () => {
    const maxTime = jest.spyOn(mongoose.Query.prototype, 'maxTimeMS');

    const features = new APIFeatures(Track.find(), {}, Track);
    features.filter().sort().limitFields();
    await features.paginate();
    await features.query;

    const limits = maxTime.mock.calls.map(([ms]) => ms);
    // one for the page query, one for the count
    const tenSecond = limits.filter((ms) => ms === 10000);
    expect(tenSecond.length).toBeGreaterThanOrEqual(2);
  });

  it('gives the dashboard computation a higher limit', async () => {
    const maxTime = jest.spyOn(mongoose.Query.prototype, 'maxTimeMS');
    const option = jest.spyOn(mongoose.Aggregate.prototype, 'option');

    await dashboardStatsService.getLiveStats();

    expect(maxTime).toHaveBeenCalledWith(60000);
    expect(option).toHaveBeenCalledWith({ maxTimeMS: 60000 });
  });
});

describe('pagination: count and page query together', () => {
  let counter;

  afterEach(() => {
    if (counter) counter.stop();
    counter = null;
  });

  const seedTracks = async (n) => {
    const { user: instructor } = await createTestUser({ role: 'instructor' });
    for (let i = 1; i <= n; i += 1) {
      // Sequential so createdAt (the default sort) is strictly increasing.
      // eslint-disable-next-line no-await-in-loop
      await Track.create({
        title: `Pagination Track ${i}`,
        description: 'For pagination tests',
        instructor: instructor._id,
        published: true,
      });
    }
  };

  it('returns the same totals and pagination metadata as before', async () => {
    await seedTracks(5);

    const res = await request(app).get('/v1/tracks?limit=2&page=2');

    expect(res.status).toBe(200);
    expect(res.body.results).toBe(2);
    expect(res.body.total).toBe(5);
    expect(res.body.pagination).toEqual({
      page: 2,
      limit: 2,
      totalPages: 3,
      totalResults: 5,
      hasNext: true,
      hasPrev: true,
    });
    // Newest first: page 2 of 2 holds tracks 3 and 2.
    expect(res.body.data.tracks.map((t) => t.title)).toEqual([
      'Pagination Track 3',
      'Pagination Track 2',
    ]);
  });

  it('reports an empty list without totals, as before', async () => {
    const res = await request(app).get('/v1/tracks');

    expect(res.status).toBe(200);
    expect(res.body.results).toBe(0);
    expect(res.body.total).toBe(0);
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 20,
      totalPages: undefined,
      totalResults: undefined,
      hasNext: undefined,
      hasPrev: false,
    });
  });

  it('fills totalDocs once the page query has run, with one count and one find', async () => {
    await seedTracks(3);
    counter = startQueryCount();

    const features = new APIFeatures(Track.find(), { limit: '2' }, Track);
    features.filter().sort().limitFields();
    await features.paginate();
    const docs = await features.query;
    counter.stop();

    expect(docs).toHaveLength(2);
    expect(features.totalDocs).toBe(3);
    expect(features.pagination.totalPages).toBe(2);
    expect(counter.count('tracks', 'countDocuments')).toBe(1);
    expect(counter.count('tracks', 'find')).toBe(1);
  });

  it('rejects when the page query fails, instead of hanging', async () => {
    const features = new APIFeatures(Track.find(), {}, Track);
    features.filter().sort().limitFields();
    await features.paginate();
    features.query.where({ $nonsenseOperator: 1 });

    await expect(features.query).rejects.toThrow();
  });
});

describe('text indexes are gone', () => {
  const hasText = (schema) =>
    schema.indexes().some(([fields]) => Object.values(fields).includes('text'));

  it('Course and Track declare no text index', () => {
    expect(hasText(Course.schema)).toBe(false);
    expect(hasText(Track.schema)).toBe(false);
  });
});

describe('activity log retention', () => {
  const indexes = () => ActivityLog.schema.indexes();

  it('has a TTL index on createdAt of 180 days', () => {
    const ttl = indexes().find(
      ([fields]) => Object.keys(fields).join() === 'createdAt',
    );
    expect(ttl).toBeDefined();
    expect(ttl[0]).toEqual({ createdAt: 1 });
    expect(ttl[1].expireAfterSeconds).toBe(180 * 24 * 60 * 60);
  });

  it('no longer declares the old descending createdAt index', () => {
    const old = indexes().filter(
      ([fields]) =>
        Object.keys(fields).join() === 'createdAt' && fields.createdAt === -1,
    );
    expect(old).toHaveLength(0);
  });

  it('keeps the other indexes', () => {
    const keys = indexes().map(([fields]) => Object.keys(fields).join());
    expect(keys).toEqual(
      expect.arrayContaining([
        'user,createdAt',
        'action,createdAt',
        'targetModel,targetId',
      ]),
    );
  });
});
