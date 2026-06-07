import { useTranslation } from '../i18n/LanguageContext';

interface ShelterModuleProps {
  onNavigateToPitstop: () => void;
}

export default function ShelterModule({ onNavigateToPitstop }: ShelterModuleProps) {
  const { t } = useTranslation();

  return (
    <div className="preview-dashboard">
      <header className="module-header">
        <div className="module-title">
          <h2>{t('shelter.title')}</h2>
          <p>{t('shelter.subtitle')}</p>
        </div>
      </header>

      <div className="rider-preferences-container" style={{ padding: '16px 20px', gap: '12px' }}>
        <div className="preferences-header">
          <h3>{t('shelter.quickFilters')}</h3>
          <span className="preferences-subtitle">{t('shelter.filterSubtitle')}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-end' }}>
          {[t('shelter.campsites'), t('shelter.cabins'), t('shelter.hotels'), t('shelter.garages')].map((filter, i) => (
            <button key={i} className="glove-target selector-btn" style={{ padding: '8px 16px', fontSize: '0.9rem', minHeight: '44px', minWidth: '100px', backgroundColor: i === 1 ? 'var(--neon-blue)' : 'rgba(255,255,255,0.05)', color: i === 1 ? '#000' : '#fff', border: 'none', borderRadius: '10px' }}>
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="mock-grid">
        <div className="mock-card">
          <div className="mock-title-row">
            <h3>{t('shelter.giteTitle')}</h3>
            <span className="mock-badge green">12 km away</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px' }}>{t('shelter.giteDesc')}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--neon-green)', fontWeight: 700 }}>{t('shelter.giteStatus')}</span>
            <button className="glove-target action-btn" style={{ height: '44px', minHeight: '44px', fontSize: '0.9rem', padding: '0 16px' }}>{t('shelter.giteAction')}</button>
          </div>
        </div>

        <div className="mock-card">
          <div className="mock-title-row">
            <h3>{t('shelter.garageTitle')}</h3>
            <span className="mock-badge orange">28 km away</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px' }}>{t('shelter.garageDesc')}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--neon-blue)', fontWeight: 700 }}>{t('shelter.garageStatus')}</span>
            <button className="glove-target action-btn" style={{ height: '44px', minHeight: '44px', fontSize: '0.9rem', padding: '0 16px' }}>{t('shelter.garageAction')}</button>
          </div>
        </div>
      </div>

      <button onClick={onNavigateToPitstop} className="glove-target action-btn" style={{ width: '100%' }}>
        {t('shelter.return')}
      </button>
    </div>
  );
}

