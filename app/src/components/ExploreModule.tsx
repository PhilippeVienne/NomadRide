interface ExploreModuleProps {
  onNavigateToPitstop: () => void;
}

export default function ExploreModule({ onNavigateToPitstop }: ExploreModuleProps) {
  return (
    <div className="preview-dashboard">
      <header className="module-header">
        <div className="module-title">
          <h2>🧭 Explore Navigation</h2>
          <p>Curated twisty motorcycle routes & elevation planning</p>
        </div>
      </header>

      <div className="mock-grid">
        <div className="mock-card">
          <div className="mock-title-row">
            <h3>Route Overview</h3>
            <span className="mock-badge green">Scenic Level: Extreme</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>From</span>
              <span style={{ fontWeight: 700 }}>Toulouse Center</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>To</span>
              <span style={{ fontWeight: 700 }}>Pyrenees Loop (Col du Tourmalet)</span>
            </div>
          </div>

          <div className="mock-route-line">
            <div className="mock-route-dot start" title="Toulouse"></div>
            <div className="mock-route-dot mid" title="Col d'Aspin"></div>
            <div className="mock-route-dot end" title="Col du Tourmalet"></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <span>0 km</span>
            <span>140 km</span>
            <span>265 km</span>
          </div>
        </div>

        <div className="mock-card">
          <div className="mock-title-row">
            <h3>Route Metrics</h3>
            <span className="mock-badge orange">265 km total</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Twistiness Index</span>
              <span style={{ color: 'var(--neon-green)', fontWeight: 800, fontSize: '1.2rem' }}>⚡ 9.4/10</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Elevation Gain</span>
              <span style={{ fontWeight: 700 }}>⛰️ +4,820m</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Estimated Ride Time</span>
              <span style={{ fontWeight: 700 }}>⏱️ 4h 12m</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mock-card">
        <div className="mock-title-row">
          <h3>Elevation Profile & Mountain Passes</h3>
          <span className="mock-badge green">Tourmalet Pass Open</span>
        </div>
        <div className="mock-elevation-chart">
          <div className="mock-elevation-bar" style={{ height: '20%' }} title="Toulouse: 150m"></div>
          <div className="mock-elevation-bar" style={{ height: '30%' }} title="Foix: 380m"></div>
          <div className="mock-elevation-bar" style={{ height: '55%' }} title="Col d'Aspin: 1489m"></div>
          <div className="mock-elevation-bar" style={{ height: '40%' }} title="Arreau: 700m"></div>
          <div className="mock-elevation-bar" style={{ height: '95%' }} title="Col du Tourmalet: 2115m"></div>
          <div className="mock-elevation-bar" style={{ height: '60%' }} title="Luz-Saint-Sauveur: 711m"></div>
          <div className="mock-elevation-bar" style={{ height: '25%' }} title="Tarbes: 300m"></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
          <span>Toulouse</span>
          <span>Col d'Aspin</span>
          <span>Col du Tourmalet</span>
          <span>Tarbes</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <button onClick={onNavigateToPitstop} className="glove-target action-btn" style={{ flex: '1', minWidth: '200px' }}>
          📍 Check Nearby Fuel Stations
        </button>
      </div>
    </div>
  );
}
