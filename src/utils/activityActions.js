/**
 * Single source of truth for every action string ActivityLog will accept.
 * Both the Mongoose schema enum and any validation/UI code that needs to
 * know the valid set should import from here instead of hardcoding the
 * list a second time.
 *
 * Grouped by domain purely for readability — Mongo/Joi only see the flat
 * array below.
 */
const ACTIVITY_ACTIONS = [
  // Auth
  'signed_up',
  'login',
  'logout',
  'requested_password_reset',
  'reset_password',
  'updated_password',

  // Profile / account
  'updated_profile',
  'deactivated_account',

  // Track enrollment lifecycle
  'requested_track_enrollment',
  'approved_track_enrollment',
  'rejected_track_enrollment',
  'enrolled_in_track',
  'requested_track_leave',
  'approved_track_leave',
  'rejected_track_leave',
  'left_track',

  // Course / session enrollment
  'enrolled_in_course',
  'left_course',
  'enrolled_in_session',
  'left_session',

  // Content authoring — track/course/session
  'created_track',
  'updated_track',
  'deleted_track',
  'created_course',
  'updated_course',
  'deleted_course',
  'created_session',
  'updated_session',
  'deleted_session',

  // Events
  'created_event',
  'updated_event',
  'deleted_event',
  'rsvped_to_event',
  'cancelled_event_rsvp',

  // Announcements
  'created_announcement',
  'updated_announcement',
  'deleted_announcement',

  // Assignments
  'created_assignment',
  'updated_assignment',
  'deleted_assignment',
  'submitted_assignment',
  'graded_assignment',

  // Weekly tasks
  'created_weekly_task',
  'updated_weekly_task',
  'deleted_weekly_task',
  'completed_weekly_task_item',

  // Reviews
  'created_review',
  'deleted_review',

  // Contact form
  'submitted_contact_form',

  // Admin / user management
  'created_user',
  'updated_user',
  'deleted_user',
  'bulk_user_action',

  // Catch-all for anything not worth a dedicated constant yet
  'other',
];

module.exports = { ACTIVITY_ACTIONS };
