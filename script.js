function readJSONData(file, callback){
  var rawFile = new XMLHttpRequest();
  rawFile.overrideMimeType("application/json");
  rawFile.open("GET", file, true);
  rawFile.onreadystatechange = function (){
      if(rawFile.readyState === 4 && rawFile.status == "200"){
          callback(rawFile.responseText.toLowerCase());
      }
  }
  rawFile.send(null);
}

function initFunction() {
  readJSONData("/coords.json", function(text){
      var data = JSON.parse(text);
      var tiles = L.tileLayer('//{s}.tile.osm.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
      });
      var map = L.map('map', {
          layers: [tiles],
          scrollWheelZoom: true,
          dragging: true,
          tap: true
      });
      var hotlineLayer = L.hotline(data, {
          min: 1,
          max: 10,
          pallette: {
              0.0: 'green',
              0.5: 'yellow',
              1.0: 'red'
          },
          weight: 12,
          outlineColor: '#000000',
          outlineWidth: 1
      });
      var bounds = hotlineLayer.getBounds();
      map.fitBounds(bounds);
      hotlineLayer.bindPopup('Route from US to Canada(From Iron Country Forest to Huuluarnaarjuk Channel)!!').addTo(map);
  });
}

initFunction();