import { logger } from "./logger";
import type { DecodedMeasurement } from "./types";

export type MessageFormat = "json" | "csv" | "application/json";

export class MessageDecoder {
  static decode(
    message: Buffer,
    format: MessageFormat,
    decodeOptions?: any
  ): DecodedMeasurement[] {
    const messageStr = message.toString();
    logger.debug(`Decoding message with format: ${format}`);

    try {
      switch (format) {
        case "json":
        case "application/json":
          return this.decodeJson(messageStr, decodeOptions);
        case "csv":
          return this.decodeCsv(messageStr, decodeOptions);
        default:
          throw new Error(`Unsupported message format: ${format}`);
      }
    } catch (err) {
      logger.error(`Failed to decode message with format ${format}`, {
        error: err,
      });
      throw err;
    }
  }

  /**
   * Decode JSON formatted messages
   * Supports multiple formats:
   * - Array: [{ sensor: "id", value: 123 }, ...]
   * - Object with sensor_id keys: { "sensor1": 123, "sensor2": 456 }
   * - Single measurement: { sensor: "id", value: 123 }
   */
  private static decodeJson(
    message: string,
    options?: any
  ): DecodedMeasurement[] {
    const data = JSON.parse(message);

    // Handle array of measurements
    if (Array.isArray(data)) {
      return data.map((item) => this.extractMeasurement(item));
    }

    // Handle single measurement object
    if (this.isMeasurementObject(data)) {
      return [this.extractMeasurement(data)];
    }

    // Handle object with sensor_id: value pairs
    if (typeof data === "object" && data !== null) {
      return Object.entries(data).map(([sensorId, value]) => ({
        sensor_id: sensorId,
        value: this.parseValue(value),
        createdAt: new Date().toISOString(),
      }));
    }

    throw new Error("Unexpected JSON format");
  }

  /**
   * Check if object looks like a measurement
   */
  private static isMeasurementObject(obj: any): boolean {
    return (
      obj &&
      typeof obj === "object" &&
      (obj.sensor || obj.sensor_id || obj.sensorId) &&
      (obj.value !== undefined || obj.val !== undefined)
    );
  }

  private static extractMeasurement(item: any): DecodedMeasurement {
    const sensorId = item.sensor || item.sensor_id || item.sensorId || item.id;
    const value = item.value !== undefined ? item.value : item.val;
    const timestamp =
      item.createdAt || item.timestamp || item.time || new Date().toISOString();

    if (!sensorId) {
      throw new Error("Missing sensor ID in measurement");
    }
    if (value === undefined) {
      throw new Error("Missing value in measurement");
    }

    // Extract location if present
    let location;
    if (item.location) {
      location = {
        lat: item.location.lat || item.location.latitude,
        lng: item.location.lng || item.location.longitude || item.location.lon,
        altitude: item.location.altitude || item.location.alt,
      };
    } else if (item.lat !== undefined && item.lng !== undefined) {
      location = {
        lat: item.lat,
        lng: item.lng,
        altitude: item.altitude || item.alt,
      };
    }

    return {
      sensor_id: String(sensorId),
      value: this.parseValue(value),
      createdAt: timestamp,
      location,
    };
  }

  /**
   * Decode CSV formatted messages
   * Formats supported:
   * - With options (sensor ID mapping): value1,value2,value3
   * - Without options: sensor_id,value[,timestamp]
   */
  private static decodeCsv(
    message: string,
    options?: string[]
  ): DecodedMeasurement[] {
    const lines = message
      .trim()
      .split("\n")
      .filter((line) => line.trim().length > 0);
    const measurements: DecodedMeasurement[] = [];

    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());

      if (options && Array.isArray(options)) {
        // Use options as sensor ID mapping
        parts.forEach((value, index) => {
          if (options[index] && value) {
            measurements.push({
              sensor_id: options[index],
              value: this.parseValue(value),
              createdAt: new Date().toISOString(),
            });
          }
        });
      } else {
        // Expect format: sensor_id,value[,timestamp][,lat,lng]
        if (parts.length >= 2) {
          const measurement: DecodedMeasurement = {
            sensor_id: parts[0],
            value: this.parseValue(parts[1]),
            createdAt: parts[2] || new Date().toISOString(),
          };

          // Optional location (lat, lng)
          if (parts.length >= 5) {
            measurement.location = {
              lat: parseFloat(parts[3]),
              lng: parseFloat(parts[4]),
              altitude: parts[5] ? parseFloat(parts[5]) : undefined,
            };
          }

          measurements.push(measurement);
        }
      }
    }

    return measurements;
  }

  /**
   * Parse value to number, handling various formats
   */
  private static parseValue(value: any): number {
    if (typeof value === "number") {
      return value;
    }

    const parsed = parseFloat(String(value));
    if (isNaN(parsed)) {
      throw new Error(`Cannot parse value as number: ${value}`);
    }

    return parsed;
  }
}
