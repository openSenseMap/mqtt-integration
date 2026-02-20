import { config } from "./config";
import { logger } from "./logger";
import type { MqttIntegration, MeasurementBatch } from "./types";

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

async sendMeasurements(batch: MeasurementBatch): Promise<void> {
  try {
    logger.info(`🚀 Sending ${batch.measurements.length} measurements`);

    for (const m of batch.measurements) {
      const response = await this.fetch(
        `/api/boxes/${batch.deviceId}/${m.sensor_id}`,
        {
          method: "POST",
          body: JSON.stringify({
            value: m.value,
            createdAt: m.createdAt,
            location: m.location || undefined
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed: ${response.status} ${errorText}`);
      }
    }

    logger.info(`✅ Sent ${batch.measurements.length} measurements`);
  } catch (err) {
    logger.error(`Failed to send measurements`, {
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

  // async sendMeasurements(batch: MeasurementBatch): Promise<void> {
  //   try {
  //     logger.debug(
  //       `Sending ${batch.measurements.length} measurements for device ${batch.deviceId}`
  //     );

  //     const response = await this.fetch(
  //       `/api/boxes/${batch.deviceId}/data`,
  //       {
  //         method: "POST",
  //         body: JSON.stringify(batch.measurements),
  //       }
  //     );


  //     if (!response.ok) {
  //       throw new Error(
  //         `Failed to send measurements: ${response.status} ${response.statusText}`
  //       );
  //     }

  //     logger.info(
  //       `✅ Sent ${batch.measurements.length} measurements for device ${batch.deviceId}`
  //     );
  //   } catch (err) {
  //     logger.error(`Failed to send measurements for device ${batch.deviceId}`, {
  //       error: err,
  //       errorMessage: err instanceof Error ? err.message : String(err), // ADD THIS
  //       errorStack: err instanceof Error ? err.stack : undefined, // ADD THIS
  //       batchSize: batch.measurements.length,
  //     });
  //     // logger.error(`Failed to send measurements for device ${batch.deviceId}`, {
  //     //   error: err,
  //     //   batchSize: batch.measurements.length,
  //     // });
  //     throw err;
  //   }
  // }
}
