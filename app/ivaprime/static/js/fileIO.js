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
            let fileExtension =  "." + fileNameExtension.split(".").pop();
            const fileName = fileNameExtension.replace(fileExtension, "");

            // Check if file type is supported.
            if (![".gbk", ".gb", ".dna", ".fasta"].includes(fileExtension)) {
                Alerts.error(
                    `Unsupported file type: ${fileNameExtension}`,
                    "The file type you selected is not supported. Please upload a file with one of the following extensions: .gbk, .gb, .dna, or .fasta."
                );
                console.error("Unsupported file type.");
                resolve();
                return;
            };

            fileExtension = (fileExtension == ".gbk") ? ".gb": fileExtension;

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
            }, 1000); 
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
        
        this.importFile(file);
    };


    /**
     * Opens the file browser when clicking on the "Import File" button.
     * Creates a temporary file input element and clicks it.
     * 
     * @param {*} event 
     */
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
        dna : (fileArrayBuffer) => {
            // Read array as list of 8 bit integers
            const arrayBuf = new Uint8Array(fileArrayBuffer);
            // Decode file content as string
            let fileContent = new TextDecoder().decode(arrayBuf);
            // Init XML parser
            const xmlParser = new DOMParser();
            

            // #region Sequence
            // Read file sequence length from bytes [20,23]
            //const sequenceLengthHex = Array.from(arrayBuf.slice(20, 24)).map(byte => (byte.toString(16)));
            const sequenceLengthHex = Array.from(arrayBuf.slice(20, 24), byte => byte.toString(16).padStart(2, "0"))
            const sequenceLength = parseInt(sequenceLengthHex.join(" ").replace(/\s/g, ''), 16);
            
            // Extract sequence type and topology
            // ss+lin = 00, ss+circ=01, ds+lin=02, ds+circ=03, then it repeats the same pattern
            const fileTopologyByte = arrayBuf.slice(24,25);
            const fileTopology = ([0,2].includes(fileTopologyByte % 4)) ? "linear": "circular";
            
            // Extract sequence [25, 25+sequenceLength] 
            const sequenceStartIndex = 25;
            let sequenceBytes = arrayBuf.slice(sequenceStartIndex, sequenceStartIndex + sequenceLength);
            let fileSequence = new TextDecoder().decode(sequenceBytes);
            fileSequence = Nucleotides.sanitizeSequence(fileSequence);
            let fileComplementarySequence = Nucleotides.complementary(fileSequence);
            // #endregion Sequence


            //#region Features
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
                const featureId = Utilities.newUUID(); // Create UUID

                // All the feature properties
                const featureInfo = {}
                featureInfo["type"] = featureXML.getAttribute('type'); // Type (CDS, RBS etc)
                if (featureInfo["type"] == "source") {continue};
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
            // #endregion Features



            // #region Primers
            // Extract XML tree string
            let primersXMLString = fileContent.slice(fileContent.indexOf("<Primers"), fileContent.indexOf("</Primer></Primers>") + "</Primer></Primers>".length);
            // Parse string to XML tree
            const primersXMLDoc = xmlParser.parseFromString(primersXMLString, 'text/xml');

            const primersList = primersXMLDoc.getElementsByTagName('Primer');
            for (let i = 0; i < primersList.length; i++) {
                const primer = primersList[i]; // Current feature
                const primerId = Utilities.newUUID();

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
            // #endregion Primers
            
            const fileFeatures = Utilities.sortFeaturesDictBySpan(featuresDict);


            /**
             * Notes
             */
            // #region Notes
            let fileAdditionalInfo = [];

            const treeName = "Notes"
            let notesXMLString = fileContent.slice(fileContent.indexOf(`<${treeName}>`), fileContent.indexOf(`</${treeName}>`) + treeName.length + 3);
            const notesXMLDoc = xmlParser.parseFromString(notesXMLString, 'text/xml');
            const notesElement = notesXMLDoc.querySelector("Notes");
            for (let child of notesElement.children) {
                let key = child.tagName;
                let value = child.textContent;
                
                if (key == "Created") {
                    key = "CREATED";
                    const dateParts = value.split(".").map(Number);
                    value = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
                    
                    const time = child.getAttribute("UTC");
                    const timeParts = time.split(":").map(Number);
                    value.setUTCHours(timeParts[0], timeParts[1], timeParts[2], 0);
                };
                console.log(`FileIO.parsers.dna -> Notes k=${key} v=${value}`);
                

                fileAdditionalInfo.push(
                    {
                        "name": key,
                        "entry": value
                    }
                );
            };
            // #endregion Notes


            /**
             * Additional info to keep when exporting back to .dna
             */
            // TO DO: Keep unknown bytes, restriction enzyme list, notes info, primers etc
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
        gb : (fileContent) => {
            // #region Additional_info
            const fileTopology = (fileContent.split("")[0].includes("linear")) ? "linear": "circular";

            const fileAdditionalInfo = {};

            const additionalInfoMatch = (fileContent.includes("FEATURES")) ? fileContent.match(/LOCUS[\s\S]*FEATURES/)[0]: fileContent.match(/LOCUS[\s\S]*ORIGIN/)[0];
            if (additionalInfoMatch) {
                let additionalInfoSection = additionalInfoMatch.split(/\r?\n/).slice(0,-1);

                const keyRegex = /^([A-Z]+)\s+(.*)$/;
                const subKeyRegex = /^\s{2}([A-Z]+)\s+(.*)$/;
                const referenceRegex = /^REFERENCE\s+(\d+)\s+\(bases\s+(\d+)\s+to\s+(\d+)\)/;

                const referenceList = [];
                let currentKey = null;
                let currentEntry = null;
                let insideReference = false;
                let referenceBuffer = {};
                for (let line of additionalInfoSection) {
                    line = line.trim();
                    if (!line) continue;
            
                    let keyMatch = line.match(keyRegex);
                    let subKeyMatch = line.match(subKeyRegex);
                    let referenceMatch = line.match(referenceRegex);
            
                    if (referenceMatch) {
                        if (Object.keys(referenceBuffer).length > 0) {
                            referenceList.push(referenceBuffer);
                        };
            
                        referenceBuffer = {
                            span: [parseInt(referenceMatch[2], 10), parseInt(referenceMatch[3], 10)]
                        };

                        insideReference = true;
                        continue;
                    }
            
                    if (keyMatch && !insideReference) {

                        if (currentKey && currentKey !== "LOCUS") {
                            fileAdditionalInfo[currentKey] = currentEntry;
                        };
            
                        currentKey = keyMatch[1];
                        currentEntry = {
                            value: keyMatch[2].trim(),
                            children: null
                        };
                        continue;
                    };
            
                    if (subKeyMatch && currentKey && !insideReference) {
                        let subKey = subKeyMatch[1];
                        let subValue = subKeyMatch[2];
            
                        if (!currentEntry.children) {
                            currentEntry.children = {};
                        };
            
                        currentEntry.children[subKey] = {
                            value: subValue,
                            children: null
                        };
                        continue;
                    };
            
                    if (insideReference) {
                        let refParts = line.split(/\s{2,}/); // Split on multiple spaces
            
                        if (refParts.length === 2) {
                            let refKey = refParts[0].trim().replace(/[^A-Z]/g, "");
                            let refValue = refParts[1].trim();
            
                            if (referenceBuffer[refKey]) {
                                referenceBuffer[refKey] += " " + refValue;
                            } else {
                                referenceBuffer[refKey] = refValue;
                            };
                        } else {
                            let lastKey = Object.keys(referenceBuffer).pop();
                            if (lastKey) {
                                referenceBuffer[lastKey] += " " + line;
                            };
                        };
                        continue;
                    };
            
                    if (currentKey && !insideReference) {
                        currentEntry.value += " " + line;
                    };
                };
            
                // Store last entries
                if (currentKey) {
                    fileAdditionalInfo[currentKey] = currentEntry;
                };
                if (Object.keys(referenceBuffer).length > 0) {
                    referenceList.push(referenceBuffer);
                };
            
                if (referenceList.length > 0) {
                    fileAdditionalInfo["REFERENCES"] = referenceList;
                };
            };

            const dateCreatedMatch = fileContent.split("\n")[0].match(/\d{2}-\w{3}-\d{4}/);
            if (dateCreatedMatch) {
                const dateCreatedString = dateCreatedMatch[0];
                const dateCreated = this.parseGBDate(dateCreatedString);
                fileAdditionalInfo["CREATED"] = {
                    "value": dateCreated,
                    "children": null
                };
            };
            // #endregion Additional_info
            console.log(`FileIO.parsers.gb -> Additional info`, JSON.stringify(fileAdditionalInfo, null, 2))


            // #region Features
            const fileFeatures = {};

            let featuresMatch = fileContent.match(/FEATURES[\s\S]*ORIGIN/);
            if (featuresMatch) {
                let featuresSection = featuresMatch[0].split("\n").slice(1, -1);

                let featureTypes = [];
                let featureData = [];

                for (let i = 0, len = featuresSection.length; i < len; i++) {
                    let line = featuresSection[i];
                    let leftCol = line.slice(0, 21).trim();
                    let rightCol = line.slice(21).replace("\r", "");

                    if (leftCol) {
                        featureTypes.push({ type: leftCol, startIndex: i });
                    };

                    featureData.push(rightCol);
                };
                featureTypes.push({ type: null, startIndex: featureData.length });
            

                for (let i = 0; i < featureTypes.length - 1; i++) {
                    const featureDict =  {};
                    featureDict["type"] = featureTypes[i].type;

                    const featureInfoLines = featureData.slice(
                        featureTypes[i].startIndex,
                        featureTypes[i + 1].startIndex
                    );
                    
                    const featureSpanMatch = featureInfoLines[0].match(/(\d+)\.\.(\d+)/);
                    if (!featureSpanMatch) continue;

                    featureDict["span"] = [parseInt(featureSpanMatch[1], 10), parseInt(featureSpanMatch[2], 10)];
                    featureDict["directionality"] = featureInfoLines[0].includes("complement") ? "rev" : "fwd";

                    const featureInfo = [];
                    let currentInfoString = "";

                    for (let j = 1, len = featureInfoLines.length; j < len; j++) {
                        const currLine = featureInfoLines[j];

                        if (/^\/[a-zA-Z\w]*=/.test(currLine)) {
                            if (currentInfoString !== "") featureInfo.push(currentInfoString);
                            currentInfoString = currLine;
                        } else {
                            currentInfoString += currLine;
                        };
                    };
                    if (currentInfoString !== "") featureInfo.push(currentInfoString);

                    console.log(`FileIO.parsers.gb -> features [${JSON.stringify(featureInfo, null, 2)}]`);

                    for (let j = 0, len = featureInfo.length; j < len; j++) {
                        let match = featureInfo[j].match(/^\/([\w\W]+)=(.*)$/);
                        if (!match) continue;

                        let key = match[1].trim();
                        let value = match[2].trim();
            
                        if (value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
                            value = value.slice(1, -1);
                        };

                        if (!isNaN(value) && Number.isInteger(Number(value))) {
                            value = parseInt(value, 10);
                        };
            
                        featureDict[key] = value;
                    };

                    console.log(`FileIO.parsers.gb -> features featureDict=\n${JSON.stringify(featureDict, null, 2)}`)
                    
                    if (featureDict["type"] === "source") continue;

                    featureDict["color"] ??= Utilities.getRandomDefaultColor();
                    featureDict["label"] ??= featureDict["type"];

                    fileFeatures[Utilities.newUUID()] = featureDict;
                };
            };
            // #endregion Features


            // #region Sequence
            const originMatch = fileContent.match(/ORIGIN[\s\S]*?\n([\s\S]*?)\n\/\//);
            if (!originMatch) {
                Alerts.error(
                    "Parsing error",
                    "No sequence could be found in the uploaded file."
                );
                console.error("No sequence found in .gb file");
                return;
            };

            const rawSequence = originMatch[1];

            const sequenceSegments = rawSequence.match(/\b[a-z]+\b/gi);


            const fileSequence = sequenceSegments.join("").toUpperCase();
            const fileComplementarySequence = Nucleotides.complementary(fileSequence);
            // #endregion Sequence

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
       //TO DO: Prompt user to specify topology and if they want common feature annotated
        fasta : (fileContent) => {
            console.log(`FileIO.parser.fasta -> fileContent=${fileContent}`);
            const lines = fileContent.split("\n");

            if (lines.length < 2) {
                Alerts.error(
                    "Parsing error",
                    "No sequence found in FASTA file."
                );
                console.error("No sequence found in FASTA file.")
            };

            console.log(`FileIO.parser.fasta -> lines=${lines}`);
            const fileSequence = lines[1];

            if (!Nucleotides.isNucleotideSequence(fileSequence)) {
                Alerts.error(
                    "Parsing error",
                    "FASTA sequence contains non-nucleotide codes."
                );
                console.error("FASTA sequence contains non-nucleotide codes.");
                return;
            };

            const fileComplementarySequence = Nucleotides.complementary(fileSequence);
            
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
     * Convert Genbank style date to a date object.
     * 
     * @param {string} dateString - Date in format "DD-MON-YYYY"
     * @returns {Date}
     */
    parseGBDate(dateString) {
        const months = {
            JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
            JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
        };

        const [day, monthStr, year] = dateString.split("-");
        const month = months[monthStr.toUpperCase()];
        return new Date(year, month, day);
    };


    /**
     * Generates a Genbank date from a Date object.
     * 
     * @param {Date} date - Date object to format
     * @returns {String} - "DD-MON-YYY"
     */
    formatToGBDate(date) {
        const months = [
            "JAN", "FEB", "MAR", "APR", "MAY", "JUN", 
            "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
        ];
        const day = String(date.getDate()).padStart(2, "0");
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };


    /**
     * Dictionary of exporters.
     */
    exporters = {
        /**
         * Snapgene .dna file exporter.
         * 
         * @param {int} plasmidIndex - Index of plasmid to be exported.
         */
        dna: (plasmidIndex) => {
            const targetPlasmid = Session.getPlasmid(plasmidIndex);
        },

        /**
         * Genbank .gb file exporter.
         * 
         * @param {int} plasmidIndex - Index of plasmid to be exported.
         */
        gb: (plasmidIndex) => {
            const targetPlasmid = Session.getPlasmid(plasmidIndex);
            const dateCreated = (targetPlasmid.additionalInfo["CREATED"]) ? targetPlasmid.additionalInfo["CREATED"]: new Date();

            let fileContent = ""


            // #region Header
            // LOCUS
            fileContent += `LOCUS       `;
            fileContent += targetPlasmid.name;
            fileContent += " ";
            fileContent += `${targetPlasmid.sequence.length} bp`;
            fileContent += " ";
            fileContent += `ds-DNA`;
            fileContent += " ".repeat(5);
            fileContent += (targetPlasmid.topology == "circular") ? "circular": "linear";
            fileContent += " ".repeat(5);
            fileContent += this.formatToGBDate(dateCreated);
            fileContent += "\n"
            // #endregion Header


            // #region Additional_info
            let leftColumnWidth = 12;
            let rightColumnWidth = 50;
            targetPlasmid.additionalInfo.forEach( property => {
                if (property["name"] == "CREATED") {return};
                fileContent += property["name"] + " ".repeat(leftColumnWidth - property["name"].length) + property["entry"] + "\n";

                if (property["subProperties"]) {
                    property["subProperties"].forEach( subProperty => {
                        fileContent += " ".repeat(2) + subProperty["name"] + " ".repeat(leftColumnWidth - subProperty["name"].length - 2);
                        
                        const entryLines = this.breakStringIntoLines(subProperty["entry"], rightColumnWidth);

                        fileContent += entryLines.join("\n" + " ".repeat(leftColumnWidth)) + "\n";
                    });
                };
            });
            // #endregion Additional_info


            // #region Features
            leftColumnWidth = 21;
            rightColumnWidth = 60;
            fileContent += "FEATURES             Location/Qualifiers\n";
            for (const [key, value] of Object.entries(targetPlasmid.features)) {
                const feature = value;

                fileContent += " ".repeat(5) + feature["type"] + " ".repeat(leftColumnWidth - feature["type"].length - 5);
                fileContent += (feature["directionality"] == "fwd")
                ? `${feature["span"][0]}..${feature["span"][1]}`
                : `complement(${feature["span"][0]}..${feature["span"][1]})`;
                fileContent += "\n";

                const featureProperties = Object.keys(feature);
                featureProperties.forEach( key => {
                    if (["directionality", "level", "span", "type"].includes(key)) {return};

                    let propertyString = `/${key}=`;
                    let propertyEntry = feature[key];
                    if (key != "label" && !Number.isInteger(propertyEntry)) {
                        propertyEntry = "\"" + propertyEntry + "\"";
                    };
                    propertyString += propertyEntry;

                    const propertyLines = this.breakStringIntoLines(propertyString, rightColumnWidth);
                    fileContent += " ".repeat(leftColumnWidth);
                    fileContent += propertyLines.join("\n" + " ".repeat(leftColumnWidth));
                    
                    fileContent += "\n";
                });
            };
            // #endregion Features


            // #region Sequence
            fileContent += "ORIGIN\n";
            const nrSequenceIndexSpaces = 9;
            const nrBasesInSegment = 10;
            const nrSegmentsPerLine = 6;
            // Iterate over lines
            for (let i = 0; i < Math.ceil(targetPlasmid.sequence.length / (nrBasesInSegment * nrSegmentsPerLine)); i++) {
                const index = i*nrBasesInSegment*nrSegmentsPerLine + 1
                const indexSegment = " ".repeat(nrSequenceIndexSpaces - index.toString().length) + index;

                const segments = [indexSegment]
                for (let j = 0; j < nrSegmentsPerLine; j++) {
                    const indexStart = i*nrBasesInSegment*nrSegmentsPerLine + j*nrBasesInSegment;
                    segments.push(targetPlasmid.sequence.slice(indexStart, indexStart + nrBasesInSegment))
                };

                fileContent += segments.join(" ") + "\n"
            };
            fileContent += "//"
            console.log(`FileIO.exporters.gb -> fileContent=\n${fileContent}`)
            // #endregion Sequence


            this.downloadFile(
                targetPlasmid.name + ".gb",
                fileContent
            );
        },


        /**
         * Fasta .fasta file exporter.
         * 
         * @param {int} plasmidIndex - Index of plasmid to be exported.
         */
        fasta: (plasmidIndex) => {
            const targetPlasmid = Session.getPlasmid(plasmidIndex);
            console.log(`FileIO.exports.fasta -> ${plasmidIndex} ${targetPlasmid.name}`)

            this.downloadFile(
                targetPlasmid.name + ".fasta",
                `>${targetPlasmid.name}\n${targetPlasmid.sequence}`
            );
        }
    };


    exportPrimers(plasmidIndex, fileType="txt") {
        const primerSets = Session.getPlasmid(plasmidIndex).primers;
        const plasmidName = Session.getPlasmid(plasmidIndex).name
        if (primerSets.length === 0) return;

        this.primerExporters[fileType](plasmidIndex, plasmidName, primerSets);
    };


    primersToTable(primerSets, includeColumnNames=false) {
        let table = [];
        if (includeColumnNames) table.push(["Primer Name", "Primer Sequence"]);

        for (let i = 0; i < primerSets.length; i++) {
            const set = primerSets[i];
            for (let j = 0; j < set.primers.length; j++) {
                const primer = set.primers[j];
                let primerSequence = ""
                for (let k = 0; k < primer.regions.length; k++) {
                    primerSequence += primer.regions[k].sequence;
                };
                table.push([primer.name, primerSequence]);
            };
        };

        return table;
    };


    /**
     * Converts integer to spreadsheet style column index
     * 1 -> A
     * 2 -> B
     * 27 -> AA etc
     * 
     * @param {number} index 
     * @returns {string}
     */
    intToSpreadsheetColumn(index) {
        let columnIndex = '';
        while (index > 0) {
            let remainder = (index - 1) % 26;
            columnIndex = String.fromCharCode(65 + remainder) + columnIndex;
            index = Math.floor((index - remainder) / 26);
        };
        return columnIndex;
    };


    /**
     * Dictionary of primers exporters.
     */
    primerExporters = {
        /**
         * Txt format.
         */
        txt: (plasmidIndex, plasmidName, primerSets) => {
            let lines = [];
            for (let i = 0; i < primerSets.length; i++) {
                const set = primerSets[i];
                lines.push(`${i+1}. ${set.title} (${set.symmetry}; HR: ${set.hrLength} nt, ${set.hrTm.toFixed(2)} C)`);
                
                for (let j = 0; j < set.primers.length; j++) {
                    const primer = set.primers[j];

                    let primerSequence = ""
                    let tbrLength = 0;
                    let tbrTm = 0;
                    for (let k = 0; k < primer.regions.length; k++) {
                        const region = primer.regions[k];
                        primerSequence += region.sequence;
                        if (region.type === "TBR") {
                            tbrTm = Nucleotides.getMeltingTemperature(region.sequence);
                            tbrLength = region.sequence.length;
                        };
                    };
                    lines.push(`\t${primer.name}: ${primerSequence} (Total: ${primerSequence.length} nt; TBR: ${tbrLength} nt, ${tbrTm.toFixed(2)} C)`);
                };

                lines.push("");
            };

            const fileText = lines.join("\n");

            console.log(`FileIO.primerExporters.txt ->`, fileText);

            this.downloadFile(
                plasmidName + " primers" + ".txt",
                fileText
            );
        },

        /**
         * Doc format.
         */
        doc: (plasmidIndex, plasmidName, primerSets) => {
            const tempContainer = document.createElement("div");
            tempContainer.appendChild(Sidebar.generatePrimersTable(plasmidIndex));
            document.body.appendChild(tempContainer);
        
            function applyComputedStyles(node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const computedStyles = window.getComputedStyle(node);
                    let inlineStyles = "";
        
                    ["color", "background-color", "font-weight", "font-family", "font-size", "text-align", "border", "padding", "margin"]
                        .forEach(style => {
                            inlineStyles += `${style}: ${computedStyles.getPropertyValue(style)}; `;
                        });
        
                    node.setAttribute("style", inlineStyles);
        
                    node.childNodes.forEach(applyComputedStyles);
                };
            };

            applyComputedStyles(tempContainer);
        
            const extractedContent = tempContainer.innerHTML.trim();
            const fullHTML = `<!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${plasmidName} Primers</title>
                    <style>
                        body { font-family: Arial, sans-serif; }
                    </style>
                </head>
                <body>
                    ${extractedContent} <!-- Extract only the actual content -->
                </body>
                </html>`;
        
            const blob = window.htmlDocx.asBlob(fullHTML);
            document.body.removeChild(tempContainer);
            saveAs(blob, `${plasmidName} primers.docx`);
        },

        /**
         * Csv format.
         */
        csv: (plasmidIndex, plasmidName, primerSets) => {
            const table = this.primersToTable(primerSets, true);
            console.log("FileIO.primerExports.csv ->", table);

            let csvLines = table.map(function(row) {
                return row.map(function(cell) {
                    return '"' + String(cell).replace(/"/g, '""') + '"';
                }).join(',');
            });
            const fileText = csvLines.join('\n');

            this.downloadFile(
                plasmidName + " primers" + ".csv",
                fileText
            );
        },

        /**
         * Xlsx format.
         */
        xlsx: (plasmidIndex, plasmidName, primerSets) => {
            const table = this.primersToTable(primerSets, true);
            console.log("FileIO.primerExports.xlsx ->", table);

            XlsxPopulate.fromBlankAsync()
                        .then((workbook) => {
                            // Iterate over primers and add the entries to the sheet
                            for (let i = 0; i < table.length; i++) {
                                const currentRow = table[i]
                                for (let j = 0; j < currentRow.length; j++) {
                                    const targetCell = this.intToSpreadsheetColumn(j + 1) + (i + 1);
                                    workbook.sheet(0).cell(targetCell).value(currentRow[j]);
                                };
                            };
                            // Return blob
                            return workbook.outputAsync();
                        })
                        .then((blob) => {
                            saveAs(blob, plasmidName + " primers" + ".xlsx");
                        })
            return
        },

        /**
         * Microsynth format.
         */
        microsynth: (plasmidIndex, plasmidName, primerSets) => {
            const table = this.primersToTable(primerSets, false);
            console.log("FileIO.primerExports.xlsx ->", table);

            // Create a list of rows to append to the microsynth form
            const primerList = table.map(([primerId, primerSeq]) => [
                primerId, // DNA Oligo Name
                primerSeq, // DNA Sequence (5' -> 3')
                null, // Length
                "DES", // DNA Purification
                primerSeq.length <= 60 ? "GEN" : 0.04, // DNA Scale
                null, // DNA Scale
                null, // Inner Modification (5)
                null, // Inner Modification (6)
                null, // Inner Modification (7)
                null, // Inner Modification (8)
                null, // 3' Modification
                "Dried", // Physical Condition
                "Standard", // Datasheet
                "No" // Aliquots
            ]);

            // Fetch default file and modify using xlsx-populate
            fetch("/static/MicrosynthUploadFormDNA.xlsx")
                .then(res => res.arrayBuffer())
                .then(arrayBuffer => XlsxPopulate.fromDataAsync(arrayBuffer))
                .then(workbook => {
                    // Iterate over primers and add the entries to the sheet
                    for (let i = 0; i < primerList.length; i++) {
                        const currentRow = primerList[i]
                        for (let j = 0; j < currentRow.length; j++) {
                            if (currentRow[j] !== null) {
                                const cellAddress = this.intToSpreadsheetColumn(j + 1) + (i + 2);
                                workbook.sheet(1).cell(cellAddress).value(currentRow[j]);
                            };
                        };
                    };
                    // Return blob
                    return workbook.outputAsync();
                })
                .then(blob => saveAs(blob, plasmidName + " microsynth order form"));
        },
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
     * Breaks a string into a list of lines based on maximum width of a line.
     * 
     * @param {string} string 
     * @param {int} maxWidth 
     * @returns 
     */
    breakStringIntoLines(string, maxWidth) {
        const words = string.split(" ");
        let entryLines = [];
        let currentLine = "";
        for (let word of words) {
            if (word.length > maxWidth) {
                // Break the word
                while (word.length > maxWidth) {
                    entryLines.push(word.slice(0, maxWidth));
                    word = word.slice(maxWidth);
                };
                if (word) currentLine = word;
            } else if ((currentLine + word).length <= maxWidth) {
                // Append word
                currentLine += (currentLine ? " " : "") + word;
            } else {
                // Put word on new line
                entryLines.push(currentLine);
                currentLine = word;
            };
        };
        if (currentLine) entryLines.push(currentLine);

        return entryLines;
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
        this.resetNewFilePopupWindow();
    
        /** 
         * Generate plasmid object
         */
        // Sanitize sequence
        const newFileSequence = Nucleotides.sanitizeSequence(newFileSequenceInput);
        
        // Get complementary sequence 3'->5'!
        const newFileComplementarySequence = Nucleotides.complementary(newFileSequence);
        
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
                            Nucleotides.translate(currentSequence),
                            Nucleotides.translate(currentSequence.slice(1) + currentSequence.slice(0, 1)),
                            Nucleotides.translate(currentSequence.slice(2) + currentSequence.slice(0, 2))
                        ];
                        // Iterate over reading frames and check for features
                        for (let j = 0; j < 3; j++) {
                            // While there are matches
                            while ((match = regex.exec(readingFrames[j])) !== null) {
                                // Generate new feature info
                                const newFeatureId = Utilities.newUUID();
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
                                        color: Utilities.getRandomDefaultColor()
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
                            const newFeatureId = Utilities.newUUID();
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
                                    color: Utilities.getRandomDefaultColor()
                                };
                            };
                        };
                    };
                };
            };
    
            newFileFeatures = Utilities.sortFeaturesDictBySpan(newFileFeatures);
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