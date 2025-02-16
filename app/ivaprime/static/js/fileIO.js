const FileIO = new class {
    /**
     * Import file, read contents and pass to appropriate parser.
     * 
     * @param {Object} file - File object. 
     * @param {int} plasmidIndex - Plasmid index to be assigned.
     */
    //#region Import single file
    importFile(file, plasmidIndex=null) {
        return new Promise((resolve, reject) => {
            // Get filename+extension from path
            const fileNameExtension = file.name.match(/[^\\/]*$/)[0];
            // Fish out file extension of the file
            const fileExtension =  /\.([0-9a-z]+)(?:[\?#]|$)/i.exec(fileNameExtension)[0];
            const fileName = fileNameExtension.replace(fileExtension, "");

            // Check if file type is supported.
            if (![".gbk", ".gb", ".dna", ".fasta"].includes(fileExtension)) {
                console.error("Unsupported file type.");
                return;
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
    //#region Import the demo file
    async importDemoFile() {
        const filePath = "\\static\\plasmids\\pET-28a(+).dna"
        const response = await fetch(filePath);
        const blob = await response.blob();
        const file = new File([blob], filePath.split('\\').pop());
        
        this.importFile(file);
    };


    /**
     * Opens the file browser when clicking on the "Import File" button.
     * Creates a temporary file input element and clicks it.
     * 
     * @param {*} event 
     */
    //#region "Import File" button callback
    importFileButton(event) {
        event.preventDefault();
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        fileInput.addEventListener('change', function(event) {
          FileIO.importQueue(event.target.files);
        });
        fileInput.click();
    };


    /** 
     * Drag and drop import
     */
    importDragOver(e) {
        e.preventDefault();
        document.body.classList.add('drag-import-overlay');
    };
    
    importDragLeave(e) {
        e.preventDefault();
        document.body.classList.remove('drag-import-overlay');
    };
    
    async importDrop(e) {
        e.preventDefault();
        document.body.classList.remove('drag-import-overlay');
    
        this.importQueue(e.dataTransfer.files);
    };


    /**
     * Handles importing of single or multiple files.
     * 
     * @param {Array} filesList - List of files to import.
     */
    //#region Import queue
    importQueue(filesList) {
        // Change cursor to loading
        this.addLoadingCursor();

        // Iterate over files list and prepare import tasks with
        // predetermined plasmid indices
        const startingPlasmidIndex = Session.nextFreeIndex();
        let importTasks = []
        for (let i = 0; i < filesList.length; i++) {
            importTasks.push(
                this.importFile(
                    filesList[i],
                    startingPlasmidIndex + i
                )
            );
        };
        
        // Execute tasks then remove loading cursor
        Promise.all(importTasks).then(() => this.removeLoadingCursor())
    };


    /**
     * Dictionary of parsers.
     */
    //#region File parsers
    parsers = {
        /**
         * Snapgene .dna file parser.
         * 
         * @param {Array} fileArrayBuffer - Array buffer from imported file.
         * @returns {
         *      fileSequence,
         *      fileComplementarySequence,
         *      fileFeatures,
         *      fileTopology,
         *      fileAdditionalInfo
         * }
         */
        //#region SNAPGENE (.DNA) 
        dna : (fileArrayBuffer) => {
            // Read array as list of 8 bit integers
            const arrayBuf = new Uint8Array(fileArrayBuffer);
            // Decode file content as string
            let fileContent = new TextDecoder().decode(arrayBuf);
            // Init XML parser
            const xmlParser = new DOMParser();
            

            /**
             * SEQUENCE
             */
            //#region SEQUENCE
            // Read file sequence length from bytes [20,23]
            const sequenceLengthHex = Array.from(arrayBuf.slice(20, 24)).map(byte => (byte.toString(16)));
            const sequenceLength = parseInt(sequenceLengthHex.join(" ").replace(/\s/g, ''), 16);
            
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
            //#endregion


            /**
             * FEATURES
             */
            //#region FEATURES
            // Extract XML tree
            let featuresXMLString = fileContent.slice(fileContent.indexOf("<Features"), fileContent.indexOf("</Feature></Features>") + "</Feature></Features>".length);
            const featuresXMLDoc = xmlParser.parseFromString(featuresXMLString, 'text/xml');

            /**
             * XML Structure
             * 
             *  <Features
                    nextValidID="1" <- next available id/index for a new feature
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
                        <Q name="codon_start"> ?
                            <V int="1"/>
                        </Q>
                        <Q name="product"> <- product information (not note!)
                            <V text="&lt;html&gt;&lt;body&gt;thrombin recognition and cleavage site&lt;/body&gt;&lt;/html&gt;"/>
                        </Q>
                        <Q name="transl_table"> <- required if translated?
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
                const featureId = getUUID(); // Create UUID

                // All the feature properties
                const featureInfo = {}
                featureInfo["type"] = featureXML.getAttribute('type'); // Type (CDS, RBS etc)
                featureInfo["label"] = featureXML.getAttribute('name'); // Display name
                // Get feature directionaliy, fwd, rev, or null
                featureInfo["directionality"] = {"1": "fwd", "2": "rev"}[featureXML.getAttribute('directionality')] || null;
                featureInfo["span"] = "";
                featureInfo["note"] = "";

                // Iterate over xml children to find properties
                const featureChildren = featureXML.children;
                for (let j = 0; j < featureChildren.length; j++) {
                    const child = featureChildren[j]; // Current child

                    switch(child.nodeName) {
                        // Nodes with the name "Segment" contain:
                        // span, color, type, translated
                        case "Segment":
                            // Get span and split into list
                            let currSpan = child.getAttribute('range').split("-");
                            // Add span to feature info
                            featureInfo["span"] = currSpan.map((s) => parseInt(s));
                            
        
                            // Extract color
                            featureInfo["color"] = child.getAttribute('color');
        
                            break;

                        // Nodes with the name "Q" and its "V" children are "Query-Value" nodes
                        // Basically dictionary key and value
                        // codon_start: int (?)
                        // product: text (string, note about gene product)
                        // transl_table: int (boolean, ?)
                        // translation: text (string, AA sequence of product)
                        case "Q":
                            // Get query name
                            const subNoteName = child.getAttribute('name');
        
                            // Value node
                            const V = child.children[0];
                            Array.from(V.attributes).forEach((attr) => {
                                switch(attr.name) {
                                    case "int":
                                        featureInfo[attr.name] = parseInt(attr.value);
                                        break;
                                    case "text":
                                        // Sometimes the text has html so we need to deal with it
                                        featureInfo[attr.name] = new DOMParser().parseFromString(attr.value, 'text/html').body.textContent.trim();
                                        break;
                                }
                            });
                            break;
                    };
                };

                // Append feature info dict the corresponding feature in the dict
                featuresDict[featureId] = featureInfo;
            };
            //#endregion


            /**
             * PRIMERS
             */
            //#region PRIMERS
            // Extract XML tree string
            let primersXMLString = fileContent.slice(fileContent.indexOf("<Primers"), fileContent.indexOf("</Primer></Primers>") + "</Primer></Primers>".length);
            // Parse string to XML tree
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
            //#endregion

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
        

        /**
         * Genbank .dna file parser.
         * 
         * @param {Array} fileContent - Array buffer from imported file.
         * @returns {
        *      fileSequence,
        *      fileComplementarySequence,
        *      fileFeatures,
        *      fileTopology,
        *      fileAdditionalInfo
        * }
        */
       //#region GENBANK (.GB) 
        gb : (fileContent) => {
            //console.log(`FileIO.parsers.gb -> fileContent=${fileContent}`)
            //#region SEQUENCE
            const originSection = fileContent.match(/ORIGIN[\s\S]*?\n([\s\S]*?)\n\/\//);
            //console.log(`FileIO.parsers.gb -> originSection=${originSection}`)
            if (!originSection) {
                console.error("No sequence found in .gb file");
                return;
            };
            const sequenceSegments = originSection[0].match(/(?<=\s)[a-z]{1,10}(?=\s)/gi)
            let fileSequence = sequenceSegments.join("").toUpperCase();
            const fileComplementarySequence = nucleotides.complementary(fileSequence);

            //#region FEATURES
            const fileFeatures = {};

            let featuresSection = fileContent.match(/FEATURES[\s\S]*ORIGIN/)[0];
            featuresSection = featuresSection.split("\n");
            featuresSection = featuresSection.splice(1, featuresSection.length - 2);
            featuresSection = featuresSection.join("\n") + "\n";
            //console.log(`FileIO.parsers.gb -> featuresSection=${featuresSection}`);

            const featuresStrings = featuresSection.match(/\s{5}\S+\s*(?:complement\()?\d+\.\.\d+\)?\s(?:\s{21}[\s\S]*?\n)*/gm)
            //console.log(`FileIO.parsers.gb -> featuresStrings=${featuresStrings}`);
            featuresStrings.forEach((featureString) => {
                const featureDict = {}

                const firstLineMatches = /\s{5}(\S+)\s*((?:complement\()?(\d+)\.\.(\d+)\)?)\s/.exec(featureString);
                console.log(`FileIO.parsers.gb -> firstLineMatches=${firstLineMatches}`);

                featureDict["type"] = firstLineMatches[1];
                if (featureDict["type"] == "source") {return};
                
                featureDict["label"] = featureDict["type"];
                featureDict["color"] = generateRandomUniqueColor();
                
                const featureSpanString = firstLineMatches[2];
                featureDict["span"] = [parseInt(firstLineMatches[3]), parseInt(firstLineMatches[4])]
                featureDict["directionality"] = (!featureSpanString.includes("complement")) ? "fwd" : "rev";
            
                let regex = /^\s{21}\/(\w+)=((?:"[\s\S]*?")|(?:[^\s]+))/gm;
                let match;
                while ((match = regex.exec(featureString)) !== null) {
                    let key = match[1].trim();
                    let value = match[2].replace(/\s+/g, " ").trim();
                    
                    // Remove surrounding quotes
                    if (value.startsWith('"') && value.endsWith('"')) {
                        value = value.slice(1, -1);
                    };
                    
                    // Convert numeric values to numbers if possible
                    if (!isNaN(value) && Number.isInteger(Number(value))) {
                        value = parseInt(value, 10);
                    };
                    
                    featureDict[key] = value;
                };
                
                console.log(`FileIO.parsers.gb -> featureDict=${JSON.stringify(featureDict)}`);

                fileFeatures[getUUID()] = featureDict;
            });

            const fileTopology = (fileContent.split("")[0].includes("linear")) ? "linaer": "circular";
            const fileAdditionalInfo = {};

            return {
                fileSequence,
                fileComplementarySequence,
                fileFeatures,
                fileTopology,
                fileAdditionalInfo
            };
        },
        

        /**
         * Fasta .fasta file parser.
         * 
         * @param {Array} fileContent - Array buffer from imported file.
         * @returns {
        *      fileSequence,
        *      fileComplementarySequence,
        *      fileFeatures,
        *      fileTopology,
        *      fileAdditionalInfo
        * }
        */
       //#region FASTA (.FASTA) 
        fasta : (fileContent) => {
            console.log(`FileIO.parser.fasta -> fileContent=${fileContent}`);
            const lines = fileContent.split("\n");

            if (lines.length < 2) {console.error("Could not read sequence in FASTA file.")};

            console.log(`FileIO.parser.fasta -> lines=${lines}`);
            const fileSequence = lines[1];

            if (!nucleotides.isNucleotideSequence(fileSequence)) {
                console.error("FASTA sequence contains non-nucleotide codes.");
                return;
            };

            const fileComplementarySequence = nucleotides.complementary(fileSequence);
            
            const fileFeatures = {};
            
            const fileTopology = "linear";
            const fileAdditionalInfo = null;

            return {
                fileSequence,
                fileComplementarySequence,
                fileFeatures,
                fileTopology,
                fileAdditionalInfo
            };
        }
    };


    /**
     * Dictionary of exporters.
     */
    //#region File exporters
    exporters = {
        /**
         * Snapgene .dna file exporter.
         * 
         * @param {int} plasmidIndex - Index of plasmid to be exported.
         */
        //#region SNAPGENE (.DNA) 
        dna: (plasmidIndex) => {
            const targetPlasmid = Session.getPlasmid(plasmidIndex);
        },


        /**
         * Genbank .gb file exporter.
         * 
         * @param {int} plasmidIndex - Index of plasmid to be exported.
         */
        //#region GENBANK (.GB) 
        gb: (plasmidIndex) => {
            const targetPlasmid = Session.getPlasmid(plasmidIndex);
        },


        /**
         * Fasta .fasta file exporter.
         * 
         * @param {int} plasmidIndex - Index of plasmid to be exported.
         */
        //#region FASTA (.FASTA) 
        fasta: (plasmidIndex) => {
            const targetPlasmid = Session.getPlasmid(plasmidIndex);
            console.log(`FileIO.exports.fasta -> ${plasmidIndex} ${targetPlasmid.name}`)

            this.downloadFile(
                targetPlasmid.name + ".fasta",
                `>${targetPlasmid.name}\n${targetPlasmid.sequence}`
            );
        }
    };


    /**
     * Download file by creating a blob and saving it.
     * 
     * @param {string} fileName - Name of the output file + extension
     * @param {string} fileContent - Content of output file, either string or array of bytes
     */
    downloadFile(fileName, fileContent) {
        const fileExtension = fileName.split('.').pop();

        let blob = (fileExtension === "dna") 
            ? new Blob([new Uint8Array(fileContent)]) 
            : new Blob([fileContent], { type: "text/plain" });

        saveAs(blob, fileName);
    };



    /**
     * Creates a new plasmid object from user input specified in the new
     * file popup window.
     * 
     * @returns 
     */
    //#region New file from sequence
    newFileFromSequence() {
        // Get sequence info
        const newFileName = document.getElementById("new-file-name-input").value;
        const newFileSequenceInput = document.getElementById("new-file-sequence-input").value;
        const newFileTopology = document.getElementById("new-file-topology-select").value;
        const detectCommonFeatures = document.getElementById("new-file-annotate-features-checkbox").checked;
        // Hide and reset window
        this.resetNewFilePopupWindow();
    
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


    /**
     * Change cursor to loading by adding a loading-wrapper
     * and setting its css style to the loading cursor
     */ 
    addLoadingCursor() {
        const loadingWrapper = document.createElement('div');
        loadingWrapper.id = "loading-wrapper";
        loadingWrapper.classList.add("loading-wrapper")
        loadingWrapper.addEventListener('mouseenter', function() {
            this.style.cursor = 'wait';
        });
        document.body.appendChild(loadingWrapper);
    };


    /**
     * Reset cursor icon by removing the loading-wrapper div
     */
    removeLoadingCursor() {
        const loadingWrapper = document.getElementById("loading-wrapper")
        if (loadingWrapper && loadingWrapper.parentNode) {
            loadingWrapper.parentNode.removeChild(loadingWrapper);
        };
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