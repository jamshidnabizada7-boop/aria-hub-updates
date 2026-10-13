import { expect, test } from 'bun:test';
import { verifiedStory } from '../src/lib/social/facebook-story-result';

test('verifies actual Meta responses without accepting a different or archived Story', () => {
  const data = [{ post_id: 'other', status: 'published', media_id: 'other-photo' }, { post_id: 'exact', status: 'published', media_id: 'photo', url: 'https://facebook.com/stories/exact' }];
  expect(verifiedStory(data, 'exact')?.url).toBe('https://facebook.com/stories/exact');
  expect(verifiedStory(data, undefined, 'photo')?.post_id).toBe('exact');
  expect(verifiedStory(data, 'missing', 'photo')).toBeUndefined();
  expect(verifiedStory([{ post_id: 'exact', status: 'ARCHIVED' }], 'exact')).toBeUndefined();
  expect(verifiedStory([{ post_id: 'exact', status: 'PUBLISHED' }], 'exact')?.post_id).toBe('exact');
  expect(verifiedStory(data)).toBeUndefined();
  expect(verifiedStory(null, 'exact')).toBeUndefined();
});
