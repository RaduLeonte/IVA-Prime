const FileIO = new class {
    constructor() {
        document.addEventListener("DOMContentLoaded", function() {
            console.log("FileIO -> Page is done loading.");
            
        });
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
        Promise.all(importTasks).then(() => {
            this.removeLoadingCursor()
            console.log("FileIO.importQueue -> Done.")
        });
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
            function bytesToString(bytes) {
                return Array.from(bytes, byte => byte.toString(16).padStart(2, "0").toUpperCase()).join(" ");
            }

            function parseLength(bytes) {
                return new DataView(new Uint8Array(bytes).buffer).getUint32(0);
            };

            const textDecoder = new TextDecoder("utf-8")
            function bytesToText(bytes) {
                return textDecoder.decode(new Uint8Array(bytes));
            };

            const xmlPrettyPrint = (xmlDoc) => {
                const serializer = new XMLSerializer();
                const xmlString = serializer.serializeToString(xmlDoc);
                return xmlString.replace(/(>)(<)(\/*)/g, '$1\n$2$3');
            };


            // Read array as list of 8 bit integers
            const arrayBuf = new Uint8Array(fileArrayBuffer);
            const bytes = Array.from(arrayBuf);
            // Decode file content as string
            //let fileContent = new TextDecoder().decode(arrayBuf);
            // Init XML parser
            const xmlParser = new XMLParser({ ignoreAttributes: false });


            const blocks = {};
            while (bytes.length > 6) {
                const blockType = bytes.splice(0,1);
                const blockLengthBytes = bytes.splice(0,4)
                const blockLength = parseLength(blockLengthBytes);
                const blockData = bytes.splice(0, blockLength);
                
                blocks[blockType] = blockData;
            };

            if (!blocks[9]) {
                Alerts.error(
                    "Parsing error",
                    "Uploaded file is not a valid .dna file."
                );
                return;
            };

            if (!blocks[0]) {
                Alerts.error(
                    "Parsing error",
                    "No sequence could be found in the uploaded file."
                );
                return;
            };

            /**
             *        00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F   10 11 12 13 14 15 160 17 18 19 1A 1B 1C 1D 1E 1F 
             * 
             * 0x00   09 00 00 00 0E 53 6E 61 70 47 65 6E 65 00 01 00   0F 00 13 00 00 00 1B F0 03 63 67 74 74 61 63 61
             *        |  |________|  |____________________|  |__|  |____|  |__|  |________|  |  |________________...
             *        |      |                 |              |      |      |        |       |           |
             *      block  block          "Snapgene"        seq  exported imported  seq   topology    sequence
             *       id    length                          type  version? version? length+1  byte      starts
             * 
             * Section indices
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
             * Extract sequence type and topology
             * 
             * @param {Aray} bytes 
             * @returns 
             */
            function parseSequence(bytes) {
                /**
                 * 00 -> ss linear
                 * 01 -> ss circular
                 * 02 -> ds linear
                 * 03 -> ds circular
                 * 04 -> ss linear methylated
                 * 05 -> ss circular methylated
                 * 06 -> ds linear methylated
                 * 07 -> ds circular methylated
                 */
                const topologyByte = bytes.splice(0,1)[0];
                const topology = ([0, 2].includes(topologyByte % 4)) ? "linear" : "circular";

                const sequence = bytesToText(bytes);

                return [topology, sequence];
            };
            let [fileTopology, sequence] = parseSequence(blocks[0]);
            const fileSequence = Nucleotides.sanitizeSequence(sequence);
            const fileComplementarySequence = Nucleotides.complementary(fileSequence);
            // #endregion Sequence


            // #region Features
            
            /**
             * Parse features from xml tree
             */
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
             * 
             * @param {Array} bytes 
             */
            function parseFeatures(bytes) {

                // Extract XML tree
                const featuresXMLDoc = xmlParser.parse(bytesToText(bytes));

                const featuresDict = {};

                // Select all <Features> nodes and iterate over them
                const featureNodes = featuresXMLDoc.Features.Feature;
                for (let i = 0; i < featureNodes.length; i++) {
                    // Current node
                    const featureNode = featureNodes[i]; // Current feature
                    //console.log(featureNode)
                    const featureInfo = {}

                    // Feature label
                    featureInfo["label"] = featureNode['@_name'];

                    // Feature type
                    featureInfo["type"] = featureNode['@_type'];
                    if (featureInfo["type"] === "source") continue;


                    // Get feature directionaliy, fwd, rev, both, or null
                    featureInfo["directionality"] = {"1": "fwd", "2": "rev", "3": "both"}[featureNode['@_directionality']] || null;
    
                    // Iterate over <Feature> node children (<Q> and <Segment>) to find properties
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

                                featureInfo[QNodeName] = needsParsing
                                    ? VNode["@_text"].replace(/<\/?[^>]+(>|$)/g, "").replace(/&[a-z\d#]+;/gi, "").trim()
                                    : VNode["@_text"].trim();
                            };
                        };
                    };

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
             * 
             * @param {*} bytes 
             * @returns 
             */
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
            function parsePrimers(bytes) {
                // Extract XML tree

                const primersXMLDoc = xmlParser.parse(bytesToText(bytes));
    
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
             * @param {*} bytes 
             */
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
            function parseNotes(bytes) {
                // Extract XML tree
                const notesXMLString = bytesToText(bytes);

                const notesXMLDoc = xmlParser.parse(notesXMLString);

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
                                    Object.fromEntries(Object.entries(ref).map(([k, v]) => [k.toUpperCase(), v])))
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
    
                    notesDict[key] = value;
                };

                return notesDict;
            };

            let fileAdditionalInfo = {};
            if (blocks[6]) {
                fileAdditionalInfo = parseNotes(blocks[6]);
            };

            console.log("notes", fileAdditionalInfo)

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
            const lines = fileContent.split("\n");

            if (lines.length < 2) {
                Alerts.error(
                    "Parsing error",
                    "No sequence found in FASTA file."
                );
                console.error("No sequence found in FASTA file.")
            };

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
                if (set.type === "Subcloning") {
                    lines.push(`${i+1}. ${set.title} (${set.symmetry}; HR1: ${set.hrLength[0]} nt, ${set.hrTm[0].toFixed(2)} C; HR2: ${set.hrLength[1]} nt, ${set.hrTm[1].toFixed(2)} C)`);
                } else {
                    lines.push(`${i+1}. ${set.title} (${set.symmetry}; HR: ${set.hrLength} nt, ${set.hrTm.toFixed(2)} C)`);
                };
                
                for (let j = 0; j < set.primers.length; j++) {
                    const primer = set.primers[j];

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
                    lines.push(`\t${primer.name}: ${primerSequence} (Total: ${primerSequence.length} nt; TBR: ${tbrLength} nt, ${tbrTm.toFixed(2)} C)`);
                };

                lines.push("");
            };

            const fileText = lines.join("\n");

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
    
        if (!newFileSequenceInput ||newFileSequenceInput.length === 0) {
            Alerts.error(
                "Parsing error",
                "No sequence specified."
            );
            return;
        };

        if (newFileSequenceInput.includes("U")) {
            Alerts.error(
                "Parsing error",
                "IVA Prime does not support RNA sequences."
            );
            return;
        };

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