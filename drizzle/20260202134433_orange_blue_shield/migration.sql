CREATE TYPE "public"."mqtt_message_format" AS ENUM('json', 'csv');--> statement-breakpoint
CREATE TABLE "mqtt_integration" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"url" text NOT NULL,
	"topic" text NOT NULL,
	"message_format" "mqtt_message_format" NOT NULL,
	"decode_options" json,
	"connection_options" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mqtt_integration_device_id_unique" UNIQUE("device_id")
);
