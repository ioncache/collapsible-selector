'use strict';

(function() {
  Polymer({
    is: 'collapsible-selector',

    /*
      FIXME: when the element initially loads, the nav items are not drawn yet so they have no width
            and the nav indicator cannot be set

      FIXME: when adding/removing items the  nav indicator does not get recalculated propertly, this is
            related to the nav indicator trying to be redrawn before the  nav items have been drawn

      TODO: add the dropdown menu indicating which nav items cannot fit within the width of the nav bar
            - need to calculate the width of each nav item
            - need to calculate the width of the dropdown so we can determine how much room is
              additionally needed when adding in the dropdown

      TODO: when an item is selected from the dropdown, it should replace the last visible nav item
            and the last visible nav item should now show in the dropdown
            - may need to recalculate how many nav items are shown if the new nav item is larger than
              the one being removed

      TODO: recalculate whenever nav bar element resizes
            - should trigger on window resize
            - should trigger any other time the nav bar element resizes
              - how to do this?
              - possibly externally monitor this some how, and pass in an event name
                to listen for that indicates a resize change; for instance with the split-me
                custom element used in the demo, it emits a 'slotResized' event whenever it resizes
                one of it's elements
              - use MutationObserver ?
    */

    properties: {
      /*********************/
      /* Public properties */
      /*********************/

      /**
       * Text to be used on the dropdown menu as the default state
       */
      dropdownText: {
        type: String,
        value: 'More...'
      },

      /**
       * The list of items that the collapsible-selector should display
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
       * The name of the item that is currently selected
       */
      selectedItem: {
        type: String,
        observer: '_selectedItemChanged'
      },

      /**********************/
      /* Private properties */
      /**********************/

      _dropdownItems: {
        type: Array
      },

      /**
       * Whether the element has finished an initial load
       */
      _isLoaded: {
        type: String,
        value: false,
        observer: '_isLoadedChanged'
      },

      /**
       * Keeps track of the sizes of all items, the dropdown and the nav size
       */
      _sizeInfo: {
        type: Object,
        value: {}
      }
    },

    observers: [
    ],

    /*****************************/
    /* Polymer lifecycle methods */
    /*****************************/

    attached: function() {
      // setup an event listener on window resize to update the size details of the selector
      window.addEventListener('resize', function() {
        this._resize();
      }.bind(this));
    },

    /*******************/
    /* Private methods */
    /*******************/


    _calculate: function() {
      this.set('_sizeInfo', this._calculateSizeInfo());
      this._calculateVisibleItems();
      this._selectedItemChanged(this.selectedItem);
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
        for (let item of Object.keys(this._sizeInfo.itemDetails)) {
          this._sizeInfo.itemDetails[item].el.classList.remove('hide');
        }

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
            if (this.items[i] !== this.selectedItem) {
              visibleItemWidth -= this._sizeInfo.itemDetails[this.items[i]].width;
              this._sizeInfo.itemDetails[this.items[i]].el.classList.add('hide');
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
     * Calculates the widths of:
     * - each individual item in the nav
     * - total width of all items in the nav
     * - the dropdown menu
     * - the nav element itself
     *
     * @returns {object} Returns an object with the details of the widths
     */
    _calculateSizeInfo: function() {
      const items = [].slice.call(this.querySelectorAll('.nav-item'));

      return items.reduce(
        (accumulator, item, index) => {
          // remove the hide class as items set to display: none have no width
          // and we want to ensure we recalculate the correct sizes of all items
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
          navWidth: this.querySelector('.nav-bar-line').offsetWidth,
          totalItemWidth: 0
        }
      );
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
      // Options for the observer (which mutations to observe)
      let config = { childList: true };

      let observer = new MutationObserver((mutationsList, observer) => {
        if (this.querySelectorAll('.nav-item').length === items.length) {
          this._calculate();

          // if the selected item is no longer in the item list, set the selected item to the first item
          if (items.indexOf(this.selectedItem) === -1) {
            this.set('selectedItem', items[0]);
          }

          this._isLoaded = true;

          observer.disconnect();
        }
      });

      observer.observe(this.querySelector('nav'), config);
    },

    _closeDropdown: function(e) {
      this.querySelector('.dropdown-items').classList.remove('dropdown-items-visible');
    },

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
      if (newEventName !== oldEventName) {
        if (oldEventName) {
          window.removeEventListener(oldEventName, this._resize.bind(this));
        }

        if (newEventName) {
          window.addEventListener(newEventName, this._resize.bind(this));
        }
      }
    },

    /**
     * Things to do when a resizeEvent happens
     *
     * @returns {void}
     */
    _resize: function() {
      // TODO: debounce this
      if (this._isLoaded) {
        this._calculate();
      };
    },

    /**
     * Watches for changes to the selected item and sets the position of the bottom bar indicator
     *
     * // TODO: calculate which nav items to show?
     *
     * @param {string} newSelectedItem The new value of the selectedItem property
     * @param {string} oldSelectedItem The old value of the selectedItem property
     *
     * @returns {void}
     *
     */
    _selectedItemChanged: function(newSelectedItem, oldSelectedItem) {
      if (newSelectedItem !== oldSelectedItem) {
        const selectedIndex = this.items.findIndex(item => item === newSelectedItem);
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

        this._calculateVisibleItems();
      }
    },

    /**
     * Method to set a class indicating if a nav item is selected
     *
     * @param {string} item The name of the item to be selected
     * @param {number} selectedItem The name of the currently selected item
     *
     * @returns {string} Returns an empty string or the selected class name
     *
     */
    _setSelectedClass: function(item, selectedItem) {
      return item === selectedItem ? 'selected' : '';
    },

    /**
     * Method to set the selected item based on a tap event on a nav item
     *
     * @param {event} e Polymer on-tap event for a selected nav item
     *
     * @returns {void}
     *
     */
    _setSelectedItem: function(e) {
      e.preventDefault();

      this.selectedItem = e.target.dataItemName;
      this._closeDropdown();
    }
  });
})();
