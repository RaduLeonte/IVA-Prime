function parsePlasmidFile(fileContent, pNr) {
    if (pNr === 1) {
      features = extractFeatures(fileContent);
      sequence = extractSequence(fileContent);
      complementaryStrand = getComplementaryStrand(sequence);
    } else {
      features2 = extractFeatures(fileContent);
      sequence2 = extractSequence(fileContent);
      complementaryStrand2 = getComplementaryStrand(sequence2);
    }
    

    // Adapted extract_features function
    function extractFeatures(input) {
        //console.log(input);
        const inputLines = input.split('\n').map(line => line.trim()).filter(line => line);
        // Add LOCUS feature
        const featuresDict = {};
        const firstLine = inputLines[0];
        const locusNote = firstLine.trim();
        featuresDict['LOCUS'] = { note: locusNote.replace("LOCUS ", ""), span: "", label: ""};
        while (inputLines.length > 0 && !inputLines[0].includes("FEATURES")) {
            inputLines.shift(); // Remove the first item
        }
        inputLines.shift();
        
        const featureList = [];
        let currentFeature = '';
        
        for (const line of inputLines) {
          if (line.includes('..')) {
            if (currentFeature !== '') {
              featureList.push(currentFeature);
            }
            currentFeature = '';
          }
        
          currentFeature += line + '\n';
        }
        
        if (currentFeature !== '') {
          featureList.push(currentFeature);
        }
        
        
        for (const feature of featureList) {
          const lines = feature.split('\n').map(line => line.trim()).filter(line => line);
          let featureName = lines[0].substring(0, lines[0].indexOf(' '));
          let i = 0;
        
          while (featureName in featuresDict) {
            if (`${featureName}${i}` in featuresDict) {
              i++;
            } else {
              featureName = `${featureName}${i}`;
              break;
            }
          }
        
          const featureInfo = {
            span: lines[0].includes('complement') ? lines[0].substring(lines[0].indexOf('complement')) : lines[0].replace(featureName, '').trim()
          };
        
          for (let j = 1; j < lines.length; j++) {
            const property = lines[j];
            const propertyName = property.substring(0, property.indexOf('=')).replace('/', '').replace('"', '');
            const propertyBody = property.substring(property.indexOf('=') + 1).replace(/"/g, '').trim();
        
            featureInfo[propertyName] = propertyBody;
          }
        
          featuresDict[featureName] = featureInfo;
        }
        
        return featuresDict;
      }
      
    
    function extractSequence(input) {
        input = input.substring(input.indexOf("ORIGIN") + "ORIGIN".length);
        let output = input.replace(/\n/g, '').replace(/\/\//g, '').split(' ').filter(x => !/\d/.test(x));
        output = output.join('').toUpperCase().trim().replace(/[\r\n]+/g, "")
        // console.log(output)
        return output;
    }
}
