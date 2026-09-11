const { AsyncLocalStorage } = require('async_hooks');

// Mock winston and winston-daily-rotate-file
jest.mock('winston', () => {
  const format = jest.fn().mockImplementation((fn) =>
    jest.fn().mockImplementation(() => ({
      transform: fn,
    })),
  );

  format.combine = jest.fn().mockImplementation((...args) => args);
  format.timestamp = jest.fn().mockImplementation(() => jest.fn());
  format.errors = jest.fn().mockImplementation(() => jest.fn());
  format.json = jest.fn().mockImplementation(() => jest.fn());
  format.colorize = jest.fn().mockImplementation(() => jest.fn());
  format.printf = jest.fn().mockImplementation((fn) => fn);

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    add: jest.fn(),
  };

  const createLogger = jest.fn().mockReturnValue(mockLogger);
  const Console = jest.fn();

  return {
    format,
    createLogger,
    transports: {
      Console,
    },
    addColors: jest.fn(),
  };
});

jest.mock('winston-daily-rotate-file', () =>
  jest.fn().mockImplementation(() => ({})),
);

describe('Logger', () => {
  let originalEnv;
  let winston;
  let DailyRotateFile;

  beforeEach(() => {
    jest.resetModules();
    originalEnv = { ...process.env };
    process.env.NODE_ENV = 'development';
    winston = require('winston');
    DailyRotateFile = require('winston-daily-rotate-file');
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  it('creates the logger with correct level (info in production, debug otherwise)', () => {
    process.env.NODE_ENV = 'production';

    const productionWinston = require('winston');
    require('../../src/utils/logger');

    expect(productionWinston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
      }),
    );

    process.env.NODE_ENV = 'development';

    jest.resetModules();

    const developmentWinston = require('winston');
    require('../../src/utils/logger');

    expect(developmentWinston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'debug',
      }),
    );
  });

  it('uses the correct formats', () => {
    require('../../src/utils/logger');

    expect(winston.format.combine).toHaveBeenCalled();
    expect(winston.format.timestamp).toHaveBeenCalled();
    expect(winston.format.errors).toHaveBeenCalledWith({ stack: true });
    expect(winston.format.json).toHaveBeenCalled();
  });

  it('adds the console transport in all environments', () => {
    require('../../src/utils/logger');

    expect(winston.transports.Console).toHaveBeenCalled();
  });

  it('adds file transports in production', () => {
    process.env.NODE_ENV = 'production';

    jest.resetModules();

    const DailyRotateFileMock = require('winston-daily-rotate-file');

    require('../../src/utils/logger');

    expect(DailyRotateFileMock).toHaveBeenCalledTimes(2);

    expect(DailyRotateFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'logs/error-%DATE%.log',
        level: 'error',
      }),
    );

    expect(DailyRotateFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'logs/combined-%DATE%.log',
      }),
    );
  });

  it('does not add file transports in non-production', () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    require('../../src/utils/logger');
    expect(DailyRotateFile).not.toHaveBeenCalled();
  });

  describe('asyncLocalStorage', () => {
    it('exports asyncLocalStorage', () => {
      const { asyncLocalStorage } = require('../../src/utils/logger');
      expect(asyncLocalStorage).toBeInstanceOf(AsyncLocalStorage);
    });
  });

  describe('requestId injection format', () => {
    // The logger module calls `winston.format(fn)` directly once for the
    // top-level logger and once for the console transport. Both calls use
    // the same requestIdFormat factory, so we grab the first callback and
    // exercise it directly against a mock `info` object.
    function loadRequestIdFormatFn() {
      require('../../src/utils/logger');
      const [firstCall] = winston.format.mock.calls;
      if (!firstCall) {
        throw new Error(
          'winston.format() was never called — logger.js did not register requestIdFormat',
        );
      }
      return firstCall[0];
    }

    it('injects requestId from asyncLocalStorage store', () => {
      const { asyncLocalStorage } = require('../../src/utils/logger');
      const requestIdFormatFn = loadRequestIdFormatFn();

      const info = { message: 'test' };

      asyncLocalStorage.run({ requestId: 'test-request-id' }, () => {
        const result = requestIdFormatFn(info);
        expect(result.requestId).toBe('test-request-id');
      });
    });

    it('falls back to "no-request-id" when no store is set', () => {
      const requestIdFormatFn = loadRequestIdFormatFn();

      const info = { message: 'test' };

      // Deliberately not wrapped in asyncLocalStorage.run — getStore()
      // returns undefined, so the fallback branch must fire.
      const result = requestIdFormatFn(info);

      expect(result.requestId).toBe('no-request-id');
    });
  });

  it('exposes info/error/warn/debug methods on the logger', () => {
    const { logger } = require('../../src/utils/logger');

    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.debug).toBeDefined();
  });
});
