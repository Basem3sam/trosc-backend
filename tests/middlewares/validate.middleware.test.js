const Joi = require('joi');
const validate = require('../../src/middlewares/validate.middleware');

function mockReqRes(body) {
  const req = { body };
  const res = {};
  const next = jest.fn();
  return { req, res, next };
}

describe('validate.middleware', () => {
  it('unwraps a { body, params, query } structured schema for the given source', () => {
    const structuredSchema = {
      body: Joi.object({ title: Joi.string().required() }),
    };
    const { req, res, next } = mockReqRes({ title: 'Hello' });

    validate(structuredSchema, 'body')(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ title: 'Hello' });
  });

  it('calls next with a 500 AppError when given an invalid schema', () => {
    const { req, res, next } = mockReqRes({ title: 'Hello' });

    validate({ notASchema: true }, 'body')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(500);
    expect(err.message).toBe('Invalid validation schema provided');
  });
});
