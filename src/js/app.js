(function() {
  'use strict'

  // top level variables
  var initialLocation = 'Minneapolis', //'Minneapolis','Zr',  'bxqfp',
      initialZoom = 11;

  var map, geocoder, requestTimedout, viewModel, infoWindow, meetupFilter, panelSearch, panelImages;

  // use extender to prevent input of unwanted characters
  ko.extenders.filterInput = function(target, option) {
    // create a writable computed observable to intercept writes to our observable
    var result = ko.pureComputed({
        read: target,  // always return the original observables value
        write: function(newValue) {
            var current = target(),
                // regex to eliminate any non-alphabetic chars
                valueToWrite = newValue.replace(/[~!@#$%^&*()_+=`?><.:;|•¥¥€£'"\-\{\}\[\]\/\\^0-9]/, "");

            // only write if it changed
            if (valueToWrite !== current) {
                target(valueToWrite);
            }
             else {
                // if the value is the same, but a different value was written, force a notification for the current field
                if (newValue !== current) {
                    target.notifySubscribers(valueToWrite);
                }
            }
        }
    }).extend({ notify: 'always' });

    // initialize with current value to make sure it is filtered appropriately
    result(target());

    // return the new computed observable
    return result;
  }

  // return offsets in pixels to shift center of map based on panel size
  function getOffsets() {
    var oX = (panelSearch.getBoundingClientRect().left >= 0) ? -panelSearch.clientWidth/2 : 0,
        oY = (panelImages.getBoundingClientRect().height > 0) ? panelImages.clientHeight/2 : 0;

    return {offsetX:oX, offsetY:oY};
  }

  function getWidthInfoWin() {
    var oX = (panelSearch.getBoundingClientRect().left >= 0) ? panelSearch.clientWidth : 0;
    var w = Math.max(document.documentElement.clientWidth, window.innerWidth);

    return w-oX-110; //subtract another 110 for a buffer so infoWindow doesn't overlap search tab
  }

  // using jQuery Deferred so that results may be processed in a single function: viewModel.goLocation
  function getMapCenter(strLoc) {
    var geoPromise = $.Deferred();
    geocoder.geocode({'address': strLoc}, function(results, status) {
      if (status === google.maps.GeocoderStatus.OK) {
        geoPromise.resolve(results[0].geometry.location);
      } else {
        geoPromise.reject(status);
        //geoPromise.reject(Error(status));
      }
    });
    return geoPromise;
  }

  function initialize() {
    geocoder = new google.maps.Geocoder();

    var mapDiv = document.getElementById('map-canvas');
    var mapOptions = {
      zoom: initialZoom,
      disableDefaultUI: true
    };

    infoWindow = new google.maps.InfoWindow({
      content: ''
    });
    google.maps.event.addListener(infoWindow,'closeclick',function(){
      viewModel.meetupSelected(null);
    });
    map = new google.maps.Map(mapDiv, mapOptions);

    viewModel = new ViewModel();
    ko.applyBindings(viewModel);

    viewModel.goLocation();
  }

  // page is fully loaded including graphics
  google.maps.event.addDomListener(window, 'load', initialize);

  // end google map related functions

  // $.ajax doesn't provide a way of capturing errors when requesting jsonp. set up a simple mechanism for giving user information if load fails
  function doSetTimeout() {
    requestTimedout = setTimeout(function(){
        console.log("failed to get meetup resources, request timed out");
        alert("failed to get meetup resources, request timed out");
    },8000);
  }

  // jQuery ready... jQuery used for managing panel animation
  $(function() {
    // get jquery objects for useful dom elements
    var $panelSearch = $('#container-data'),
        $panelImages = $('#container-images'),
        $tabSearch = $($panelSearch.find('.tab-search')[0]),
        $tabImages = $($panelImages.find('.tab-images')[0]),
        $iconSearch = $($panelSearch.find('.icon-circle-left')[0]),
        $iconImages = $($panelImages.find('.icon-circle-down')[0]);

    var sClassIconSearch = $iconSearch.attr('class'),
        sClassIconImages = $iconImages.attr('class');

    panelSearch = $panelSearch[0];
    panelImages = $panelImages[0];

    $tabSearch.click(function(e){
      var toggleSearch, toggleIcon, extendRetract = '';

      // panel search may have a class of extend, retract or neither
      extendRetract += ($panelSearch.hasClass('extend')) ? ' extend' : '';
      extendRetract += ($panelSearch.hasClass('retract')) ? ' retract' : '';

      // first time in, panelSearch may not have a class
      if (!$panelSearch.attr('class') || $panelSearch.hasClass('slideInLeft')) {
        toggleSearch = "slideOutLeft"+extendRetract;
        toggleIcon = sClassIconSearch+" rotate";
      } else {
        toggleSearch = "slideInLeft"+extendRetract;
        toggleIcon = sClassIconSearch+" unrotate";
      }

      // $.addClass, removeClass doesn't work for svg. set attribute
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

      $panelImages.attr('class', toggleImages);
      $iconImages.attr('class', toggleIcon);
    });

  });
  // end jQuery ready...

  function ViewModel() {
    var self = this;

    self.location = ko.observable(initialLocation).extend({filterInput: 0});
    self.oldLocation = ''; //initialLocation;

    self.groups = ko.observableArray([]);
    self.showGroups = ko.observable(false);
    self.images = ko.observableArray([]);

    self.query = ko.observable('');
    self.meetupSelected = ko.observable();

    self.mapUnfound = ko.observable(false);
    self.mapMessageVisible = ko.observable(false);
    self.mapMessage = ko.observable('');
    self.imagesMessage = ko.observable('');
    self.meetupsMessage = ko.observable('');

    self.iconAlert = '<svg class="icon icon-alert"><use xlink:href="#icon-alert"></use></svg>';

    self.emptyImages = function() {
      var arrImages = self.images();
      if (arrImages.length > 0) {
        while (arrImages.length > 0) {
          arrImages.shift();
        }
        self.images.valueHasMutated();
      }
    };

    self.getImages = function() {
      $.ajax({
        url: "https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=705d79e848f4e7dad9f9f119378b199f&text="+self.location()+"&sort=relevance&per_page=20&format=json&nojsoncallback=1",
        dataType: "json",

        success: function(response) {
          self.imagesMessage('');
          if (response.stat === 'ok') {
            // do cleanup here before mapping a new set of images
            self.emptyImages();

            var mappedImages = $.map(response.photos.photo, function(item) {
              return new ImgInfo(item);
            });
            self.images(mappedImages);
          }

          if (self.images().length === 0) {
            self.imagesMessage('No images were found for ' + self.location() + '.' + self.iconAlert);
          }

        },
        error: function(response) {
          self.imagesMessage('Unable to load images for ' + self.location() + ', error: ' + response + '.' + self.iconAlert);
        }
      });
    };

    self.emptyGroups = function() {
      var arrGroups = self.groups();
      if (arrGroups.length > 0) {
        while (arrGroups.length > 0) {
          arrGroups.shift().removeMarker();
        }
        self.groups.valueHasMutated();
      }
    };

    self.getMeetups = function() {
      $.ajax({
        // all groups given a location string, e.g. 'Minneapolis'
        url: "https://api.meetup.com/find/groups?key=617467255c2e7b9d7a1c7d1646a20&photo-host=public&location='"+self.location()+"'&page=20&sign=true",

        dataType: "jsonp", // tell jQuery we're expecting JSONP
        success: function(response) {
          //clear message and groups list
          self.meetupsMessage('');
          self.emptyGroups();

          // here check to see if lat/lng match within an arbitrary bounds of what's on the map, if not, it means that there was a successful response but likely a cached lookup. show meetup not found message so there is no discrepancy between map and meetup list
          var latLng = map.getCenter();

          var mapLatLng = {
            lat: Number(latLng.lat()),
            lng:  Number(latLng.lng())
          }

          if (response.data.length) {
            var meetupLatLng = {
              lat:  Number(response.data[0].lat),
              lng:  Number(response.data[0].lon)
            }

            if (Math.abs(mapLatLng.lat - meetupLatLng.lat) < 7 && Math.abs(mapLatLng.lng - meetupLatLng.lng) < 7) {
              //map is ok
              var mappedGroups = $.map(response.data, function(item, ix) { return new Group(item, ix) });
              self.groups(mappedGroups);
            } else {
              //map doesn't match meetup location
              self.meetupsMessage('No meetups were found for ' + self.location() + '.' + self.iconAlert)
            }

          }

          if (self.groups().length === 0) {
            self.meetupsMessage('No meetups were found for ' + self.location() + '.' + self.iconAlert);
          }

          self.toggleShowGroups();

          clearTimeout(requestTimedout);
        },
        error: function(response) {
            self.meetupsMessage('Unable to load Meetups for ' + self.location() + ', error: ' + response.status + '.' + self.iconAlert);
        }
      });
    }

    self.toggleShowGroups = function() {
      self.showGroups(!self.showGroups());
    };

    self.evalGoLocation = function(data, e) {
      // when return is keyed into input-where, trigger goLocation
      if (e.keyCode == 13) self.goLocation();
    }

    self.goLocation = function() {
      // change location only if it has changed and is not empty
      var selfLoc = self.location();
      if (selfLoc !== '' && self.oldLocation !== selfLoc) {
        self.oldLocation = selfLoc;
        self.showGroups(false);

        // be sure to get geo coords before we get data
        getMapCenter(self.location()).then(function(result) {
          self.mapMessageVisible(false);

          map.setCenter(result);
          map.setZoom(initialZoom);
          var o = getOffsets();
          map.panBy(o.offsetX, o.offsetY);

          // prepare ui for change in location
          self.query('');

          // get the meetups and images. result is asynchronous
          doSetTimeout();
          self.mapMessage('');
          self.mapUnfound(false);
          self.getMeetups();
          self.getImages();

        }, function(err) {
            // no result for map search
            // here we need to clear meetups and images lists, markers and update messages
            self.emptyGroups();
            self.emptyImages();
            self.mapMessage('Unable to find map for ' + self.location() + '. ' + err + self.iconAlert);
            self.mapMessageVisible(true);
            self.mapUnfound(true);

            // if map cannot be found, meetups and images aren't requested. show these messages also
            self.meetupsMessage('No search can be done for meetups at ' + self.location() + '.' + self.iconAlert);
            self.imagesMessage('No search can be done for images at ' + self.location() + '.' + self.iconAlert);
        });
      }
    }

    // Filter function for meetup list search
    self.search = ko.computed(function() {
      meetupFilter = ko.utils.arrayFilter(self.groups(), function(group){
        // there may be a case where getMeetups is a success but
        if (group.name) {
          // markers will not be available immediately because they have delayed instantiation. use setVisible only when it exists
          if (group.name.toLowerCase().indexOf(self.query().toLowerCase()) >= 0) {
              if (typeof group.marker !== 'undefined') group.marker.setVisible(true);
              return group;
          } else {
            if (typeof group.marker !== 'undefined') group.marker.setVisible(false);
            // close infoWindow if open and ensure no meetup is selected
            infoWindow.close();
            self.meetupSelected(null);
          }
        }
      });
      return meetupFilter;
    });

  } //end ViewModel

  // model for image data
  function ImgInfo(data) {
    this.src = 'https://farm'+data.farm+'.staticflickr.com/'+data.server+'/'+data.id+'_'+data.secret+'.jpg';
    this.title = data.title;
  }

  // model for meetup data
  function Group(data, ix) {
    var prefix = 'm',
    timeout = ix*100;

    this.name = data.name;
    this.city = data.city;
    this.id = prefix + timeout; //assign id which is also a timeout value for adding markers

    this.description = data.description;

    this.marker; //instantiated with addMarker

    this.location = {
      lat: data.lat,
      lng: data.lon
    }

    // a meetup group may not have group_photo. if not, show img not available
    this.urlThumb = (data.group_photo) ? data.group_photo.thumb_link : "img/not_available.svg";

    // group may not have photos
    this.photos = (data.photos) ? data.photos : [];

    // create content string for info window associated with this marker
    this.strContent = '<img src='+this.urlThumb+' title='+this.name+' alt='+this.name+'>';
    this.strContent += '<h4>'+this.name+'</h4>';
    this.strContent += '<div>'+this.description+'</div>';

    this.addMarker(prefix, timeout);
  }

  Group.prototype.addMarker = function(prefix, timeout) {
    var group = this;
    window.setTimeout(function() {
      group.marker = new google.maps.Marker({
        position: group.location,
        title: group.name,
        map: map,
        mid: prefix+timeout, // assign an id to marker to coordinate with list selection hightlight
        animation: google.maps.Animation.DROP
      });

      group.marker.addListener('click', function() {
        group.triggerMarker();
      });
    }, timeout);

  }

  Group.prototype.stopMarkerAnimation = function() {
    if (this.marker.getAnimation() !== null) {
      this.marker.setAnimation(null);
    }
  }

  // manage what happens when a marker is triggered, whether by clicking the marker or by clicking the li with group name
  // 'this' will always be available. item and e will only be available when the li is clicked.
  Group.prototype.triggerMarker = function(item, e) {
    viewModel.meetupSelected(this);

    // e will be undefined when marker is clicked. may be used to target the li of the meetup list
    if (!e) document.getElementById(this.id).scrollIntoView();

    // do the bounce
    if (this.marker.getAnimation() !== null) {
      this.marker.setAnimation(null);
    } else {
      this.marker.setAnimation(google.maps.Animation.BOUNCE);
      window.setTimeout(this.stopMarkerAnimation.bind(this), 2150);
    }

    // position map within ui
    map.panTo(this.location);
    var offsets = getOffsets();
    map.panBy(offsets.offsetX, offsets.offsetY);

    // set appropriate width of infoWin, set content and open it
    infoWindow.setOptions({maxWidth:getWidthInfoWin()});
    infoWindow.setContent(this.strContent);
    infoWindow.open(map, this.marker);
  }

  Group.prototype.removeMarker = function() {
    this.marker.setMap(null);
  }

})();
