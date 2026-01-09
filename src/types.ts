export interface MqttIntegration {
  deviceId: string;
  integrationId: string;
  enabled: boolean; 
  url: string;
  topic: string;
  messageFormat: "json" | "csv" | "application/json";
  decodeOptions?: any;
  connectionOptions?: Record<string, any>;
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
