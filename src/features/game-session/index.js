/**
 * Game Session — server entry (Task 4.4).
 *
 * Public server-side surface for the session service, central scoring, and
 * repositories. Deliberately NOT imported by client code — the browser only
 * ever talks to the API (see `api/client.js`).
 */

export { GameSessionService, createDefaultServerActivityEngine } from './service/game-session-service.js'
export { centralScoring } from './scoring/central-scoring-service.js'
export { buildSafeRoundDescriptor, toPublicSession } from './security/safe-descriptor.js'
export { createGameApi, STUDENT_ID_HEADER, errorToHttp } from './api/server.js'
export { createRepositories, createMemoryRepositories, createMemoryStore } from './repositories/index.js'
export { demoBaseData, seedStoreFromBaseData, demoQuestions, DEMO_STUDENT_ID, DEMO_STREAM_ID, DEMO_LEVEL_ID } from './demo/seed-data.js'