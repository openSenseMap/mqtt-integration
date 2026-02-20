import mqtt, { type MqttClient, type IClientOptions } from "mqtt";
import { logger } from "./logger";
import { config } from "./config";
import type { MqttIntegration } from "./types";
import { MessageProcessor } from "./message-processor";

interface ConnectionState {
  client?: MqttClient;
  retryCount: number;
  retryTimer?: NodeJS.Timeout;
  integration: MqttIntegration;
}

const USER_CONNECT_OPTIONS_ALLOWED_KEYS = [
  "keepalive",
  "reschedulePings",
  "clientId",
  "username",
  "password",
  "connectTimeout",
] as const;

export class MqttClientManager {
  private connections: Map<string, ConnectionState> = new Map();
  private messageProcessor: MessageProcessor;

  constructor(messageProcessor: MessageProcessor) {
    this.messageProcessor = messageProcessor;
  }

  /**
   * Connect to MQTT broker for a device
   */
  async connect(integration: MqttIntegration): Promise<void> {
    const { deviceId } = integration;

    // disconnect any running connections before reconnecting
    await this.disconnect(deviceId);

    logger.info(`Connecting MQTT for device ${deviceId}`);

    try {
      const client = await this.createClient(integration);

      this.connections.set(deviceId, {
        client,
        retryCount: 0,
        integration,
      });

      logger.info(`✅ Connected MQTT for device ${deviceId}`);
    } catch (err) {
      logger.error(`Failed to connect device ${deviceId}`, { error: err });
      this.scheduleRetry(integration, 0);
    }
  }

  /**
   * Create MQTT client with retry logic
   */
  private async createClient(
    integration: MqttIntegration
  ): Promise<MqttClient> {
    const { deviceId, url, topic, connectionOptions } = integration;

    // Parse and validate connection options
    const opts = this.parseConnectionOptions(connectionOptions);

    return new Promise((resolve, reject) => {
      let errorRetries = config.RETRY_ATTEMPTS;
      let closeRetries = config.RETRY_ATTEMPTS;

      logger.debug(`Creating MQTT client for ${deviceId}`, {
        url,
        topic,
        clientId: opts.clientId,
      });

      const client = mqtt.connect(url, opts);

      const cleanup = () => {
        client.removeAllListeners();
      };

      client.on("error", (err) => {
        errorRetries--;
        logger.warn(
          `MQTT error for ${deviceId} (${errorRetries} retries left)`,
          { error: err }
        );

        if (errorRetries === 0) {
          cleanup();
          client.end(true);
          reject(err);
        }
      });

      client.on("close", () => {
        closeRetries--;
        logger.warn(
          `MQTT closed for ${deviceId} (${closeRetries} retries left)`
        );

        if (closeRetries === 0) {
          cleanup();
          client.end(true);
          reject(new Error("Connection closed after retries"));
        }
      });

      client.on("connect", () => {
        logger.debug(`MQTT connected, subscribing to topic: ${topic}`);

        client.subscribe(topic, (err) => {
          if (err) {
            cleanup();
            reject(err);
            return;
          }

          logger.info(`Subscribed to topic ${topic} for device ${deviceId}`);

          // Setup message handler
          client.on("message", (topic, message) => {
            this.messageProcessor.processMessage(integration, topic, message);
          });

          // Handle unexpected disconnection
          client.on("close", () => {
            logger.warn(`Connection closed for device ${deviceId}`);
            this.connections.delete(deviceId);
            // TODO: Schedule reconnection attempt
          });

          resolve(client);
        });
      });
    });
  }

  /**
   * Parse and validate user-provided connection options
   */
  private parseConnectionOptions(
    userOptions?: Record<string, any>
  ): IClientOptions {
    const opts: IClientOptions = {};

    if (userOptions && typeof userOptions === "object") {
      for (const key of USER_CONNECT_OPTIONS_ALLOWED_KEYS) {
        if (userOptions[key] !== undefined) {
          (opts as any)[key] = userOptions[key];
        }
      }
    }

    // Generate clientId if not provided
    if (!opts.clientId || typeof opts.clientId !== "string") {
      opts.clientId = `osm_${Math.random().toString(16).substring(2, 10)}`;
    }

    // Default connect timeout
    if (!opts.connectTimeout || isNaN(Number(opts.connectTimeout))) {
      opts.connectTimeout = 5000;
    }

    return opts;
  }

  /**
   * Schedule retry with exponential backoff
   */
  private scheduleRetry(
    integration: MqttIntegration,
    currentRetryCount: number
  ): void {
    const { deviceId } = integration;

    if (currentRetryCount >= config.RETRY_ATTEMPTS) {
      logger.error(
        `Max retries (${config.RETRY_ATTEMPTS}) reached for device ${deviceId}. Giving up.`
      );
      return;
    }

    // Exponential backoff: RETRY_DELAY_MS * 2^retryCount
    const retryDelay = config.RETRY_DELAY_MS * Math.pow(2, currentRetryCount);

    logger.info(
      `Retrying connection for ${deviceId} in ${retryDelay / 1000}s (attempt ${
        currentRetryCount + 1
      }/${config.RETRY_ATTEMPTS})`
    );

    const timer = setTimeout(() => {
      this.connect(integration);
    }, retryDelay);

    this.connections.set(deviceId, {
      retryCount: currentRetryCount + 1,
      retryTimer: timer,
      integration,
    });
  }

  /**
   * Disconnect device from MQTT broker
   */
  async disconnect(deviceId: string): Promise<void> {
    const state = this.connections.get(deviceId);
    if (!state) return;

    logger.info(`Disconnecting device ${deviceId}`);

    // Clear retry timer if exists
    if (state.retryTimer) {
      clearTimeout(state.retryTimer);
    }

    // Close client if exists
    if (state.client) {
      try {
        await state.client.endAsync();
      } catch (err) {
        logger.warn(`Error closing client for ${deviceId}`, { error: err });
      }
    }

    this.connections.delete(deviceId);
    logger.info(`Disconnected device ${deviceId}`);
  }

  /**
   * Disconnect all clients (for graceful shutdown)
   */
  async disconnectAll(): Promise<void> {
    logger.info("Disconnecting all MQTT clients...");
    const promises = Array.from(this.connections.keys()).map((id) =>
      this.disconnect(id)
    );
    await Promise.all(promises);
    logger.info("All MQTT clients disconnected");
  }

  getConnectionCount(): number {
    return Array.from(this.connections.values()).filter((s) => s.client).length;
  }

  isConnected(deviceId: string): boolean {
    const state = this.connections.get(deviceId);
    return !!(state && state.client);
  }

  getConnectedDeviceIds(): string[] {
    return Array.from(this.connections.keys());
  }
  
  getIntegration(deviceId: string) {
    return this.connections.get(deviceId)?.integration;
  }
  
}
