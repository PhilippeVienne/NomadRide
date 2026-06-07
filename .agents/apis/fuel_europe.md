# European Fuel Prices APIs

Documentation of external fuel price APIs utilized by NomadRide to fetch real-time fuel data across European countries.

---

## 🇩🇪 Germany: TankerKönig (MTS-K)

- **Source**: Federal Cartel Office (MTS-K) via TankerKönig.
- **URL**: `https://creativecommons.tankerkoenig.de/json/list.php`
- **Geographical Coverage**: Germany.
- **Type**: REST API (Free API Key required).
- **Update Frequency**: Real-time.
- **Supported Fuels**: diesel, e5, e10.
- **Query Parameters**:
  - `lat`: Latitude
  - `lng`: Longitude
  - `rad`: Radius in km (max 25 km)
  - `sort`: `dist`
  - `type`: `all`
  - `apikey`: API key

---

## 🇪🇸 Spain: Geoportal Gasolineras (MITYC)

- **Source**: Ministerio para la Transición Ecológica y el Reto Demográfico.
- **URL**: `https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburants/PreciosCarburantes/EstacionesTerrestres/`
- **Geographical Coverage**: Spain.
- **Type**: Public REST API (No auth required).
- **Update Frequency**: Real-time.
- **Supported Fuels**: Diesel (Gasoleo A), SP95 (Gasolina 95 E5), SP98 (Gasolina 98 E5), E10 (Gasolina 95 E10).
- **Note**: The API returns a large JSON containing all Spanish stations. To optimize performance, the backend downloads and caches this file (2h TTL) and executes spatial queries locally.

---

## 🇦🇹 Austria: E-Control Spritpreisrechner

- **Source**: E-Control.
- **URL**: `https://api.e-control.at/sprit/1.0/search/gas-stations/by-address`
- **Geographical Coverage**: Austria.
- **Type**: Public REST API (No auth required, aggressive rate limit).
- **Update Frequency**: Real-time.
- **Supported Fuels**: Diesel (`DIE`), Super 95 (`SUP`).
- **Query Parameters**:
  - `latitude`: Latitude
  - `longitude`: Longitude
  - `fuelType`: `DIE` | `SUP`
  - `includeClosed`: `false`

---

## 🇲🇨 Monaco

Monaco stations are integrated directly within the French national API (postal code 98000). A search in Monaco overlaps with France and uses the French API.

---

## 🇱🇮 Liechtenstein

Liechtenstein is covered by spatial boundary overflow from Germany's TankerKönig and Austria's E-Control.
