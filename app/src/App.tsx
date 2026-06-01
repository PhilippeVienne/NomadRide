import { useState, useEffect, useMemo, useCallback, FormEvent, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiService, FuelStation, FuelType, LocationSuggestion, FuelQueryOptions } from './services/apiService';
import { CONFIG } from './config';
import StationMap from './components/StationMap';
import MotoSettingsModal from './components/MotoSettingsModal';
import Sidebar, { ActiveModule } from './components/Sidebar';
import ExploreModule from './components/ExploreModule';
import ShelterModule from './components/ShelterModule';
import WalletModule from './components/WalletModule';
import RadarModule from './components/RadarModule';
import FilterControls from './components/FilterControls';
import StationCard from './components/StationCard';
import Pagination from './components/Pagination';
import ServicesModal from './components/ServicesModal';
import { parseServiceTag } from './utils/stationUtils';

export default function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('pitstop');
  const [fuelType, setFuelType] = useState<FuelType>('sp98');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Search & Geolocation States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState<string>('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsActive, setGpsActive] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [suggestionCoords, setSuggestionCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const [isLocating, setIsLocating] = useState<boolean>(true);

  // Layout & Popup states
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState<boolean>(false);

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
  const [filterService, setFilterService] = useState<string>('all');
  const [filterInStockOnly, setFilterInStockOnly] = useState<boolean>(false);
  const [servicesModalOpen, setServicesModalOpen] = useState<boolean>(false);
  const [tripDropdownOpen, setTripDropdownOpen] = useState<boolean>(false);

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

  // Debounced autocomplete search using TanStack Query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: suggestionsData = [] } = useQuery({
    queryKey: ['suggestions', debouncedSearchQuery],
    queryFn: () => ApiService.getLocationSuggestions(debouncedSearchQuery),
    enabled: activeModule === 'pitstop' && debouncedSearchQuery.trim().length >= 3 && debouncedSearchQuery !== submittedSearchQuery,
  });

  const suggestions = debouncedSearchQuery.trim().length >= 3 && debouncedSearchQuery !== submittedSearchQuery ? suggestionsData : [];

  useEffect(() => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [suggestions]);

  // Main fuel data fetching query using TanStack Query
  const forceRefreshRef = useRef<boolean>(false);

  const {
    data: fuelData,
    isFetching,
    error: fuelError,
    refetch: refetchFuel,
  } = useQuery({
    queryKey: [
      'fuelData',
      fuelType,
      gpsActive,
      gpsCoords,
      suggestionCoords,
      submittedSearchQuery,
      fillSize,
      consumption,
      searchRadius,
    ],
    queryFn: async () => {
      const forceRefresh = forceRefreshRef.current;
      forceRefreshRef.current = false; // Reset

      const options: FuelQueryOptions = {
        refresh: forceRefresh,
        search: gpsActive ? '' : submittedSearchQuery,
        fillSize,
        consumption,
        radius: searchRadius,
        limit: 150,
      };

      const gps = gpsActive ? gpsCoords : suggestionCoords;
      if (gps) {
        options.lat = gps.lat;
        options.lon = gps.lon;
      }

      return ApiService.getCheapestFuel(fuelType, options);
    },
    enabled: activeModule === 'pitstop' && !isLocating,
  });

  const stations = fuelData?.stations ?? [];
  const searchCenter = fuelData?.location ? { lat: fuelData.location.lat, lon: fuelData.location.lon } : null;
  const loading = isFetching || isLocating;
  const error = fuelError ? 'Failed to fetch fuel prices. Make sure backend service is running.' : null;

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
          setIsLocating(false);
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

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setGpsCoords({ lat, lon });
        setGpsActive(true);
        setSuggestionCoords(null);
        setSearchQuery(''); // Clear text search to avoid UI filter mismatch
        setSubmittedSearchQuery('');
        setShowSuggestions(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setGpsError('Unable to retrieve location. Please check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Clear Geolocation filter
  const handleClearGps = () => {
    setGpsCoords(null);
    setGpsActive(false);
    setGpsError(null);
    setSuggestionCoords(null);
    setSubmittedSearchQuery(searchQuery);
  };

  // Handle selecting a location suggestion
  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setSearchQuery(suggestion.name);
    setSubmittedSearchQuery(suggestion.name);
    setSuggestionCoords({ lat: suggestion.lat, lon: suggestion.lon });
    setGpsActive(false);
    setGpsCoords(null);
    setGpsError(null);
    setShowSuggestions(false);
  };

  // Text search form submit (city/zipcode)
  const handleTextSearch = (e: FormEvent) => {
    e.preventDefault();
    setSubmittedSearchQuery(searchQuery);
    setSuggestionCoords(null);
    setGpsActive(false);
    setGpsCoords(null);
    setGpsError(null);
    setShowSuggestions(false);
  };

  // Manual cache refresh
  const handleManualRefresh = () => {
    forceRefreshRef.current = true;
    refetchFuel();
  };

  // Filter stations based on user UI filters
  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      // 1. Availability filter
      const ruptureType = station[`${fuelType}_rupture_type` as keyof FuelStation] as string | undefined;
      if (filterInStockOnly && ruptureType) {
        return false;
      }

      // 2. Service filter
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
  }, [stations, fuelType, filterService, filterInStockOnly]);

  // Reset page when filters, search, or stations change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterService, filterInStockOnly, fuelType, gpsActive, gpsCoords, suggestionCoords, submittedSearchQuery]);

  // Compute paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredStations.length / pageSize));
  const paginatedStations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStations.slice(start, start + pageSize);
  }, [filteredStations, currentPage, pageSize]);



  const renderFuelContent = () => {
    return (
      <>
        <header className="module-header">
          <div className="module-title">
            <h2>⛽ Pit-Stop Locator</h2>
            <p>Locate the cheapest fuel stations in your route vicinity</p>
          </div>

          {/* Controls: two rows — selectors on top, action buttons below */}
          <div className="header-controls">
            {/* Row 1: List/Map + Fuel Type selectors */}
            <div className="header-controls-row">
              <div className="selector-group" role="group" aria-label="View Mode Selector">
                <button
                  type="button"
                  className={`glove-target selector-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  id="view-list-toggle-btn"
                >
                  List
                </button>
                <button
                  type="button"
                  className={`glove-target selector-btn ${viewMode === 'map' ? 'active' : ''}`}
                  onClick={() => setViewMode('map')}
                  id="view-map-toggle-btn"
                >
                  Map
                </button>
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
            </div>

            {/* Row 2: Trip Settings dropdown + Filter toggle (mobile) */}
            <div className="header-controls-row">
              <div style={{ position: 'relative', flexGrow: 1 }}>
                <button
                  type="button"
                  onClick={() => setTripDropdownOpen(!tripDropdownOpen)}
                  className="glove-target action-btn"
                  style={{
                    width: '100%',
                    padding: '0 20px',
                    borderRadius: '14px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    borderColor: 'var(--neon-orange)',
                    color: 'var(--neon-orange)',
                    background: 'transparent',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxSizing: 'border-box',
                  }}
                >
                  🏍️ Trip Settings ▾
                </button>

                {tripDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    width: 'max(100%, 240px)',
                    maxWidth: 'calc(100vw - 32px)',
                    background: 'rgba(19, 19, 26, 0.98)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>👤 Profile:</span>
                      <span style={{ color: 'var(--neon-green)', fontWeight: 700, fontSize: '0.85rem' }}>Rider</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>⛽ Consumption:</span>
                      <span style={{ color: 'var(--neon-green)', fontWeight: 700, fontSize: '0.85rem' }}>{consumption} L/100km</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>⛽ Tank Capacity:</span>
                      <span style={{ color: 'var(--neon-green)', fontWeight: 700, fontSize: '0.85rem' }}>{fillSize} L</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>🧭 Search Radius:</span>
                      <span style={{ color: 'var(--neon-green)', fontWeight: 700, fontSize: '0.85rem' }}>{searchRadius} km</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsModal(true);
                        setTripDropdownOpen(false);
                      }}
                      className="glove-target action-btn"
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        borderRadius: '10px',
                        marginTop: '4px',
                      }}
                    >
                      ⚙️ Edit Config
                    </button>
                  </div>
                )}
              </div>

              {/* Filter toggle — visible only on mobile, same row as Trip Settings */}
              <button
                type="button"
                className="glove-target mobile-toggle-btn"
                onClick={() => setMobileFiltersExpanded(!mobileFiltersExpanded)}
                aria-expanded={mobileFiltersExpanded}
                style={{ flexShrink: 0 }}
              >
                {mobileFiltersExpanded ? '✕' : '⚙ Filters'}
              </button>
            </div>
          </div>
        </header>

        <div className="main-layout">
          {/* Controls Sidebar (Search & Filters) */}
          <aside className={`controls-sidebar collapsible-container ${mobileFiltersExpanded ? '' : 'collapsed'}`}>
            <FilterControls
              filterService={filterService}
              filterInStockOnly={filterInStockOnly}
              setFilterInStockOnly={setFilterInStockOnly}
              onOpenServicesModal={() => setServicesModalOpen(true)}
            />
          </aside>

          {/* Main Content Column */}
          <div className="main-content-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
            {gpsError && (
              <div className="gps-error-message" role="alert">
                ⚠️ {gpsError}
              </div>
            )}
            
            {(gpsActive && gpsCoords) ? (
              <div className="search-active-message">
                📍 Showing {filteredStations.length} stations within {searchRadius}km of location ({gpsCoords.lat.toFixed(4)}, {gpsCoords.lon.toFixed(4)})
              </div>
            ) : submittedSearchQuery ? (
              <div className="search-active-message" style={{ color: 'var(--neon-blue)', borderColor: 'var(--neon-blue)', background: 'rgba(0, 240, 255, 0.05)' }}>
                🔍 Found {filteredStations.length} stations near "{submittedSearchQuery}"
              </div>
            ) : (
              <div className="search-active-message" style={{ color: 'var(--neon-blue)', borderColor: 'var(--neon-blue)', background: 'rgba(0, 240, 255, 0.05)' }}>
                ⛽ Found {filteredStations.length} stations
              </div>
            )}

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
                  onClick={() => refetchFuel()}
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
                  paginatedStations.map((station, idx) => (
                    <StationCard
                      key={station.id}
                      station={station}
                      fuelType={fuelType}
                      index={(currentPage - 1) * pageSize + idx}
                    />
                  ))
                ) : (
                  <div className="empty-state">
                    {stations.length === 0 
                      ? "No stations found matching search criteria." 
                      : "No stations match the selected UI filters."}
                  </div>
                )}
                </main>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
                </>
              )}
              </>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderActiveModule = () => {
    const handleNavigateToPitstop = () => setActiveModule('pitstop');

    switch (activeModule) {
      case 'pitstop':
        return renderFuelContent();
      case 'explore':
        return <ExploreModule onNavigateToPitstop={handleNavigateToPitstop} />;
      case 'shelter':
        return <ShelterModule onNavigateToPitstop={handleNavigateToPitstop} />;
      case 'wallet':
        return <WalletModule onNavigateToPitstop={handleNavigateToPitstop} />;
      case 'radar':
        return <RadarModule onNavigateToPitstop={handleNavigateToPitstop} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
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
      <MotoSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        fillSize={fillSize}
        consumption={consumption}
        searchRadius={searchRadius}
        onUpdateFillSize={handleUpdateFillSize}
        onUpdateConsumption={handleUpdateConsumption}
        onUpdateSearchRadius={handleUpdateSearchRadius}
        gpsActive={gpsActive}
        loading={loading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        suggestions={suggestions}
        showSuggestions={showSuggestions}
        setShowSuggestions={setShowSuggestions}
        onGpsSearch={handleGpsSearch}
        onClearGps={handleClearGps}
        onTextSearch={handleTextSearch}
        onSelectSuggestion={handleSelectSuggestion}
        onManualRefresh={handleManualRefresh}
      />
      <ServicesModal
        isOpen={servicesModalOpen}
        onClose={() => setServicesModalOpen(false)}
        filterService={filterService}
        setFilterService={setFilterService}
      />
    </div>
  );
}
