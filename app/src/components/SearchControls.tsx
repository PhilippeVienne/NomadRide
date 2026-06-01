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
    <div className="search-controls-row" style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%' }}>
      <form onSubmit={onTextSearch} className="search-bar-form" style={{ display: 'flex', flexGrow: 1, position: 'relative' }}>
        <button
          type="button"
          onClick={gpsActive ? onClearGps : onGpsSearch}
          className={`glove-target search-gps-btn ${gpsActive ? 'active' : ''}`}
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: gpsActive ? 'var(--neon-orange)' : 'var(--text-secondary)',
            fontSize: '1.2rem',
            cursor: 'pointer',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            width: '36px',
            height: '36px',
          }}
          title={gpsActive ? "Clear GPS Search" : "Search around GPS"}
        >
          {gpsActive ? '🎯' : '📍'}
        </button>

        <input
          type="text"
          placeholder="Enter location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowSuggestions(suggestions.length > 0)}
          onBlur={() => {
            // Short timeout to let the list item click event complete before hiding
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          className="glove-target search-input-mockup"
          id="fuel-search-input"
          aria-label="Search city or zip code"
          autoComplete="off"
          style={{
            width: '100%',
            minHeight: '56px',
            paddingLeft: '50px',
            paddingRight: '50px',
            borderRadius: '28px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: 'rgba(19, 19, 26, 0.65)',
            color: '#fff',
            fontSize: '1rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        <button
          type="submit"
          className="search-icon-btn"
          style={{
            position: 'absolute',
            right: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--neon-orange)',
            fontSize: '1.1rem',
            cursor: 'pointer',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            width: '36px',
            height: '36px',
          }}
        >
          🔍
        </button>

        {showSuggestions && suggestions.length > 0 && (
          <ul className="autocomplete-suggestions" style={{ position: 'absolute', top: '60px', left: 0, right: 0, zIndex: 1000 }} role="listbox">
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
      </form>

      <button
        type="button"
        onClick={onManualRefresh}
        className={`glove-target refresh-icon-btn ${loading ? 'spinning' : ''}`}
        disabled={loading}
        title="Refresh data"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          background: 'rgba(19, 19, 26, 0.65)',
          color: '#fff',
          fontSize: '1.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          padding: 0,
        }}
      >
        <span className={`refresh-icon-spinner ${loading ? 'spinning' : ''}`} style={{ display: 'inline-block' }}>🔄</span>
      </button>
    </div>
  );
}
