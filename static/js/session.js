/**
 * Session class.
 */
const Session = new class {
    constructor() {
        // Dictionary of imported plasmid files
        this.plasmids = {};
  
        // Currently active plasmid file
        this.activePlasmidIndex = null;
  
        // Index of plasmid from where the subcloning originates
        this.subcloningOriginPlasmidIndex = null;
        // Span of subcloning target in origin plasmid
        this.subcloningOriginSpan = null;
    };
  
    
    /**
     * Get the next available index for a new plasmid.
     * 
     * @returns - Index.
     */
    nextFreeIndex() {
      const entriesList = Object.keys(this.plasmids);

      // There are no plasmids yet, return 0
      if (entriesList.length == 0) {
        return 0;
      }

      // Get the last plasmid in the list and return its index + 1
      return parseInt(entriesList[entriesList.length - 1]) + 1;
    };
  
  
    /**
     * Add a new plasmid to the session.
     * 
     * @param {Object} newPlasmid - Plasmid to be added.
     */
    addPlasmid(newPlasmid) {
      // Check if index was given
      const currIndex = newPlasmid.index;
      // Add plasmid object to session
      this.plasmids[currIndex] = newPlasmid;
      
      // Create a new tab
      PlasmidTabs.new(currIndex, newPlasmid.name + newPlasmid.extension);
    };
  
  
    /**
     * Return active plasmid object
     * 
     * @returns {Plasmid} - Active plasmid
     */
    activePlasmid() {
      return this.plasmids[this.activePlasmidIndex];
    };

  
    /**
     * Returns plasmid by index.
     * 
     * @param {int} index - Index of plasmid to be retrieved.
     * @returns - Plasmid matching specified index.
     */
    getPlasmid(index) {
      return this.plasmids[index];
    };


    markForSubcloning(span=null) {
        if (span === null) span = Session.activePlasmid().getSelectionIndices();
        this.subcloningOriginPlasmidIndex = Session.activePlasmidIndex;
        this.subcloningOriginSpan = span;

        if (this.subcloningOriginSpan[1] - this.subcloningOriginSpan[0] < 400) {
            Alerts.warning(
                "Short subcloning target",
                "Attempting to subclone fragments shorter than 400 bp may result in lower efficiency or the subcloning may fail all together.",
                10
            );
        };

        PlasmidViewer.highlightSubcloningTarget();
    };


    removeMarkForSubcloning() {
        this.subcloningOriginPlasmidIndex = null;
        this.subcloningOriginSpan = null;

        PlasmidViewer.highlightSubcloningTarget();
    };
};