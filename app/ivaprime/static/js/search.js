const Search = new class {
    constructor() {
        /**
         * Search bar
         */
        this.searchResults = [];
        this.searchFocusIndex = null;
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById("search-bar").addEventListener("input", function() {
                Search.search();
            });

            document.getElementById("search-bar").addEventListener("keydown", function(event) {
                if (event.key === "ArrowUp") {
                    event.preventDefault();
                    Search.navigateResults(-1);
                } else if (event.key === "ArrowDown") {
                    event.preventDefault();
                    Search.navigateResults(1);
                };
            });
        });


        document.addEventListener("keydown", function(event) {
            if ((event.ctrlKey || event.metaKey) && event.key === "f") {
                event.preventDefault();
                document.getElementById("search-bar").focus();
            };
        });
    };

    /**
     * Clears the search bar
     */
    clear(clearInput=true) {
        if (clearInput) {
            document.getElementById("search-bar").value = "";
        };
        PlasmidViewer.unhighlightBases("base-search");
        PlasmidViewer.unhighlightBases("base-search-focus");
        this.searchResults = [];
        this.searchFocusIndex = null;
        this.updateBarInfo();
    };


    /**
     * Search for DNA or AA sequence in plasmid
     */
    search() {
        const query = document.getElementById("search-bar").value;
        const searchAASeq = document.getElementById("search-aa").checked;

        this.clear(false);

        if (!query || query === null || query.length === 0) {return};

        if (searchAASeq) {
            this.searchAA(query);
        } else {
            this.searchDNA(query);
        };
    };


    /**
     * Search for DNA sequence in plasmid
     * 
     * @param {String} query - DNA Sequence
     */
    searchDNA(query) {
        if (!Nucleotides.isNucleotideSequence(query)) return;

        const activePlasmid = Session.activePlasmid();
        if (!activePlasmid) return;

        const sequences = [activePlasmid.sequence, activePlasmid.complementarySequence];
        const queries = [query, query.split("").reverse().join("")];

        for (let i = 0; i < 2; i++) {
            const query = queries[i]
            const sequence = sequences[i];
            const strand = ["fwd", "rev"][i]
            let indices = [];
            let index = sequence.indexOf(query);
            while (index !== -1) {
                indices.push(index);
                index = sequence.indexOf(query, index + 1);
            };
        
            for (let j = 0; j < indices.length; j++) {
                const span = [indices[j]+1, indices[j]+query.length];
                PlasmidViewer.highlightBases(
                    span,
                    "base-search",
                    strand,
                );

                this.searchResults.push({strand: strand, span: span});
            };
        };

        this.findNearestResult();
        this.focusResult();
        this.updateBarInfo();
    };


    /**
     * Search for AA sequence in plasmid
     * 
     * @param {String} query - AA sequence
     */
    searchAA(query) {
        const activePlasmid = Session.activePlasmid();
        if (!activePlasmid) return; // No plasmid loaded

        // Iterate over both strands
        const sequences = [activePlasmid.sequence, Nucleotides.reverseComplementary(activePlasmid.sequence)];
        const strands = ["fwd", "rev"];
        for (let i = 0; i < 2; i++) {
            const sequence = sequences[i];
            const strand = strands[i];

            // Get the 3 possible reading frames
            const dnaFrames = [
                sequence,
                sequence.slice(-1) + sequence.slice(0, -1),
                sequence.slice(-2) + sequence.slice(0, -2)
            ];

            // Iterate over reading frames
            for (let j = 0; j < 3; j++) {
                const dnaFrame = dnaFrames[j];
                
                // Translate reading frame
                let aaFrame = "";
                for (let k = 0; k+3 <= dnaFrame.length; k += 3) {
                    aaFrame += Nucleotides.codonTable[dnaFrame.slice(k, k+3)]
                };


                // Search for query and save its index
                let indices = [];
                let index = aaFrame.indexOf(query);
                while (index !== -1) {
                    if (strand === "fwd") {
                        const aaIndex = index*3 + 1 - j;
                        indices.push(aaIndex);
                    } else {
                        const aaIndex = index*3 + 1 - j;
                        indices.push(dnaFrame.length - aaIndex)
                    }
                    index = aaFrame.indexOf(query, index + 1);
                };
            
                // Highlight search results
                for (let k = 0; k < indices.length; k++) {
                    const span = (strand === "fwd")
                    ? [indices[k], indices[k] + query.length*3 - 1]
                    : [indices[k] - query.length*3 + 2, indices[k] + 1]
                    
                    console.log("Search.searchAA ->", query, span);

                    PlasmidViewer.highlightBases(
                        span,
                        "base-search",
                        strand,
                    );

                    this.searchResults.push({strand: strand, span: span});
                };
            };
        };

        this.findNearestResult();
        this.focusResult();
        this.updateBarInfo();
    };


    findNearestResult() {
        const gridViewContainer = document.getElementById("grid-view-container");

        const bases = Array.from(gridViewContainer.getElementsByClassName("base-search"));

        const containerRect = gridViewContainer.getBoundingClientRect();
        let firstBaseInView;
        for (let i = 0; i < bases.length; i++) {
            const base = bases[i]
            const rect = base.getBoundingClientRect();
            if (
                rect.top >= containerRect.top &&
                rect.bottom <= containerRect.bottom
            ) {
                firstBaseInView = base;
            };
        };

        const targetBase = (firstBaseInView) ? firstBaseInView: bases[0];
        if (!targetBase) return;

        const targetBaseIndex = parseInt(targetBase.getAttribute("base-index"));

        this.searchResults.sort((a, b) => a.span[0] - b.span[0]);
        for (let i = 0; i < this.searchResults.length; i++) {
            const resultSpan = this.searchResults[i].span;
            if (resultSpan[0] <= targetBaseIndex <= resultSpan[1]) {
                this.searchFocusIndex = i;
                break;
            };
        };
    };


    navigateResults(increment) {
        PlasmidViewer.unhighlightBases("base-search-focus");
        if (this.searchFocusIndex + increment < 0) {
            this.searchFocusIndex = this.searchResults.length - 1;
        } else if (this.searchFocusIndex + increment >= this.searchResults.length) {
            this.searchFocusIndex = 0;
        } else {
            this.searchFocusIndex += increment;
        };
        this.focusResult();
        this.updateBarInfo();
    };


    focusResult() {
        const searchResult = this.searchResults[this.searchFocusIndex];
        if (!searchResult) return;

        PlasmidViewer.highlightBases(searchResult.span, "base-search-focus", searchResult.strand);

        const container = document.getElementById("viewer");
        const containerRect = container.getBoundingClientRect();
        const basesInSearchResult = Array.from(container.querySelectorAll(".base-search-focus")).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

        
        const basesHeightDifference = basesInSearchResult[basesInSearchResult.length - 1].getBoundingClientRect().bottom
                                    - basesInSearchResult[0].getBoundingClientRect().top
        
        const targetBase = searchResult.strand === "fwd" 
            ? basesInSearchResult[0] 
            : basesInSearchResult.at(-1);

        const targetSVG = targetBase.closest("svg");
        const targetSVGRect = targetSVG.getBoundingClientRect();
        const targetTop = targetSVGRect.top - containerRect.top + container.scrollTop;
        const targetBottom = targetSVGRect.bottom - containerRect.top + container.scrollTop;
        const halfContainer = containerRect.height / 2;
        const halfBases = basesHeightDifference / 2;
        
        let targetHeight;
        
        if (basesHeightDifference > containerRect.height) {
            targetHeight = searchResult.strand === "fwd" 
                ? targetTop 
                : targetBottom - containerRect.height;
        } else {
            targetHeight = searchResult.strand === "fwd" 
                ? targetTop - halfContainer + halfBases 
                : targetBottom - halfContainer - halfBases;
        };

        document.getElementById("viewer").scrollTo({ top: targetHeight, behavior: "smooth" });
    };


    updateBarInfo() {
        const infoSpan = document.getElementById("search-bar-info");

        if (this.searchResults.length === 0) {
            infoSpan.innerText = "";
        } else {
            infoSpan.innerText = (this.searchFocusIndex+1) + "/" + this.searchResults.length;
        };
    };
};