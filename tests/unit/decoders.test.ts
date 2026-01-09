import { describe, it, expect } from 'vitest'
import { MessageDecoder } from '../../src/decoders'
import type { MessageFormat } from '../../src/decoders'

describe('MessageDecoder', () => {
  const buffer = (value: string) => Buffer.from(value)

  describe('JSON decoding', () => {
    it('decodes an object of sensorId → value pairs', () => {
      const payload = buffer(
        JSON.stringify({
          sensorA: 12.3,
          sensorB: 45.6,
        }),
      )

      const result = MessageDecoder.decode(payload, 'json')

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        sensor_id: 'sensorA',
        value: 12.3,
      })
    })

    it('throws on invalid JSON', () => {
      expect(() =>
        MessageDecoder.decode(buffer('{invalid'), 'json'),
      ).toThrow()
    })
  })

  describe('CSV decoding', () => {
    it('decodes CSV with explicit sensor IDs', () => {
      const payload = buffer('sensor1,10\nsensor2,20')

      const result = MessageDecoder.decode(payload, 'csv')

      expect(result).toEqual([
        expect.objectContaining({ sensor_id: 'sensor1', value: 10 }),
        expect.objectContaining({ sensor_id: 'sensor2', value: 20 }),
      ])
    })

    it('uses decodeOptions as sensor mapping', () => {
      const payload = buffer('10,20')

      const result = MessageDecoder.decode(payload, 'csv', [
        'sensor1',
        'sensor2',
      ])

      expect(result).toHaveLength(2)
      expect(result[1].sensor_id).toBe('sensor2')
    })
  })

  describe('Unsupported formats', () => {
    it('throws for unsupported messageFormat', () => {
      expect(() =>
        MessageDecoder.decode(
          buffer('test'),
          'debug_plain' as MessageFormat,
        ),
      ).toThrow('Unsupported message format')
    })
  })
})
