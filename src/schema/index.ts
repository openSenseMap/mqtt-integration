import { createId } from "@paralleldrive/cuid2";
import { boolean, json, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const mqttMessageFormatEnum = pgEnum('mqtt_message_format', ['json', 'csv']);

export const mqttIntegration = pgTable('mqtt_integration', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => createId()),
    
  deviceId: text('device_id').notNull().unique(),
  enabled: boolean('enabled').default(true).notNull(),
  
  url: text('url').notNull(),
  topic: text('topic').notNull(),
  messageFormat: mqttMessageFormatEnum('message_format').notNull(),
  
  decodeOptions: json('decode_options').$type<{
    jsonPath?: string;
    delimiter?: string;
    [key: string]: any;
  }>(),
  
  connectionOptions: json('connection_options').$type<{
    username?: string;
    password?: string;
    clientId?: string;
    keepalive?: number;
  }>(),
  
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
    
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});