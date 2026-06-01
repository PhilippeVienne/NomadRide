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

  // Brand logos matching the mockup (Total, Esso, System U, E.Leclerc)
  const quickBrands = [
    { key: 'total', name: 'Total', logo: '🔴' },
    { key: 'esso', name: 'Esso', logo: '🔵' },
    { key: 'systeme_u', name: 'Système U', logo: '🟢' },
    { key: 'leclerc', name: 'E.Leclerc', logo: '🟡' },
  ];

  // Quick service icon toggles
  const quickServices = [
    { key: 'wash', icon: '🧼', name: 'Wash' },
    { key: 'shop', icon: '🏪', name: 'Shop' },
    { key: 'food', icon: '🍔', name: 'Food' },
    { key: 'wc', icon: '🚻', name: 'WC' },
    { key: '24/7 pay', icon: '💳', name: '24/7' },
  ];

  return (
    <section className="filter-controls-container" aria-label="Filter Controls" style={{ width: '100%' }}>
      <div className="filter-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--neon-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          🔍 Filters ({filteredStationsCount} found)
        </h3>
        <div className="view-mode-toggle-container" style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            className={`glove-target toggle-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            id="view-list-toggle-btn"
            style={{ padding: '6px 12px', minHeight: '36px', fontSize: '0.85rem' }}
          >
            List
          </button>
          <button
            type="button"
            className={`glove-target toggle-view-btn ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => setViewMode('map')}
            id="view-map-toggle-btn"
            style={{ padding: '6px 12px', minHeight: '36px', fontSize: '0.85rem' }}
          >
            Map
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

            {/* Compact Brand Logo Chips */}
            <div className="brand-quick-chips" style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              {quickBrands.map((qb) => (
                <button
                  key={qb.key}
                  type="button"
                  onClick={() => setFilterBrand(filterBrand === qb.key ? 'all' : qb.key)}
                  className={`brand-logo-chip glove-target ${filterBrand === qb.key ? 'active' : ''}`}
                  title={qb.name}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: filterBrand === qb.key ? 'rgba(255, 107, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: `2px solid ${filterBrand === qb.key ? 'var(--neon-orange)' : 'rgba(255, 255, 255, 0.1)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {qb.logo}
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
              style={{ width: '100%', marginBottom: '6px' }}
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

            {/* Quick Service Icon Grid */}
            <div className="services-quick-grid" style={{ display: 'flex', gap: '8px' }}>
              {quickServices.map((qs) => (
                <button
                  key={qs.key}
                  type="button"
                  onClick={() => setFilterService(filterService === qs.key ? 'all' : qs.key)}
                  className={`service-grid-btn glove-target ${filterService === qs.key ? 'active' : ''}`}
                  title={qs.name}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: filterService === qs.key ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${filterService === qs.key ? 'var(--neon-blue)' : 'rgba(255, 255, 255, 0.1)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {qs.icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="filter-controls-row">
          {/* Availability Toggles */}
          <div className="filter-control-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="filter-label">Availability</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Show All (incl. shortages)</span>
                <input
                  type="checkbox"
                  checked={!filterInStockOnly}
                  onChange={() => setFilterInStockOnly(false)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--neon-orange)' }}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Stock Only</span>
                <input
                  type="checkbox"
                  checked={filterInStockOnly}
                  onChange={() => setFilterInStockOnly(true)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--neon-orange)' }}
                />
              </label>
            </div>
          </div>

          {/* Price Range Fields */}
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
