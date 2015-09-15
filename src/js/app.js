(function() {
  'use strict'

  //top level variables
  var initialLocation = 'minneapolis',
      initialZoom = 11;

  var map, geocoder, viewModel, infoWindow;

  //google map related functions
  function initialize() {
    //console.log('initialize');
    var mapDiv = document.getElementById('map-canvas');
    var mapOptions = {
      zoom: initialZoom,
      center: {lat: 44.963324, lng: -93.26832 }, //initial hard code for Minneapolis
      //disableDefaultUI: false
      panControl: false,
      zoomControl: true,
      zoomControlOptions: {
        style: google.maps.ZoomControlStyle.DEFAULT,
        position: google.maps.ControlPosition.RIGHT_TOP
      },
      mapTypeControl: true,
      mapTypeControlOptions: {
        mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE,
                     google.maps.MapTypeId.TERRAIN, google.maps.MapTypeId.HYBRID],
        style: google.maps.MapTypeControlStyle.DEFAULT,
        position: google.maps.ControlPosition.TOP_RIGHT
      },
      scaleControl: false,
      streetViewControl: false,
      overviewMapControl: false
    };

    geocoder = new google.maps.Geocoder();
    infoWindow = new google.maps.InfoWindow({
      content: ''
    });
    map = new google.maps.Map(mapDiv, mapOptions);
  }

  //page is fully loaded including graphics
  google.maps.event.addDomListener(window, 'load', initialize);

  function geocodeAddress(address) {
    //geocoder determines the lat/lng of address selected
    geocoder.geocode({'address': address}, function(results, status) {
      if (status === google.maps.GeocoderStatus.OK) {
        map.setCenter(results[0].geometry.location);
        map.setZoom(initialZoom);
      } else {
        alert('Geocode was not successful for the following reason: ' + status);
      }
    });
  }

  window.addEventListener("load", function(e){
      //console.log("window.load, map:", map); //to show map is available at window.onload
      viewModel = new GroupsViewModel();
      ko.applyBindings(viewModel);
  });

  //end google map related functions

  //jQuery ready...
  $(function() {
    console.log('jquery ready, map:', map); //map is not ready here.
    //testing here for panel slides

    //get jquery objects for useful dom elements
    var $panelSearch = $('#container-data'),
        $panelImages = $('#container-images'),
        $tabSearch = $($panelSearch.find('.tab-search')[0]), //$('.tab-search')[0],
        $tabImages = $($panelImages.find('.tab-images')[0]), //$('.tab-images')[0],
        $iconSearch = $($panelSearch.find('.icon-circle-left')[0]), //$('.icon-circle-left')[0],
        $iconImages = $($panelImages.find('.icon-circle-down')[0]); //$('.icon-circle-down')[0];

    var sClassIconSearch = $iconSearch.attr('class'),
        sClassIconImages = $iconImages.attr('class');


    $tabSearch.click(function(e){
      var toggleSearch, toggleIcon, extendRetract = '';

      //panel search may have a class of extend, retract or neither
      extendRetract += ($panelSearch.hasClass('extend')) ? ' extend' : '';
      extendRetract += ($panelSearch.hasClass('retract')) ? ' retract' : '';

      //first time in, panelSearch may not have a class
      //if (!$panelSearch.attr('class') || $panelSearch.hasClass('open')) {
      if ($panelSearch.hasClass('open')) {
        toggleSearch = "close"+extendRetract;
        toggleIcon = sClassIconSearch+" rotate";
      } else {
        toggleSearch = "open"+extendRetract;
        toggleIcon = sClassIconSearch+" unrotate";
      }

      //$.addClass, removeClass doesn't work for svg
      $panelSearch.attr('class', toggleSearch);
      $iconSearch.attr('class', toggleIcon);
    });

    $tabImages.click(function(e){
      var toggleImages, toggleIcon, toAddSearch, toRemoveSearch;

      if (!$panelImages.attr('class') || $panelImages.hasClass('open')) {
        toggleImages = "close";
        toggleIcon = sClassIconImages+" rotate";
        toAddSearch = "extend";
        toRemoveSearch = "retract";
      } else {
        toggleImages = "open";
        toggleIcon = sClassIconImages+" unrotate";
        toAddSearch = "retract";
        toRemoveSearch = "extend";
      }

      $panelSearch.removeClass(toRemoveSearch).addClass(toAddSearch);

      //$.addClass, removeClass doesn't work for svg
      $panelImages.attr('class', toggleImages);
      $iconImages.attr('class', toggleIcon);
    });


  });
  //end jQuery ready...


  function ImgInfo(data) {
    //console.log('ImgInfo:', data);
    this.src = 'https://farm'+data.farm+'.staticflickr.com/'+data.server+'/'+data.id+'_'+data.secret+'.jpg';
    this.title = data.title;
  }

  function Group(data) {
    //console.log('Group, data:', data);
    //name and city do not need to be observable
    this.name = data.name; //ko.observable(data.name);
    this.city = data.city; //ko.observable(data.city);
    //this.lat = ko.observable(data.lat);
    //this.lon = ko.observable(data.lon);

    this.description = data.description; //ko.observable(data.description);

    this.marker; //instantiated with addMarker

    this.location = {
      lat: data.lat,
      lng: data.lon
    }

    //a meetup group may not have group_photo. if not, show img not available
    //this.urlThumb = (data.group_photo) ? ko.observable(data.group_photo.thumb_link) : "img/not_available.svg";
    this.urlThumb = (data.group_photo) ? data.group_photo.thumb_link : "img/not_available.svg";

    //group may not have photos
    //this.photos = (data.photos) ? ko.observableArray(data.photos) : ko.observableArray([]);
    this.photos = (data.photos) ? data.photos : [];

    this.strContent = '<img src='+this.urlThumb+' title='+this.name+' alt='+this.name+'>';
    this.strContent += '<h4>'+this.name+'</h4>';
    this.strContent += '<div>'+this.description+'</div>';

    //make addMarker a prototype method of Group
    this.addMarker();
  }

  //can infoWindow be encapsulated in addMarker?
  Group.prototype.addMarker = function() {
    //console.log('Group.prototype.addMarker, this:', this);
    //create content string for info window associated with this marker
/*
    var strContent = '<img src='+this.urlThumb+' title='+this.name+' alt='+this.name+'>';
    strContent += '<h4>'+this.name+'</h4>';
    strContent += '<div>'+this.description+'</div>';
*/
    this.marker = new google.maps.Marker({
      position: this.location,
      title: this.name,
      map: map
    });

    var strContent = this.strContent;
    this.marker.addListener('click', function() {
      //map.setCenter(this.location);
      map.panTo(this.position);
      infoWindow.setContent(strContent);
      infoWindow.open(map, this);
    });
  }

  Group.prototype.triggerMarker = function() {
    console.log('triggerMarker, this:', this);
    //map.setCenter(this.location);
    map.panTo(this.location);
    infoWindow.setContent(this.strContent);
    infoWindow.open(map, this.marker);
  };

  Group.prototype.removeMarker = function() {
    this.marker.setMap(null);
  }


  function GroupsViewModel() {
    var self = this;

    //$.ajax doesn't provide a way of capturing errors when requesting jsonp. set up a simple mechanism for giving user information if load fails
    var requestTimedout = setTimeout(function(){
        console.log("failed to get meetup resources");
    },8000);

    var getMeetups = function() {
      $.ajax({

        //all groups given a location string, e.g. 'minneapolis'
        url: "https://api.meetup.com/find/groups?key=617467255c2e7b9d7a1c7d1646a20&photo-host=public&location='"+self.location()+"'&page=20&sign=true",

        dataType: "jsonp", // Tell jQuery we're expecting JSONP
        success: function(response) {
            console.log('getMeetups success, self.location(), response.data:', self.location(), response.data);

            //console.log('getMeetups before mapping, self.groups().length:', self.groups().length);
            //do cleanup here before mapping a new set of groups
            if (self.groups().length > 0) {
              //remove markers, de-reference group objects so they may be garbage collected
              while (self.groups().length > 0) {
                self.groups().shift().removeMarker();
              }
            }
            var mappedGroups = $.map(response.data, function(item) { return new Group(item) });
            self.groups(mappedGroups);
            //console.log('getMeetups after mapping, self.groups().length:', self.groups().length);

            self.toggleShowGroups();

            //geocodeAddress(self.location());
            geocoder.geocode({'address': self.location()}, function(results, status) {
              if (status === google.maps.GeocoderStatus.OK) {
                map.setCenter(results[0].geometry.location);
                map.setZoom(initialZoom);
                getImages();
              } else {
                alert('Geocode was not successful for the following reason: ' + status);
              }
            });

            //getImages();
            clearTimeout(requestTimedout);
        },
        error: function(response) {
            console.log('error:', response);
        }
      }).done(function(response){
          //console.log('done, response:', response);
      }).fail(function(response){
          console.log('fail, response:', response);
      }).always(function(response){
          //console.log('always, response:', response);
          //console.log('always, self.groups.length:', self.groups().length);

      });
    }

    var getImages = function() {
      $.ajax({
        //url: "https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=705d79e848f4e7dad9f9f119378b199f&lat="+map.getCenter().lat()+"&lon="+map.getCenter().lng()+"&per_page=20&tags="+self.location()+"&format=json&nojsoncallback=1",
        url: "https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=705d79e848f4e7dad9f9f119378b199f&lat="+map.getCenter().lat()+"&lon="+map.getCenter().lng()+"&per_page=20&format=json&nojsoncallback=1",

        success: function(response) {
          //console.log('map.getCenter():', map.getCenter());
          console.log('getImages success, self.location(), response:', self.location(), response);

          if (response.stat === 'ok') {
            //var images = [],
            var links = [],
                i = 0;

            var $slides = $('#slides');

            //do cleanup here before mapping a new set of groups
            //self.images = [];
            if (self.images().length > 0) {
              //remove markers, de-reference group objects so they may be garbage collected
              while (self.images().length > 0) {
                self.images().shift();
              }
            }

            var mappedImages = $.map(response.photos.photo, function(item) {
              return new ImgInfo(item);
            });
            self.images(mappedImages);

/*
            response.photos.photo.forEach(function(item) {
              links.push('https://farm'+item.farm+'.staticflickr.com/'+item.server+'/'+item.id+'_'+item.secret+'.jpg');
              self.images.push(new Image());
              self.images[i].src = links[i];
              self.images[i].title = item.title;
              $('#slides').append(self.images[i]);
              ++i;
            });
*/
            //TODO: if no photo found, indicate this

            //console.log('images:',self.images);
            //console.log('images:',self.images());
          }

          clearTimeout(requestTimedout);
        },
        error: function(response) {
          console.log('error:', response);
        }
      }).done(function(response){
        //console.log('done, response:', response);
      }).fail(function(response){
        console.log('fail, response:', response);
      }).always(function(response){
        //console.log('always, response:', response);
      });
    }

    self.location = ko.observable(initialLocation);
    self.oldLocation = initialLocation;
    self.groups = ko.observableArray([]);
    self.images = ko.observableArray([]);

    self.showGroups = ko.observable(false);
    self.toggleShowGroups = function() {
      self.showGroups(!self.showGroups());
    };

    self.removeMarkers = function(){

    };
/*
    self.triggerMarker = function() {
      console.log('triggerMarker, this:', this);
    };

*/
    self.goIsEnabled = ko.observable(false);
    self.evalGoEnabled = function() {
      console.log('self.location():', self.location());
      self.goIsEnabled(self.location() !== self.oldLocation);

      //return true to allow default action (keypress changes input value)
      return true;
    };

    self.goLocation = function() {
      self.oldLocation = self.location();
      //console.log('goLocation, self.oldLocation:', self.oldLocation);
      self.evalGoEnabled();
      self.toggleShowGroups();
      getMeetups();
    }

    getMeetups(); //get initial data

  } //end GroupsViewModel

  //ko.applyBindings(new GroupsViewModel());


})();



/*
//page is fully loaded including graphics
// .load in jquery deprecated
$( window ).load(function() {
  // Run code
  console.log('jquery checks window fully loaded, map:', map);
});
*/
