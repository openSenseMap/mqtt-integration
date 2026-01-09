import { logger } from "./logger.js";
import { config } from "./config.js";
import { ApiClient } from "./api-client.js";
import { MessageDecoder, type MessageFormat } from "./decoders.js";
import type { MeasurementBatch, ParsedMeasurement } from "./types.js";

interface DeviceFormat {
  format: MessageFormat;
  options?: any;
}

export class MessageProcessor {
  private apiClient: ApiClient;
  private batches: Map<string, ParsedMeasurement[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private deviceFormats: Map<string, DeviceFormat> = new Map();

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Store message format configuration for a device
   */
  setDeviceFormat(
    deviceId: string,
    format: MessageFormat,
    options?: any
  ): void {
    this.deviceFormats.set(deviceId, { format, options });
    logger.debug(`Set message format for device ${deviceId}: ${format}`);
  }

  /**
   * Process incoming MQTT message
   */
  processMessage(deviceId: string, topic: string, message: Buffer): void {
    try {
      const formatInfo = this.deviceFormats.get(deviceId);
      if (!formatInfo) {
        logger.warn(`No format info for device ${deviceId}, skipping message`);
        return;
      }

      logger.debug(`Processing message for device ${deviceId}`, {
        topic,
        messageSize: message.length,
      });

      // Decode message using appropriate decoder
      const decoded = MessageDecoder.decode(
        message,
        formatInfo.format,
        formatInfo.options
      );

      logger.info(
        `📨 Decoded ${decoded.length} measurements for device ${deviceId}`
      );

      this.addToBatch(deviceId, decoded);
    } catch (err) {
      logger.error(`Failed to process message for device ${deviceId}`, {
        error: err,
        topic,
      });
    }
  }

  /**
   * Add measurements to batch queue
   */
  private addToBatch(
    deviceId: string,
    measurements: ParsedMeasurement[]
  ): void {
    const existingBatch = this.batches.get(deviceId) || [];
    existingBatch.push(...measurements);
    this.batches.set(deviceId, existingBatch);

    // Set timer to flush if not already set
    if (!this.batchTimers.has(deviceId)) {
      const timer = setTimeout(() => {
        this.flushBatch(deviceId);
      }, config.BATCH_INTERVAL_MS);
      this.batchTimers.set(deviceId, timer);
    }

    // Flush immediately if batch is full
    if (existingBatch.length >= config.BATCH_SIZE) {
      this.flushBatch(deviceId);
    }
  }

  /**
   * Flush batch to API
   */
  private async flushBatch(deviceId: string): Promise<void> {
    const measurements = this.batches.get(deviceId);
    if (!measurements || measurements.length === 0) return;

    this.batches.delete(deviceId);
    const timer = this.batchTimers.get(deviceId);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(deviceId);
    }

    try {
      await this.apiClient.sendMeasurements({
        deviceId,
        measurements,
      });
    } catch (err) {
      logger.error(`Failed to send batch for device ${deviceId}`, {
        error: err,
        batchSize: measurements.length,
      });
      // TODO: Implement retry logic with exponential backoff
      // For now, measurements are lost on failure
    }
  }

  /**
   * Flush all pending batches (for graceful shutdown)
   */
  async flushAll(): Promise<void> {
    logger.info("Flushing all pending measurement batches...");
    const promises = Array.from(this.batches.keys()).map((deviceId) =>
      this.flushBatch(deviceId)
    );
    await Promise.all(promises);
    logger.info("All batches flushed");
  }
}
