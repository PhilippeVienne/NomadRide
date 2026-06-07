import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CONFIG } from '../config';
import { useTranslation } from '../i18n/LanguageContext';

interface RadarModuleProps {
  onNavigateToPitstop: () => void;
}

export default function RadarModule({ onNavigateToPitstop }: RadarModuleProps) {
  const { t } = useTranslation();
  
  // States
  const [status, setStatus] = useState<{ latestRun: string; availableSteps: number[] } | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [prefetchedCount, setPrefetchedCount] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000); // Frame duration in ms
  const [error, setError] = useState<string | null>(null);
  const [showRain, setShowRain] = useState<boolean>(true);
  const [showClouds, setShowClouds] = useState<boolean>(true);
  const [showWind, setShowWind] = useState<boolean>(true);

  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const cloudsLayerRef = useRef<L.GeoJSON | null>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const windDataRef = useRef<any>(null);
  const cachedSlices = useRef<Record<number, any>>({});

  // 1. Initial status and background prefetcher load
  useEffect(() => {
    let active = true;

    async function initRadar() {
      try {
        setError(null);
        const res = await fetch(CONFIG.ENDPOINTS.RADAR_STATUS);
        if (!res.ok) {
          throw new Error('Radar status API returned an error.');
        }
        
        const statusData = await res.json();
        if (!active) return;
        setStatus(statusData);

        const steps = statusData.availableSteps || [];
        if (steps.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch step 0 first so we can mount the map immediately without delays
        const step0 = steps[0];
        try {
          const res0 = await fetch(CONFIG.ENDPOINTS.RADAR_FORECAST(step0));
          if (res0.ok) {
            const data0 = await res0.json();
            cachedSlices.current[step0] = data0;
            setPrefetchedCount((c) => c + 1);
            setActiveStep(step0);
            setLoading(false); // Map can now initialize
          } else {
            throw new Error(`Failed to load step H+${step0}`);
          }
        } catch (e) {
          console.error('[RadarModule] Initial slice fetch failed:', e);
          setLoading(false);
        }

        // Prefetch other slices in the background
        for (const step of steps) {
          if (step === step0) continue;
          if (!active) return;

          try {
            const resStep = await fetch(CONFIG.ENDPOINTS.RADAR_FORECAST(step));
            if (resStep.ok) {
              const dataStep = await resStep.json();
              cachedSlices.current[step] = dataStep;
              setPrefetchedCount((c) => c + 1);
            }
          } catch (e) {
            console.error(`[RadarModule] Error prefetching step H+${step}:`, e);
          }
        }
      } catch (err: any) {
        console.error('[RadarModule] Failed to init radar:', err);
        if (active) {
          setError('Failed to fetch radar forecast. Ensure backend service is running and ingestion has been completed.');
          setLoading(false);
        }
      }
    }

    initRadar();

    return () => {
      active = false;
    };
  }, []);

  // 2. Leaflet Map setup
  useEffect(() => {
    if (loading || error || !mapContainerRef.current || mapRef.current) return;

    // Center of France/Alps region
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true
    }).setView([46.0, 5.0], 5);

    // Add dark theme base layer (CartoDB Dark matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Add 16°E limit dashed line (shows the bounding crop boundary)
    const limitLine = L.polyline([
      [-90, 16.0],
      [90, 16.0]
    ], {
      color: 'var(--neon-orange)',
      weight: 2,
      dashArray: '8, 12',
      opacity: 0.6
    }).addTo(map);
    
    limitLine.bindTooltip('AROME-HD East boundary limit (16°E)', {
      permanent: false,
      direction: 'left',
      opacity: 0.8
    });

    // Create GeoJSON contour lines layer
    const geojsonLayer = L.geoJSON(undefined, {
      style: (feature: any) => ({
        color: feature?.properties?.color || 'var(--neon-blue)',
        weight: feature?.properties?.weight || 2.5,
        opacity: 0.85
      })
    }).addTo(map);

    // Create GeoJSON cloud contour lines layer
    const cloudsLayer = L.geoJSON(undefined, {
      style: (feature: any) => ({
        color: feature?.properties?.color || 'rgba(170, 170, 170, 0.45)',
        weight: feature?.properties?.weight || 2.0,
        opacity: 0.85
      })
    }).addTo(map);

    mapRef.current = map;
    geojsonLayerRef.current = geojsonLayer;
    cloudsLayerRef.current = cloudsLayer;

    // Load active step data immediately if available in cache
    const data = cachedSlices.current[activeStep];
    if (data) {
      if (data.geojson && showRain) {
        geojsonLayer.addData(data.geojson);
      }
      if (data.cloudsGeojson && showClouds) {
        cloudsLayer.addData(data.cloudsGeojson);
      }
      if (data.windData) {
        windDataRef.current = data.windData;
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        geojsonLayerRef.current = null;
        cloudsLayerRef.current = null;
      }
    };
  }, [loading, error]);

  // 3. Update Map Layers on activeStep or visibility changes
  useEffect(() => {
    const geojsonLayer = geojsonLayerRef.current;
    if (!geojsonLayer) return;

    geojsonLayer.clearLayers();
    const data = cachedSlices.current[activeStep];
    if (showRain && data && data.geojson) {
      geojsonLayer.addData(data.geojson);
    }
  }, [activeStep, showRain]);

  useEffect(() => {
    const cloudsLayer = cloudsLayerRef.current;
    if (!cloudsLayer) return;

    cloudsLayer.clearLayers();
    const data = cachedSlices.current[activeStep];
    if (showClouds && data && data.cloudsGeojson) {
      cloudsLayer.addData(data.cloudsGeojson);
    }
  }, [activeStep, showClouds]);

  useEffect(() => {
    const data = cachedSlices.current[activeStep];
    if (data && data.windData) {
      windDataRef.current = data.windData;
    } else {
      windDataRef.current = null;
    }
  }, [activeStep]);

  // Wind particle model and logic
  interface Particle {
    lat: number;
    lon: number;
    x: number | null;
    y: number | null;
    age: number;
    lifeTime: number;
  }

  const getWindAt = (lat: number, lon: number): [number, number] => {
    const wind = windDataRef.current;
    if (!wind || !wind.data || wind.data.length === 0) return [0, 0];

    const { minLat, maxLat, minLon, maxLon } = wind.bounds;
    if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) {
      return [0, 0];
    }

    const xPct = (lon - minLon) / (maxLon - minLon);
    const yPct = (maxLat - lat) / (maxLat - minLat);

    const col = xPct * (wind.gridWidth - 1);
    const row = yPct * (wind.gridHeight - 1);

    const col0 = Math.floor(col);
    const col1 = Math.min(wind.gridWidth - 1, col0 + 1);
    const row0 = Math.floor(row);
    const row1 = Math.min(wind.gridHeight - 1, row0 + 1);

    const tx = col - col0;
    const ty = row - row0;

    const idx00 = row0 * wind.gridWidth + col0;
    const idx01 = row0 * wind.gridWidth + col1;
    const idx10 = row1 * wind.gridWidth + col0;
    const idx11 = row1 * wind.gridWidth + col1;

    const v00 = wind.data[idx00] || [0, 0];
    const v01 = wind.data[idx01] || [0, 0];
    const v10 = wind.data[idx10] || [0, 0];
    const v11 = wind.data[idx11] || [0, 0];

    const u = (1 - tx) * (1 - ty) * v00[0] +
              tx * (1 - ty) * v01[0] +
              (1 - tx) * ty * v10[0] +
              tx * ty * v11[0];

    const v = (1 - tx) * (1 - ty) * v00[1] +
              tx * (1 - ty) * v01[1] +
              (1 - tx) * ty * v10[1] +
              tx * ty * v11[1];

    return [u, v];
  };

  const spawnParticle = (): Particle => {
    const bounds = mapRef.current?.getBounds();
    let lat = 46.0;
    let lon = 5.0;
    if (bounds) {
      const southWest = bounds.getSouthWest();
      const northEast = bounds.getNorthEast();
      lat = southWest.lat + Math.random() * (northEast.lat - southWest.lat);
      lon = southWest.lng + Math.random() * (northEast.lng - southWest.lng);
    }
    return {
      lat,
      lon,
      x: null,
      y: null,
      age: 0,
      lifeTime: 60 + Math.random() * 60
    };
  };

  // 4. Custom Canvas Wind Overlay Animation loop
  useEffect(() => {
    const canvas = canvasOverlayRef.current;
    const map = mapRef.current;
    if (!canvas || !map || !showWind) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
    };
    resizeCanvas();

    map.on('move', resizeCanvas);
    map.on('zoomend', resizeCanvas);
    map.on('resize', resizeCanvas);

    const particleCount = 600;
    const particles: Particle[] = Array.from({ length: particleCount }, () => spawnParticle());

    let animId: number;
    const tick = () => {
      const wind = windDataRef.current;
      if (!wind) {
        animId = requestAnimationFrame(tick);
        return;
      }

      ctx.fillStyle = 'rgba(19, 19, 26, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        const [u, v] = getWindAt(p.lat, p.lon);

        const dt = 0.00015;
        p.lat += v * dt;
        p.lon += u * dt;

        const latLng = L.latLng(p.lat, p.lon);
        const point = map.latLngToContainerPoint(latLng);

        if (p.x !== null && p.y !== null && p.age > 0) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(point.x, point.y);
          
          const speed = Math.sqrt(u * u + v * v);
          let strokeColor = 'rgba(0, 240, 255, 0.45)';
          if (speed > 12) {
            strokeColor = 'rgba(255, 107, 0, 0.6)';
          } else if (speed > 8) {
            strokeColor = 'rgba(0, 180, 255, 0.55)';
          }
          
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        p.x = point.x;
        p.y = point.y;
        p.age++;

        const isOutOfBounds = point.x < 0 || point.x > canvas.width || point.y < 0 || point.y > canvas.height;
        if (p.age >= p.lifeTime || isOutOfBounds) {
          particles[i] = spawnParticle();
        }
      }

      animId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animId);
      map.off('move', resizeCanvas);
      map.off('zoomend', resizeCanvas);
      map.off('resize', resizeCanvas);
    };
  }, [showWind]);

  // 4. Animation playback interval loop
  useEffect(() => {
    if (!isPlaying || !status) return;

    const steps = status.availableSteps || [];
    if (steps.length === 0) return;

    const timer = setInterval(() => {
      setActiveStep((curr) => {
        const idx = steps.indexOf(curr);
        const nextIdx = (idx + 1) % steps.length;
        return steps[nextIdx];
      });
    }, playbackSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, status]);

  // Format active forecast step time
  const formatForecastTime = (step: number) => {
    if (!status || !status.latestRun) return `H+${step}`;
    const date = new Date(status.latestRun);
    date.setUTCHours(date.getUTCHours() + step);
    
    // Format hour and minute
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    
    // Format local date day name
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[date.getUTCDay()];

    return `${dayName} ${hours}:${minutes} UTC (H+${step})`;
  };

  // Stepping controls
  const handlePrevStep = () => {
    if (!status) return;
    const steps = status.availableSteps || [];
    const idx = steps.indexOf(activeStep);
    const prevIdx = idx > 0 ? idx - 1 : steps.length - 1;
    setActiveStep(steps[prevIdx]);
    setIsPlaying(false);
  };

  const handleNextStep = () => {
    if (!status) return;
    const steps = status.availableSteps || [];
    const idx = steps.indexOf(activeStep);
    const nextIdx = (idx + 1) % steps.length;
    setActiveStep(steps[nextIdx]);
    setIsPlaying(false);
  };

  const stepsList = status?.availableSteps || [];
  const maxSlices = stepsList.length || 13;
  const prefetchPercent = Math.min(100, Math.round((prefetchedCount / maxSlices) * 100));

  return (
    <div className="preview-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <header className="module-header" style={{ marginBottom: '10px' }}>
        <div className="module-title">
          <h2>{t('radar.title')}</h2>
          <p>{t('radar.subtitle')}</p>
        </div>
        
        {status && (
          <div style={{
            fontSize: '0.85rem',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '8px 16px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontFamily: 'var(--font-display)',
            color: 'var(--text-secondary)'
          }}>
            Run: {new Date(status.latestRun).getUTCHours()}Z UTC
          </div>
        )}
      </header>

      {error ? (
        <div className="empty-state" style={{ borderColor: 'var(--neon-orange)', color: '#fff' }}>
          <p style={{ marginBottom: '16px' }}>⚠️ {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="glove-target action-btn"
            style={{ borderColor: 'var(--neon-orange)', color: 'var(--neon-orange)' }}
          >
            Retry Connection
          </button>
        </div>
      ) : loading ? (
        <div className="loading-container">
          <div className="spinner" aria-label="Loading map data"></div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Prefetching first slice...
          </p>
        </div>
      ) : (
        <>
          {/* Active step readout banner */}
          <div style={{
            background: 'rgba(19,19,26,0.8)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Forecast Validity
              </span>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.2rem',
                fontWeight: 700,
                color: 'var(--neon-blue)',
                textShadow: '0 0 10px rgba(255,107,0,0.3)'
              }}>
                {formatForecastTime(activeStep)}
              </span>
            </div>

            {/* Prefetching status pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: prefetchPercent === 100 ? 'var(--neon-green)' : 'var(--neon-blue)',
                boxShadow: `0 0 8px ${prefetchPercent === 100 ? 'var(--neon-green)' : 'var(--neon-blue)'}`,
                animation: prefetchPercent < 100 ? 'spin 1.5s linear infinite' : 'none'
              }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {prefetchPercent === 100 ? 'Offline Caching Complete' : `Prefetching: ${prefetchPercent}%`}
              </span>
            </div>
          </div>

          {/* Map Container */}
          <div style={{ position: 'relative', width: '100%', height: '480px', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
            
            <canvas
              ref={canvasOverlayRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 400
              }}
            />
            
            {/* Precipitation Color Legend overlay */}
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              background: 'rgba(19, 19, 26, 0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '16px',
              zIndex: 1000,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              pointerEvents: 'auto',
              minWidth: '180px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Precipitation (mm/h)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { range: '0.1 - 0.5', color: '#3388ff', name: 'Drizzle' },
                  { range: '0.5 - 1.0', color: '#00aaff', name: 'Light' },
                  { range: '1.0 - 2.0', color: '#00e5ff', name: 'Moderate' },
                  { range: '2.0 - 5.0', color: '#00ff66', name: 'Moderate' },
                  { range: '5.0 - 10.0', color: '#ffff00', name: 'Heavy' },
                  { range: '10.0 - 15.0', color: '#ff9900', name: 'Very Heavy' },
                  { range: '15.0 - 25.0', color: '#ff3300', name: 'Intense' },
                  { range: '25.0+', color: '#cc00ff', name: 'Torrential' }
                ].map((item) => (
                  <div key={item.range} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: item.color }} />
                    <span style={{ color: '#fff', fontWeight: 700, minWidth: '60px' }}>{item.range}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Glove-friendly Control Dashboard (min 56px touch height) */}
          <div style={{
            background: 'rgba(24, 24, 27, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {/* Playback control row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              {/* Media buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handlePrevStep}
                  className="glove-target action-btn"
                  style={{ width: '64px', height: '56px', fontSize: '1.4rem' }}
                  aria-label="Previous step"
                >
                  ⏮
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="glove-target"
                  style={{
                    width: '120px',
                    height: '56px',
                    backgroundColor: isPlaying ? 'var(--neon-orange)' : 'var(--neon-blue)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 800,
                    boxShadow: isPlaying ? 'var(--shadow-neon-orange)' : 'var(--shadow-neon-blue)',
                    cursor: 'pointer'
                  }}
                >
                  {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
                </button>
                <button
                  onClick={handleNextStep}
                  className="glove-target action-btn"
                  style={{ width: '64px', height: '56px', fontSize: '1.4rem' }}
                  aria-label="Next step"
                >
                  ⏭
                </button>
              </div>

              {/* Speed Controller buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '6px' }}>Speed:</span>
                {[
                  { speed: 1500, label: 'Slow' },
                  { speed: 1000, label: 'Normal' },
                  { speed: 500, label: 'Fast' }
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setPlaybackSpeed(item.speed)}
                    className="glove-target"
                    style={{
                      height: '56px',
                      minHeight: '56px',
                      minWidth: '80px',
                      padding: '0 16px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: playbackSpeed === item.speed ? 'var(--neon-blue)' : 'rgba(255,255,255,0.03)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      borderRadius: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Weather Layer Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Weather Layers:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <button
                  onClick={() => setShowRain(!showRain)}
                  className="glove-target"
                  style={{
                    height: '56px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: showRain ? 'var(--neon-blue)' : 'rgba(255,255,255,0.03)',
                    color: showRain ? '#000' : '#fff',
                    fontWeight: 800,
                    borderRadius: '12px',
                    boxShadow: showRain ? 'var(--shadow-neon-blue)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>🌧️</span> Rain
                </button>
                <button
                  onClick={() => setShowClouds(!showClouds)}
                  className="glove-target"
                  style={{
                    height: '56px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: showClouds ? '#888888' : 'rgba(255,255,255,0.03)',
                    color: showClouds ? '#000' : '#fff',
                    fontWeight: 800,
                    borderRadius: '12px',
                    boxShadow: showClouds ? '0 0 15px rgba(136, 136, 136, 0.4)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>☁️</span> Clouds
                </button>
                <button
                  onClick={() => setShowWind(!showWind)}
                  className="glove-target"
                  style={{
                    height: '56px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: showWind ? 'var(--neon-green)' : 'rgba(255,255,255,0.03)',
                    color: showWind ? '#000' : '#fff',
                    fontWeight: 800,
                    borderRadius: '12px',
                    boxShadow: showWind ? 'var(--shadow-neon-green)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>💨</span> Wind
                </button>
              </div>
            </div>

            {/* Time Slider Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Timeline Slider:
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--neon-orange)' }}>
                  H+{activeStep}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', height: '56px' }}>
                <input
                  type="range"
                  min={0}
                  max={stepsList.length > 0 ? stepsList.length - 1 : 12}
                  value={stepsList.indexOf(activeStep) !== -1 ? stepsList.indexOf(activeStep) : 0}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value, 10);
                    if (stepsList[idx] !== undefined) {
                      setActiveStep(stepsList[idx]);
                      setIsPlaying(false);
                    }
                  }}
                  style={{
                    flexGrow: 1,
                    padding: '10px 0'
                  }}
                  className="glove-slider"
                />
              </div>
            </div>

            {/* Thick-glove discrete buttons for hourly selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Jump to Hour (Glove-friendly Taps):
              </span>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
                gap: '8px'
              }}>
                {stepsList.map((step) => (
                  <button
                    key={step}
                    onClick={() => {
                      setActiveStep(step);
                      setIsPlaying(false);
                    }}
                    className="glove-target"
                    style={{
                      height: '56px',
                      minHeight: '56px',
                      minWidth: '64px',
                      padding: 0,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: activeStep === step ? 'var(--neon-blue)' : 'rgba(255,255,255,0.03)',
                      color: activeStep === step ? '#000' : '#fff',
                      fontWeight: 800,
                      fontSize: '1rem',
                      borderRadius: '12px',
                      boxShadow: activeStep === step ? 'var(--shadow-neon-blue)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    H+{step}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Return Button */}
      <button
        onClick={onNavigateToPitstop}
        className="glove-target action-btn"
        style={{ width: '100%', height: '56px', marginTop: '10px', fontSize: '1rem', fontWeight: 800 }}
      >
        {t('shelter.return')}
      </button>
    </div>
  );
}
