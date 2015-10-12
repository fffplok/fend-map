(function() {
  'use strict'

  //top level variables
  var initialLocation = 'minneapolis', //'minneapolis','Zr',  'bxqfp',
      initialZoom = 11;

  var map, geocoder, modelLocation, groupsViewModel, imagesViewModel, infoWindow, meetupFilter;

  //both meetups and images require the properties kept here
  var ModelLocation = function() {
    this.strLoc = ko.observable(initialLocation).extend({filterInput: 0});
    this.mapCenter = ko.observable();
  };

  var $debug,
      debug = false;

  //tracks always event of ajax calls
  function evalResults(msg) {
    if (debug) notify(msg);
  }

  //post status info to user
  function notify(msg) {
    //for now, just append messages
    var html = $debug.html();
    $debug.html(html + msg);
  }

  // return offsets in pixels to shift center of map based on panel size
  function getOffsets() {
    var containerData = document.getElementById('container-data'),
        containerImages = document.getElementById('container-images'),
        oX = (containerData.getBoundingClientRect().left >= 0) ? -containerData.clientWidth/2 : 0,
        oY = (containerImages.getBoundingClientRect().height > 0) ? containerImages.clientHeight/2 : 0;

    return {offsetX:oX, offsetY:oY};
  }

  function getWidthInfoWin() {
    var containerData = document.getElementById('container-data');
    var oX = (containerData.getBoundingClientRect().left >= 0) ? containerData.clientWidth : 0;

    var w = Math.max(document.documentElement.clientWidth, window.innerWidth); // + offsets.offsetX;
    //console.log('getWidthInfoWin, w, oX:', w, oX);
    return w-oX-110; //subtract another 110 for a buffer so infoWindow doesn't overlap search tab
  }

  //using jQuery Deferred
  function getMapCenter(strLoc) {
    var geoPromise = $.Deferred();
    geocoder.geocode({'address': strLoc}, function(results, status) {
      if (status === google.maps.GeocoderStatus.OK) {
        geoPromise.resolve(results[0].geometry.location);
      } else {
        geoPromise.reject(status);
        //reject(Error(status));
      }
    });
    return geoPromise;
  }

  function initialize() {
    console.log('initialize');
    geocoder = new google.maps.Geocoder();

    modelLocation = new ModelLocation();

    //create a promise that gets a geocode and here place the then code
    getMapCenter(initialLocation).then(function(result) {
      modelLocation.mapCenter(result);
      console.log('got result:', result);
      //console.log('modelLocation:', modelLocation);
      console.log('modelLocation.strLoc():', modelLocation.strLoc());
      console.log('modelLocation.mapCenter():', modelLocation.mapCenter());
      var mapDiv = document.getElementById('map-canvas');
      var mapOptions = {
        zoom: initialZoom,
        center:  result, //{lat: 44.963324, lng: -93.26832 }, //initial hard code for Minneapolis
        disableDefaultUI: true
      };

      infoWindow = new google.maps.InfoWindow({
        content: ''
      });
      google.maps.event.addListener(infoWindow,'closeclick',function(){
        groupsViewModel.meetupSelected(null);
        //console.log('closed infoWindow');
      });
      map = new google.maps.Map(mapDiv, mapOptions);

      //10.08 removed window load event listener and put code here
      groupsViewModel = new GroupsViewModel();
      ko.applyBindings(groupsViewModel, document.getElementById('container-data'));

      imagesViewModel = new ImagesViewModel();
      ko.applyBindings(imagesViewModel, document.getElementById('container-images')); //need second param a dom node to separate bindings

      //getMeetups(initialLocation);
      getMeetups();
      getImages();

    }, function(err) {
      console.log('got err:', err);
    });
  }

  //page is fully loaded including graphics
  google.maps.event.addDomListener(window, 'load', initialize);

  //end google map related functions


  //$.ajax doesn't provide a way of capturing errors when requesting jsonp. set up a simple mechanism for giving user information if load fails
  var requestTimedout = setTimeout(function(){
      console.log("failed to get meetup resources");
  },8000);

  var getMeetups = function() {
    $.ajax({

      //all groups given a location string, e.g. 'minneapolis'
      url: "https://api.meetup.com/find/groups?key=617467255c2e7b9d7a1c7d1646a20&photo-host=public&location='"+modelLocation.strLoc()+"'&page=20&sign=true",
      //url: "https://api.meetup.com/find/groups?key=617467255c2e7b9d7a1c7d1646a20&photo-host=public&location=!@#$$&page=20&sign=true",

      dataType: "jsonp", // Tell jQuery we're expecting JSONP
      success: function(response) {
          //console.log('getMeetups success, strLoc, response.data:', strLoc, response.data);
          groupsViewModel.meetupsSuccess(response.data);

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
        console.log('getMeetups always, response:', response);
        //console.log('always, self.groups.length:', self.groups().length);
        evalResults('<br>getMeetups always response:'+response);
    });
  }

  var getImages = function() {
    //TODO: 10.6 - first determine whether map.getCenter() returns an object. if so then then use map.getCenter().lat(), etc.
    $.ajax({
      //url: "https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=705d79e848f4e7dad9f9f119378b199f&lat="+map.getCenter().lat()+"&lon="+map.getCenter().lng()+"&per_page=20&format=json&nojsoncallback=1",
      url: "https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=705d79e848f4e7dad9f9f119378b199f&lat="+modelLocation.mapCenter().J+"&lon="+modelLocation.mapCenter().M+"&per_page=20&format=json&nojsoncallback=1",

      success: function(response) {
        //console.log('map.getCenter():', map.getCenter());
        console.log('getImages success, response:', response);

        imagesViewModel.imagesSuccess(response);
/*
        if (response.stat === 'ok') {
          //var images = [],
          //var links = [],
          //    i = 0;

          var $slides = $('#slides');

          //do cleanup here before mapping a new set of groups
          var arrImages = self.images();
          if (arrImages.length > 0) {
            while (arrImages.length > 0) {
              arrImages.shift();
            }
            self.images.valueHasMutated();
          }

          var mappedImages = $.map(response.photos.photo, function(item) {
            return new ImgInfo(item);
          });
          self.images(mappedImages);

          self.toggleShowImages(); //really doesn't have much effect
          //TODO: if no photo found, indicate this

          //console.log('images:',self.images);
          //console.log('images:',self.images());
        }
*/
        //clearTimeout(requestTimedout);
      },
      error: function(response) {
        console.log('error:', response);
      }
    }).done(function(response){
      console.log('done, response:', response);
    }).fail(function(response){
      console.log('fail, response:', response);
    }).always(function(response){
      console.log('always, response:', response);
      evalResults('image response:', response);
    });
  };


  //jQuery ready...
  $(function() {
    console.log('jquery ready, map:', map); //map is not ready here.
    //testing here for panel slides

    //get jquery objects for useful dom elements
    var $panelSearch = $('#container-data'),
        $panelImages = $('#container-images'),
        $tabSearch = $($panelSearch.find('.tab-search')[0]),
        $tabImages = $($panelImages.find('.tab-images')[0]),
        $iconSearch = $($panelSearch.find('.icon-circle-left')[0]),
        $iconImages = $($panelImages.find('.icon-circle-down')[0]);

    var sClassIconSearch = $iconSearch.attr('class'),
        sClassIconImages = $iconImages.attr('class');

    if (debug) {
      $debug = $('#debug');
      $debug.html('debug here.');
    };


    $tabSearch.click(function(e){
      var toggleSearch, toggleIcon, extendRetract = '';

      if (debug) {
        var wPanel = '#container-data width: ' + $panelSearch.width(),
            wContainerSearch = '.container-search width: ' + $panelSearch.find('.container-search').width(),
            wContainerFlex = '.container-flex width: ' + $panelSearch.find('.container-flex').width(),
            inputFlex = 'text input flex: ' + $($panelSearch.find('input')[0]).css('flex');

        $debug.html(wPanel + '<br>' + wContainerSearch + '<br>' + wContainerFlex + '<br>' + inputFlex);
      }

      //panel search may have a class of extend, retract or neither
      extendRetract += ($panelSearch.hasClass('extend')) ? ' extend' : '';
      extendRetract += ($panelSearch.hasClass('retract')) ? ' retract' : '';

      //first time in, panelSearch may not have a class
      if (!$panelSearch.attr('class') || $panelSearch.hasClass('slideInLeft')) {
        toggleSearch = "slideOutLeft"+extendRetract;
        toggleIcon = sClassIconSearch+" rotate";
      } else {
        toggleSearch = "slideInLeft"+extendRetract;
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


  function ImagesViewModel() {
    var self = this;

    self.images = ko.observableArray([]);

    self.imagesSuccess = function(response) {
      console.log('ImagesViewModel.imagesSuccess, response:', response);
      if (response.stat === 'ok') {

        //do cleanup here before mapping a new set of images
        var arrImages = self.images();
        if (arrImages.length > 0) {
          while (arrImages.length > 0) {
            arrImages.shift();
          }
          self.images.valueHasMutated();
        }

        var mappedImages = $.map(response.photos.photo, function(item) {
          return new ImgInfo(item);
        });
        self.images(mappedImages);

        self.toggleShowImages(); //really doesn't have much effect
        //TODO: if no photo found, indicate this
        //console.log('images:',self.images);
        //console.log('images:',self.images());
      }
    }

    self.showImages = ko.observable(false);
    self.toggleShowImages = function() {
      self.showImages(!self.showImages());
    };

  } //end ImagesViewModel

  function GroupsViewModel() {
    var self = this;

    //use extender to make location input alphabetic
    ko.extenders.filterInput = function(target, option) {
      //create a writable computed observable to intercept writes to our observable
      var result = ko.pureComputed({
          read: target,  //always return the original observables value
          write: function(newValue) {
              var current = target(),
                  //regex to eliminate any non-alphabetic chars
                  valueToWrite = newValue.replace(/[~!@#$%^&*()_+=`?><.,:;|•¥¥€£'"\-\{\}\[\]\/\\^0-9]/, "");

              //console.log('local var current, valueToWrite:', current, valueToWrite);

              //only write if it changed
              if (valueToWrite !== current) {
                  target(valueToWrite);
              }
               else {
                  //if the value is the same, but a different value was written, force a notification for the current field
                  if (newValue !== current) {
                      target.notifySubscribers(valueToWrite);
                  }
              }
          }
      }).extend({ notify: 'always' });

      //initialize with current value to make sure it is filtered appropriately
      result(target());

      //return the new computed observable
      return result;
    }

    self.meetupsSuccess = function(data) {
      //do cleanup here before mapping a new set of groups
      //manipulate underlying array without touching the observable to prevent ui updates every time groups is updated. use valueHasMutated to trigger update.
      var arrGroups = self.groups();
      if (arrGroups.length > 0) {
        while (arrGroups.length > 0) {
          arrGroups.shift().removeMarker();
        }
        self.groups.valueHasMutated();
      }

      var mappedGroups = $.map(data, function(item, ix) { return new Group(item, ix) });
      self.groups(mappedGroups);
      //console.log('getMeetups after mapping, self.groups().length:', self.groups().length);

      self.toggleShowGroups();

      //geoCode();
      //create a promise that uses geocoder to obtain location to center map
      getMapCenter(self.location()).then(function(result) {
          map.setCenter(result);
          map.setZoom(initialZoom);
          var o = getOffsets();
          map.panBy(o.offsetX, o.offsetY);
          //getImages(); //original. get images only when geocoder successful
      }, function(err) {
          //alert('Geocode was not successful for the following reason: ' + err);
          console.log('Geocode was not successful for the following reason: ' + err);
          if (debug) notify('Geocode was not successful for the following reason: ' + err);
      });
    };

    //self.location = ko.observable(initialLocation); //ORIG
    //self.location = ko.observable(initialLocation).extend({filterInput: 0}); //before using modelLocation
    self.location = modelLocation.strLoc;
    self.oldLocation = initialLocation;
    self.groups = ko.observableArray([]);
    //self.images = ko.observableArray([]);

    self.showGroups = ko.observable(false);
    self.toggleShowGroups = function() {
      console.log('toggleShowGroups');
      self.showGroups(!self.showGroups());
    };

    self.evalGoLocation = function(data, e) {
      //when return is keyed into input-where, trigger goLocation
      //console.log('data, e.keyCode:', data, e.keyCode);
      if (e.keyCode == 13) self.goLocation();
    }

    self.goLocation = function() {
      console.log('goLocation, self.oldLocation, self.location():', self.oldLocation, self.location());
      //change location only if it has changed and is not empty
      var selfLoc = self.location();
      if (selfLoc !== '' && self.oldLocation !== selfLoc) {
        self.oldLocation = selfLoc;
        self.toggleShowGroups();
        //not real happy about calling the other viewModel from here
        // for that matter, the goLocation could be more abstract and be put in its own view model
        imagesViewModel.toggleShowImages();

        //be sure to get geo coords before we get images (TO DO: see how we can refactor getMeetups)
        getMapCenter(self.location()).then(function(result) {
          console.log('goLocation, getMapCenter result:', result);
          modelLocation.mapCenter(result);
          getMeetups();
          getImages();
        }, function(err) {
            //alert('goLocation, Geocode was not successful for the following reason: ' + err);
            console.log('goLocation, Geocode was not successful for the following reason: ' + err);
            if (debug) notify('goLocation, Geocode was not successful for the following reason: ' + err);
        });

        //getMeetups();
        //getImages();
      }
    }

    self.query = ko.observable('');

    self.meetupSelected = ko.observable();

    // Filter function for meetup list search
    self.search = ko.computed(function() {
      //console.log('search:');
      meetupFilter = ko.utils.arrayFilter(self.groups(), function(group){
        //note: markers will not be available immediately because they have delayed instantiation. use setVisible only when it exists
        if (group.name.toLowerCase().indexOf(self.query().toLowerCase()) >= 0) {
            //console.log('visible group.marker:', group.marker);
            if (typeof group.marker !== 'undefined') group.marker.setVisible(true);
            return group;
        } else {
          //console.log('invisible group.marker:', group.marker);
          if (typeof group.marker !== 'undefined') group.marker.setVisible(false);
          //close infoWindow if open and ensure no meetup is selected
          infoWindow.close();
          self.meetupSelected(null);
        }

      });
      return meetupFilter;
    });

  } //end GroupsViewModel

  function ImgInfo(data) {
    //console.log('ImgInfo:', data);
    this.src = 'https://farm'+data.farm+'.staticflickr.com/'+data.server+'/'+data.id+'_'+data.secret+'.jpg';
    this.title = data.title;
  }

  function Group(data, ix) {
    var prefix = 'm',
    timeout = ix*200;

    this.name = data.name;
    this.city = data.city;
    this.id = prefix + timeout; //assign id which is also a timeout value for adding markers
    //this.infoDisplayed = false;

    this.description = data.description; //ko.observable(data.description);

    this.marker; //instantiated with addMarker

    this.location = {
      lat: data.lat,
      lng: data.lon
    }

    //a meetup group may not have group_photo. if not, show img not available
    this.urlThumb = (data.group_photo) ? data.group_photo.thumb_link : "img/not_available.svg";

    //group may not have photos
    this.photos = (data.photos) ? data.photos : [];

    this.strContent = '<img src='+this.urlThumb+' title='+this.name+' alt='+this.name+'>';
    this.strContent += '<h4>'+this.name+'</h4>';
    this.strContent += '<div>'+this.description+'</div>';

    //make addMarker a prototype method of Group
    this.addMarker(prefix, timeout);
  }

  //can infoWindow be encapsulated in addMarker?
  Group.prototype.addMarker = function(prefix, timeout) {
    //console.log('Group.prototype.addMarker, this:', this);
    //create content string for info window associated with this marker
    var group = this;
    window.setTimeout(function() {
      group.marker = new google.maps.Marker({
        position: group.location,
        title: group.name,
        map: map,
        mid: prefix+timeout, //assign an id to marker to coordinate with list selection hightlight
        animation: google.maps.Animation.DROP
      });

      var strContent = group.strContent;
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

  // NEED COMMENTS: I found that this will always be available and item and e will only be available when the li is clicked.
  Group.prototype.triggerMarker = function(item, e) {
    // console.log('triggerMarker, this:', this);
    // console.log('triggerMarker, item:', item);
     console.log('triggerMarker, e:', e);
    //console.log('triggerMarker, this.marker.mid:', this.marker.mid);
    //e will be undefined when marker is clicked. may be used to target the li of the meetup list

    groupsViewModel.meetupSelected(this);
    if (!e) document.getElementById(this.id).scrollIntoView();

    if (this.marker.getAnimation() !== null) {
      this.marker.setAnimation(null);
    } else {
      this.marker.setAnimation(google.maps.Animation.BOUNCE);
      window.setTimeout(this.stopMarkerAnimation.bind(this), 2150);
    }

    map.panTo(this.location);
    var offsets = getOffsets();
    map.panBy(offsets.offsetX, offsets.offsetY);

    // set appropriate width of infoWin here
    infoWindow.setOptions({maxWidth:getWidthInfoWin()});

    infoWindow.setContent(this.strContent);
    //console.log('infoWindow:', infoWindow);
    infoWindow.open(map, this.marker);
  }

  Group.prototype.removeMarker = function() {
    this.marker.setMap(null);
  }


})();



/*
//page is fully loaded including graphics
// .load in jquery deprecated
$( window ).load(function() {
  // Run code
  console.log('jquery checks window fully loaded, map:', map);
});
*/