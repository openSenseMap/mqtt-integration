export const mqttIntegrationSchema = {
  schema: {
    type: "object",
    required: ["enabled", "url", "topic", "messageFormat"],
    properties: {
      enabled: {
        type: "boolean",
        title: "Enable MQTT",
        default: true,
        "ui:widget": "CheckboxWidget"
      },
      url: {
        type: "string",
        title: "Broker URL",
        description: "MQTT broker URL (mqtt://, mqtts://, ws://, wss://)",
        pattern: "^(mqtts?|wss?)://.+",
      },
      topic: {
        type: "string",
        title: "Topic",
        description: "MQTT topic to subscribe to",
      },
      messageFormat: {
        type: "string",
        title: "Message format",
        enum: ["json", "csv"],
      },
      decodeOptions: {
        type: "object",
        title: "Decoding options",
        properties: {
          jsonPath: {
            type: "string",
            title: "JSON Path",
            description: "Optional JSONPath expression (JSON only)",
          },
          delimiter: {
            type: "string",
            title: "CSV delimiter",
            default: ",",
          },
        },
        additionalProperties: true,
      },
      connectionOptions: {
        type: "object",
        title: "Connection options",
        properties: {
          username: { type: "string", title: "Username" },
          password: { type: "string", title: "Password", format: "password" },
          clientId: { type: "string", title: "Client ID" },
          keepalive: {
            type: "integer",
            title: "Keepalive (seconds)",
            minimum: 10,
            maximum: 3600,
          },
        },
        additionalProperties: false,
      },
    },
  },
  uiSchema: {
    "ui:order": [
      "enabled",
      "url",
      "topic",
      "messageFormat",
      "decodeOptions",
      "connectionOptions",
    ],
    connectionOptions: {
      "ui:collapsible": true,
      "ui:collapsed": true,
    },
    decodeOptions: {
      "ui:collapsible": true,
      "ui:collapsed": true,
    },
  },
};
