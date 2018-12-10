'use strict';

Polymer({
  is: 'collapsible-selector',

  /*
    FIXME: when the element initially loads, the nav items are not drawn yet so they have no width
           and the nav indicator cannot be set

    FIXME: when adding/removing items the  nav indicator does not get recalculated propertly, this is
           related to the nav indicator trying to be redrawn before the  nav items have been drawn

    TODO: add the dropdown menu indicating which nave items cannot fit within the width of the nav bar
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
    /**
     * The list of items that the collapsible-selector should display
     */
    items: {
      type: Array,
      value: [],
      observer: '_navItemsChanged'
    },

    /**
     * The name of the item that is currently selected
     */
    selectedItem: {
      type: String,
      observer: '_selectedItemChanged'
    }
  },

  /**
   * Watches for changes to the items list and recalculates the selected item
   *
   * @param {array} items Array of nave items
   *
   * @returns {void}
   */
  _navItemsChanged: function(items) {
    if (this.items.indexOf(this.selectedItem) !== -1) {
      // if the selected item is still in the list then just trigger
      // the _selectedItemChanged method to recalculate the size/position of the nav indicator
      this._selectedItemChanged(this.selectedItem);
    } else {
      // if the selected item is no longer in the item list, set the selected item to the first item
      this.set('selectedItem', this.items[0]);
    }
  },

  /**
   * Watches for changes to the selected item and sets the position of the bottom bar indicator
   *
   * @param {number} selectedItem The new value of the selected item name
   *
   * @returns {void}
   *
   */
  _selectedItemChanged: function(selectedItem) {
    const selectedIndex = this.items.findIndex(item => item === selectedItem);
    const selectedDomElement = this.querySelectorAll('nav > div')[selectedIndex];

    if (selectedDomElement) {
      const container = this.querySelector('nav');
      const leftPosition = selectedDomElement.getBoundingClientRect().x - container.getBoundingClientRect().x;

      this.querySelector('.nav-indicator').setAttribute(
        'style',
        `left: ${leftPosition}px; width: ${selectedDomElement.offsetWidth}px;`
      );
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
    return item === selectedItem ? 'selected': '';
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
    this.selectedItem = e.target.dataItemName;
  }
});
