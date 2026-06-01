
export function formatLastUpdated(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (3600 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 3600 * 1000));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + 
           date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return dateStr;
  }
}

export interface ServiceInfo {
  icon: string;
  label: string;
}

export function parseServiceTag(service: string): ServiceInfo {
  const s = service.toLowerCase();
  if (s.includes('gonflage')) return { icon: '🛞', label: 'Air' };
  if (s.includes('lavage automatique') || s.includes('lavage manuel') || s.includes('haute pression')) return { icon: '🧼', label: 'Wash' };
  if (s.includes('gaz domestique') || s.includes('vente de gaz')) return { icon: '💨', label: 'Gas' };
  if (s.includes('boutique')) return { icon: '🏪', label: 'Shop' };
  if (s.includes('restauration') || s.includes('snack') || s.includes('emporter')) return { icon: '🍔', label: 'Food' };
  if (s.includes('relais colis')) return { icon: '📦', label: 'Parcel' };
  if (s.includes('wifi')) return { icon: '🛜', label: 'Wifi' };
  if (s.includes('toilette') || s.includes('wc')) return { icon: '🚻', label: 'WC' };
  if (s.includes('douche')) return { icon: '🚿', label: 'Shower' };
  if (s.includes('réparation') || s.includes('entretien') || s.includes('reparation')) return { icon: '🛠️', label: 'Repair' };
  if (s.includes('automate cb') || s.includes('automate 24')) return { icon: '💳', label: '24/7 Pay' };
  if (s.includes('location')) return { icon: '🚗', label: 'Rental' };
  
  // Clean fallback label
  let cleanLabel = service.trim();
  if (cleanLabel.length > 18) {
    cleanLabel = cleanLabel.substring(0, 15) + '...';
  }
  return { icon: '🔹', label: cleanLabel };
}

export interface BrandInfo {
  name: string;
  color: string;
  textColor: string;
  border?: string;
  domain?: string;
  logoKey?: string;
}

export const unknownBrand: BrandInfo = {
  name: 'Indépendant', color: 'rgba(255,255,255,0.08)', textColor: 'rgba(255,255,255,0.7)', logoKey: undefined
};

export const brandsList: BrandInfo[] = [
  { name: 'TotalEnergies', color: 'linear-gradient(135deg, #ff0055, #ffaa00, #00bbff)', textColor: '#fff', domain: 'totalenergies.com', logoKey: 'totalenergies' },
  { name: 'Esso', color: '#e1001a', textColor: '#fff', domain: 'esso.fr', logoKey: 'esso' },
  { name: 'BP', color: '#00853f', textColor: '#fff', domain: 'bp.com', logoKey: 'bp' },
  { name: 'Shell', color: '#ffd500', textColor: '#000', domain: 'shell.fr', logoKey: 'shell' },
  { name: 'Avia', color: '#e30613', textColor: '#fff', domain: 'avia.fr', logoKey: 'avia' },
  { name: 'Intermarché', color: '#ca0913', textColor: '#fff', domain: 'intermarche.com', logoKey: 'intermarche' },
  { name: 'E.Leclerc', color: '#0066b2', textColor: '#fff', domain: 'leclerc.fr', logoKey: 'e.leclerc' },
  { name: 'Carrefour', color: '#003893', textColor: '#fff', domain: 'carrefour.fr', logoKey: 'carrefour' },
  { name: 'Système U', color: '#004C99', textColor: '#fff', domain: 'systeme-u.fr', logoKey: 'systeme_u' },
  { name: 'Auchan', color: '#e30613', textColor: '#fff', domain: 'auchan.fr', logoKey: 'auchan' },
  { name: 'Eni', color: '#fccb00', textColor: '#000', domain: 'eni.fr', logoKey: 'eni' }
];

// Keyword patterns mapped to brandsList indices for resolution
const brandKeywords: Array<{ patterns: string[]; index: number }> = [
  { patterns: ['total', 'totalenergies'], index: 0 },
  { patterns: ['esso', 'exxon'], index: 1 },
  { patterns: ['bp ', 'bp-'], index: 2 },
  { patterns: ['shell'], index: 3 },
  { patterns: ['avia'], index: 4 },
  { patterns: ['intermarche', 'intermarché'], index: 5 },
  { patterns: ['leclerc', 'e.leclerc'], index: 6 },
  { patterns: ['carrefour'], index: 7 },
  { patterns: ['systeme u', 'système u', 'super u', 'hyper u', 'u express'], index: 8 },
  { patterns: ['auchan'], index: 9 },
  { patterns: ['eni'], index: 10 },
];

export function getStationBrand(_id: number, adresse?: string, ville?: string, apiBrand?: string): BrandInfo {
  // 1. Primary: use real brand from OSM/API if available
  if (apiBrand) {
    const brandLower = apiBrand.toLowerCase();
    for (const entry of brandKeywords) {
      if (entry.patterns.some(p => brandLower.includes(p))) {
        return brandsList[entry.index];
      }
    }
    // Known brand from OSM but not in our visual mapping — show the real name with neutral styling
    return { name: apiBrand, color: 'rgba(255,255,255,0.12)', textColor: '#fff', logoKey: undefined };
  }

  // 2. Fallback: check address/city text for brand keywords
  const text = `${adresse || ''} ${ville || ''}`.toLowerCase();
  for (const entry of brandKeywords) {
    if (entry.patterns.some(p => text.includes(p))) {
      return brandsList[entry.index];
    }
  }

  // 3. Unknown brand
  return unknownBrand;
}
