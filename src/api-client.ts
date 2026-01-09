import { config } from "./config.js";
import { logger } from "./logger.js";
import type { MqttIntegration, MeasurementBatch } from "./types.js";

export class ApiClient {
  private baseUrl: string;
  private serviceKey: string;

  constructor() {
    this.baseUrl = config.API_URL;
    this.serviceKey = config.API_SERVICE_KEY;
  }

  private async fetch(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": this.serviceKey,
        ...options.headers,
      },
    });

    return response;
  }

  async fetchIntegration(deviceId: string): Promise<MqttIntegration> {
    try {

      const response = await this.fetch(`/api/integrations/${deviceId}/mqtt`);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch integration for device ${deviceId}: ${response.status} ${response.statusText}`
        );
      }

      const integration = (await response.json()) as MqttIntegration;

      return integration;
    } catch (err) {
      throw err;
    }
  }

  async fetchActiveIntegrations(): Promise<MqttIntegration[]> {
    try {

      const response = await this.fetch("/api/integrations/mqtt/active");

      if (!response.ok) {
        throw new Error(
          `Failed to fetch integrations: ${response.status} ${response.statusText}`
        );
      }

      const integrations = (await response.json()) as MqttIntegration[];

      return integrations;
    } catch (err) {
      throw err;
    }
  }

  async sendMeasurements(batch: MeasurementBatch): Promise<void> {
    try {
      logger.debug(
        `Sending ${batch.measurements.length} measurements for device ${batch.deviceId}`
      );

      const response = await this.fetch("/api/measurements/ingest", {
        method: "POST",
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to send measurements: ${response.status} ${response.statusText}`
        );
      }

      logger.info(
        `✅ Sent ${batch.measurements.length} measurements for device ${batch.deviceId}`
      );
    } catch (err) {
      logger.error(`Failed to send measurements for device ${batch.deviceId}`, {
        error: err,
        batchSize: batch.measurements.length,
      });
      throw err;
    }
  }
}
