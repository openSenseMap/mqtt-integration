import { describe, it, expect, vi } from 'vitest'
import { MessageProcessor } from '../../src/message-processor'
import { createMockApiClient } from '../helpers/mock-api-client'

describe('MessageProcessor', () => {
  const deviceId = 'device-123'
  const topic = 'test/topic'

  it('skips messages for unknown devices', () => {
    const apiClient = createMockApiClient()
    const processor = new MessageProcessor(apiClient)

    processor.processMessage(deviceId, topic, Buffer.from('{}'))

    expect(apiClient.sendMeasurements).not.toHaveBeenCalled()
  })

  it('decodes and batches measurements', async () => {
    vi.useFakeTimers()

    const apiClient = createMockApiClient()
    const processor = new MessageProcessor(apiClient)

    processor.setDeviceFormat(deviceId, 'json')

    processor.processMessage(
      deviceId,
      topic,
      Buffer.from(JSON.stringify({ sensor1: 42 })),
    )

    // Flush batch timer
    vi.runAllTimers()

    expect(apiClient.sendMeasurements).toHaveBeenCalledOnce()
    expect(apiClient.sendMeasurements).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId,
        measurements: [
          expect.objectContaining({
            sensor_id: 'sensor1',
            value: 42,
          }),
        ],
      }),
    )

    vi.useRealTimers()
  })
})
