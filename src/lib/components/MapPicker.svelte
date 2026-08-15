<script lang="ts">
  import 'leaflet/dist/leaflet.css';
  import L from 'leaflet';
  import icon from 'leaflet/dist/images/marker-icon.png';
  import icon2x from 'leaflet/dist/images/marker-icon-2x.png';
  import iconShadow from 'leaflet/dist/images/marker-shadow.png';
  import { t } from '../i18n';
  import type { ExpenseLocation } from '../types';

  // Vite bundlers break Leaflet's default marker icon lookup; point it at the
  // bundled asset URLs explicitly.
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({ iconUrl: icon, iconRetinaUrl: icon2x, shadowUrl: iconShadow });

  let { location = null, onChange }: { location?: ExpenseLocation | null; onChange: (loc: ExpenseLocation | null) => void } = $props();

  const CROATIA_CENTER: [number, number] = [45.1, 15.2];

  let mapEl: HTMLDivElement;
  let map: L.Map;
  let marker: L.Marker | null = null;
  let locating = $state(false);
  let error = $state('');

  function setMarker(lat: number, lng: number) {
    if (marker) marker.setLatLng([lat, lng]);
    else marker = L.marker([lat, lng]).addTo(map);
    onChange({ lat, lng, label: location?.label });
  }

  $effect(() => {
    map = L.map(mapEl).setView(
      location ? [location.lat, location.lng] : CROATIA_CENTER,
      location ? 15 : 8,
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    if (location) marker = L.marker([location.lat, location.lng]).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => setMarker(e.latlng.lat, e.latlng.lng));

    return () => map.remove();
  });

  function useCurrentLocation() {
    error = '';
    if (!navigator.geolocation) {
      error = $t('mapPicker.geoUnavailable');
      return;
    }
    locating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 16);
        setMarker(latitude, longitude);
        locating = false;
      },
      (err) => {
        error = err.message;
        locating = false;
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function clearLocation() {
    if (marker) {
      marker.remove();
      marker = null;
    }
    onChange(null);
  }
</script>

<div class="stack">
  <div class="row">
    <button type="button" onclick={useCurrentLocation} disabled={locating}>
      {locating ? $t('mapPicker.locating') : $t('mapPicker.useCurrentLocation')}
    </button>
    {#if location}
      <button type="button" onclick={clearLocation}>{$t('mapPicker.clearLocation')}</button>
    {/if}
  </div>
  {#if error}<p class="muted" style="color: var(--danger)">{error}</p>{/if}
  <div bind:this={mapEl} style="height: 220px; border-radius: var(--radius); overflow: hidden"></div>
  {#if location}
    <p class="muted">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</p>
  {/if}
</div>
