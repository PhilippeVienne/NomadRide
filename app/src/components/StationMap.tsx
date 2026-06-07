import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FuelStation, FuelType } from '../services/apiService';
import { getStationBrand } from '../utils/stationUtils';
import { useTranslation } from '../i18n/LanguageContext';

interface StationMapProps {
  stations: FuelStation[];
  centerCoords: { lat: number; lon: number } | null;
  radiusKm: number;
  fuelType: FuelType;
  onMapChange?: (newCenter: { lat: number; lon: number }, newRadiusKm: number) => void;
}

export default function StationMap({ stations, centerCoords, radiusKm, fuelType, onMapChange }: StationMapProps) {
  const { t } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circleOverlayRef = useRef<L.Circle | null>(null);
  const programmaticMoveRef = useRef<boolean>(true);

  const onMapChangeRef = useRef(onMapChange);
  useEffect(() => {
    onMapChangeRef.current = onMapChange;
  }, [onMapChange]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default center if none is provided (e.g. Center of France)
    const initialLat = centerCoords?.lat ?? 46.2276;
    const initialLon = centerCoords?.lon ?? 2.2137;
    const initialZoom = centerCoords ? 12 : 6;

    programmaticMoveRef.current = true;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false, // We'll add it to the top-right to avoid cluttering mobile UI
      attributionControl: true
    }).setView([initialLat, initialLon], initialZoom);

    // Leaflet interaction-based search listener
    let debounceTimer: any = null;
    map.on('moveend', () => {
      if (programmaticMoveRef.current) {
        programmaticMoveRef.current = false; // reset
        return;
      }

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const newCenter = map.getCenter();
        const bounds = map.getBounds();
        const northEast = bounds.getNorthEast();
        const distanceKm = newCenter.distanceTo(northEast) / 1000;
        
        // Limit search radius to max 30km (min 5km) to avoid spamming / large areas
        const newRadius = Math.min(30, Math.max(5, distanceKm));

        if (onMapChangeRef.current) {
          onMapChangeRef.current({ lat: newCenter.lat, lon: newCenter.lng }, newRadius);
        }
      }, 400); // 400ms debounce
    });

    // Add dark-themed CartoDB map tiles over HTTPS
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Add zoom control at top-right (glove-friendly size customized via CSS)
    L.control.zoom({ position: 'topright' }).addTo(map);

    mapRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (mapRef.current) {
        mapRef.current.off('moveend');
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
        circleOverlayRef.current = null;
      }
    };
  }, []);

  // Update map markers, overlays, and viewport bounds
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // Clear previous markers
    markersLayer.clearLayers();

    // Remove old circle overlay
    if (circleOverlayRef.current) {
      circleOverlayRef.current.remove();
      circleOverlayRef.current = null;
    }

    const bounds: L.LatLngBounds = L.latLngBounds([]);

    // 1. Draw Search Center and Search Radius Circle
    if (centerCoords) {
      const centerLatLng = L.latLng(centerCoords.lat, centerCoords.lon);
      bounds.extend(centerLatLng);

      // Draw search center marker (motorcycle location marker)
      const centerIcon = L.divIcon({
        className: 'center-location-icon',
        html: `
          <div class="gps-pulse-outer">
            <div class="gps-pulse-inner"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      L.marker(centerLatLng, { icon: centerIcon })
        .bindTooltip(t('map.searchLocation'), { permanent: false, direction: 'top' })
        .addTo(markersLayer);

      // Draw search radius circle overlay
      const circle = L.circle(centerLatLng, {
        radius: radiusKm * 1000, // in meters
        color: '#ff6b00', // KTM Burnt Orange border
        fillColor: '#ff6b00',
        fillOpacity: 0.05,
        weight: 1.5,
        dashArray: '5, 8'
      }).addTo(map);
      
      circleOverlayRef.current = circle;
    }

    // 2. Draw Station Markers
    stations.forEach((station, index) => {
      const latVal = parseFloat(station.latitude);
      const lonVal = parseFloat(station.longitude);

      if (isNaN(latVal) || isNaN(lonVal)) return;

      const stationLatLng = L.latLng(latVal, lonVal);
      bounds.extend(stationLatLng);

      const price = station[`${fuelType}_prix` as keyof FuelStation] as number | undefined;
      const ruptureType = station[`${fuelType}_rupture_type` as keyof FuelStation] as string | undefined;
      const isBestValue = index === 0 && !ruptureType && station.distance !== undefined;
      const isCheapest = index === 0 && !ruptureType && station.distance === undefined;

      // Determine marker color status
      let status: 'best-value' | 'cheapest' | 'rupture' | 'normal' = 'normal';
      if (ruptureType) {
        status = 'rupture';
      } else if (isBestValue) {
        status = 'best-value';
      } else if (isCheapest) {
        status = 'cheapest';
      }

      let accentColor = '#ff6b00'; // KTM Burnt Orange
      if (status === 'best-value' || status === 'cheapest') {
        accentColor = '#ffc700'; // Amber-Gold
      } else if (status === 'rupture') {
        accentColor = '#ff2a2a'; // Crimson Red
      }

      // Create Custom SVG Marker Icon
      const brand = getStationBrand(station.id, station.adresse, station.ville, station.brand);
      const initialLetter = brand.name ? brand.name.charAt(0) : 'G';

      const markerHtml = `
        <div class="custom-map-marker ${status}" style="--marker-color: ${accentColor}">
          <div class="marker-pin">
            <span class="marker-label">${ruptureType ? '🚫' : (price ? price.toFixed(2) : initialLetter)}</span>
          </div>
          <div class="marker-pulse"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'station-div-icon',
        html: markerHtml,
        iconSize: [40, 48],
        iconAnchor: [20, 48],
        popupAnchor: [0, -42]
      });

      // Build popup content programmatically to strictly prevent XSS
      const popupContainer = document.createElement('div');
      popupContainer.className = 'map-popup-container';

      // Brand Title
      const brandHeader = document.createElement('div');
      brandHeader.className = 'popup-brand-header';
      
      const brandName = document.createElement('h4');
      brandName.textContent = brand.name;
      brandHeader.appendChild(brandName);

      if (station.distance !== undefined) {
        const distBadge = document.createElement('span');
        distBadge.className = 'popup-dist-badge';
        distBadge.textContent = `${station.distance.toFixed(1)} km`;
        brandHeader.appendChild(distBadge);
      }
      popupContainer.appendChild(brandHeader);

      // Address
      const address = document.createElement('p');
      address.className = 'popup-address';
      address.textContent = `${station.adresse}, ${station.ville}`;
      popupContainer.appendChild(address);

      // Price Info or Rupture Status
      const infoRow = document.createElement('div');
      infoRow.className = 'popup-info-row';

      const priceBlock = document.createElement('div');
      priceBlock.className = 'popup-price-block';
      
      const priceLabel = document.createElement('span');
      priceLabel.className = 'popup-label';
      priceLabel.textContent = t('map.price', { type: fuelType.toUpperCase() });
      priceBlock.appendChild(priceLabel);

      const priceVal = document.createElement('span');
      if (ruptureType) {
        priceVal.className = 'popup-price rupture';
        priceVal.textContent = t('card.rupture');
      } else if (price) {
        priceVal.className = `popup-price ${status}`;
        priceVal.textContent = `${price.toFixed(3)} ${station.currencySymbol || '€'}`;
      } else {
        priceVal.className = 'popup-price';
        priceVal.textContent = 'N/A';
      }
      priceBlock.appendChild(priceVal);
      infoRow.appendChild(priceBlock);

      // Total Trip Cost Block
      if (station.total_cost !== undefined && !ruptureType) {
        const costBlock = document.createElement('div');
        costBlock.className = 'popup-cost-block';

        const costLabel = document.createElement('span');
        costLabel.className = 'popup-label';
        costLabel.textContent = t('map.estTotalCost');
        costBlock.appendChild(costLabel);

        const costVal = document.createElement('span');
        costVal.className = 'popup-cost';
        costVal.textContent = `🪙 ${station.total_cost.toFixed(2)} ${station.currencySymbol || '€'}`;
        costBlock.appendChild(costVal);
        infoRow.appendChild(costBlock);
      }
      popupContainer.appendChild(infoRow);

      // Navigate Button (Glove friendly size >= 56px height)
      const navButton = document.createElement('a');
      navButton.className = 'popup-nav-button';
      navButton.target = '_blank';
      navButton.rel = 'noopener noreferrer';
      navButton.textContent = t('map.navigate');
      
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latVal},${lonVal}`;
      navButton.setAttribute('href', mapsUrl);
      popupContainer.appendChild(navButton);

      L.marker(stationLatLng, { icon: customIcon })
        .bindPopup(popupContainer, {
          maxWidth: 280,
          minWidth: 240,
          className: 'custom-leaflet-popup'
        })
        .addTo(markersLayer);
    });

    // 3. Zoom / Fit Map Viewport
    const currentCenter = map.getCenter();
    const isMapInitiated = centerCoords && 
      Math.abs(currentCenter.lat - centerCoords.lat) < 0.0001 &&
      Math.abs(currentCenter.lng - centerCoords.lon) < 0.0001;

    if (bounds.isValid() && !isMapInitiated) {
      programmaticMoveRef.current = true;
      // Add padding to ensure markers are not cut off at screen edges
      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 15
      });
    }
  }, [stations, centerCoords, radiusKm, fuelType]);

  return (
    <div className="map-wrapper-outer">
      <div ref={mapContainerRef} className="station-map-container" />
    </div>
  );
}
