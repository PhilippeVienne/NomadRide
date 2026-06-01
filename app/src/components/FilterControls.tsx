import { BrandInfo } from '../utils/stationUtils';

interface FilterControlsProps {
  filteredStationsCount: number;
  viewMode: 'list' | 'map';
  setViewMode: (mode: 'list' | 'map') => void;
  filterBrand: string;
  setFilterBrand: (brand: string) => void;
  filterService: string;
  setFilterService: (service: string) => void;
  filterInStockOnly: boolean;
  setFilterInStockOnly: (inStock: boolean) => void;
  minPrice: string;
  setMinPrice: (price: string) => void;
  maxPrice: string;
  setMaxPrice: (price: string) => void;
  brandsList: BrandInfo[];
}

export default function FilterControls({
  filteredStationsCount,
  viewMode,
  setViewMode,
  filterBrand,
  setFilterBrand,
  filterService,
  setFilterService,
  filterInStockOnly,
  setFilterInStockOnly,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  brandsList,
}: FilterControlsProps) {

  // Define some quick select brands for the logo chips under Brand selector
  const quickBrands = [
    { key: 'total', name: 'Total', logo: '🔴' },
    { key: 'esso', name: 'Esso', logo: '🔵' },
    { key: 'systeme_u', name: 'Système U', logo: '🟢' },
    { key: 'leclerc', name: 'E.Leclerc', logo: '🟡' },
  ];

  return (
    <section className="filter-controls-container" aria-label="Filter Controls" style={{ width: '100%' }}>
      <div className="filter-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--neon-blue)' }}>🔍 Filters ({filteredStationsCount} found)</h3>
        <div className="view-mode-toggle-container" style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            className={`glove-target toggle-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            id="view-list-toggle-btn"
            style={{ padding: '6px 12px', minHeight: '36px', fontSize: '0.85rem' }}
          >
            📋 List
          </button>
          <button
            type="button"
            className={`glove-target toggle-view-btn ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => setViewMode('map')}
            id="view-map-toggle-btn"
            style={{ padding: '6px 12px', minHeight: '36px', fontSize: '0.85rem' }}
          >
            🗺️ Map
          </button>
        </div>
      </div>

      <div className="filter-controls" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="filter-controls-row">
          {/* Brand Selection */}
          <div className="filter-control-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="filter-brand-select" className="filter-label">Select Brand</label>
            <select
              id="filter-brand-select"
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="glove-target filter-select"
              style={{ width: '100%' }}
            >
              <option value="all">All Brands</option>
              {brandsList.map((b) => (
                <option key={b.logoKey} value={b.logoKey || 'independent'}>{b.name}</option>
              ))}
              <option value="independent">Indépendant</option>
            </select>

            {/* Quick Select Brand Chips */}
            <div className="brand-quick-chips" style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
              {quickBrands.map((qb) => (
                <button
                  key={qb.key}
                  type="button"
                  onClick={() => setFilterBrand(filterBrand === qb.key ? 'all' : qb.key)}
                  className={`brand-chip-btn glove-target ${filterBrand === qb.key ? 'active' : ''}`}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '8px',
                    background: filterBrand === qb.key ? 'rgba(255, 107, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${filterBrand === qb.key ? 'var(--neon-orange)' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: '#fff',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{qb.logo}</span>
                  <span>{qb.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Service Selection */}
          <div className="filter-control-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="filter-service-select" className="filter-label">Select Services</label>
            <select
              id="filter-service-select"
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="glove-target filter-select"
              style={{ width: '100%' }}
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

            {/* Active Service Chip display */}
            {filterService !== 'all' && (
              <div style={{ marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setFilterService('all')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'rgba(0, 240, 255, 0.1)',
                    border: '1px solid var(--neon-blue)',
                    color: '#fff',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <span>🛠️ {filterService.toUpperCase()}</span>
                  <span style={{ fontWeight: 700 }}>✕</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="filter-controls-row">
          {/* Availability Switch Toggles */}
          <div className="filter-control-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span className="filter-label">Availability</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Show All (incl. shortages)</span>
                <input
                  type="checkbox"
                  checked={!filterInStockOnly}
                  onChange={() => setFilterInStockOnly(false)}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--neon-orange)' }}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Stock Only</span>
                <input
                  type="checkbox"
                  checked={filterInStockOnly}
                  onChange={() => setFilterInStockOnly(true)}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--neon-orange)' }}
                />
              </label>
            </div>
          </div>

          {/* Price Range Slider / Min-Max Input Fields */}
          <div className="filter-control-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span className="filter-label">Price Range</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(9, 9, 11, 0.7)',
                    color: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>€</span>
              </div>
              <span style={{ color: 'var(--text-secondary)' }}>-</span>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(9, 9, 11, 0.7)',
                    color: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>€</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              <span>[Min. Price €]</span>
              <span>[Max. Price €]</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
