import { Transform } from 'node:stream'

/**
 * Create a progress tracking transform stream
 * @param {EventEmitter} emitter - Event emitter to emit progress events
 * @param {Object} eventData - Base event data to include in progress events
 * @returns {Transform} Transform stream that tracks progress
 */
export function createProgressTracker(emitter, eventData) {
  let currentSize = 0

  return new Transform({
    transform(chunk, encoding, callback) {
      currentSize += chunk.length
      emitter.emit('progress', {
        ...eventData,
        currentSize,
        currentChunkSize: chunk.length,
      })
      callback(null, chunk)
    },
  })
}

