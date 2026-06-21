class APIFeatures {
  constructor(query, queryString, model) {
    if (!query) {
      throw new Error('Query cannot be undefined');
    }

    this.query = query;
    this.queryString = queryString;
    this.model = model;
    this.totalDocs = 0;
    this.pagination = {}; // ✅ Initialize pagination object
  }

  // 1️⃣ Enhanced Filtering with Better Error Handling
  filter(defaultFilter = {}) {
    const queryObj = { ...this.queryString };

    const excludedFields = [
      'page',
      'sort',
      'limit',
      'fields',
      'search',
      'populate',
      'keyword', // alternative to 'search'
    ];

    excludedFields.forEach((el) => delete queryObj[el]);

    const addDollarSign = (obj) => {
      const newObj = {};
      Object.keys(obj).forEach((key) => {
        const newKey = [
          'gte',
          'gt',
          'lte',
          'lt',
          'in',
          'ne',
          'regex',
          'options',
        ].includes(key)
          ? `$${key}`
          : key;
        newObj[newKey] =
          typeof obj[key] === 'object' &&
          obj[key] !== null &&
          !Array.isArray(obj[key])
            ? addDollarSign(obj[key])
            : obj[key];
      });
      return newObj;
    };

    try {
      this.conditions = addDollarSign({ ...queryObj, ...defaultFilter });
      this.query = this.query.find(this.conditions);
      return this;
    } catch (error) {
      throw new Error(`Invalid filter parameters: ${error.message}`);
    }
  }

  // 2️⃣ Enhanced Search with Multiple Options
  search(searchFields = []) {
    const searchTerm = this.queryString.search || this.queryString.keyword;

    if (searchTerm && searchFields.length > 0) {
      try {
        const searchRegex = new RegExp(
          searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), // ✅ Escape regex chars
          'i',
        );

        const searchConditions = searchFields.map((field) => ({
          [field]: { $regex: searchRegex },
        }));

        this.query = this.query.find({ $or: searchConditions });
      } catch (error) {
        // If regex fails, fall back to simple text search
        const searchConditions = searchFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        }));
        this.query = this.query.find({ $or: searchConditions });
      }
    }
    return this;
  }

  // 3️⃣ Enhanced Sorting with Validation
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  // 4️⃣ Enhanced Field Limiting with Security
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      // ✅ Basic security: Remove potential dangerous fields
      const safeFields = fields
        .split(' ')
        .filter(
          (field) => !field.includes('password') && !field.includes('__v'),
        )
        .join(' ');
      this.query = this.query.select(safeFields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  // 5️⃣ Enhanced Pagination with Limits
  async paginate() {
    const page = Math.max(1, parseInt(this.queryString.page, 10) || 1);
    const limit = Math.min(
      Math.max(1, parseInt(this.queryString.limit, 10) || 20),
      100, // ✅ Maximum limit to prevent abuse
    );
    const skip = (page - 1) * limit;

    // Count total documents for pagination metadata
    if (this.model) {
      this.totalDocs = await this.model.countDocuments(this.conditions);
    }

    this.query = this.query.skip(skip).limit(limit);

    this.pagination = {
      page,
      limit,
      totalPages: this.totalDocs
        ? Math.ceil(this.totalDocs / limit)
        : undefined,
      totalResults: this.totalDocs || undefined,
      hasNext: this.totalDocs
        ? page < Math.ceil(this.totalDocs / limit)
        : undefined,
      hasPrev: page > 1,
    };

    return this;
  }

  // 6️⃣ Enhanced Population with Depth Control
  populate() {
    if (this.queryString.populate) {
      const fields = this.queryString.populate.split(',');
      fields.forEach((field) => {
        const trimmedField = field.trim();
        // ✅ Simple population without deep nesting to avoid performance issues
        this.query = this.query.populate(trimmedField);
      });
    }
    return this;
  }

  // 7️⃣ NEW: Get the final query results
  async getResults() {
    const results = await this.query;
    return {
      status: 'success',
      results: results.length,
      pagination: this.pagination,
      data: results,
    };
  }

  // 8️⃣ NEW: Count only (without getting documents)
  async count() {
    return await this.query.countDocuments();
  }

  // 9️⃣ NEW: Add custom query conditions
  where(conditions) {
    this.query = this.query.where(conditions);
    return this;
  }
}

module.exports = APIFeatures;
