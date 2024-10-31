const FileIO = new class {
    /**
     * Import file, read contents and pass to appropriate parser.
     * 
     * @param {Object} file - File object. 
     * @param {int} plasmidIndex - Plasmid index to be assigned.
     */
    importFile(file, plasmidIndex=null) {
        return new Promise((resolve, reject) => {
            // Get filename+extension from path
            const fileNameExtension = file.name.match(/[^\\/]*$/)[0];
            // Fish out file extension of the file
            const fileExtension =  /\.([0-9a-z]+)(?:[\?#]|$)/i.exec(fileNameExtension)[0];
            const fileName = fileNameExtension.replace(fileExtension, "");

            // Check if file type is supported.
            if (![".gbk", ".gb", ".dna", ".fasta"].includes(fileExtension)) {
                console.error("Unsupported file type.")
                return
            };

            // Initialise file reader
            const reader = new FileReader();
            
            // Define reader
            reader.onload = function(e) {
                // Read file content
                let fileContent = e.target.result;
                // Parse file
                let parsedFile = FileIO.parsers[fileExtension.replace(".", "")](fileContent);
        
                Session.addPlasmid(new Plasmid(
                plasmidIndex,
                fileName,
                fileExtension,
                parsedFile.fileSequence,
                parsedFile.fileFeatures,
                parsedFile.fileTopology,
                parsedFile.fileAdditionalInfo
                ));
            };
            
            // Run reader
            if (fileExtension === ".dna") {
                reader.readAsArrayBuffer(file);
            } else {
                reader.readAsText(file);
            };
            
            setTimeout(() => {
              resolve();
            }, 1); 
        });
    };


    /**
     * Imports the demo pET-28a(+).dna file.
     */
    async importDemoFile() {
        const filePath = "\\static\\plasmids\\pET-28a(+).dna"
        const response = await fetch(filePath);
        const blob = await response.blob();
        const file = new File([blob], filePath.split('\\').pop());
        FileIO.importFile(file);
    };


    /**
     * Handles file selection functionality.
     * 
     * @param {Object} event - File select event.
     * @param {int} plasmidIndex - Index for imported plasmid.
     * @param {string} serverFile - 
     */
    async fileSelect(event, plasmidIndex=0, serverFile=null, ) {
        if (serverFile) {
            const response = await fetch(serverFile);
            const blob = await response.blob();
            const file = new File([blob], serverFile.split('\\').pop());
            importFile(file, plasmidIndex);
        } else {
            importQueue(event.target.files)
        };
    };


    /**
     * Handles importing of multiple files.
     * 
     * @param {Array} filesList - List of files to import.
     */
    importQueue(filesList) {
        const startingPlasmidIndex = Session.nextFreeIndex();
        addLoadingCursor();
        let importTasks = []
        for (let i = 0; i < filesList.length; i++) {
          importTasks.push(importFile(filesList[i], startingPlasmidIndex + i));
        };
        
        Promise.all(importTasks).then(() => removeLoadingCursor())
    };


    /**
     * Dictionary of parsers.
     */
    parsers = {
        /**
         * Snapgene .dna file parser.
         * 
         * @param {Array} fileArrayBuffer - Array buffer from imported file.
         * @returns 
         */
        dna : (fileArrayBuffer) => {
            // Read array as list of 8 bit integers
            const arrayBuf = new Uint8Array(fileArrayBuffer);
            
            // Decode file content as string
            let fileContent = new TextDecoder().decode(arrayBuf);

            // Read file sequence length from bytes [20,23]
            const sequenceLengthHex = Array.from(arrayBuf.slice(20, 24)).map(byte => (byte.toString(16)));
            const sequenceLength = parseInt(sequenceLengthHex.join(" ").replace(/\s/g, ''), 16);
            //console.log("parseDNAFile ->", sequenceLength, sequenceLengthHex, arrayBuf.slice(20, 24));
            
            // Extract sequence type and topology
            // ss+lin = 00, ss+circ=01, ds+lin=02, ds+circ=03, then it repeats the same pattern
            const fileTopologyByte = arrayBuf.slice(24,25);
            const fileTopology = ([0,2].includes(fileTopologyByte % 4)) ? "linear": "circular";
            
            // Extract sequence [25, 25+sequenceLength] 
            const sequenceStartIndex = 25;
            let sequenceBytes = arrayBuf.slice(sequenceStartIndex, sequenceStartIndex + sequenceLength);
            let fileSequence = new TextDecoder().decode(sequenceBytes);
            fileSequence = nucleotides.sanitizeSequence(fileSequence);
            let fileComplementarySequence = nucleotides.complementary(fileSequence);


            // Init XML parser
            const xmlParser = new DOMParser();

            /**
             * Extract features
             */
            // Extract XML tree
            let featuresXMLString = fileContent.slice(fileContent.indexOf("<Features"), fileContent.indexOf("</Feature></Features>") + "</Feature></Features>".length);
            const featuresXMLDoc = xmlParser.parseFromString(featuresXMLString, 'text/xml');

            /**
             * XML Structure
             * 
             *  <Features
                    nextValidID="1" <- next available id for a new feature
                >
                    <Feature
                        recentID="0" <- feature id
                        name="thrombin site" <- label
                        directionality="1" <- 1 for fwd; 2 for reverse; no entry for static
                        translationMW="627.76" <- not required
                        type="CDS" <- feature type
                        swappedSegmentNumbering="1"
                        allowSegmentOverlaps="0"
                        cleavageArrows="248"
                        readingFrame="-1"
                        consecutiveTranslationNumbering="1"
                        maxRunOn="123"
                        maxFusedRunOn="123"
                        detectionMode="exactProteinMatch"
                    >
                        <Segment
                            range="243-260" <- feature span
                            color="#cc99b2" <- feature color (usually something ugly)
                            type="standard" <- never seen anything but standard
                            translated="1" <- indicate if should be translated, no entry if not translated
                        />
                        <Q name="codon_start">
                            <V int="1"/>
                        </Q>
                        <Q name="product"> <- product information (not note!)
                            <V text="&lt;html&gt;&lt;body&gt;thrombin recognition and cleavage site&lt;/body&gt;&lt;/html&gt;"/>
                        </Q>
                        <Q name="transl_table"> <- required if translated,
                            <V int="1"/>
                        </Q>
                        <Q name="translation"> <- if translated, provide translated sequence
                            <V text="LVPRGS"/>
                        </Q>
                    </Feature>
                </Features>
             */
            
            // Initialize dict and iterate over all feature elements in the object
            let featuresDict = {};
            const xmlFeaturesEntries = featuresXMLDoc.getElementsByTagName('Feature');
            for (let i = 0; i < xmlFeaturesEntries.length; i++) {
                const featureXML = xmlFeaturesEntries[i]; // Current feature
                const featureId = getUUID();

                // All the feature properties
                const featureInfo = {}
                featureInfo["type"] = featureXML.getAttribute('type');
                featureInfo["label"] = featureXML.getAttribute('name'); // Display name
                const spanDirectionality = featureXML.getAttribute('directionality');
                featureInfo["span"] = "";
                featureInfo["note"] = "";

                // Iterate over xml children to find properties
                const featureChildren = featureXML.children;
                for (let j = 0; j < featureChildren.length; j++) {
                    const child = featureChildren[j]; // Current child
                    const childName = child.nodeName; // Get the node name

                    // Nodes with the name "Segment" contain:
                    // span, color, type, translated
                    if (childName === "Segment") {
                        let currSpan = child.getAttribute('range').split("-"); // Get span and split into list
                        // Add span to feature info
                        featureInfo["span"] = currSpan[0] + ".." + currSpan[1];
                        if (spanDirectionality !== "1") {
                            featureInfo["span"] = "complement(" + featureInfo["span"] + ")";
                        };
                        // Extract color
                        featureInfo["color"] = child.getAttribute('color');
                    };
                    // Nodes with the name "Q" contain:
                    // feature name, "V" nodes (contains the note text or a number)
                    if (childName === "Q") {
                        const subNoteName = child.getAttribute('name'); // Get name
                        let subNoteEntry = "";
                        // If the V node is an int
                        if (child.children[0].attributes.getNamedItem("int")) {
                            subNoteEntry = child.children[0].getAttribute("int");
                        }
                        // If the V node has text
                        if (child.children[0].attributes.getNamedItem("text")) {
                            subNoteEntry = child.children[0].getAttribute("text"); // Get text entry
                            subNoteEntry = new DOMParser().parseFromString(subNoteEntry, 'text/html').body.textContent; // Sometimes the text contains html
                        }
                        // Save note to the dict
                        featureInfo[subNoteName] = subNoteEntry;
                    };
                };
                featureInfo["note"] = featureInfo["note"].trim();

                // Append feature info the corresponding feature in the dict
                featuresDict[featureId] = featureInfo;
            };

            /**
             * Extract primers
             */
            // Extract XML tree
            let primersXMLString = fileContent.slice(fileContent.indexOf("<Primers"), fileContent.indexOf("</Primer></Primers>") + "</Primer></Primers>".length);
            const primersXMLDoc = xmlParser.parseFromString(primersXMLString, 'text/xml');

            const primersList = primersXMLDoc.getElementsByTagName('Primer');
            for (let i = 0; i < primersList.length; i++) {
                const primer = primersList[i]; // Current feature
                const primerId = getUUID();

                // All the feature properties
                const primerInfo = {};
                primerInfo["type"] = "primer_bind";
                primerInfo["label"] = primer.getAttribute('name'); // Display name
                primerInfo["note"] = (primer.getAttribute('description') && primer.getAttribute('description') !== undefined) ? primer.getAttribute('description').replace("<html><body>", "").replace("</body></html>", ""): "";
                const primerBindingSite = primer.getElementsByTagName("BindingSite")[0];
                const primerSpanDirection = primerBindingSite.getAttribute('boundStrand');
                const primerSpanString = primerBindingSite.getAttribute('location').replace("-", "..");
                const primerSpanList = removeNonNumeric(primerSpanString).split("..").map(Number);
                console.log("parseDNAFile", primerSpanList)

                primerInfo["span"] = (primerSpanDirection == "0") ? `${primerSpanList[0] + 1}..${primerSpanList[1] + 1}`: `complement(${primerSpanList[0] + 1}..${primerSpanList[1] + 1})`;
                console.log("parseDNAFile", primerInfo["span"])
                primerInfo["phosphorylated"] = primer.hasAttribute("phosphorylated");

                // Append feature info the corresponding feature in the dict
                featuresDict[primerId] = primerInfo;
            };

            console.log(featuresDict)
            const fileFeatures = sortBySpan(featuresDict);

            /**
             * Additional info to keep when exporting back to .dna
             */
            // TO DO: Keep unknown bytes, restriction enzyme list, notes info, primers etc
            let fileAdditionalInfo = {};
            return {
                fileSequence,
                fileComplementarySequence,
                fileFeatures,
                fileTopology,
                fileAdditionalInfo
            };
        },
        
        gb : (fileContent) => {
            return;
        },
        
        fasta : (fileContent) => {
            return;
        }
    };


    /**
     * Creates a new plasmid object from user input specified in the new
     * file popup window.
     * 
     * @returns 
     */
    newFileFromSequence() {
        // Get sequence info
        const newFileName = document.getElementById("new-file-name-input").value;
        const newFileSequenceInput = document.getElementById("new-file-sequence-input").value;
        const newFileTopology = document.getElementById("new-file-topology-select").value;
        const detectCommonFeatures = document.getElementById("new-file-annotate-features-checkbox").checked;
        // Hide and reset window
        FileIO.resetNewFilePopupWindow();
    
        /** 
         * Generate plasmid object
         */
        // Sanitize sequence
        const newFileSequence = nucleotides.sanitizeSequence(newFileSequenceInput);
        
        // Get complementary sequence 3'->5'!
        const newFileComplementarySequence = nucleotides.complementary(newFileSequence);
        
        // Initialize features dict with default
        let newFileFeatures = {
            "LOCUS": {
            label: "",
            note: "",
            span: ""
            }
        };
        
        // Detect common features
        if (detectCommonFeatures === true) {
            // Check for common features first in the forward strand then
            // then once more for the complementary strand
            for (let i = 0; i < 2; i++) {
                // Select current sequence in 5'->3'
                const currentSequence = (i === 0) ? newFileSequence: newFileComplementarySequence.split("").reverse().join("");
                
                // Iterate over all features in the database and check if
                // they are present
                for (const commonFeatureIndex in commonFeatures) {
                    // Get current feature info
                    const commonFeatureDict = commonFeatures[commonFeatureIndex];
                    const featureLabel = commonFeatureDict["label"];
                    const featureSequenceType = commonFeatureDict["sequence type"];
                    const featureSequence = commonFeatureDict["sequence"];
                    
                    // Initialize regex
                    const regex = new RegExp(featureSequence, 'g');
                    let match;
        
                    // Check if a feature with the same name is already present and
                    // save its span
                    const similarFeatures = [];
                    // Iterate over the values in the dictionary
                    Object.values(newFileFeatures).forEach((feature) => {
                        if (feature.label == featureLabel) {
                            similarFeatures.push(feature.span);
                        };
                    });
                    //console.log("similarFeatures", featureLabel, similarFeatures);
        
                    /**
                     * If checking for amino acid sequence
                     */
                    if (featureSequenceType === "AA") {
                        // Generate reading frames offset by 1 nucleotide
                        const readingFrames = [
                            nucleotides.translate(currentSequence),
                            nucleotides.translate(currentSequence.slice(1) + currentSequence.slice(0, 1)),
                            nucleotides.translate(currentSequence.slice(2) + currentSequence.slice(0, 2))
                        ];
                        // Iterate over reading frames and check for features
                        for (let j = 0; j < 3; j++) {
                            // While there are matches
                            while ((match = regex.exec(readingFrames[j])) !== null) {
                                // Generate new feature info
                                const newFeatureId = getUUID();
                                const newFeatureDirectionality = (i === 0) ? "fwd": "rev";
                                const newFeatureSpanStart = (i === 0) ? match.index*3 + j + 1: currentSequence.length - j - match.index*3 - featureSequence.length*3 + 1;
                                const newFeaturSpanEnd = newFeatureSpanStart + featureSequence.length*3 - 1;
                                const newFeatureSpan = [newFeatureSpanStart, newFeaturSpanEnd];
                                
                                // Check if any feature in similarFeatures has an
                                // overlapping span with the new feature. If there's
                                // at least one hit, do not add the new feature.
                                let canAdd = true;
                                Object.values(similarFeatures).forEach((similarFeatureSpan) => {
                                    if (similarFeatureSpan[0] <= newFeatureSpanStart && newFeaturSpanEnd <= similarFeatureSpan[1]) {
                                        canAdd = false;
                                    };
                                });
                
                                // Add new feature.
                                if (canAdd) {
                                    newFileFeatures[newFeatureId] = {
                                        label: featureLabel,
                                        type: commonFeatureDict["type"],
                                        directionality: newFeatureDirectionality,
                                        span: newFeatureSpan,
                                        translation: featureSequence,
                                        note: (commonFeatureDict["note"] !== null) ? commonFeatureDict["note"]: "",
                                        color: generateRandomUniqueColor()
                                    };
                                };
                            };
                        };

                    /**
                     * If checking for DNA sequence
                     */
                    } else if (featureSequenceType === "DNA") {
                        // While there are matches
                        while ((match = regex.exec(currentSequence)) !== null) {
                            // Generate new feature info
                            const newFeatureId = getUUID();
                            const newFeatureDirectionality = (i === 0) ? "fwd": "rev";
                            const newFeatureSpanStart = (i === 0) ? match.index + 1: currentSequence.length - match.index - featureSequence.length + 1;
                            const newFeaturSpanEnd = newFeatureSpanStart + featureSequence.length - 1;
                            const newFeatureSpan = [newFeatureSpanStart, newFeaturSpanEnd];
                            
                            
                            // Check if any feature in similarFeatures has an
                            // overlapping span with the new feature. If there's
                            // at least one hit, do not add the new feature.
                            let canAdd = true;
                            Object.values(similarFeatures).forEach((similarFeatureSpan) => {
                                if (similarFeatureSpan[0] <= newFeatureSpanStart && newFeaturSpanEnd <= similarFeatureSpan[1]) {
                                    canAdd = false;
                                };
                            });
            
                            // Add new feature.
                            if (canAdd) {
                                newFileFeatures[newFeatureId] = {
                                    label: featureLabel,
                                    type: commonFeatureDict["type"],
                                    directionality: newFeatureDirectionality,
                                    span: newFeatureSpan,
                                    note: (commonFeatureDict["note"] !== null) ? commonFeatureDict["note"]: "",
                                    color: generateRandomUniqueColor()
                                };
                            };
                        };
                    };
                };
            };
    
            newFileFeatures = sortBySpan(newFileFeatures);
        };
    
        // Add plasmid object to project
        Session.addPlasmid(new Plasmid(
            null, // index
            newFileName,
            ".gb", // extension
            newFileSequence,
            newFileFeatures,
            newFileTopology,
            null // additional info
        ));
    };


    /**
     * Resets inputs of the new file popup window to defaults.
     */
    resetNewFilePopupWindow() {
        // Hide window
        PopupWindow.hide("new-file-window");
            
        // Reset inputs
        document.getElementById("new-file-name-input").value = "untitled";
        document.getElementById("new-file-sequence-input").value = "";
    };
};


/**
 * Load common features database
 */
let commonFeatures;
fetch('static/commonFeatures.json')
    .then(response => response.json())
    .then(json => {
        commonFeatures = json;
    });


/**
 * Generates a random UUID.
 * 
 * @returns - UUID string
 */
function getUUID() {
    const uuidSegments = [];
    
    for (let i = 0; i < 36; i++) {
        if (i === 8 || i === 13 || i === 18 || i === 23) {
            uuidSegments[i] = '-';
        } else if (i === 14) {
            uuidSegments[i] = '4'; // The version 4 UUID identifier
        } else if (i === 19) {
            // The first character of this segment should be 8, 9, A, or B
            uuidSegments[i] = (Math.random() * 4 + 8 | 0).toString(16);
        } else {
            // Generate a random hex digit
            uuidSegments[i] = (Math.random() * 16 | 0).toString(16);
        };
    };
    
    // Combine the segments into a single string
    return uuidSegments.join('');
};


/**
 * 
 * @param {*} recentColor 
 * @returns 
 */
function generateRandomUniqueColor(recentColor="") {
    const remainingColors = defaultAnnotationColors.filter(color => color !== recentColor);
    const randomIndex = Math.floor(Math.random() * remainingColors.length);
    const randomColor = remainingColors[randomIndex];

    return randomColor;
};