module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ['airbnb-base', 'prettier'],
  plugins: ['prettier'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'script', // this codebase uses CommonJS (require/module.exports), not ESM
  },
  rules: {
    'prettier/prettier': 'warn',

    // Mongoose documents use `_id`/`__v`, and the codebase reads `req.user._id`
    // and similar throughout — airbnb's default ban on leading/trailing
    // underscores isn't useful here.
    'no-underscore-dangle': 'off',

    // Controllers/services routinely mutate `req.body` (stripping
    // user-supplied fields before trusting it) and mutate Mongoose documents
    // in place (`session.course = null`, `track.students.push(id)`, etc.).
    // Still forbid reassigning the parameter itself, just not its properties.
    'no-param-reassign': ['error', { props: false }],

    // Many service functions throw an AppError in some branches and return
    // a value in others; airbnb's strict consistent-return isn't a good fit
    // for the throw-early style used throughout this codebase.
    'consistent-return': 'off',

    // ownership.middleware.js intentionally requires a model by name at
    // runtime (`require(\`../models/${model}.model\`)`) to stay generic
    // across resource types — that's a deliberate dynamic require, not an
    // accident.
    'global-require': 'off',
    'import/no-dynamic-require': 'off',

    // Every Express handler wrapped in catchAsync declares (req, res, next)
    // for signature consistency even when it never calls next() itself
    // (errors are forwarded automatically by catchAsync). Don't flag that.
    'no-unused-vars': [
      'error',
      { args: 'after-used', argsIgnorePattern: '^next$' },
    ],

    // Swagger/JSDoc blocks in the models routinely exceed 100 chars on a
    // single line; don't fight the doc generator over comment width.
    'max-len': [
      'warn',
      {
        code: 100,
        comments: 100,
        ignoreComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
      },
    ],
  },
  overrides: [
    {
      files: ['tests/**/*.js'],
      rules: {
        // Test files legitimately import devDependencies (jest, supertest,
        // mongodb-memory-server helpers); airbnb-base's default glob list
        // already covers most of this, but be explicit for this repo's layout.
        'import/no-extraneous-dependencies': [
          'error',
          { devDependencies: true },
        ],
      },
    },
  ],
};
