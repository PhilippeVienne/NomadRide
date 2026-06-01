import { useState } from 'react';

interface WalletModuleProps {
  onNavigateToPitstop: () => void;
}

export default function WalletModule({ onNavigateToPitstop }: WalletModuleProps) {
  const [fuelPrice, setFuelPrice] = useState<number>(1.90);
  const [tollClass, setTollClass] = useState<number>(5);

  // Calculate dynamic fuel cost based on fuel price and mock distance (450km) and consumption (5L/100km)
  const mockDistance = 450;
  const mockConsumption = 5.0; // L/100km
  const fuelLitres = (mockDistance * mockConsumption) / 100;
  const calculatedFuelCost = fuelLitres * fuelPrice;
  const calculatedTollCost = tollClass === 5 ? 35.00 : 55.00;
  const calculatedWearCost = 22.00;
  const totalCost = calculatedFuelCost + calculatedTollCost + calculatedWearCost;

  return (
    <div className="preview-dashboard">
      <header className="module-header">
        <div className="module-title">
          <h2>🪙 Wallet Expense Calculator</h2>
          <p>Calculate total road trip cost including fuel, tolls, and wear & tear</p>
        </div>
      </header>

      <div className="mock-grid">
        <div className="mock-card">
          <div className="mock-title-row">
            <h3>Estimated Trip Cost</h3>
            <span className="mock-badge green">Cost-Optimized</span>
          </div>
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <span style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--neon-green)', textShadow: 'var(--shadow-neon-green)' }}>
              {totalCost.toFixed(2)} €
            </span>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              Based on {mockDistance}km Route & Custom Settings
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>Fuel Cost</span>
                <span>{calculatedFuelCost.toFixed(2)} €</span>
              </div>
              <div className="mock-progress-container">
                <div
                  className="mock-progress-fill"
                  style={{ width: `${Math.min(100, (calculatedFuelCost / totalCost) * 100)}%`, backgroundColor: 'var(--neon-blue)' }}
                ></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>Tolls</span>
                <span>{calculatedTollCost.toFixed(2)} €</span>
              </div>
              <div className="mock-progress-container">
                <div
                  className="mock-progress-fill"
                  style={{ width: `${Math.min(100, (calculatedTollCost / totalCost) * 100)}%`, backgroundColor: 'var(--neon-green)' }}
                ></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>Tire & Chain Wear (Detour fee)</span>
                <span>{calculatedWearCost.toFixed(2)} €</span>
              </div>
              <div className="mock-progress-container">
                <div
                  className="mock-progress-fill"
                  style={{ width: `${Math.min(100, (calculatedWearCost / totalCost) * 100)}%`, backgroundColor: 'var(--neon-orange)' }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mock-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="mock-title-row">
              <h3>Wallet Settings</h3>
              <span className="mock-badge orange">Interactive</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>FUEL PRICE ASSUMPTION</span>
                <div className="mock-slider-row">
                  <span className="mock-slider-val">{fuelPrice.toFixed(2)} €/L</span>
                  <input
                    type="range"
                    min="1.50"
                    max="2.50"
                    step="0.05"
                    value={fuelPrice}
                    onChange={(e) => setFuelPrice(parseFloat(e.target.value))}
                    style={{ accentColor: 'var(--neon-blue)', flexGrow: 1 }}
                  />
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>MOTO TOLL CLASS</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    onClick={() => setTollClass(5)}
                    className={`glove-target selector-btn ${tollClass === 5 ? 'active' : ''}`}
                    style={{ flex: 1, minHeight: '44px', height: '44px', fontSize: '0.85rem' }}
                  >
                    Class 5 (Solo)
                  </button>
                  <button
                    onClick={() => setTollClass(1)}
                    className={`glove-target selector-btn ${tollClass === 1 ? 'active' : ''}`}
                    style={{
                      flex: 1,
                      minHeight: '44px',
                      height: '44px',
                      fontSize: '0.85rem',
                      backgroundColor: tollClass === 1 ? 'var(--neon-blue)' : 'rgba(255,255,255,0.05)',
                      color: tollClass === 1 ? '#000' : '#fff',
                      border: 'none',
                    }}
                  >
                    Class 1 (Sidecar)
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button onClick={onNavigateToPitstop} className="glove-target action-btn" style={{ marginTop: '20px' }}>
            Sync with Fuel Database
          </button>
        </div>
      </div>
    </div>
  );
}
