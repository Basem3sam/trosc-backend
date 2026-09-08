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
});
