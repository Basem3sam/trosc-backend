const policy = require('../../src/services/policy.service');

describe('policy.service', () => {
  const admin = { id: 'admin1', role: 'admin' };
  const instructor = { id: 'inst1', role: 'instructor' };
  const otherInstructor = { id: 'inst2', role: 'instructor' };
  const student = { id: 'stu1', role: 'student' };

  describe('isAdmin', () => {
    it('is true only for role admin', () => {
      expect(policy.isAdmin(admin)).toBe(true);
      expect(policy.isAdmin(instructor)).toBe(false);
      expect(policy.isAdmin(null)).toBe(false);
      expect(policy.isAdmin(undefined)).toBe(false);
    });
  });

  describe('isOwnerOf', () => {
    it('matches a bare ObjectId-like string owner field', () => {
      const resource = { instructor: 'inst1' };
      expect(policy.isOwnerOf(resource, instructor)).toBe(true);
      expect(policy.isOwnerOf(resource, otherInstructor)).toBe(false);
    });

    it('matches a populated sub-document owner field via _id', () => {
      const resource = { instructor: { _id: 'inst1', name: 'Bob' } };
      expect(policy.isOwnerOf(resource, instructor)).toBe(true);
    });

    it('supports a custom ownerField', () => {
      const resource = { createdBy: 'inst1' };
      expect(policy.isOwnerOf(resource, instructor, 'createdBy')).toBe(true);
      expect(policy.isOwnerOf(resource, instructor, 'instructor')).toBe(false);
    });

    it('is false with no user or no resource', () => {
      expect(policy.isOwnerOf({ instructor: 'inst1' }, null)).toBe(false);
      expect(policy.isOwnerOf(null, instructor)).toBe(false);
    });
  });

  describe('canViewDraft', () => {
    const resource = { instructor: 'inst1' };

    it('admin can always view a draft', () => {
      expect(policy.canViewDraft(resource, admin)).toBe(true);
    });

    it('the current owner can view their own draft', () => {
      expect(policy.canViewDraft(resource, instructor)).toBe(true);
    });

    it('a non-owner, non-admin cannot view the draft', () => {
      expect(policy.canViewDraft(resource, otherInstructor)).toBe(false);
      expect(policy.canViewDraft(resource, student)).toBe(false);
      expect(policy.canViewDraft(resource, null)).toBe(false);
    });
  });

  describe('canViewResource', () => {
    it('a published resource is visible to anyone, including anonymous', () => {
      const resource = { published: true, instructor: 'inst1' };
      expect(policy.canViewResource(resource, null)).toBe(true);
      expect(policy.canViewResource(resource, student)).toBe(true);
    });

    it('an unpublished resource follows the same rule as canViewDraft', () => {
      const resource = { published: false, instructor: 'inst1' };
      expect(policy.canViewResource(resource, admin)).toBe(true);
      expect(policy.canViewResource(resource, instructor)).toBe(true);
      expect(policy.canViewResource(resource, otherInstructor)).toBe(false);
      expect(policy.canViewResource(resource, null)).toBe(false);
    });
  });

  describe('publishedListFilter', () => {
    it('admin gets no restriction', () => {
      expect(policy.publishedListFilter(admin)).toEqual({});
    });

    it('anonymous only sees published', () => {
      expect(policy.publishedListFilter(null)).toEqual({ published: true });
    });

    it('an authenticated non-admin sees published OR their own', () => {
      expect(policy.publishedListFilter(instructor)).toEqual({
        $or: [{ published: true }, { instructor: 'inst1' }],
      });
    });

    it('supports a custom ownerField', () => {
      expect(policy.publishedListFilter(instructor, 'createdBy')).toEqual({
        $or: [{ published: true }, { createdBy: 'inst1' }],
      });
    });
  });
});
