export type NativeStory = { post_id?: string; status?: string; media_id?: string; url?: string };
/** Meta currently returns lowercase status, despite uppercase documentation examples. */
export function verifiedStory(data: unknown, id?: string, photoId?: string): NativeStory | undefined {
  if (!Array.isArray(data) || !id && !photoId) return undefined;
  return data.find((story: NativeStory) => story && String(story.status).toLowerCase() === 'published' &&
    (id ? String(story.post_id) === id : String(story.media_id) === photoId));
}
