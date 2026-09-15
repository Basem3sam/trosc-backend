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

  // Fields marked `select: false` in the schema (password, password
  // reset tokens, the `active` flag, etc). Computed from the actual
  // schema metadata rather than name-matching (e.g. "contains
  // 'password'"), so limitFields() blocks every select:false path
  // regardless of what it's called — not just ones that happen to
  // contain a word we thought to check for.
  getHiddenFields() {
    if (!this.model?.schema) return [];
    const hidden = [];
    this.model.schema.eachPath((path, schemaType) => {
      if (schemaType.options?.select === false) hidden.push(path);
    });
    return hidden;
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

    // True ONLY for plain `{}` objects — deliberately excludes Date,
    // ObjectId, Buffer, and any other class instance. The previous
    // `typeof x === 'object'` check was too broad: when a caller passed an
    // ObjectId (e.g. a mongoose.Types.ObjectId from a service layer) as a
    // default filter value, addDollarSign would recursively walk the
    // ObjectId's own enumerable properties (`buffer`, `_bsontype`, `id`,
    // …), produce a plain object with the same shape, and drop the
    // ObjectId prototype — which then blew up downstream as a CastError
    // when Mongoose tried to cast that plain object back to an ObjectId
    // on the query path.
    const isPlainObject = (v) => {
      if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
      const proto = Object.getPrototypeOf(v);
      return proto === Object.prototype || proto === null;
    };

    const addDollarSign = (obj) => {
      const newObj = {};
      Object.keys(obj).forEach((key) => {
        const newKey = ['gte', 'gt', 'lte', 'lt', 'in', 'ne'].includes(key)
          ? `$${key}`
          : key;
        newObj[newKey] = isPlainObject(obj[key])
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
      // The escaping below means `new RegExp(...)` here cannot throw, so
      // the fallback catch branch was unreachable dead code — and if it
      // ever *did* run, it would use the unescaped searchTerm directly,
      // reintroducing the ReDoS this escaping exists to prevent.
      const searchRegex = new RegExp(
        searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );

      const searchConditions = searchFields.map((field) => ({
        [field]: { $regex: searchRegex },
      }));

      const searchQuery = { $or: searchConditions };
      this.query = this.query.find(searchQuery);

      this.conditions = this.conditions
        ? { $and: [this.conditions, searchQuery] }
        : searchQuery;
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
      const hiddenFields = this.getHiddenFields();
      const requestedFields = this.queryString.fields
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);

      const safeFields = requestedFields
        .filter((field) => {
          // Mongoose's "+field" syntax force-includes a select:false
          // field — strip the prefix before checking so `+password`
          // (or `+passwordResetToken`, `+active`, ...) can't be used
          // to bypass the block.
          const bareField = field.startsWith('+') ? field.slice(1) : field;
          return bareField !== '__v' && !hiddenFields.includes(bareField);
        })
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
  // `allowedFields` is a whitelist of relation paths this endpoint is
  // willing to populate for a client. Defaults to an empty array, i.e.
  // ?populate= is a no-op unless the caller explicitly opts a route in
  // — populating whatever relation name a client sends is uncontrolled
  // query-shape input (expensive or unintended joins, over-fetching
  // data the endpoint wasn't meant to expose).
  populate(allowedFields = []) {
    if (this.queryString.populate && allowedFields.length > 0) {
      const fields = this.queryString.populate.split(',');
      fields.forEach((field) => {
        const trimmedField = field.trim();
        // ✅ Only populate paths this endpoint explicitly allows
        if (allowedFields.includes(trimmedField)) {
          this.query = this.query.populate(trimmedField);
        }
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
    return this.query.countDocuments();
  }

  // 9️⃣ NEW: Add custom query conditions
  where(conditions) {
    this.query = this.query.where(conditions);
    return this;
  }
}

module.exports = APIFeatures;
