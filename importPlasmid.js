window.onload = function() {
    const fileContentDiv = document.getElementById('file-content');
    const contentDiv = document.querySelector('.content');

    function handleFileSelect(event) {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = function(e) {
            const fileContent = e.target.result;
            
            // Parse the file content into variables
            const { sequence, complementaryStrand, features } = parsePlasmidFile(fileContent);
            
            
            // Display the parsed content in the div
            fileContentDiv.innerHTML = `
                <p id="complementary_strand">${complementaryStrand}</p>
                <p id="forward_strand">${sequence}</p>
            `;
            const headerList = document.getElementById('header-list');
            headerList.innerHTML = headerList.innerHTML + "<li><a>" + file.name + "</a></li>";
            
            const sidebarTable = document.getElementById('sidebar-table');
            sidebarTable.innerHTML = `
                <tr>
                    <th>Feature</th>
                    <th>Label</th>
                    <th>Range</th>
                    <th>Note</th>
                </tr>
            `; // Set table headers

            for (const featureName in features) {
                const feature = features[featureName];
            
                // Create a new table row
                const row = document.createElement('tr');
            
                // Add feature name
                const nameCell = document.createElement('td');
                nameCell.textContent = featureName;
                nameCell.className = 'wrap-text';
                row.appendChild(nameCell);
            
                // Add feature label
                const labelCell = document.createElement('td');
                // console.log(feature.label)
                labelCell.textContent = feature.label || '';
                labelCell.className = 'wrap-text';
                row.appendChild(labelCell);
            
                // Add feature range
                const rangeCell = document.createElement('td');
                rangeCell.textContent = feature.span.replace("misc_feature ", "");
                rangeCell.className = 'wrap-text';
                row.appendChild(rangeCell);
            
                // Add feature note
                const noteCell = document.createElement('td');
                noteCell.textContent = feature.note || '';
                noteCell.className = 'wrap-text';
                row.appendChild(noteCell);
            
                sidebarTable.appendChild(row);
            }

            contentDiv.style.overflow = 'auto'; // Enable scrolling after file import
        };

        reader.readAsText(file);
    }

    const fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');
    fileInput.addEventListener('change', handleFileSelect);

    const importLink = document.querySelector('nav ul li a');
    importLink.addEventListener('click', function(event) {
        event.preventDefault();
        fileInput.click();
    });
};

function parsePlasmidFile(fileContent) {
    // Adapted Python code goes here
    const features = extractFeatures(fileContent);
    console.log(features)
    const sequence = extractSequence(fileContent);

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
      
      

    // Adapted extract_sequence functions
    function extractSequence(input) {
        input = input.substring(input.indexOf("ORIGIN") + "ORIGIN".length);
        let output = input.replace(/\n/g, '').replace(/\/\//g, '').split(' ').filter(x => !/\d/.test(x));
        output = output.join('').toUpperCase().trim().replace(/[\r\n]+/g, "")
        // console.log(output)
        return output;
    }
    

    // Placeholder values for testing
    const complementaryStrand = getComplementaryStrand(sequence);

    return {
        sequence,
        complementaryStrand,
        features
    };
}

function getComplementaryStrand(sequence) {
    const nucleotideComplements = {
        'A': 'T',
        'T': 'A',
        'G': 'C',
        'C': 'G'
    };

    const complementaryStrand = sequence
        .toUpperCase()
        .split('')
        .map(nucleotide => nucleotideComplements[nucleotide])
        .join('');

    return complementaryStrand;
}
