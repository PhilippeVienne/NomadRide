import { useState, useEffect, useMemo, useCallback, FormEvent } from 'react';
import { ApiService, FuelStation, FuelType, LocationSuggestion } from './services/apiService';
import { CONFIG } from './config';
import StationMap from './components/StationMap';

type ActiveModule = 'explore' | 'shelter' | 'pitstop' | 'wallet' | 'radar';

function formatLastUpdated(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (3600 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 3600 * 1000));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + 
           date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return dateStr;
  }
}

interface ServiceInfo {
  icon: string;
  label: string;
}

function parseServiceTag(service: string): ServiceInfo {
  const s = service.toLowerCase();
  if (s.includes('gonflage')) return { icon: '🛞', label: 'Air' };
  if (s.includes('lavage automatique') || s.includes('lavage manuel') || s.includes('haute pression')) return { icon: '🧼', label: 'Wash' };
  if (s.includes('gaz domestique') || s.includes('vente de gaz')) return { icon: '💨', label: 'Gas' };
  if (s.includes('boutique')) return { icon: '🏪', label: 'Shop' };
  if (s.includes('restauration') || s.includes('snack') || s.includes('emporter')) return { icon: '🍔', label: 'Food' };
  if (s.includes('relais colis')) return { icon: '📦', label: 'Parcel' };
  if (s.includes('wifi')) return { icon: '🛜', label: 'Wifi' };
  if (s.includes('toilette') || s.includes('wc')) return { icon: '🚻', label: 'WC' };
  if (s.includes('douche')) return { icon: '🚿', label: 'Shower' };
  if (s.includes('réparation') || s.includes('entretien') || s.includes('reparation')) return { icon: '🛠️', label: 'Repair' };
  if (s.includes('automate cb') || s.includes('automate 24')) return { icon: '💳', label: '24/7 Pay' };
  if (s.includes('location')) return { icon: '🚗', label: 'Rental' };
  
  // Clean fallback label
  let cleanLabel = service.trim();
  if (cleanLabel.length > 18) {
    cleanLabel = cleanLabel.substring(0, 15) + '...';
  }
  return { icon: '🔹', label: cleanLabel };
}

export interface BrandInfo {
  name: string;
  color: string;
  textColor: string;
  border?: string;
  domain?: string;
  logoKey?: string;
}

const unknownBrand: BrandInfo = {
  name: 'Indépendant', color: 'rgba(255,255,255,0.08)', textColor: 'rgba(255,255,255,0.7)', logoKey: undefined
};

const brandsList: BrandInfo[] = [
  { name: 'TotalEnergies', color: 'linear-gradient(135deg, #ff0055, #ffaa00, #00bbff)', textColor: '#fff', domain: 'totalenergies.com', logoKey: 'totalenergies' },
  { name: 'Esso', color: '#e1001a', textColor: '#fff', domain: 'esso.fr', logoKey: 'esso' },
  { name: 'BP', color: '#00853f', textColor: '#fff', domain: 'bp.com', logoKey: 'bp' },
  { name: 'Shell', color: '#ffd500', textColor: '#000', domain: 'shell.fr', logoKey: 'shell' },
  { name: 'Avia', color: '#e30613', textColor: '#fff', domain: 'avia.fr', logoKey: 'avia' },
  { name: 'Intermarché', color: '#ca0913', textColor: '#fff', domain: 'intermarche.com', logoKey: 'intermarche' },
  { name: 'E.Leclerc', color: '#0066b2', textColor: '#fff', domain: 'leclerc.fr', logoKey: 'e.leclerc' },
  { name: 'Carrefour', color: '#003893', textColor: '#fff', domain: 'carrefour.fr', logoKey: 'carrefour' },
  { name: 'Système U', color: '#004C99', textColor: '#fff', domain: 'systeme-u.fr', logoKey: 'systeme_u' },
  { name: 'Auchan', color: '#e30613', textColor: '#fff', domain: 'auchan.fr', logoKey: 'auchan' },
  { name: 'Eni', color: '#fccb00', textColor: '#000', domain: 'eni.fr', logoKey: 'eni' }
];

// Keyword patterns mapped to brandsList indices for resolution
const brandKeywords: Array<{ patterns: string[]; index: number }> = [
  { patterns: ['total', 'totalenergies'], index: 0 },
  { patterns: ['esso', 'exxon'], index: 1 },
  { patterns: ['bp ', 'bp-'], index: 2 },
  { patterns: ['shell'], index: 3 },
  { patterns: ['avia'], index: 4 },
  { patterns: ['intermarche', 'intermarché'], index: 5 },
  { patterns: ['leclerc', 'e.leclerc'], index: 6 },
  { patterns: ['carrefour'], index: 7 },
  { patterns: ['systeme u', 'système u', 'super u', 'hyper u', 'u express'], index: 8 },
  { patterns: ['auchan'], index: 9 },
  { patterns: ['eni'], index: 10 },
];

export function getStationBrand(_id: number, adresse?: string, ville?: string, apiBrand?: string): BrandInfo {
  // 1. Primary: use real brand from OSM/API if available
  if (apiBrand) {
    const brandLower = apiBrand.toLowerCase();
    for (const entry of brandKeywords) {
      if (entry.patterns.some(p => brandLower.includes(p))) {
        return brandsList[entry.index];
      }
    }
    // Known brand from OSM but not in our visual mapping — show the real name with neutral styling
    return { name: apiBrand, color: 'rgba(255,255,255,0.12)', textColor: '#fff', logoKey: undefined };
  }

  // 2. Fallback: check address/city text for brand keywords
  const text = `${adresse || ''} ${ville || ''}`.toLowerCase();
  for (const entry of brandKeywords) {
    if (entry.patterns.some(p => text.includes(p))) {
      return brandsList[entry.index];
    }
  }

  // 3. Unknown brand
  return unknownBrand;
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('pitstop');
  const [fuelType, setFuelType] = useState<FuelType>('sp98');
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Search & Geolocation States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsActive, setGpsActive] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const [isLocating, setIsLocating] = useState<boolean>(true);

  // Rider Preferences (local fill size & consumption rate)
  const [fillSize, setFillSize] = useState<number>(() => {
    const saved = localStorage.getItem('nomad_fill_size');
    return saved ? parseInt(saved, 10) : 9;
  });
  const [consumption, setConsumption] = useState<number>(() => {
    const saved = localStorage.getItem('nomad_consumption');
    return saved ? parseFloat(saved) : 4.0;
  });
  const [searchRadius, setSearchRadius] = useState<number>(() => {
    const saved = localStorage.getItem('nomad_search_radius');
    return saved ? parseInt(saved, 10) : 25;
  });

  const handleUpdateFillSize = (val: number) => {
    const next = Math.max(2, Math.min(50, val));
    setFillSize(next);
    localStorage.setItem('nomad_fill_size', next.toString());
  };

  const handleUpdateConsumption = (val: number) => {
    const next = Math.max(1, Math.min(20, parseFloat(val.toFixed(1))));
    setConsumption(next);
    localStorage.setItem('nomad_consumption', next.toString());
  };

  const handleUpdateSearchRadius = (val: number) => {
    const next = Math.max(5, Math.min(100, val));
    setSearchRadius(next);
    localStorage.setItem('nomad_search_radius', next.toString());
  };

  // UI Filters
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterInStockOnly, setFilterInStockOnly] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(() => window.innerWidth <= 600 ? 3 : 12);

  // Responsive page size listener
  const handleResize = useCallback(() => {
    setPageSize(window.innerWidth <= 600 ? 3 : 12);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch cheapest fuel prices from API
  const fetchFuelData = async (
    type: FuelType,
    forceRefresh = false,
    searchStr = searchQuery,
    gps = gpsCoords
  ) => {
    setLoading(true);
    setError(null);
    try {
      const options: {
        limit?: number;
        search?: string;
        lat?: number;
        lon?: number;
        radius?: number;
        refresh?: boolean;
        fillSize?: number;
        consumption?: number;
      } = {
        refresh: forceRefresh,
        search: searchStr,
        fillSize,
        consumption,
        radius: searchRadius,
        limit: 150, // Fetch up to 150 stations to allow robust local filtering
      };

      if (gps) {
        options.lat = gps.lat;
        options.lon = gps.lon;
      }

      const data = await ApiService.getCheapestFuel(type, options);
      setStations(data.stations);
      if (data.location) {
        setSearchCenter({ lat: data.location.lat, lon: data.location.lon });
      } else {
        setSearchCenter(null);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch fuel prices. Make sure backend service is running.');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch fuel prices when active module, fuel type, search, gps coords, or preferences change (after location check is done)
  useEffect(() => {
    if (activeModule === 'pitstop' && !isLocating) {
      fetchFuelData(fuelType, false, searchQuery, gpsCoords);
    }
  }, [activeModule, fuelType, gpsCoords, searchQuery, isLocating, fillSize, consumption, searchRadius]);

  // Automatically request GPS location on mount / activeModule load
  useEffect(() => {
    if (activeModule !== 'pitstop') return;
    
    setIsLocating(true);
    setGpsError(null);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setGpsCoords({ lat, lon });
          setGpsActive(true);
          setIsLocating(false);
        },
        (err) => {
          console.warn('Auto geolocation failed, falling back to default:', err);
          setIsLocating(false); // Triggers fetch effect with null coords
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    } else {
      setIsLocating(false);
    }
  }, [activeModule]);

  // Geolocation trigger
  const handleGpsSearch = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by this browser.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setGpsCoords({ lat, lon });
        setGpsActive(true);
        setSearchQuery(''); // Clear text search to avoid UI filter mismatch
        fetchFuelData(fuelType, false, '', { lat, lon });
      },
      (err) => {
        console.error('Geolocation error:', err);
        setGpsError('Unable to retrieve location. Please check browser permissions.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Clear Geolocation filter
  const handleClearGps = () => {
    setGpsCoords(null);
    setGpsActive(false);
    setGpsError(null);
    fetchFuelData(fuelType, false, searchQuery, null);
  };

  // Debounced autocomplete search
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await ApiService.getLocationSuggestions(searchQuery);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 450); // 450ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle selecting a location suggestion
  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setSearchQuery(suggestion.name);
    setSuggestions([]);
    setShowSuggestions(false);
    setGpsActive(false);
    setGpsCoords(null);
    setGpsError(null);
    fetchFuelData(fuelType, false, suggestion.name, { lat: suggestion.lat, lon: suggestion.lon });
  };

  // Text search form submit (city/zipcode)
  const handleTextSearch = (e: FormEvent) => {
    e.preventDefault();
    setSuggestions([]);
    setShowSuggestions(false);
    setGpsActive(false);
    setGpsCoords(null);
    setGpsError(null);
    fetchFuelData(fuelType, false, searchQuery, null);
  };

  // Manual cache refresh
  const handleManualRefresh = () => {
    fetchFuelData(fuelType, true, searchQuery, gpsCoords);
  };

  // Filter stations based on user UI filters
  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      // 1. Availability filter
      const ruptureType = station[`${fuelType}_rupture_type` as keyof FuelStation] as string | undefined;
      if (filterInStockOnly && ruptureType) {
        return false;
      }

      // 2. Brand filter
      if (filterBrand !== 'all') {
        const brand = getStationBrand(station.id, station.adresse, station.ville);
        const brandKey = brand.logoKey || 'independent';
        if (brandKey !== filterBrand) {
          return false;
        }
      }

      // 3. Service filter
      if (filterService !== 'all') {
        if (!station.services_service) {
          return false;
        }
        const hasService = station.services_service.some((s) => {
          const parsed = parseServiceTag(s);
          return parsed.label.toLowerCase() === filterService.toLowerCase();
        });
        if (!hasService) {
          return false;
        }
      }

      return true;
    });
  }, [stations, fuelType, filterBrand, filterService, filterInStockOnly]);

  // Reset page when filters, search, or stations change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterBrand, filterService, filterInStockOnly, stations, fuelType]);

  // Compute paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredStations.length / pageSize));
  const paginatedStations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStations.slice(start, start + pageSize);
  }, [filteredStations, currentPage, pageSize]);

  const renderSidebar = () => {
    const navItems: { id: ActiveModule; label: string; icon: string }[] = [
      { id: 'explore', label: 'Explore', icon: '🧭' },
      { id: 'shelter', label: 'Shelter', icon: '🛖' },
      { id: 'pitstop', label: 'Pit-Stop', icon: '⛽' },
      { id: 'wallet', label: 'Wallet', icon: '🪙' },
      { id: 'radar', label: 'Radar', icon: '📡' },
    ];

    return (
      <aside className="sidebar">
        <div className="logo-container">
          <svg className="logo-icon" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="256" cy="256" r="220" stroke="#ffc700" strokeWidth="20" strokeDasharray="10,15" />
            <path d="M 120 400 C 120 280, 240 280, 240 200 C 240 140, 160 140, 160 100" stroke="#ff6b00" strokeWidth="28" strokeLinecap="round" />
            <path d="M 392 400 C 392 280, 272 280, 272 200 C 272 140, 352 140, 352 100" stroke="#ffc700" strokeWidth="28" strokeLinecap="round" />
            <circle cx="256" cy="256" r="24" fill="#121214" stroke="#ffc700" strokeWidth="6" />
          </svg>
          <div className="logo-text">
            <h1>NomadRide</h1>
            <span>Rider Companion</span>
          </div>
        </div>

        <nav className="nav-menu" aria-label="Main Navigation">
          {navItems.map((item) => (
            <button
              id={`nav-btn-${item.id}`}
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={`glove-target nav-item ${activeModule === item.id ? 'active' : ''}`}
            >
              <span className="nav-item-icon" aria-hidden="true">{item.icon}</span>
              <span className="nav-item-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    );
  };

  const renderFuelContent = () => {
    return (
      <>
        <header className="module-header">
          <div className="module-title">
            <h2>⛽ Pit-Stop Locator</h2>
            <p>Locate the cheapest fuel stations in your route vicinity</p>
          </div>
          <div className="selector-group" role="group" aria-label="Fuel Type Selector">
            {(['sp98', 'sp95', 'e10'] as FuelType[]).map((type) => (
              <button
                id={`fuel-select-${type}`}
                key={type}
                onClick={() => setFuelType(type)}
                className={`glove-target selector-btn ${fuelType === type ? 'active' : ''}`}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        {/* Glove-friendly Rider Preferences */}
        <section className="rider-preferences-container" aria-label="Rider Preferences">
          <div className="preferences-header">
            <h3>🏍️ Rider Preferences</h3>
            <span className="preferences-subtitle">Used to estimate fuel fill cost & detour expense</span>
          </div>
          <div className="preferences-controls">
            <div className="pref-control-group">
              <span className="pref-label">Tank Fill Size</span>
              <div className="pref-adjuster">
                <button
                  type="button"
                  onClick={() => handleUpdateFillSize(fillSize - 1)}
                  className="glove-target pref-btn-adjust minus"
                  aria-label="Decrease tank fill size"
                >
                  -
                </button>
                <span className="pref-value-display">{fillSize} <span className="pref-unit">L</span></span>
                <button
                  type="button"
                  onClick={() => handleUpdateFillSize(fillSize + 1)}
                  className="glove-target pref-btn-adjust plus"
                  aria-label="Increase tank fill size"
                >
                  +
                </button>
              </div>
            </div>

            <div className="pref-control-group">
              <span className="pref-label">Consumption</span>
              <div className="pref-adjuster">
                <button
                  type="button"
                  onClick={() => handleUpdateConsumption(consumption - 0.5)}
                  className="glove-target pref-btn-adjust minus"
                  aria-label="Decrease fuel consumption rate"
                >
                  -
                </button>
                <span className="pref-value-display">{consumption.toFixed(1)} <span className="pref-unit">L/100km</span></span>
                <button
                  type="button"
                  onClick={() => handleUpdateConsumption(consumption + 0.5)}
                  className="glove-target pref-btn-adjust plus"
                  aria-label="Increase fuel consumption rate"
                >
                  +
                </button>
              </div>
            </div>

            <div className="pref-control-group">
              <span className="pref-label">Search Radius</span>
              <div className="pref-adjuster">
                <button
                  type="button"
                  onClick={() => handleUpdateSearchRadius(searchRadius - 5)}
                  className="glove-target pref-btn-adjust minus"
                  aria-label="Decrease search radius"
                >
                  -
                </button>
                <span className="pref-value-display">{searchRadius} <span className="pref-unit">km</span></span>
                <button
                  type="button"
                  onClick={() => handleUpdateSearchRadius(searchRadius + 5)}
                  className="glove-target pref-btn-adjust plus"
                  aria-label="Increase search radius"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Glove-friendly Search & Location controls */}
        <section className="search-controls-container" aria-label="Search Controls">
          <form onSubmit={handleTextSearch} className="search-form">
            <div className="search-input-wrapper" style={{ flexGrow: 1, position: 'relative' }}>
              <input
                type="text"
                placeholder="Search city / postcode (e.g. Toulouse, 31000)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(suggestions.length > 0)}
                onBlur={() => {
                  // Short timeout to let the list item click event complete before hiding
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                className="glove-target search-input"
                id="fuel-search-input"
                aria-label="Search city or zip code"
                autoComplete="off"
                style={{ width: '100%' }}
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="autocomplete-suggestions" role="listbox">
                  {suggestions.map((s, index) => (
                    <li
                      key={index}
                      onClick={() => handleSelectSuggestion(s)}
                      className="autocomplete-suggestion-item glove-target"
                      role="option"
                    >
                      📍 {s.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button 
              type="submit" 
              className="glove-target search-submit-btn" 
              id="fuel-search-submit"
            >
              🔍 Search
            </button>
          </form>

          <div className="search-buttons-group">
            {gpsActive ? (
              <button
                type="button"
                onClick={handleClearGps}
                className="glove-target gps-btn active"
                id="clear-gps-btn"
              >
                🎯 Clear GPS
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGpsSearch}
                className="glove-target gps-btn"
                id="trigger-gps-btn"
              >
                🎯 GPS Location
              </button>
            )}

            <button
              type="button"
              onClick={handleManualRefresh}
              className={`glove-target refresh-btn ${loading ? 'loading' : ''}`}
              disabled={loading}
              id="manual-refresh-btn"
              aria-label="Refresh fuel data"
            >
              <span className={`refresh-icon ${loading ? 'spinning' : ''}`}>🔄</span> Refresh
            </button>
          </div>
        </section>

        {gpsError && (
          <div className="gps-error-message" role="alert">
            ⚠️ {gpsError}
          </div>
        )}
        
        {gpsActive && gpsCoords && (
          <div className="search-active-message">
            📍 Showing stations within {searchRadius}km of location ({gpsCoords.lat.toFixed(4)}, {gpsCoords.lon.toFixed(4)})
          </div>
        )}

        {/* Glove-friendly Filter Controls */}
        <section className="filter-controls-container" aria-label="Filter Controls">
          <div className="filter-header">
            <h3>🔍 Filter Stations ({filteredStations.length} found)</h3>
            <div className="view-mode-toggle-container">
              <button
                type="button"
                className={`glove-target toggle-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                id="view-list-toggle-btn"
              >
                📋 List
              </button>
              <button
                type="button"
                className={`glove-target toggle-view-btn ${viewMode === 'map' ? 'active' : ''}`}
                onClick={() => setViewMode('map')}
                id="view-map-toggle-btn"
              >
                🗺️ Map
              </button>
            </div>
          </div>
          <div className="filter-controls">
            <div className="filter-control-group">
              <label htmlFor="filter-brand-select" className="filter-label">Brand</label>
              <select
                id="filter-brand-select"
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
                className="glove-target filter-select"
              >
                <option value="all">All Brands</option>
                {brandsList.map((b) => (
                  <option key={b.logoKey} value={b.logoKey}>{b.name}</option>
                ))}
                <option value="independent">Indépendant</option>
              </select>
            </div>

            <div className="filter-control-group">
              <label htmlFor="filter-service-select" className="filter-label">Service</label>
              <select
                id="filter-service-select"
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="glove-target filter-select"
              >
                <option value="all">All Services</option>
                <option value="air">Air 🛞</option>
                <option value="wash">Wash 🧼</option>
                <option value="gas">Gas 💨</option>
                <option value="shop">Shop 🏪</option>
                <option value="food">Food 🍔</option>
                <option value="parcel">Parcel 📦</option>
                <option value="wifi">Wifi 🛜</option>
                <option value="wc">WC 🚻</option>
                <option value="shower">Shower 🚿</option>
                <option value="repair">Repair 🛠️</option>
                <option value="24/7 pay">24/7 Pay 💳</option>
                <option value="rental">Rental 🚗</option>
              </select>
            </div>

            <div className="filter-control-group toggle-group">
              <label className="filter-label">Availability</label>
              <button
                type="button"
                id="filter-instock-toggle"
                onClick={() => setFilterInStockOnly(!filterInStockOnly)}
                className={`glove-target filter-toggle-btn ${filterInStockOnly ? 'active' : ''}`}
              >
                {filterInStockOnly ? '✅ In-Stock Only' : 'Show All (incl. Shortages)'}
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="loading-container">
            <div className="spinner" aria-label="Loading data"></div>
            <p>Querying cheapest fuel stations...</p>
          </div>
        ) : error ? (
          <div className="empty-state" style={{ borderColor: 'var(--neon-orange)', color: '#fff' }}>
            <p>{error}</p>
            <button
              id="retry-fuel-btn"
              onClick={() => fetchFuelData(fuelType)}
              className="glove-target action-btn"
              style={{ marginTop: '20px', borderColor: 'var(--neon-orange)', color: 'var(--neon-orange)' }}
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
          {viewMode === 'map' ? (
            <StationMap
              stations={filteredStations}
              centerCoords={searchCenter}
              radiusKm={searchRadius}
              fuelType={fuelType}
            />
          ) : (
            <>
            <main className="station-grid">
            {paginatedStations.length > 0 ? (
              paginatedStations.map((station, idx) => {
                const index = (currentPage - 1) * pageSize + idx;
                const price = station[`${fuelType}_prix` as keyof FuelStation];
                const updateTime = station[`${fuelType}_maj` as keyof FuelStation] as string;
                const ruptureType = station[`${fuelType}_rupture_type` as keyof FuelStation] as string | undefined;
                const ruptureDebut = station[`${fuelType}_rupture_debut` as keyof FuelStation] as string | undefined;
                
                // Top card that isn't in rupture is the optimal choice
                const isBestValue = index === 0 && !ruptureType && station.distance !== undefined;
                const isCheapest = index === 0 && !ruptureType && station.distance === undefined;
                
                const rankText = ruptureType 
                  ? `🚫 OUT OF STOCK` 
                  : (isBestValue ? '🏆 BEST VALUE' : (isCheapest ? '🏆 CHEAPEST' : `#${index + 1}`));

                // Parse coordinates for Google Maps link fallback
                const latVal = parseFloat(station.latitude) / 100000;
                const lonVal = parseFloat(station.longitude) / 100000;
                const mapsUrl = !isNaN(latVal) && !isNaN(lonVal)
                  ? `https://www.google.com/maps/search/?api=1&query=${latVal},${lonVal}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(station.adresse + ', ' + station.ville)}`;

                // Format price: e.g. "1.990" -> integer "1", dot ".", fraction "990"
                let priceInteger = 'N/A';
                let priceFraction = '';
                if (price) {
                  const formatted = Number(price).toFixed(3);
                  const dotIdx = formatted.indexOf('.');
                  priceInteger = formatted.substring(0, dotIdx);
                  priceFraction = formatted.substring(dotIdx + 1);
                }

                const brand = getStationBrand(station.id, station.adresse, station.ville, station.brand);

                return (
                  <article
                    key={station.id}
                    className={`station-card ${ruptureType ? 'rupture' : (isBestValue ? 'best-value' : (isCheapest ? 'cheapest' : 'alternative'))}`}
                  >
                    <div className="card-top">
                      <div className="price-tag">
                        {ruptureType ? (
                          <span className="price-rupture">RUPTURE</span>
                        ) : price ? (
                          <>
                            <span className="price-integer">{priceInteger}</span>
                            <span className="price-decimal-dot">.</span>
                            <span className="price-fractional">{priceFraction}</span>
                            <span className="price-currency">€</span>
                          </>
                        ) : (
                          <span className="price-na">N/A</span>
                        )}
                      </div>
                      <div className="card-top-right">
                        <span className="rank">
                          {rankText}
                        </span>
                        <span 
                          className="station-brand-badge" 
                          style={{ 
                            background: brand.color, 
                            color: brand.textColor,
                            border: brand.border || 'none'
                          }}
                        >
                          {brand.logoKey && (
                            <img 
                              src={`/logos/${brand.logoKey}.png`} 
                              alt=""
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          )}
                          {brand.name}
                        </span>
                      </div>
                    </div>

                    {/* Primary visual metrics for riders: Cost & Distance */}
                    {(station.total_cost !== undefined || station.distance !== undefined) && (
                      <div className="card-metrics-row">
                        {station.total_cost !== undefined && (
                          <div className="metric-box cost" title="Estimated fill cost (9L fill + detour cost)">
                            <span className="metric-label">TOTAL COST</span>
                            <span className="metric-value">🪙 {station.total_cost.toFixed(2)} €</span>
                          </div>
                        )}
                        {station.distance !== undefined && (
                          <div className="metric-box distance" title="Distance to station">
                            <span className="metric-label">DISTANCE</span>
                            <span className="metric-value">📍 {station.distance.toFixed(1)} km</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="card-body-details">
                      <h3 className="station-address">{station.adresse}</h3>
                      <div className="station-city">{station.ville}</div>

                      {/* Services without inner scrollbar, parsed with icon badges */}
                      {station.services_service && station.services_service.length > 0 && (() => {
                        const uniqueServices: ServiceInfo[] = [];
                        const seenLabels = new Set<string>();
                        for (const rawService of station.services_service) {
                          const parsed = parseServiceTag(rawService);
                          if (!seenLabels.has(parsed.label)) {
                            seenLabels.add(parsed.label);
                            uniqueServices.push(parsed);
                          }
                        }

                        return (
                          <div className="services-container" aria-label="Available services">
                            {uniqueServices.slice(0, 4).map((service, sIndex) => (
                              <span key={sIndex} className="service-tag" title={service.label}>
                                <span className="service-tag-icon">{service.icon}</span>
                                <span className="service-tag-label">{service.label}</span>
                              </span>
                            ))}
                            {uniqueServices.length > 4 && (
                              <span className="service-tag more" title={uniqueServices.slice(4).map(s => s.label).join(', ')}>
                                +{uniqueServices.length - 4} more
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="card-meta">
                      {ruptureType ? (
                        ruptureDebut && (
                          <div className="rupture-badge" title={`Shortage started on ${new Date(ruptureDebut).toLocaleString()}`}>
                            ⚠️ Since {formatLastUpdated(ruptureDebut)}
                          </div>
                        )
                      ) : (
                        updateTime && (
                          <div className="update-time-badge" title={`Updated on ${new Date(updateTime).toLocaleString()}`}>
                            🕒 {formatLastUpdated(updateTime)}
                          </div>
                        )
                      )}

                      {station.horaires_automate_24_24 === 'Oui' && (
                        <div className="automate-24-badge" title="24/24 Automate Available">
                          ⚡ 24/24
                        </div>
                      )}

                      {station.freshness_penalty !== undefined && station.freshness_penalty > 0 && (
                        <div className="penalty-badge" title={`Staleness penalty applied: +${station.freshness_penalty.toFixed(3)} €/L`}>
                          🕒 Staleness: +{station.freshness_penalty.toFixed(3)} €/L
                        </div>
                      )}
                    </div>

                    <div className="card-actions">
                      <a
                        id={`map-link-${station.id}`}
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glove-target map-action-link"
                      >
                        🗺️ View on Map
                      </a>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="empty-state">
                {stations.length === 0 
                  ? "No stations found matching search criteria." 
                  : "No stations match the selected UI filters."}
              </div>
            )}
          </main>

          {/* Pagination Controls */}
          {filteredStations.length > pageSize && (
            <nav className="pagination-controls" aria-label="Station list pagination">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="glove-target pagination-btn"
                aria-label="Previous page"
              >
                ◀ Prev
              </button>

              <div className="pagination-pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | string)[]>((acc, p, i, arr) => {
                    if (i > 0 && typeof arr[i - 1] === 'number' && (p as number) - (arr[i - 1] as number) > 1) {
                      acc.push('...');
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    typeof item === 'string' ? (
                      <span key={`dots-${i}`} className="pagination-dots">…</span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCurrentPage(item)}
                        className={`glove-target pagination-page-btn ${currentPage === item ? 'active' : ''}`}
                      >
                        {item}
                      </button>
                    )
                  )}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="glove-target pagination-btn"
                aria-label="Next page"
              >
                Next ▶
              </button>
            </nav>
          )}
          </>
          )}
          </>
        )}
      </>
    );
  };

  const renderModulePreview = (title: string, desc: string, icon: string) => {
    return (
      <div className="preview-container">
        <span className="preview-icon" aria-hidden="true">{icon}</span>
        <span className="preview-badge">Module Coming Soon</span>
        <h2 className="preview-title">{title}</h2>
        <p className="preview-desc">{desc}</p>
        <button
          id={`go-to-pitstop-from-${title}`}
          onClick={() => setActiveModule('pitstop')}
          className="glove-target action-btn"
        >
          Return to Fuel Locator
        </button>
      </div>
    );
  };

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'pitstop':
        return renderFuelContent();
      case 'explore':
        return renderModulePreview(
          'Explore Navigation',
          'Optimize routes with twisty motorcycle paths, avoid traffic bottlenecks, and share custom routes with other riders.',
          '🧭'
        );
      case 'shelter':
        return renderModulePreview(
          'Emergency Shelter',
          'Quickly locate weather shelters, motorcycle-friendly hotels, and mechanics when the unexpected happens on the road.',
          '🛖'
        );
      case 'wallet':
        return renderModulePreview(
          'Wallet Expense Calculator',
          'Keep track of your road-trip expenses, calculate exact fuel and toll costs, and estimate tire and chain wear fees.',
          '🪙'
        );
      case 'radar':
        return renderModulePreview(
          'Radar Weather Routing',
          'Overlay live weather radar onto your route to proactively avoid severe rainstorms, snow, or extreme crosswinds.',
          '📡'
        );
    }
  };

  return (
    <div className="app-container">
      {renderSidebar()}
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <div style={{ flexGrow: 1 }}>
          <div className="main-content">
            {renderActiveModule()}
          </div>
        </div>
        <footer className="status-bar">
          <div className="status-indicator">
            <span className={`status-dot ${isOnline ? '' : 'offline'}`} aria-hidden="true"></span>
            <span>{isOnline ? 'System Status: Online' : 'System Status: Offline'}</span>
          </div>
          <div>API Target: {CONFIG.API_URL}</div>
        </footer>
      </div>
    </div>
  );
}
