import { useTranslation } from '../i18n/LanguageContext';

interface ExploreModuleProps {
  onNavigateToPitstop: () => void;
}

export default function ExploreModule({ onNavigateToPitstop }: ExploreModuleProps) {
  const { t } = useTranslation();

  return (
    <div className="preview-dashboard">
      <header className="module-header">
        <div className="module-title">
          <h2>{t('explore.title')}</h2>
          <p>{t('explore.subtitle')}</p>
        </div>
      </header>

      <div className="mock-grid">
        <div className="mock-card">
          <div className="mock-title-row">
            <h3>{t('explore.routeOverview')}</h3>
            <span className="mock-badge green">{t('explore.scenicLevel', { level: t('explore.scenicExtreme') })}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{t('explore.from')}</span>
              <span style={{ fontWeight: 700 }}>{t('explore.toulouseCenter')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{t('explore.to')}</span>
              <span style={{ fontWeight: 700 }}>{t('explore.pyreneesLoop')}</span>
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
            <h3>{t('explore.routeMetrics')}</h3>
            <span className="mock-badge orange">{t('explore.totalDistance', { distance: 265 })}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{t('explore.twistiness')}</span>
              <span style={{ color: 'var(--neon-green)', fontWeight: 800, fontSize: '1.2rem' }}>⚡ 9.4/10</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{t('explore.elevationGain')}</span>
              <span style={{ fontWeight: 700 }}>⛰️ +4,820m</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{t('explore.rideTime')}</span>
              <span style={{ fontWeight: 700 }}>⏱️ 4h 12m</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mock-card">
        <div className="mock-title-row">
          <h3>{t('explore.elevationProfile')}</h3>
          <span className="mock-badge green">{t('explore.tourmaletOpen')}</span>
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
          {t('explore.checkStations')}
        </button>
      </div>
    </div>
  );
}

