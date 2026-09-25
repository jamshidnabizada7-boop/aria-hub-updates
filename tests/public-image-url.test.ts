import { describe, expect, test } from 'bun:test';
import { isPublicImageAddress, isPublicImageUrlSyntax } from '../src/lib/import/public-image-url';

describe('imported image URL safety', () => {
  test('accepts public hosts and addresses', () => {
    expect(isPublicImageUrlSyntax('https://images.example.com/photo.jpg')).toBe(true);
    expect(isPublicImageAddress('8.8.8.8')).toBe(true);
  });

  test('blocks local, metadata, and embedded credential URLs', () => {
    for (const url of [
      'http://127.0.0.1:3000/private',
      'http://169.254.169.254/latest/meta-data',
      'http://host.internal/image',
      'https://user:password@images.example.com/x',
      'file:///etc/passwd',
    ]) expect(isPublicImageUrlSyntax(url)).toBe(false);
    expect(isPublicImageAddress('10.0.0.5')).toBe(false);
    expect(isPublicImageAddress('::1')).toBe(false);
  });
});
