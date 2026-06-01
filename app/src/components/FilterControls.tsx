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
  brandsList,
}: FilterControlsProps) {
  return (
    <section className="filter-controls-container" aria-label="Filter Controls" style={{ width: '100%' }}>
      <div className="filter-header" style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>🔍 Filters ({filteredStationsCount} found)</h3>
        <div className="view-mode-toggle-container" style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`glove-target toggle-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            id="view-list-toggle-btn"
            style={{ flex: 1 }}
          >
            📋 List
          </button>
          <button
            type="button"
            className={`glove-target toggle-view-btn ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => setViewMode('map')}
            id="view-map-toggle-btn"
            style={{ flex: 1 }}
          >
            🗺️ Map
          </button>
        </div>
      </div>
      <div className="filter-controls" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="filter-control-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="filter-brand-select" className="filter-label">Brand</label>
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
        </div>

        <div className="filter-control-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="filter-service-select" className="filter-label">Service</label>
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
        </div>

        <div className="filter-control-group toggle-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="filter-label">Availability</label>
          <button
            type="button"
            id="filter-instock-toggle"
            onClick={() => setFilterInStockOnly(!filterInStockOnly)}
            className={`glove-target filter-toggle-btn ${filterInStockOnly ? 'active' : ''}`}
            style={{ width: '100%', minHeight: '56px' }}
          >
            {filterInStockOnly ? '✅ In-Stock Only' : 'Show All (incl. Shortages)'}
          </button>
        </div>
      </div>
    </section>
  );
}
