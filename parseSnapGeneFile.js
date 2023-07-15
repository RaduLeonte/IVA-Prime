
function findSubarrayIndex(byteArray, subarray) {
    for (let i = 0; i <= byteArray.length - subarray.length; i++) {
      let match = true;
      for (let j = 0; j < subarray.length; j++) {
        if (byteArray[i + j] !== subarray[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        return i;
      }
    }
    return -1;
  }
  

function parseDNAFile(fileContent, pNr) {
    let fileBA = new TextEncoder().encode(fileContent);

    // Sequence
    let sequenceBA = fileBA.slice(25, findSubarrayIndex(fileBA, [2, 0, 0]));
    currSequence = new TextDecoder().decode(sequenceBA).toUpperCase();
    currComplementarySequence = getComplementaryStrand(currSequence);

    // Features
    let featuresString = fileContent.slice(fileContent.indexOf("<Features"), fileContent.indexOf("</Feature></Features>") + "</Feature></Features>".length);
    console.log(featuresString)


    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(featuresString, 'text/xml');
    
    const featuresDict = {};
    const featuresList = xmlDoc.getElementsByTagName('Feature');
    for (let i = 0; i < featuresList.length; i++) {
        const feature = featuresList[i];

        const featureName = feature.getAttribute('name') + i;

        const featureInfo = {}
        featureInfo["label"] = feature.getAttribute('name');
        featureInfo["span"] = "";
        featureInfo["note"] = "";
        let spanStart = null;
        let spanEnd = null;
        const featureChildren = feature.children;
        for (let j = 0; j < featureChildren.length; j++) {
            const child = featureChildren[j];
            const childName = child.nodeName;
            if (childName === "Segment") {
                let currSpan = child.getAttribute('range').split("-");

                let currSpanStart = currSpan[0];
                if (!spanStart || spanStart > currSpanStart) {
                    spanStart = currSpanStart;
                }

                let currSpanEnd = currSpan[1];
                if (!spanEnd || currSpanEnd > spanEnd) {
                    spanEnd = currSpanEnd;
                }
            }
            if (childName === "Q") {
                const subNoteName = child.getAttribute('name');
                let subNoteEntry = "";
                if (child.children[0].attributes.getNamedItem("int")) {
                    subNoteEntry = child.children[0].getAttribute("int");
                }
                if (child.children[0].attributes.getNamedItem("text")) {
                    subNoteEntry = child.children[0].getAttribute("text");
                    subNoteEntry = new DOMParser().parseFromString(subNoteEntry, 'text/html').body.textContent;
                }
                featureInfo["note"] += subNoteName + ": " + subNoteEntry + "; ";
            }
        }
        
        featureInfo["span"] = spanStart + ".." + spanEnd;
        featuresDict[featureName] = featureInfo;

    }

    if (pNr === 1) {
        sequence = currSequence;
        complementaryStrand = currComplementarySequence;
        features = featuresDict;
    } else {
        sequence2 = currSequence;
        complementaryStrand2 = currComplementarySequence;
        features2 = featuresDict;
    }
}