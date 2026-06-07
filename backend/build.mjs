import { build } from 'esbuild';

// Build Lambda Handler
await build({
  entryPoints: ['src/lambda.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/lambda.js',
  minify: true,
  sourcemap: true,
});

// Build Standalone Server (for Docker/Cloud Run)
await build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/server.js',
  minify: true,
  sourcemap: true,
});

// Build Ingest Handler (for EventBridge Lambda/Worker)
await build({
  entryPoints: ['src/ingest.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/ingest.js',
  minify: true,
  sourcemap: true,
});

console.log('⚡ Build complete');
