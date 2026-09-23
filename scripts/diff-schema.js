#!/usr/bin/env node

/**
 * FAWRUN Schema Drift Detector
 * Compares schema.prisma with the actual live database schema.
 *
 * Usage:
 *   node scripts/diff-schema.js [DATABASE_URL]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Locate schema.prisma
const SCHEMA_PATH = path.resolve(__dirname, '../apps/api/prisma/schema.prisma');
if (!fs.existsSync(SCHEMA_PATH)) {
  console.error(`[ERROR] schema.prisma not found at ${SCHEMA_PATH}`);
  process.exit(1);
}

// 2. Resolve DATABASE_URL
const databaseUrl = process.argv[2] || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('[ERROR] DATABASE_URL must be provided via CLI argument or DATABASE_URL environment variable.');
  console.error('Usage: node scripts/diff-schema.js [DATABASE_URL]');
  process.exit(1);
}

// Mask credentials for display
const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');

// 3. Parse schema.prisma
function parsePrismaSchema(schemaContent) {
  const models = new Map();
  const enums = new Set();

  // Extract enums
  const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
  let enumMatch;
  while ((enumMatch = enumRegex.exec(schemaContent)) !== null) {
    enums.add(enumMatch[1]);
  }

  const SCALAR_TYPES = new Set([
    'String',
    'Boolean',
    'Int',
    'BigInt',
    'Float',
    'Decimal',
    'DateTime',
    'Json',
    'Bytes',
  ]);

  // Extract models
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let modelMatch;
  while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
    const modelName = modelMatch[1];
    const body = modelMatch[2];
    const columns = new Map();

    const lines = body.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//') || line.startsWith('@@')) continue;

      // Extract field definition: name type modifiers...
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;

      const fieldName = parts[0];
      const rawType = parts[1];
      const isOptional = rawType.endsWith('?');
      const isArray = rawType.endsWith('[]');
      const baseType = rawType.replace(/[?\[\]]/g, '');

      // Check if it's a scalar or enum field (persisted as database column)
      const isColumn = (SCALAR_TYPES.has(baseType) || enums.has(baseType)) && !isArray;

      if (isColumn) {
        columns.set(fieldName, {
          name: fieldName,
          type: baseType,
          isOptional,
          isEnum: enums.has(baseType),
        });
      }
    }

    models.set(modelName, columns);
  }

  return { models, enums };
}

// 4. Connect to database and inspect public schema
async function inspectDatabase(dbUrl) {
  // Dynamically resolve PrismaClient from apps/api
  let PrismaClient;
  try {
    const prismaPkgPath = path.resolve(__dirname, '../apps/api/node_modules/@prisma/client');
    PrismaClient = require(prismaPkgPath).PrismaClient;
  } catch (err) {
    console.error('[ERROR] Could not load @prisma/client:', err.message);
    process.exit(1);
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  try {
    // Fetch tables
    const tablesRaw = await prisma.$queryRawUnsafe(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name != '_prisma_migrations'
      ORDER BY table_name;
    `);

    // Fetch columns
    const columnsRaw = await prisma.$queryRawUnsafe(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);

    const dbTables = new Map();
    for (const row of tablesRaw) {
      dbTables.set(row.table_name, new Map());
    }

    for (const col of columnsRaw) {
      if (col.table_name === '_prisma_migrations') continue;
      if (!dbTables.has(col.table_name)) {
        dbTables.set(col.table_name, new Map());
      }
      dbTables.get(col.table_name).set(col.column_name, {
        name: col.column_name,
        dataType: col.data_type,
        isNullable: col.is_nullable === 'YES',
        defaultVal: col.column_default,
      });
    }

    return { prisma, dbTables };
  } catch (err) {
    await prisma.$disconnect();
    throw err;
  }
}

// 5. Main comparison logic
async function main() {
  console.log('='.repeat(70));
  console.log('       FAWRUN SCHEMA DRIFT DETECTOR');
  console.log('='.repeat(70));
  console.log(`Schema file: ${SCHEMA_PATH}`);
  console.log(`Target DB:   ${maskedUrl}`);
  console.log('-'.repeat(70));

  // Parse schema.prisma
  const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const { models } = parsePrismaSchema(schemaContent);

  // Inspect database
  let dbTables, prisma;
  try {
    const inspected = await inspectDatabase(databaseUrl);
    dbTables = inspected.dbTables;
    prisma = inspected.prisma;
  } catch (err) {
    console.error(`[ERROR] Failed to query database: ${err.message}`);
    process.exit(1);
  }

  // Drift collectors
  const missingTables = [];
  const extraTables = [];
  const missingColumns = [];
  const extraColumns = [];

  // Check models against DB tables
  for (const [modelName, expectedCols] of models.entries()) {
    if (!dbTables.has(modelName)) {
      missingTables.push(modelName);
      continue;
    }

    const actualCols = dbTables.get(modelName);
    for (const [colName, colInfo] of expectedCols.entries()) {
      if (!actualCols.has(colName)) {
        missingColumns.push({
          table: modelName,
          column: colName,
          type: colInfo.type + (colInfo.isOptional ? '?' : ''),
        });
      }
    }
  }

  // Check DB tables against models
  for (const [tableName, actualCols] of dbTables.entries()) {
    if (!models.has(tableName)) {
      extraTables.push(tableName);
      continue;
    }

    const expectedCols = models.get(tableName);
    for (const colName of actualCols.keys()) {
      if (!expectedCols.has(colName)) {
        extraColumns.push({
          table: tableName,
          column: colName,
        });
      }
    }
  }

  // Also run `prisma migrate diff` for SQL diff details if available
  let prismaDiffOutput = '';
  try {
    const diffCmd = `npx prisma migrate diff --from-url "${databaseUrl}" --to-schema-datamodel "${SCHEMA_PATH}" --script`;
    prismaDiffOutput = execSync(diffCmd, {
      cwd: path.resolve(__dirname, '../apps/api'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (err) {
    // If prisma migrate diff throws non-zero or warning, capture stdout
    if (err.stdout) prismaDiffOutput = err.stdout.toString().trim();
  }

  await prisma.$disconnect();

  // Print Report
  console.log('\n[SUMMARY OF DRIFT]');
  console.log(`- Expected models in schema.prisma: ${models.size}`);
  console.log(`- Base tables found in database:    ${dbTables.size}`);
  console.log(`- Missing tables:                   ${missingTables.length}`);
  console.log(`- Extra tables in DB:               ${extraTables.length}`);
  console.log(`- Missing columns in DB:            ${missingColumns.length}`);
  console.log(`- Extra columns in DB:              ${extraColumns.length}`);
  console.log('-'.repeat(70));

  const hasDrift =
    missingTables.length > 0 ||
    extraTables.length > 0 ||
    missingColumns.length > 0 ||
    extraColumns.length > 0;

  if (!hasDrift) {
    console.log('\n [RESULT: IN SYNC]');
    console.log('No schema drift detected! Live database schema matches schema.prisma.');
  } else {
    console.log('\n [RESULT: SCHEMA DRIFT DETECTED]\n');

    if (missingTables.length > 0) {
      console.log(' Missing Tables in DB (defined in schema.prisma):');
      for (const t of missingTables) {
        console.log(`   - ${t}`);
      }
      console.log('');
    }

    if (extraTables.length > 0) {
      console.log(' Extra Tables in DB (not in schema.prisma):');
      for (const t of extraTables) {
        console.log(`   - ${t}`);
      }
      console.log('');
    }

    if (missingColumns.length > 0) {
      console.log(' Missing Columns in DB (defined in schema.prisma):');
      for (const c of missingColumns) {
        console.log(`   - ${c.table}.${c.column} (${c.type})`);
      }
      console.log('');
    }

    if (extraColumns.length > 0) {
      console.log(' Extra Columns in DB (not in schema.prisma):');
      for (const c of extraColumns) {
        console.log(`   - ${c.table}.${c.column}`);
      }
      console.log('');
    }
  }

  if (prismaDiffOutput && prismaDiffOutput !== '-- This is an empty migration.') {
    console.log('='.repeat(70));
    console.log('Recommended SQL Statements from Prisma Diff:');
    console.log('='.repeat(70));
    console.log(prismaDiffOutput);
    console.log('='.repeat(70));
  }

  // Return exit code
  process.exit(hasDrift ? 1 : 0);
}

main().catch((err) => {
  console.error('[FATAL ERROR]', err);
  process.exit(1);
});
