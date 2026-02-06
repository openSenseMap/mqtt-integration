import { mqttIntegration } from "./schema";

export interface MqttIntegration {
  deviceId: string;
  enabled: boolean; 
  url: string;
  topic: string;
  messageFormat: "json" | "csv" | "application/json";
  decodeOptions?: any;
  connectionOptions?: Record<string, any>;
}

export type MqttIntegrationDb = typeof mqttIntegration.$inferSelect;
export type MqttIntegrationInsert = typeof mqttIntegration.$inferInsert;

export function toMqttIntegration(db: MqttIntegrationDb): MqttIntegration {
  return {
    deviceId: db.deviceId,
    enabled: db.enabled,
    url: db.url,
    topic: db.topic,
    messageFormat: db.messageFormat as 'json' | 'csv',
    decodeOptions: db.decodeOptions ?? undefined, 
    connectionOptions: db.connectionOptions ?? undefined, 
  };
}

export interface DecodedMeasurement {
  sensor_id: string;
  value: number;
  createdAt?: string;
  location?: {
    lat: number;
    lng: number;
    altitude?: number;
  };
}

export interface ParsedMeasurement {
  sensor_id: string;
  value: number;
  createdAt?: string;
  location?: {
    lat: number;
    lng: number;
    altitude?: number;
  };
}

export interface MeasurementBatch {
  deviceId: string;
  measurements: ParsedMeasurement[];
}

export interface Config {
  API_URL: string;
  API_SERVICE_KEY: string;
  PORT: number;
  RETRY_ATTEMPTS: number;
  RETRY_DELAY_MS: number;
  BATCH_SIZE: number;
  BATCH_INTERVAL_MS: number;
  CONFIG_POLL_INTERVAL_MS: number;
  LOG_LEVEL: string;
}
