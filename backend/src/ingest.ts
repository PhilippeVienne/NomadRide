import { StorageManager } from './services/storageManager';
import { GribService } from './services/gribService';

/**
 * AWS Lambda Ingest Handler
 * Triggered by EventBridge schedule to run GRIB2 downloading & processing.
 */
export const handler = async (event: any): Promise<any> => {
  console.log('[IngestLambda] Triggered by event:', JSON.stringify(event));

  const storageManager = new StorageManager();
  const gribService = new GribService(storageManager);

  try {
    console.log('[IngestLambda] Running weather ingest pipeline...');
    await gribService.ingestLatestForecasts();
    console.log('[IngestLambda] Ingest completed successfully.');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        message: 'Precipitation contours ingested successfully.',
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (err: any) {
    console.error('[IngestLambda] Ingest failed:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: 'Ingest pipeline failed.',
        error: err.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

// Support running the script directly from the CLI (e.g. local cron / testing)
const isMainModule = () => {
  if (typeof require !== 'undefined' && require.main === module) {
    return true;
  }
  const mainScript = process.argv[1];
  return mainScript && (mainScript.endsWith('ingest.ts') || mainScript.endsWith('ingest.js') || mainScript.endsWith('ingest'));
};

if (isMainModule()) {
  console.log('[Ingest CLI] Starting manual ingestion...');
  const storageManager = new StorageManager();
  const gribService = new GribService(storageManager);
  
  gribService.ingestLatestForecasts()
    .then(() => {
      console.log('[Ingest CLI] Manual ingestion completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Ingest CLI] Manual ingestion failed:', err);
      process.exit(1);
    });
}
