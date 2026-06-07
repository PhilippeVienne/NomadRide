import { useTranslation } from '../i18n/LanguageContext';

interface FilterControlsProps {
  filterService: string;
  filterInStockOnly: boolean;
  setFilterInStockOnly: (inStock: boolean) => void;
  onOpenServicesModal: () => void;
}

export default function FilterControls({
  filterService,
  filterInStockOnly,
  setFilterInStockOnly,
  onOpenServicesModal,
}: FilterControlsProps) {
  const { t } = useTranslation();

  return (
    <section className="filter-controls-container" aria-label={t('pitstop.filters')} style={{ width: '100%' }}>

      {/* Simplified Filters Grid */}
      <div className="filter-controls-row" style={{ display: 'flex', gap: '20px', alignItems: 'start' }}>
        {/* Trigger Services Modal Button */}
        <div className="filter-control-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <span className="filter-label">{t('pitstop.servicesFilterLabel')}</span>
          <button
            type="button"
            onClick={onOpenServicesModal}
            className="glove-target action-btn"
            style={{
              width: '100%',
              minHeight: '56px',
              fontSize: '0.95rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderRadius: '14px',
            }}
          >
            {t('pitstop.servicesButton', { service: filterService === 'all' ? t('pitstop.allServices') : filterService.toUpperCase() })}
          </button>
        </div>

        {/* Availability Toggle */}
        <div className="filter-control-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <span className="filter-label">{t('pitstop.availabilityLabel')}</span>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', minHeight: '56px', background: 'rgba(255,255,255,0.03)', padding: '0 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 600 }}>{t('pitstop.includeShortages')}</span>
            <input
              type="checkbox"
              checked={!filterInStockOnly}
              onChange={(e) => setFilterInStockOnly(!e.target.checked)}
              style={{ width: '22px', height: '22px', accentColor: 'var(--neon-orange)' }}
            />
          </label>
        </div>
      </div>
    </section>
  );
}

