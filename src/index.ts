import { logger } from "./logger";
import { config } from "./config";
import { ApiClient } from "./api-client";
import { MqttClientManager } from "./mqtt-client";
import { MessageProcessor } from "./message-processor";
import { createHttpServer, requireServiceKey } from "./http-server";
import { integrationsRepository } from "./integration.server";

async function main() {
  const apiClient = new ApiClient();
  const messageProcessor = new MessageProcessor(apiClient);
  const mqttManager = new MqttClientManager(messageProcessor);

  await syncIntegrations(mqttManager);

  const app = createHttpServer(mqttManager, messageProcessor, apiClient);
  app.use(requireServiceKey);

  const server = app.listen(config.PORT, () => {
    logger.info(`🚀 MQTT Service listening on port ${config.PORT}`);
  });

  /**
   * Graceful shutdown handler
   */
  const closeGracefully = async (signal: string) => {
    logger.info(`⚠️ Received ${signal}, shutting down gracefully...`);

    // Flush pending measurements
    // await messageProcessor.flushAll();

    await mqttManager.disconnectAll();

    logger.info("✅ Shutdown complete");
    process.exit(0);
  };

  // Register shutdown handlers
  process.on("SIGINT", () => closeGracefully("SIGINT"));
  process.on("SIGTERM", () => closeGracefully("SIGTERM"));

  logger.info("✅ MQTT Service started successfully");
}

/**
 * Load all enabled integrations from database and connect to their MQTT brokers
 */
async function syncIntegrations(mqttManager: MqttClientManager) {
  logger.info('🔄 Syncing integrations from database...');
  
  try {
    const integrations = await integrationsRepository.findAllEnabled();
    logger.info(`📋 Found ${integrations.length} enabled integrations`);
    
    for (const integration of integrations) {
      logger.info(`Connecting to MQTT for device ${integration.deviceId}`, {
        url: integration.url,
        topic: integration.topic
      });
      
      if (!mqttManager.isConnected(integration.deviceId)) {
        try {
          await mqttManager.connect(integration);
          logger.info(`✅ Connected to MQTT for device ${integration.deviceId}`);
        } catch (error) {
          logger.error(`❌ Failed to connect device ${integration.deviceId}`, { error });
        }
      } else {
        logger.info(`⏭️ Device ${integration.deviceId} already connected`);
      }
    }
    
    logger.info(`✅ Sync complete: ${mqttManager.getConnectionCount()} active connections`);
  } catch (error) {
    logger.error('❌ Failed to sync integrations', { error });
    throw error;
  }
}

main().catch((err) => {
  logger.error("💥 Fatal error", { error: err });
  process.exit(1);
});
