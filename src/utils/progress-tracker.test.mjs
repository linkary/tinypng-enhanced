/**
 * Vitest tests for progress-tracker.mjs
 */

import { describe, it, expect, vi } from 'vitest'
import { createProgressTracker } from './progress-tracker.mjs'
import { Readable, Transform } from 'node:stream'
import { EventEmitter } from 'node:events'

describe('progress-tracker - createProgressTracker()', () => {
  describe('Basic Functionality', () => {
    it('should create a Transform stream', () => {
      const emitter = new EventEmitter()
      const tracker = createProgressTracker(emitter, {})

      expect(tracker).toBeInstanceOf(Transform)
    })

    it('should emit progress events', async () => {
      const emitter = new EventEmitter()
      const eventData = { filename: 'test.txt' }
      const tracker = createProgressTracker(emitter, eventData)

      const progressEvents = []
      emitter.on('progress', data => progressEvents.push(data))

      const source = Readable.from(['chunk1', 'chunk2'])
      const trackedStream = source.pipe(tracker)

      // Consume the stream
      for await (const chunk of trackedStream) {
        // Just consume
      }

      expect(progressEvents.length).toBeGreaterThan(0)
    })

    it('should include base event data in progress events', async () => {
      const emitter = new EventEmitter()
      const eventData = { filename: 'test.txt', type: 'upload' }
      const tracker = createProgressTracker(emitter, eventData)

      const progressEvents = []
      emitter.on('progress', data => progressEvents.push(data))

      const source = Readable.from(['test'])
      const trackedStream = source.pipe(tracker)

      for await (const chunk of trackedStream) {
        // Consume
      }

      expect(progressEvents[0]).toMatchObject(eventData)
    })

    it('should track cumulative size', async () => {
      const emitter = new EventEmitter()
      const tracker = createProgressTracker(emitter, {})

      const progressEvents = []
      emitter.on('progress', data => progressEvents.push(data))

      const chunks = ['chunk1', 'chunk2', 'chunk3']
      const source = Readable.from(chunks)
      const trackedStream = source.pipe(tracker)

      for await (const chunk of trackedStream) {
        // Consume
      }

      // Check cumulative sizes
      expect(progressEvents[0].currentSize).toBe(Buffer.from('chunk1').length)
      expect(progressEvents[1].currentSize).toBe(Buffer.from('chunk1').length + Buffer.from('chunk2').length)
      expect(progressEvents[2].currentSize).toBe(
        Buffer.from('chunk1').length + Buffer.from('chunk2').length + Buffer.from('chunk3').length
      )
    })

    it('should track current chunk size', async () => {
      const emitter = new EventEmitter()
      const tracker = createProgressTracker(emitter, {})

      const progressEvents = []
      emitter.on('progress', data => progressEvents.push(data))

      const source = Readable.from(['abc', 'defgh'])
      const trackedStream = source.pipe(tracker)

      for await (const chunk of trackedStream) {
        // Consume
      }

      expect(progressEvents[0].currentChunkSize).toBe(3) // 'abc'
      expect(progressEvents[1].currentChunkSize).toBe(5) // 'defgh'
    })
  })

  describe('Data Pass-through', () => {
    it('should pass data through unchanged', async () => {
      const emitter = new EventEmitter()
      const tracker = createProgressTracker(emitter, {})

      const inputData = 'Hello World!'
      const source = Readable.from([Buffer.from(inputData)])
      const trackedStream = source.pipe(tracker)

      const outputChunks = []
      for await (const chunk of trackedStream) {
        outputChunks.push(chunk)
      }

      const output = Buffer.concat(outputChunks).toString()
      expect(output).toBe(inputData)
    })

    it('should maintain data integrity', async () => {
      const emitter = new EventEmitter()
      const tracker = createProgressTracker(emitter, {})

      const chunks = ['chunk1', 'chunk2', 'chunk3']
      const inputData = chunks.join('')
      const source = Readable.from(chunks.map(c => Buffer.from(c)))
      const trackedStream = source.pipe(tracker)

      const outputChunks = []
      for await (const chunk of trackedStream) {
        outputChunks.push(chunk)
      }

      const output = Buffer.concat(outputChunks).toString()
      expect(output).toBe(inputData)
    })

    it('should handle binary data', async () => {
      const emitter = new EventEmitter()
      const tracker = createProgressTracker(emitter, {})

      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff])
      const source = Readable.from([binaryData])
      const trackedStream = source.pipe(tracker)

      const outputChunks = []
      for await (const chunk of trackedStream) {
        outputChunks.push(chunk)
      }

      expect(Buffer.concat(outputChunks)).toEqual(binaryData)
    })
  })

  describe('Progress Event Data', () => {
    it('should include all required properties in progress events', async () => {
      const emitter = new EventEmitter()
      const eventData = { filename: 'test.txt' }
      const tracker = createProgressTracker(emitter, eventData)

      const progressEvents = []
      emitter.on('progress', data => progressEvents.push(data))

      const source = Readable.from(['test'])
      const trackedStream = source.pipe(tracker)

      for await (const chunk of trackedStream) {
        // Consume
      }

      const event = progressEvents[0]
      expect(event).toHaveProperty('filename')
      expect(event).toHaveProperty('currentSize')
      expect(event).toHaveProperty('currentChunkSize')
    })

    it('should emit progress event for each chunk', async () => {
      const emitter = new EventEmitter()
      const tracker = createProgressTracker(emitter, {})

      let eventCount = 0
      emitter.on('progress', () => eventCount++)

      const chunks = ['1', '2', '3', '4', '5']
      const source = Readable.from(chunks)
      const trackedStream = source.pipe(tracker)

      for await (const chunk of trackedStream) {
        // Consume
      }

      expect(eventCount).toBe(5)
    })

    it('should start counting from zero', async () => {
      const emitter = new EventEmitter()
      const tracker = createProgressTracker(emitter, {})

      const progressEvents = []
      emitter.on('progress', data => progressEvents.push(data))

      const source = Readable.from(['first'])
      const trackedStream = source.pipe(tracker)

      for await (const chunk of trackedStream) {
        // Consume
      }

      expect(progressEvents[0].currentSize).toBe(5) // 'first'.length
    })

    it('should merge custom event data correctly', async () => {
      const emitter = new EventEmitter()
      const eventData = {
        filename: 'test.txt',
        totalSize: 1000,
        customProp: 'custom',
      }
      const tracker = createProgressTracker(emitter, eventData)

      const progressEvents = []
      emitter.on('progress', data => progressEvents.push(data))

      const source = Readable.from(['test'])
      const trackedStream = source.pipe(tracker)

      for await (const chunk of trackedStream) {
        // Consume
      }

      const event = progressEvents[0]
      expect(event.filename).toBe('test.txt')
      expect(event.totalSize).toBe(1000)
      expect(event.customProp).toBe('custom')
      expect(event.currentSize).toBeDefined()
      expect(event.currentChunkSize).toBeDefined()
    })
  })

  describe('Multiple Emitters', () => {
    it('should support multiple listeners', async () => {
      const emitter = new EventEmitter()
      const tracker = createProgressTracker(emitter, {})

      let listener1Count = 0
      let listener2Count = 0

      emitter.on('progress', () => listener1Count++)
      emitter.on('progress', () => listener2Count++)

      const source = Readable.from(['test'])
      const trackedStream = source.pipe(tracker)

      for await (const chunk of trackedStream) {
        // Consume
      }

      expect(listener1Count).toBe(1)
      expect(listener2Count).toBe(1)
    })

    it('should emit events to correct emitter', async () => {
      const emitter1 = new EventEmitter()
      const emitter2 = new EventEmitter()

      const tracker = createProgressTracker(emitter1, {})

      let emitter1Events = 0
      let emitter2Events = 0

      emitter1.on('progress', () => emitter1Events++)
      emitter2.on('progress', () => emitter2Events++)

      const source = Readable.from(['test'])
      const trackedStream = source.pipe(tracker)

      for await (const chunk of trackedStream) {
        // Consume
      }

      expect(emitter1Events).toBeGreaterThan(0)
      expect(emitter2Events).toBe(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty stream', async () => {
      const emitter = new EventEmitter()
      const tracker = createProgressTracker(emitter, {})

      let eventCount = 0
      emitter.on('progress', () => eventCount++)

      const source = Readable.from([])
      const trackedStream = source.pipe(tracker)

      for await (const chunk of trackedStream) {
        // Consume
      }

      expect(eventCount).toBe(0)
    })

    it('should handle single byte chunks', async () => {
      const emitter = new EventEmitter()
      const tracker = createProgressTracker(emitter, {})

      const progressEvents = []
      emitter.on('progress', data => progressEvents.push(data))

      const source = Readable.from([Buffer.from([0x01]), Buffer.from([0x02]), Buffer.from([0x03])])
      const trackedStream = source.pipe(tracker)

      for await (const chunk of trackedStream) {
        // Consume
      }

      expect(progressEvents.length).toBe(3)
      expect(progressEvents[0].currentChunkSize).toBe(1)
      expect(progressEvents[1].currentChunkSize).toBe(1)
      expect(progressEvents[2].currentChunkSize).toBe(1)
    })

    it('should handle large chunks', async () => {
      const emitter = new EventEmitter()
      const tracker = createProgressTracker(emitter, {})

      const progressEvents = []
      emitter.on('progress', data => progressEvents.push(data))

      const largeChunk = Buffer.alloc(100000, 'X')
      const source = Readable.from([largeChunk])
      const trackedStream = source.pipe(tracker)

      for await (const chunk of trackedStream) {
        // Consume
      }

      expect(progressEvents[0].currentChunkSize).toBe(100000)
      expect(progressEvents[0].currentSize).toBe(100000)
    })

    it('should handle zero-byte chunks', async () => {
      const emitter = new EventEmitter()
      const tracker = createProgressTracker(emitter, {})

      const progressEvents = []
      emitter.on('progress', data => progressEvents.push(data))

      const source = Readable.from([Buffer.alloc(0)])
      const trackedStream = source.pipe(tracker)

      for await (const chunk of trackedStream) {
        // Consume
      }

      // Zero-byte chunks should not emit progress events
      // or should emit with zero currentChunkSize
      if (progressEvents.length > 0) {
        expect(progressEvents[0].currentChunkSize).toBe(0)
      }
    })
  })

  describe('Performance', () => {
    it('should track many chunks efficiently', async () => {
      const emitter = new EventEmitter()
      const tracker = createProgressTracker(emitter, {})

      let eventCount = 0
      emitter.on('progress', () => eventCount++)

      const chunks = Array(1000).fill('X')
      const source = Readable.from(chunks)
      const trackedStream = source.pipe(tracker)

      for await (const chunk of trackedStream) {
        // Consume
      }

      expect(eventCount).toBe(1000)
    })

    it('should maintain accurate cumulative size with many chunks', async () => {
      const emitter = new EventEmitter()
      const tracker = createProgressTracker(emitter, {})

      const progressEvents = []
      emitter.on('progress', data => progressEvents.push(data))

      const chunkSize = 100
      const numChunks = 100
      const chunks = Array(numChunks).fill('X'.repeat(chunkSize))
      const source = Readable.from(chunks)
      const trackedStream = source.pipe(tracker)

      for await (const chunk of trackedStream) {
        // Consume
      }

      const lastEvent = progressEvents[progressEvents.length - 1]
      expect(lastEvent.currentSize).toBe(chunkSize * numChunks)
    })
  })
})
