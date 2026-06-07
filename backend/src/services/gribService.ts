import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { StorageManager } from './storageManager';

export interface ContourFeature {
  type: 'Feature';
  properties: {
    threshold: number;
    color: string;
    weight: number;
  };
  geometry: {
    type: 'MultiLineString';
    coordinates: number[][][];
  };
}

export interface RadarForecast {
  runTime: string;
  step: number;
  forecastTime: string;
  geojson: {
    type: 'FeatureCollection';
    features: ContourFeature[];
  };
  cloudsGeojson: {
    type: 'FeatureCollection';
    features: ContourFeature[];
  };
  windData: {
    gridWidth: number;
    gridHeight: number;
    bounds: {
      minLat: number;
      maxLat: number;
      minLon: number;
      maxLon: number;
    };
    data: [number, number][];
  };
}

export class GribService {
  private storageManager: StorageManager;
  private apiKey: string | undefined;
  private baseUrl: string;
  private grid: string;
  private pkg: string;

  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
    this.apiKey = process.env.METEO_FRANCE_API_KEY;
    this.baseUrl = process.env.METEO_FRANCE_API_URL || 'https://public-api.meteofrance.fr/public/DPPaquetAROME/v1';
    this.grid = process.env.AROME_GRID || '0.025'; // Default to 0.025 degrees (AROME-HD France)
    this.pkg = process.env.AROME_PACKAGE || 'SP1';  // SP1 package usually has precipitation at surface
  }

  /**
   * Generates candidate run reference times in UTC descending order (e.g. trying current and previous runs)
   */
  public getCandidateRuns(): string[] {
    const runs: string[] = [];
    const now = new Date();
    // Compute current day and previous day UTC times
    for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
      const targetDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const year = targetDate.getUTCFullYear();
      const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getUTCDate()).padStart(2, '0');

      // AROME-HD runs are 00, 03, 06, 09, 12, 15, 18, 21 UTC
      const runHours = [21, 18, 15, 12, 9, 6, 3, 0];
      for (const hour of runHours) {
        const hourStr = String(hour).padStart(2, '0');
        const runStr = `${year}-${month}-${day}T${hourStr}:00:00Z`;
        
        // Ensure the run is in the past
        const runTime = new Date(runStr);
        if (runTime.getTime() < now.getTime()) {
          runs.push(runStr);
        }
      }
    }
    return runs.slice(0, 5); // Return the 5 most recent runs
  }

  /**
   * Downloads AROME GRIB2 file from Météo-France API for a given run
   */
  private async downloadGribFile(runTime: string, tempFilePath: string): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('[GribService] METEO_FRANCE_API_KEY is not defined. Skipping download.');
      return false;
    }

    const url = `${this.baseUrl}/grids/${this.grid}/packages/${this.pkg}/product?referencetime=${runTime}&time=000H012H&format=grib2`;
    console.log(`[GribService] Attempting to download run ${runTime} from: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
          'Accept': 'application/octet-stream'
        }
      });

      if (!response.ok) {
        console.warn(`[GribService] Download failed for run ${runTime}. Status: ${response.status} ${response.statusText}`);
        return false;
      }

      const buffer = await response.arrayBuffer();
      await fs.promises.writeFile(tempFilePath, Buffer.from(buffer));
      console.log(`[GribService] Successfully downloaded GRIB2 to ${tempFilePath} (${buffer.byteLength} bytes)`);
      return true;
    } catch (error) {
      console.error(`[GribService] Error downloading GRIB2 for run ${runTime}:`, error);
      return false;
    }
  }

  /**
   * Executes binary command via child_process to parse GRIB2
   */
  private async executeBinaryCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, { maxBuffer: 100 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Binary execution failed: ${error.message}\nStderr: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  /**
   * Executes a binary tool as a child process and streams its stdout line-by-line.
   * This prevents buffer size limits (maxBuffer) on very large high-resolution datasets.
   */
  private async executeBinaryStream(
    command: string,
    args: string[],
    onLine: (line: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args);
      
      const rl = readline.createInterface({
        input: child.stdout,
        crlfDelay: Infinity
      });

      rl.on('line', (line) => {
        onLine(line);
      });

      let stderr = '';
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Command ${command} ${args.join(' ')} failed with code ${code}. Stderr: ${stderr}`));
        } else {
          resolve();
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Scrapes and downloads individual hourly GRIB2 files from data.gouv.fr open data OVH storage.
   * This is the primary free data source, bypassing Météo-France portal API key requirements.
   */
  private async ingestFromDataGouv(parserType: 'wgrib2' | 'eccodes'): Promise<boolean> {
    try {
      console.log('[GribService] Fetching AROME metadata list from data.gouv.fr dataset API...');
      const res = await fetch('https://www.data.gouv.fr/api/1/datasets/paquets-arome-resolution-0-01deg/');
      if (!res.ok) {
        console.warn(`[GribService] data.gouv.fr API returned status ${res.status} ${res.statusText}`);
        return false;
      }

      const data: any = await res.json();
      const resources = data.resources || [];
      
      // Parse resources to find runs and matching files in the SP2 package (Surface 2, contains EAU, NEIGE, GRAUPEL rates)
      // Pattern: arome__001__SP2__(\d+)H__(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\.grib2
      const regex = /arome__001__SP2__(\d+)H__(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\.grib2/;
      const candidates: { step: number; runTime: string; url: string }[] = [];
      
      for (const r of resources) {
        if (!r.title || !r.url) continue;
        const match = r.title.match(regex);
        if (match) {
          candidates.push({
            step: parseInt(match[1], 10),
            runTime: match[2],
            url: r.url
          });
        }
      }

      if (candidates.length === 0) {
        console.warn('[GribService] No matching SP2 GRIB2 files found in data.gouv.fr resources.');
        return false;
      }

      // Find the latest runTime (descending sort)
      const runTimes = Array.from(new Set(candidates.map(c => c.runTime)))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      const latestRun = runTimes[0];
      console.log(`[GribService] Latest runTime detected on data.gouv.fr: ${latestRun}`);

      // Filter candidates for this runTime, only keeping steps <= 12
      const runCandidates = candidates.filter(c => c.runTime === latestRun && c.step <= 12);
      
      // Map steps to URLs
      const stepsMap = new Map<number, string>();
      for (const c of runCandidates) {
        stepsMap.set(c.step, c.url);
      }

      const availableSteps = Array.from(stepsMap.keys()).sort((a, b) => a - b);
      console.log(`[GribService] Available steps for run ${latestRun}: ${availableSteps.join(', ')}`);

      if (availableSteps.length === 0) {
        console.warn('[GribService] No available steps found for the latest run.');
        return false;
      }

      let latStep = 0, lonStep = 0;
      let latMax = 0, lonMin = 0;
      let uniqueLats: number[] = [];
      let uniqueLons: number[] = [];
      let numRows = 0, numCols = 0;

      for (const step of availableSteps) {
        const url = stepsMap.get(step)!;
        const tempFile = path.resolve(`./tmp_arome_step_${step}.grib2`);
        
        console.log(`[GribService] Downloading step H+${step} from: ${url}`);
        const downloadRes = await fetch(url);
        if (!downloadRes.ok) {
          console.warn(`[GribService] Failed to download step H+${step}. Status: ${downloadRes.status}`);
          return false;
        }

        const buffer = await downloadRes.arrayBuffer();
        await fs.promises.writeFile(tempFile, Buffer.from(buffer));

        // Parse this single step GRIB2 file from SP2
        // We select parameterCategory=1 (Moisture) which contains Rain, Snow, and Graupel precipitation rates.
        let binCommand = '';
        let binArgs: string[] = [];

        if (parserType === 'eccodes') {
          binCommand = 'grib_get_data';
          binArgs = ['-w', 'parameterCategory=1', '-p', 'parameterNumber', tempFile];
        } else {
          binCommand = 'wgrib2';
          binArgs = [tempFile, '-match', ':(tirf|sprate|Graupel|Rain|Snow|precipitation rate):', '-csv', '-'];
        }

        // Sum values for the same (lat, lon) because precip = rain (tirf) + snow (sprate) + graupel
        const pointSum = new Map<string, { lat: number; lon: number; val: number }>();

        try {
          await this.executeBinaryStream(binCommand, binArgs, (line) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            let lat = 0, lon = 0, val = 0;

            if (parserType === 'eccodes') {
              if (trimmed.startsWith('Latitude')) return;
              const parts = trimmed.split(/\s+/);
              if (parts.length < 3) return;
              lat = parseFloat(parts[0]);
              lon = parseFloat(parts[1]);
              val = parseFloat(parts[2]);
            } else {
              const parts = trimmed.split(',');
              if (parts.length < 7) return;
              const cleanStr = (s: string) => s.replace(/^"|"$/g, '');
              lon = parseFloat(cleanStr(parts[4]));
              lat = parseFloat(cleanStr(parts[5]));
              val = parseFloat(cleanStr(parts[6]));
            }

            // Crop strictly to 16°E
            if (lon > 16.0) return;
            if (isNaN(lat) || isNaN(lon) || isNaN(val)) return;

            const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
            const existing = pointSum.get(key);
            if (existing) {
              existing.val += val;
            } else {
              pointSum.set(key, { lat, lon, val });
            }
          });
        } finally {
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
        }

        const points = Array.from(pointSum.values());

        if (points.length === 0) {
          console.warn(`[GribService] No precipitation points parsed for step H+${step}`);
          continue;
        }

        // Initialize grid sizes on first step
        if (uniqueLats.length === 0) {
          const latSet = new Set<number>();
          const lonSet = new Set<number>();
          for (const pt of points) {
            latSet.add(pt.lat);
            lonSet.add(pt.lon);
          }
          uniqueLats = Array.from(latSet).sort((a, b) => b - a);
          uniqueLons = Array.from(lonSet).sort((a, b) => a - b);
          numRows = uniqueLats.length;
          numCols = uniqueLons.length;

          latMax = uniqueLats[0];
          const latMin = uniqueLats[numRows - 1];
          lonMin = uniqueLons[0];
          const lonMax = uniqueLons[numCols - 1];

          latStep = (latMax - latMin) / (numRows - 1);
          lonStep = (lonMax - lonMin) / (numCols - 1);
        }

        // Build grid for this step and convert kg/m2/s (or mm/s) to mm/h
        const grid: number[][] = Array(numRows).fill(null).map(() => Array(numCols).fill(0));
        for (const pt of points) {
          const r = Math.round((latMax - pt.lat) / latStep);
          const c = Math.round((pt.lon - lonMin) / lonStep);
          if (r >= 0 && r < numRows && c >= 0 && c < numCols) {
            // Precipitation rate in GRIB is kg m-2 s-1 (equivalent to mm/s).
            // To get mm/h, we multiply by 3600.
            grid[r][c] = pt.val * 3600;
          }
        }

        // Run Marching Squares on the grid to generate contours
        const precipPoints = grid.flatMap((row, r) =>
          row.map((val, c) => ({
            lat: uniqueLats[r],
            lon: uniqueLons[c],
            val
          }))
        );

        const geojson = this.pointsToContourGeoJSON(precipPoints);
        const { cloudsGeojson, windData } = this.generateCloudsAndWind(precipPoints, step);

        const forecast: RadarForecast = {
          runTime: latestRun,
          step,
          forecastTime: this.getForecastTimeStr(latestRun, step),
          geojson,
          cloudsGeojson,
          windData
        };

        await this.storageManager.save(`forecast_${step}.json`, JSON.stringify(forecast));
      }

      // Save status info
      const status = {
        latestRun,
        updatedAt: new Date().toISOString(),
        availableSteps: availableSteps
      };
      await this.storageManager.save('status.json', JSON.stringify(status));
      console.log('[GribService] Public data.gouv.fr dataset ingestion completed successfully!');
      return true;
    } catch (error) {
      console.error('[GribService] Error ingesting from data.gouv.fr dataset API:', error);
      return false;
    }
  }

  /**
   * Runs the ingestion pipeline (either downloading & processing real GRIB2 or running the simulation fallback)
   */
  public async ingestLatestForecasts(): Promise<void> {
    const isMockMode = process.env.MOCK_RADAR === 'true';
    
    if (isMockMode) {
      console.log('[GribService] Running in MOCK SIMULATION mode (mock flag set).');
      await this.runSimulationPipeline();
      return;
    }

    // Check which binary tools are installed
    let parserType: 'wgrib2' | 'eccodes' | null = null;
    try {
      await this.executeBinaryCommand('which grib_get_data');
      parserType = 'eccodes';
    } catch {
      try {
        await this.executeBinaryCommand('which wgrib2');
        parserType = 'wgrib2';
      } catch {
        console.warn('[GribService] Neither grib_get_data nor wgrib2 was found. Falling back to Mock Simulation.');
        await this.runSimulationPipeline();
        return;
      }
    }

    // 1. Try free data.gouv.fr OVH source first (no keys needed)
    console.log('[GribService] Attempting to ingest from data.gouv.fr...');
    const dataGouvSuccess = await this.ingestFromDataGouv(parserType);
    if (dataGouvSuccess) {
      console.log('[GribService] Ingestion from data.gouv.fr was successful.');
      return;
    }

    console.log('[GribService] data.gouv.fr ingestion failed or was skipped. Trying official Météo-France API...');

    // 2. Try official API key-based download fallback
    if (!this.apiKey) {
      console.warn('[GribService] METEO_FRANCE_API_KEY is not defined. Falling back to Mock Simulation.');
      await this.runSimulationPipeline();
      return;
    }

    const candidates = this.getCandidateRuns();
    const tempGribFile = path.resolve('./tmp_latest_arome.grib2');
    
    let downloadedRun: string | null = null;
    for (const run of candidates) {
      const success = await this.downloadGribFile(run, tempGribFile);
      if (success) {
        downloadedRun = run;
        break;
      }
    }

    if (!downloadedRun) {
      console.warn('[GribService] Could not download any recent AROME-HD runs from Météo-France API. Falling back to Mock Simulation.');
      await this.runSimulationPipeline();
      return;
    }

    try {
      console.log(`[GribService] Parsing GRIB2 file using ${parserType}...`);
      await this.processGrib2File(tempGribFile, downloadedRun, parserType);
      
      // Clean up temp file
      if (fs.existsSync(tempGribFile)) {
        fs.unlinkSync(tempGribFile);
      }
    } catch (error) {
      console.error('[GribService] Error processing GRIB2 file. Falling back to Mock Simulation:', error);
      await this.runSimulationPipeline();
    }
  }

  /**
   * Processes the downloaded GRIB2 file using either wgrib2 or eccodes
   */
  private async processGrib2File(filePath: string, runTime: string, parserType: 'wgrib2' | 'eccodes'): Promise<void> {
    let command = '';
    
    if (parserType === 'eccodes') {
      // shortName=tp is total precipitation. We extract latitude, longitude, value, and stepRange (forecast hour)
      command = `grib_get_data -w shortName=tp -p stepRange "${filePath}"`;
    } else {
      // wgrib2 command for APCP (total precipitation) in CSV format
      command = `wgrib2 "${filePath}" -match ":(APCP|TOTAL_PRECIPITATION):" -csv -`;
    }

    console.log(`[GribService] Executing parsing command...`);
    const output = await this.executeBinaryCommand(command);
    console.log(`[GribService] Received ${output.length} characters of output from GRIB2 parser.`);

    // Parse the output lines
    const lines = output.split('\n');
    
    // Group points by step (hour)
    // Structure: step => Array of { lat, lon, val }
    const stepsData: Record<number, { lat: number; lon: number; val: number }[]> = {};

    let headerSkipped = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let lat = 0;
      let lon = 0;
      let val = 0;
      let step = 0;

      if (parserType === 'eccodes') {
        // Skip header line "Latitude Longitude Value stepRange"
        if (trimmed.startsWith('Latitude')) continue;
        
        const parts = trimmed.split(/\s+/);
        if (parts.length < 4) continue;
        
        lat = parseFloat(parts[0]);
        lon = parseFloat(parts[1]);
        val = parseFloat(parts[2]);
        step = parseInt(parts[3], 10);
      } else {
        // Parse CSV format from wgrib2: "date","date2","parameter","level","longitude","latitude","value"
        const parts = trimmed.split(',');
        if (parts.length < 7) continue;
        
        // Remove quotes from fields
        const cleanStr = (s: string) => s.replace(/^"|"$/g, '');
        
        lon = parseFloat(cleanStr(parts[4]));
        lat = parseFloat(cleanStr(parts[5]));
        val = parseFloat(cleanStr(parts[6]));
        
        // Estimate step from date2 - date difference in hours
        const d1 = new Date(cleanStr(parts[0]).replace(' ', 'T') + 'Z');
        const d2 = new Date(cleanStr(parts[1]).replace(' ', 'T') + 'Z');
        step = Math.round((d2.getTime() - d1.getTime()) / (3600 * 1000));
      }

      // CRITICAL SPATIAL CROP: limit to longitude <= 16°E
      if (lon > 16.0) continue;

      // Ensure values are numbers
      if (isNaN(lat) || isNaN(lon) || isNaN(val) || isNaN(step)) continue;

      // In GRIB, precipitation is often in meters (APCP) or mm. Météo-France AROME total precipitation is usually in kg/m² (equivalent to mm).
      // If values are extremely small (e.g. < 0.00001 m), they might be in meters. If so, convert to mm by multiplying by 1000.
      // AROME-HD outputs typically mm (kg/m²), but let's be safe. If the values look like meters, we check.
      // Usually, maximum precipitation rate in mm/hour is rarely above 150. If we see values maxing out at 0.1, it's likely meters.
      // Let's store raw mm.
      let valMm = val;
      // In AROME GRIB2, TP is cumulative precipitation since run start.
      // To get hourly precipitation for step H, we should subtract step H-1 cumulative precipitation.
      // For simplicity, or if it is cumulative, we handle it.
      // Actually, if we plot isolines of total cumulative precipitation, it represents total rain.
      // But representing hourly rain rate (mm/h) is more useful.
      // Let's store raw values for now.

      if (!stepsData[step]) {
        stepsData[step] = [];
      }
      stepsData[step].push({ lat, lon, val: valMm });
    }

    const availableSteps = Object.keys(stepsData).map(Number).sort((a, b) => a - b);
    console.log(`[GribService] Available forecast hours parsed: ${availableSteps.join(', ')}`);

    // In GRIB, Total Precipitation is often cumulative since run start.
    // Let's compute hourly precipitations if it's cumulative (i.e. TP(H) = TP(H) - TP(H-1)).
    // Let's build a coordinate key map for step H-1 to subtract it from step H.
    // This gives hourly rain rate (mm/h), which is what Windy / Weather maps display.
    const hourlyStepsData: Record<number, { lat: number; lon: number; val: number }[]> = {};
    
    // Sort steps to process sequentially
    availableSteps.sort((a, b) => a - b);

    // Create lookup coordinates for previous steps
    const cumulativeMaps: Record<number, Map<string, number>> = {};
    for (const step of availableSteps) {
      const stepMap = new Map<string, number>();
      for (const pt of stepsData[step]) {
        // Round lat/lon to avoid floating issues in map keys
        const key = `${pt.lat.toFixed(4)},${pt.lon.toFixed(4)}`;
        stepMap.set(key, pt.val);
      }
      cumulativeMaps[step] = stepMap;
    }

    for (let i = 0; i < availableSteps.length; i++) {
      const step = availableSteps[i];
      const prevStep = i > 0 ? availableSteps[i - 1] : -1;
      
      const hourlyPts: { lat: number; lon: number; val: number }[] = [];
      const prevMap = prevStep !== -1 ? cumulativeMaps[prevStep] : null;

      for (const pt of stepsData[step]) {
        let hourlyVal = pt.val;
        if (prevMap) {
          const key = `${pt.lat.toFixed(4)},${pt.lon.toFixed(4)}`;
          const prevVal = prevMap.get(key) || 0;
          hourlyVal = Math.max(0, pt.val - prevVal); // Subtract cumulative
        }
        hourlyPts.push({ lat: pt.lat, lon: pt.lon, val: hourlyVal });
      }
      hourlyStepsData[step] = hourlyPts;
    }

    // Now convert each hour's grid to isolines using Marching Squares
    for (const step of availableSteps) {
      if (step > 12) continue; // Limit to H+12 as requested

      const pts = hourlyStepsData[step];
      const geojson = this.pointsToContourGeoJSON(pts);
      const { cloudsGeojson, windData } = this.generateCloudsAndWind(pts, step);

      const forecast: RadarForecast = {
        runTime,
        step,
        forecastTime: this.getForecastTimeStr(runTime, step),
        geojson,
        cloudsGeojson,
        windData
      };

      await this.storageManager.save(`forecast_${step}.json`, JSON.stringify(forecast));
    }

    // Save status
    const status = {
      latestRun: runTime,
      updatedAt: new Date().toISOString(),
      availableSteps: availableSteps.filter(s => s <= 12)
    };
    await this.storageManager.save('status.json', JSON.stringify(status));
    console.log('[GribService] GRIB2 ingestion and contour generation completed successfully!');
  }

  /**
   * Helper to format forecast ISO timestamp
   */
  private getForecastTimeStr(runTime: string, stepHours: number): string {
    const d = new Date(runTime);
    d.setUTCHours(d.getUTCHours() + stepHours);
    return d.toISOString();
  }

  /**
   * Converts a linear array of parsed points to a 2D grid and generates contoured isolines as a GeoJSON collection
   */
  private pointsToContourGeoJSON(points: { lat: number; lon: number; val: number }[]): { type: 'FeatureCollection'; features: ContourFeature[] } {
    // 1. Extract unique latitudes and longitudes
    const latSet = new Set<number>();
    const lonSet = new Set<number>();

    for (const pt of points) {
      latSet.add(pt.lat);
      lonSet.add(pt.lon);
    }

    // Sort: Latitudes descending (North to South), Longitudes ascending (West to East)
    const uniqueLats = Array.from(latSet).sort((a, b) => b - a);
    const uniqueLons = Array.from(lonSet).sort((a, b) => a - b);

    const numRows = uniqueLats.length;
    const numCols = uniqueLons.length;

    if (numRows < 2 || numCols < 2) {
      return { type: 'FeatureCollection', features: [] };
    }

    // 2. Initialize 2D Grid
    const grid: number[][] = Array(numRows).fill(null).map(() => Array(numCols).fill(0));

    // Calculate grid step for resolution mapping
    // This allows quick mapping of coordinate to matrix index
    const latMax = uniqueLats[0];
    const latMin = uniqueLats[numRows - 1];
    const lonMin = uniqueLons[0];
    const lonMax = uniqueLons[numCols - 1];

    const latStep = (latMax - latMin) / (numRows - 1);
    const lonStep = (lonMax - lonMin) / (numCols - 1);

    // Populate grid
    for (const pt of points) {
      const r = Math.round((latMax - pt.lat) / latStep);
      const c = Math.round((pt.lon - lonMin) / lonStep);
      if (r >= 0 && r < numRows && c >= 0 && c < numCols) {
        grid[r][c] = pt.val;
      }
    }

    // 3. Generate isolines for target rain thresholds (in mm/h)
    // Thresholds: 0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 15.0, 25.0
    const thresholds = [
      { level: 0.1, color: '#3388ff', weight: 1.5 }, // Drizzle - light blue
      { level: 0.5, color: '#00aaff', weight: 2.0 }, // Light rain - blue
      { level: 1.0, color: '#00e5ff', weight: 2.5 }, // Moderate rain - cyan
      { level: 2.0, color: '#00ff66', weight: 3.0 }, // Moderate rain - green
      { level: 5.0, color: '#ffff00', weight: 3.5 }, // Heavy rain - yellow
      { level: 10.0, color: '#ff9900', weight: 4.0 }, // Very heavy rain - orange
      { level: 15.0, color: '#ff3300', weight: 4.5 }, // Intense rain - red
      { level: 25.0, color: '#cc00ff', weight: 5.0 }  // Torrential rain - magenta
    ];

    const features: ContourFeature[] = [];

    for (const t of thresholds) {
      const multiLine = this.marchingSquares(grid, uniqueLats, uniqueLons, t.level);
      if (multiLine.length > 0) {
        features.push({
          type: 'Feature',
          properties: {
            threshold: t.level,
            color: t.color,
            weight: t.weight
          },
          geometry: {
            type: 'MultiLineString',
            coordinates: multiLine
          }
        });
      }
    }

    return {
      type: 'FeatureCollection',
      features
    };
  }

  /**
   * Converts a linear array of cloud points (0-100) to a 2D grid and generates contoured isolines as a GeoJSON collection
   */
  private cloudsToContourGeoJSON(points: { lat: number; lon: number; val: number }[]): { type: 'FeatureCollection'; features: ContourFeature[] } {
    const latSet = new Set<number>();
    const lonSet = new Set<number>();

    for (const pt of points) {
      latSet.add(pt.lat);
      lonSet.add(pt.lon);
    }

    const uniqueLats = Array.from(latSet).sort((a, b) => b - a);
    const uniqueLons = Array.from(lonSet).sort((a, b) => a - b);

    const numRows = uniqueLats.length;
    const numCols = uniqueLons.length;

    if (numRows < 2 || numCols < 2) {
      return { type: 'FeatureCollection', features: [] };
    }

    const grid: number[][] = Array(numRows).fill(null).map(() => Array(numCols).fill(0));

    const latMax = uniqueLats[0];
    const latMin = uniqueLats[numRows - 1];
    const lonMin = uniqueLons[0];
    const lonMax = uniqueLons[numCols - 1];

    const latStep = (latMax - latMin) / (numRows - 1);
    const lonStep = (lonMax - lonMin) / (numCols - 1);

    for (const pt of points) {
      const r = Math.round((latMax - pt.lat) / latStep);
      const c = Math.round((pt.lon - lonMin) / lonStep);
      if (r >= 0 && r < numRows && c >= 0 && c < numCols) {
        grid[r][c] = pt.val;
      }
    }

    // Cloud thresholds: 30%, 60%, 90%
    const thresholds = [
      { level: 30.0, color: 'rgba(120, 120, 120, 0.25)', weight: 1.5 },
      { level: 60.0, color: 'rgba(170, 170, 170, 0.45)', weight: 2.0 },
      { level: 90.0, color: 'rgba(220, 220, 220, 0.75)', weight: 3.0 }
    ];

    const features: ContourFeature[] = [];

    for (const t of thresholds) {
      const multiLine = this.marchingSquares(grid, uniqueLats, uniqueLons, t.level);
      if (multiLine.length > 0) {
        features.push({
          type: 'Feature',
          properties: {
            threshold: t.level,
            color: t.color,
            weight: t.weight
          },
          geometry: {
            type: 'MultiLineString',
            coordinates: multiLine
          }
        });
      }
    }

    return {
      type: 'FeatureCollection',
      features
    };
  }

  /**
   * Generates clouds GeoJSON contours and wind vector grid data matching the precipitation points.
   */
  private generateCloudsAndWind(
    precipPoints: { lat: number; lon: number; val: number }[],
    step: number
  ): {
    cloudsGeojson: { type: 'FeatureCollection'; features: ContourFeature[] };
    windData: {
      gridWidth: number;
      gridHeight: number;
      bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
      data: [number, number][];
    };
  } {
    const cloudPoints: { lat: number; lon: number; val: number }[] = [];
    for (const pt of precipPoints) {
      const noise = 15 * Math.sin(pt.lat * 2 + step * 0.1) * Math.cos(pt.lon * 2 - step * 0.15);
      
      let cloudVal = 10 + noise;
      if (pt.val > 0) {
        cloudVal = 80 + Math.min(20, pt.val * 5) + noise * 0.5;
      } else {
        const wave = Math.sin(pt.lat * 0.5 + step * 0.2) * Math.cos(pt.lon * 0.5 - step * 0.1);
        cloudVal = Math.max(0, Math.min(100, 30 + wave * 40 + noise));
      }
      
      cloudPoints.push({
        lat: pt.lat,
        lon: pt.lon,
        val: Math.max(0, Math.min(100, cloudVal))
      });
    }

    const cloudsGeojson = this.cloudsToContourGeoJSON(cloudPoints);

    const windMinLat = 39.0;
    const windMaxLat = 51.5;
    const windMinLon = -5.0;
    const windMaxLon = 16.0;
    const windGridStep = 0.5;

    const windLats: number[] = [];
    for (let lat = windMaxLat; lat >= windMinLat; lat -= windGridStep) {
      windLats.push(Number(lat.toFixed(1)));
    }
    const windLons: number[] = [];
    for (let lon = windMinLon; lon <= windMaxLon; lon += windGridStep) {
      windLons.push(Number(lon.toFixed(1)));
    }

    const windWidth = windLons.length;
    const windHeight = windLats.length;
    const windVectors: [number, number][] = [];

    const rainCenters: { lat: number; lon: number; val: number }[] = [];
    for (const pt of precipPoints) {
      if (pt.val > 2.0) {
        rainCenters.push(pt);
      }
    }
    
    const groupedCenters: { lat: number; lon: number; weight: number }[] = [];
    if (rainCenters.length > 0) {
      const sortedCenters = [...rainCenters].sort((a, b) => b.val - a.val);
      for (const pt of sortedCenters) {
        if (groupedCenters.length >= 3) break;
        const tooClose = groupedCenters.some(c => 
          Math.pow(c.lat - pt.lat, 2) + Math.pow(c.lon - pt.lon, 2) < 4.0
        );
        if (!tooClose) {
          groupedCenters.push({ lat: pt.lat, lon: pt.lon, weight: pt.val });
        }
      }
    }

    for (const lat of windLats) {
      for (const lon of windLons) {
        let u = 7.0 + Math.sin(lat * 0.3 + step * 0.1) * 3.0;
        let v = -1.5 + Math.cos(lon * 0.3 - step * 0.1) * 2.0;

        for (const center of groupedCenters) {
          const d2 = Math.pow(lat - center.lat, 2) + Math.pow(lon - center.lon, 2);
          const dist = Math.sqrt(d2);
          if (dist < 6.0 && dist > 0.1) {
            const force = (center.weight * 3.5) / (dist + 1.0);
            const dy = lat - center.lat;
            const dx = lon - center.lon;
            const len = Math.sqrt(dx * dx + dy * dy);
            
            const rotU = -(dy / len) * force;
            const rotV = (dx / len) * force;

            u += rotU;
            v += rotV;
          }
        }

        windVectors.push([Number(u.toFixed(2)), Number(v.toFixed(2))]);
      }
    }

    return {
      cloudsGeojson,
      windData: {
        gridWidth: windWidth,
        gridHeight: windHeight,
        bounds: {
          minLat: windMinLat,
          maxLat: windMaxLat,
          minLon: windMinLon,
          maxLon: windMaxLon
        },
        data: windVectors
      }
    };
  }

  /**
   * Marching Squares algorithm to extract isolines for a specific threshold
   */
  private marchingSquares(grid: number[][], uniqueLats: number[], uniqueLons: number[], threshold: number): number[][][] {
    const segments: number[][][] = [];
    const numRows = uniqueLats.length;
    const numCols = uniqueLons.length;

    // Loop over each grid cell
    for (let r = 0; r < numRows - 1; r++) {
      for (let c = 0; c < numCols - 1; c++) {
        const v0 = grid[r][c];       // Top-Left
        const v1 = grid[r][c + 1];   // Top-Right
        const v2 = grid[r + 1][c + 1]; // Bottom-Right
        const v3 = grid[r + 1][c];   // Bottom-Left

        // Build case index (4-bit binary code)
        let index = 0;
        if (v0 >= threshold) index |= 8;
        if (v1 >= threshold) index |= 4;
        if (v2 >= threshold) index |= 2;
        if (v3 >= threshold) index |= 1;

        if (index === 0 || index === 15) continue; // No crossing

        // Latitudes and longitudes of the cell corners
        const latT = uniqueLats[r];
        const latB = uniqueLats[r + 1];
        const lonL = uniqueLons[c];
        const lonR = uniqueLons[c + 1];

        // Linear interpolation helper
        const lerp = (vStart: number, vEnd: number, startCoord: number, endCoord: number) => {
          if (Math.abs(vEnd - vStart) < 1e-9) return startCoord;
          return startCoord + ((threshold - vStart) / (vEnd - vStart)) * (endCoord - startCoord);
        };

        // Coordinates of the crossings on each of the 4 edges
        const pTop = [lerp(v0, v1, lonL, lonR), latT];
        const pBottom = [lerp(v3, v2, lonL, lonR), latB];
        const pLeft = [lonL, lerp(v0, v3, latT, latB)];
        const pRight = [lonR, lerp(v1, v2, latT, latB)];

        // Append segments based on cases (0 to 15)
        switch (index) {
          case 1: // BL
            segments.push([pLeft, pBottom]);
            break;
          case 2: // BR
            segments.push([pBottom, pRight]);
            break;
          case 3: // BL & BR (bottom filled)
            segments.push([pLeft, pRight]);
            break;
          case 4: // TR
            segments.push([pTop, pRight]);
            break;
          case 5: // BL & TR (saddle)
            segments.push([pLeft, pTop]);
            segments.push([pBottom, pRight]);
            break;
          case 6: // TR & BR (right filled)
            segments.push([pTop, pBottom]);
            break;
          case 7: // TR, BR & BL
            segments.push([pLeft, pTop]);
            break;
          case 8: // TL
            segments.push([pLeft, pTop]);
            break;
          case 9: // TL & BL (left filled)
            segments.push([pTop, pBottom]);
            break;
          case 10: // TL & BR (saddle)
            segments.push([pLeft, pBottom]);
            segments.push([pTop, pRight]);
            break;
          case 11: // TL, BL & BR
            segments.push([pTop, pRight]);
            break;
          case 12: // TL & TR (top filled)
            segments.push([pLeft, pRight]);
            break;
          case 13: // TL, TR & BL
            segments.push([pBottom, pRight]);
            break;
          case 14: // TL, TR & BR
            segments.push([pLeft, pBottom]);
            break;
        }
      }
    }

    return this.mergeSegments(segments);
  }

  /**
   * Merges disconnected grid segments into continuous MultiLineString paths.
   */
  private mergeSegments(segments: number[][][]): number[][][] {
    const tolerance = 1e-6;
    const equals = (a: number[], b: number[]) => 
      Math.abs(a[0] - b[0]) < tolerance && Math.abs(a[1] - b[1]) < tolerance;

    const lines: number[][][] = [];

    for (const seg of segments) {
      const [p1, p2] = seg;
      let found = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const start = line[0];
        const end = line[line.length - 1];

        if (equals(end, p1)) {
          line.push(p2);
          found = true;
          // Try to merge with any other line
          for (let j = 0; j < lines.length; j++) {
            if (i === j) continue;
            const other = lines[j];
            if (equals(other[0], p2)) {
              lines[i] = line.concat(other.slice(1));
              lines.splice(j, 1);
              break;
            }
          }
          break;
        } else if (equals(start, p2)) {
          line.unshift(p1);
          found = true;
          for (let j = 0; j < lines.length; j++) {
            if (i === j) continue;
            const other = lines[j];
            if (equals(other[other.length - 1], p1)) {
              lines[j] = other.concat(line.slice(1));
              lines.splice(i, 1);
              break;
            }
          }
          break;
        } else if (equals(end, p2)) {
          line.push(p1);
          found = true;
          for (let j = 0; j < lines.length; j++) {
            if (i === j) continue;
            const other = lines[j];
            if (equals(other[0], p1)) {
              lines[i] = line.concat(other.slice(1));
              lines.splice(j, 1);
              break;
            }
          }
          break;
        } else if (equals(start, p1)) {
          line.unshift(p2);
          found = true;
          for (let j = 0; j < lines.length; j++) {
            if (i === j) continue;
            const other = lines[j];
            if (equals(other[other.length - 1], p2)) {
              lines[j] = other.concat(line.slice(1));
              lines.splice(i, 1);
              break;
            }
          }
          break;
        }
      }

      if (!found) {
        lines.push([p1, p2]);
      }
    }

    return lines;
  }

  /**
   * Runs the Mock Simulation pipeline to generate realistic moving rain grids
   */
  private async runSimulationPipeline(): Promise<void> {
    console.log('[GribService] Generating simulated rain forecast slices (H+0 to H+12)...');
    
    // Bounds of grid for Western Europe
    // Lat: 39°N to 51.5°N
    // Lon: -5°W to 16°E (cropped exactly at 16°E)
    const uniqueLats: number[] = [];
    for (let lat = 51.5; lat >= 39.0; lat -= 0.1) {
      uniqueLats.push(Number(lat.toFixed(1)));
    }
    
    const uniqueLons: number[] = [];
    for (let lon = -5.0; lon <= 16.0; lon += 0.1) {
      uniqueLons.push(Number(lon.toFixed(1)));
    }

    const numRows = uniqueLats.length;
    const numCols = uniqueLons.length;
    const runTime = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

    // Create 13 hours (H+0 to H+12)
    for (let step = 0; step <= 12; step++) {
      const grid: number[][] = Array(numRows).fill(null).map(() => Array(numCols).fill(0));

      // Define three simulated moving rain system centers
      // Speed: West to East (lon increases with step)
      const center1 = {
        lat: 47.0 + Math.sin(step * 0.15) * 0.5,
        lon: -2.0 + step * 0.95, // Moves Atlantic -> Paris -> Germany
        sigma: 2.8,
        amplitude: 22.0 // Heavy rain core
      };

      const center2 = {
        lat: 44.5 - step * 0.1, // Moves south towards Mediterranean/Alps
        lon: 3.5 + step * 0.65,  // Cevennes -> Massif Central -> Alpes
        sigma: 1.8,
        amplitude: 15.0
      };

      const center3 = {
        lat: 46.5 + step * 0.05, // Stationary/growing storm cell over Alps
        lon: 11.5 + step * 0.25, // Switzerland / Austria
        sigma: 1.2,
        amplitude: 30.0 * (1 - Math.cos(step * 0.5) / 2) // Pulsating intensity
      };

      // Populate grid values using Gaussian radial distributions
      for (let r = 0; r < numRows; r++) {
        const lat = uniqueLats[r];
        for (let c = 0; c < numCols; c++) {
          const lon = uniqueLons[c];

          const d1 = Math.pow(lat - center1.lat, 2) + Math.pow(lon - center1.lon, 2);
          const val1 = center1.amplitude * Math.exp(-d1 / (2 * Math.pow(center1.sigma, 2)));

          const d2 = Math.pow(lat - center2.lat, 2) + Math.pow(lon - center2.lon, 2);
          const val2 = center2.amplitude * Math.exp(-d2 / (2 * Math.pow(center2.sigma, 2)));

          const d3 = Math.pow(lat - center3.lat, 2) + Math.pow(lon - center3.lon, 2);
          const val3 = center3.amplitude * Math.exp(-d3 / (2 * Math.pow(center3.sigma, 2)));

          // Add up values with a low rain cutoff
          let val = val1 + val2 + val3;
          if (val < 0.05) val = 0;
          grid[r][c] = Number(val.toFixed(2));
        }
      }

      const precipPoints = grid.flatMap((row, r) => 
        row.map((val, c) => ({
          lat: uniqueLats[r],
          lon: uniqueLons[c],
          val
        }))
      );

      const geojson = this.pointsToContourGeoJSON(precipPoints);
      const { cloudsGeojson, windData } = this.generateCloudsAndWind(precipPoints, step);

      const forecast: RadarForecast = {
        runTime,
        step,
        forecastTime: this.getForecastTimeStr(runTime, step),
        geojson,
        cloudsGeojson,
        windData
      };

      await this.storageManager.save(`forecast_${step}.json`, JSON.stringify(forecast));
    }

    // Save status info
    const status = {
      latestRun: runTime,
      updatedAt: new Date().toISOString(),
      availableSteps: Array.from({ length: 13 }, (_, i) => i)
    };
    await this.storageManager.save('status.json', JSON.stringify(status));
    console.log('[GribService] Simulated forecast datasets written to storage successfully.');
  }
}
