'use strict';

(function(_) {
  Polymer({
    is: 'collapsible-selector',

    properties: {
      /*********************/
      /* Public properties */
      /*********************/

      /**
       * The text to display on the dropdown menu button.
       */
      dropdownButtonText: {
        type: String,
        value: 'More...'
      },

      /**
       * The list of items that the collapsible-selector should display.
       *
       * Each element in the list should be in the format:
       *
       * {
       *   display: 'This is an item',
       *   value: 'itemId'
       * }
       */
      items: {
        type: Array,
        value: [],
        observer: '_itemsChanged'
      },

      /**
       * Name of an event to listen to which should trigger a recalculation of visible items.
       *
       * Ideally this would be triggered when the width of the element containing the collapsible-selector
       * changes.
       *
       * The selector will always listen for window.onresize events.
       */
      resizeEventName: {
        type: String,
        observer: '_resizeEventNameChanged'
      },

      /**
       * Wait in milliseconds to debounce the resize event handler.
       */
      resizeWaitTime: {
        type: Number,
        value: 20
      },

      /**
       * The name of the item that is currently selected.
       *
       * This will notify on change so it can be used as a setter in the parent component.
       */
      selectedItem: {
        type: String,
        observer: '_selectedItemChanged',
        notify: true
      },

      /**********************/
      /* Private properties */
      /**********************/

      /**
       * The list of items that will appear in the dropdown menu.
       */
      _dropdownItems: {
        type: Array
      },

      /**
       * Whether the element has finished an initial load.
       */
      _isLoaded: {
        type: String,
        value: false,
        observer: '_isLoadedChanged'
      },

      /**
       * Keeps track of the sizes of all items, the dropdown and the nav size.
       */
      _sizeInfo: {
        type: Object,
        value: {}
      },

      /**
       * Flag to keep track of whether to skip the next _calculate call.
       */
      _skipNextCalculate: {
        type: Boolean,
        value: false
      }
    },

    /*****************************/
    /* Polymer lifecycle methods */
    /*****************************/

    attached: function() {
      // setup an event listener on window resize to update the size details of the selector
      this._setupDebouncedResize();
      window.addEventListener('resize', this._debouncedResize);
    },

    /*******************/
    /* Private methods */
    /*******************/

    /**
     * Calculates all the various things needed to determing the visible items.
     *
     * @returns {void}
     */
    _calculate: function() {
      if (this._skipNextCalculate) {
        this._skipNextCalculate = false;
        this._setSelectedIndicator();
      } else {
        this._calculateSizeInfo()
        .then((sizeInfo) => {
          this.set('_sizeInfo', sizeInfo);
          this._calculateVisibleItems();
          this._setSelectedIndicator();
        });
      }
    },

    /**
     * Calculates the widths of:
     * - each individual item in the nav
     * - total width of all items in the nav
     * - the dropdown menu
     * - the nav element itself
     *
     * FIXME: the setInterval in this method is a temporary solution until we can
     *        figure a better way to handle the race condition of the items
     *        not yet being in the DOM when we want to calculate their size
     *
     * @returns {object} Returns an object with the details of the widths
     */
    _calculateSizeInfo: function() {
      // convert a NodeList into an array so we can use reduce
      let items = [].slice.call(this.querySelectorAll('.nav-item'));

      // TODO: if we stick with the setInterval and promise version of the
      //       _calculateSizeInfo method, then this calcSizeInfo function should
      //       be moved to a new method so it can be tested properly
      const calcSizeInfo = () => {
        return items.reduce(
          (accumulator, item, index) => {
            // remove the hide class as items set to display: none have no width
            // and we want to ensure we recalculate the correct sizes of all items
            // FIXME: possibly we should just draw a copy of all the items offscreen once
            //        and calculate sizes there instead, that way the items in the
            //        nav bar aren't briefly shown before possibly being rehidden
            item.classList.remove('hide');

            accumulator.itemDetails[item.dataItemName] = {
              el: item,
              position: index,
              width: item.offsetWidth
            };
            accumulator.totalItemWidth += item.offsetWidth;

            return accumulator;
          },
          {
            dropdownDetails: {
              el: this.querySelector('.dropdown-container'),
              width: this.querySelector('.dropdown-container').offsetWidth
            },
            itemDetails: {},
            navWidth: this.querySelector('.nav-bar').offsetWidth,
            totalItemWidth: 0
          }
        );
      };

      return new Promise((resolve, reject) => {
        if (items.length === 0) {
          let sizeInterval = setInterval(() => {
            items = [].slice.call(this.querySelectorAll('.nav-item'));
            if (items.length !== 0) {
              clearInterval(sizeInterval);
              resolve(calcSizeInfo());
            }
          }, 150);
        } else {
          resolve(calcSizeInfo());
        }
      });
    },

    /**
     * Calculate which nav items to show
     *
     * Also determines whether to show the dropdown
     *
     * @returns {void}
     */
    _calculateVisibleItems: function() {
      if (this._sizeInfo.totalItemWidth < this._sizeInfo.navWidth) {
        // when there is room to display all the nav items, ensure none have the hidden class
        for (let item of Object.keys(this._sizeInfo.itemDetails)) {
          this._sizeInfo.itemDetails[item].el.classList.remove('hide');
        }

        // when there is room for all nav items, the dropdown can be hidden
        this._sizeInfo.dropdownDetails.el.classList.add('hide');
      } else {
        let availableWidth = this._sizeInfo.navWidth - this._sizeInfo.dropdownDetails.width;

        let visibleItemWidth = Object.keys(this._sizeInfo.itemDetails).reduce((acc, i) => {
          if (!this._sizeInfo.itemDetails[i].el.classList.contains('hide')) {
            return acc + this._sizeInfo.itemDetails[i].el.offsetWidth;
          } else {
            return acc;
          }
        }, 0);

        if (visibleItemWidth > availableWidth) {
          this.set('_dropdownItems', []);

          for (let i = this.items.length - 1; i >= 0; i--) {
            // ignore the currently selected item so that it stays always visible
            if (this.items[i].value !== this.selectedItem) {
              visibleItemWidth -= this._sizeInfo.itemDetails[this.items[i].value].width;
              this._sizeInfo.itemDetails[this.items[i].value].el.classList.add('hide');
              this.unshift('_dropdownItems', this.items[i]);

              if (visibleItemWidth <= availableWidth) {
                break;
              }
            }
          }

          this._sizeInfo.dropdownDetails.el.classList.remove('hide');
        }
      }
    },

    /**
     * Method to close the dropdown
     *
     * @param {event} e Polymer on-focus event when clicking off the dropdown
     *
     * @returns {void}
     */
    _closeDropdown: function(e) {
      if (e) {
        e.preventDefault();
      }

      this.querySelector('.dropdown-items').classList.remove('dropdown-items-visible');
    },

    /**
     * When the element has finished loading we want to show the nav area
     * and do an initial calculation of which nav items to show
     *
     * @param {boolean} isLoaded The new value of the isLoaded property
     *
     * @returns {void}
     */
    _isLoadedChanged: function(isLoaded) {
      if (isLoaded) {
        this._calculate();
        this.querySelector('nav').classList.remove('invisible');
      }
    },

    /**
     * Watches for changes to the items list
     *
     * @param {array} items this.items
     *
     * @returns {void}
     */
    _itemsChanged: function(items) {
      let observer = new MutationObserver((mutationsList, observer) => {
        if (this.querySelectorAll('.nav-item').length === items.length) {
          if (_.findIndex(items, i => i.value === this.selectedItem) === -1) {
            // if the selected item is no longer in the item list, set the selected item to the first item
            // whenever the selected item changes this._calculate is called
            // in the case where there are no items in the list, set the selected value to an empty string
            this.set('selectedItem', items[0] ? items[0].value : '');
          } else {
            this._calculate();
          }

          this._isLoaded = true;

          observer.disconnect();
        }
      });

      observer.observe(this.querySelector('nav'), { characterData: true, childList: true, subtree: true });
    },

    /**
     * Method to open the dropdown
     *
     * @param {event} e Polymer on-tap event when clicking on the dropdown button
     *
     * @returns {void}
     */
    _openDropdown: function(e) {
      if (e) {
        e.preventDefault();
      }

      this.querySelector('.dropdown-items').classList.add('dropdown-items-visible');
    },

    /**
     * @param {string} newEventName The new value of the resizeEventName property
     * @param {string} oldEventName The old value of the resizeEventName property
     *
     * @returns {void}
     */
    _resizeEventNameChanged: function(newEventName, oldEventName) {
      // setup a debounced version of the resize handler
      this._setupDebouncedResize();

      if (newEventName !== oldEventName) {
        if (oldEventName) {
          window.removeEventListener(oldEventName, this._debouncedResize);
        }

        if (newEventName) {
          window.addEventListener(newEventName, this._debouncedResize);
        }
      }
    },

    /**
     * Things to do when a resizeEvent happens
     *
     * @returns {void}
     */
    _resize: function() {
      if (this._isLoaded) {
        this._calculate();
      };
    },

    /**
     * Watches for changes to the selected item and sets the position of the bottom bar indicator
     *
     * @param {string} newSelectedItem The new value of the selectedItem property
     * @param {string} oldSelectedItem The old value of the selectedItem property
     *
     * @returns {void}
     *
     */
    _selectedItemChanged: function(newSelectedItem, oldSelectedItem) {
      if (
          newSelectedItem !== oldSelectedItem &&
          _.get(this._sizeInfo.itemDetails, newSelectedItem)
        ) {
        this._calculate();

        for (let item of Object.keys(this._sizeInfo.itemDetails)) {
          this._sizeInfo.itemDetails[item].el.classList.remove('selected');
        }

        this._sizeInfo.itemDetails[newSelectedItem].el.classList.add('selected');
      }
    },

    /**
     * Sets the size and position of the selected item indicator.
     *
     * @returns {void}
     */
    _setSelectedIndicator: function() {
      const selectedIndex = this.items.findIndex(item => item.value === this.selectedItem);
      const selectedDomElement = this.querySelectorAll('.nav-item')[selectedIndex];

      if (selectedDomElement) {
        selectedDomElement.classList.remove('hide');

        const container = this.querySelector('nav');
        const leftPosition = selectedDomElement.getBoundingClientRect().x - container.getBoundingClientRect().x;

        this.querySelector('.nav-indicator').setAttribute(
          'style',
          `left: ${leftPosition}px; width: ${selectedDomElement.offsetWidth}px;`
        );
      }
    },

    /**
     * Method to set the selected item based on a tap event on an item in the dropdown
     *
     * @param {event} e Polymer on-tap event
     *
     * @returns {void}
     */
    _setSelectedItem: function(e) {
      if (e) {
        e.preventDefault();
      }

      this.selectedItem = e.target.dataItemName;
      this._closeDropdown();
    },

    /**
     * Method to set the selected item based on a tap event on a nav item
     *
     * @param {event} e Polymer on-tap event
     *
     * @returns {void}
     */
    _setSelectedItemFromNav: function(e) {
      if (e) {
        e.preventDefault();
      }

      // when selecting from the nav directly, there is no need to recalculate
      // since we know that the currently visible items already fit correctly
      this._skipNextCalculate = true;
      this._setSelectedItem(e);
    },

    /**
     * Sets up a debounced version of this.resize
     *
     * @returns {void}
     */
    _setupDebouncedResize: function() {
      // setup a debounced version of the resize handler
      if (!this._debouncedResize) {
        this._debouncedResize = _.debounce(
          this._resize.bind(this),
          this.resizeWaitTime,
          {
            leading: true,
            maxWait: this.resizeWaitTime * 5
          }
        );
      }
    }
  });
})(window._);
