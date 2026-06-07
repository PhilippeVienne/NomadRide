import { useState } from 'react';
import { useTranslation } from '../i18n/LanguageContext';

interface WalletModuleProps {
  onNavigateToPitstop: () => void;
}

export default function WalletModule({ onNavigateToPitstop }: WalletModuleProps) {
  const { t } = useTranslation();
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
          <h2>{t('wallet.title')}</h2>
          <p>{t('wallet.subtitle')}</p>
        </div>
      </header>

      <div className="mock-grid">
        <div className="mock-card">
          <div className="mock-title-row">
            <h3>{t('wallet.tripCost')}</h3>
            <span className="mock-badge green">{t('wallet.costOptimized')}</span>
          </div>
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <span style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--neon-green)', textShadow: 'var(--shadow-neon-green)' }}>
              {totalCost.toFixed(2)} €
            </span>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              {t('wallet.costBasedOn', { distance: mockDistance })}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>{t('wallet.fuelCost')}</span>
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
                <span>{t('wallet.tolls')}</span>
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
                <span>{t('wallet.wear')}</span>
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
              <h3>{t('wallet.settings')}</h3>
              <span className="mock-badge orange">{t('wallet.interactive')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('wallet.fuelPriceAssumption')}</span>
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
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('wallet.motoTollClass')}</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    onClick={() => setTollClass(5)}
                    className={`glove-target selector-btn ${tollClass === 5 ? 'active' : ''}`}
                    style={{ flex: 1, minHeight: '44px', height: '44px', fontSize: '0.85rem' }}
                  >
                    {t('wallet.class5')}
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
                    {t('wallet.class1')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button onClick={onNavigateToPitstop} className="glove-target action-btn" style={{ marginTop: '20px' }}>
            {t('wallet.syncButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

