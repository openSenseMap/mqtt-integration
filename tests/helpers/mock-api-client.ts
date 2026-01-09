import { vi } from 'vitest'
import { ApiClient } from '../../src/api-client'

export const createMockApiClient = () => {
  return {
    sendMeasurements: vi.fn().mockResolvedValue(undefined),
  } as unknown as ApiClient
}
