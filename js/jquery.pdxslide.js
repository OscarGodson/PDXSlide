/*
	Copyright (c) 2011 Oscar Godson, JavaScriptolo.gy
	
	Permission is hereby granted, free of charge, to any person obtaining
	a copy of this software and associated documentation files (the
	"Software"), to deal in the Software without restriction, including
	without limitation the rights to use, copy, modify, merge, publish,
	distribute, sublicense, and/or sell copies of the Software, and to
	permit persons to whom the Software is furnished to do so, subject to
	the following conditions:
	
	The above copyright notice and this permission notice shall be
	included in all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
	EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
	NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
	LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
	OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
	WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
	
	
	TO DO:
	==1.x==
	- Check in IE
	- Fix issue with putting it in the header OR state the fact is has to be!
	- Option to choose a starting point
	- Callbacks
	- Loading image
	- AJAX hashes in case you want to link to a slide
    + Probably would have a link icon on hover and would generate a link like:
      http://thecurrenturl.com/currentpage/#!/pdxslide/2
	- Arrow key support after user focuses on the slideshow
*/

(function($){
	$.fn.pdxslide = function(options) {
		var settings = $.extend(true,{}, $.fn.pdxslide.defaultOptions, options);
    
    /**
     * Custom easing by extending jQuery.easing
     */
    jQuery.extend( jQuery.easing, {
      InOutPDX: function (z, y, x, w, v) {
        if ((y/=v/2) < 1) {
          return w/2*y*y*y*y + x
        }
        else{
          return -w/2 * ((y-=2)*y*y*y - 2) + x;
        }
      }
    });
    
    
		return this.each(function() {
      
      var $this = $(this),
          loadedImages = 0,
          theTimer,
          visibleSize = {width:settings.width,height:settings.height};
      
      /**
       * Checks if the width/height params were or were not set, and if not
       * sets the params that weren't set to the width of the first visible image
       */
      if(visibleSize.width == null){
        visibleSize.width = $this.find('img:first-child').width();
      }
      if(visibleSize.height == null){
        visibleSize.height = $this.find('img:first-child').height();
      }
      
      /**
       * Setup the initial sizes. These may be overwritten after the images have loaded.
       * The sizes are predefined at first to hide the images and text
       */
      var _sizes = {
        total:  {
          width:0,
          height:0
        },
        visible:visibleSize,
        images: {
          width:$this.find('img:first-child').width(),
          height:$this.find('img:first-child').height()
        }
      }
      
      /**
       * Wrap up the selected element with a wrapper div so we have a common,
       * relative position to work with AND to hide the elements on doc ready
       */
      $this
      .wrap('<div class="'+settings.wrapperClass+'" />').parent().css({
        background:'#000',
        overflow:'hidden',
        position:'relative',
        width:_sizes.visible.width+'px',
        height:_sizes.visible.height+'px'
      }).css(settings.wrapperCSS) //for user overwrites
      
      //Hide the slides and try to hide the list style if set to the <li>s
      $this.find('li').css({visibility:'hidden',listStyle:'none'});
      
      $(this).find('img').each(function(){
        /**
         * To ensure the .load() jQuery function is called we need to add
         * a dummy param to the images making it seem like a new image
         * because if not, the image will never load because the browser will
         * simply take it from it's cache
         * will make image urls like: <img src="slides/myslide.jpeg?1302549412509" class="pdxslide-image-1">
         */
        $(this).attr('src',$(this).attr('src')+'?'+new Date().getTime());
      }).load(function(){
        
        loadedImages++;
        
        /**
         * Once every image is loaded, then we can make the <li>s visible again and start the rest of the code.
         * We put most all the code in this because it uses dimensions that would be otherwise
         * not yet set because the image(s) aren't yet loaded
         */
        if(loadedImages == $this.find('img').length){
        
        
          $this.find('li').css({visibility:'visible'});
        
          /**
           * the _api() function is a great way to start if you want to extend the slideshow yourself.
           * _api() takes 1 paramter, _api(selector), which is used to select the element
           * It features these functions:
           *
           * clearStyles()
           *  removes common styles that are most likely not wanted for the slideshow
           *  such as list-style, margin, and padding
           *  This is chainable
           *
           * goTo(slideNum)
           *  Will advance (or go back) to the slide specified. It will also accept
           *  next and previous as keywords: _api().goTo('next') or, _api().goTo(3)
           *  If the "next" or "previous" slide does not exist, it will loop to the other end
           *  This is chainable
           *
           * setAsActive()
           *  Sets whatever selector as the "current" slide. Helpful when writing your own
           *  way to animate the slideshow.
           *  This is chainable
           *
           * isFirst() and isLast()
           *  returns true or false if the slide specificed is the first/last slide in the series
           *  This is NOT chainable
           *
           * updateOverlay(headline,text)
           *  Allows you to update the black bar overlay content with specified text.
           *  The first param updates the headline text up top, the 2nd parm updates the body text
           *  HTML is allowed, and so are null values.
           *  This is chainable
           *
           * timer(action,doThis)
           *  Allows you to modify the timer object. You can "stop" and "start" it with the action
           *  param. If you are "start"ing it, you can include a "doThis" param which is a function
           *  that will happen every time the timer goes off. For example:
           *  timer('start',function(){ _api().goTo('next') })
           *  That would advance to the next slide every time the timer went off. Then to stop the
           *  timer you could do timer('stop');
           *
           */
          var _api = function(selector){
            //Sets the private _selector var to either what the developer set OR the plugins "this"
            _selector = selector || $this;
            var _activeSlide = function(){
              return $('.'+settings.activeSlideClass);
            }
            var actions = {
              clearStyles: function(){
                _selector.css({ listStyle:'none', padding:'0', margin:'0' })
                return this;
              },
              goTo: function(slideNum,callback){
                //Callback can be used AFTER the animation of the slide switch has occured
                callback = callback || function(){};
                if(slideNum == 'next' || slideNum == 'prev' || slideNum == 'previous' && $this.find('.'+settings.activeSlideClass).length > 0){
                  if(slideNum == 'next'){
                    //If the last slide...
                    if($this.find('.'+settings.activeSlideClass).is(':last-child')){
                      //...go to the first slide
                      slideNum = 0;
                    }
                    else{
                      //otherwise, get the current active slide position in the DOM then +1 for the next slide
                      slideNum = $this.find('.'+settings.activeSlideClass).index()+1;
                    }
                  }
                  else if(slideNum == 'prev' || slideNum == 'previous'){
                    //If the first slide...
                    if($this.find('.'+settings.activeSlideClass).is(':first-child')){
                      //...go to the last slide by counting all the slides and subtracting 1
                      slideNum = $this.find('li').length-1;
                    }
                    else{
                      slideNum = $this.find('.'+settings.activeSlideClass).index()-1;
                    }
                  }
                }
                //This is if the developer sets a number himself, like 2, 3, 4, etc...
                else if(typeof slideNum == 'number'){
                  slideNum = slideNum - 1;
                }
                //Otherwise, if there is some issue always default to 1
                else{
                  slideNum = 1;
                }
                
                var nextSlide = $this.find('li').eq(slideNum);
                var slideUpAmt = '-100px'; //hides the overlay
                var direction = '-'; //by default, the slide moves to the left, which is a negative
                
                //If the activeSlide position in the DOM is less than that of the developer specified
                //slideNum, we need to reverse the default action (go forward, positive number).
                if($this.find('.'+settings.activeSlideClass).index() < slideNum-1){ slideNum = -slideNum; direction = ''; }
                
                //The animation gets the direction from the line above and then multiples the slideNum by the
                //total size of the images in the slides. This gives the lenth the <ul> should animate
                _selector.animate({left:direction+(slideNum*_sizes.images.width)+'px'},settings.speed,'InOutPDX')
                
                //Check for overlay text
                if(nextSlide.find(settings.headlineTag+','+settings.textTag).length >= 1){
                  //if it exists, update the overlay with new content
                  _api().updateOverlay(
                    nextSlide.find(settings.lookForHeadlineAs).html(),
                    nextSlide.find(settings.lookForTextAs).html()
                  )
                  //And then slide up to be visible
                 slideUpAmt = '0';
                }
                
                $('.'+settings.overlayClass).animate({bottom:slideUpAmt},settings.speed,'InOutPDX',function(){ callback() });
                
                //Set the new slide as the active slide
                _api(nextSlide).setAsActive();
                
                return this;
                
              },
              setAsActive: function(){
                $('.'+settings.activeSlideClass).removeClass(settings.activeSlideClass);
                _selector.addClass(settings.activeSlideClass);
                return this;
              },
              isFirst: function(){
                //selector = selector || _selector.find('.'+settings.activeSlideClass);
                
                if(_selector.is(':first-child')){
                  return true;
                }
                //if it is an image inside of a slide
                else if(_selector[0].nodeName.toLowerCase() == 'img' && _selector.parent().is(':first-child')){
                  return true;
                }
                else{
                  return false;
                }
                
              },
              isLast: function(){
                //selector = selector || _selector.find('.'+settings.activeSlideClass);
                
                if(_selector.is(':last-child')){
                  return true;
                }
                //if it is an image inside of a slide
                else if(_selector[0].nodeName.toLowerCase() == 'img' && _selector.parent().is(':last-child')){
                  return true;
                }
                else{
                  return false;
                }
                
              },
              updateOverlay: function(headline,text){
                $('.'+settings.overlayClass).find(settings.headlineTag).html(headline).end().find(settings.textTag).html(text);
                return this;
              },
              timer: function(action,doThis){
                doThis = doThis || function(){};
                if(action == 'stop'){
                  clearInterval(theTimer);
                }
                else if(action == 'start'){
                  //theTimer var is a global (in the plugin scope), var.
                  theTimer = window.setInterval(doThis,settings.speed + settings.delay)
                }
                return this;
              }
            }
            
            return actions;
          }
          
          /**
           * The action we're going to use throughout the plugin when the timer goes off.
           * is used in the _api().timer('start',advanceWith) call
           */
          var advanceWith =  function(){ _api().goTo('next'); }
          
          //Remove all the styles from the ul/ol AND it's children
          _api($this).clearStyles().clearStyles($this.children('ol,ul,li'));
          
          
          //Setup the <li>s and give them their own classes that increment up
          $this.find('li').each(function(i){
            $(this).addClass('pdxslide-slide-'+(i+1)).parent().addClass(settings.slideClass);
          });
          
          //Get the total size of the slideshow, by adding up all the image sizes and add a class to each image
          $this.find('img')
          .each(function(i){
            $(this).addClass('pdxslide-image-'+(i+1));
            _sizes.total.width = _sizes.total.width + $(this).outerWidth();
            _sizes.total.height = _sizes.total.height + $(this).outerHeight();
          });
          
          
          $this
          .css({
            position:'relative',
            width: _sizes.total.width
          })
          .parent()
          //Simply fades in and out the arrows when hovering over the slideshow
          .hover(
            function(){
              $('.'+settings.arrowClass).stop(true,false).fadeTo(250,'0.9');
            },
            function(){
              $('.'+settings.arrowClass).stop(true,false).fadeTo(250,'0.2');
            }
          )
            .find('li').css({
              'float':'left'
            });
          
          /**
           * Creates the overlay the headline and text tags (h2 and p by default), and the
           * arrows (imgs) as well (which are wrapped in spans)
           * NOTE: The overlay is hidden on load in case there isn't any description text
           */
          $this.parent().append('<span class="'+settings.arrowClass+' '+settings.leftArrowClass+'"><img src="'+settings.leftArrowImgSrc+'"></span><span class="'+settings.arrowClass+' '+settings.rightArrowClass+'"><img src="'+settings.rightArrowImgSrc+'"></span><div class="'+settings.overlayClass+'"><'+settings.headlineTag+'></'+settings.headlineTag+'><'+settings.textTag+'></'+settings.textTag+'></div>')
            .find('.'+settings.overlayClass).css({
              position:'absolute',
              background:'#000',
              color:'#fff',
              opacity:'0.8',
              width:'100%',
              fontFamily:'inherit',
              padding:'10px',
              bottom:'-100px'
            }).css(settings.overlayCSS) //for user overwrites
              .find(settings.headlineTag).css({
                margin:'0',
                padding:'0',
                fontSize:'18px'
              }).css(settings.headlineCSS) //for user overwrites
              .end()
              .find(settings.textTag).css({
                margin:'5px 0 0 0',
                padding:'0',
                fontSize:'14px'
              }).css(settings.textCSS) //for user overwrites
              
            /**
             * This block of code waits for the arrow images to load before positioning them
             * and modifying them
             *
             * The arrow count var is to check when BOTH images have loaded!
             */
            var arrowCount = 0;
            $this.parent().find('.'+settings.arrowClass+' img').load(function(){
              if(arrowCount == 1){
                //Styles for BOTH arrows
                $this.parent().find('.'+settings.arrowClass).css({
                  position:'absolute',
                  top:$('.'+settings.wrapperClass).height()/2-$('.'+settings.leftArrowClass).height()/2+'px'
                  //opacity:'0.2'
                }).fadeTo(0,0.2).css(settings.arrowCSS) //for user overwrites
                .end()
                //Styles for just the left arrow
                .find('.'+settings.leftArrowClass).css({
                  left:'15px'
                }).css(settings.leftArrowCSS) //for user overwrites
                //Event for just the left arrrow
                .bind('click',function(){
                  _api().goTo('prev').timer('stop').timer('start',advanceWith);
                }).end()
                //Styles for just the right arrow
                .find('.'+settings.rightArrowClass).css({
                  right:'15px'
                }).css(settings.rightArrowCSS) //for user overwrites
                //Event for just the right arrow
                .bind('click',function(){
                  _api().goTo('next').timer('stop').timer('start',advanceWith);
                });
              }
              else{
                arrowCount++;
              }
            });
          
          
          /**
           * Boot-er-up
           * Simply gets the first slide, sets as the active slide and then shows
           * the overlay if there is description text
           */
          var firstSlide = $this.find('li:first-child');
          
          firstSlide.addClass(settings.activeSlideClass);
          
          if(firstSlide.find(settings.lookForHeadlineAs+','+settings.lookForTextAs).length > 0){
            _api().updateOverlay(
              firstSlide.find(settings.lookForHeadlineAs).html(),
              firstSlide.find(settings.lookForTextAs).html()
            )
            $('.'+settings.overlayClass).animate({bottom:'0'},settings.speed,'InOutPDX');
          }
          
          
          //Setup the loop
          _api().timer('start',advanceWith);
            
        }
      });
		});
	};
  
  /**
   * Lots of customization options! Whee!
   * Details of each one to the right of each option
   */
	$.fn.pdxslide.defaultOptions = {
    width:null,
    height:null,
    speed:750, //How fast the images slide
    delay:5000, //How long to wait before sliding
    arrowClass:'pdxslide-arrows', //The class on the spans containing each arrow
    leftArrowClass:'pdxslide-left-arrow', //The class on the span containing the left arrow
    rightArrowClass:'pdxslide-right-arrow', //The class on the span containing the right arrow
    leftArrowImgSrc:'left-arrow.png', //The left arrow image source
    rightArrowImgSrc:'right-arrow.png', //The right arrow image source
    overlayClass:'pdxslide-overlay', //The class of the overlay (the black bar)[contains the headline and text]
    activeSlideClass:'pdxslide-activeSlide', //Class of the currently active slide (the one shown)
    slideClass:'pdxslide-slide', //The class on the <li>s containing each image
    wrapperClass:'pdxslide-wrapper',  //The class of the dynamically added wrapper of the slideshow. (Wraps the selector you called)
    lookForHeadlineAs:'h2', //If you dont want to use <h2>s for the slides in YOUR HTML, you can specify the tag here (i.e. <li><img><h3></li> youd say lookForHeadlineAs:'h3')
    lookForTextAs:'p', //Same as above, but for the text
    headlineTag:'h2', //What tag you want the slideshow to use in the overlay (doesnt affect the lookForHeadline as option)
    textTag:'p', //Same as headlineTag but for the text
    
    //Everything below is ways to hook into the CSS and overwrite anything you need.
    //All CSS is built into the code so there is no need for yet another CSS file
    //CAREFUL: careful when overwriting widths, heights, and positions as much of that is dynamically calculated
    wrapperCSS:{},
    overlayCSS:{},
    arrowCSS:{},
    leftArrowCSS:{},
    rightArrowCSS:{},
    headlineCSS:{},
    textCSS:{},
    
    //COMING SOON FEATURES
    startAt:1
	};
})(jQuery);