export interface ServiceMetadata {
  service: 'mqtt-integration';
  revision: string;
}

export const serviceMetadata: ServiceMetadata = Object.freeze({
  service: 'mqtt-integration',
  revision: process.env.GIT_REVISION?.trim() || 'unknown',
});

interface HeaderResponse {
  setHeader(name: string, value: string | number | readonly string[]): unknown;
}

export function setServiceMetadataHeaders(response: HeaderResponse) {
  response.setHeader('X-Service-Revision', serviceMetadata.revision);
}
