const APIFeatures = require('../src/utils/APIFeatures');

describe('APIFeatures', () => {
  let queryMock;

  beforeEach(() => {
    queryMock = {
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    };
  });

  it('filter() handles gte/gt/lte/lt operators', () => {
    const features = new APIFeatures(
      queryMock,
      { duration: { gte: 10, lte: 20 } },
      {},
    );
    features.filter();
    expect(queryMock.find).toHaveBeenCalledWith({
      duration: { $gte: 10, $lte: 20 },
    });
  });

  it('filter() excludes page, sort, limit, fields, search', () => {
    const features = new APIFeatures(
      queryMock,
      {
        page: 2,
        sort: '-createdAt',
        limit: 5,
        fields: 'title',
        search: 'react',
        level: 'beginner',
      },
      {},
    );
    features.filter();
    expect(queryMock.find).toHaveBeenCalledWith({ level: 'beginner' });
  });

  it('search() adds $or conditions', () => {
    const features = new APIFeatures(queryMock, { search: 'test' }, {});
    features.search(['title', 'description']);
    expect(queryMock.find).toHaveBeenCalledWith({
      $or: [
        { title: { $regex: /test/i } },
        { description: { $regex: /test/i } },
      ],
    });
  });

  it('sort() defaults to -createdAt', () => {
    const features = new APIFeatures(queryMock, {}, {});
    features.sort();
    expect(queryMock.sort).toHaveBeenCalledWith('-createdAt');
  });

  it('limitFields() selects fields and does NOT add -__v when fields are given', () => {
    const features = new APIFeatures(
      queryMock,
      { fields: 'title,description' },
      {},
    );
    features.limitFields();
    expect(queryMock.select).toHaveBeenCalledWith('title description');
  });

  it('limitFields() excludes __v when no fields are given', () => {
    const features = new APIFeatures(queryMock, {}, {});
    features.limitFields();
    expect(queryMock.select).toHaveBeenCalledWith('-__v');
  });

  it('paginate() calculates pagination metadata', async () => {
    const modelMock = { countDocuments: jest.fn().mockResolvedValue(25) };
    const features = new APIFeatures(
      queryMock,
      { page: 2, limit: 10 },
      modelMock,
    );
    await features.paginate();
    expect(queryMock.skip).toHaveBeenCalledWith(10);
    expect(queryMock.limit).toHaveBeenCalledWith(10);
    expect(features.pagination).toEqual({
      page: 2,
      limit: 10,
      totalPages: 3,
      totalResults: 25,
      hasNext: true,
      hasPrev: true,
    });
  });

  it('constructor throws when query is undefined', () => {
    expect(() => new APIFeatures(undefined, {}, {})).toThrow(
      'Query cannot be undefined',
    );
  });

  it('filter() wraps and rethrows an error from the underlying query', () => {
    const throwingQuery = {
      find: jest.fn(() => {
        throw new Error('underlying find failed');
      }),
    };
    const features = new APIFeatures(throwingQuery, { level: 'beginner' }, {});
    expect(() => features.filter()).toThrow(
      'Invalid filter parameters: underlying find failed',
    );
  });

  it('sort() applies a custom comma-separated sort string', () => {
    const features = new APIFeatures(
      queryMock,
      { sort: 'title,-createdAt' },
      {},
    );
    features.sort();
    expect(queryMock.sort).toHaveBeenCalledWith('title -createdAt');
  });

  it('populate() populates each comma-separated field, trimmed', () => {
    const features = new APIFeatures(
      queryMock,
      { populate: 'instructor, students' },
      {},
    );
    features.populate();
    expect(queryMock.populate).toHaveBeenCalledWith('instructor');
    expect(queryMock.populate).toHaveBeenCalledWith('students');
  });

  it('populate() is a no-op when no populate param is given', () => {
    const features = new APIFeatures(queryMock, {}, {});
    features.populate();
    expect(queryMock.populate).not.toHaveBeenCalled();
  });

  it('getResults() returns a standard success envelope', async () => {
    const results = [{ _id: '1' }, { _id: '2' }];
    const features = new APIFeatures(Promise.resolve(results), {}, {});
    features.query = Promise.resolve(results);
    features.pagination = { page: 1 };
    const output = await features.getResults();
    expect(output).toEqual({
      status: 'success',
      results: 2,
      pagination: { page: 1 },
      data: results,
    });
  });

  it('count() delegates to query.countDocuments()', async () => {
    queryMock.countDocuments = jest.fn().mockResolvedValue(7);
    const features = new APIFeatures(queryMock, {}, {});
    const result = await features.count();
    expect(result).toBe(7);
    expect(queryMock.countDocuments).toHaveBeenCalled();
  });

  it('where() adds custom conditions to the query', () => {
    const features = new APIFeatures(queryMock, {}, {});
    features.where({ published: true });
    expect(queryMock.where).toHaveBeenCalledWith({ published: true });
  });
});
