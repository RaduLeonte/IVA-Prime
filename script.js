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
    const features = extract_features(fileContent);
    const sequence = extractSequence(fileContent);

    // Adapted extract_features function
    function extract_features(input) {
        const inputLines = input.split('\n').map(line => line.trim()).filter(line => line);

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

        const featuresDict = {};

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

            featuresDict[featureName] = {
                span: lines[0].includes('complement') ? lines[0].substring(lines[0].indexOf('complement')) : lines[0].replace(featureName, '').trim()
            };

            for (let j = 1; j < lines.length; j++) {
                const property = lines[j];
                const propertyName = property.substring(0, property.indexOf('=')).replace('/', '').replace('"', '');
                const propertyBody = property.substring(property.indexOf('=') + 1).replace(/"/g, '').trim();

                featuresDict[featureName][propertyName] = propertyBody;
            }
        }

        return featuresDict;
    }

    // Adapted extract_sequence function
    function extractSequence(input) {
        input = input.substring(input.indexOf("ORIGIN") + "ORIGIN".length);
        const output = input.replace(/\n/g, '').replace(/\/\//g, '').split(' ').filter(x => !/\d/.test(x));
        return output.join('').toUpperCase();
    }
    

    // Placeholder values for testing
    const complementaryStrand = getComplementaryStrand(sequence);

    return {
        sequence,
        complementaryStrand,
        features: Object.keys(features)
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
