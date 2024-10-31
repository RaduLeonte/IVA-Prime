const PlasmidViewer = new class {
    drawCircular(plasmidIndex) {
        const targetPlasmid = Session.getPlasmid(plasmidIndex);
        const sequence = targetPlasmid["sequence"];
        const complementarySequence = targetPlasmid["complementarySequence"];
        const features = targetPlasmid["features"];
        const topology = targetPlasmid["topology"];

        const svgContainer = document.getElementById("svg-container");
        var mySvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        mySvg.setAttribute("version", "1.2");
        mySvg.setAttribute("baseProfile", "tiny");
        svgContainer.appendChild(mySvg);

        var c1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c1.setAttribute("cx", "100");
        c1.setAttribute("cy", "100");
        c1.setAttribute("r", "60");
        c1.setAttribute("fill", "#336699");
        mySvg.appendChild(c1);
    };

    drawGrid(plasmidIndex) {
        const targetPlasmid = Session.getPlasmid(plasmidIndex);
        const sequence = targetPlasmid["sequence"];
        const complementarySequence = targetPlasmid["complementarySequence"];
        const features = targetPlasmid["features"];
        const topology = targetPlasmid["topology"];


    };
};