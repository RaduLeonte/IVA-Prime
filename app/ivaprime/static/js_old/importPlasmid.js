
/**
 * 
 * @param {*} hideObj 
 * @param {*} showObj 
 */
function toggleInputInSelect(hideObj, showObj){
  console.log(hideObj)
  hideObj.disabled = true;		
  hideObj.style.display = 'none';
  console.log(showObj)
  showObj.disabled = false;	
  showObj.style.display = 'inline';
  showObj.focus();
};


/**
 * Genebank file parser.
 * 
 * 
 * TO DO:
 * - fix joined features
 */
function parseGBFile(fileContent) {
  const headerNrSpaces = 12;
  // Extract header
  let currFileHeader = fileContent.substring(0, fileContent.indexOf("FEATURES")).split('\n');

  function parseTextToDict(lines) {
    const propertiesDict = {};
    const references = [];
    const stack = [{ depth: 0, dict: propertiesDict }];

    lines.forEach(line => {
        const depth = line.search(/\S|$/); // Count leading spaces
        const trimmedLine = line.trim();

        if (!trimmedLine) return; // Skip empty lines

        const [key, ...valueParts] = trimmedLine.split(/\s+/);
        const value = valueParts.join(' ');

        // Find the appropriate depth level in the stack
        while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
            stack.pop();
        };

        // Get the current dictionary from the top of the stack
        const currentDict = stack.length > 0 ? stack[stack.length - 1].dict : propertiesDict;

        if (key === 'REFERENCE') {
            // Handle REFERENCE separately
            const referenceEntry = {"REFERENCE": {value, children: {} }};
            references.push(referenceEntry);
            // Push the new reference entry onto the stack
            stack.push({ depth, dict: referenceEntry["REFERENCE"].children });
        } else {
            // Add the new entry to the current dictionary
            currentDict[key] = { value, children: {} };
            // Push the new dictionary and its depth onto the stack
            stack.push({ depth, dict: currentDict[key].children });
        };
    });

    // Add references at the end of the dictionary
    propertiesDict.references = references;

    return propertiesDict;
  };
  
  currFileHeader.shift();
  let newLines = [];
  currFileHeader.map(line => {
    const match = line.match(/^\s*/);
    const leadingSpaces = match ? match[0].length : 0;
    if (leadingSpaces < 12) {
      newLines.push(line);
    } else {
      newLines[newLines.length - 1] += line;
    };
  });

  const fileAdditionalInfo = parseTextToDict(newLines)

  const fileSequence = extractGBSequence(fileContent);
  const fileComplementarySequence = getComplementaryStrand(fileSequence);
  const fileFeatures = extractGBFeatures(fileContent);
  return {
    fileSequence,
    fileComplementarySequence,
    fileFeatures,
    fileAdditionalInfo
  };
};



/**
 * Return the index of the matching subarray of bytes in the input byteArray.
 */
function findSubarrayIndex(byteArray, subarray) {
  for (let i = 0; i <= byteArray.length - subarray.length; i++) {
    let match = true;
    for (let j = 0; j < subarray.length; j++) {
      if (byteArray[i + j] !== subarray[j]) {
        match = false;
        break;
      };
    };
    if (match) {
      return i;
    };
  };
  return -1;
};


/**
 * Snapgene file parser.
 */
function parseDNAFile(fileArrayBuffer) {
  const arrayBuf = new Uint8Array(fileArrayBuffer);
  let fileContent = new TextDecoder().decode(arrayBuf);

  const sequenceLengthHex = Array.from(arrayBuf.slice(20, 24)).map(byte => (byte.toString(16)));
  const sequenceLength = parseInt(sequenceLengthHex.join(" ").replace(/\s/g, ''), 16);
  console.log("parseDNAFile ->", sequenceLength, sequenceLengthHex, arrayBuf.slice(20, 24));
  
  const sequenceStartIndex = 25;
  let sequenceBA = arrayBuf.slice(sequenceStartIndex, sequenceStartIndex + sequenceLength);
  let fileSequence = new TextDecoder().decode(sequenceBA).toUpperCase().replace(/[^TACGN]/gi, ''); // Convert to string and only keep ACTG
  let fileComplementarySequence = getComplementaryStrand(fileSequence); // Create complementary strand


  const xmlParser = new DOMParser();

  /**
   * Extract features
   */
  // Extract XML tree
  let featuresXMLString = fileContent.slice(fileContent.indexOf("<Features"), fileContent.indexOf("</Feature></Features>") + "</Feature></Features>".length);
  const featuresXMLDoc = xmlParser.parseFromString(featuresXMLString, 'text/xml');
  
  // Initialize dict and iterate over all feature elements in the object
  let featuresDict = {};
  const featuresList = featuresXMLDoc.getElementsByTagName('Feature');
  for (let i = 0; i < featuresList.length; i++) {
      const feature = featuresList[i]; // Current feature
      const featureId = getUUID();

      // All the feature properties
      const featureInfo = {}
      featureInfo["type"] = feature.getAttribute('type');
      featureInfo["label"] = feature.getAttribute('name'); // Display name
      const spanDirectionality = feature.getAttribute('directionality');
      featureInfo["span"] = "";
      featureInfo["note"] = "";

      // Iterate over children to find properties
      const featureChildren = feature.children;
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
    fileAdditionalInfo
  };
};



/**
 * GB file exporter.
 * TO DO:
 * - rn scrubs most info in the header
 */
function exportGBFile(plasmidIndex) {
  const currPlasmid = Project.getPlasmid(plasmidIndex);

  // Output file name
  const outputFileExtension = "gb";
  const outputFileName = removeExtension(currPlasmid.name);
  
  // Init variables
  let outputFileContent = "";
  let currLine = "";

  // Select target sequence and features
  const currSequence = currPlasmid.sequence;
  const currFeatures = currPlasmid.features;


  /**
   * File header
   */

  // Apend the header
  const headerNrSpaces = 12; // Descriptor width
  const headerValueSpaces = 68; // Descriptor value width
  
  // Iterate over entries
  let truncatedName = outputFileName;
  const truncatedNameLength = 16;
  if (truncatedName.length > truncatedNameLength) {
    // Truncate longer strings
    truncatedName = truncatedName.substring(0, truncatedNameLength);
  } else if (truncatedName.length < truncatedNameLength) {
      // Fill shorter strings with text
      truncatedName = truncatedName + " ".repeat(truncatedNameLength - truncatedName.length);
  };

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const currentDate = new Date();
  const day = currentDate.getDate().toString().padStart(2, '0');
  const month = months[currentDate.getMonth()];
  const year = currentDate.getFullYear();
  const fileHeaderDate = `${day}-${month}-${year}`;
  outputFileContent += "LOCUS       " + truncatedName + "        " + currSequence.length + " bp DNA     circular SYN " + fileHeaderDate + "\n";

  /**
   * File header boilerplate
   */
  // Check if header can be reused
  let fileHeader;
  if ((currPlasmid.extension === ".gbk" || currPlasmid.extension === ".gb") &&  currPlasmid.additionalInfo !== null) {
    fileHeader = currPlasmid.additionalInfo;
  } else {
    fileHeader = {
      "DEFINITION": {
        "value": ".",
        "children": {}
      },
      "ACCESSION": {
        "value": ".",
        "children": {}
      },
      "VERSION": {
        "value": ".",
        "children": {}
      },
      "KEYWORDS": {
        "value": ".",
        "children": {}
      },
      "SOURCE": {
        "value": "synthetic DNA construct",
        "children": {
          "ORGANISM": {
            "value": "synthetic DNA construct",
            "children": {}
          }
        }
      },
      "references": []
    };
  };

  const referencesSoFar = fileHeader["references"].length;
  fileHeader["references"].push({
    "REFERENCE": {
      "value": `${referencesSoFar+1} (bases 1 to ${currSequence.length})`,
      "children": {
        "AUTHORS": {
          "value": ".",
          "children": {}
        },
        "TITLE": {
          "value": "Direct Submission",
          "children": {}
        },
        "JOURNAL": {
          "value": "Exported with IVA Prime :) \nhttps://www.ivaprime.com",
          "children": {}
        }
      }
    }
  });
  fileHeader["references"].push({
    "REFERENCE": {
      "value": `${referencesSoFar+2} (bases 1 to ${currSequence.length})`,
      "children": {
        "AUTHORS": {
          "value": ".",
          "children": {}
        },
        "TITLE": {
          "value": "Direct Submission",
          "children": {}
        },
        "JOURNAL": {
          "value": "SnapGene Viewer",
          "children": {}
        }
      }
    }
  });
  console.log(fileHeader);

  const maxValueLenth = 80;
  const maxKeyLength = 12;
  let fileHeaderString = "";

  function recursiveDictPrint(dict, depth) {
    Object.keys(dict).forEach(key => {
      if (key !== "references") {
        fileHeaderString += " ".repeat(depth) + key + " ".repeat(maxKeyLength - key.length - depth);
        
        const valueLines = dict[key]["value"].split("\n");
        let valueLinesToAdd = [];
        for (let i = 0; i < valueLines.length; i++) {
          const valueLine = valueLines[i]
          for (let j = 0; j < valueLine.length; j += maxValueLenth) {
            valueLinesToAdd.push(valueLine.substring(j, j + maxValueLenth));
          };
        }
        for (let i = 0; i < valueLinesToAdd.length; i++) {
          if (i !== 0) {
            fileHeaderString += "            ";
          };
          fileHeaderString += valueLinesToAdd[i] + "\n"
        };

        recursiveDictPrint(dict[key]["children"], depth+2)
      } else {
        dict[key].forEach((reference) => {
          recursiveDictPrint(reference, depth)
      });
      }
    });
  };

  recursiveDictPrint(fileHeader, 0);

  console.log(fileHeaderString)

  outputFileContent += fileHeaderString;
  /**
   * File features
   */
  const featureTitleShift = 5;
  const featureTitleWidth = 16;
  const featureValueWidth = 58;
  outputFileContent += "FEATURES             Location/Qualifiers\n";
  const entries = Object.entries(currFeatures);
  for (const [key, value] of entries) {
    if (key !== "LOCUS") {
      const featureType = value["type"];
      outputFileContent += " ".repeat(featureTitleShift) + featureType + " ".repeat(featureTitleWidth - featureType.length) + value["span"] + "\n";
      const featureInfo = Object.entries(value);
      for (const [propertyName, propertyValue] of featureInfo) {
        if (!["span", "color", "ivaprimeColor", "type", "phosphorylated"].includes(propertyName) && propertyValue !== "") {
          let featureToAppend;
          if (propertyName === "label" || propertyName === "codon_start" || propertyName === "direction") {
            featureToAppend = "/" + propertyName + "=" + propertyValue + "";
          } else {
            featureToAppend = "/" + propertyName + "=\"" + propertyValue + "\"";
          };
          for (let i = 0; i < featureToAppend.length; i += featureValueWidth) {
            outputFileContent += " ".repeat(featureTitleWidth + featureTitleShift) + featureToAppend.slice(i, i + featureValueWidth) + "\n";
          };
        };
      };

      /**
       * /note="color: black; sequence: 
                     aggccccaaggggttatgctagttattgctcagcggtggcagcagccaa; added: 
                     2024-05-20"
       */
      if (featureType == "primer_bind" ||featureType == "primer") {
        const boundStrand = (!value["span"].includes("complement")) ? "0": "1";
        const primerSpan = removeNonNumeric(value["span"]).split("..").map(Number).map(function(x) { return x-1 });;
        const primerSequence = (boundStrand == "0") ? currSequence.slice(primerSpan[0], primerSpan[1] + 1): getComplementaryStrand(currSequence.slice(primerSpan[0], primerSpan[1])).split("").reverse().join("");
        let featureToAppend = `/note="color: black; sequence: ${primerSequence}"`;
        for (let i = 0; i < featureToAppend.length; i += featureValueWidth) {
          outputFileContent += " ".repeat(featureTitleWidth + featureTitleShift) + featureToAppend.slice(i, i + featureValueWidth) + "\n";
        };
      }
    };
  };
  outputFileContent.replace("     primer_bind     ", "     primer          ");


  /**
   * File sequence
   */
  outputFileContent += "ORIGIN\n";
  let seqIndex = 1;
  let lastIndex = Math.floor(currSequence.length / 60) * 60 + 1;
  while (currSequence.slice(seqIndex)) {
    currLine = "";
    currLine +=  " ".repeat(lastIndex.toString().length + 1 - seqIndex.toString().length) + seqIndex

    for (let i = 0; i < 6; i++) {
      currLine += " " + currSequence.slice(seqIndex - 1 + i*10, seqIndex - 1 + i*10 + 10).toLowerCase();
    }

    outputFileContent += currLine + "\n";
    seqIndex += 60;
  };
  outputFileContent += "//\n";

  // Send for download
  downloadFile(
    outputFileName,
    outputFileContent,
    outputFileExtension
  );
};


/**
 * DNA file exporter.
 */
async function exportDNAFile(plasmidIndex) {
  const currPlasmid = Project.getPlasmid(plasmidIndex);

  // Output file name
  const outputFileExtension = "dna"
  const outputFileName =  removeExtension(currPlasmid.name);

  // Select target sequence and features
  const currSequence = currPlasmid.sequence;
  const currFeatures = currPlasmid.features;

  // XML parser
  const xmlParser = new DOMParser();
  // XML serializer
  const xmlSerializer = new XMLSerializer();


  /**
   * Integer to 4 bytes hex
   */
  function inToHexBytes(number) {
    const buffer = new ArrayBuffer(4); // 4 bytes
    const view = new DataView(buffer);
    view.setUint32(0, number, false); // true means little-endian (least significant byte first)

    // Convert the DataView to a string
    const byteArray = new Uint8Array(buffer);
    const byteString = Array.from(byteArray).map(byte => byte.toString(16).padStart(2, '0')).join(' ');

    return byteString;
  };


  function addBytes(byteString) {
    const bytesToAdd = byteString.split(' ').map(hex => parseInt(hex, 16));
    outputBytes.push(...bytesToAdd);
  };


  function stringToBytes(inputString) {
    const encoder = new TextEncoder('utf-8');
    const bytes = encoder.encode(inputString);
  
    const byteArray = [];
    for (let i = 0; i < bytes.length; i++) {
      const byteHex = bytes[i].toString(16).padStart(2, '0');
      byteArray.push(byteHex);
    };
  
    return byteArray.join(' ');
  };


  /**
   * Fil header
   */
  const outputBytes = []
  // File magic bytes (19)
  addBytes("09 00 00 00 0e 53 6e 61 70 47 65 6e 65 00 01 00 0f 00");
  // Version byte?
  // SnapGene 6.0.3 -> 11
  // SnapGene 7.1.1 -> 13
  addBytes("13");
  // File type designation byte (unknown 00, dna 01, rna 20, prot 15)
  addBytes("00");

  // sequence length +1 (4 bytes)
  console.log("exportDNAFile", inToHexBytes(currSequence.length + 1))
  addBytes(inToHexBytes(currSequence.length + 1));

  // plasmid type byte (ss+lin = 00, ss+circ=01, ds+lin=02, ds+circ=03)
  addBytes("03");

  /**
   * Sequence bytes
   */
  addBytes(stringToBytes(currSequence.toLowerCase()));
  console.log("exportDNAFile", currSequence.length, currSequence)
  console.log("exportDNAFile", stringToBytes(currSequence.toLowerCase()).length, stringToBytes(currSequence.toLowerCase()))
  // Stop byte sequence
  addBytes("02");

  /**
   * Filler bytes, some info about restriction enzymes but other wise not sure
   * seem to be necessary to keep compatibility with earlier versions
   */
  const fillerBytesResponse = await fetch("/static/dnaFillerBytes.txt")
  const dnaFillerBytes =  await fillerBytesResponse.text();
  addBytes(dnaFillerBytes);

  
  /**
   * Alignable sequences
   */
  // length
  addBytes("00 00 00 2d"); //(default xml length)
  // content
  const defaultAlignableSequencesXML = "<AlignableSequences trimStringency=\"Medium\"/>";
  addBytes(stringToBytes(defaultAlignableSequencesXML));
  // stop byte
  addBytes("08");


  /**
   * Additional sequence properties
   */
  const defaultAdditionalSequenceProperties = "<AdditionalSequenceProperties><UpstreamStickiness>0</UpstreamStickiness><DownstreamStickiness>0</DownstreamStickiness><UpstreamModification>FivePrimePhosphorylated</UpstreamModification><DownstreamModification>FivePrimePhosphorylated</DownstreamModification></AdditionalSequenceProperties>";
  // Add length
  console.log("exportDNAFile", inToHexBytes(defaultAdditionalSequenceProperties.length))
  addBytes(inToHexBytes(defaultAdditionalSequenceProperties.length));
  // Add xml string
  addBytes(stringToBytes(defaultAdditionalSequenceProperties));
  // Stop byte
  addBytes("0a");


  /**
   * FEATURES
   */
  // Create an XML document
  const nrOfFeatures = Object.keys(currFeatures).filter(item => item !== "LOCUS" && currFeatures[item]["type"] !== "primer_bind").length;

  // Create the XML document with the correct root structure
  const featuresXMLDoc = xmlParser.parseFromString(
    '<?xml version="1.0" ?><Features nextValidID="' + nrOfFeatures + '"></Features>',
    'application/xml'
  );

  // Ensure the "Features" element is correctly added as the root element
  const featuresXMlRoot = featuresXMLDoc.documentElement;
  let i = 0;
  for (const key in currFeatures) {
    if (key !== "LOCUS") {
      const value = currFeatures[key];

      if (key === "source") {1
        // Feature
        const xmlFeatureElement = featuresXMLDoc.createElement('Feature');
        xmlFeatureElement.setAttribute('recentID', i + "");
        i++;
        xmlFeatureElement.setAttribute('name', "source");
        xmlFeatureElement.setAttribute('type', "source");
        xmlFeatureElement.setAttribute('allowSegmentOverlaps', "0");
        xmlFeatureElement.setAttribute('consecutiveTranslationNumbering', "1");
        xmlFeatureElement.setAttribute('visible', "0");

        // Segment
        const xmlSegmentElement = featuresXMLDoc.createElement('Segment');
        xmlSegmentElement.selfClosing = true;
        xmlSegmentElement.setAttribute('range', removeNonNumeric(value["span"]).replace("..", "-"));
        if (value["color"]) {
          xmlSegmentElement.setAttribute('color', value["color"]);
        } else {
          xmlSegmentElement.setAttribute('color', "#ffffff");
        };
        xmlSegmentElement.setAttribute('type', "standard");

        xmlFeatureElement.appendChild(xmlSegmentElement) // Append

        // Q mol_type
        if (value["mol_type"]) {
          const xmlQmoltype = featuresXMLDoc.createElement('Q');
          xmlQmoltype.setAttribute('name', "mol_type");

          const xmlVmoltype = featuresXMLDoc.createElement('V');
          xmlVmoltype.selfClosing = true;
          xmlVmoltype.setAttribute('predef', value["mol_type"]);

          xmlQmoltype.appendChild(xmlVmoltype) // Apend
          xmlFeatureElement.appendChild(xmlQmoltype) // Apend
        };

        // Q organism
        if (value["organism"]) {
          const xmlQOrganism = featuresXMLDoc.createElement('Q');
          xmlQOrganism.setAttribute('name', "organism");

          const xmlVOrganism = featuresXMLDoc.createElement('V');
          xmlVOrganism.selfClosing = true;
          xmlVOrganism.setAttribute('text', value["organism"]);

          xmlQOrganism.appendChild(xmlVOrganism) // Apend
          xmlFeatureElement.appendChild(xmlQOrganism) // Apend
        };
        
        featuresXMlRoot.appendChild(xmlFeatureElement);
      } else if (value["type"] !== "primer_bind" && value["type"] !== "primer") {
        // Feature
        const xmlFeatureElement = featuresXMLDoc.createElement('Feature');
        xmlFeatureElement.setAttribute('recentID', i + "");
        i++;
        xmlFeatureElement.setAttribute('name', value["label"]);
        xmlFeatureElement.setAttribute('directionality', (!value["span"].includes("complement")) ? "1": "2");
        xmlFeatureElement.setAttribute('readingFrame', (!value["span"].includes("complement")) ? "1": "-1");
        xmlFeatureElement.setAttribute('type', value["type"]);
        xmlFeatureElement.setAttribute('allowSegmentOverlaps', "0");
        xmlFeatureElement.setAttribute('consecutiveTranslationNumbering', "1");

        // Segment
        const xmlSegmentElement = featuresXMLDoc.createElement('Segment');
        xmlSegmentElement.selfClosing = true;
        xmlSegmentElement.setAttribute('range', removeNonNumeric(value["span"]).replace("..", "-"));
        if (value["color"]) {
          xmlSegmentElement.setAttribute('color', value["color"]);
        } else {
          xmlSegmentElement.setAttribute('color', "#ffffff");
        };
        xmlSegmentElement.setAttribute('type', "standard");

        // If feature is translated, add segment attribute
        if (value["translation"]) {
          xmlSegmentElement.setAttribute('translated', "1");
        };

        xmlFeatureElement.appendChild(xmlSegmentElement) // Append

        // Q Label
        if (value["label"]) {
          const xmlQLabel = featuresXMLDoc.createElement('Q');
          xmlQLabel.setAttribute('name', "label");

          const xmlVLabel = featuresXMLDoc.createElement('V');
          xmlVLabel.selfClosing = true;
          xmlVLabel.setAttribute('text', value["label"]);

          xmlQLabel.appendChild(xmlVLabel) // Apend
          xmlFeatureElement.appendChild(xmlQLabel) // Apend
        };

        // Q Note
        if (value["note"]) {
          const xmlQNote = featuresXMLDoc.createElement('Q');
          xmlQNote.setAttribute('name', "note");

          const xmlVNote = featuresXMLDoc.createElement('V');
          xmlVNote.selfClosing = true;
          xmlVNote.setAttribute('text', value["note"]);

          xmlQNote.appendChild(xmlVNote) // Apend
          xmlFeatureElement.appendChild(xmlQNote) // Apend
        };

        // Q Translation
        if (value["translation"]) {
          const xmlQCodonStart = featuresXMLDoc.createElement('Q');
          xmlQCodonStart.setAttribute('name', "codon_start");

          const xmlVCodonStart = featuresXMLDoc.createElement('V');
          xmlVCodonStart.selfClosing = true;
          xmlVCodonStart.setAttribute('int', "1");

          xmlQCodonStart.appendChild(xmlVCodonStart) // Apend
          xmlFeatureElement.appendChild(xmlQCodonStart) // Apend

          const xmlQTranslatable = featuresXMLDoc.createElement('Q');
          xmlQTranslatable.setAttribute('name', "transl_table");

          const xmlVTranslatable = featuresXMLDoc.createElement('V');
          xmlVTranslatable.selfClosing = true;
          xmlVTranslatable.setAttribute('int', "1");

          xmlQTranslatable.appendChild(xmlVTranslatable) // Apend
          xmlFeatureElement.appendChild(xmlQTranslatable) // Apend

          const xmlQTranslation = featuresXMLDoc.createElement('Q');
          xmlQTranslation.setAttribute('name', "translation");

          const xmlVTranslation = featuresXMLDoc.createElement('V');
          xmlVTranslation.selfClosing = true;
          xmlVTranslation.setAttribute('text', value["translation"]);

          xmlQTranslation.appendChild(xmlVTranslation) // Apend
          xmlFeatureElement.appendChild(xmlQTranslation) // Apend
        };

        featuresXMlRoot.appendChild(xmlFeatureElement);
      };
    };
  };

  // Serialize the XML tree to a string
  const featuresXMLString = xmlSerializer.serializeToString(featuresXMLDoc).replace(/[\n\r]/g, '').replace(" encoding=\"UTF-8\"", "");

  const emptyFeaturesXML = "<?xml version=\"1.0\"?><Features nextValidID=\"1\"><Feature recentID=\"0\" name=\"Feature 1\" type=\"misc_feature\" allowSegmentOverlaps=\"0\" consecutiveTranslationNumbering=\"1\"><Segment range=\"2-3\" color=\"#a6acb3\" type=\"standard\"/></Feature></Features>";
  // length
  addBytes(inToHexBytes(featuresXMLString.length + 1));
  // content
  addBytes(stringToBytes(featuresXMLString));
  // stop byte
  addBytes("0a 05");



  /**
   * Primers
   */
  const nrOfPrimers = Object.keys(currFeatures).filter(item => currFeatures[item]["type"] == "primer_bind" || currFeatures[item]["type"] == "primer").length;

  // Create the XML document with the correct root structure
  const primersXMLDoc = xmlParser.parseFromString(
    '<?xml version="1.0" ?><Primers nextValidID="' + nrOfPrimers + '"></Primers>',
    'application/xml'
  );

  // Ensure the "Features" element is correctly added as the root element
  const primersXMLRoot = primersXMLDoc.documentElement;

  const xmlHybridizationParamsElement = primersXMLDoc.createElement('HybridizationParams');
  xmlHybridizationParamsElement.selfClosing = true;
  xmlHybridizationParamsElement.setAttribute('minContinuousMatchLen', "10");
  xmlHybridizationParamsElement.setAttribute('allowMismatch', "1");
  xmlHybridizationParamsElement.setAttribute('minMeltingTemperature', "40");
  xmlHybridizationParamsElement.setAttribute('showAdditionalFivePrimeMatches', "1");
  xmlHybridizationParamsElement.setAttribute('minimumFivePrimeAnnealing', "15");
  primersXMLRoot.appendChild(xmlHybridizationParamsElement)


  const currPrimers = {};
  for (const [key, value] of Object.entries(currFeatures)) {
    // Check if the value matches the specific value
    if (value["type"] === "primer_bind") {
        // Add the key-value pair to the new dictionary
        currPrimers[key] = value;
    };
  };
  i = 0;
  for (const key in currPrimers) {
    if (key !== "LOCUS") {
      const value = currPrimers[key];
      if (key !== "source" && value["type"] == "primer_bind") {
        // Primer
        const xmlPrimerElement = primersXMLDoc.createElement('Primer');
        xmlPrimerElement.setAttribute('recentID', i + "");i++;
        xmlPrimerElement.setAttribute('name', value["label"]);
        const boundStrand = (!value["span"].includes("complement")) ? "0": "1";
        const primerSpan = removeNonNumeric(value["span"]).split("..").map(Number).map(function(x) { return x-1 });;
        const primerSequence = (boundStrand == "0") ? currSequence.slice(primerSpan[0], primerSpan[1] + 1): getComplementaryStrand(currSequence.slice(primerSpan[0], primerSpan[1] + 1)).split("").reverse().join("");
        xmlPrimerElement.setAttribute('sequence', primerSequence.toLowerCase());
        if (value["phosphorylated"] == true) {
          xmlPrimerElement.setAttribute('phosphorylated', "1");
        };
        xmlPrimerElement.setAttribute('description', "<html><body>" + value["note"] + "</body></html>");
        xmlPrimerElement.setAttribute('dateAdded', "2024-05-20T12:51:58Z");


        // BindingSite
        const xmlBindingSiteElement = primersXMLDoc.createElement('BindingSite');
        xmlBindingSiteElement.setAttribute('simplified', "1");
        xmlBindingSiteElement.setAttribute('location', primerSpan.join("-"));
        xmlBindingSiteElement.setAttribute('boundStrand', boundStrand);
        xmlBindingSiteElement.setAttribute('annealedBases', primerSequence.toLowerCase());
        xmlBindingSiteElement.setAttribute('meltingTemperature', Math.round(getMeltingTemperature(primerSequence, meltingTempAlgorithmChoice)));

        // Component
        const xmlComponentElement = primersXMLDoc.createElement('Component');
        xmlComponentElement.selfClosing = true;
        xmlComponentElement.setAttribute('hybridizedRange', primerSpan.join("-"));
        xmlComponentElement.setAttribute('bases', primerSequence.toLowerCase());

        xmlBindingSiteElement.appendChild(xmlComponentElement);

        const xmlBindingSiteElementSimplified = xmlBindingSiteElement.cloneNode(true);
        xmlBindingSiteElement.removeAttribute('simplified');

        xmlPrimerElement.appendChild(xmlBindingSiteElement);
        xmlPrimerElement.appendChild(xmlBindingSiteElementSimplified);
        primersXMLRoot.appendChild(xmlPrimerElement);
      };
    };
  };

  // Serialize the XML tree to a string
  const primersXMLString = xmlSerializer.serializeToString(primersXMLDoc).replace(/[\n\r]/g, '').replace(" encoding=\"UTF-8\"", "");

  // Now, xmlString contains the XML structure as a string
  //downloadFile('featuresXMLTree', xmlString, 'xml');

  const emptyPrimersXML = "<?xml version=\"1.0\"?><Primers nextValidID=\"1\"><HybridizationParams minContinuousMatchLen=\"10\" allowMismatch=\"1\" minMeltingTemperature=\"40\" showAdditionalFivePrimeMatches=\"1\" minimumFivePrimeAnnealing=\"15\"/></Primers>";
  // length
  // testing adding 1 to the length
  addBytes(inToHexBytes(primersXMLString.length + 1));
  // content
  addBytes(stringToBytes(primersXMLString));
  // stop byte
  addBytes("0a 06");

  /**
   * NOTES
   */
  // Universally unique identifier
  let uuid = getUUID();
  if (!uuid) {
    uuid = "00000000-0000-0000-0000-000000000000"
  };
  // Time and date
  const currentTime = Date.now();
  const currentDate = new Date(currentTime);
  const hours = currentDate.getHours().toString().padStart(2, '0');
  const minutes = currentDate.getMinutes().toString().padStart(2, '0');
  const seconds  = currentDate.getSeconds().toString().padStart(2, '0');
  const timeHMS = `${hours}:${minutes}:${seconds}`

  const year = currentDate.getFullYear();
  const month = (currentDate.getMonth() + 1).toString()
  const day = currentDate.getDate().toString()
  const dateYMD = `${year}.${month}.${day}`;

  // added line feeds \n
  const notesXML = `<Notes>
<UUID>${uuid}</UUID>
<Type>Natural</Type>
<Created UTC=\"${timeHMS}\">${dateYMD}</Created>
<LastModified UTC=\"${timeHMS}\">${dateYMD}</LastModified>
<SequenceClass>UNA</SequenceClass>
<TransformedInto>unspecified</TransformedInto>
<References>
<Reference journalName="Exported with IVA Prime :) &lt;a href='https://www.ivaprime.com'>https://www.ivaprime.com&lt;/a>" type="Journal Article" journal="Exported with IVA Prime :) &lt;a href='https://www.ivaprime.com'>https://www.ivaprime.com&lt;/a>" title="Direct Submission"/>
<Reference journalName="SnapGene Viewer" type="Journal Article" journal="SnapGene Viewer" title="Direct Submission"/>
</References>
</Notes>`;
  // length
  addBytes(inToHexBytes(notesXML.length + 1));
  // content
  addBytes(stringToBytes(notesXML));
  // stop byte
  addBytes("0a 0d");
  
  /**
   * Closing bytes
   */
  //                                             this byte is set to 00 in newer versions (7.1.1)
  //                                             |
  const closingBytes = "00 00 01 59 01 00 00 00 01 00 00 4b 00 00 00 00 00 00 00 00 00 03 55 6e 69 71 75 65 20 36 2b 20 43 75 74 74 65 72 73 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 19 ff 00 64 00 00 00 00 00 54 48 4f 00 ff fe 00 00 00 00 00 00 00 00 00 00 00 00 01 01 01 01 00 01 00 45 00 00 00 00 00 00 00 00 00 00 00 00 01 00 00 01 ff ff ff ff 01 59 01 f4 01 01 3f 00 50 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 1c 00 00 00 33 3c 3f 78 6d 6c 20 76 65 72 73 69 6f 6e 3d 22 31 2e 30 22 3f 3e 3c 45 6e 7a 79 6d 65 56 69 73 69 62 69 6c 69 74 69 65 73 20 76 61 6c 73 3d 22 22 2f 3e 0a 0e 00 00 00 29 3c 3f 78 6d 6c 20 76 65 72 73 69 6f 6e 3d 22 31 2e 30 22 3f 3e 3c 43 75 73 74 6f 6d 45 6e 7a 79 6d 65 53 65 74 73 2f 3e 0a";
  addBytes(closingBytes);

  // Send for download
  downloadFile(outputFileName, outputBytes, outputFileExtension);
};


/**
 * Starts a translation at the specified position and populates the amino acid row with the translation.
 * 
 * TO DO:
 * - add an option to start translating immediately or inside selected text
 */
function startTranslation(codonPos) {
  // Select the corresponding features and sequence
  const currPlasmid = Project.activePlasmid();
  let currSequence = currPlasmid.sequence;
  let currGridStructure = currPlasmid.gridStructure;
  let currTable = document.getElementById("sequence-grid-" + Project.activePlasmidIndex);

  // Convert to table coordinates based on the row order in the grid structure
  const rowIndexAA = currGridStructure.indexOf("Amino Acids");
  let tableCoords = seqIndexToCoords(codonPos, rowIndexAA, currGridStructure);

  // Get the row and column, increment the column by 1 because the amino acids are
  // displayed in the middle cell of a group of 3 cells
  let row = tableCoords[0];
  let col = tableCoords[1] + 1;

  // Start translating until a stop codon is encountered
  let aaIndex = 1;
  while (true) {
    // Select current codon
    let codon = repeatingSlice(currSequence, codonPos - 1, codonPos + 2);
    // Get the corresponding amino acid
    let aminoAcid = translateCodon(codon);

    // Fill the cells
    fillAACells(row, col, aminoAcid, currTable, currGridStructure, aaIndex);
    aaIndex++;
    // Jump to next position
    col += 3;
    codonPos += 3;
    // If we've jumped off of the table go to the next row
    if (col > gridWidth) {
      col -= gridWidth;
      row += currGridStructure.length;
    };
    // If the last displayed amino acid was a stop codon or we've reached the end of the sequence, stop
    if (aminoAcid === "-" || codonPos > currSequence.length){
      break;
    };
  };
};


/**
 * Translate specific span
 */
/**
 * 
 * @param {*} targetStrand - "fwd" || any string
 * @param {*} rangeStart 
 * @param {*} rangeEnd 
 * @param {*} targetTable 
 * @param {*} currGridStructure 
 * @param {*} plasmidIndex 
 */
function translateSpan(targetStrand, rangeStart, rangeEnd, targetTable, currGridStructure, plasmidIndex) {
  console.log("translateSpan", targetStrand, rangeStart, rangeEnd, targetTable, currGridStructure, plasmidIndex)
  
  // Select the corresponding features and sequence
  const currPlasmid = Project.getPlasmid(plasmidIndex);
  const currSequence = (targetStrand === "fwd") ? currPlasmid.sequence: currPlasmid.complementarySequence;

  const codonStartPos = (targetStrand === "fwd") ? rangeStart: rangeEnd - 1;
  const codonEndPos = (targetStrand === "fwd") ? rangeEnd + 1: rangeStart + 1;
  let codonPos = codonStartPos;
  const dir = (targetStrand === "fwd") ? 1: -1;

  // Convert to table coordinates based on the row order in the grid structure
  let tableCoords = seqIndexToCoords(codonStartPos, currGridStructure.indexOf("Amino Acids"), currGridStructure);

  // Get the row and column, increment the column by 1 because the amino acids are
  // displayed in the middle cell of a group of 3 cells
  let row = tableCoords[0];
  let col = tableCoords[1] + 1*dir;
  console.log("translateSpan", row, col);


  // Start translating until a stop codon is encountered
  let aaIndex = 1;
  let translatedSequence = "";
  while (true) {
    // Select current codon
    let codon = repeatingSlice(currSequence, codonPos - 1, codonPos + 2);
    if (targetStrand !== "fwd") {
      codon = repeatingSlice(currSequence, codonPos - 3, codonPos).split("").reverse().join("");
    };
    // Get the corresponding amino acid
    let aminoAcid = translateCodon(codon);
    translatedSequence += aminoAcid;

    // Fill the cells
    fillAACells(row, col, aminoAcid, targetTable, currGridStructure, aaIndex);
    aaIndex++;
    // Jump to next position
    col += 3*dir;
    codonPos += 3*dir;
    // If we've jumped off of the table go to the next row
    if (col > gridWidth || col < 0) {
      col -= gridWidth*dir;
      row += currGridStructure.length*dir;
    };
    // If the last displayed amino acid was a stop codon or we've reached the end of the sequence, stop
    const breakCondition = (codonEndPos - codonPos)*dir <= 0;
    if (codonPos > currSequence.length || breakCondition) {
      break;
    };
  };

  const translationSpan = (targetStrand === "fwd") ? [rangeStart, rangeEnd]: [rangeEnd, rangeStart];
  const translationDict = {"span": translationSpan, "sequence": translatedSequence}
  const targetDict = (targetStrand === "fwd") ? "forward": "reverse";
  
  Project.getPlasmid(plasmidIndex).translations[targetDict].push(translationDict);

  return translatedSequence;
};


/**
 * 
 */
function translateSequence(inputSequence) {
  let outputSequence = "";
  for (let i = 0; i < inputSequence.length - (inputSequence.length % 3); i += 3) {
    outputSequence += translateCodon(inputSequence.slice(i, i+3))
  };

  return outputSequence;
};