import { logger } from "./logger.js";
import { config } from "./config.js";
import { ApiClient } from "./api-client.js";
import { MqttClientManager } from "./mqtt-client.js";
import { MessageProcessor } from "./message-processor.js";
import { createHttpServer, requireServiceKey } from "./http-server.js";

async function main() {
  const apiClient = new ApiClient();
  const messageProcessor = new MessageProcessor(apiClient);

  const mqttManager = new MqttClientManager((deviceId, topic, message) => {
    messageProcessor.processMessage(deviceId, topic, message);
  });

  const app = createHttpServer(mqttManager, messageProcessor, apiClient, syncIntegrations);
  app.use(requireServiceKey);

  const server = app.listen(config.PORT, () => {
    logger.info(`🚀 MQTT Service listening on port ${config.PORT}`);
  });

  /**
   * Sync integrations from API and connect/disconnect devices
   */
  async function syncIntegrations() {
    try {

      const integrations = await apiClient.fetchActiveIntegrations();


      const desired = new Map(
        integrations
          .filter(i => i.enabled)
          .map(i => [i.deviceId, i])
      );


      const connected = mqttManager.getConnectedDeviceIds();
       // Disconnect devices that should not be connected anymore
      for (const deviceId of connected) {
        if (!desired.has(deviceId)) {
          logger.info(`Disconnecting ${deviceId} (no longer enabled)`);
          await mqttManager.disconnect(deviceId);
        }
      }

      // Connect or reconnect desired devices
    for (const [deviceId, integration] of desired) {
      const current = mqttManager.getIntegration(deviceId);

      const configChanged =
        !current ||
        current.url !== integration.url ||
        current.topic !== integration.topic ||
        JSON.stringify(current.connectionOptions) !==
          JSON.stringify(integration.connectionOptions);

      if (!mqttManager.isConnected(deviceId) || configChanged) {
        messageProcessor.setDeviceFormat(
          integration.deviceId,
          integration.messageFormat,
          integration.decodeOptions
        );

        logger.info(`Ensuring MQTT connection for ${deviceId}`);
        await mqttManager.connect(integration);
      }
      }
    } catch (err) {
      logger.error("Error syncing integrations", { error: err });
    }
  }

  await syncIntegrations();

  const pollInterval = setInterval(
    syncIntegrations,
    config.CONFIG_POLL_INTERVAL_MS
  );

  /**
   * Graceful shutdown handler
   */
  const closeGracefully = async (signal: string) => {
    logger.info(`⚠️ Received ${signal}, shutting down gracefully...`);

    // Stop polling
    clearInterval(pollInterval);

    // Flush pending measurements
    await messageProcessor.flushAll();

    await mqttManager.disconnectAll();

    logger.info("✅ Shutdown complete");
    process.exit(0);
  };

  // Register shutdown handlers
  process.on("SIGINT", () => closeGracefully("SIGINT"));
  process.on("SIGTERM", () => closeGracefully("SIGTERM"));

  logger.info("✅ MQTT Service started successfully");
}

main().catch((err) => {
  logger.error("💥 Fatal error", { error: err });
  process.exit(1);
});
