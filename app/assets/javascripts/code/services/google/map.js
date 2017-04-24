angular.module("google").factory("map", ["params", "$cookieStore", "$rootScope", "digester",
                                 "rectangles", "geocoder", '$location', "$timeout",
                                     function(params, $cookieStore, $rootScope, digester,
                                              rectangles, geocoder, $location, $timeout){
  var Map = function() {};
  Map.prototype = {
    init: function(element, options) {
      this.mapObj = new google.maps.Map(element, options);
      //this.mapObj.setOptions({ minZoom: 20 });
      this.mapObj.setZoom(20);
      var styles = [
    {
        "featureType": "all",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "weight": "2.00"
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "color": "#9c9c9c"
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.text",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "all",
        "stylers": [
            {
                "color": "#f2f2f2"
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#ffffff"
            }
        ]
    },
    {
        "featureType": "landscape.man_made",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#ffffff"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "all",
        "stylers": [
            {
                "saturation": -100
            },
            {
                "lightness": 45
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#eeeeee"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#7b7b7b"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "color": "#ffffff"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "simplified"
            }
        ]
    },
    {
        "featureType": "road.arterial",
        "elementType": "labels.icon",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "transit",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "all",
        "stylers": [
            {
                "color": "#46bcec"
            },
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#c8d7d4"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#070707"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "color": "#ffffff"
            }
        ]
    }
];
      this.mapObj.setOptions({styles : styles});
      this.markers = [];
      this.listen("idle", this.saveViewport);
      this.listen("visible_changed", function(){$rootScope.$digest();}, this.mapObj.getStreetView());
      this.listen("zoom_changed", _(this.onZoomChanged).bind(this));
      this.listen("maptypeid_changed", _(this.onMapTypeIdChanged).bind(this));
      this.listeners = [];
      rectangles.init(this.mapObj);
    },
    get: function(){
      return this.mapObj;
    },
    getMapCookie: function(name) {
      return $cookieStore.get(name);
    },
    viewport: function(){
      var bounds = this.mapObj.getBounds();
      if(bounds) {
        return {
          west: bounds.getSouthWest().lng(),
          east: bounds.getNorthEast().lng(),
          south: bounds.getSouthWest().lat(),
          north: bounds.getNorthEast().lat()
        };
      } else {
        return {};
      }
    },
    goToAddress: function(address) {
      if(!address){
        return;
      }
      var self = this;
      geocoder.get(address, function(results, status) {
        if(status == google.maps.GeocoderStatus.OK) {
          self.mapObj.setZoom(20);
          self.mapObj.fitBounds(results[0].geometry.viewport);
        }
      });
    },
    saveViewport: function(){
      var zoom = this.getZoom();
      var lat = this.mapObj.getCenter().lat();
      var lng = this.mapObj.getCenter().lng();
      var mapType = this.mapObj.getMapTypeId();
      $cookieStore.put("vp_zoom", zoom);
      $cookieStore.put("vp_lat", lat);
      $cookieStore.put("vp_lng", lng);
      $cookieStore.put("vp_mapType", mapType);
      params.update({map: {zoom: zoom, lat: lat, lng: lng, mapType: mapType}});
      digester();
    },
    appendViewport: function(obj) {
      var northeast;
      var point = {
        lat: 50.09024,
        lng: -90.712891
      };

      if(!obj || !(obj.north && obj.east && obj.south && obj.west)) {
        return;
      }

      if (obj.north == 200 && obj.east == 200) {
        // If we refresh with an indoor session selected - go to US
        northeast = new google.maps.LatLng(point.lat, point.lng);
      } else {
        northeast = new google.maps.LatLng(obj.north, obj.east);
      }

      var southwest = new google.maps.LatLng(obj.south, obj.west);
      var bounds = new google.maps.LatLngBounds(southwest, northeast);
      var self = this;
      self.mapObj.setZoom(20);
      self.mapObj.fitBounds(bounds);
      $timeout(function() {
        self.mapObj.setZoom(20);
        self.mapObj.fitBounds(bounds);
      });
    },
    onZoomChanged: function() {
      // if zoom is too high for terrain map, switch to hybrid map (but remember last used type)
      var zoom = this.getZoom();
      var newMapTypeId;

      if(zoom >= 15 && this.mapObj.getMapTypeId() == google.maps.MapTypeId.TERRAIN) {
        newMapTypeId = google.maps.MapTypeId.HYBRID;
        this.previousMapTypeId = google.maps.MapTypeId.TERRAIN;
      } else if(zoom < 15 && this.previousMapTypeId){
        //if zoom is low enough for terrain map, switch to it if it was used before zooming in
        newMapTypeId = this.previousMapTypeId;
        this.previousMapTypeId = null;
      }
      //Zooming and MapType has been handled by other events
      if(newMapTypeId) {
        this.mapObj.setMapTypeId(newMapTypeId);
        $cookieStore.put("vp_mapType", newMapTypeId);
      }
    },
    onMapTypeIdChanged: function() {
      var mapType = this.mapObj.getMapTypeId();
      params.update({map: {mapType: mapType}});
      digester();
    },
    listen: function(name, callback, diffmap) {
      return google.maps.event.addListener(diffmap || this.mapObj, name, _(callback).bind(this));
    },
    register: function(name, callback, diffmap) {
      this.listeners.push(this.listen(name, callback, diffmap));
    },
    unregisterAll: function(){
      _(this.listeners).each(function(listener){
         google.maps.event.removeListener(listener);
      });
    },
    setZoom: function(zoom) {
      return this.mapObj.setZoom(zoom);
    },
    getZoom: function(zoom) {
      return this.mapObj.getZoom();
    },
    streetViewVisible: function(zoom) {
      return this.mapObj.getStreetView().getVisible();
    },
    drawRectangles: function(data, thresholds, clickCallback){
      var self = this;
      rectangles.draw(data, thresholds);
      _(rectangles.get()).each(function(rectangle){
        self.listen('click', function(){
          clickCallback(rectangle.data);
        }, rectangle);
      });
    },
    drawMarker: function(latLngObj, optionInput, existingMarker, level){
      if(!latLngObj) {
        return;
      }
      var latlng = new google.maps.LatLng(latLngObj.latitude, latLngObj.longitude);
      var icon = "/assets/location_marker0.png";

      if (level) {
        icon = "/assets/location_marker" + level + ".png";
      }

      var newMarker;
      if(existingMarker){
        newMarker = existingMarker.setPosition(latlng);
      } else {
        var options = {
          position: latlng,
          zIndex: 300000,
          icon: icon,
          flat: true,
          session: latLngObj
        };
        _(options).extend(optionInput || {});
        newMarker = new google.maps.Marker(options);
        newMarker.addListener('click', function() {
          $rootScope.$broadcast('markerSelected', {session_id: latLngObj.id});
        });
        newMarker.setMap(this.get());
        this.markers.push(newMarker);
      }
      return newMarker;
    },

    removeMarker: function(marker) {
      if(!marker){
        return;
      }
      marker.setMap(null);
    },

    removeAllMarkers: function() {
      var markers = this.markers;
      _(markers).each(function(marker) {
        marker.setMap(null);
      });
    },

    drawLine: function(data){
      var points = _(data).map(function(latLngObj){
        return new google.maps.LatLng(latLngObj.latitude, latLngObj.longitude);
      });
      var lineOptions = {
        map: this.get(),
        path: points,
        strokeColor: "#007bf2",
        geodesic: false
      };

      var line = new google.maps.Polyline(lineOptions);
      return line;
    }
  };

  return new Map();
}]);
