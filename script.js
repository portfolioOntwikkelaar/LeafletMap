// script.js — moderne, nette implementatie

// helper: fetch JSON coordinates
async function loadCoords(url = '/coords.json') {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Kon coords.json niet laden: ' + res.status);
  const data = await res.json();
  // convert to array of L.LatLng objects with alt = z
  return data.map(function(pt){
    // expect [lat, lng, z]
    return L.latLng(pt[0], pt[1], pt[2]);
  });
}

function computeMinMax(latlngs){
  let min = Infinity, max = -Infinity;
  latlngs.forEach(p => {
    const v = (typeof p.alt === 'number') ? p.alt : (p.altitude ?? 0);
    if (v < min) min = v;
    if (v > max) max = v;
  });
  if (!isFinite(min)) min = 0;
  if (!isFinite(max)) max = 1;
  return {min, max};
}

function drawLegend(palette, min, max){
  const canvas = document.getElementById('legendCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // create gradient top-to-bottom
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  // palette is an object like {0.0: 'green', 0.5: 'yellow', 1.0: 'red'}
  // sort keys
  const keys = Object.keys(palette).map(Number).sort((a,b)=>a-b);
  keys.forEach(k => {
    grad.addColorStop(1 - k, palette[k]); // invert so top=high
  });

  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,w,h);

  // labels
  document.getElementById('legendMax').textContent = max;
  document.getElementById('legendMid').textContent = ((min+max)/2).toFixed(2);
  document.getElementById('legendMin').textContent = min;
}

async function init() {
  try {
    const latlngs = await loadCoords('/coords.json');

    // Base tile
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    });

    // Create map
    const map = L.map('map', {
      center: latlngs.length ? latlngs[0] : [0,0],
      zoom: 4,
      layers: [osm],
      scrollWheelZoom: true
    });

    // Controls
    L.control.scale({imperial:false}).addTo(map);

    // Build palette and compute min/max
    const palette = {
      0.0: 'green',
      0.5: 'yellow',
      1.0: 'red'
    };

    const {min, max} = computeMinMax(latlngs);

    // Create hotline layer (plugin expects latLngs with .alt property)
    const hotlineLayer = L.hotline(latlngs, {
      min: min,
      max: max,
      palette: palette,
      weight: 12,
      outlineColor: '#07112a',
      outlineWidth: 2
    });

    hotlineLayer.addTo(map);

    // Fit bounds
    const bounds = hotlineLayer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.15));
    }

    // Popup + hover tooltip
    hotlineLayer.bindPopup('Route — voorbeeld').openPopup();

    hotlineLayer.on('mouseover', function(e){
      hotlineLayer.openPopup(e.latlng);
    });
    hotlineLayer.on('mouseout', function(){
      hotlineLayer.closePopup();
    });

    // Info panel
    document.getElementById('routeInfo').innerHTML = `
      <strong>Punten:</strong> ${latlngs.length} <br>
      <strong>Min waarde:</strong> ${min} <br>
      <strong>Max waarde:</strong> ${max}
    `;

    // draw legend
    drawLegend(palette, min, max);

    // UI interactions
    document.getElementById('fitBoundsBtn').addEventListener('click', function(){
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.15));
    });

    document.getElementById('downloadBtn').addEventListener('click', function(){
      fetch('/coords.json')
        .then(r => r.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'coords.json';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        });
    });

    document.getElementById('toggleTiles').addEventListener('change', function(e){
      if (e.target.checked) map.addLayer(osm); else map.removeLayer(osm);
    });

    document.getElementById('toggleHotline').addEventListener('change', function(e){
      if (e.target.checked) map.addLayer(hotlineLayer); else map.removeLayer(hotlineLayer);
    });

    // small pop-up marker for each point (click to show z)
    latlngs.forEach((pt, idx) => {
      const marker = L.circleMarker([pt.lat, pt.lng], {
        radius: 4, fillOpacity: 0.9, color:'#ffffff', weight:1
      }).addTo(map);
      marker.bindTooltip(`#${idx+1} — waarde: ${pt.alt}`, {direction:'top', offset:[0,-8]});
    });

  } catch (err) {
    console.error(err);
    document.getElementById('routeInfo').textContent = 'Fout bij laden data: ' + err.message;
  }
}

init();
