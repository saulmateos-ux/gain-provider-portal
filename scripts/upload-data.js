#!/usr/bin/env node

/**
 * Data Upload Script
 *
 * Uploads CSV data to the provider portal in chunks
 * Usage: node scripts/upload-data.js <path-to-csv>
 */

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

// Configuration
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CHUNK_SIZE = 1000; // Records per chunk
const IMPORT_ENDPOINT = `${API_URL}/api/import-chunk`;

async function uploadChunk(csvData, isFirstChunk) {
  const response = await fetch(IMPORT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      csvData,
      clearExisting: isFirstChunk,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Upload failed: ${error.message || response.statusText}`);
  }

  return await response.json();
}

async function main() {
  // Get CSV file path from command line
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.error('Usage: node scripts/upload-data.js <path-to-csv>');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  console.log('📂 Reading CSV file:', csvPath);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  console.log('📊 Parsing CSV...');
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const totalRecords = parsed.data.length;
  console.log(`✓ Found ${totalRecords} records`);

  // Split into chunks
  const chunks = [];
  for (let i = 0; i < totalRecords; i += CHUNK_SIZE) {
    const chunk = parsed.data.slice(i, i + CHUNK_SIZE);
    chunks.push(chunk);
  }

  console.log(`📦 Split into ${chunks.length} chunks of ${CHUNK_SIZE} records each`);
  console.log('');

  // Upload each chunk
  let totalImported = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunkCsv = Papa.unparse(chunks[i]);
    const isFirstChunk = i === 0;

    console.log(`⬆️  Uploading chunk ${i + 1}/${chunks.length}...`);

    try {
      const result = await uploadChunk(chunkCsv, isFirstChunk);
      totalImported += result.recordsImported;
      console.log(`✓ Chunk ${i + 1} complete - ${result.recordsImported} records imported`);
    } catch (error) {
      console.error(`✗ Chunk ${i + 1} failed:`, error.message);
      process.exit(1);
    }
  }

  console.log('');
  console.log(`✅ Import complete! ${totalImported} records imported successfully`);
  console.log('');
  console.log('🔄 Refreshing materialized views...');
  console.log('   Run: psql $DATABASE_URL -c "SELECT * FROM refresh_all_materialized_views();"');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
