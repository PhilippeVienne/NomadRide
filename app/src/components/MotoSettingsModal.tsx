import { FormEvent } from 'react';
import { LocationSuggestion } from '../services/apiService';
import { useTranslation } from '../i18n/LanguageContext';

interface MotoSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fillSize: number;
  consumption: number;
  searchRadius: number;
  onUpdateFillSize: (val: number) => void;
  onUpdateConsumption: (val: number) => void;
  onUpdateSearchRadius: (val: number) => void;
  excludeDistance: boolean;
  onUpdateExcludeDistance: (val: boolean) => void;
  // Location Override
  gpsActive: boolean;
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  suggestions: LocationSuggestion[];
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  onGpsSearch: () => void;
  onClearGps: () => void;
  onTextSearch: (e: FormEvent) => void;
  onSelectSuggestion: (s: LocationSuggestion) => void;
  onManualRefresh: () => void;
}

export default function MotoSettingsModal({
  isOpen,
  onClose,
  fillSize,
  consumption,
  searchRadius,
  onUpdateFillSize,
  onUpdateConsumption,
  onUpdateSearchRadius,
  excludeDistance,
  onUpdateExcludeDistance,
  gpsActive,
  loading,
  searchQuery,
  setSearchQuery,
  suggestions,
  showSuggestions,
  setShowSuggestions,
  onGpsSearch,
  onClearGps,
  onTextSearch,
  onSelectSuggestion,
  onManualRefresh,
}: MotoSettingsModalProps) {
  const { t, language } = useTranslation();

  if (!isOpen) return null;

  const handleBlurFillSize = () => {
    const next = Math.max(2, Math.min(50, fillSize));
    onUpdateFillSize(next);
    localStorage.setItem('nomad_fill_size', next.toString());
  };

  const handleBlurConsumption = () => {
    const next = Math.max(1, Math.min(20, parseFloat(consumption.toFixed(1))));
    onUpdateConsumption(next);
    localStorage.setItem('nomad_consumption', next.toString());
  };

  const handleBlurSearchRadius = () => {
    const next = Math.max(5, Math.min(100, searchRadius));
    onUpdateSearchRadius(next);
    localStorage.setItem('nomad_search_radius', next.toString());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>{t('settings.title')}</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label={t('settings.close')}>
            ✕
          </button>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── Location Override ── */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
              {t('settings.locationMode')}
            </p>

            {/* GPS / Search toggle */}
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '14px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={onGpsSearch}
                style={{
                  flex: 1,
                  minHeight: '48px',
                  borderRadius: '10px',
                  border: 'none',
                  background: gpsActive ? 'var(--neon-orange)' : 'transparent',
                  color: gpsActive ? '#000' : 'var(--text-secondary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
              >
                {t('settings.gpsMode')}
              </button>
              <button
                type="button"
                onClick={onClearGps}
                style={{
                  flex: 1,
                  minHeight: '48px',
                  borderRadius: '10px',
                  border: 'none',
                  background: !gpsActive ? 'var(--neon-orange)' : 'transparent',
                  color: !gpsActive ? '#000' : 'var(--text-secondary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
              >
                {t('settings.searchMode')}
              </button>
            </div>

            {/* Conditional body */}
            {gpsActive ? (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{
                  flexGrow: 1,
                  minHeight: '52px',
                  background: 'rgba(255, 107, 0, 0.1)',
                  border: '1px solid var(--neon-orange)',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '16px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}>
                  {t('settings.gpsActive')}
                </div>
                <button
                  type="button"
                  onClick={onManualRefresh}
                  disabled={loading}
                  title="Refresh GPS"
                  style={{
                    width: '52px', height: '52px', borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(19,19,26,0.65)',
                    color: '#fff', fontSize: '1.1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0, padding: 0,
                  }}
                >
                  <span style={{ display: 'inline-block' }} className={loading ? 'spinning' : ''}>🔄</span>
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <form onSubmit={onTextSearch} style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder={t('settings.placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(suggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    id="modal-location-search-input"
                    aria-label="Search location"
                    autoComplete="off"
                    style={{
                      flexGrow: 1,
                      minHeight: '52px',
                      paddingLeft: '16px',
                      paddingRight: '48px',
                      borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(9,9,11,0.7)',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      minHeight: '52px',
                      paddingInline: '16px',
                      borderRadius: '14px',
                      border: '1px solid var(--neon-orange)',
                      background: 'transparent',
                      color: 'var(--neon-orange)',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    🔍
                  </button>
                </form>
                {showSuggestions && suggestions.length > 0 && (
                  <ul
                    className="autocomplete-suggestions"
                    style={{ position: 'absolute', top: '58px', left: 0, right: 0, zIndex: 1200 }}
                    role="listbox"
                  >
                    {suggestions.map((s, i) => (
                      <li
                        key={i}
                        onClick={() => { onSelectSuggestion(s); onClose(); }}
                        className="autocomplete-suggestion-item glove-target"
                        role="option"
                      >
                        📍 {s.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* ── Moto Settings ── */}
          <div className="pref-control-group">
            <span className="pref-label">{t('settings.tankSize')}</span>
            <div className="pref-adjuster">
              <button type="button" onClick={() => onUpdateFillSize(Math.max(2, fillSize - 1))} className="glove-target pref-btn-adjust minus" aria-label="Decrease tank fill size">-</button>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', flexGrow: 1 }}>
                <input
                  type="number"
                  value={fillSize === 0 ? '' : fillSize}
                  onChange={(e) => onUpdateFillSize(parseInt(e.target.value) || 0)}
                  onBlur={handleBlurFillSize}
                  className="pref-input-field"
                  aria-label="Tank fill size value"
                />
                <span className="pref-unit">L</span>
              </div>
              <button type="button" onClick={() => onUpdateFillSize(Math.min(50, fillSize + 1))} className="glove-target pref-btn-adjust plus" aria-label="Increase tank fill size">+</button>
            </div>
          </div>

          <div className="pref-control-group">
            <span className="pref-label">{t('settings.consumption')}</span>
            <div className="pref-adjuster">
              <button type="button" onClick={() => onUpdateConsumption(Math.max(1, consumption - 0.5))} className="glove-target pref-btn-adjust minus" aria-label="Decrease fuel consumption rate">-</button>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', flexGrow: 1 }}>
                <input
                  type="number"
                  step="0.1"
                  value={consumption === 0 ? '' : consumption}
                  onChange={(e) => onUpdateConsumption(parseFloat(e.target.value) || 0)}
                  onBlur={handleBlurConsumption}
                  className="pref-input-field"
                  aria-label="Fuel consumption rate value"
                />
                <span className="pref-unit">L/100km</span>
              </div>
              <button type="button" onClick={() => onUpdateConsumption(Math.min(20, consumption + 0.5))} className="glove-target pref-btn-adjust plus" aria-label="Increase fuel consumption rate">+</button>
            </div>
          </div>

          <div className="pref-control-group">
            <span className="pref-label">{t('settings.radius')}</span>
            <div className="pref-adjuster">
              <button type="button" onClick={() => onUpdateSearchRadius(Math.max(5, searchRadius - 5))} className="glove-target pref-btn-adjust minus" aria-label="Decrease search radius">-</button>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', flexGrow: 1 }}>
                <input
                  type="number"
                  value={searchRadius === 0 ? '' : searchRadius}
                  onChange={(e) => onUpdateSearchRadius(parseInt(e.target.value) || 0)}
                  onBlur={handleBlurSearchRadius}
                  className="pref-input-field"
                  aria-label="Search radius value"
                />
                <span className="pref-unit">km</span>
              </div>
              <button type="button" onClick={() => onUpdateSearchRadius(Math.min(100, searchRadius + 5))} className="glove-target pref-btn-adjust plus" aria-label="Increase search radius">+</button>
            </div>
          </div>

          <div className="pref-control-group">
            <span className="pref-label">{t('settings.excludeDistance')}</span>
            <button
              type="button"
              onClick={() => onUpdateExcludeDistance(!excludeDistance)}
              className="glove-target"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingInline: '16px',
                minHeight: '56px',
                borderRadius: '16px',
                border: excludeDistance ? '1px solid var(--neon-orange)' : '1px solid rgba(255,255,255,0.1)',
                background: excludeDistance ? 'rgba(255, 107, 0, 0.1)' : 'rgba(9, 9, 11, 0.6)',
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
                  {language === 'fr' ? (excludeDistance ? 'Oui' : 'Non') : (excludeDistance ? 'Yes' : 'No')}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                  {t('settings.excludeDistanceDesc')}
                </span>
              </div>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                border: '2px solid ' + (excludeDistance ? 'var(--neon-orange)' : 'rgba(255,255,255,0.3)'),
                background: excludeDistance ? 'var(--neon-orange)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                flexShrink: 0,
              }}>
                {excludeDistance && '✓'}
              </div>
            </button>
          </div>

        </div>

        <footer className="modal-footer">
          <button className="glove-target modal-action-btn" onClick={onClose}>
            {t('settings.apply')}
          </button>
        </footer>
      </div>
    </div>
  );
}

