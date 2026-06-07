import { useState } from 'react';
import { FuelStation, FuelType } from '../services/apiService';
import {
  formatLastUpdated,
  parseServiceTag,
  getStationBrand,
  ServiceInfo
} from '../utils/stationUtils';
import { useTranslation } from '../i18n/LanguageContext';

interface StationCardProps {
  station: FuelStation;
  fuelType: FuelType;
  index: number;
}

export default function StationCard({ station, fuelType, index }: StationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t, language } = useTranslation();
  const price = station[`${fuelType}_prix` as keyof FuelStation] as number | undefined;
  const updateTime = station[`${fuelType}_maj` as keyof FuelStation] as string;
  const ruptureType = station[`${fuelType}_rupture_type` as keyof FuelStation] as string | undefined;
  const ruptureDebut = station[`${fuelType}_rupture_debut` as keyof FuelStation] as string | undefined;
  
  // Top card that isn't in rupture is the optimal choice
  const isBestValue = index === 0 && !ruptureType && station.distance !== undefined;
  const isCheapest = index === 0 && !ruptureType && station.distance === undefined;
  
  const rankText = ruptureType 
    ? t('card.rupture') 
    : (isBestValue ? t('card.bestValue') : (isCheapest ? t('card.cheapest') : `#${index + 1}`));

  // Parse coordinates for Google Maps link fallback
  const latVal = parseFloat(station.latitude) / 100000;
  const lonVal = parseFloat(station.longitude) / 100000;
  const mapsUrl = !isNaN(latVal) && !isNaN(lonVal)
    ? `https://www.google.com/maps/search/?api=1&query=${latVal},${lonVal}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(station.adresse + ', ' + station.ville)}`;

  // Format price: e.g. "1.990" -> integer "1", dot ".", fraction "990"
  let priceInteger = 'N/A';
  let priceFraction = '';
  if (price) {
    const formatted = Number(price).toFixed(3);
    const dotIdx = formatted.indexOf('.');
    priceInteger = formatted.substring(0, dotIdx);
    priceFraction = formatted.substring(dotIdx + 1);
  }

  const brand = getStationBrand(station.id, station.adresse, station.ville, station.brand);

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent toggling if user clicks the action link
    if ((e.target as HTMLElement).closest('a')) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <article
      onClick={handleCardClick}
      className={`station-card ${isExpanded ? 'expanded' : ''} ${ruptureType ? 'rupture' : (isBestValue ? 'best-value' : (isCheapest ? 'cheapest' : 'alternative'))}`}
    >
      <div className="card-top">
        <div className="price-tag">
          {ruptureType ? (
            <span className="price-rupture">{t('card.rupture')}</span>
          ) : price ? (
            <>
              <span className="price-integer">{priceInteger}</span>
              <span className="price-decimal-dot">.</span>
              <span className="price-fractional">{priceFraction}</span>
              <span className="price-currency">€</span>
            </>
          ) : (
            <span className="price-na">N/A</span>
          )}
        </div>
        <div className="card-top-right">
          <span className="rank">
            {rankText}
          </span>
          <span 
            className="station-brand-badge" 
            style={{ 
              background: brand.color, 
              color: brand.textColor,
              border: brand.border || 'none'
            }}
          >
            {brand.logoKey && (
              <img 
                src={`/logos/${brand.logoKey}.png`} 
                alt=""
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            )}
            {brand.name}
          </span>
          <span className="card-chevron" aria-hidden="true">▼</span>
        </div>
      </div>

      {/* Primary visual metrics for riders: Cost & Distance */}
      {(station.total_cost !== undefined || station.distance !== undefined) && (
        <div className="card-metrics-row">
          {station.total_cost !== undefined && (
            <div className="metric-box cost" title="Estimated fill cost (9L fill + detour cost)">
              <span className="metric-label">{t('card.totalCost')}</span>
              <span className="metric-value">🪙 {station.total_cost.toFixed(2)} €</span>
            </div>
          )}
          {station.distance !== undefined && (
            <div className="metric-box distance" title="Distance to station">
              <span className="metric-label">{t('card.distance')}</span>
              <span className="metric-value">📍 {station.distance.toFixed(1)} km</span>
            </div>
          )}
        </div>
      )}

      <div className="card-body-details">
        <h3 className="station-address">{station.adresse}</h3>
        <div className="station-city">{station.ville}</div>

        {/* Services without inner scrollbar, parsed with icon badges */}
        {station.services_service && station.services_service.length > 0 && (() => {
          const uniqueServices: ServiceInfo[] = [];
          const seenLabels = new Set<string>();
          for (const rawService of station.services_service) {
            const parsed = parseServiceTag(rawService, language);
            if (!seenLabels.has(parsed.label)) {
              seenLabels.add(parsed.label);
              uniqueServices.push(parsed);
            }
          }

          return (
            <div className="services-container" aria-label="Available services">
              {uniqueServices.slice(0, 4).map((service, sIndex) => (
                <span key={sIndex} className="service-tag" title={service.label}>
                  <span className="service-tag-icon">{service.icon}</span>
                  <span className="service-tag-label">{service.label}</span>
                </span>
              ))}
              {uniqueServices.length > 4 && (
                <span className="service-tag more" title={uniqueServices.slice(4).map(s => s.label).join(', ')}>
                  {t('card.more', { count: uniqueServices.length - 4 })}
                </span>
              )}
            </div>
          );
        })()}
      </div>

      <div className="card-meta">
        {ruptureType ? (
          ruptureDebut && (
            <div className="rupture-badge" title={`Shortage started on ${new Date(ruptureDebut).toLocaleString()}`}>
              {t('card.since', { time: formatLastUpdated(ruptureDebut, language) })}
            </div>
          )
        ) : (
          updateTime && (
            <div className="update-time-badge" title={`Updated on ${new Date(updateTime).toLocaleString()}`}>
              {t('card.updated', { time: formatLastUpdated(updateTime, language) })}
            </div>
          )
        )}

        {station.horaires_automate_24_24 === 'Oui' && (
          <div className="automate-24-badge" title="24/24 Automate Available">
            {t('card.automate24')}
          </div>
        )}

        {station.freshness_penalty !== undefined && station.freshness_penalty > 0 && (
          <div className="penalty-badge" title={`Staleness penalty applied: +${station.freshness_penalty.toFixed(3)} €/L`}>
            {t('card.staleness', { penalty: station.freshness_penalty.toFixed(3) })}
          </div>
        )}
      </div>

      <div className="card-actions">
        <a
          id={`map-link-${station.id}`}
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="glove-target map-action-link"
        >
          {t('card.viewMap')}
        </a>
      </div>
    </article>
  );
}

