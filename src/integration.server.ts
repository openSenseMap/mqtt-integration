import { eq } from 'drizzle-orm';
import { drizzleClient } from './db.server';
import { mqttIntegration } from './schema/index';
import { toMqttIntegration } from './types';

export const integrationsRepository = {
  async findByDeviceId(deviceId: string) {
    const [integration] = await drizzleClient
      .select()
      .from(mqttIntegration)
      .where(eq(mqttIntegration.deviceId, deviceId));
    return integration;
  },

  async create(data: typeof mqttIntegration.$inferInsert) {
    const [integration] = await drizzleClient
      .insert(mqttIntegration)
      .values(data)
      .returning();
    return integration;
  },

  async update(deviceId: string, data: Partial<typeof mqttIntegration.$inferInsert>) {
    const [integration] = await drizzleClient
      .update(mqttIntegration)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(mqttIntegration.deviceId, deviceId))
      .returning();
    return integration;
  },

  async delete(deviceId: string) {
    await drizzleClient
      .delete(mqttIntegration)
      .where(eq(mqttIntegration.deviceId, deviceId));
  },

  async findAllEnabled() {
    const integrations = await drizzleClient
      .select()
      .from(mqttIntegration)
      .where(eq(mqttIntegration.enabled, true));
    
    // Convert all DB records to MqttIntegration type
    return integrations.map(toMqttIntegration);
  }
};