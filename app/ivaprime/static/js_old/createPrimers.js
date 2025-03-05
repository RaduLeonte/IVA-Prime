
/**
 * 
 * @param {*} eventSource 
 * @param {*} adjustmentDirection 
 * @param {*} targetStrand 
 * @param {*} startPos 
 * @param {*} endPos 
 */
function adjustPrimerLength(instigator, adjustmentSign) {
    const buttonContainer = instigator.parentElement;
    const sequenceEnd = buttonContainer.getAttribute("sequence-end");
    const historyIndex = buttonContainer.getAttribute("history-index");
    
    if (buttonContainer.getAttribute("next-base-position") !== "null") {
        let nextBasePosition = parseInt(buttonContainer.getAttribute("next-base-position"));
        // button -> buttons container -> primer-sequence p -> primer-div div -> mod-div div
        const modDiv = instigator.parentElement.parentElement.parentElement.parentElement;
        const primerName = buttonContainer.getAttribute("primer-name");
    
        let homoRegionLengthChange = 0;
        const targetStrand = buttonContainer.getAttribute("direction");
        if (adjustmentSign === 1) {
            /**
             * Lenghtening sequence
             */
    
            /**
             * Find base to be appended
             */
            const currPlasmid = Project.activePlasmid();
            const currSequenceFwd = currPlasmid.history[historyIndex][0];
            const currSequence = (targetStrand === "fwd") ? currSequenceFwd: getComplementaryStrand(currSequenceFwd);
            const nextBase = currSequence.slice(nextBasePosition - 1, nextBasePosition);
    
            /**
             * Append new base to sequence
             */
            if (sequenceEnd === "5'") {
                // Left button pair, find sequence to the right
                // Button container -> homologous region span -> first child
                const targetSpan = buttonContainer.nextElementSibling.firstElementChild;
                if (targetSpan.innerText.length < parseFloat(targetSpan.getAttribute("max-length"))) {
                    targetSpan.innerText = nextBase + targetSpan.innerText;
                    nextBasePosition += (targetStrand === "fwd") ? -1: 1;
                    homoRegionLengthChange = 1;
                } else {
                    return;
                };
    
            } else if (sequenceEnd === "3'") {
                // Right button pair, find sequence to the left
                // Button container -> span -> last child
                const targetSpan = buttonContainer.previousElementSibling.lastElementChild;
                if (targetSpan.innerText.length < parseFloat(targetSpan.getAttribute("max-length"))) {
                    targetSpan.innerText = targetSpan.innerText + nextBase;
                    nextBasePosition += (targetStrand === "fwd") ? 1: -1;
                } else {
                    return;
                };
            };
        } else if (adjustmentSign === -1) {
            /**
             * Deleting bases
             */
            if (sequenceEnd === "5'") {
                // Left button pair, find sequence to the right
                // Button container -> homologous region span -> first child
                const targetSpan = buttonContainer.nextElementSibling.firstElementChild;
                if (targetSpan.innerText.length > 0) {
                    targetSpan.innerText = targetSpan.innerText.slice(1);
                    nextBasePosition += (targetStrand === "fwd") ? 1: -1;
                    homoRegionLengthChange = -1;
                } else {
                    return;
                };
    
            } else if (sequenceEnd === "3'") {
                // Right button pair, find sequence to the left
                // Button container -> span -> last child
                const targetSpan = buttonContainer.previousElementSibling.lastElementChild;
                if (targetSpan.innerText.length > 0) {
                    targetSpan.innerText = targetSpan.innerText.slice(0, -1);
                    nextBasePosition += (targetStrand === "fwd") ? -1: 1;
                } else {
                    return;
                };
            };
        };
    
        let homoRegionLengthSpan;
        if (modDiv.querySelectorAll("#homologous-region-info")[0].children.length === 1) {
            homoRegionLengthSpan = modDiv.querySelectorAll("#operation-info-homo-length")[0];
        } else {
            const targetInfoSpan = (primerName === "Forward Primer" || primerName === "Vector Reverse Primer") ? 0: 1;
            homoRegionLengthSpan = modDiv.querySelectorAll("#operation-info-homo-length")[targetInfoSpan];
        };
        homoRegionLengthSpan.innerText = parseInt(homoRegionLengthSpan.innerText) + homoRegionLengthChange;
        
        /**
         * Update nextBasePosition
         */
        buttonContainer.setAttribute("next-base-position", nextBasePosition);
    
        /**
         * Update stuff
         */
        // Update span
        refreshPrimerDiv(modDiv);
    };
};


/**
 * 
 * @param {Element} modDiv 
 */
function refreshPrimerDiv(modDiv) {
    /**
     * Homologous region info
     */
    // Get new homologous region sequence -> length, tm
    const homologousRegionInfoDiv = modDiv.querySelectorAll("#homologous-region-info")[0];
    let homoRegionSpanIndices = (homologousRegionInfoDiv.children.length === 1) ? [0, 0] : [0, 1, 1, 0];
    let tempHomoSpan;
    let tempRemainingSpan;
    let i = 0;
    modDiv.querySelectorAll("#primer-sequence").forEach(primerSequenceDiv => {
        const currentIndex = homoRegionSpanIndices[i];
        let currHSeqLength = parseInt(modDiv.querySelectorAll("#operation-info-homo-length")[currentIndex].innerText);
        tempHomoSpan = document.createElement("span");
        tempRemainingSpan = document.createElement("span");
        const regionTags = ["homo", "ins", "tbr"];

        for (tagIndex in regionTags) {
            const tag = regionTags[tagIndex]
            let fullRegionSequence = "";
            primerSequenceDiv.querySelectorAll(`[primer-span-type="${tag}"]`).forEach(span => {
                fullRegionSequence += span.innerText;
            });

            if (primerSequenceDiv.querySelectorAll(`[primer-span-type="${tag}"]`)[0]) {
                const regionSpanElement = primerSequenceDiv.querySelectorAll(`[primer-span-type="${tag}"]`)[0].cloneNode(true);
                regionSpanElement.innerText = fullRegionSequence;

                if (fullRegionSequence.length <= currHSeqLength) {
                    // Fits in h span
                    tempHomoSpan.appendChild(regionSpanElement.cloneNode(true));
                } else if (fullRegionSequence.length > currHSeqLength && currHSeqLength > 0) {
                    // Span needs to be split
                    const tempSpan1 = regionSpanElement.cloneNode(true);
                    tempSpan1.innerText = regionSpanElement.innerText.slice(0, currHSeqLength);
                    const tempSpan2 = regionSpanElement.cloneNode(true);
                    tempSpan2.innerText = regionSpanElement.innerText.slice(currHSeqLength)
                    
                    tempHomoSpan.appendChild(tempSpan1);
                    tempRemainingSpan.appendChild(tempSpan2);
                } else {
                    // h span spent, goes into remaining span
                    tempRemainingSpan.appendChild(regionSpanElement.cloneNode(true));
                };
                currHSeqLength -= fullRegionSequence.length;
            };
        };
        const homoRegionSpan = primerSequenceDiv.querySelectorAll("#homologous-region")[0];
        const remainingRegionSpan = homoRegionSpan.nextElementSibling;
        
        homoRegionSpan.innerHTML = tempHomoSpan.innerHTML;
        remainingRegionSpan.innerHTML = tempRemainingSpan.innerHTML;

        i++;
    });

    homoRegionSpanIndices = (homologousRegionInfoDiv.children.length === 1) ? [0] : [0, 1];
    for (let j = 0; j < homoRegionSpanIndices.length; j++) {
        const currentIndex = homoRegionSpanIndices[j];
        let homologousSequence = modDiv.querySelectorAll("#homologous-region")[currentIndex].innerText;
        const homologousSequenceTm = getMeltingTemperature(homologousSequence, "oligoCalc").toFixed(2);
        const tmSpan = homologousRegionInfoDiv.querySelectorAll("#operation-info-homo-tm")[currentIndex];
        tmSpan.innerText = homologousSequenceTm;
    };

    /**
     * Individual primers
     */
    // Iterate over primer-divs
    const primerDivs = modDiv.querySelectorAll("#primer-div");
    primerDivs.forEach((primerDiv) => {
        /**
         * Adjust onmouseover events
         */
        // Homo -> same sequence
        // Ins -> span sequence
        primerDiv.querySelectorAll('[primer-span-type="homo"], [primer-span-type="ins"]').forEach(span => {
            span.setAttribute("region-full-sequence", span.innerText);
        });

        // TBR -> combined span sequence
        let tbrSequence = "";
        primerDiv.querySelectorAll('[primer-span-type="tbr"]').forEach(tbrSpan => {
            tbrSequence += tbrSpan.innerText;
        });

        primerDiv.querySelectorAll('[primer-span-type="tbr"]').forEach(tbrSpan => {
            tbrSpan.setAttribute("region-full-sequence", tbrSequence);
        });

        // Recalculate TBR length and tm
        const tbrLengthSpan = primerDiv.querySelectorAll("#primer-info-tbr-length")[0];
        tbrLengthSpan.innerText = tbrSequence.length;
        const tbrTmSpan = primerDiv.querySelectorAll("#primer-info-tbr-tm")[0];
        tbrTmSpan.innerText = getMeltingTemperature(tbrSequence, meltingTempAlgorithmChoice).toFixed(2);


        // Recalculate Total length
        const fullSequenceLength = primerDiv.querySelectorAll("#primer-sequence")[0].innerText.length;
        const totalLengthSpan = primerDiv.querySelectorAll("#primer-info-total-length")[0];
        totalLengthSpan.innerText = fullSequenceLength;
    });

    Project.activePlasmid().savePrimers();
    Project.activePlasmid().saveProgress();
};