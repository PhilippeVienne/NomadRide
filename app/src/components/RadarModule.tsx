import { useState } from 'react';

interface RadarModuleProps {
  onNavigateToPitstop: () => void;
}

export default function RadarModule({ onNavigateToPitstop }: RadarModuleProps) {
  const [autoReroute, setAutoReroute] = useState<boolean>(true);
  const [windThreshold, setWindThreshold] = useState<number>(40);

  return (
    <div className="preview-dashboard">
      <header className="module-header">
        <div className="module-title">
          <h2>📡 Radar Weather Routing</h2>
          <p>Live rain radar overlay and proactive storm alerts along your itinerary</p>
        </div>
      </header>

      <div className="mock-card" style={{ borderLeft: '4px solid var(--neon-orange)', background: 'rgba(255, 42, 42, 0.03)' }}>
        <div className="mock-title-row">
          <h3 style={{ color: 'var(--neon-orange)' }}>⚠️ WEATHER ALERT</h3>
          <span className="mock-badge red">Heavy Rain Expected</span>
        </div>
        <p style={{ color: '#fff', fontWeight: 600 }}>Rain cell moving East over Col d'Aspin in 35 minutes. Detouring advised to keep tires dry.</p>
      </div>

      <div className="mock-grid">
        <div className="mock-card">
          <div className="mock-title-row">
            <h3>Route Segment Risks</h3>
            <span className="mock-badge orange">High Winds</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Toulouse ➡️ Foix</span>
              <span style={{ color: 'var(--neon-green)', fontWeight: 700 }}>☀️ Sunny (18°C)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Foix ➡️ Col d'Aspin</span>
              <span style={{ color: 'var(--neon-orange)', fontWeight: 700 }}>🌧️ Rain (80% / 12°C)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Col du Tourmalet</span>
              <span style={{ color: 'var(--neon-orange)', fontWeight: 700 }}>💨 Winds (45 km/h)</span>
            </div>
          </div>
        </div>

        <div className="mock-card">
          <div className="mock-title-row">
            <h3>Radar Forecast Controls</h3>
            <span className="mock-badge green">Live Updates</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Auto-reroute on heavy rain</span>
              <button
                onClick={() => setAutoReroute(!autoReroute)}
                className={`glove-target filter-toggle-btn ${autoReroute ? 'active' : ''}`}
                style={{ height: '44px', minHeight: '44px', width: '90px' }}
              >
                {autoReroute ? 'ON' : 'OFF'}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Wind gust warning threshold</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setWindThreshold((t) => Math.max(20, t - 5))}
                  className="glove-target selector-btn"
                  style={{ width: '36px', height: '36px', minHeight: '36px', padding: 0, border: 'none', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                >
                  -
                </button>
                <span style={{ fontWeight: 700, minWidth: '70px', textAlign: 'center' }}>{windThreshold} km/h</span>
                <button
                  onClick={() => setWindThreshold((t) => Math.min(100, t + 5))}
                  className="glove-target selector-btn"
                  style={{ width: '36px', height: '36px', minHeight: '36px', padding: 0, border: 'none', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button onClick={onNavigateToPitstop} className="glove-target action-btn" style={{ width: '100%' }}>
        Return to Fuel Locator
      </button>
    </div>
  );
}
