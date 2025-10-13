import { Transform } from 'node:stream'
import { EventEmitter } from 'node:events'

/**
 * Create a progress tracking transform stream
 * @param emitter - Event emitter to emit progress events
 * @param eventData - Base event data to include in progress events
 * @returns Transform stream that tracks progress
 */
export function createProgressTracker(emitter: EventEmitter, eventData: Record<string, any>): Transform
