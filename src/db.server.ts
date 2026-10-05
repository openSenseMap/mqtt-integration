import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'
import invariant from 'tiny-invariant'
let drizzleClient: PostgresJsDatabase
let pg: Sql<any>

declare global {
	var __mqttDb__:
		| {
				drizzle: PostgresJsDatabase
				pg: Sql<any>
		  }
		| undefined
}

function initClient() {
	const { MQTT_DATABASE_URL } = process.env
	invariant(
		typeof MQTT_DATABASE_URL === 'string',
		'MQTT_DATABASE_URL env var not set',
	)

	const databaseUrl = new URL(MQTT_DATABASE_URL)
	console.log(`🔌 setting up drizzle client to ${databaseUrl.host}`)

	const rawPg = postgres(MQTT_DATABASE_URL, {
		ssl: process.env.PG_CLIENT_SSL === 'true' ? true : false,
	})

	const drizzleDb = drizzle({ client: rawPg })

	return { drizzle: drizzleDb, pg: rawPg }
}

if (process.env.NODE_ENV === 'production') {
	const { drizzle, pg: rawPg } = initClient()
	drizzleClient = drizzle
	pg = rawPg
} else {
	if (!global.__mqttDb__) {
		global.__mqttDb__ = initClient()
	}
	drizzleClient = global.__mqttDb__.drizzle
	pg = global.__mqttDb__.pg
}

export { drizzleClient, pg }
