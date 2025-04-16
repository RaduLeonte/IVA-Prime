const PlasmidViewer = new class {
    constructor () {
        // Init viewer variables
        this.activeView = null;
        this.currentlySelecting = false;
        this.elementsAtMouseDown = null;

        this.baseRectsMap = {"fwd": [], "rev": []};
        this.featureSegmentsMap = {};

        this.currentHoverSpan = null;
        this.currentTooltipTarget = null;

        this.highlightedBases = {};
        this.cursors = {};
        this.hoveredFeatureSegments = [];
        this.hoveredAABlocks = [];

        this.subcloningRects = [];

        this.sequenceTooltips = {};

        // Shortname
        this.svgNameSpace = "http://www.w3.org/2000/svg";

        this.textElementTemplate = this._createShapeElement("text");


        /**
         * Redraw views on window resize
         */
        let resizeTimeout;
        window.addEventListener('resize', function () {
            Toolbar.hideAllPanels();

            document.getElementById("viewer").style.display = "none";
            
            clearTimeout(resizeTimeout);
        
            resizeTimeout = setTimeout(() => {
                document.getElementById("viewer").style.display = "block";
                PlasmidViewer.redraw();
            }, 100);
        });
        
        
        /**
         * AA fill colors
         */
        const resList = "RHKDESTNQCGPAVILMFYW".split("");
        resList.push("stop");
        this.resFillColors = {};
        for (let i = 0, len = resList.length; i < len; i++) {
            const res = resList[i]
            this.resFillColors[res] = this.getCssFillColor("aa-block-" + res)
        };


        /**
         * Init measurement svg for annotation text
         */
        document.addEventListener('DOMContentLoaded', function() {
            PlasmidViewer._initMeasurementSVG();
        });
    };


    // #region Circular_view
    /**
     * Draw the circular view
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
        svgContainer.removeChild(svgWrapperDummy);


        // Main wrapper
        const svgWrapper = document.createElement("DIV");
        svgWrapper.classList.add("svg-wrapper");
        
        // Main SVG
        const svgCanvas = this._createShapeElement("svg");
        svgCanvas.setAttribute("version", "1.2");
        svgCanvas.setAttribute("width", maxSize);
        svgCanvas.setAttribute("height", maxSize);
        svgWrapper.appendChild(svgCanvas);

        // Main group container
        const groupMain = this._createShapeElement("g");
        groupMain.setAttribute("transform", `translate(${maxSize/2} ${maxSize/2})`);
        svgCanvas.appendChild(groupMain);

        /**
         * Plasmid title and subtitle
         */
        const groupTitle = this._createShapeElement("g");
        groupTitle.setAttribute("id", "svg-title");
        groupMain.appendChild(groupTitle);
        groupTitle.appendChild(this._text(
            [0, -10],
            plasmidName,
            null,
            "svg-plasmid-title",
            "middle"
        ));
        groupTitle.appendChild(this._text(
            [0, 15],
            `${sequence.length} bp`,
            null,
            "svg-plasmid-subtitle",
            "middle"
        ));


        /**
         * Backbone
         */
        const groupBackbone = this._createShapeElement("g");
        groupBackbone.setAttribute("id", "svg-backbone")
        groupMain.appendChild(groupBackbone);

        const backBoneCircleRadius = (maxSize/2)-20
        const backBoneCircleStrandsDistance = 4
        const backboneCircle = this._createShapeElement("circle");
        backboneCircle.setAttribute("cx", 0);
        backboneCircle.setAttribute("cy", 0);
        backboneCircle.setAttribute("r", backBoneCircleRadius+backBoneCircleStrandsDistance/2);
        backboneCircle.setAttribute("class", "svg-sequence-axis");
        groupBackbone.appendChild(backboneCircle);
        const backboneCircle2 = this._createShapeElement("circle");
        backboneCircle2.setAttribute("cx", 0);
        backboneCircle2.setAttribute("cy", 0);
        backboneCircle2.setAttribute("r", backBoneCircleRadius-backBoneCircleStrandsDistance/2);
        backboneCircle2.setAttribute("class", "svg-sequence-axis");
        groupBackbone.appendChild(backboneCircle2);

        /** 
         * Ticks
         */
        const groupBackboneTicks = this._createShapeElement("g");
        groupBackboneTicks.setAttribute("id", "svg-axis-ticks")
        groupBackbone.appendChild(groupBackboneTicks);
        const ticksPos = this.generateTicks(sequence.length);
        const tickLength = 15; //px
        const tickLabelPos = 30;

        let seqToPixel = (s, r) => {
            const a = (s / sequence.length)*2*Math.PI - Math.PI/2;
            return [r*Math.cos(a), r*Math.sin(a)]
        };
        groupBackboneTicks.appendChild(this._line(
            seqToPixel(0, backBoneCircleRadius-tickLength/2),
            seqToPixel(0, backBoneCircleRadius+tickLength/2),
            null,
            "svg-sequence-axis"
        ));
        for (let i in ticksPos) {
            groupBackboneTicks.appendChild(this._line(
                seqToPixel(ticksPos[i], backBoneCircleRadius-tickLength/2),
                seqToPixel(ticksPos[i], backBoneCircleRadius+tickLength/2),
                null,
                "svg-sequence-axis"
            ));
            const tickLabel = this._text(
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

        const groupFeatures = this._createShapeElement("g");
        groupFeatures.setAttribute("id", "svg-features");
        groupMain.appendChild(groupFeatures);

        const anglePerLetter = 1.5 // degree
        for (const [featureID, featureDict] of Object.entries(features)) {
            const featureLength = featureDict["span"][1] - featureDict["span"][0];
            const featureSpanLengthInDegrees = (featureLength / sequence.length) * 360;
            const featureLabelLengthInDegrees = featureDict["label"].length * anglePerLetter;
            const drawFeatureLabel = (featureLabelLengthInDegrees <= featureSpanLengthInDegrees) ? true: false;
            groupFeatures.appendChild(this._circularFeature(
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
     * @param {*} span 
     * @param {*} levelHeight 
     * @param {*} directionality 
     * @param {*} label 
     * @param {*} color 
     * @param {*} id 
     * @param {*} cssClass 
     * @param {*} seqToPixel 
     * @param {*} sequenceLength 
     * @returns 
     */
    _circularFeature(span, levelHeight, directionality, label, color, id, cssClass, seqToPixel, sequenceLength) {
        const featureGroup = this._createShapeElement("g");
        /**
         * Arrow
         */
        const featureArrow = this._createShapeElement("path");

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
        const featureLabel = this._text(
            [0, 0],
            label,
            null,
            `svg-feature-label-${Utilities.getTextColorBasedOnBg(color)}`,
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
    // #endregion Circular_view


    // #region Linear_view 
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
        svgContainer.removeChild(svgWrapperDummy);

        // Main wrapper
        const svgWrapper = document.createElement("DIV");
        svgWrapper.classList.add("svg-wrapper");

        // Main SVG
        const svgCanvas = this._createShapeElement("svg");
        svgCanvas.setAttribute("version", "1.2");
        svgWrapper.appendChild(svgCanvas);

        // Main group container
        const groupMain = this._createShapeElement("g");
        groupMain.setAttribute("transform", "translate(0 70)");
        svgCanvas.appendChild(groupMain);

        /**
         * Plasmid title and subtitle
         */
        const groupTitle = this._createShapeElement("g");
        groupTitle.setAttribute("id", "svg-title");
        groupMain.appendChild(groupTitle)
        groupTitle.appendChild(this._text(
            [maxWidth/2, -50],
            plasmidName,
            null,
            "svg-plasmid-title",
            "middle"
        ));
        groupTitle.appendChild(this._text(
            [maxWidth/2, -25],
            `${sequence.length} bp`,
            null,
            "svg-plasmid-subtitle",
            "middle"
        ));

        /**
         * Sequence axis
        */
        const groupAxis = this._createShapeElement("g");
        groupAxis.setAttribute("id", "svg-axis")
        groupMain.appendChild(groupAxis);
        const dotsOffset = 6;
        const dotsWidth = 3;
        const sequenceAxisMargin = dotsOffset*3;
        // Sequence coordinate to pixel in axis
        let seqToPixel = (s) => sequenceAxisMargin + (s / sequence.length)*(maxWidth - 2*sequenceAxisMargin);
        
        // Main axis
        groupAxis.appendChild(this._line(
            [seqToPixel(0),-2],
            [seqToPixel(sequence.length), -2],
            null,
            "svg-sequence-axis"
        ));
        groupAxis.appendChild(this._line(
            [seqToPixel(0), 2],
            [seqToPixel(sequence.length), 2],
            null,
            "svg-sequence-axis"
        ));

        // Dots on each side of the axis for circular plasmids
        if (topology === "circular"){
            for (let i = 0; i < 3; i++){
                groupAxis.appendChild(this._line(
                    [i*dotsOffset, 0],
                    [i*dotsOffset + dotsWidth, 0],
                    null,
                    "svg-sequence-axis"
                ));
                groupAxis.appendChild(this._line(
                    [maxWidth - i*dotsOffset, 0],
                    [maxWidth - i*dotsOffset - dotsWidth, 0],
                    null,
                    "svg-sequence-axis"
                ));
            };
        };

        // Ticks
        const groupAxisTicks = this._createShapeElement("g");
        groupAxisTicks.setAttribute("id", "svg-axis-ticks")
        groupAxis.appendChild(groupAxisTicks);
        const ticksPos = this.generateTicks(sequence.length);
        const ticksSeqPos = ticksPos.map((x) => seqToPixel(x));
        const tickLength = 15; //px
        const tickLabelPos = 30;
        for (let i in ticksSeqPos) {
            groupAxisTicks.appendChild(this._line(
                [ticksSeqPos[i], -tickLength/2],
                [ticksSeqPos[i], tickLength/2],
                null,
                "svg-sequence-axis"
            ));
            groupAxisTicks.appendChild(this._text(
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

        const groupFeatures = this._createShapeElement("g");
        groupFeatures.setAttribute("id", "svg-features");
        groupMain.appendChild(groupFeatures);

        const percentagePerLetter = 1 // %
        for (const [featureID, featureDict] of Object.entries(features)) {
            const featureLength = featureDict["span"][1] - featureDict["span"][0];
            const featureSpanLengthInPercent = (featureLength / sequence.length) * 100;
            const featureLabelLengthInPercent = featureDict["label"].length * percentagePerLetter;
            const drawFeatureLabel = (featureLabelLengthInPercent <= featureSpanLengthInPercent) ? true: false;
            groupFeatures.appendChild(this._linearFeature(
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
     * @param {*} span 
     * @param {*} directionality 
     * @param {*} label 
     * @param {*} color 
     * @param {*} id 
     * @param {*} cssClass 
     * @returns 
     */
    _linearFeature(span, levelHeight, directionality, label, color, id, cssClass) {
        const featureGroup = this._createShapeElement("g");
        
        /**
         * Arrow
         */
        const featureArrow = this._createShapeElement("polygon");

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
        featureGroup.appendChild(this._text(
            [span[0] + (span[1] - span[0])/2, featureHeight+featureArrowWidth*0.8],
            label,
            null,
            `svg-feature-label-${Utilities.getTextColorBasedOnBg(color)}`,
            "middle"
        ));

        return featureGroup;
    };
    // #endregion Linear_view


    // #region Grid_view
    /**
     * 
     * @param {*} sequence 
     * @param {*} complementarySequence 
     * @param {*} features 
     * @param {*} topology 
     */
    drawGrid(plasmidName, sequence, complementarySequence, features, topology) {
        this.baseRectsMap = {"fwd": [], "rev": []};
        this.featureSegmentsMap = {};
        
        /**
         * Settings
         */
        const gridViewSettings = {
            svgMinHeight: 140,
            singleStrandHeight: 38,
            baseTextOffset: 12,
            strandFeatureSpacing: 5,
            aaIndexHeight: 15,
            featureGroupGap: 1,
            aaBlockHeight: 20,
            featureAnnotationHeight: 25,
            featureAnnotationsSpacing: 5,
            gridMargin: 50
        };

        const { gridMargin, singleStrandHeight, baseTextOffset } = gridViewSettings;
        

        const { maxWidth, basesPerLine, basesWidth, basesPositions } = this._computeGridLayout(gridMargin);
        this.basesPerLine = basesPerLine;


        const segments = this._prepareGridSegments(sequence, complementarySequence, basesPerLine, topology);


        this._assignFeaturesToSegments(features, segments, basesPerLine);

        const gridView = document.createElement("div");
        gridView.id = "grid-view";
        gridView.classList.add("grid-view");

        const gridViewSequenceWrapper = document.createElement("div");
        gridViewSequenceWrapper.classList.add("svg-wrapper-grid");
        this._addGridEventListeners(gridViewSequenceWrapper);
        gridView.appendChild(gridViewSequenceWrapper);

        const gridViewMinimap = this._createGridViewMinimap(gridView, sequence.length, features);
        gridView.appendChild(gridViewMinimap);


        const templates = this._createBaseTemplates(singleStrandHeight, baseTextOffset, basesWidth);
        templates.svgCanvasTemplate = this._createSVGTemplate(maxWidth, gridMargin);
    

        const nrSegments = segments.length;
        for (let i = 0; i < nrSegments; i++) {
            const segment = segments[i];
            gridViewSequenceWrapper.appendChild(
                this._drawSegment(
                    segment, i,
                    gridViewSettings,
                    { maxWidth, basesPerLine, basesWidth, basesPositions },
                    templates,
                    { sequence, complementarySequence, features }
                )
            );
        };

        return gridView;
    };


    _createGridViewMinimap(gridView, sequenceLength, features) {
        const minimap = document.createElement("div");
        minimap.classList.add("grid-view-minimap");
        
        const minimapStyle = Utilities.findCSSRuleByClassName("grid-view-minimap").style;
        const minimapWidth = parseInt(minimapStyle.minWidth.replace("px", ""));
        const minimapPadding = parseInt(minimapStyle.padding.replace("px", ""));

        const minimapHeight = document.getElementById("viewer").clientHeight;

        const canvasWrapper = document.createElement("DIV");
        minimap.appendChild(canvasWrapper);

        const canvasWidth = minimapWidth - minimapPadding*2;
        const canvasHeight = minimapHeight - minimapPadding*2;

        const canvas = this._createShapeElement("svg");
        canvas.setAttribute("id", "minimap-svg-canvas");
        canvas.setAttribute("width", canvasWidth);
        canvas.setAttribute("height", canvasHeight);
        canvasWrapper.append(canvas);

        const seqSpanToMinimapPx = (s) => (s / sequenceLength)*canvasHeight;


        const featureRectsGroup = this._createShapeElement("g");
        canvas.append(featureRectsGroup);

        const featuresArray = Object.entries(features);
        featuresArray.sort((a, b) => a[1].level - b[1].level);
        const featuresSorted = Object.fromEntries(featuresArray);

        for (const [featureID, feature] of Object.entries(featuresSorted)) {
            //if (feature.level !== 0) continue;

            featureRectsGroup.appendChild(
                this._drawMinimapRect(
                    feature.span.map((v) => seqSpanToMinimapPx(v)),
                    canvasWidth*0.8,
                    canvasWidth,
                    feature.color,
                    "minimap-rect",
                )
            );
        };


        const minimapBarGroup = this._createShapeElement("g");
        canvas.append(minimapBarGroup);


        const minimapBar = this._drawMinimapRect(
            [0, 500],
            canvasWidth,
            canvasWidth,
            null,
            "minimap-bar",
        );
        minimapBar.setAttribute("id", "minimap-bar");
        minimapBarGroup.appendChild(minimapBar);

        gridView.addEventListener("scroll", PlasmidViewer.updateMinimapScrollBar);
        this._addMinimapEventListeners(canvas, minimapBar);

        return minimap;
    };


    _addMinimapEventListeners(minimapCanvas, minimapBar) {
        function scrollGridViewContainer(event) {
            //console.log("PlasmidViewer._addMinimapEventListeners.scrollGridViewContainer")

            const gridView = document.getElementById("grid-view");
        
            const scrollHeight = gridView.scrollHeight;
            const clientHeight = gridView.clientHeight;

            const minimapHeight = parseInt(minimapCanvas.getAttribute("height"));
            const minimapBarHeight = (clientHeight / scrollHeight) * minimapHeight;
            const maxY = minimapHeight - minimapBarHeight;

            const rect = minimapCanvas.getBoundingClientRect();
            const clickY = (event.clientY - rect.top) - minimapBarHeight/2;

            gridView.scrollTop = (clickY / maxY) * (gridView.scrollHeight - gridView.clientHeight);
        };


        minimapCanvas.addEventListener("click", function(event) {
            scrollGridViewContainer(event);
        });

        let isDragging = false;
        minimapBar.addEventListener("mousedown", function (event) {
            isDragging = true;

            minimapBar.style.cursor = "grabbing";
            document.addEventListener("mousemove", scrollGridViewContainer);
        });

        document.addEventListener("mouseup", function() {
            if (!isDragging) return;

            isDragging = false;
            minimapBar.style.cursor = "grab";

            document.removeEventListener("mousemove", scrollGridViewContainer)
        });
    };


    updateMinimapScrollBar() {
        //console.log("PlasmidViewer.updateMinimapScrollBar -> ")
        const gridView = document.getElementById("grid-view");
        const minimapCanvas = document.getElementById("minimap-svg-canvas");
        const minimapBar = document.getElementById("minimap-bar");
        
        const scrollHeight = gridView.scrollHeight; // Total scrollable height of the element
        const clientHeight = gridView.clientHeight; // The visible height of the element

        // Set minimap bar height
        const minimapHeight = parseInt(minimapCanvas.getAttribute("height"));
        const minimapBarHeight = (clientHeight / scrollHeight) * minimapHeight;
        minimapBar.setAttribute("height", minimapBarHeight);

        const maxY = minimapHeight - minimapBarHeight;

        const scrollTop = gridView.scrollTop; // The distance the element has been scrolled

        const newY = (scrollTop / (scrollHeight - clientHeight))*maxY;
        PlasmidViewer._setMinimapBarY(PlasmidViewer._clampMinimapBarY(newY, [0, maxY]));
        return;
    };

    _clampMinimapBarY(newY, clamp) {
        return Math.min(Math.max(clamp[0], newY), clamp[1]);
    }


    _setMinimapBarY(newY) {
        const minimapBar = document.getElementById("minimap-bar");
        minimapBar.setAttribute("y", newY);
    };


    _drawMinimapRect(span, girth, canvasWidth, fill, className) {
        const rect = this._createShapeElement("rect");
        rect.setAttribute("class", className);

        rect.setAttribute("x", (canvasWidth - girth)/2);
        rect.setAttribute("y", span[0]);
        rect.setAttribute("width", girth);
        rect.setAttribute("height", span[1] - span[0]);
        if (fill) rect.setAttribute("fill", fill);

        return rect;
    };


    _computeGridLayout(gridMargin) {
        const viewerContainer = document.getElementById("viewer");
        const svgWrapperPadding = 40;
        const scrollBarWidth = Utilities.getScrollbarWidth();

        const minimapStyle = Utilities.findCSSRuleByClassName("grid-view-minimap").style;
        const minimapWidth = parseInt(minimapStyle.minWidth.replace("px", ""));
        
        const maxWidth = viewerContainer.clientWidth - minimapWidth - svgWrapperPadding - scrollBarWidth - gridMargin * 2;
        const baseWidth = UserPreferences.get("baseWidth");
        const basesPerLine = Math.floor(maxWidth / baseWidth);
        const basesWidth = maxWidth / basesPerLine;
        
        const basesPositions = Array.from({ length: basesPerLine }, (_, i) => basesWidth / 2 + i * basesWidth + gridMargin);
        
        return { maxWidth, basesPerLine, basesWidth, basesPositions };
    };


    _prepareGridSegments(sequence, complementarySequence, basesPerLine, topology) {
        return Array.from({ length: Math.ceil(sequence.length / basesPerLine) }, (_, i) => {
            const sequenceStartIndex = i * basesPerLine;
            const sequenceEndIndex = sequenceStartIndex + basesPerLine;
            
            return {
                segmentIndexStart: sequenceStartIndex,
                segmentIndexEnd: sequenceEndIndex,
                sequenceFwd: sequence.slice(sequenceStartIndex, sequenceEndIndex),
                sequenceRev: complementarySequence.slice(sequenceStartIndex, sequenceEndIndex),
                features: {},
                segmentBounds: [
                    i === 0 && topology === "circular" ? "continued" : "index",
                    i === Math.ceil(sequence.length / basesPerLine) - 1 && topology === "circular" ? "continued" : "index"
                ]
            };
        });
    };


    _assignFeaturesToSegments(features, segments, basesPerLine) {
        Object.entries(features).forEach(([featureID, featureDict]) => {
            const { span, directionality } = featureDict;
            const [featureSpanStart, featureSpanEnd] = span;
            const segmentListIndexStart = Math.floor((featureSpanStart - 1) / basesPerLine);
            const segmentListIndexEnd = Math.floor(featureSpanEnd / basesPerLine);
    
            for (let i = segmentListIndexStart; i <= segmentListIndexEnd; i++) {
                const segment = segments[i];
                segment.features[featureID] = Utilities.deepClone(featureDict);
    
                // Adjust span
                segment.features[featureID].span = [
                    Math.max(segment.segmentIndexStart + 1, featureSpanStart) - segment.segmentIndexStart,
                    Math.min(segment.segmentIndexEnd, featureSpanEnd) - segment.segmentIndexStart
                ];
    
                segment.features[featureID].aaIndices = Array.from(
                    { length: Math.ceil((featureSpanEnd - featureSpanStart + 1) / 3) }, (_, j) => {
                        const aaStart = directionality === "fwd"
                            ? featureSpanStart + j * 3
                            : featureSpanEnd - j * 3;
                        
                        return [aaStart, directionality === "fwd"
                            ? aaStart + 2
                            : aaStart - 2];
                    }
                );
    
                if (i === segmentListIndexStart) {
                    segment.features[featureID]["shape-left"] = directionality === "fwd" ? null : "arrow";
                    segment.features[featureID]["shape-right"] =
                        i === segmentListIndexEnd ? (directionality === "fwd" ? "arrow" : null) : "break";
                } 
                else if (i === segmentListIndexEnd) {
                    segment.features[featureID]["shape-left"] = "break";
                    segment.features[featureID]["shape-right"] = directionality === "fwd" ? "arrow" : null;
                } 
                else {
                    segment.features[featureID]["shape-left"] = "break";
                    segment.features[featureID]["shape-right"] = "break";
                };
            };
        });
    };

    
    _createBaseTemplates(singleStrandHeight, baseTextOffset, basesWidth) {
        const baseBoxTemplateFwd = this._createShapeElement("rect");
        baseBoxTemplateFwd.setAttribute("y", 0);
        baseBoxTemplateFwd.setAttribute("height", singleStrandHeight);
        baseBoxTemplateFwd.setAttribute("width", basesWidth);
        baseBoxTemplateFwd.classList.add("base");

        const baseBoxTemplateRev = baseBoxTemplateFwd.cloneNode();
        baseBoxTemplateRev.setAttribute("y", singleStrandHeight);

        const baseTextTemplateFwd = this._createShapeElement("text");
        baseTextTemplateFwd.setAttribute("dy", 0);      
        baseTextTemplateFwd.setAttribute("text-anchor", "middle");
        baseTextTemplateFwd.setAttribute("y", singleStrandHeight - baseTextOffset);
        baseTextTemplateFwd.setAttribute("class", "base-text");

        const baseTextTemplateRev = baseTextTemplateFwd.cloneNode();
        baseTextTemplateRev.setAttribute("y", singleStrandHeight*2 - baseTextOffset);
    
        return {
            baseBoxTemplateFwd,
            baseBoxTemplateRev,
            baseTextTemplateFwd,
            baseTextTemplateRev
        };
    };


    _createSVGTemplate(maxWidth, gridMargin) {
        const svgCanvasTemplate = this._createShapeElement("svg");
        svgCanvasTemplate.setAttribute("width", maxWidth + gridMargin * 2);

        // Group housing all strand elements
        const strandGroup = this._createGroup("strand-group", svgCanvasTemplate);
        strandGroup.setAttribute("transform", "translate(0, 5)");

            // strandGroup -> sequenceGroup: Bases and axis
            const groupSequence = this._createGroup("sequence-group", strandGroup);

                // strandGroup -> sequence Group -> Forward Strand
                const groupStrandFwd = this._createGroup("strand-fwd", groupSequence);
                this._createGroup("strand-rects", groupStrandFwd);
                this._createGroup("strand-text", groupStrandFwd);

                // strandGroup -> sequence Group -> Reverse Strand
                const groupStrandRev = this._createGroup("strand-rev", groupSequence);
                this._createGroup("strand-rects", groupStrandRev);
                this._createGroup("strand-text", groupStrandRev);

                // strandGroup -> sequence Group -> Axis
                const axisGroup = this._createGroup("axis-group", groupSequence);
                this._createGroup("axis-ticks", axisGroup);
                this._createGroup("strand-indices", axisGroup);

            // Features group
            this._createGroup("svg-features", strandGroup);

        // Groups to house selection cursors
        this._createGroup("selection-preview-cursor-group", svgCanvasTemplate);
        this._createGroup("selection-cursor-group", svgCanvasTemplate);
        
        return svgCanvasTemplate;
    };


    _addGridEventListeners(svgWrapper) {
        /**
         * Mouse down
         */
        svgWrapper.addEventListener("mousedown", (e) => {
            if (e.button === 0) {

                // Get element at mousedown position
                const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
                this.elementsAtMouseDown = elementsAtPoint;

                const closestSelectionCursor = this.findClosestSelectionCursor(e);
                if (closestSelectionCursor && Session.activePlasmid().getSelectionIndices()[1] !== null) {
                    //this.currentlyResizingSelection = true;

                    const selectionCursors = this.cursors["sequence-cursor-selection"];
                    const otherCursor = selectionCursors.find(el => el !== closestSelectionCursor);
                    
                    this.currentlySelecting = true;
                    this.selectionStartSpan = parseInt(otherCursor.getAttribute("base-index"));

                    return;
                };

                // Find nearest base rect
                const nearestBaseRect = elementsAtPoint.find(
                    (el) => el.tagName === 'rect' && el.classList.contains('base')
                );
                if (nearestBaseRect) {
                    // Start selection
                    const baseIndex = parseInt(nearestBaseRect.getAttribute("base-index"));
                    
                    const rectBounds = nearestBaseRect.getBoundingClientRect();
                    const midX = rectBounds.left + rectBounds.width / 2;
                    const adjustedBaseIndex = (e.clientX < midX) ? baseIndex : baseIndex + 1;
                    
                    if (e.shiftKey) {
                        this.selectBases(this._combineSpans(adjustedBaseIndex));
                    } else {
                        this.selectBase(adjustedBaseIndex);
                    };
                    
                    this.currentlySelecting = true;
                    this.selectionType = "base";
                    this.selectionStartSpan = [adjustedBaseIndex, adjustedBaseIndex];

                    return;
                };

                const nearestAABlock = elementsAtPoint.find(
                    (el) => el.tagName === 'polygon' && el.classList.contains('aa-block')
                );
                if (nearestAABlock) {
                    // Start selection
                    const aaSpan = nearestAABlock.parentElement.getAttribute("aa-span").split(",").map(n => Number(n));
                    console.log(nearestAABlock.parentElement, aaSpan, Math.min(...aaSpan))
                    
                    this.selectAA(aaSpan, e.shiftKey);
                    
                    this.currentlySelecting = true;
                    this.selectionType = "aaBlock";
                    this.selectionStartSpan = aaSpan;

                    return;
                };


            };
        });
        /**
         * Mouse up
         */
        svgWrapper.addEventListener("mouseup", (e) => {

            // Stop selection
            this.currentlySelecting = false;
            this.currentlyResizingSelection = false;

            // Find out if the event was a click event by checking if the elements the mouse is over have changed
            const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
            if (!elementsAtPoint || !this.elementsAtMouseDown) return;
            const clicked = elementsAtPoint.every((ele, i) => ele === this.elementsAtMouseDown[i]);

            
            if (clicked) {

                // Reset shapes tracker
                this.elementsAtMouseDown = null;

                // Find shapes at event
                const shapesAtPoint = elementsAtPoint.filter(el => el instanceof SVGGeometryElement);

                // No shapes at event, deselect
                if (shapesAtPoint.length == 0) {
                    PlasmidViewer.deselectBases();
                    return;
                };
    
                // If we clicked on feature annotation, select it
                if (shapesAtPoint[0].parentElement.matches('g.svg-feature-arrow')) {
                    const featureID = shapesAtPoint[0].parentElement.parentElement.getAttribute("feature-id")
    
                    this.selectFeature(featureID, e.shiftKey);
                } else if (shapesAtPoint[0].parentElement.matches('g#aa-block-group')) {
                    const targetShape = shapesAtPoint[0].parentElement;
                    const aaSpan = targetShape.getAttribute("aa-span").split(",").map(n => Number(n));

                    this.selectAA(aaSpan, e.shiftKey);
                };
            };
        });


        /**
         * Double click
         */
        svgWrapper.addEventListener("dblclick", (e) => {
            // Get shapes at event
            const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
            const shapesAtPoint = elementsAtPoint.filter(el => el instanceof SVGGeometryElement);

            if (shapesAtPoint[0] && shapesAtPoint[0].parentElement) {
                // If we double click on feature annotation
                if (shapesAtPoint[0].parentElement.matches('g.svg-feature-arrow')) {
                    // Open its header in the sidebar
                    const featureID = shapesAtPoint[0].parentElement.parentElement.getAttribute("feature-id");
                    const targetDiv = document.getElementById(featureID)
                    const targetHeader = targetDiv.firstElementChild;
                    const targetContent = targetHeader.nextElementSibling;
            
                    Sidebar.toggleCollapsibleHeader(targetHeader);
    
                    // Scroll feature header into view
                    targetContent.addEventListener("transitionend", function scrollAfterTransition() {
                        targetContent.scrollIntoView({ behavior: "smooth", block: "center" });
                        targetContent.removeEventListener("transitionend", scrollAfterTransition);
                    }, { once: true });
                };
            };
        });


        /**
         * Mouse move
         */
        svgWrapper.addEventListener("mousemove", (e) => {
            // Get shapes at event
            const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
            const shapesAtPoint = elementsAtPoint.filter(el => el instanceof SVGGeometryElement);

            // Remove hover class from previously hovered bases
            this.unhighlightBases();
            this.removeFeatureHover();
            this.removeAABlocksHover();

            if (!this.currentlySelecting) {
                // If we're not currently selecting

                /**
                 * If we're hovering near a sequence cursor
                 */
                const closestSelectionCursor = this.findClosestSelectionCursor(e);
                if (closestSelectionCursor && Session.activePlasmid().getSelectionIndices()[1] !== null) {
                    this.hideSequenceTooltip();
                    document.body.style.cursor = "ew-resize";
                    return;
                };
                document.body.style.cursor = "auto";

                // If we're not hovering over anything, remove tooltip and hover cursors
                if (shapesAtPoint.length == 0) {
                    this.hideSequenceTooltip();
                    this.removeCursors("sequence-cursor-hover");
                };

                /**
                 * Hovering annotation
                 */
                const nearestFeatureAnnotation = elementsAtPoint.find(
                    (el) => el.tagName === 'polygon' && el.parentElement.classList.contains('svg-feature-arrow')
                );
                if (nearestFeatureAnnotation) {
                    // Find its ID
                    const featureID = nearestFeatureAnnotation.parentElement.parentElement.getAttribute("feature-id")
                        
                    // Find all segments with same ID and add hover styling to them
                    this.addFeatureHover(featureID);

                    if (this.currentTooltipTarget !== featureID) {
                        // Create feature description for tooltip
                        const tooltipBody = this.createFeatureHoverTooltip(featureID);
    
                        // Set tooltip
                        this.setSequenceTooltip(tooltipBody.innerHTML);
                        this.currentTooltipTarget = featureID;
                    };
                    
                    this.positionSequenceTooltip(e.pageX, e.pageY);
                };

                const nearestAABlock = elementsAtPoint.find(
                    (el) => el.tagName === 'polygon' && el.classList.contains('aa-block')
                );
                if (nearestAABlock) {
                    const targetShape = nearestAABlock.parentElement;
                    const featureID = targetShape.getAttribute("feature-id");
                    const aaIndex = targetShape.getAttribute("aa-index");
                    const aa = targetShape.getAttribute("aa");
                    const aaString = `${aa}${parseInt(aaIndex)+1}`;
                    this.addAABlocksHover(featureID, aaIndex);

                    // Show tooltip
                    if (this.currentTooltipTarget !== aaString) {
                        this.setSequenceTooltip(aaString);
                        this.currentTooltipTarget = aaString;
                    };

                    this.positionSequenceTooltip(e.pageX, e.pageY);
                    return;
                };

                /**
                 * Hovering Base
                 */
                const nearestBaseRect = elementsAtPoint.find(
                    (el) => el.tagName === 'rect' && el.classList.contains('base')
                );
                if (nearestBaseRect) {
                    const baseIndex = parseInt(nearestBaseRect.getAttribute("base-index"));

                    // Add the hover styling to it
                    this.highlightBases([baseIndex, baseIndex], "base-hover");
    
                    const rectBounds = nearestBaseRect.getBoundingClientRect();
                    const midX = rectBounds.left + rectBounds.width / 2;
                    const adjustedBaseIndex = (e.clientX < midX) ? baseIndex : baseIndex + 1;

                    this.setSequenceTooltip(adjustedBaseIndex);
                    this.positionSequenceTooltip(e.pageX, e.pageY);
            
                    this.removeCursors("sequence-cursor-hover");
                    this.placeCursor(adjustedBaseIndex);

                    return;
                };
            };


            if (this.currentlySelecting) {
                // We're selecting

                const nearestAABlock = elementsAtPoint.find(
                    (el) => el.tagName === 'polygon' && el.classList.contains('aa-block')
                );
                if (nearestAABlock) {
                    const aaBlockGroup = nearestAABlock.parentElement;
                    const aaIndex = aaBlockGroup.getAttribute("aa-index");
                    const aa = aaBlockGroup.getAttribute("aa");
                    const aaString = `${aa}${parseInt(aaIndex)+1}`;

                    const aaSpan = aaBlockGroup.getAttribute("aa-span").split(",").map(n => Number(n));
                    this.selectBases(this._combineSpans(this.selectionStartSpan, aaSpan));

                    if (this.currentTooltipTarget !== aaString) {
                        this.setSequenceTooltip(aaString);
                        this.currentTooltipTarget = aaString;
                    };

                    this.positionSequenceTooltip(e.pageX, e.pageY);
                
                    return;
                };

                const nearestRect = this.findNearestBaseRect(e);
                
                if (nearestRect) {
                    // Make the nearest rectangle to the mouse the end index and select everything
                    // before it
                    const selectionEndIndex = parseInt(nearestRect.getAttribute("base-index"));
    
                    this.selectBases(this._combineSpans(this.selectionStartSpan, selectionEndIndex));

                    this.setSequenceTooltip(selectionEndIndex);
                    this.positionSequenceTooltip(e.pageX, e.pageY);
                };

                return;
            };
        });


        /**
         * Mouse leave
         */
        svgWrapper.addEventListener("mouseleave", (e) => {
            // Hide tooltip and remove hover styling
            this.hideSequenceTooltip();
            this.removeCursors("sequence-cursor-hover");
            this.unhighlightBases("base-hover");
        });

        /**
         * Click outside of view container
         */
        document.getElementById("content-wrapper").addEventListener("click", function (e) {
            if (document.getElementById("viewer").contains(e.target)) {
                return;
            };
            // If we click outside the viewer, deselect bases
            PlasmidViewer.deselectBases();
        });
    };


    findClosestSelectionCursor(e) {
        const selectionCursors = this.cursors["sequence-cursor-selection"];
        if (!selectionCursors || selectionCursors.length === 0) return null;

        const hoverSpacing = 10; // px
        let closestLine = null;
        let minDistance = Infinity;

        for (const line of selectionCursors) {
            const x1 = parseFloat(line.getAttribute('x1'));
            const y1 = parseFloat(line.getAttribute('y1'));
            const x2 = parseFloat(line.getAttribute('x2'));
            const y2 = parseFloat(line.getAttribute('y2'));

            const svg = line.ownerSVGElement;
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());

            const dx = x2 - x1;
            const dy = y2 - y1;
            const lenSq = dx * dx + dy * dy;
            let t = ((svgPoint.x - x1) * dx + (svgPoint.y - y1) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
            const nearestX = x1 + t * dx;
            const nearestY = y1 + t * dy;
            const dist = Math.hypot(svgPoint.x - nearestX, svgPoint.y - nearestY);

            if (dist <= hoverSpacing && dist < minDistance) {
                minDistance = dist;
                closestLine = line;
            };
        };

        return closestLine;
    };


    _drawSegment(
        segment, segmentIndex,
        gridViewSettings,
        gridViewComputedParameters,
        templates,
        plasmid
    ) {
        const { singleStrandHeight, baseTextOffset, gridMargin } = gridViewSettings;
    
        const { maxWidth, basesPerLine, basesPositions } = gridViewComputedParameters;
        const { svgCanvasTemplate, baseBoxTemplateFwd, baseBoxTemplateRev, baseTextTemplateFwd, baseTextTemplateRev } = templates;
        const { features } = plasmid;

        const segmentIndexStart = segment["segmentIndexStart"];
        const segmentIndexEnd = segment["segmentIndexEnd"];
        
        const seqToPixel = (s) => (s / basesPerLine)*(maxWidth) + gridMargin;
        
        // Clone template
        const svgCanvas = svgCanvasTemplate.cloneNode(true);
        svgCanvas.setAttribute("indices", [segmentIndexStart+1, segmentIndexEnd]);

        const strandGroup = svgCanvas.querySelector("#strand-group");
            const groupSequence = strandGroup.querySelector("#sequence-group");
                const groupStrandFwd = groupSequence.querySelector("#strand-fwd");
                    const groupStrandFwdRects = groupStrandFwd.querySelector("#strand-rects");
                    const groupStrandFwdText = groupStrandFwd.querySelector("#strand-text");
                    
                const groupStrandRev = groupSequence.querySelector("#strand-rev");
                    const groupStrandRevRects = groupStrandRev.querySelector("#strand-rects");
                    const groupStrandRevText = groupStrandRev.querySelector("#strand-text");
                    
                const groupAxis = groupSequence.querySelector("#axis-group");
                    const groupTicks = groupAxis.querySelector("#axis-ticks");
                    const groupStrandIndices = groupAxis.querySelector("#strand-indices");
            const segmentFeaturesGroup = strandGroup.querySelector("#svg-features");


        // Draw bases
        for (let i = 0; i < 2; i++) {
            this._drawBases(
                [segment.sequenceFwd, segment.sequenceRev][i],
                segmentIndex,
                [baseBoxTemplateFwd, baseBoxTemplateRev][i],
                [baseTextTemplateFwd, baseTextTemplateRev][i],
                [groupStrandFwdRects, groupStrandRevRects][i],
                [groupStrandFwdText, groupStrandRevText][i],
                basesPerLine,
                basesPositions,
                [false, true][i]
            );
        };

        this._drawGridAxis(
            groupAxis,
            groupTicks,
            groupStrandIndices,
            groupSequence,
            segment,
            segmentIndexStart,
            segmentIndexEnd,
            basesPositions,
            singleStrandHeight,
            gridMargin,
            maxWidth,
            basesPerLine
        );


        let svgHeight = this._drawGridFeatures(
            segment,
            segmentIndexStart,
            segmentIndexEnd,
            seqToPixel,
            segmentFeaturesGroup,
            gridViewSettings,
            features,
            plasmid,
        );


        svgCanvas.setAttribute("height", svgHeight);
        return svgCanvas;
    };


    _drawBases(
        segmentSequence, segmentIndex, baseBoxTemplate, baseTextTemplate, groupStrandRects, groupStrandText,
        basesPerLine, basesPositions, isReverse = false
    ) {
        const baseWidth = UserPreferences.get("baseWidth");
        for (let i = 0; i < basesPerLine; i++) {
            const baseChar = segmentSequence[i];
            if (!baseChar) continue;
    
            const baseBox = baseBoxTemplate.cloneNode();
            baseBox.setAttribute("x", basesPositions[i] - baseWidth / 2);
            baseBox.setAttribute("base-index", segmentIndex * basesPerLine + i + 1);
            groupStrandRects.appendChild(baseBox);
    
            this.baseRectsMap[isReverse ? "rev" : "fwd"].push(baseBox);
    
            const baseText = baseTextTemplate.cloneNode();
            baseText.setAttribute("x", basesPositions[i]);
            baseText.textContent = baseChar;
            if (!/^[ACTG]$/i.test(baseChar)) {
                baseText.setAttribute("class", "base-ambiguous-text")
            };

            groupStrandText.appendChild(baseText);
        };
    };


    _drawGridAxis(
        groupAxis, groupTicks, groupStrandIndices, groupSequence, segment, segmentIndexStart, segmentIndexEnd,
        basesPositions, singleStrandHeight, gridMargin, maxWidth, basesPerLine
    ) {
        // Main line
        const axisEndX = (segment.sequenceFwd.length / basesPerLine) * maxWidth + gridMargin;
        groupAxis.appendChild(this._line(
            [gridMargin, singleStrandHeight],
            [axisEndX, singleStrandHeight], 
            null,
            "svg-sequence-axis-grid"
        ));
    
        // Ticks
        const ticksConfig = [
            { increment: 10, length: 14 },
            { increment: 5, length: 7 }
        ];
        ticksConfig.forEach(({ increment, length }) => {
            for (
                let num = Math.ceil(segmentIndexStart / increment) * increment;
                num <= segmentIndexEnd;
                num += increment
            ) {
                if (num - segmentIndexStart === 0) continue;
                if (num - segmentIndexStart > segment.sequenceFwd.length) continue;
    
                const tickX = basesPositions[num - segmentIndexStart - 1];
                groupTicks.appendChild(this._line(
                    [tickX, singleStrandHeight - length / 2],
                    [tickX, singleStrandHeight + length / 2],
                    null,
                    "svg-sequence-axis-grid"
                ));
            }
        });
    
        const [leftBound, rightBound] = segment.segmentBounds;
        this._drawSegmentBoundary(groupStrandIndices, leftBound, gridMargin, singleStrandHeight, segmentIndexStart + 1, "end");
        this._drawSegmentBoundary(groupSequence, rightBound, axisEndX, singleStrandHeight, segmentIndexEnd, "start");
    };


    _drawSegmentBoundary(parentGroup, boundaryType, x, y, label, textAnchor) {
        const dotsOffset = 8;
        const dotsWidth = 4;
        const startingOffset = 4;
    
        if (boundaryType === "continued") {
            // Draw 3 dots for a continued segment
            for (let i = 0; i < 3; i++) {
                const dotX = x + ((textAnchor === "start") ? (startingOffset + i * dotsOffset) : (-startingOffset - i * dotsOffset));
                parentGroup.appendChild(this._line(
                    [dotX, y],
                    [dotX + ((textAnchor === "start") ? dotsWidth : -dotsWidth), y],
                    null,
                    "svg-sequence-axis-grid"
                ));
            }
        } else {
            // Draw sequence index
            parentGroup.appendChild(this._text(
                [(textAnchor === "start") ? x + 8 : x - 8, y],
                `${label}`,
                null,
                "svg-sequence-indices",
                textAnchor,
                5
            ));
        };
    };
    


    _drawGridFeatures(segment, segmentIndexStart, segmentIndexEnd, seqToPixel, segmentFeaturesGroup, gridViewSettings, features, plasmid) {
        const {
            svgMinHeight, singleStrandHeight, strandFeatureSpacing, featureAnnotationHeight,
            featureAnnotationsSpacing, aaIndexHeight, featureGroupGap,
            aaBlockHeight
        } = gridViewSettings;
        
        // Group features by level
        let levels = Object.values(
            Object.entries(segment.features).reduce((acc, [key, feature]) => {
                acc[feature.level] = acc[feature.level] || [];
                acc[feature.level].push(key);
                return acc;
            }, {})
        );
        
    
        let svgHeight = svgMinHeight;
        let featureGroupTopY = singleStrandHeight * 2 + strandFeatureSpacing;
        let annotationY = featureGroupTopY + featureAnnotationHeight / 2;
        let aaIndexY;
        let aaBlockY;
    
        levels.forEach((featuresInLevel, levelIndex) => {
            featureGroupTopY = levelIndex === 0
                ? featureGroupTopY
                : annotationY + featureAnnotationHeight / 2 + featureAnnotationsSpacing;
    
            ({ annotationY, aaIndexY, aaBlockY } = this._calculateFeatureElementsPositions(
                segment, featuresInLevel, featureGroupTopY, aaIndexHeight, featureGroupGap,
                aaBlockHeight, featureAnnotationHeight
            ));
    
            svgHeight = Math.max(annotationY + featureAnnotationHeight / 2 + featureAnnotationsSpacing + 5, svgHeight);
    
            featuresInLevel.forEach(currFeatureID => {
                const featureDict = segment.features[currFeatureID];

                let featureLengthPixels = seqToPixel(featureDict.span[1]) - seqToPixel(featureDict.span[0] - 1);
                featureLengthPixels -= featureDict["shape-left"] !== null ? 10 : 0;
                featureLengthPixels -= featureDict["shape-right"] !== null ? 10 : 0;
                
                const featureLabel = this._fitTextInRectangle(featureDict.label, featureLengthPixels, "svg-feature-label-black");

                const featureElement = this._gridFeature(
                    currFeatureID,
                    [seqToPixel(featureDict.span[0] - 1), seqToPixel(featureDict.span[1])],
                    annotationY,
                    featureAnnotationHeight,
                    featureDict["shape-left"],
                    featureDict["shape-right"],
                    featureLabel,
                    featureDict.color,
                    null,
                    "svg-feature-arrow"
                );
                segmentFeaturesGroup.appendChild(featureElement);
                
                this.featureSegmentsMap[currFeatureID] = this.featureSegmentsMap[currFeatureID] || [];
                this.featureSegmentsMap[currFeatureID].push(featureElement);
    
                if (featureDict.translation) {
                    this._drawGridTranslation(
                        segmentFeaturesGroup,
                        currFeatureID,
                        featureDict,
                        segmentIndexStart,
                        segmentIndexEnd,
                        seqToPixel,
                        aaIndexY,
                        aaBlockY,
                        aaIndexHeight,
                        aaBlockHeight,
                        features,
                        plasmid,
                    );
                };
            });
        });
    
        return svgHeight;
    };


    _calculateFeatureElementsPositions(
        segment, featuresInLevel, featureGroupTopY, aaIndexHeight, featureGroupGap,
        aaBlockHeight, featureAnnotationHeight
    ) {
        const translatedFeatureInLevel = featuresInLevel.some(featureID => segment.features[featureID].translation);
    
        if (translatedFeatureInLevel) {
            const aaIndexY = featureGroupTopY;
            const aaBlockY = aaIndexY + aaIndexHeight + featureGroupGap;
            return {
                aaIndexY,
                aaBlockY,
                annotationY: aaBlockY + aaBlockHeight + featureGroupGap + featureAnnotationHeight / 2
            };
        };
        
        return {
            annotationY: featureGroupTopY + featureAnnotationHeight / 2
        };
    };


    /**
     * 
     * @param {*} featureId 
     * @param {*} span 
     * @param {*} levelHeight 
     * @param {*} directionality 
     * @param {*} label 
     * @param {*} color 
     * @param {*} elementId 
     * @param {*} cssClass 
     * @returns 
     */
    _gridFeature(
        featureId, span, levelHeight, featureHeight,
        featureShapeLeft, featureShapeRight, label,
        color, elementId, cssClass
    ) {
        
        const featureArrowWidth = featureHeight; //px
        const featureHeadMinWidth = 10; //px
        const featureBodyHeadRatio = 0.9;

        const textHeight = 21; // px approx
        
        
        const featureGroup = this._createShapeElement("g");
        featureGroup.setAttribute("feature-id", featureId)
        
        /**
         * Arrow
         */
        const featureArrowGroup = this._createShapeElement("g");
        const featureArrow = this._createShapeElement("polygon");
        featureArrowGroup.setAttribute("id", "arrow")

        const featureHeadWidth = Math.min(featureHeadMinWidth, (span[1] - span[0])*featureBodyHeadRatio)
        const featureY = levelHeight - featureArrowWidth/2;

        // Shapes are drawn clockwise
        const shapesLeft = {
            // Blunt end
            null: [
                [span[0], featureY + featureArrowWidth],
                [span[0], featureY]
            ],
            // Arrow
            "arrow": [
                [span[0] + featureHeadWidth, featureY + featureArrowWidth],
                [span[0], featureY + featureArrowWidth/2],
                [span[0] + featureHeadWidth, featureY]
            ],
            // Break
            "break": [
                [span[0] + featureHeadWidth, featureY + featureArrowWidth],
                [span[0], featureY]
            ]
        };
        const shapesRight = {
            // Blunt end
            null: [
                [span[1], featureY],
                [span[1], featureY + featureArrowWidth]
            ],
            // Arrow
            "arrow": [
                [span[1] - featureHeadWidth, featureY],
                [span[1], featureY + featureArrowWidth/2],
                [span[1] - featureHeadWidth, featureY + featureArrowWidth]
            ],
            // Break
            "break": [
                [span[1] - featureHeadWidth, featureY],
                [span[1], featureY + featureArrowWidth]
            ]
        };

        const pointsLeft = shapesLeft[featureShapeLeft];
        const pointsRight = shapesRight[featureShapeRight];
        const points = pointsLeft.concat(pointsRight);
        featureArrow.setAttribute("points", points);

        featureArrow.setAttribute("fill", color);

        if (elementId) {featureArrowGroup.setAttribute("id", elementId)};
        if (cssClass) {featureArrowGroup.setAttribute("class", cssClass)};
        
        
        if (featureShapeLeft == "break") {
            const breakDecorationLeft = this._createShapeElement("polygon");
            breakDecorationLeft.setAttribute("points", [
                [span[0], featureY + featureArrowWidth],
                [span[0] + featureHeadWidth, featureY],
                [span[0] + featureHeadWidth, featureY + featureArrowWidth]
            ]);
            breakDecorationLeft.setAttribute("fill", color);
            breakDecorationLeft.classList.add("svg-feature-arrow-decoration");
            
            featureArrowGroup.appendChild(breakDecorationLeft);
        }

        if (featureShapeRight == "break") {
            const breakDecorationRight = this._createShapeElement("polygon");
            breakDecorationRight.setAttribute("points", [
                [span[1] - featureHeadWidth, featureY],
                [span[1], featureY],
                [span[1] - featureHeadWidth, featureY + featureArrowWidth]
            ]);
            breakDecorationRight.setAttribute("fill", color);
            breakDecorationRight.classList.add("svg-feature-arrow-decoration");
            
            featureArrowGroup.appendChild(breakDecorationRight);
        }


        featureArrowGroup.appendChild(featureArrow);
        
        featureGroup.appendChild(featureArrowGroup);

        /**
         * Text
         */
        const textBoxStart = (featureShapeLeft == null) ? span[0]: span[0] + featureHeadWidth;
        const textBoxEnd = (featureShapeRight == null) ? span[1]: span[1] - featureHeadWidth;
        featureGroup.appendChild(this._text(
            [textBoxStart + (textBoxEnd - textBoxStart)/2, featureY+(featureArrowWidth/2)],
            label,
            null,
            `svg-feature-label-${Utilities.getTextColorBasedOnBg(color)}`,
            "middle",
            "0.4em"
        ));

        return featureGroup;
    };


    _drawGridTranslation(
        segmentFeaturesGroup, currFeatureID, featureDict, segmentIndexStart, segmentIndexEnd,
        seqToPixel, aaIndexY, aaBlockY, aaIndexHeight, aaBlockHeight, features, plasmid
    ) {
        const baseWidth = UserPreferences.get("baseWidth");
        const {sequence, complementarySequence} = plasmid;

        const translation = this._createShapeElement("g");
        translation.setAttribute("id", "svg-feature-translation");
        segmentFeaturesGroup.appendChild(translation);
    
        const direction = features[currFeatureID].directionality;
        const aaIndices = featureDict.aaIndices;
    
        let codonStart = direction === "fwd"
            ? featureDict.span[0] + segmentIndexStart
            : featureDict.span[1] + segmentIndexStart;
        let aaRangeIndex = aaIndices.findIndex(([a, b]) => codonStart >= Math.min(a, b) && codonStart <= Math.max(a, b));
    
        while (aaIndices[aaRangeIndex]) {
            const aaRangeFull = aaIndices[aaRangeIndex];
    
            if ((direction === "fwd" && aaRangeFull[0] > segmentIndexEnd) || 
                (direction === "rev" && aaRangeFull[0] < segmentIndexStart + 1)) break;
    
            const codon = direction === "fwd"
                ? sequence.slice(Math.min(...aaRangeFull) - 1, Math.max(...aaRangeFull))
                : complementarySequence.slice(Math.min(...aaRangeFull) - 1, Math.max(...aaRangeFull)).split("").reverse().join("");
            const aa = Nucleotides.translate(codon);
    
            const aaShapeRange = direction === "fwd"
                ? [Math.max(aaRangeFull[0], segmentIndexStart + 1), Math.min(aaRangeFull[1], segmentIndexEnd)]
                : [Math.min(aaRangeFull[0], segmentIndexEnd), Math.max(aaRangeFull[1], segmentIndexStart + 1)];
            
            let aaTextPos = (Math.abs(aaShapeRange[0] - aaShapeRange[1]) + 1 >= 2)
                ? (
                    direction === "fwd"
                        ? aaRangeFull[0] + (aaRangeFull[1] - aaRangeFull[0]) / 2
                        : aaRangeFull[0] - (aaRangeFull[0] - aaRangeFull[1]) / 2
                    )
                : null;

            const aaTextPosPx = aaTextPos !== null
                ? seqToPixel(aaTextPos - segmentIndexStart) - baseWidth / 2
                : null;
    
            const aaBlock = this._aaBlock(
                seqToPixel(Math.min(...aaShapeRange) - segmentIndexStart) - baseWidth,
                aaBlockY,
                (Math.abs(aaShapeRange[0] - aaShapeRange[1]) + 1) * baseWidth,
                aaBlockHeight,
                direction,
                aaTextPosPx,
                aa,
                aaIndexY,
                aaIndexHeight,
                (aaRangeIndex + 1) % 5 === 0 || aaRangeIndex === 0 ? aaRangeIndex + 1 : null
            );
    
            aaBlock.setAttribute("feature-id", currFeatureID);
            aaBlock.setAttribute("aa-index", aaRangeIndex);
            aaBlock.setAttribute("aa-span", aaRangeFull);
            aaBlock.setAttribute("aa", aa);
            translation.appendChild(aaBlock);
    
            aaRangeIndex++;
        };
    };
    
    _aaBlock(x, y, width, height, direction, textPosX, aa, aaIndexY, aaIndexHeight, aaIndex) {
        const headWidth = 3;

        const aaBlockGroup = this._createShapeElement("g");
        aaBlockGroup.setAttribute("id", "aa-block-group");

        let fragment = document.createDocumentFragment();

        /**
         * Block index
         */
        if (aaIndex && textPosX) {
            fragment.appendChild(this._text(
                [textPosX, aaIndexY + aaIndexHeight/2],
                aaIndex,
                null,
                `aa-index`,
                "middle",
                "0.4em"
            ));
        };


        /**
         * Block
         */
        const isForward = direction === "fwd";
        const isStop = aa === "*";

        let points = isForward 
        ? [
            [x + headWidth, y + height / 2],
            [x, y],
            [x + width, y],
            [x + width + (isStop ? 0 : headWidth), y + height / 2],
            [x + width, y + height],
            [x, y + height]
        ]
        : [
            [x - (isStop ? 0 : headWidth), y + height / 2],
            [x, y],
            [x + width, y],
            [x + width - headWidth, y + height / 2],
            [x + width, y + height],
            [x, y + height]
        ];

        const aaBlock = this._createShapeElement("polygon");
        aaBlock.setAttribute("id", "block")
        aaBlock.setAttribute("points", points.map(p => p.join(",")).join(" "));
        aaBlock.classList.add("aa-block");

        const resClass = `aa-block-${aa === "*" ? "stop" : aa}`;
        aaBlock.classList.add(resClass);
        fragment.appendChild(aaBlock);
        

        /**
         * Block text
         */
        if (textPosX) {
            let color = this.resFillColors[aa === "*" ? "stop" : aa];

            const aaText = this._text(
                [textPosX, y + height/2],
                aa,
                null,
                `aa-text`,
                "middle",
                "0.4em"
            );
            aaText.classList.add(`aa-text-${Utilities.getTextColorBasedOnBg(color)}`)
            fragment.appendChild(aaText);
        };

        aaBlockGroup.appendChild(fragment);
        return aaBlockGroup;
    };


    findNearestBaseRect(event) {
        const svgWrapper = document.querySelector(".svg-wrapper-grid");
        const svgElements = Array.from(svgWrapper.children);
        const scrollBox = document.getElementById("viewer").getBoundingClientRect(); 

        const visibleSvgs = svgElements.filter(svg => {
            const svgBox = svg.getBoundingClientRect();
            return (
                svgBox.bottom > scrollBox.top &&  // Is it below the top of the scrollable area?
                svgBox.top < scrollBox.bottom     // Is it above the bottom of the scrollable area?
            );
        });
        if (visibleSvgs.length === 0) return;


        let nearestSvg = null;
        let lastSvgDistance = Infinity;

        visibleSvgs.forEach(svg => {
            const svgBox = svg.getBoundingClientRect();
            const svgX = svgBox.left + svgBox.width / 2;
            const svgY = svgBox.top + svgBox.height / 2;

            const distance = Math.hypot(svgX - event.clientX, svgY - event.clientY);

            if (distance < lastSvgDistance) {
                lastSvgDistance = distance;
                nearestSvg = svg;
            }
        });

        const targetSvgs = [nearestSvg];
        const prevSvg = nearestSvg?.previousElementSibling;
        const nextSvg = nearestSvg?.nextElementSibling;
        if (prevSvg && visibleSvgs.includes(prevSvg)) targetSvgs.push(prevSvg);
        if (nextSvg && visibleSvgs.includes(nextSvg)) targetSvgs.push(nextSvg);
    
        let rects = [];
        targetSvgs.forEach(svg => rects.push(...svg.querySelectorAll(".base")));


        // Find nearest rectangle to the mouse position
        let nearestRect = null;
        let lastDistance = Infinity;

        rects.forEach(rect => {
            const rectBox = rect.getBoundingClientRect();
            const rectX = rectBox.left + rectBox.width / 2;
            const rectY = rectBox.top + rectBox.height / 2;

            const distance = Math.hypot(rectX - event.clientX, rectY - event.clientY);

            if (distance < lastDistance) {
                lastDistance = distance;
                nearestRect = rect;
            }
        });

        return nearestRect;
    };


    getCssFillColor(className) {
        for (let sheet of document.styleSheets) {
            try {
                for (let rule of sheet.cssRules) {
                    if (rule.selectorText === `.${className}`) {
                        return rule.style.fill;
                    };
                };
            } catch (e) {}
        };
        return "#000";
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
    // #endregion Grid_view


    // #region Drawing_helpers
    /**
     * 
     * @param {*} shape 
     * @returns 
     */
    _createShapeElement(shape) {
        return document.createElementNS(this.svgNameSpace, shape)
    };

    _createGroup(id, parent) {
        const group = this._createShapeElement("g");
        group.setAttribute("id", id);
        parent.appendChild(group);
        return group;
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
    _text(pos, content, id=null, cssClass=null, textAnchor="start", dy=0) {
        const textElement = this.textElementTemplate.cloneNode();
        textElement.setAttribute("x", pos[0]);
        textElement.setAttribute("y", pos[1]);
        textElement.setAttribute("dy", dy);      
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
    _line(p1, p2, id=null, cssClass=null) {
        const line = this._createShapeElement("line");

        line.setAttribute("x1", p1[0]);
        line.setAttribute("y1", p1[1]);
        line.setAttribute("x2", p2[0]);
        line.setAttribute("y2", p2[1]);

        if (id) {line.setAttribute("id", id)};

        if (cssClass) {
            const cssClasses = Array.isArray(cssClass) ? cssClass : [cssClass];
            cssClasses.forEach((c) => {
                line.classList.add(c)
            });
        };

        return line;
    };


    _initMeasurementSVG() {
        this.measurementSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.measurementSvg.style.position = "absolute";
        this.measurementSvg.style.visibility = "hidden";
        this.measurementSvg.style.width = "0";
        this.measurementSvg.style.height = "0";
        document.body.appendChild(this.measurementSvg);

        this.measurementText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        this.measurementSvg.appendChild(this.measurementText);
    };


    /**
     * Truncates strings to fit wihin an area.
     * 
     * @param {String} text - Input string
     * @param {Number} maxWidth - Max width of string in pixels
     * @param {String} cssClass - CSS class to pull styling from
     * @returns  {String} - Original string or truncated string
     */
    _fitTextInRectangle(text, maxWidth, cssClass) {
        this.measurementText.setAttribute("class", cssClass);
        this.measurementText.textContent = text;

        const computedStyle = window.getComputedStyle(this.measurementText);
        this.measurementText.setAttribute("font-size", computedStyle.fontSize);
        this.measurementText.setAttribute("font-family", computedStyle.fontFamily);

        let textWidth = this.measurementText.getComputedTextLength();

        if (textWidth <= maxWidth) return text;

        let left = 0, right = text.length;
        let bestFit = "";

        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            let candidateText = text.slice(0, mid) + "...";
            this.measurementText.textContent = candidateText;
            textWidth = this.measurementText.getComputedTextLength();

            if (textWidth <= maxWidth) {
                // Store valid fit
                bestFit = candidateText;
                // Try longer text
                left = mid + 1;
            } else {
                // Try shorter text
                right = mid - 1;
            };
        };

        return bestFit;
    };
    // #endregion Drawing_helpers


    // #region Render_functions
    /**
     * Display a specific view.
     * 
     * @param {String} targetView  - Target view to display ("circular", "linear", "grid")
     * @param {HTMLElement} sender 
     * @returns 
     */
    switchView(targetView, sender=null) {
        // Return immediately if the button is disabled
        if (sender && sender.hasAttribute("disabled")) {return};
        

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


    /**
     * 
     */
    updateViewer() {
        const targetView = PlasmidViewer.activeView ? PlasmidViewer.activeView: "grid";


        ["circular", "linear", "grid"].forEach(view => {
            const svgContainer = document.getElementById(`${view}-view-container`);
            if (svgContainer.firstElementChild) {
                svgContainer.removeChild(svgContainer.firstElementChild)
            };

            svgContainer.appendChild(Session.activePlasmid().views[view]);
        });

        this.switchView(targetView);
    };


    /**
     * 
     */
    redraw(views=null) {
        //TO DO: Keep selection when redrawing
        const activePlasmid = Session.activePlasmid()
        if (activePlasmid) {
            activePlasmid.generateViews(views);
            PlasmidViewer.updateViewer();
        };

        this.highlightSubcloningTarget();
        this.addDeletionMarkings();
        this.updateMinimapScrollBar();
    };
    
    // #endregion Render_functions

    // #region Sequence_tooltip 
    /**
     * Show the sequence tooltip and set its position
     * 
     * @param {int} posX 
     * @param {int} posY 
     */
    positionSequenceTooltip(posX, posY) {
        const tooltip = document.getElementById("sequence-tooltip");
        const margin = 15; //px

        // Position context menu
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const tooltipWidth = tooltip.offsetWidth;
        const tooltipHeight = tooltip.offsetHeight;

        posX += margin;
        posY += margin;

        if (posX + tooltipWidth > viewportWidth) {
            posX -= tooltipWidth + 2*margin;
        };
        if (posY + tooltipHeight > viewportHeight) {
            posY -= tooltipHeight + 2*margin;
        };

        posX = Math.max(0, posX);
        posY = Math.max(0, posY);

        tooltip.style.top = `${posY}px`;
        tooltip.style.left = `${posX}px`;
        tooltip.setAttribute("visible", "");
    };


    /**
     *  Hide the sequence tooltip
     */
    hideSequenceTooltip() {
        this.currentTooltipTarget = null;
        document.getElementById("sequence-tooltip").removeAttribute("visible");
    };


    /**
     * Set the text of the sequence tooltip
     * 
     * @param {string} text 
     */
    setSequenceTooltip(body) {
        const tooltip = document.getElementById("sequence-tooltip");
        tooltip.innerHTML = body;
    };
    // #endregion Sequence_tooltip 


    // #region Selection
    /**
     * 
     * @param {*} input 
     */
    placeCursor(input, cssClass="sequence-cursor-hover") {
        const seqLength = Session.activePlasmid().sequence.length;
        const indices = Array.isArray(input) ? input : [input];

        const cursorsPlaced = [];

        let rectMatch;
        let posX;
        for (let i = 0; i < indices.length; i++) {
            const index = indices[i];
            const placeCursorOnLastBase = index - 1 === seqLength;

            rectMatch = (!placeCursorOnLastBase)
                ? this.baseRectsMap["fwd"][index - 1]
                : this.baseRectsMap["fwd"][index - 2];
            if (!rectMatch) continue;

            posX = (!placeCursorOnLastBase)
                ? rectMatch.getAttribute("x")
                : posX = parseFloat(rectMatch.getAttribute("x")) + parseFloat(rectMatch.getAttribute("width"));;

            if (!posX) continue;

            const svgParent = rectMatch.closest("svg");
            const cursorHeight = svgParent.getBoundingClientRect().height;
            const cursorGroup = svgParent.getElementById(
                cssClass.includes("preview") ? 'selection-preview-cursor-group': 'selection-cursor-group'
            );
    
            const cursorElement = this._line(
                [posX, 0],
                [posX, cursorHeight],
                null,
                ["sequence-cursor", cssClass]
            );
            const baseIndex = parseInt(rectMatch.getAttribute("base-index"));
            cursorElement.setAttribute("base-index", (!placeCursorOnLastBase) ? baseIndex: baseIndex + 1);
            cursorGroup.appendChild(cursorElement);
            
            cursorsPlaced.push(cursorElement);
        };


        if (!this.cursors[cssClass]) {
            this.cursors[cssClass] = cursorsPlaced
        } else {
            this.cursors[cssClass] = this.cursors[cssClass].concat(cursorsPlaced);
        };
    };


    /**
     * 
     * @param {*} cssClass 
     */
    removeCursors(cssClass="sequence-cursor") {
        const cursors = this.cursors[cssClass];
        if (!cursors) return;

        for (let i = 0, len = cursors.length; i < len; i ++) {
            const currCursor = cursors[i]
            currCursor.remove();
        };

        this.cursors[cssClass] = [];
    };


    /**
     * 
     * @param {Array<number>} span 
     * @param {string} cssClass 
     */
    highlightBases(span, cssClass = "base-hover", strand=null) {
        //console.log("PlasmidViewer.highlightBases ->", span, cssClass, strand)
        const [start, end] = span;
    
        let basesHighlighted = [];

        const sequenceLength = Session.activePlasmid().sequence.length
        const strands = (strand) ? [strand]: ["fwd", "rev"];
        for (let i = 0; i < strands.length; i++) {
            const currMap = this.baseRectsMap[strands[i]];

            for (let j = start; j <= end; j++) {
                let baseIndex = j;
                if (baseIndex <= 0) baseIndex += sequenceLength;
                if (baseIndex > sequenceLength) baseIndex -= sequenceLength;

                const rect = currMap[baseIndex-1];
                rect.classList.add(cssClass);
                basesHighlighted.push(rect);
            };
        };


        if (!this.highlightedBases[cssClass]) {
            this.highlightedBases[cssClass] = basesHighlighted;
        } else {
            this.highlightedBases[cssClass] = this.highlightedBases[cssClass].concat(basesHighlighted);
        };
    };


    /**
     * 
     * @param {string} cssClass 
     */
    unhighlightBases(cssClass="base-hover") {
        const basesToUnhighlight = this.highlightedBases[cssClass];
        if (!basesToUnhighlight) return;


        for (let i = 0, len = basesToUnhighlight.length; i < len; i++) {
            const currBase = basesToUnhighlight[i];
            currBase.classList.remove(cssClass);
        };
        this.highlightedBases[cssClass] = [];
    };


    highlightSubcloningTarget() {
        this.unhighlightSubcloningTarget();
        if (
            Session.subcloningOriginPlasmidIndex === null ||
            Session.subcloningOriginPlasmidIndex !== Session.activePlasmidIndex
        ) {
            return;
        };

        const [start, end] = Session.subcloningOriginSpan;
    
        const svgs = document.getElementById("grid-view-container").getElementsByTagName('svg');
        for (let i = 0; i < svgs.length; i++) {
            const svg = svgs[i];
            const [svgStart, svgEnd] = svg.getAttribute('indices').split(',').map(Number);
            // Skip this SVG if it doesn't contain relevant bases
            if (svgEnd < start || svgStart > end) continue;
    
            const rects = svg.getElementById("strand-fwd").getElementsByTagName('rect');

            let basesInSubSpan = []
            for (let j = 0; j < rects.length; j++) {
                const rect = rects[j];
                const baseIndex = parseInt(rect.getAttribute('base-index'), 10);
                
                if (baseIndex >= start && baseIndex <= end) {
                    basesInSubSpan.push(rect)
                };
            };

            if (basesInSubSpan.length === 0) continue;

            const firstRect = basesInSubSpan[0];
            const lastRect = basesInSubSpan[basesInSubSpan.length - 1];

            const X1 = parseFloat(firstRect.getAttribute('x'));
            const Y = parseFloat(firstRect.getAttribute('y'));

            const X2 = parseFloat(lastRect.getAttribute('x'));
            const cellWidth = parseFloat(lastRect.getAttribute('width'));
            const cellHeight = parseFloat(firstRect.getAttribute('height'));

            const subcloningRect = this._createShapeElement("rect");
            subcloningRect.setAttribute("id", "subcloning-rect");
            subcloningRect.setAttribute("class", "subcloning-rect");

            subcloningRect.setAttribute("x", X1);
            subcloningRect.setAttribute("y", Y);
            subcloningRect.setAttribute("width", X2 + cellWidth - X1);
            subcloningRect.setAttribute("height", cellHeight*2);

            firstRect.parentElement.insertBefore(subcloningRect, firstRect.parentElement.firstChild);
        
            this.subcloningRects.push(subcloningRect);
        };
    };


    unhighlightSubcloningTarget() {
        this.unhighlightBases("base-sub-target");
        for (let i = 0, len = this.subcloningRects.length; i < len; i++) {
            this.subcloningRects[i].remove()
        };
        this.subcloningRects = [];
    };


    addDeletionMarkings() {
        if (!Session.activePlasmid()) return;
        
        this.removeDeletionMarkings();

        const deletionMarkings = Session.activePlasmid().deletionMarks;
        for (let i = 0; i < deletionMarkings.length; i++) {
            const pos = deletionMarkings[i];

            this.placeCursor(pos, "deletion-marking");
        };
    };

    removeDeletionMarkings() {
        this.removeCursors("deletion-marking")
    };



    addSequenceHover(span) {
        if (span === this.currentHoverSpan) return;

        this.removeSequenceHover();
        this.placeCursor([span[0], span[1] + 1]);
        this.highlightBases(span);

        this.currentHoverSpan = span;
    };


    removeSequenceHover() {
        this.removeCursors("sequence-cursor-hover");
        this.unhighlightBases();

        this.currentHoverSpan = null;
    };


    addFeatureHover(featureID) {
        const span = Session.activePlasmid().features[featureID]["span"]
        const featureSegments = this.featureSegmentsMap[featureID];
        
        const svgWrapper = document.querySelector(".svg-wrapper-grid");
        const scrollBox = document.getElementById("viewer").getBoundingClientRect(); 

        for (let i = 0, len = featureSegments.length; i < len; i++) {
            const polygon = featureSegments[i].firstElementChild;
            
            if (polygon) {
                const polyBox = polygon.getBoundingClientRect();
    
                // Check if the polygon is visible inside the scrollable div
                if (
                    polyBox.bottom > scrollBox.top &&  // Not above the visible area
                    polyBox.top < scrollBox.bottom  // Not below the visible area
                ) {
                    polygon.classList.add("svg-feature-arrow-hover");
                    this.hoveredFeatureSegments.push(polygon);
                };
            };
        };

        this.addSequenceHover(span);
    };

    removeFeatureHover() {
        for (let i = 0, len = this.hoveredFeatureSegments.length; i < len; i++) {
            this.hoveredFeatureSegments[i].classList.remove("svg-feature-arrow-hover");
        };
        this.hoveredFeatureSegments = [];

        this.removeSequenceHover();
    };

    createFeatureHoverTooltip(featureID) {
        const featureDict = Session.activePlasmid().features[featureID];

        const tooltipBody = document.createElement("DIV");

        const title = document.createElement("DIV");
        title.innerText = featureDict["label"];
        title.classList.add("sequence-tooltip-title");
        tooltipBody.appendChild(title);

        const featureLength = featureDict["span"][1] - featureDict["span"][0];
        const remainder = featureLength % 3;
        const remainderString = (remainder !== 0) ? "+" + remainder: "";
        const nrAA = (featureLength - remainder)/3;
        const nrAAString = (featureLength >= 3) ? "3x" + nrAA: nrAA;
        const properties = {
            "Type": featureDict["type"],
            "Span": `${featureLength} bp (${nrAAString}${remainderString}) [${featureDict["span"][0]}, ${featureDict["span"][1]}]`,
            "Note": (featureDict["note"] && featureDict["note"].length !== 0) ? featureDict["note"]: null,
            "Translation": (featureDict["translation"] && featureDict["translation"].length !== 0) ? featureDict["translation"]: null,
        }

        for (const [key, value] of Object.entries(properties)) {
            if (value === null || value.length === 0) {continue};

            const propertyDiv = document.createElement("DIV");
            propertyDiv.classList.add("sequence-tooltip-row");

            const propertyKey = document.createElement("DIV");
            propertyKey.classList.add("sequence-tooltip-row-key");
            propertyKey.innerText = key;
            propertyDiv.appendChild(propertyKey);

            const propertyValue = document.createElement("DIV");
            propertyValue.classList.add("sequence-tooltip-row-value");
            propertyValue.innerText = value;
            propertyDiv.appendChild(propertyValue);

            tooltipBody.appendChild(propertyDiv);
        };

        return tooltipBody;
    };


    addAABlocksHover(featureID, aaIndex) {
        this.removeAABlocksHover();

        // Find all segments with same ID
        const containerDiv = document.getElementById('grid-view-container');
        const shapesWithAttribute = containerDiv.querySelectorAll(`[feature-id="${featureID}"][aa-index="${aaIndex}"]`);
        
        if (shapesWithAttribute.length === 0) return;
        
        shapesWithAttribute.forEach((shape) => {
            const polygon = shape.querySelector("#block");
            if (polygon) {
                polygon.classList.add("aa-block-hover")
                this.hoveredAABlocks.push(polygon);
            };
        });

        let aaSpan = shapesWithAttribute[0].getAttribute("aa-span").split(",").map(Number);
        aaSpan.sort((a, b) => a - b);

        this.addSequenceHover(aaSpan);
    };

    removeAABlocksHover() {
        for (let i = 0, len = this.hoveredAABlocks.length; i < len; i++) {
            this.hoveredAABlocks[i].classList.remove("aa-block-hover");
        };
        this.hoveredAABlocks = [];

        this.removeSequenceHover();
    };


    /**
     * 
     * @param {*} featureID 
     */
    selectFeature(featureID, combineSelection=false) {
        
        let span = Session.activePlasmid().features[featureID]["span"];
        
        this.selectBases((combineSelection) ? this._combineSpans(span): span, featureID);

    };


    selectAA(span, combineSelection=false) {
        
        this.selectBases((combineSelection) ? this._combineSpans(span): span);
    };


    /**
     * 
     * @param {*} featureID 
     */
    scrollToFeature(featureID) {
        if (PlasmidViewer.activeView !== "grid") {return};

        const gridViewContainer = document.getElementById("grid-view-container");
        const featureSegments = Array.from(gridViewContainer.querySelectorAll(`g[feature-id="${featureID}"]`));
    
        if (featureSegments.length === 0) {return};

        featureSegments.sort((a, b) => {
            const yA = a.getBoundingClientRect().top;
            const yB = b.getBoundingClientRect().top;
            return yA - yB;
        });

        const featureDirectionality = Session.activePlasmid().features[featureID]["directionality"];

        const targetSegment = featureDirectionality === "fwd" 
        ? featureSegments[featureSegments.length - 1]
        : featureSegments[0];

        targetSegment.scrollIntoView(
            {
                behavior: "smooth",
                block: "center",
            }
        );
    };


    /**
     * 
     * @param {*} index 
     */
    selectBase(index) {
        this.deselectBases();

        this.placeCursor(index, "sequence-cursor-selection");
        Session.activePlasmid().setSelectionIndices([index, null]);
    };


    /**
     * 
     * @param {*} span 
     */
    selectBases(span, featureID = null) {
        span = [Math.min(...span), Math.max(...span)]
        this.deselectBases();

        this.placeCursor([span[0], span[1] + 1], "sequence-cursor-selection");
        this.highlightBases(span, "base-selected");

        Session.activePlasmid().setSelectionIndices(span, featureID);
    };


    selectAll() {
        const sequenceLength = Session.activePlasmid().sequence.length;
        this.selectBases([1, sequenceLength]);
    };


    deselectBases() {
        this.removeCursors("sequence-cursor-selection");
        this.unhighlightBases("base-selected");

        Session.activePlasmid().clearSelectionIndices();
    };


    _combineSpans(span1, span2 = null) {
        if (span2 === null) span2 = Session.activePlasmid().getSelectionIndices();
        
        span1 = Array.isArray(span1) ? span1: [span1];
        span1 = span1.filter(item => item != null);

        span2 = Array.isArray(span2) ? span2: [span2];
        span2 = span2.filter(item => item != null);

        
        const singleSpan1 = span1.length === 1;
        const singleSpan2 = span2.length === 1;

        if (singleSpan1 && Math.max(...span2) < span1[0]) {
            span1[0] -= 1;
        } else if (singleSpan1 && singleSpan2 && span1[0] < span2[0]) {
            span2[0] -= 1;
        } else if (!singleSpan1 && singleSpan2 && Math.max(...span1) < span2[0]) {
            span2[0] -= 1;
        };

        const allIndices = [...span1, ...span2];
        return [
            Math.min(...allIndices),
            Math.max(...allIndices)
        ];
    };

    // #endregion Selection


    // #region Footer
    /**
     * Update footer selection info with the current selection.
     */
    updateFooterSelectionInfo() {
        const selectionSpan = Session.activePlasmid().getSelectionIndices();

        const selectionLengthSpan = document.getElementById("footer-selection-info-length");
        const selectionRemainder = document.getElementById("footer-selection-info-remainder");
        const selectionRange = document.getElementById("footer-selection-info-range");
        const selectionTm = document.getElementById("footer-selection-info-tm");

        if (!selectionSpan) {
            selectionLengthSpan.innerText = 0;
            selectionRemainder.innerText = "";
            selectionRange.innerText = "";
            selectionTm.innerText = "";
            return;
        };

        if (!selectionSpan[1]) {
            selectionLengthSpan.innerText = 0;
            selectionRemainder.innerText = "";
            selectionRange.innerText = `[${selectionSpan[0]}]`;
            selectionTm.innerText = "";
            return;
        };

        const selectionLength = (selectionSpan[1] + 1) - selectionSpan[0]
        selectionLengthSpan.innerText = selectionLength;

        const remainder = selectionLength % 3;
        const remainderString = (remainder !== 0) ? ` + ${remainder} bp`: ""
        const nrAA = (selectionLength - remainder)/3
        const nrAAString = (selectionLength >= 3) ? `${nrAA} aa`: nrAA
        selectionRemainder.innerText = (selectionLength >= 3) ? "(" + nrAAString + remainderString + ")": "";

        selectionRange.innerText = `[${selectionSpan[0]}, ${selectionSpan[1]}]` 

        selectionTm.innerText = Nucleotides.getMeltingTemperature(Session.activePlasmid().sequence.slice(selectionSpan[0] - 1, selectionSpan[1])).toFixed(2);
    };
    // #endregion Footer
};