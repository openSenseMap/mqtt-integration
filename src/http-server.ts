import express from 'express';
import { logger } from './logger';
import { MqttClientManager } from './mqtt-client';
import { MessageProcessor } from './message-processor';
import { ApiClient } from './api-client';
import { config } from './config';
import { integrationsRepository } from './integration.server';
import { mqttIntegrationSchema } from './schema/mqtt-schema';

interface IntegrationRequest {
  url: string;
  topic: string;
  messageFormat: 'json' | 'csv';
  decodeOptions?: Record<string, any>;
  connectionOptions?: {
    username?: string;
    password?: string;
    clientId?: string;
    keepalive?: number;
  };
}

function validateIntegrationRequest(body: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (!body.url || typeof body.url !== 'string') {
    errors.push('url is required and must be a string');
  } else if (!body.url.startsWith('ws://') && !body.url.startsWith('wss://') && !body.url.startsWith('mqtt://')) {
    errors.push('url must start with ws:// or wss:// or mqtt://');
  }

  if (!body.topic || typeof body.topic !== 'string') {
    errors.push('topic is required and must be a string');
  }

  if (!body.messageFormat || !['json', 'csv'].includes(body.messageFormat)) {
    errors.push('messageFormat must be either "json" or "csv"');
  }

  if (body.decodeOptions && typeof body.decodeOptions !== 'object') {
    errors.push('decodeOptions must be an object');
  }

  if (body.connectionOptions && typeof body.connectionOptions !== 'object') {
    errors.push('connectionOptions must be an object');
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

export function createHttpServer(
  mqttManager: MqttClientManager,
  messageProcessor: MessageProcessor,
  apiClient: ApiClient
) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req: any, res: any) => {
    res.json({
      status: 'healthy',
      connections: mqttManager.getConnectionCount(),
      timestamp: new Date().toISOString()
    });
  });

  // GET integration config for device
  app.get('/integrations/:deviceId', requireServiceKey, async (req, res) => {
    try {
      const { deviceId } = req.params;
      const integration = await integrationsRepository.findByDeviceId(deviceId);
      
      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      res.json(integration);
    } catch (error) {
      logger.error('Failed to fetch integration', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // create or update integration
  app.put('/integrations/:deviceId', requireServiceKey, async (req, res) => {
    try {
      const { deviceId } = req.params;
      console.log("device id")
      
      const validation = validateIntegrationRequest(req.body);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: validation.errors 
        });
      }

      const data: IntegrationRequest = req.body;
      
      // Test MQTT connection before saving
      // const testIntegration: MqttIntegration = {
      //   deviceId: deviceId,
      //   enabled: true,
      //   url: data.url,
      //   topic: data.topic,
      //   messageFormat: data.messageFormat,
      //   decodeOptions: data.decodeOptions,
      //   connectionOptions: data.connectionOptions,
      // };

      // // Try connecting to validate
      // try {
      //   await mqttManager.connect(testIntegration);
      //   await mqttManager.disconnect(deviceId); // Disconnect test connection
      // } catch (error) {
      //   logger.error('MQTT connection test failed', { error, deviceId });
      //   return res.status(400).json({ 
      //     error: 'Failed to connect to MQTT broker',
      //     details: error instanceof Error ? error.message : 'Unknown error'
      //   });
      // }

      // Check if integration exists
      const existing = await integrationsRepository.findByDeviceId(deviceId);

      let integration;
      if (existing) {
        // Update existing
        integration = await integrationsRepository.update(deviceId, {
          url: data.url,
          topic: data.topic,
          messageFormat: data.messageFormat,
          decodeOptions: data.decodeOptions,
          connectionOptions: data.connectionOptions,
          enabled: true,
        });
        logger.info(`Updated integration for box ${deviceId}`);
      } else {
        // Create new
        integration = await integrationsRepository.create({
          deviceId: deviceId,
          url: data.url,
          topic: data.topic,
          messageFormat: data.messageFormat,
          decodeOptions: data.decodeOptions,
          connectionOptions: data.connectionOptions,
          enabled: true,
        });
        logger.info(`Created integration for box ${deviceId}`);
      }

      // Start actual MQTT connection
      // dont await here in order not to block
      mqttManager.connect({
        deviceId: deviceId,
        enabled: integration.enabled,
        url: integration.url,
        topic: integration.topic,
        messageFormat: integration.messageFormat as 'json' | 'csv',
        decodeOptions: integration.decodeOptions as any,
        connectionOptions: integration.connectionOptions as any,
      });

      res.json(integration);
    } catch (error) {
      logger.error('Failed to create/update integration', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/integrations/:deviceId', requireServiceKey, async (req, res) => {
    try {
      const { deviceId } = req.params;

      await mqttManager.disconnect(deviceId);

      await integrationsRepository.delete(deviceId);

      logger.info(`Deleted integration for box ${deviceId}`);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete integration', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET MQTT integration schema
  app.get(
    "/integrations/schema/mqtt",
    requireServiceKey,
    (req, res) => {
      res.json(mqttIntegrationSchema);
    }
  );

  return app;
}

export function requireServiceKey(req: any, res: any, next: any) {
  const key = req.headers['x-service-key'];
  if (key !== config.API_SERVICE_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}