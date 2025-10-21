/**
 * Unit tests for url.mjs
 */

import { describe, it, expect } from 'vitest'
import { isUrl, getFilenameFromUrl } from './url.mjs'

describe('url utils', () => {
  describe('isUrl()', () => {
    it('should return true for valid HTTP URLs', () => {
      expect(isUrl('http://example.com')).toBe(true)
      expect(isUrl('http://example.com/image.png')).toBe(true)
      expect(isUrl('http://localhost:3000/test.jpg')).toBe(true)
    })

    it('should return true for valid HTTPS URLs', () => {
      expect(isUrl('https://example.com')).toBe(true)
      expect(isUrl('https://example.com/images/test.png')).toBe(true)
      expect(isUrl('https://api.tinypng.com/output/abc123.png')).toBe(true)
    })

    it('should be case insensitive', () => {
      expect(isUrl('HTTP://example.com')).toBe(true)
      expect(isUrl('HTTPS://example.com')).toBe(true)
      expect(isUrl('HtTpS://example.com')).toBe(true)
    })

    it('should return false for non-URL strings', () => {
      expect(isUrl('not-a-url')).toBe(false)
      expect(isUrl('./relative/path.png')).toBe(false)
      expect(isUrl('/absolute/path.png')).toBe(false)
      expect(isUrl('file:///local/path.png')).toBe(false)
      expect(isUrl('ftp://example.com')).toBe(false)
    })

    it('should return false for non-string inputs', () => {
      expect(isUrl(null)).toBe(false)
      expect(isUrl(undefined)).toBe(false)
      expect(isUrl(123)).toBe(false)
      expect(isUrl({})).toBe(false)
      expect(isUrl([])).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isUrl('')).toBe(false)
    })

    it('should handle URLs with query parameters', () => {
      expect(isUrl('https://example.com/image.png?size=large')).toBe(true)
      expect(isUrl('http://example.com/test?key=value&foo=bar')).toBe(true)
    })

    it('should handle URLs with fragments', () => {
      expect(isUrl('https://example.com/page#section')).toBe(true)
      expect(isUrl('http://example.com/image.png#top')).toBe(true)
    })
  })

  describe('getFilenameFromUrl()', () => {
    it('should extract filename from simple URLs', () => {
      expect(getFilenameFromUrl('https://example.com/image.png')).toBe('image.png')
      expect(getFilenameFromUrl('http://example.com/photo.jpg')).toBe('photo.jpg')
      expect(getFilenameFromUrl('https://example.com/file.webp')).toBe('file.webp')
    })

    it('should extract filename from nested paths', () => {
      expect(getFilenameFromUrl('https://example.com/images/2024/test.png')).toBe('test.png')
      expect(getFilenameFromUrl('http://cdn.example.com/assets/img/logo.svg')).toBe('logo.svg')
    })

    it('should extract filename from URLs with query parameters', () => {
      expect(getFilenameFromUrl('https://example.com/image.png?size=large')).toBe('image.png')
      expect(getFilenameFromUrl('http://example.com/photo.jpg?v=2&format=webp')).toBe('photo.jpg')
    })

    it('should extract filename from URLs with fragments', () => {
      expect(getFilenameFromUrl('https://example.com/image.png#section')).toBe('image.png')
      expect(getFilenameFromUrl('http://example.com/photo.jpg#top')).toBe('photo.jpg')
    })

    it('should return "image" as fallback for URLs without filename', () => {
      expect(getFilenameFromUrl('https://example.com/')).toBe('image')
      expect(getFilenameFromUrl('http://example.com')).toBe('image')
      expect(getFilenameFromUrl('https://example.com/path/')).toBe('image')
    })

    it('should handle TinyPNG API URLs', () => {
      expect(getFilenameFromUrl('https://api.tinify.com/output/abc123def456.png')).toBe('abc123def456.png')
      expect(getFilenameFromUrl('https://api.tinypng.com/shrink/test-image.jpg')).toBe('test-image.jpg')
    })

    it('should handle invalid URLs gracefully', () => {
      expect(getFilenameFromUrl('not-a-url')).toBe('not-a-url')
      expect(getFilenameFromUrl('invalid://url/test.png')).toBe('test.png')
      expect(getFilenameFromUrl('')).toBe('image')
    })

    it('should handle URLs with special characters', () => {
      expect(getFilenameFromUrl('https://example.com/test%20image.png')).toBe('test%20image.png')
      expect(getFilenameFromUrl('https://example.com/file-name_123.jpg')).toBe('file-name_123.jpg')
    })

    it('should handle URLs with port numbers', () => {
      expect(getFilenameFromUrl('http://localhost:3000/image.png')).toBe('image.png')
      expect(getFilenameFromUrl('https://example.com:8080/test.jpg')).toBe('test.jpg')
    })
  })
})
