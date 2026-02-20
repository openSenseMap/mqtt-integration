#!/bin/sh -ex
node dist/db/migrate.js
node dist/index.js