import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from './NearbyFarmers.module.css';

const API_BASE    = (import.meta.env.VITE_API_URL || 'https://agro-connect-fyp.onrender.com').replace(/\/$/, '');
const GALLI_TOKEN = import.meta.env.VITE_GALLI_TOKEN || '';

// Galli Maps style URL — this is the correct tile endpoint
const GALLI_STYLE = `https://map-init.gallimap.com/styles/light/style.json?accessToken=${GALLI_TOKEN}`;

// Load MapLibre GL (Galli's underlying engine) + CSS
let mlPromise = null;
function loadMapLibre() {
  if (mlPromise) return mlPromise;
  mlPromise = new Promise((resolve, reject) => {
    if (window.maplibregl) { resolve(); return; }

    const link = document.createElement('link');
    link.rel   = 'stylesheet';
    link.href  = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css';
    document.head.appendChild(link);

    const s    = document.createElement('script');
    s.src      = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js';
    s.onload   = resolve;
    s.onerror  = reject;
    document.head.appendChild(s);
  });
  return mlPromise;
}

function makeMarkerEl(color) {
  const el = document.createElement('div');
  el.style.cssText = 'width:26px;height:34px;cursor:pointer';
  el.innerHTML = `<svg viewBox="0 0 26 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 0C5.82 0 0 5.82 0 13c0 8.67 13 21 13 21S26 21.67 26 13C26 5.82 20.18 0 13 0z" fill="${color}"/>
    <circle cx="13" cy="13" r="5.5" fill="white"/>
  </svg>`;
  return el;
}

export default function NearbyFarmers() {
  const mapDivRef      = useRef(null);
  const mapRef         = useRef(null);
  const farmMarkersRef = useRef([]);

  const [farmers,    setFarmers]    = useState([]);
  const [userCoords, setUserCoords] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [locError,   setLocError]   = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [radius,     setRadius]     = useState(25);
  const [mapReady,   setMapReady]   = useState(false);
  const [detailFarmer, setDetailFarmer] = useState(null);

  // 1. Get user location
  useEffect(() => {
    const fallback = { lat: 27.7172, lng: 85.3240 };
    if (!navigator.geolocation) {
      setUserCoords(fallback);
      setLocError('Geolocation not supported — showing Kathmandu.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()  => { setUserCoords(fallback); setLocError('Location access denied — showing Kathmandu.'); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // 2. Fetch nearby farmers
  useEffect(() => {
    if (!userCoords) return;
    setLoading(true);
    fetch(`${API_BASE}/api/location/nearby-farmers?lat=${userCoords.lat}&lng=${userCoords.lng}&maxDistance=${radius * 1000}`)
      .then(r => r.json())
      .then(d => { if (d.success) setFarmers(d.farmers); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userCoords, radius]);

  // 3. Init map once coords ready
  useEffect(() => {
    if (!userCoords || !mapDivRef.current || mapRef.current) return;

    loadMapLibre().then(() => {
      const ml = window.maplibregl;

      const map = new ml.Map({
        container:  mapDivRef.current,
        style:      GALLI_STYLE,
        center:     [userCoords.lng, userCoords.lat],
        zoom:       12,
        attributionControl: false,
      });

      map.addControl(new ml.NavigationControl(), 'top-left');
      map.addControl(new ml.AttributionControl({ compact: true }), 'bottom-right');

      map.on('load', () => {
        mapRef.current = map;
        setMapReady(true);

        // User location marker
        new ml.Marker({ element: makeMarkerEl('#22c55e') })
          .setLngLat([userCoords.lng, userCoords.lat])
          .setPopup(new ml.Popup({ offset: 28 }).setHTML('<b>📍 You are here</b>'))
          .addTo(map);
      });

      map.on('error', e => console.error('Map error:', e));
    }).catch(console.error);
  }, [userCoords]);

  // 4. Add/update farmer markers when map ready or farmers change
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const ml  = window.maplibregl;
    const map = mapRef.current;

    farmMarkersRef.current.forEach(m => m.remove());
    farmMarkersRef.current = [];

    farmers.forEach(farmer => {
      const popupNode = document.createElement('div');
      popupNode.style.cssText = 'font-family:system-ui,sans-serif;padding:4px;min-width:160px';
      popupNode.innerHTML = `
        <div style="font-weight:700;font-size:14px;color:#1f2937">${farmer.farmName}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:3px">📍 ${farmer.location}</div>
        <div style="font-size:12px;color:#22c55e;font-weight:600;margin-top:3px">${farmer.distanceKm} km away</div>
        <button id="view-${farmer._id}" style="margin-top:10px;width:100%;padding:7px 0;background:#22c55e;color:white;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;">
          View Farmer Details
        </button>
      `;
      // attach click after popup opens
      const popup = new ml.Popup({ offset: 28, maxWidth: '220px' }).setDOMContent(popupNode);
      popup.on('open', () => {
        const btn = document.getElementById(`view-${farmer._id}`);
        if (btn) btn.onclick = () => setDetailFarmer(farmer);
      });

      const marker = new ml.Marker({ element: makeMarkerEl('#f59e0b') })
        .setLngLat([farmer.lng, farmer.lat])
        .setPopup(popup)
        .addTo(map);
      farmMarkersRef.current.push(marker);
    });
  }, [mapReady, farmers]);

  function flyTo(farmer) {
    setSelectedId(farmer._id);
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [farmer.lng, farmer.lat], zoom: 15 });
      const idx = farmers.findIndex(f => f._id === farmer._id);
      if (idx !== -1 && farmMarkersRef.current[idx]) {
        farmMarkersRef.current[idx].togglePopup();
      }
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>

        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Farmers Near You</h2>
            <p className={styles.subtitle}>Fresh produce from local farms in your area</p>
          </div>
          <div className={styles.controls}>
            <span className={styles.radiusLabel}>Radius</span>
            {[10, 25, 50].map(r => (
              <button key={r}
                className={`${styles.radiusBtn} ${radius === r ? styles.radiusBtnActive : ''}`}
                onClick={() => setRadius(r)}
              >{r} km</button>
            ))}
          </div>
        </div>

        {locError && <div className={styles.locWarning}>📍 {locError}</div>}

        <div className={styles.body}>

          {/* MAP */}
          <div className={styles.mapWrap}>
            <div ref={mapDivRef} className={styles.map} />
            {(loading && !mapReady) && (
              <div className={styles.mapOverlay}>
                <div className={styles.spinner} />
                <span>Loading map…</span>
              </div>
            )}
          </div>

          {/* FARMER LIST */}
          <div className={styles.list}>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} className={styles.skeletonCard} />)
              : farmers.length === 0
                ? (
                  <div className={styles.empty}>
                    <span className={styles.emptyIcon}>🌾</span>
                    <p>No farmers found within {radius} km.</p>
                    <button className={styles.expandBtn} onClick={() => setRadius(50)}>
                      Expand to 50 km
                    </button>
                  </div>
                )
                : farmers.map(farmer => (
                  <div key={farmer._id}
                    className={`${styles.farmerCard} ${selectedId === farmer._id ? styles.farmerCardActive : ''}`}
                    onClick={() => flyTo(farmer)}
                  >
                    <div className={styles.farmerAvatar}>
                      {farmer.profilePicture
                        ? <img src={farmer.profilePicture} alt={farmer.farmName} />
                        : <span>{farmer.farmName[0]}</span>
                      }
                    </div>
                    <div className={styles.farmerInfo}>
                      <div className={styles.farmerName}>{farmer.farmName}</div>
                      <div className={styles.farmerLocation}>📍 {farmer.location}</div>
                      {farmer.description && (
                        <div className={styles.farmerDesc}>
                          {farmer.description.slice(0, 60)}{farmer.description.length > 60 ? '…' : ''}
                        </div>
                      )}
                    </div>
                    <div className={styles.farmerMeta}>
                      <span className={styles.distanceBadge}>{farmer.distanceKm} km</span>
                      <button className={styles.viewBtn} onClick={e => { e.stopPropagation(); setDetailFarmer(farmer); }}>
                        View
                      </button>
                      <Link to="/marketplace" className={styles.shopBtn} onClick={e => e.stopPropagation()}>
                        Shop
                      </Link>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      </div>

      {/* FARMER DETAIL MODAL */}
      {detailFarmer && (
        <div className={styles.modalOverlay} onClick={() => setDetailFarmer(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setDetailFarmer(null)}>✕</button>

            {/* Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalAvatar}>
                {detailFarmer.profilePicture
                  ? <img src={detailFarmer.profilePicture} alt={detailFarmer.farmName} />
                  : <span>{detailFarmer.farmName[0]}</span>
                }
              </div>
              <div>
                <h3 className={styles.modalFarmName}>{detailFarmer.farmName}</h3>
                <p className={styles.modalOwner}>{detailFarmer.firstName} {detailFarmer.lastName}</p>
                <span className={styles.distanceBadge}>{detailFarmer.distanceKm} km away</span>
              </div>
            </div>

            {/* Info grid */}
            <div className={styles.modalGrid}>
              <div className={styles.modalItem}>
                <span className={styles.modalIcon}>📍</span>
                <div>
                  <div className={styles.modalLabel}>Location</div>
                  <div className={styles.modalValue}>{detailFarmer.location}</div>
                </div>
              </div>
              {detailFarmer.phoneNumber && (
                <div className={styles.modalItem}>
                  <span className={styles.modalIcon}>📞</span>
                  <div>
                    <div className={styles.modalLabel}>Phone</div>
                    <div className={styles.modalValue}>{detailFarmer.phoneNumber}</div>
                  </div>
                </div>
              )}
              {detailFarmer.yearsOfExperience && (
                <div className={styles.modalItem}>
                  <span className={styles.modalIcon}>🌱</span>
                  <div>
                    <div className={styles.modalLabel}>Experience</div>
                    <div className={styles.modalValue}>{detailFarmer.yearsOfExperience} years</div>
                  </div>
                </div>
              )}
              {detailFarmer.organicCertification && (
                <div className={styles.modalItem}>
                  <span className={styles.modalIcon}>✅</span>
                  <div>
                    <div className={styles.modalLabel}>Certification</div>
                    <div className={styles.modalValue}>Organic Certified</div>
                  </div>
                </div>
              )}
            </div>

            {detailFarmer.description && (
              <div className={styles.modalDesc}>
                <div className={styles.modalLabel}>About</div>
                <p>{detailFarmer.description}</p>
              </div>
            )}

            <div className={styles.modalActions}>
              <Link to="/marketplace" className={styles.modalShopBtn} onClick={() => setDetailFarmer(null)}>
                🛒 Shop Products
              </Link>
              <button className={styles.modalCancelBtn} onClick={() => setDetailFarmer(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
