const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const policy = require('../services/policy.service');

const LABELS = {
  track: 'Track',
  course: 'Course',
  session: 'Session',
  assignment: 'Assignment',
  weeklyTask: 'WeeklyTask',
};

/**
 * Stage 4 replacement for `checkOwnership` on tracks, courses, sessions,
 * assignments and weekly tasks (round-2 #2.3-#2.5, Q3, Q10).
 *
 * Allows the request when `policy.decideManage` says the caller can manage
 * the resource under the CURRENT-state rule documented in
 * `services/policy.service.js` (admin, or a currently-instructor-role user
 * who is the item's / its course's instructor or its track's lead or
 * co-instructor). Never grants access because the caller created the item.
 *
 * Behaviour matches what `checkOwnership` did for callers that fail the
 * check: admins skip the lookup entirely; a missing resource is 404
 * `<Model> not found`; anyone else who is not allowed gets the same 403
 * message as before. The resolved documents stay cached on
 * `req.policyCache`, so a later check in the same request is free.
 *
 * @param {Object} options
 * @param {'track'|'course'|'session'|'assignment'|'weeklyTask'} options.resource
 * @param {string} [options.paramName='id'] - route param holding the id
 */
const requireManage = ({ resource, paramName = 'id' }) =>
  catchAsync(async (req, res, next) => {
    if (policy.isAdmin(req.user)) return next();

    const decision = await policy.decideManage(
      req,
      req.user,
      resource,
      req.params[paramName],
    );

    if (decision === policy.DECISION.MISSING) {
      return next(new AppError(`${LABELS[resource]} not found`, 404));
    }
    if (decision !== policy.DECISION.ALLOWED) {
      return next(new AppError('You can only modify your own content', 403));
    }
    return next();
  });

/**
 * Rule 4 guard for PATCH/DELETE /tracks/:trackId/(courses|sessions)/:id.
 * Link: admin, or the item's own instructor who also leads / co-instructs
 * the TARGET track. Unlink: admin, track staff, or the item's own
 * instructor. Never based on who created anything.
 * @param {{ kind: 'course'|'session', mode: 'link'|'unlink' }} options
 */
const requireTrackLink = ({ kind, mode }) =>
  catchAsync(async (req, res, next) => {
    if (policy.isAdmin(req.user)) return next();

    const decision = await policy.decideLink(
      req,
      req.user,
      kind,
      req.params[`${kind}Id`],
      req.params.trackId,
      mode,
    );

    if (decision === policy.DECISION.MISSING) {
      return next(new AppError('Track or item not found', 404));
    }
    if (decision !== policy.DECISION.ALLOWED) {
      return next(
        new AppError(
          mode === 'link'
            ? 'You can only link your own course or session to a track you lead or co-instruct'
            : 'You can only unlink content you own or from a track you manage',
          403,
        ),
      );
    }
    return next();
  });

module.exports = { requireManage, requireTrackLink };
