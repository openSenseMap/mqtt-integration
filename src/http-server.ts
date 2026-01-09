import express from 'express';
import { logger } from './logger';
import { MqttClientManager } from './mqtt-client';
import { MessageProcessor } from './message-processor';
import { ApiClient } from './api-client';
import { config } from './config';

export function createHttpServer(
  mqttManager: MqttClientManager,
  messageProcessor: MessageProcessor,
  apiClient: ApiClient,
  syncIntegrations: () => Promise<void>
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

  app.post("/devices/:deviceId/connect", async (req, res) => {
    try {
      await syncIntegrations();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/devices/:deviceId/disconnect", async (req, res) => {
    try {
      await syncIntegrations();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/devices/:deviceId/reconnect", async (req, res) => {
    try {
      await syncIntegrations();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // // Connect device to MQTT broker
  // app.post('/devices/:deviceId/connect', async (req: any, res: any) => {
  //   const { deviceId } = req.params;
    
  //   try {
  //     const integration = await apiClient.fetchIntegration(deviceId);
      
  //     if (!integration || !integration.enabled) {
  //       return res.status(400).json({ 
  //         error: 'Integration not found or not enabled' 
  //       });
  //     }

  //     messageProcessor.setDeviceFormat(
  //       integration.deviceId,
  //       integration.messageFormat,
  //       integration.decodeOptions
  //     );

  //     await mqttManager.connect(integration);
      
  //     logger.info(`device ${deviceId} connected`);
  //     res.json({ success: true, deviceId });
  //   } catch (error: any) {
  //     logger.error(`Failed to connect device ${deviceId}`, { error });
  //     res.status(500).json({ 
  //       error: 'Failed to connect device',
  //       message: error.message 
  //     });
  //   }
  // });

  // Disconnect device
  // app.post('/devices/:deviceId/disconnect', async (req: any, res: any) => {
  //   const { deviceId } = req.params;
    
  //   try {
  //     await mqttManager.disconnect(deviceId);
  //     logger.info(`device ${deviceId} disconnected`);
  //     res.json({ success: true, deviceId });
  //   } catch (error: any) {
  //     logger.error(`Failed to disconnect device ${deviceId}`, { error });
  //     res.status(500).json({ 
  //       error: 'Failed to disconnect device',
  //       message: error.message 
  //     });
  //   }
  // });

  // Reconnect (disconnect then connect with fresh config)
  // app.post('/devices/:deviceId/reconnect', async (req: any, res: any) => {
  //   const { deviceId } = req.params;
    
  //   try {
  //     await mqttManager.disconnect(deviceId);
      
  //     const integration = await apiClient.fetchIntegration(deviceId);
            
  //     if (!integration || !integration.enabled) {
  //       return res.status(400).json({ 
  //         error: 'Integration not found or not enabled' 
  //       });
  //     }

  //     messageProcessor.setDeviceFormat(
  //       integration.deviceId,
  //       integration.messageFormat,
  //       integration.decodeOptions
  //     );

  //     await mqttManager.connect(integration);
      
  //     logger.info(`device ${deviceId} reconnected`);
  //     res.json({ success: true, deviceId });
  //   } catch (error: any) {
  //     logger.error(`Failed to reconnect device ${deviceId}`, { error });
  //     res.status(500).json({ 
  //       error: 'Failed to reconnect device',
  //       message: error.message 
  //     });
  //   }
  // });

  // Get connection status
  app.get('/devices/:deviceId/status', (req: any, res: any) => {
    const { deviceId } = req.params;
    const isConnected = mqttManager.isConnected(deviceId);
    
    res.json({ 
      deviceId, 
      connected: isConnected 
    });
  });

  return app;
}

export function requireServiceKey(req: any, res: any, next: any) {
  const key = req.headers['x-service-key'];
  if (key !== config.API_SERVICE_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
