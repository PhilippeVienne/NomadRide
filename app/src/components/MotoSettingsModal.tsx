
interface MotoSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fillSize: number;
  consumption: number;
  searchRadius: number;
  onUpdateFillSize: (val: number) => void;
  onUpdateConsumption: (val: number) => void;
  onUpdateSearchRadius: (val: number) => void;
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
}: MotoSettingsModalProps) {
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
          <h3>🏍️ Moto Settings</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close Settings">
            ✕
          </button>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="pref-control-group">
            <span className="pref-label">Tank Fill Size</span>
            <div className="pref-adjuster">
              <button
                type="button"
                onClick={() => onUpdateFillSize(Math.max(2, fillSize - 1))}
                className="glove-target pref-btn-adjust minus"
                aria-label="Decrease tank fill size"
              >
                -
              </button>
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
              <button
                type="button"
                onClick={() => onUpdateFillSize(Math.min(50, fillSize + 1))}
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
                onClick={() => onUpdateConsumption(Math.max(1, consumption - 0.5))}
                className="glove-target pref-btn-adjust minus"
                aria-label="Decrease fuel consumption rate"
              >
                -
              </button>
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
              <button
                type="button"
                onClick={() => onUpdateConsumption(Math.min(20, consumption + 0.5))}
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
                onClick={() => onUpdateSearchRadius(Math.max(5, searchRadius - 5))}
                className="glove-target pref-btn-adjust minus"
                aria-label="Decrease search radius"
              >
                -
              </button>
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
              <button
                type="button"
                onClick={() => onUpdateSearchRadius(Math.min(100, searchRadius + 5))}
                className="glove-target pref-btn-adjust plus"
                aria-label="Increase search radius"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <footer className="modal-footer">
          <button className="glove-target modal-action-btn" onClick={onClose}>
            Apply Settings
          </button>
        </footer>
      </div>
    </div>
  );
}
