interface ShelterModuleProps {
  onNavigateToPitstop: () => void;
}

export default function ShelterModule({ onNavigateToPitstop }: ShelterModuleProps) {
  return (
    <div className="preview-dashboard">
      <header className="module-header">
        <div className="module-title">
          <h2>🛖 Emergency Shelter Finder</h2>
          <p>Locate motorcycle-friendly shelter, mechanics, or hotels in case of breakdowns or storms</p>
        </div>
      </header>

      <div className="rider-preferences-container" style={{ padding: '16px 20px', gap: '12px' }}>
        <div className="preferences-header">
          <h3>Quick Shelter Filters</h3>
          <span className="preferences-subtitle">Filter emergency pitstops by immediate need</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-end' }}>
          {['⛺ Campsites', '🛖 Biker Cabins', '🏨 Safe Hotels', '🛠️ Open Garages'].map((filter, i) => (
            <button key={i} className="glove-target selector-btn" style={{ padding: '8px 16px', fontSize: '0.9rem', minHeight: '44px', minWidth: '100px', backgroundColor: i === 1 ? 'var(--neon-blue)' : 'rgba(255,255,255,0.05)', color: i === 1 ? '#000' : '#fff', border: 'none', borderRadius: '10px' }}>
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="mock-grid">
        <div className="mock-card">
          <div className="mock-title-row">
            <h3>Moto-Gîte des Pyrénées</h3>
            <span className="mock-badge green">12 km away</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px' }}>Biker-owned shelter, covered garage box with tools, wet gear drying room.</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--neon-green)', fontWeight: 700 }}>🛖 3 Cabins Left</span>
            <button className="glove-target action-btn" style={{ height: '44px', minHeight: '44px', fontSize: '0.9rem', padding: '0 16px' }}>Secure Spot</button>
          </div>
        </div>

        <div className="mock-card">
          <div className="mock-title-row">
            <h3>Garage Moto-Service D918</h3>
            <span className="mock-badge orange">28 km away</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px' }}>Emergency flat tire repairs, trailer service, chain replacements. Open until 10 PM.</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--neon-blue)', fontWeight: 700 }}>🛠️ Mechanic Available</span>
            <button className="glove-target action-btn" style={{ height: '44px', minHeight: '44px', fontSize: '0.9rem', padding: '0 16px' }}>Call Garage</button>
          </div>
        </div>
      </div>

      <button onClick={onNavigateToPitstop} className="glove-target action-btn" style={{ width: '100%' }}>
        Return to Fuel Locator
      </button>
    </div>
  );
}
