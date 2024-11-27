const PlasmidViewer = new class {

    activeView = null;

    svgNameSpace = "http://www.w3.org/2000/svg";

    /**
     * 
     * @param {*} sequence 
     * @param {*} complementarySequence 
     * @param {*} features 
     * @param {*} topology 
     * @returns 
     */
    draw(plasmidName, sequence, complementarySequence, features, topology) {
        return {
            "circular": this.drawCircular(plasmidName, sequence, complementarySequence, features, topology),
            "linear": this.drawLinear(plasmidName, sequence, complementarySequence, features, topology),
            "grid": this.drawGrid(plasmidName, sequence, complementarySequence, features, topology)
        };
    };

    /**
     * 
     * @param {*} sequence 
     * @param {*} complementarySequence 
     * @param {*} features 
     * @param {*} topology 
     */
    drawCircular(plasmidName, sequence, complementarySequence, features, topology) {
        const svgContainer = document.getElementById("linear-view-container");
        const mainViewerDiv = svgContainer.parentElement;

        const svgWrapperDummy = document.createElement("DIV");
        svgWrapperDummy.classList.add("svg-wrapper");
        svgContainer.appendChild(svgWrapperDummy);
        const svgWrapperStyle = getComputedStyle(svgWrapperDummy);
        
        const maxWidth = mainViewerDiv.offsetWidth - (parseFloat(svgWrapperStyle.paddingLeft) + parseFloat(svgWrapperStyle.paddingRight));
        const maxHeight = mainViewerDiv.offsetHeight - (parseFloat(svgWrapperStyle.paddingTop) + parseFloat(svgWrapperStyle.paddingBottom));
        const maxSize = Math.min(maxWidth, maxHeight)*0.8;
        console.log("drawCircular", maxSize, maxWidth, maxHeight);
        svgContainer.removeChild(svgWrapperDummy);


        // Main wrapper
        const svgWrapper = document.createElement("DIV");
        svgWrapper.classList.add("svg-wrapper");
        
        // Main SVG
        const svgCanvas = this.createShapeElement("svg");
        svgCanvas.setAttribute("version", "1.2");
        svgCanvas.setAttribute("width", maxSize);
        svgCanvas.setAttribute("height", maxSize);
        svgWrapper.appendChild(svgCanvas);

        // Main group container
        const groupMain = this.createShapeElement("g");
        groupMain.setAttribute("transform", `translate(${maxSize/2} ${maxSize/2})`);
        svgCanvas.appendChild(groupMain);

        /**
         * Plasmid title and subtitle
         */
        const groupTitle = this.createShapeElement("g");
        groupTitle.setAttribute("id", "svg-title");
        groupMain.appendChild(groupTitle);
        groupTitle.appendChild(this.text(
            [0, -10],
            plasmidName,
            null,
            "svg-plasmid-title",
            "middle"
        ));
        groupTitle.appendChild(this.text(
            [0, 15],
            `${sequence.length} bp`,
            null,
            "svg-plasmid-subtitle",
            "middle"
        ));


        /**
         * Backbone
         */
        const groupBackbone = this.createShapeElement("g");
        groupBackbone.setAttribute("id", "svg-backbone")
        groupMain.appendChild(groupBackbone);

        const backBoneCircleRadius = (maxSize/2)-20
        const backBoneCircleStrandsDistance = 4
        const backboneCircle = this.createShapeElement("circle");
        backboneCircle.setAttribute("cx", 0);
        backboneCircle.setAttribute("cy", 0);
        backboneCircle.setAttribute("r", backBoneCircleRadius+backBoneCircleStrandsDistance/2);
        backboneCircle.setAttribute("class", "svg-sequence-axis");
        groupBackbone.appendChild(backboneCircle);
        const backboneCircle2 = this.createShapeElement("circle");
        backboneCircle2.setAttribute("cx", 0);
        backboneCircle2.setAttribute("cy", 0);
        backboneCircle2.setAttribute("r", backBoneCircleRadius-backBoneCircleStrandsDistance/2);
        backboneCircle2.setAttribute("class", "svg-sequence-axis");
        groupBackbone.appendChild(backboneCircle2);

        /** 
         * Ticks
         */
        const groupBackboneTicks = this.createShapeElement("g");
        groupBackboneTicks.setAttribute("id", "svg-axis-ticks")
        groupBackbone.appendChild(groupBackboneTicks);
        const ticksPos = this.generateTicks(sequence.length);
        const tickLength = 15; //px
        const tickLabelPos = 30;

        let seqToPixel = (s, r) => {
            const a = (s / sequence.length)*2*Math.PI - Math.PI/2;
            return [r*Math.cos(a), r*Math.sin(a)]
        };
        groupBackboneTicks.appendChild(this.line(
            seqToPixel(0, backBoneCircleRadius-tickLength/2),
            seqToPixel(0, backBoneCircleRadius+tickLength/2),
            null,
            "svg-sequence-axis"
        ));
        for (let i in ticksPos) {
            groupBackboneTicks.appendChild(this.line(
                seqToPixel(ticksPos[i], backBoneCircleRadius-tickLength/2),
                seqToPixel(ticksPos[i], backBoneCircleRadius+tickLength/2),
                null,
                "svg-sequence-axis"
            ));
            const tickLabel = this.text(
                [0, 0],
                ticksPos[i],
                null,
                null,
                "middle"
            );
            const a1 = (ticksPos[i] / sequence.length)*2*Math.PI - Math.PI/2
            let a2 = (ticksPos[i] / sequence.length)*2*Math.PI*(180/Math.PI)
            let r = backBoneCircleRadius-tickLabelPos;
            if (a2 >= 90 && a2 <= 270) {
                a2 -= 180;
                r += 10;
            };
            const x = r*Math.cos(a1);
            const y = r*Math.sin(a1);
            tickLabel.setAttribute("transform", `translate(${x}, ${y}) rotate(${a2})`)
            groupBackboneTicks.appendChild(tickLabel);
        };

        /**
         * Features
         */
        const featuresLevelStart = backBoneCircleRadius - 50;
        const featuresLevelOffset = -25;
        const featuresLevelsNr = 3;
        let featuresLevels = [];
        for (let i = 0; i < featuresLevelsNr; i++) {
            featuresLevels.push(featuresLevelStart + i*featuresLevelOffset)
        };

        const groupFeatures = this.createShapeElement("g");
        groupFeatures.setAttribute("id", "svg-features");
        groupMain.appendChild(groupFeatures);

        const anglePerLetter = 1.5 // degree
        for (const [featureID, featureDict] of Object.entries(features)) {
            const featureLength = featureDict["span"][1] - featureDict["span"][0];
            const featureSpanLengthInDegrees = (featureLength / sequence.length) * 360;
            const featureLabelLengthInDegrees = featureDict["label"].length * anglePerLetter;
            const drawFeatureLabel = (featureLabelLengthInDegrees <= featureSpanLengthInDegrees) ? true: false;
            groupFeatures.appendChild(this.circularFeature(
                featureDict["span"],
                featuresLevels[featureDict["level"]],
                featureDict["directionality"],
                (drawFeatureLabel) ? featureDict["label"]: "",
                featureDict["color"],
                null,
                "svg-feature-arrow",
                seqToPixel,
                sequence.length
            ));
        };


        return svgWrapper;
    };

    /**
     * 
     * @param {*} sequence 
     * @param {*} complementarySequence 
     * @param {*} features 
     * @param {*} topology 
     */
    drawLinear(plasmidName, sequence, complementarySequence, features, topology) {
        const svgContainer = document.getElementById("linear-view-container");
        const mainViewerDiv = svgContainer.parentElement;
        
        const svgWrapperDummy = document.createElement("DIV");
        svgWrapperDummy.classList.add("svg-wrapper");
        svgContainer.appendChild(svgWrapperDummy);
        const svgWrapperStyle = getComputedStyle(svgWrapperDummy);
        
        const maxWidth = mainViewerDiv.offsetWidth - (parseFloat(svgWrapperStyle.paddingLeft) + parseFloat(svgWrapperStyle.paddingRight));
        console.log("drawLinear", maxWidth)
        svgContainer.removeChild(svgWrapperDummy);

        // Main wrapper
        const svgWrapper = document.createElement("DIV");
        svgWrapper.classList.add("svg-wrapper");

        // Main SVG
        const svgCanvas = this.createShapeElement("svg");
        svgCanvas.setAttribute("version", "1.2");
        svgWrapper.appendChild(svgCanvas);

        // Main group container
        const groupMain = this.createShapeElement("g");
        groupMain.setAttribute("transform", "translate(0 70)");
        svgCanvas.appendChild(groupMain);

        /**
         * Plasmid title and subtitle
         */
        const groupTitle = this.createShapeElement("g");
        groupTitle.setAttribute("id", "svg-title");
        groupMain.appendChild(groupTitle)
        groupTitle.appendChild(this.text(
            [maxWidth/2, -50],
            plasmidName,
            null,
            "svg-plasmid-title",
            "middle"
        ));
        groupTitle.appendChild(this.text(
            [maxWidth/2, -25],
            `${sequence.length} bp`,
            null,
            "svg-plasmid-subtitle",
            "middle"
        ));

        /**
         * Sequence axis
        */
        const groupAxis = this.createShapeElement("g");
        groupAxis.setAttribute("id", "svg-axis")
        groupMain.appendChild(groupAxis);
        const dotsOffset = 6;
        const dotsWidth = 3;
        const sequenceAxisMargin = dotsOffset*3;
        // Sequence coordinate to pixel in axis
        let seqToPixel = (s) => sequenceAxisMargin + (s / sequence.length)*(maxWidth - 2*sequenceAxisMargin);
        
        // Main axis
        groupAxis.appendChild(this.line(
            [seqToPixel(0),-2],
            [seqToPixel(sequence.length), -2],
            null,
            "svg-sequence-axis"
        ));
        groupAxis.appendChild(this.line(
            [seqToPixel(0), 2],
            [seqToPixel(sequence.length), 2],
            null,
            "svg-sequence-axis"
        ));

        // Dots on each side of the axis for circular plasmids
        if (topology === "circular"){
            for (let i = 0; i < 3; i++){
                groupAxis.appendChild(this.line(
                    [i*dotsOffset, 0],
                    [i*dotsOffset + dotsWidth, 0],
                    null,
                    "svg-sequence-axis"
                ));
                groupAxis.appendChild(this.line(
                    [maxWidth - i*dotsOffset, 0],
                    [maxWidth - i*dotsOffset - dotsWidth, 0],
                    null,
                    "svg-sequence-axis"
                ));
            };
        };

        // Ticks
        const groupAxisTicks = this.createShapeElement("g");
        groupAxisTicks.setAttribute("id", "svg-axis-ticks")
        groupAxis.appendChild(groupAxisTicks);
        const ticksPos = this.generateTicks(sequence.length);
        const ticksSeqPos = ticksPos.map((x) => seqToPixel(x));
        const tickLength = 15; //px
        const tickLabelPos = 30;
        for (let i in ticksSeqPos) {
            groupAxisTicks.appendChild(this.line(
                [ticksSeqPos[i], -tickLength/2],
                [ticksSeqPos[i], tickLength/2],
                null,
                "svg-sequence-axis"
            ));
            groupAxisTicks.appendChild(this.text(
                [ticksSeqPos[i], tickLabelPos],
                ticksPos[i],
                null,
                null,
                "middle"
            ));
        };

        /**
         * Features
         */
        const featuresLevelStart = 50;
        const featuresLevelOffset = 25;
        const featuresLevelsNr = 3;
        let featuresLevels = [];
        for (let i = 0; i < featuresLevelsNr; i++) {
            featuresLevels.push(featuresLevelStart + i*featuresLevelOffset)
        };

        const groupFeatures = this.createShapeElement("g");
        groupFeatures.setAttribute("id", "svg-features");
        groupMain.appendChild(groupFeatures);

        const percentagePerLetter = 1 // %
        for (const [featureID, featureDict] of Object.entries(features)) {
            const featureLength = featureDict["span"][1] - featureDict["span"][0];
            const featureSpanLengthInPercent = (featureLength / sequence.length) * 100;
            const featureLabelLengthInPercent = featureDict["label"].length * percentagePerLetter;
            const drawFeatureLabel = (featureLabelLengthInPercent <= featureSpanLengthInPercent) ? true: false;
            groupFeatures.appendChild(this.linearFeature(
                [seqToPixel(featureDict["span"][0]), seqToPixel(featureDict["span"][1])],
                featuresLevels[featureDict["level"]],
                featureDict["directionality"],
                (drawFeatureLabel) ? featureDict["label"]: "",
                featureDict["color"],
                null,
                "svg-feature-arrow"
            ));
        };

        return svgWrapper;
    };


    /**
     * 
     * @param {*} sequence 
     * @param {*} complementarySequence 
     * @param {*} features 
     * @param {*} topology 
     */
    drawGrid(plasmidName, sequence, complementarySequence, features, topology) {
        const svgContainer = document.getElementById("grid-view-container");
        svgContainer.style.display = "flex";
        
        const svgWrapperDummy = document.createElement("DIV");
        svgWrapperDummy.classList.add("svg-wrapper");
        svgContainer.appendChild(svgWrapperDummy);
        const svgWrapperStyle = getComputedStyle(svgWrapperDummy);
        
        let maxWidth = svgContainer.offsetWidth - (parseFloat(svgWrapperStyle.paddingLeft) + parseFloat(svgWrapperStyle.paddingRight));
        
        const mainViewer = svgContainer.parentElement;
        mainViewer.style.overflowY = "scroll";
        const scrollbarWidth = mainViewer.offsetWidth - svgContainer.offsetWidth;
        mainViewer.style.overflowY = "";
        console.log("drawGrid", scrollbarWidth)

        maxWidth -= scrollbarWidth;
        console.log("drawGrid", maxWidth);

        svgContainer.style.display = "";
        svgContainer.removeChild(svgWrapperDummy);
        

        // Main wrapper
        const svgWrapper = document.createElement("DIV");
        svgWrapper.classList.add("svg-wrapper-grid");

        const basesPerLine = 50;
        for (let i = 0; i < Math.ceil(sequence.length/basesPerLine); i++) {
            /**
             * Single grid segment
             */
            const sequenceStartIndex = i*basesPerLine;
            const sequenceEndIndex = sequenceStartIndex + basesPerLine;
            const sequenceFwd = sequence.slice(sequenceStartIndex, sequenceEndIndex);
            const sequenceRev = complementarySequence.slice(sequenceStartIndex, sequenceEndIndex);
            
            const sequenceFwdHeight = 20;
            const sequenceAxisHeight = 30
            const sequenceRevHeight = 55;
            const basesWidth = maxWidth/basesPerLine;
            const basesPositions = [];
            for (let i = 0; i < basesPerLine; i++) {
                basesPositions.push(basesWidth/2 + i*basesWidth)
            };
    
            // Canvas
            const svgCanvas = this.createShapeElement("svg");
            svgCanvas.setAttribute("version", "1.2");
            svgCanvas.setAttribute("width", maxWidth);
            svgWrapper.appendChild(svgCanvas);

            // Main group
            const groupMain = this.createShapeElement("g");
            groupMain.setAttribute("transform", `translate(${0} ${0})`);
            svgCanvas.appendChild(groupMain);
    
            // Forward strand
            const groupStrandFwd = this.createShapeElement("g");
            groupStrandFwd.setAttribute("id", "strand-fwd")
            for (let i = 0; i < basesPerLine; i++) {
                groupStrandFwd.appendChild(this.text(
                    [basesPositions[i], sequenceFwdHeight],
                    sequenceFwd[i],
                    null,
                    "svg-sequence-bases-text",
                    "middle"
                ));
            };
            groupMain.appendChild(groupStrandFwd);
            
            // Sequence axis
            groupMain.appendChild(this.line(
                [0, sequenceAxisHeight],
                [(sequenceFwd.length/basesPerLine)*maxWidth, sequenceAxisHeight],
                null,
                "svg-sequence-axis-grid"
            ));

            const groupTicks = this.createShapeElement("g");
            // Ticks 10s
            const ticksLength10s = 14;
            for (let num = Math.ceil(sequenceStartIndex / 10) * 10; num <= sequenceEndIndex; num += 10) {
                if (num - sequenceStartIndex === 0) {continue};
                if (num - sequenceStartIndex > sequenceFwd.length) {continue}
                //console.log("drawGrid", num-sequenceStartIndex);
                groupTicks.appendChild(this.line(
                    [basesPositions[num - sequenceStartIndex - 1], sequenceAxisHeight-ticksLength10s/2],
                    [basesPositions[num - sequenceStartIndex - 1], sequenceAxisHeight+ticksLength10s/2],
                    null,
                    "svg-sequence-axis-grid"
                ));
            };
            // Ticks 5s
            const ticksLength5s = 7;
            for (let num = Math.ceil(sequenceStartIndex / 5) * 5; num <= sequenceEndIndex; num += 5) {
                if (num - sequenceStartIndex === 0) {continue};
                if (num - sequenceStartIndex > sequenceFwd.length) {continue}
                //console.log("drawGrid", num-sequenceStartIndex);
                groupTicks.appendChild(this.line(
                    [basesPositions[num - sequenceStartIndex - 1], sequenceAxisHeight-ticksLength5s/2],
                    [basesPositions[num - sequenceStartIndex - 1], sequenceAxisHeight+ticksLength5s/2],
                    null,
                    "svg-sequence-axis-grid"
                ));
            };
            groupMain.appendChild(groupTicks);
    
            // Reverse strand
            const groupStrandRev = this.createShapeElement("g");
            groupStrandRev.setAttribute("id", "strand-rev")
            for (let i = 0; i < basesPerLine; i++) {
                groupStrandRev.appendChild(this.text(
                    [basesPositions[i], sequenceRevHeight],
                    sequenceRev[i],
                    null,
                    "svg-sequence-bases-text",
                    "middle"
                ));
            };
            groupMain.appendChild(groupStrandRev);
        };

        return svgWrapper;
    };


    /**
     * 
     * @param {*} shape 
     * @returns 
     */
    createShapeElement(shape) {
        return document.createElementNS("http://www.w3.org/2000/svg", shape)
    };


    /**
     * 
     * @param {*} pos 
     * @param {*} content 
     * @param {*} id 
     * @param {*} cssClass 
     * @param {*} textAnchor 
     * @returns 
     */
    text(pos, content, id=null, cssClass=null, textAnchor="start") {
        const textElement = this.createShapeElement("text");
        textElement.setAttribute("x", pos[0]);
        textElement.setAttribute("y", pos[1]);
        
        textElement.textContent = content;

        if (id) {textElement.setAttribute("class", cssClass)};
        
        if (cssClass) {textElement.setAttribute("class", cssClass)};
        
        textElement.setAttribute("text-anchor", textAnchor);
        
        return textElement;
    };


    /**
     * 
     * @param {*} p1 
     * @param {*} p2 
     * @param {*} id 
     * @param {*} cssClass 
     * @returns 
     */
    line(p1, p2, id=null, cssClass=null) {
        const line = this.createShapeElement("line");

        line.setAttribute("x1", p1[0]);
        line.setAttribute("y1", p1[1]);
        line.setAttribute("x2", p2[0]);
        line.setAttribute("y2", p2[1]);

        if (id) {line.setAttribute("id", id)};
        if (cssClass) {line.setAttribute("class", cssClass)};

        return line;
    };


    /**
     * 
     * @param {*} span 
     * @param {*} directionality 
     * @param {*} label 
     * @param {*} color 
     * @param {*} id 
     * @param {*} cssClass 
     * @returns 
     */
    linearFeature(span, levelHeight, directionality, label, color, id, cssClass) {
        const featureGroup = this.createShapeElement("g");
        
        /**
         * Arrow
         */
        const featureArrow = this.createShapeElement("polygon");

        const featureArrowWidth = 20; //px
        const featureHeadMinWidth = 10; //px
        const featureBodyHeadRatio = 0.9;
        const featureHeadWidth = Math.min(featureHeadMinWidth, (span[1] - span[0])*featureBodyHeadRatio)
        const featureHeight = levelHeight - featureArrowWidth/2;

        let points = []
        switch (directionality) {
            case "fwd":
                points = [
                    [span[0], featureHeight],
                    [span[1] - featureHeadWidth, featureHeight],
                    [span[1], featureHeight + featureArrowWidth/2],
                    [span[1] - featureHeadWidth, featureHeight + featureArrowWidth],
                    [span[0], featureHeight + featureArrowWidth]
                ];
                break;
            case "rev":
                points = [
                    [span[1], featureHeight],
                    [span[0] + featureHeadWidth, featureHeight],
                    [span[0], featureHeight + featureArrowWidth/2],
                    [span[0] + featureHeadWidth, featureHeight + featureArrowWidth],
                    [span[1], featureHeight + featureArrowWidth]
                ];
                break;
            default:
                points = [
                    [span[0], featureHeight],
                    [span[1], featureHeight],
                    [span[1], featureHeight + featureArrowWidth],
                    [span[0], featureHeight + featureArrowWidth]
                ];
        };
        featureArrow.setAttribute("points", points);

        featureArrow.setAttribute("fill", color);

        if (id) {featureArrow.setAttribute("id", id)};
        if (cssClass) {featureArrow.setAttribute("class", cssClass)};
        
        featureGroup.appendChild(featureArrow);

        /**
         * Arrow
         */
        featureGroup.appendChild(this.text(
            [span[0] + (span[1] - span[0])/2, featureHeight+featureArrowWidth*0.8],
            label,
            null,
            "svg-feature-label",
            "middle"
        ));

        return featureGroup;
    };

    circularFeature(span, levelHeight, directionality, label, color, id, cssClass, seqToPixel, sequenceLength) {
        const featureGroup = this.createShapeElement("g");
        /**
         * Arrow
         */
        const featureArrow = this.createShapeElement("path");

        const featureArrowWidth = 20; //px
        const featureHeadMinWidth = 20; //px
        const featureBodyHeadRatio = 0.9;
        const featureHeadWidth = Math.min(featureHeadMinWidth, (span[1] - span[0])*featureBodyHeadRatio)
        const featureHeight = levelHeight - featureArrowWidth/2;

        let curve;
        let p1;
        let p2;
        let p3;
        let p4;
        let p5;
        switch (directionality) {
            case "fwd":
                p1 = seqToPixel(span[0], featureHeight);
                p2 = seqToPixel(span[1] - featureHeadWidth, featureHeight);
                p3 = seqToPixel(span[1], featureHeight + featureArrowWidth/2);
                p4 = seqToPixel(span[1] - featureHeadWidth, featureHeight + featureArrowWidth);
                p5 = seqToPixel(span[0], featureHeight + featureArrowWidth);
                curve = `
                M ${p1[0]}, ${p1[1]}
                A${featureHeight} ${featureHeight} 0 0 1
                ${p2[0]} ${p2[1]}
                L ${p3[0]} ${p3[1]}
                ${p4[0]} ${p4[1]}
                A${featureHeight} ${featureHeight} 0 0 0
                ${p5[0]} ${p5[1]}
                Z`
                break;
            case "rev":
                p1 = seqToPixel(span[1], featureHeight);
                p2 = seqToPixel(span[0] + featureHeadWidth, featureHeight);
                p3 = seqToPixel(span[0], featureHeight + featureArrowWidth/2);
                p4 = seqToPixel(span[0] + featureHeadWidth, featureHeight + featureArrowWidth);
                p5 = seqToPixel(span[1], featureHeight + featureArrowWidth);
                curve = `
                M ${p1[0]}, ${p1[1]}
                A${featureHeight} ${featureHeight} 0 0 0
                ${p2[0]} ${p2[1]}
                L ${p3[0]} ${p3[1]}
                ${p4[0]} ${p4[1]}
                A${featureHeight} ${featureHeight} 0 0 1
                ${p5[0]} ${p5[1]}
                Z`
                break;
            default:
                p1 = seqToPixel(span[1], featureHeight);
                p2 = seqToPixel(span[0], featureHeight);
                p4 = seqToPixel(span[0], featureHeight + featureArrowWidth);
                p5 = seqToPixel(span[1], featureHeight + featureArrowWidth);
                curve = `
                M ${p1[0]}, ${p1[1]}
                A${featureHeight} ${featureHeight} 0 0 0
                ${p2[0]} ${p2[1]}
                L ${p4[0]} ${p4[1]}
                A${featureHeight} ${featureHeight} 0 0 1
                ${p5[0]} ${p5[1]}
                Z`
                break;
        };
        featureArrow.setAttribute("d", curve);

        featureArrow.setAttribute("fill", color);

        if (id) {featureArrow.setAttribute("id", id)};
        if (cssClass) {featureArrow.setAttribute("class", cssClass)};
        
        featureGroup.appendChild(featureArrow);

        /**
         * Arrow
         */
        const featureLabel = this.text(
            [0, 0],
            label,
            null,
            "svg-feature-label",
            "middle"
        );
        const pos = span[0] + (span[1] - span[0])/2
        const a1 = (pos / sequenceLength)*2*Math.PI - Math.PI/2
        let a2 = (pos / sequenceLength)*2*Math.PI*(180/Math.PI)
        let r = featureHeight+featureArrowWidth*0.2;
        if (a2 >= 90 && a2 <= 270) {
            a2 -= 180;
            r += 13;
        };
        const x = r*Math.cos(a1);
        const y = r*Math.sin(a1);
        featureLabel.setAttribute("transform", `translate(${x}, ${y}) rotate(${a2})`)
        featureGroup.appendChild(featureLabel);

        return featureGroup;
    };


    /**
     * 
     * @param {*} maxValue 
     * @returns 
     */
    generateTicks(maxValue) {
        // 150, 850 -> 100
        const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
        
        // check if input 850 is closer to 100 or 1'000
        let interval;
        if (Math.abs(maxValue - magnitude) < Math.abs(maxValue - magnitude*10)) {
            // magnitude closer to 100 -> interval = 10
            interval = magnitude/10;
        } else {
            // magnitude closer to 1000 -> interval = 100
            interval = magnitude;
        };
    
        // Adjust the interval to a nice round number that divides the range sensibly
        if (maxValue / interval > 10) {
            interval *= 5;
        } else if (maxValue / interval > 5) {
            interval *= 2;
        };
    
        // Generate ticks
        const ticks = [];
        for (let tick = 0; tick <= maxValue; tick += interval) {
            ticks.push(tick);
        };
    
        // Remove first item in list
        ticks.shift();

        return ticks;
    };


    /**
     * 
     * @param {*} targetView 
     * @returns 
     */
    switchView(targetView) {
        // Return immediately if we're already in target view
        if (this.activeView === targetView) {return};

        // Get parent group
        const button = document.getElementById(`${targetView}-view-button`);
        const buttonGroup = button.parentElement;
        // Check if any buttons are already selected and remove the selected class
        const selectedButtons = buttonGroup.querySelectorAll(".toolbar-button-selected")
        if (selectedButtons.length > 0) {
            selectedButtons.forEach((e) =>
                e.classList.remove("toolbar-button-selected")
            );
        };

        // Select button that was just clicked
        button.classList.add("toolbar-button-selected")
        
        if (this.activeView) {
            const currentViewContainer = document.getElementById(`${this.activeView}-view-container`);
            currentViewContainer.style.display = "none";
        };

        const targetViewContainer = document.getElementById(`${targetView}-view-container`);
        targetViewContainer.style.display = "flex";

        this.activeView = targetView;

        if (targetView === "grid") {
            const viewerDiv = document.querySelector(".viewer");
            viewerDiv.classList.add("viewer-grid-view");
        } else {
            const viewerDiv = document.querySelector(".viewer");
            viewerDiv.classList.remove("viewer-grid-view");
        };
    };
};