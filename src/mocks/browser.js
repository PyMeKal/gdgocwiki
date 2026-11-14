import { setupWorker } from 'msw/browser'
import { configureDbStorage } from './db.js'
import { openMockStorage } from './storage.js'
import { handlers } from './handlers.js'

configureDbStorage(openMockStorage())

export const worker = setupWorker(...handlers)
