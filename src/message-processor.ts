import { logger } from "./logger";
import { ApiClient } from "./api-client";
import { MessageDecoder, type MessageFormat } from "./decoders";
import type { MqttIntegration } from "./types";

export class MessageProcessor {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Process incoming MQTT message
   */
  async processMessage(
    integration: MqttIntegration,
    topic: string,
    message: Buffer
  ): Promise<void> {
    try {
      logger.debug(`Processing message for device ${integration.deviceId}`, {
        topic,
        messageSize: message.length,
        messageContent: message.toString(), 
      });

      // Decode message using appropriate decoder
      const decoded = MessageDecoder.decode(
        message,
        integration.messageFormat,
        integration.decodeOptions
      );

      if (decoded.length === 0) {
        logger.warn(`No measurements decoded for device ${integration.deviceId}`);
        return;
      }

      logger.info(
        `📨 Decoded ${decoded.length} measurements for device ${integration.deviceId}`
      );

      // Send to OpenSenseMap API immediately
      await this.apiClient.sendMeasurements({
        deviceId: integration.deviceId,
        measurements: decoded,
      });

    } catch (err) {
      logger.error(`Failed to process message for device ${integration.deviceId}`, {
          error: err,
          errorMessage: err instanceof Error ? err.message : String(err), // CHANGE THIS
          errorStack: err instanceof Error ? err.stack : undefined, // ADD THIS
          errorName: err instanceof Error ? err.name : typeof err, // ADD THIS
          topic,
      });
      // logger.error(`Failed to process message for device ${integration.deviceId}`, {
      //   error: err,
      //   topic,
      // });
      // Don't throw - let other messages continue processing
    }
  }
}