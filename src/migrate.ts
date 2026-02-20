import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { envDB } from './db.env-schema.js'

const migrationConnection = postgres(envDB.MQTT_DATABASE_URL, {
  max: 5,
  ssl: envDB.PG_CLIENT_SSL,
  connect_timeout: 120,
})

async function main() {
  console.log('Migrations started...')
  await migrate(drizzle(migrationConnection), { migrationsFolder: './drizzle' })
  await migrationConnection.end()
  console.log('Migrations finished')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})