
interface ServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterService: string;
  setFilterService: (service: string) => void;
}

export default function ServicesModal({
  isOpen,
  onClose,
  filterService,
  setFilterService,
}: ServicesModalProps) {
  if (!isOpen) return null;

  const servicesList = [
    { key: 'air', label: 'Air 🛞' },
    { key: 'wash', label: 'Wash 🧼' },
    { key: 'gas', label: 'Gas 💨' },
    { key: 'shop', label: 'Shop 🏪' },
    { key: 'food', label: 'Food 🍔' },
    { key: 'parcel', label: 'Parcel 📦' },
    { key: 'wifi', label: 'Wifi 🛜' },
    { key: 'wc', label: 'WC 🚻' },
    { key: 'shower', label: 'Shower 🚿' },
    { key: 'repair', label: 'Repair 🛠️' },
    { key: '24/7 pay', label: '24/7 Pay 💳' },
    { key: 'rental', label: 'Rental 🚗' },
  ];

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--neon-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🧼 Station Services
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: 0,
            }}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
          Select a service to filter fuel stations:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '6px' }}>
          <button
            type="button"
            onClick={() => {
              setFilterService('all');
            }}
            className={`glove-target select-option-btn ${filterService === 'all' ? 'active' : ''}`}
            style={{
              width: '100%',
              minHeight: '48px',
              borderRadius: '10px',
              border: `1px solid ${filterService === 'all' ? 'var(--neon-orange)' : 'rgba(255, 255, 255, 0.1)'}`,
              background: filterService === 'all' ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontWeight: filterService === 'all' ? 700 : 500,
              cursor: 'pointer',
              textAlign: 'left',
              paddingLeft: '16px',
            }}
          >
            All Services (No Filter)
          </button>

          {servicesList.map((srv) => (
            <button
              key={srv.key}
              type="button"
              onClick={() => {
                setFilterService(srv.key);
              }}
              className={`glove-target select-option-btn ${filterService === qbKey(srv.key) ? 'active' : ''}`}
              style={{
                width: '100%',
                minHeight: '48px',
                borderRadius: '10px',
                border: `1px solid ${filterService === srv.key ? 'var(--neon-blue)' : 'rgba(255, 255, 255, 0.1)'}`,
                background: filterService === srv.key ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                fontWeight: filterService === srv.key ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                paddingLeft: '16px',
              }}
            >
              {srv.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="glove-target action-btn"
          style={{
            width: '100%',
            minHeight: '56px',
            marginTop: '24px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderRadius: '14px',
            borderColor: 'var(--neon-blue)',
            color: 'var(--neon-blue)',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          Close & Apply
        </button>
      </div>
    </div>
  );
}

function qbKey(key: string) {
  return key;
}
