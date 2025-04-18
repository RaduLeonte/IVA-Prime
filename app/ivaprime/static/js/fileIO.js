const FileIO = new class {
    constructor() {
    };


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
                // TO DO: make custom error
                Alerts.error(
                    `Unsupported file type: ${fileNameExtension}`,
                    "The file type you selected is not supported. Please upload a file with one of the following extensions: .gbk, .gb, .dna, or .fasta."
                );
                console.error("Unsupported file type.");
                resolve();
                return;
            };


            // Initialise file reader
            const reader = new FileReader();
            
            // Define reader
            reader.onload = function(event) {
                // Read file content
                let fileContent = event.target.result;
                
                // Parse file
                let parsedFile;
                switch(fileExtension) {
                    case (".gbk"):
                    case (".gb"):
                        parsedFile = FileIO._parseGBFile(fileContent);
                        break;

                    case (".dna"):
                        parsedFile = FileIO._parseDNAFile(fileContent);
                        break;

                    case (".fasta"):
                        parsedFile = FileIO._parseFASTAFile(fileContent);
                        break;

                    default:
                        break;
                };
        
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
    // TO DO: add more common plasmid vectors?
    async importDemoFile() {
        const filePath = "static\\files\\pET-28a(+).dna";
        const response = await fetch(filePath);
        const blob = await response.blob();
        const file = new File([blob], filePath.split('\\').pop());
        
        this.importFile(file);
    };


    /**
     * Opens the file browser when clicking on the "Import File" button.
     * Creates a temporary file input element and clicks it.
     */
    importFileButton() {
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
    // TO DO: Check if payload is list of files and only show overlay then
    // TO DO: Check if payload contains correct plasmid files and warn user if
    /**
     * Show import overlay when user dangles a payload over the page
     * 
     * @param {Event} event - Drag over event
     */
    importDragOver(event) {
        event.preventDefault();
        document.body.classList.add('drag-import-overlay');
    };
    
    /**
     * Remove overlay when there is no more payload
     * 
     * @param {Event} event - Drag leave event
     */
    importDragLeave(event) {
        event.preventDefault();
        document.body.classList.remove('drag-import-overlay');
    };
    
    /**
     * Send dropped files to the import queue
     * 
     * @param {Event} event - Drop event
     */
    async importDrop(event) {
        event.preventDefault();
        document.body.classList.remove('drag-import-overlay');
    
        this.importQueue(event.dataTransfer.files);
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
        Promise.all(importTasks).then(() => {
            this.removeLoadingCursor()
            console.log("FileIO.importQueue -> Done.")
        });
    };


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
    _parseGBFile(fileContent) {
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

                featureDict["directionality"] = featureInfoLines[0].includes("complement") ? "rev" : "fwd";
                featureDict["span"] = (featureDict["directionality"] === "fwd")
                    ? [parseInt(featureSpanMatch[1], 10), parseInt(featureSpanMatch[2], 10)]
                    : [parseInt(featureSpanMatch[1], 10) - 1, parseInt(featureSpanMatch[2], 10) - 1];

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

                
                if (featureDict["type"] === "source") continue;

                if (featureDict["translation"]) featureDict["translated"] = true;

                featureDict["color"] ??= Utilities.getRandomDefaultColor();
                featureDict["label"] ??= featureDict["type"];

                fileFeatures[Utilities.newUUID()] = featureDict;
            };
        };
        // #endregion Features


        // #region Sequence
        const originMatch = fileContent.match(/ORIGIN[\s\S]*?\n([\s\S]*?)\n\/\//);
        if (!originMatch) {
            throw new ParsingError(
                "Cannot Parse .gb File",
                "No sequence could be found in the uploaded file."
            );
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
        console.log(date);
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
    _parseDNAFile(fileArrayBuffer) {
        /**
         * Print list of bytes as hex bytes for debugging.
         * 
         * @param {Array<number>} bytes - Array of hex bytes
         * @returns 
         */
        function bytesToString(bytes) {
            return Array.from(bytes, byte => byte.toString(16).padStart(2, "0").toUpperCase()).join(" ");
        };

        /**
         * Parse the length of a data block to an integer.
         * 
         * @param {Array<number>} bytes - Array of 4 hex bytes
         * @returns {Number} - Data block length as decimal integer
         */
        function parseLength(bytes) {
            return new DataView(new Uint8Array(bytes).buffer).getUint32(0);
        };

        // Hex bytes to text decoder
        const textDecoder = new TextDecoder("utf-8");
        /**
         * Decode array of hex bytes to text.
         * 
         * @param {Array<number>} bytes - Array of hex bytes
         * @returns {String} - Decoded string
         */
        function bytesToText(bytes) {
            return textDecoder.decode(new Uint8Array(bytes));
        };


        // Read array as list of 8 bit integers
        const arrayBuf = new Uint8Array(fileArrayBuffer);
        const bytes = Array.from(arrayBuf);

        // Init XML parser (fast-xml-parser)
        const xmlParser = new fxp.XMLParser({ ignoreAttributes: false });


        // Get data blocks from .dna file
        const blocks = {};
        while (bytes.length > 6) {
            // First byte is block id
            const blockType = bytes.splice(0,1);
            // Next four bytes are the data block length
            const blockLengthBytes = bytes.splice(0,4)
            const blockLength = parseLength(blockLengthBytes);
            // Get block data
            const blockData = bytes.splice(0, blockLength);
            
            blocks[blockType] = blockData;
        };

        // Snapgene maps always start with a data block with id 09
        if (!blocks[9]) {
            throw new ParsingError(
                "Cannot Parse .dna File",
                "Uploaded file is not a valid .dna file."
            );
        };

        // Sequence will always be in the datablock with id 00
        if (!blocks[0]) {
            throw new ParsingError(
                "Cannot Parse .dna File",
                "No sequence could be found in the uploaded file."
            );
        };

        /**Notes on SnapGene file format
         * 
         * 
         *        00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F   10 11 12 13 14 15 160 17 18 19 1A 1B 1C 1D 1E 1F 
         * 
         * 0x00   09 00 00 00 0E 53 6E 61 70 47 65 6E 65 00 01 00   0F 00 13 00 00 00 1B F0 03 63 67 74 74 61 63 61
         *        |  |________|  |____________________|  |__|  |____|  |__|  |________|  |  |________________...
         *        |      |                 |              |      |      |        |       |           |
         *      block  block          "Snapgene"        seq  exported imported  seq   topology    sequence
         *       id    length                          type  version? version? length+1  byte      starts
         * 
         * Known
         * 00 -> sequence
         * 01 -> enzyme recognition patterns?
         * 02 -> unknown data block
         * 03 -> unknown data block encompassing enzyme recognition patterns?
         * 04 -> 
         * 05 -> Primers xml tree
         * 06 -> Notes xml tree
         * 07 -> 
         * 08 -> Additional sequence properties xml tree
         * 09 -> Snapgnee file header
         * 0A -> Features xml tree
         * 0B -> 
         * 0C -> 
         * 0D -> Snapgene enzyme set
         * 0E -> Custom enzyme set xml tree
         * 0F -> 
         * 10 ->
         * 11 -> Alignable sequences xml tree
         * 12 -> 
         * 13 -> 
         * 14 -> Strand colors xml tree
         * 15 -> 
         * 16 -> 
         * 17 -> Embedded files
         * 18 -> 
         * 19 -> 
         * 1A -> 
         * 1B -> 
         * 1C -> Enzyme visibilities xml tree
         */
        

        // #region Sequence
        /**
         * Extract sequence type and topology.
         * 
         * @param {Array<number>} bytes - Data block
         * @returns {[string, string]} - Tuple:
         *   - Sequence topology ("linear" || "circular")
         *   - DNA sequence
         */
        function parseSequence(bytes) {
            /**Known topology bytes
             * 
             * 00 -> ss linear
             * 01 -> ss circular
             * 02 -> ds linear
             * 03 -> ds circular
             * 04 -> ss linear methylated
             * 05 -> ss circular methylated
             * 06 -> ds linear methylated
             * 07 -> ds circular methylated
             */
            
            // Get topology byte
            const topologyByte = bytes.splice(0,1)[0];
            const topology = ([0, 2].includes(topologyByte % 4)) ? "linear" : "circular";

            // Get sequence
            const sequence = bytesToText(bytes);

            return [topology, sequence];
        };
        let [fileTopology, sequence] = parseSequence(blocks[0]);
        const fileSequence = Nucleotides.sanitizeSequence(sequence);
        // Generate complementary sequence
        const fileComplementarySequence = Nucleotides.complementary(fileSequence);
        // #endregion Sequence


        // #region Features
        /**
         * Parse features from xml tree.
         * 
         * @param {Array<number>} bytes - Data block
         * @returns 
         */
        function parseFeatures(bytes) {
            /** Info on features xml tree
             * 
             * 
             * <Features>
             *      Attributes:
             *          nextValidID: int => id of next feature that would be added 
             *      <Feature>
             *          Attributes:
             *              recentID: int => id of feature [0,n]
             *              name: str => feature label
             *              directionality: int => 1 -> fwd, 2 -> rev, 3 -> both, attribute missing for no directionality
             *              
             *              type: str => feature type (5'UTR, misc_signal, LTR, misc_recomb, enhancer, exon, promoter, 
             *                  rep_origin, gene, polyA_signal, CDS, oriT, sig_peptide, regulatory, misc_RNA, intron, primer_bind, 
             *                  misc_feature, ncRNA, protein_bind, RBS, tRNA, repeat_region, terminator, mobile_element, 3'UTR)
             * 
             *              allowSegmentOverlaps: int => ? 0
             *              consecutiveTranslationNumbering: int => ? 0, 1
             *              swappedSegmentNumbering: int => ? 1
             *              translationMW: float => molecular weight of translation product in Da
             *              readingFrame: int=> -3, -1, 3, -2, 2
             *              hitsStopCodon: int => 1
             *              cleavageArrows: int => position indicating a cleavage site
             *              detectionMode: exactProteinMatch
             *              maxRunOn: int => ?
             *              maxFusedRunOn: int => ?
             *              consecutiveNumberingStartsFrom: int => ? 
             *              isFavorite: int=> 1
             *              translateFirstCodonAsMet:int => 1
             *              geneticCode: int => -1
             *              originalSequence: str => ?
             *              prioritize: int=> 1
             *              originalName: str=> ? loxP
             *          <Q>
             *              Attributes:
             *                  name: str => name of query (locus_tag, note, bound_moiety, gene, rpt_type, translation, 
             *                      old_locus_tag, product, citation, regulatory_class, allele, label, ncRNA_class, db_xref, direction, 
             *                      mobile_element_type, gene_synonym, codon_start, standard_name, protein_id, map, experiment, function, 
             *                      EC_number, transl_table)
             *              <V>
             *                  Attributes:
             *                      text: str => property value
             *                      int: int => property value 
             *                      predef: str => ? (possible values; hammerhead_ribozyme, miRNA, ribozyme, inverted, transposon,
             *                          insertion sequence, other, GI)
             *          <Segment>
             *              Attributes:
             *                  range: int-int => feature span
             *                  color: str => hex color
             *                  type: str => standard, gap
             *                  translated: int => 1 if translated, attribute missing if not translated
             *                  name: str => label of segment
             *                  translationNumberingStartsFrom: int => value to offset start of translation 0, 241, 239, 2
             */

            // Extract XML tree
            const featuresXMLDoc = xmlParser.parse(bytesToText(bytes));
            if (!featuresXMLDoc.Features ||  !featuresXMLDoc.Features.Feature) return;

            const featuresDict = {};

            // Select all <Features> nodes and iterate over them
            const featureNodes = featuresXMLDoc.Features.Feature;
            for (let i = 0; i < featureNodes.length; i++) {
                // Current node
                const featureNode = featureNodes[i];

                // New feature dict
                const featureInfo = {}

                // Feature label
                featureInfo["label"] = featureNode['@_name'];

                // Feature type
                featureInfo["type"] = featureNode['@_type'];
                // Skip source feature
                if (featureInfo["type"] === "source") continue;

                // Get feature directionaliy, fwd, rev, both, or null
                featureInfo["directionality"] = {"1": "fwd", "2": "rev", "3": "both"}[featureNode['@_directionality']] || null;

                // Iterate over <Feature> node children (<Q> and <Segment>) to find properties
                if (featureNode.Q) {
                    // Current Q node, if there is only one, then featureNode.Q will be an Object so convert first
                    const qNodes = Array.isArray(featureNode.Q) ? featureNode.Q : [featureNode.Q];
                    for (let j = 0; j < qNodes.length; j++) {
                        const QNode = qNodes[j];
                        const QNodeName = QNode["@_name"];
    
                        /**
                         * Nodes with the name "Q" and its "V" children are "Query-Value" nodes.
                         * The information is not useful for us, but we keep it to maybe use it
                         * at some later point.
                         */
                        const VNode = QNode.V;
                        if (VNode) {
                            if ("@_int" in VNode) {
                                featureInfo[QNodeName] = parseInt(VNode["@_int"], 10);
                            } else if ("@_text" in VNode) {
                                
                                const needsParsing = /[<>]|&(?:[a-z\d#]+);/i.test(VNode["@_text"]);

                                featureInfo[QNodeName] = (VNode["@_text"])
                                    ? needsParsing
                                        ? VNode["@_text"].replace(/<\/?[^>]+(>|$)/g, "").replace(/&[a-z\d#]+;/gi, "").trim()
                                        : VNode["@_text"].trim()
                                    : "";
                            };
                        };
                    };
                };

                if (!featureNode.Segment) continue;
                const segments = Array.isArray(featureNode.Segment) ? featureNode.Segment : [featureNode.Segment];
                for (let j = 0; j < segments.length; j++) {
                    const segment = segments[j];

                    // Add span to feature info
                    featureInfo["span"] = segment['@_range'].split("-").map((s) => parseInt(s));
                            
                    // Extract color
                    featureInfo["color"] = (UserPreferences.get("overwriteSnapGeneColors"))
                    ? Utilities.getRandomDefaultColor()
                    : segment['@_color'];

                    featureInfo["translated"] = {"1": true}[segment['@_translated']] || false;

                    featureInfo["translationOffset"] = segment['@_translationNumberingStartsFrom'] || 0;
                };

                // Append feature info dict the corresponding feature in the dict
                featuresDict[Utilities.newUUID()] = featureInfo;
            };

            return featuresDict;
        };
        // #endregion Features


        // #region Primers
        /**
         * Parse primers from xml tree.
         * 
         * @param {Array<number>} bytes - Data block
         * @returns 
         */
        function parsePrimers(bytes) {
            /**Info on primers xml tree
             * 
             * 	<Primers>
             *      Attributes:
             *          recycledIDs: int => ids that have already been used
             *          nextValidID: int => next available id for a primer
             *      <HybridizationParams>
             *          Attributes:
             *              minContinuousMatchLen: int => ? 10
             *              allowMismatch: int => ? 1
             *              minMeltingTemperature: int => 40
             *              showAdditionalFivePrimeMatches: int => ? 1
             *              minimumFivePrimeAnnealing: int => ? 15
             *      <Primer>
             *          Attributes:
             *              recentID: int => recently used ids
             *              name: str => primer label
             *              sequence: str => nucleotide sequence of primer
             *              description: str => primer description
             *          <BindingSite>
             *              Attributes:
             *                  location: int-int => Span of primer binding site
             *                  boundStrand: int => 0 -> top strand "fwd" or 1 -> bottom strand "rev"
             *                  annealedBases: str => ?
             *                  meltingTemperature: int => ?
             *                  simplified: int => ? 1
             *              <Component>
             *                  Attributes:
             *                      hybridizedRange: int-int => ?
             *                      bases: str => ?
             */
            // Extract XML tree

            const primersXMLDoc = xmlParser.parse(bytesToText(bytes));
            if (!primersXMLDoc.Primers ||  !primersXMLDoc.Primers.Primer) return;

            const primersDict = {};

            if (!primersXMLDoc.Primers.Primer) return {};

            const primerNodes = Array.isArray(primersXMLDoc.Primers.Primer) ? primersXMLDoc.Primers.Primer : [primersXMLDoc.Primers.Primer];
            for (let i = 0; i < primerNodes.length; i++) {
                // Current node
                const primerNode = primerNodes[i];

                const primerInfo = {};

                // Feature label
                primerInfo["label"] = primerNode['@_name'];
                
                // Feture type
                primerInfo["type"] = "primer_bind";

                primerInfo["color"] = Utilities.getRandomDefaultColor();

                // Feature note
                primerInfo["note"] = primerNode['@_description'] || "";
                

                const bindingSiteNodes = Array.isArray(primerNode.BindingSite) ? primerNode.BindingSite : [primerNode.BindingSite];
                const bindingSiteNode = bindingSiteNodes[0];

                primerInfo["directionality"] = {"0": "fwd", "1": "rev"}[bindingSiteNode['@_boundStrand']] || null;

                primerInfo["span"] = bindingSiteNode['@_location'].split("-").map((s) => parseInt(s));
                if (!primerInfo["span"]) continue;

                primersDict[Utilities.newUUID()] = primerInfo;
            };

            return primersDict;
        };
        // #endregion Primers
        

        let fileFeatures = {};
        if (blocks[10]) {
            fileFeatures = {...parseFeatures(blocks[10])};
        };
        if (blocks[5]) {
            fileFeatures = {...fileFeatures, ...parsePrimers(blocks[5])};
        };
        fileFeatures = Utilities.sortFeaturesDictBySpan(fileFeatures);


        // #region Notes
        /**
         * Parse features from xml tree
         * 
         * @param {Array<number>} bytes - Data block
         */
        function parseNotes(bytes) {
            /**Info on notes xml tree
             * 
             * 	<Notes>
             *      <ConfirmedExperimentally>
             *          Possible Values: int => 0
             *      <TransformedInto>
             *          Possible Values: str => "unspecified"
             *      <SequenceClass>
             *          Possible Values: str => ? UNA
             *      <LastModified>
             *          Possible Values: date => date of last modification
             *          Attributes:
             *              UTC: time => time of last modification
             *      <UUID>
             *          Possible Values: str => uuid of plasmid
             *      <Description>
             *          Possible Values: str => description of plasmid
             *      <References>
             *          <Reference>
             *              Attributes:
             *                  journal: str => journal of publication
             *                  title: str => title of publication
             *                  pages: str => ?
             *                  volume: str => ?
             *                  type: Journal Article
             *                  authors: str => list of authors
             *                  date: str => YYYY-MM-DD
             *                  journalName: str => (Genes Dev, Nat Struct Biol, Nature, Genetics, Science)
             *                  pubMedID: int => pubmed identifier
             *                  issue: int => journal issue
             *                  doi: str => doi
             *      <Created>
             *          Possible Values: date => creation date of plasmid
             *          Attributes:
             *              UTC: time => creation time of plasmid
             *      <Type>
             *          Possible Values: str => "Natural" || "Synthetic"
             */
            // Extract XML tree
            const notesXMLString = bytesToText(bytes);

            const notesXMLDoc = xmlParser.parse(notesXMLString);
            if (!notesXMLDoc.Notes) return;

            const notesDict = {};

            const notesNodes = notesXMLDoc.Notes;
            for (const [tagName, childNode] of Object.entries(notesNodes)) {
                let key, value;

                switch(tagName) {
                    case "Description":
                        key = "DEFINITION";
                        value = childNode;
                        break;

                    case "References":
                        key = "REFERENCES";
                        value = childNode.Reference
                            ? [].concat(childNode.Reference).map(ref =>
                                Object.fromEntries(Object.entries(ref).map(([k, v]) => [k.toUpperCase().replace("@_", ""), v])))
                            : [];
                        break;

                    case "Created":
                        key = "CREATED";
                        if (typeof childNode === "object" && "#text" in childNode) {
                            const [year, month, day] = childNode["#text"].split(".").map(Number);
                            const dateObj = new Date(Date.UTC(year, month - 1, day));
            
                            if (childNode["@_UTC"]) {
                                const [hours, minutes, seconds] = childNode["@_UTC"].split(":").map(Number);
                                dateObj.setUTCHours(hours, minutes, seconds, 0);
                            }
                            value = dateObj;
                        } else {
                            value = null; // Handle unexpected formats
                        }
                        break;

                    default:
                        key = tagName.toUpperCase();
                        value = childNode;
                        break;
                };

                notesDict[key] = {value: value, children: null};
            };

            return notesDict;
        };

        let fileAdditionalInfo = {};
        if (blocks[6]) {
            fileAdditionalInfo = parseNotes(blocks[6]);
        };


        const accountedBlockKeys = [0, 10, 5, 6];
        const unaccountedBlocks = Object.keys(blocks).reduce((obj, key) => {
            return accountedBlockKeys.includes(Number(key))
                ? obj  // Return obj unchanged
                : { ...obj, [key]: blocks[key] }; // Spread and add key-value
        }, {});
        fileAdditionalInfo["blocks"] = unaccountedBlocks;
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
    };


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
    _parseFASTAFile(fileContent) {
        const lines = fileContent.split("\n");

        if (lines.length < 2) {
            throw new ParsingError(
                "Cannot Parse .fasta File",
                "No sequence could be found in the uploaded file."
            );
        };

        const fileSequence = lines[1];

        if (!Nucleotides.isNucleotideSequence(fileSequence)) {
            throw new ParsingError(
                "Cannot Parse .fasta File",
                "FASTA sequence contains non-nucleotide codes."
            );
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
    };


    /**
     * Snapgene .dna file exporter.
     * 
     * @param {int} plasmidIndex - Index of plasmid to be exported.
     */
    _exportFileAsDNA(plasmidIndex) {
        /**
         * Print hex bytes for debugging.
         * 
         * @param {Uint8Array|number[]} bytes 
         * @param {number|string} startAddress 
         * @param {number|string} endAddress 
         * @returns 
         */
        function printHexBytes(bytes, startAddress = 0, endAddress = bytes.length) {
            const bytesPerLine = 16;
            
            // Convert hex addresses to numbers if given as strings
            const start = typeof startAddress === "string" ? parseInt(startAddress, 16) : startAddress;
            const end = typeof endAddress === "string" ? parseInt(endAddress, 16) : endAddress;
        
            // Ensure valid bounds
            if (start < 0 || end > bytes.length || start >= end) {
                console.error("Invalid address range.");
                return;
            };
        
            const hexStrings = bytes.map(byte => byte.toString(16).toUpperCase().padStart(2, "0"));
        
            let lines = [];
            for (let i = start; i < end; i += bytesPerLine) {
                const addressLabel = i.toString(16).toUpperCase().padStart(8, "0"); // Format address
                const hexSegment = hexStrings.slice(i, Math.min(i + bytesPerLine, end)).join(" ");
                lines.push(`${addressLabel}: ${hexSegment}`);
            };
        
            console.log("\n" + lines.join("\n"));
        };


        /**
         * Conver 32 bit integer to an array of 4 hex bytes
         * 
         * @param {Number} int - A 32 bit integere to conver tot hex bytes
         * @returns {Numebr[]} - Array of 4 hex bytes
         */
        function intToHexBytes(int) {
            const buffer = new ArrayBuffer(4);
            const view = new DataView(buffer);
            view.setUint32(0, int, false); // false -> big-endian
        
            return Array.from(new Uint8Array(buffer));
        };
        

        /**
         * Append byte or list of bytes to the output bytes.
         * 
         * @param {Array[Number]|Number} bytes - Array of bytes or single byte to append to outputBytes
         */
        function addHexBytes(bytes) {
            if (Array.isArray(bytes) || bytes instanceof Uint8Array) {
                outputBytes.push(...bytes);
            } else {
                outputBytes.push(bytes);
            };
        };


        /**
         * Append the data block to the output bytes.
         * 
         * 1 byte -> Block id
         * 4 bytes -> Nr of hex bytes in data block
         * rest -> Data block
         * 
         * @param {Number} blockID - ID of block
         * @param {Number[]} block - Block data in form of an array of bytes
         */
        function addHexBytesBlock(blockID, block) {
            addHexBytes(blockID); // Append ID
            addHexBytes(intToHexBytes(block.length)); // Append length of block
            addHexBytes(block); // Append block
        };

        
        const textEncoder = new TextEncoder('utf-8');
        /**
         * Encode text to hex bytes
         * 
         * @param {String} text - String to be encoded
         * @returns 
         */
        function textToHexBytes(text) {
            return textEncoder.encode(text);
        };


        // Pretty XML builder for debugging
        const builderPretty = new fxp.XMLBuilder({
            format: true, // Pretty print
            ignoreAttributes: false, // If using attributes
            suppressEmptyNode: true,
        });

        // XML builder for creating xml trees
        const builder = new fxp.XMLBuilder({
            ignoreAttributes: false, // If using attributes
            suppressEmptyNode: true,
        });

        // Get plasmid info
        const targetPlasmid = Session.getPlasmid(plasmidIndex);
        const sequence = targetPlasmid.sequence;
        const topology = targetPlasmid.topology;
        const primers = Object.fromEntries(Object.entries(targetPlasmid.features).filter(([_, v]) => v.type === "primer_bind"));
        const features = Object.fromEntries(Object.entries(targetPlasmid.features).filter(([_, v]) => v.type !== "primer_bind"));
        const additionalInfo = targetPlasmid.additionalInfo;
        const blocks = additionalInfo.blocks;

        // Init
        let outputBytes = [];

        /**
         * Header
         */
        if (blocks && blocks[9]) {
            // If a header block is available, append that (preserves version of snapgene that imported/exported the file)
            addHexBytesBlock(9, blocks[9]);
        } else {
            // Default header block
            addHexBytesBlock(9, [83,110,97,112,71,101,110,101,0,1,0,15,0,19]);
        };


        /**
         * Sequence data block
         */
        // First byte denotes sequence topology
        const topologyByte = (topology === "linear") ? 2: 3;
        // Prepare sequence data block
        const sequenceBlock = [topologyByte, ...textToHexBytes(sequence.toLowerCase())];
        // Append
        addHexBytesBlock(0, sequenceBlock);


        /**
         * Unknown data blocks (excluding features, primers, and notes)
         */
        // If there are unknown data blocks to append
        if (blocks != null) {
            // Iterate over data blocks and append them
            for (const [blockID, block] of Object.entries(blocks)) {
                if ([9].includes(blockID)) continue; // Skip header block

                addHexBytesBlock(blockID, block);
            };
        };



        /**
         * Create the features XML tree and then convert it to hex bytes
         * 
         * @param {Object} features - Plasmid features dict
         * @returns {Number[]} - Hex bytes
         */
        function makeFeaturesBlock(features) {
            const featureNodes = [];

            const directionalityMap = { "fwd": 1, "rev": 2, "both": 0 };

            // Feature properties to check and append if they exist
            const keysToCheck = [
                "locus_tag", "note", "bound_moiety", "gene", "rpt_type", "translation",
                "old_locus_tag", "product", "citation", "regulatory_class", "allele", "label",
                "ncRNA_class", "db_xref", "direction", "mobile_element_type", "gene_synonym",
                "codon_start", "standard_name", "protein_id", "map", "experiment", "function",
                "EC_number", "transl_table"
            ];

            /**
             * Create a Q node
             * 
             * <Q name=QName>
             *      <V type=VType>Vvalue</V>
             * </Q>
             * 
             * @param {String} QName - Node name (tag name)
             * @param {String} VType - Node type "int"|"text" (type attribute)
             * @param {String} VValue - Node value (inner text)
             * @returns 
             */
            const makeQNode = (QName, VType, VValue) => ({
                "@_name": QName,
                V: { [`@_${VType}`]: VValue },
            });


            // Iterate over features to create the xml tree
            for (const [i, feature] of Object.entries(features)) {
                // Unpack feature info
                const { label, directionality, type, span, color, translated, translationOffset = 0 } = feature;

                // Prepare <Feature> node
                const node = {
                    "@_recentID": i,
                    "@_name": label,
                    "@_type": type,
                    ...(directionality && { "@_directionality": directionalityMap[directionality] })
                };
        
                // Create <Segment> node
                node.Segment = {
                    "@_range": `${span[0]}-${span[1]}`,
                    "@_color": color,
                    "@_type": "standard",
                    ...(translated && { "@_translated": 1 }),
                    "@_translationNumberingStartsFrom": translationOffset
                };

                // Iterate over keysToCheck, and if the feature has that property, append a QNode for that property
                const QNodes = keysToCheck
                    .filter(key => key in feature)
                    .map(key => makeQNode(key, Number.isInteger(feature[key]) ? "int" : "text", feature[key]));

                // Only add QNodes if they exist
                QNodes.length && (node.Q = QNodes);

                // Push to featureNodes array
                featureNodes.push(node);
            };

            // Construct XML tree
            const xmlTree = {
                Features: {
                    "@_nextValidID": Object.keys(features).length,
                    Feature: featureNodes,
                }
            };

            // Conver XML tree to string
            const xmlString = '<?xml version="1.0"?>' + builder.build(xmlTree);
            //console.log(builderPretty.build(xmlTree));

            // Return XML tree as an array of hex bytes
            return textToHexBytes(xmlString);
        };


        /**
         * Create the primers XML tree and then convert it to hex bytes
         * 
         * @param {Object} primers - Plasmid primers dict
         * @returns {Number[]} - Hex bytes
         */
        // TO DO: Figure out how to export primer features in a way that SnapGene will read them
        function makePrimersBlock(primers) {
            const primerNodes = [];

            // Iterate over primers
            for (const [i, primer] of Object.entries(primers)) {
                // Unpack primer info
                const { label, directionality, note, span} = primer;

                // Make <Primer> node
                const node = {
                    "@_recentID": i,
                    "@_name": label,
                    //"@_sequence": "",
                    "@_description": note,
                };

                // Make <BindingSite> node
                node.BindingSite =  {
                    "@_location": `${span[0]}-${span[1]}`,
                    "@_boundStrand": {"fwd": 0, "rev": 1}[directionality],
                    //"@_annealedBases": "",
                    //"@_meltingTemperature": "",
                    //"@_simplified": 1,
                };

                // Make <Componen> node
                node.BindingSite.Component = {
                    "@_hybridiziedRange": `${span[0]}-${span[1]}`,
                    //"@_bases": "",
                };

                // Append primer node
                primerNodes.push(node);
            };

            // Make XML tree
            const xmlTree = {
                Primers: {
                    "@_nextValidID": Object.keys(primers).length,
                    HybridizationParams: {
                        "@_minContinuousMatchLen": 10,
                        "@_allowMismatch": 1,
                        "@_minMeltingTemperature": 40,
                        "@_showAdditionalFivePrimeMatches": 1,
                        "@_minimumFivePrimeAnnealing": 15,
                    },
                    Primer: primerNodes,
                }
            };

            // Convert XML tree to string
            const xmlString = '<?xml version="1.0"?>' + builder.build(xmlTree);
            console.log(builderPretty.build(xmlTree));
            console.log(xmlString)

            // Return XML tree as array of hex bytes
            return textToHexBytes(xmlString);
        };

        if (Object.keys(features).length !== 0) {
            //addHexBytesBlock(10, makeFeaturesBlock(features));
            /**
             * Right now we cannote export the primer_bind features in a way that
             * snapgene recognizes them as primers (SnapGene says :"N primers
             * have been deleted due to changes in melting temp algorithm").
             * 
             * For now, just bundle all the primers into the <Features> block.
             */
            addHexBytesBlock(10, makeFeaturesBlock(targetPlasmid.features));
        };
        //if (Object.keys(primers).length !== 0) {
        //    addHexBytesBlock(5, makePrimersBlock(primers));
        //};


        /**
         * Create the notes XML tree and then convert it to hex bytes
         * 
         * @param {Object} additionalInfo - Plasmid additional info dict
         * @returns {Number[]} - Hex bytes
         */
        function makeNotesBlock(additionalInfo) {
            // Ignore blocks
            if (additionalInfo["blocks"]) delete additionalInfo["blocks"];

            const notesNode = {};

            // These keys must be present
            const requiredKeys = ["UUID", "Created", "LastModified", "Description", "References"];

            /**
             * Map to adapt or generate Notes tree entry
             * 
             * @param {String} key - Plasmid property
             * @returns 
             */
            const getOrGenerateValue = (key) => {
                switch (key) {
                    case "UUID":
                        // Read or generate new UUID
                        return additionalInfo.UUID?.value || Utilities.newUUID();

                    case "Description":
                        // Read description or return null
                        return additionalInfo.DESCRIPTION?.value || null;
            
                    case "Created":
                    case "LastModified": {
                        // If the key is "Created" and a corresponding value exists in additionalInfo,
                        // convert it to a Date object; otherwise, use the current date and time
                        const date = key === "Created" && additionalInfo.CREATED?.value 
                            ? new Date(additionalInfo.CREATED.value) 
                            : new Date();
                        
                        // Return the date in YYYY.MON.DD format and UTC time in HH:MM:SS format
                        return {
                            date: `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`,
                            utc: `${date.getUTCHours()}:${date.getUTCMinutes()}:${date.getUTCSeconds()}`
                        };
                    }

                    case "References":
                        // If there are no references, return null
                        if (!additionalInfo.REFERENCES?.value) return null;

                        // Parse references
                        const parsedRefs = additionalInfo.REFERENCES.value.map(ref => {
                            // Create XML like node for the reference
                            const refNode = {};
        
                            // Iterate over references entries and append them as as attributes
                            for (const [key, value] of Object.entries(ref)) {
                                const adjustedKey = key
                                    .replace(/journalname/i, "journalName")
                                    .replace(/pubmedid/i, "pubMedID")
                                    .toLowerCase();
                                
                                refNode[`@_${adjustedKey}`] = value;
                            };
        
                            return refNode;
                        });

                        // If there is no IVA Prime reference, append it
                        if (!parsedRefs.some(ref => ref["@_journal"]?.includes("IVA Prime"))) {
                            parsedRefs.push({
                                "@_journal": "Exported with IVA Prime :) \nhttps://www.ivaprime.com",
                                "@_authors": ".",
                                "@_title": "Direct Submission",
                            });
                        }

                        return parsedRefs;
            
                    default:
                        return null;
                }
            };

            // Iterate over the required keys and append them to the XML tree
            requiredKeys.forEach(key => {
                // Generate the value
                const value = getOrGenerateValue(key);
                if (!value) return;
        
                switch (key) {
                    case "UUID":
                    case "Description":
                        // Direct key-to-node mapping with simple text content
                        notesNode[key] = { "#text": value };
                        break;

                    case "References":
                        // Only include References if value is a non-empty array
                        if (Array.isArray(value) && value.length > 0) {
                            notesNode.References = { Reference: value };
                        };
                        break;

                    default:
                        // Assume value is an object with date and utc
                        notesNode[key] = {
                            "#text": value.date ?? "",
                            "@_UTC": value.utc ?? ""
                        };
                        break;
                };
            });

            // Create XML tree
            const xmlTree = { Notes: notesNode };

            // Convert XML tree to string
            const xmlString = builder.build(xmlTree);
            console.log(builderPretty.build(xmlTree));
            console.log(xmlString)

            // Return xml tree as array of hex bytes
            return textToHexBytes(xmlString);
        };
        addHexBytesBlock(6, makeNotesBlock(additionalInfo));


        // Save file
        this._downloadFile(
            targetPlasmid.name + ".dna",
            outputBytes
        );
    };


    /**
     * Genbank .gb file exporter.
     * 
     * @param {int} plasmidIndex - Index of plasmid to be exported.
     */
    _exportFileAsGB(plasmidIndex) {
        const targetPlasmid = Session.getPlasmid(plasmidIndex);

        let fileContent = ""

        // #region Header
        function writeHeader(additionalInfo) {
            const leftColumnWidth = 12;
            const rightColumnWidth = 50;
            let header = "";

            const getValue = (key, defaultValue = ".") =>
                key in additionalInfo ? additionalInfo[key].value : defaultValue;

            // LOCUS
            const formatEntry = (key, value) => {
                header += key.padEnd(leftColumnWidth, " ");
                header += FileIO.breakStringIntoLines(value, rightColumnWidth).join("\n" + " ".repeat(leftColumnWidth));
                header += "\n";
            };

            const dateCreated = getValue("CREATED", new Date());

            header += `LOCUS       ${targetPlasmid.name.padEnd(24, " ")} ${targetPlasmid.sequence.length} bp ds-DNA`.padEnd(30);
            header += `${targetPlasmid.topology === "circular" ? "circular" : "linear"}`.padEnd(10);
            
            const typeMapping = { "Synthetic": "SYN", "Natural": "UNA" };
            header += typeMapping[getValue("TYPE", "").trim()] || "     ";
            header += FileIO.formatToGBDate(dateCreated) + "\n";

            ["DEFINITION", "ACCESSION", "VERSION", "KEYWORDS"].forEach(key => {
                formatEntry(key, getValue(key));
        
                // Handle children if present
                if (additionalInfo[key]?.children) {
                    Object.entries(additionalInfo[key].children).forEach(([childKey, childValue]) =>
                        formatEntry("  " + childKey, childValue)
                    );
                }
            });

            /**
             * Source
             */
            // SOURCE
            header += "SOURCE".padEnd(leftColumnWidth, " ");
            header += getValue(
                "ORGANISM",
                getValue(
                    "SOURCE",
                    getValue("TYPE", ".") === "Synthetic"
                        ? "synthetic DNA construct"
                        : "natural DNA sequence"
                    )
                );
            header += "\n"

            // ORGANISM
            formatEntry("  ORGANISM", getValue("ORGANISM"));


            if ("REFERENCES" in additionalInfo) {
                const refsList = Array.isArray(additionalInfo["REFERENCES"])
                    ? additionalInfo["REFERENCES"]
                    : additionalInfo["REFERENCES"].value;

                refsList.forEach((ref, index) => {
                    header += `REFERENCE   ${index + 1} `.padEnd(leftColumnWidth, " ");
                    header += `(bases ${ref.span ? `${ref.span[0]} to ${ref.span[1]}` : `1 to ${targetPlasmid.sequence.length}`})\n`;
        
                    ["AUTHORS", "TITLE", "JOURNAL", "PUBMED"].forEach(key => {
                        if (key in ref) formatEntry(`  ${key}`, ref[key]);
                    });
                });
            }
        

            // IVA Prime reference
            if (!header.includes("IVA Prime")) {
                const refIndex = ("REFERENCES" in additionalInfo) ? additionalInfo["REFERENCES"].length + 1 : 1;
                header += `REFERENCE   ${refIndex} (bases 1 to ${targetPlasmid.sequence.length})\n`;
                header += `AUTHORS     .\n`;
                header += `TITLE       .\n`;
                header += `JOURNAL     Exported with IVA Prime :)\n`;
                header += `            https://www.ivaprime.com\n`;
            };

            return header;
        };

        fileContent += writeHeader(targetPlasmid.additionalInfo);
        // #endregion Header


        // #region Features
        function writeFeatures(features) {
            console.log(features);

            const leftColumnWidth = 21;
            const rightColumnWidth = 60;

            let featuresText = "";

            featuresText += "FEATURES             Location/Qualifiers\n";


            featuresText += `     source          1..${targetPlasmid.sequence.length}\n`;


            for (const [key, feature] of Object.entries(features)) {
                const location = feature["directionality"] === "fwd"
                    ? `${feature["span"][0]}..${feature["span"][1]}`
                    : `complement(${feature["span"][0]+1}..${feature["span"][1]+1})`;

                    featuresText += "     " + feature["type"].padEnd(leftColumnWidth - 5) + location + "\n";

                Object.entries(feature).forEach(([propKey, propValue]) => {
                    if (["directionality", "level", "span", "type"].includes(propKey)) return;
        
                    let propertyString = `/${propKey}=`;
                    propertyString += (propKey !== "label" && !Number.isInteger(propValue)) ? `"${propValue}"` : propValue;
        
                    // Format and wrap property text
                    const propertyLines = FileIO.breakStringIntoLines(propertyString, rightColumnWidth);
                    
                    featuresText += " ".repeat(leftColumnWidth) + propertyLines.join("\n" + " ".repeat(leftColumnWidth)) + "\n";
                });
            };

            return featuresText;
        };

        fileContent += writeFeatures(targetPlasmid.features);
        // #endregion Features


        // #region Sequence
        function writeSequence(sequence) {
            sequence = sequence.toLowerCase();

            let sequenceText = "ORIGIN\n";

            const indexWidth = 9;
            const basesPerSegment = 10;
            const segmentsPerLine = 6;
            const basesPerLine = basesPerSegment * segmentsPerLine;

            // Iterate over lines
            for (let i = 0; i < Math.ceil(sequence.length / basesPerLine); i++) {
                const index = (i * basesPerLine) + 1;
                const indexSegment = `${index}`.padStart(indexWidth, " ");
        
                // Build segments for the line
                const segments = Array.from({ length: segmentsPerLine }, (_, j) => {
                    const start = i * basesPerLine + j * basesPerSegment;
                    return sequence.slice(start, start + basesPerSegment);
                });
        
                sequenceText += `${indexSegment} ${segments.join(" ")}\n`;
            }
            sequenceText += "//"

            return sequenceText;
        };

        fileContent += writeSequence(targetPlasmid.sequence);
        // #endregion Sequence


        //console.log("\n" + fileContent)
        this._downloadFile(
            targetPlasmid.name + ".gb",
            fileContent
        );
    };


    /**
     * Fasta .fasta file exporter.
     * 
     * @param {int} plasmidIndex - Index of plasmid to be exported.
     */
    _exportFileAsFASTA(plasmidIndex) {
        const targetPlasmid = Session.getPlasmid(plasmidIndex);

        this._downloadFile(
            targetPlasmid.name + ".fasta",
            `>${targetPlasmid.name}\n${targetPlasmid.sequence}`
        );
    };



    /**
     * Export primers from a single plasmid
     * 
     * @param {Number} plasmidIndex - Index of the plasmid to get primer sets from 
     * @param {String} fileType - File type of output format
     */
    exportPrimersSingle(plasmidIndex, fileType) {
        const primerSets = Session.getPlasmid(plasmidIndex).primers;
        const plasmidName = Session.getPlasmid(plasmidIndex).name

        const outputFileName = plasmidName + "primers";

        this._exportPrimers(outputFileName, fileType, primerSets);
    };


    /**
     * Export primers from all open plasmids.
     * 
     * @param {String} fileType - File type of output format
     */
    exportPrimersAll(fileType) {
        let primerSets = [];
        for (const plasmidIndex in Session.plasmids) {
            primerSets.push(...Session.plasmids[plasmidIndex].primers)
        };
        this._exportPrimers("All primers", fileType, primerSets);
    };


    /**
     * Export primer sets from all open plasmids.
     * 
     * @param {String} outputFileName - Name of output file
     * @param {String} fileType - File type of output format
     * @param {Array[Object]} primerSets - List of primer sets to export
     * @returns 
     */
    _exportPrimers(outputFileName, fileType, primerSets) {
        // Assert that there are primers to export
        if (primerSets.length === 0) return;

        // Send primer sets to appropriate function
        switch(fileType) {
            case "txt":
                this._exportPrimersAsTxt(outputFileName, primerSets);
                break;

            case "doc":
                this._exportPrimersAsDoc(outputFileName, primerSets);
                break;

            case "csv":
                this._exportPrimersAsCsv(outputFileName, primerSets);
                break;

            case "xlsx":
                this._exportPrimersAsXlsx(outputFileName, primerSets);
                break;

            case "microsynth":
                this._exportPrimersAsMicrosynth(outputFileName, primerSets);
                break;
        };
    };


    /**
     * Convert list of primer sets to a 2d array
     * 
     * @param {Array[Object]} primerSets - List of primer sets
     * @param {Boolean} includeColumnNames -  Flag to include column names as the first row
     * @returns {Array[Array[any]]}
     */
    _primersToTable(primerSets, includeColumnNames=false) {
        let table = []; // Init table

        // Push column names
        if (includeColumnNames) table.push(
            [
                "Set name",
                "Primer name",
                "Sequence (5'->3')",
                "Symmetry",
                "HR length [nt]",
                "HR Tm [C]",
                "TBR length [nt]",
                "TBR Tm [C]",
                "Total length [nt]",
            ]
        );

        // Iterate over primer sets and populate the 2d array
        for (let i = 0; i < primerSets.length; i++) {
            // Select primer set
            const set = primerSets[i];

            // Prepare HR length and HR Tms
            let hrLengthMap;
            let hrTmMap;
            if (set.type === "Subcloning") {
                hrLengthMap = [set.hrLength[0], set.hrLength[1], set.hrLength[1], set.hrLength[0]];
                hrTmMap = [set.hrTm[0].toFixed(2), set.hrTm[1].toFixed(2), set.hrTm[1].toFixed(2), set.hrTm[0].toFixed(2)];
            } else {
                hrLengthMap = new Array(4).fill(set.hrLength);
                hrTmMap = new Array(4).fill(set.hrTm.toFixed(2));
            };

            // Iterate over the primers of each primer set
            for (let j = 0; j < set.primers.length; j++) {
                // Select primer
                const primer = set.primers[j];

                // Iterate over primer regions to get full sequence
                let primerSequence = ""
                for (let k = 0; k < primer.regions.length; k++) {
                    primerSequence += primer.regions[k].sequence;
                };

                // Select TBR 
                const tbr = primer.regions[primer.regions.length - 1];

                // Push row
                table.push(
                    [
                        set.title,
                        primer.label,
                        primerSequence,
                        set.symmetry,
                        hrLengthMap[j],
                        hrTmMap[j],
                        tbr.sequence.length,
                        Nucleotides.getMeltingTemperature(tbr.sequence).toFixed(2),
                        primerSequence.length,
                    ]
                );
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
    _intToSpreadsheetColumn(index) {
        let columnIndex = '';
        while (index > 0) {
            let remainder = (index - 1) % 26;
            columnIndex = String.fromCharCode(65 + remainder) + columnIndex;
            index = Math.floor((index - remainder) / 26);
        };
        return columnIndex;
    };


    /**
     * Export primers to text file
     * 
     * @param {String} outputFileName - Name of output file
     * @param {Array[Object]} primerSets - List of primer sets
     */
    _exportPrimersAsTxt(outputFileName, primerSets) {
        let lines = [];
        // Iterate over primer sets
        for (let i = 0; i < primerSets.length; i++) {
            // Select primer set
            const set = primerSets[i];

            // Push primer set title and HR info
            if (set.type === "Subcloning") {
                lines.push(`${set.title} (${set.symmetry}; HR1: ${set.hrLength[0]} nt, ${set.hrTm[0].toFixed(2)} C; HR2: ${set.hrLength[1]} nt, ${set.hrTm[1].toFixed(2)} C)`);
            } else {
                lines.push(`${set.title} (${set.symmetry}; HR: ${set.hrLength} nt, ${set.hrTm.toFixed(2)} C)`);
            };
            
            // Iterate over primers of primer set
            for (let j = 0; j < set.primers.length; j++) {
                // Select primer
                const primer = set.primers[j];

                // Iterate over primer regions and find sequence and TBR info
                let primerSequence = ""
                let tbrLength = 0;
                let tbrTm = 0;
                for (let k = 0; k < primer.regions.length; k++) {
                    const region = primer.regions[k];
                    primerSequence += region.sequence;
                    if (["TBR", "subTBR"].includes(region.type)) {
                        tbrTm = Nucleotides.getMeltingTemperature(region.sequence);
                        tbrLength = region.sequence.length;
                    };
                };

                // Write lines
                lines.push(`${primer.label} (5'->3')`);
                lines.push(`\t${primerSequence}`);
                lines.push(`\tTBR ${tbrLength} nt (${tbrTm.toFixed(2)} C)`);
                lines.push(`\tTotal ${primerSequence.length} nt`);
            };

            lines.push("");
        };

        // Convert list of lines to string
        const fileText = lines.join("\n");


        // Download file
        this._downloadFile(
            outputFileName + ".txt",
            fileText
        );
    };


    /**
     * Export primers to Microsoft Word file
     * 
     * @param {String} outputFileName - Name of output file
     * @param {Array[Object]} primerSets - List of primer sets
     */
    _exportPrimersAsDoc(outputFileName, primerSets) {
        // Create a temporary container to append primer set elements to
        const tempContainer = document.createElement("div");
        document.body.appendChild(tempContainer);

        // Generate the primers table and append it
        tempContainer.appendChild(Sidebar.createPrimersTableContainer(primerSets));

        // Iterate over each primer set to adjust elements
        const primerSetContainers = tempContainer.querySelectorAll(".primers-set");
        for (let i = 0; i < primerSets.length; i++) {
            // Select set
            const set = primerSets[i];
            // Select the primer set container matching the primer set
            const primerSetContainer = primerSetContainers[i];

            // Adjust set title to include HR info
            let headerTitle;
            if (set.type === "Subcloning") {
                headerTitle = `${set.title} (${set.symmetry}; HR1: ${set.hrLength[0]} nt, ${set.hrTm[0].toFixed(2)} C; HR2: ${set.hrLength[1]} nt, ${set.hrTm[1].toFixed(2)} C)`;
            } else {
                headerTitle = `${set.title} (${set.symmetry}; HR: ${set.hrLength} nt, ${set.hrTm.toFixed(2)} C)`;
            };

            // Append HR info to primer set title
            const primerSetHeaderTitle = primerSetContainer.querySelector(".primers-set-header-title");
            primerSetHeaderTitle.innerText = headerTitle;

            // Append primer directionality to primer titles
            const primerTitles = primerSetContainers[i].querySelectorAll(".primer-title");
            primerTitles.forEach((primerTitle) => {
                primerTitle.innerText = primerTitle.innerText + " (5'->3')"
            });
        };

        // Remove unnecessary buttons (increment primer buttons)
        const primerContainers = tempContainer.querySelectorAll(".primer-container");
        primerContainers.forEach((primerContainer) => {
            const primerIncrementButtonsWrapper = primerContainer.querySelector(".primer-increment-buttons-wrapper");
            primerIncrementButtonsWrapper.parentElement.removeChild(primerIncrementButtonsWrapper);
        });
    

        // Apply styles of sidebar primers table to the temporary container
        this._applyComputedStyles(tempContainer);
    
        // Create HTML document to conver to docx
        const extractedContent = tempContainer.innerHTML.trim();
        const fullHTML = `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Primers</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                </style>
            </head>
            <body>
                ${extractedContent} <!-- Extract only the actual content -->
            </body>
            </html>`;
    
        // Save file
        const blob = window.htmlDocx.asBlob(fullHTML);
        document.body.removeChild(tempContainer);
        saveAs(blob, `${outputFileName}.docx`);
    };


    /**
     * Apply css class styles to be element styles
     * 
     * @param {HTMLElement} node - Node to apply css class styles
     */
    _applyComputedStyles(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            // Get computed styles from window
            const computedStyles = window.getComputedStyle(node);
            
            // Iterate over specific styles to apply to inline style
            let inlineStyles = "";
            ["color", "background-color", "font-weight", "font-family", "font-size", "text-align", "border", "padding", "margin"]
            .forEach(style => {
                inlineStyles += `${style}: ${computedStyles.getPropertyValue(style)}; `;
            });

            // Append inline styles
            node.setAttribute("style", inlineStyles);

            // If the node has children nodes, apply their styles as well
            node.childNodes.forEach(this._applyComputedStyles);
        };
    };


    /**
     * Export primers to comma separated values file
     * 
     * @param {String} outputFileName - Name of output file
     * @param {Array[Object]} primerSets - List of primer sets
     */
    _exportPrimersAsCsv(outputFileName, primerSets) {
        // Get primers as 2d array
        const table = this._primersToTable(primerSets, true);

        // Write 2d array to csv
        let csvLines = table.map(function(row) {
            return row.map(function(cell) {
                return '"' + String(cell).replace(/"/g, '""') + '"';
            }).join(',');
        });
        const fileText = csvLines.join('\n');

        // Save file
        this._downloadFile(
            outputFileName + ".csv",
            fileText
        );
    };


    /**
     * Export primers to Excel spreadsheet
     * 
     * @param {String} outputFileName - Name of output file
     * @param {Array[Object]} primerSets - List of primer sets
     */
    _exportPrimersAsXlsx(outputFileName, primerSets) {
        // Get primers as 2d array
        const table = this._primersToTable(primerSets, true);

        // Create new spreadsheet 
        XlsxPopulate.fromBlankAsync()
            .then((workbook) => {
                // Iterate over the rows  and add the entries to the sheet
                for (let i = 0; i < table.length; i++) {
                    const currentRow = table[i];
                    // Iterate over cells in the row and write them
                    for (let j = 0; j < currentRow.length; j++) {
                        const targetCell = this._intToSpreadsheetColumn(j + 1) + (i + 1);
                        workbook.sheet(0).cell(targetCell).value(currentRow[j]);
                    };
                };
                // Return blob
                return workbook.outputAsync();
            })
            .then((blob) => {
                // Save blob to file
                saveAs(blob, outputFileName + ".xlsx");
            })
    };


    /**
     * Export primers to Microsynth order form
     * 
     * @param {String} outputFileName - Name of output file
     * @param {Array[Object]} primerSets - List of primer sets
     */
    _exportPrimersAsMicrosynth(outputFileName, primerSets) {
        // Get primers as 2d array
        const table = this._primersToTable(primerSets, false);


        // Create a list of rows to append to the microsynth form
        const primerList = table.map(([, primerId, primerSeq]) => [
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
        fetch("/static/files/MicrosynthUploadFormDNA.xlsx")
            .then(res => res.arrayBuffer()) // Read as array buffer
            .then(arrayBuffer => XlsxPopulate.fromDataAsync(arrayBuffer)) // Read array buffer as spreadsheet
            .then(workbook => {
                // Iterate over primers and add the entries to the sheet
                for (let i = 0; i < primerList.length; i++) {
                    const currentRow = primerList[i];
                    // Iterate over entries in row and append them to the cells
                    for (let j = 0; j < currentRow.length; j++) {
                        if (currentRow[j] !== null) {
                            const cellAddress = this._intToSpreadsheetColumn(j + 1) + (i + 2);
                            workbook.sheet(1).cell(cellAddress).value(currentRow[j]);
                        };
                    };
                };
                // Return blob
                return workbook.outputAsync();
            })
            .then(blob => saveAs(blob, outputFileName)); // Save blob to file
    };


    /**
     * Download file by creating a blob and saving it.
     * 
     * @param {string} fileName - Name of the output file + extension
     * @param {string} fileContent - Content of output file, either string or array of bytes
     */
    _downloadFile(fileName, fileContent) {
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
    
        if (!newFileSequenceInput ||newFileSequenceInput.length === 0) {
            throw new ParsingError(
                "Cannot Create New File",
                "No sequence specified."
            );
        };

        if (newFileSequenceInput.includes("U")) {
            throw new ParsingError(
                "Cannot Create New File",
                "IVA Prime does not support RNA sequences."
            );
        };

        /** 
         * Generate plasmid object
         */
        // Sanitize sequence
        const newFileSequence = Nucleotides.sanitizeSequence(newFileSequenceInput);
        
        // Get complementary sequence 3'->5'!
        //const newFileComplementarySequence = Nucleotides.complementary(newFileSequence);
        
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
            newFileFeatures = {...newFileFeatures, ...Nucleotides.detectCommonFeatures(newFileSequence)};
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