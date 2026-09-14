const Event = require('../../src/models/event.model');
const { createTestUser } = require('../helpers/testUser');

describe('Event model', () => {
  let creator;

  beforeEach(async () => {
    creator = (await createTestUser({ role: 'admin' })).user;
  });

  describe('coverImage validator', () => {
    it('accepts a full https URL', async () => {
      const event = await Event.create({
        title: 'URL Cover Event',
        description: 'Has a full URL cover image',
        date: new Date(Date.now() + 86400000),
        locationType: 'online',
        locationLink: 'https://zoom.us/meeting/1',
        coverImage: 'https://example.com/event-cover.jpg',
        createdBy: creator._id,
      });
      expect(event.coverImage).toBe('https://example.com/event-cover.jpg');
    });

    it('accepts a bare image filename', async () => {
      const event = await Event.create({
        title: 'Filename Cover Event',
        description: 'Has a filename cover image',
        date: new Date(Date.now() + 86400000),
        locationType: 'online',
        locationLink: 'https://zoom.us/meeting/2',
        coverImage: 'event-cover.png',
        createdBy: creator._id,
      });
      expect(event.coverImage).toBe('event-cover.png');
    });

    it('rejects an invalid cover image value', async () => {
      await expect(
        Event.create({
          title: 'Bad Cover Event',
          description: 'Has an invalid cover image',
          date: new Date(Date.now() + 86400000),
          locationType: 'online',
          locationLink: 'https://zoom.us/meeting/3',
          coverImage: 'not a valid image!',
          createdBy: creator._id,
        }),
      ).rejects.toThrow('Cover image must be a valid URL or image filename');
    });
  });

  describe('locationAction virtual', () => {
    it('returns an online action when online with a link', async () => {
      const event = await Event.create({
        title: 'Online Event',
        description: 'Has a link',
        date: new Date(Date.now() + 86400000),
        locationType: 'online',
        locationLink: 'https://zoom.us/meeting/4',
        createdBy: creator._id,
      });
      expect(event.locationAction).toEqual({
        type: 'online',
        url: 'https://zoom.us/meeting/4',
        label: 'Join Zoom/Meet',
      });
    });

    it('returns an offline action when offline with an address', async () => {
      const event = await Event.create({
        title: 'Offline Event',
        description: 'Has an address',
        date: new Date(Date.now() + 86400000),
        locationType: 'offline',
        locationAddress: 'Room 101',
        createdBy: creator._id,
      });
      expect(event.locationAction.type).toBe('offline');
      expect(event.locationAction.url).toContain('Room%20101');
    });

    it('returns null when online but no link is set', async () => {
      const event = await Event.create({
        title: 'Incomplete Online Event',
        description: 'Missing its link',
        date: new Date(Date.now() + 86400000),
        locationType: 'online',
        createdBy: creator._id,
      });
      expect(event.locationAction).toBeNull();
    });

    it('returns null when offline but no address is set', async () => {
      const event = await Event.create({
        title: 'Incomplete Offline Event',
        description: 'Missing its address',
        date: new Date(Date.now() + 86400000),
        locationType: 'offline',
        createdBy: creator._id,
      });
      expect(event.locationAction).toBeNull();
    });
  });
});
