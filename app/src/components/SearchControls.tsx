import { FormEvent } from 'react';
import { LocationSuggestion } from '../services/apiService';

interface SearchControlsProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  suggestions: LocationSuggestion[];
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  gpsActive: boolean;
  loading: boolean;
  onTextSearch: (e: FormEvent) => void;
  onSelectSuggestion: (s: LocationSuggestion) => void;
  onGpsSearch: () => void;
  onClearGps: () => void;
  onManualRefresh: () => void;
}

export default function SearchControls({
  searchQuery,
  setSearchQuery,
  suggestions,
  showSuggestions,
  setShowSuggestions,
  gpsActive,
  loading,
  onTextSearch,
  onSelectSuggestion,
  onGpsSearch,
  onClearGps,
  onManualRefresh,
}: SearchControlsProps) {
  return (
    <section className="search-controls-container" aria-label="Search Controls" style={{ width: '100%' }}>
      <form onSubmit={onTextSearch} className="search-form">
        <div className="search-input-wrapper" style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            placeholder="Search city / postcode..."
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
                  onClick={() => onSelectSuggestion(s)}
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

      <div className="search-buttons-group" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        {gpsActive ? (
          <button
            type="button"
            onClick={onClearGps}
            className="glove-target gps-btn active"
            id="clear-gps-btn"
            style={{ flex: 1 }}
          >
            🎯 Clear GPS
          </button>
        ) : (
          <button
            type="button"
            onClick={onGpsSearch}
            className="glove-target gps-btn"
            id="trigger-gps-btn"
            style={{ flex: 1 }}
          >
            🎯 GPS
          </button>
        )}

        <button
          type="button"
          onClick={onManualRefresh}
          className={`glove-target refresh-btn ${loading ? 'loading' : ''}`}
          disabled={loading}
          id="manual-refresh-btn"
          aria-label="Refresh fuel data"
          style={{ flex: 1 }}
        >
          <span className={`refresh-icon ${loading ? 'spinning' : ''}`}>🔄</span> Refresh
        </button>
      </div>
    </section>
  );
}
