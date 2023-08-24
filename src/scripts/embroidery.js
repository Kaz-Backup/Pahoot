const EmbroideryManager = {
    components: {
        layers: {
            blocks: $(".main-window.embroidery > .blocks"),
            lifted: $(".main-window.embroidery > .lifted"),
            design: $(".main-window.embroidery > .design"),
            overlay: $(".main-window.embroidery > .overlay"),
            mouse: $(".main-window.embroidery > .mouse"),
            actions: $(".main-window.embroidery > .actions"),
        },
        buttons: {
            zoomOut: $(".main-window.embroidery > .actions #zoomout-btn"),
            zoomIn: $(".main-window.embroidery > .actions #zoomin-btn"),
            undo: $(".main-window.embroidery > .actions #undo-btn"),
            redo: $(".main-window.embroidery > .actions #redo-btn"),
            colors: $(".main-window.embroidery > .actions #colors-btn"),
        },
    },

    view: {
        offset: [ 0, 0 ],
        zoom: 1,
        blockSize: 30,
        zoomMultipler: 1.2,
        maxZoom: 3,
        minZoom: 0.5,
        get apparentBlockSize() {
            return this.blockSize * this.zoom;
        }
    },

    size: {
        height: 0,
        width: 0
    },

    mouseCtrl: new MouseController(),    

    /** 
     * @type {{ embroider: EmbroiderMatrix, design: DesignMatrix }}
     */
    matrices: {
        embroider: null,
        design: null
    },

    palette: [
        { fill: "#393939", stroke: "#2E2E2E" },
        { fill: "#922C4A", stroke: "#772C42" },
        { fill: "#DCC740", stroke: "#C2AF36" },
        { fill: "#364198", stroke: "#293484" },
    ],

    states: {
        activeColorsIndex: 0,
        get activeColors() {
            return EmbroideryManager.palette[this.activeColorsIndex];
        },
        mode: "embroider",
        z: 1
    },

    precisions: {
        maxThreadLength: 10,
        spanThreshold: 20
    },

    /**
     * @param {{ embroiderMatrix: EmbroiderMatrix, designMatrix: DesignMatrix }} options 
     */
    async initialize(options) {
        this.matrices.embroider = options.embroiderMatrix;
        this.matrices.design = options.designMatrix;

        this.mouseCtrl = new MouseController(this.components.layers.mouse);

        const { clientHeight, clientWidth } = this.components.layers.blocks;        
        this.size = { height: clientHeight, width: clientWidth };
        

        // Reset layers
        const layers = this.components.layers;
        layers.blocks.innerHTML = "";

        // Initialize buttons
        const buttons = this.components.buttons;
        buttons.zoomOut.onclick = () => this.zoomOut();
        buttons.zoomIn.onclick = () => this.zoomIn();


        // Initialize mouse controller
        this.mouseCtrl = new MouseController(layers.mouse);
        this.mouseCtrl.setListener("hover", ({ position }) => 
            this.log(`(${position.join(",")}) | (${
                this.getRelativePosition(position).map(n => Math.floor(n)).join(",")
            })`));
        
        this.mouseCtrl.setListener("scroll", ({ direction, position }) =>
            this.zoom(1.1, direction === 1 ? "in" : "out", position ));
        
        this.mouseCtrl.setListener("span", event => this.span(event));
    },

    renderStates: {
        cooldown: false,
        cooldownTime: 10,
        pending: false
    },

    span({ position, startPosition, context }) {
        if(!context.mode) context.mode = this.states.mode;

        if(context.mode === "move") {
            if(!context.initOffset) context.initOffset = [...this.view.offset];
            const mx = position[0] - startPosition[0];
            const my = position[1] - startPosition[1];
            this.view.offset = [
                context.initOffset[0] - mx,
                context.initOffset[1] - my,
            ];
            this.renderAll();
        } else if(context.mode === "embroider") {
            if(!context.orientation) {
                const spanThreshold = this.precisions.spanThreshold;
                if(distance(position, startPosition) > spanThreshold) {
                    const dx = position[0] - startPosition[0];
                    const dy = position[1] - startPosition[1];
                    if(dx >= spanThreshold || dx <= -spanThreshold) context.orientation = "h";
                    else if(dy >= spanThreshold || dy <= -spanThreshold) context.orientation = "v";
                    context.initCell = this.getRelativePosition(startPosition);
                } else return;
            }

            const initCell = context.initCell;
            const curCell = this.getRelativePosition(position);
            let relativeSpan;
            if(context.orientation === "h") {
                relativeSpan = [
                    [ initCell[0], Math.floor(initCell[1]) ],
                    [ curCell[0], Math.floor(initCell[1]) + 1 ]
                ];
            } else {
                relativeSpan = [
                    [ Math.floor(initCell[0]), initCell[1] ],
                    [ Math.floor(initCell[0]) + 1, curCell[1] ]
                ];
            }

            const relativeSize = subtractVectors(relativeSpan[1], relativeSpan[0]);
            const apparentPos = this.getApparentPosition(relativeSpan[0]);
            const apparentSize = this.getApparentSize(relativeSize);

            renderThread({
                id: `temp-thread`,
                colors: this.states.activeColors,
                orientation: context.orientation,
                position: apparentPos,
                size: apparentSize,
                parent: this.components.layers.blocks
            });
            
        }
    },

    getRelativePosition(position) {
        const offsetPosition = addVectors(position, this.view.offset); 
        const apparentBlockSize = this.view.apparentBlockSize;
        return scaleVector(offsetPosition, 1/apparentBlockSize);
    },

    getApparentPosition(position) {
        const apparentBlockSize = this.view.apparentBlockSize;
        return subtractVectors(scaleVector(position, apparentBlockSize), this.view.offset);
    },

    getApparentSize(size) {
        return scaleVector(size, this.view.apparentBlockSize);
    },

    async renderAll() {
        if(this.renderStates.cooldown) {
            this.renderStates.pending = true;
            return;
        }

        this.renderStates.cooldown = true;
        const embroiderMatrix = this.matrices.embroider;
        const weaved = embroiderMatrix.weaved;
        const threads = embroiderMatrix.threads;

        const { zoom, blockSize } = this.view;
        const [ cols, rows ] = embroiderMatrix.baseSize;

        const apparentBlockSize = blockSize * zoom;

        const blocksLayer = this.components.layers.blocks;

        // Render weaved blocks
        for(let wr = 0; wr < rows; wr++) {
            for(let wc = 0; wc < cols; wc++) {
                const weavedCell = weaved[wr][wc];

                const apparentPos = this.getApparentPosition([wc, wr]);

                renderWeavedBlock({
                    id: `weaved-${wc}-${wr}`,
                    colors: weavedCell.colors,
                    orientation: weavedCell.orientation,
                    position: apparentPos,
                    size: [ Math.ceil(apparentBlockSize), Math.ceil(apparentBlockSize) ],
                    parent: blocksLayer
                });
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, this.renderStates.cooldownTime));
        this.renderStates.cooldown = false;
        if(this.renderStates.pending) {
            this.renderStates.pending = false;
            this.renderAll();
        }
    },


    logLines: [],
    log(prompt, row = 0) {
        if(typeof(prompt) === "object" || Array.isArray(prompt)) prompt = JSON.stringify(prompt);
        this.logLines[row] = prompt;
        $(".main-window.embroidery .logs").innerHTML = this.logLines.map(r => r + "").join("<br>");
    },

    refreshStats() {

    },

    
    /**
     * 
     * @param {number} multiplier 
     * @param {"in" | "out"} direction 
     */
    zoom(multiplier, direction, anchor) {    
        if(!anchor) anchor = [ this.size.width/2, this.size.height/2 ];
        if(direction === "out") multiplier = 1 / multiplier;

        const tempZoom = this.view.zoom * multiplier;
        if(tempZoom > this.view.maxZoom) {
            multiplier = this.view.maxZoom / this.view.zoom;
        } else if(tempZoom < this.view.minZoom) {
            multiplier = this.view.minZoom / this.view.zoom;
        }

        const newZoom = this.view.zoom * multiplier;
        
        const newOffset = addVectors(this.view.offset,
            scaleVector(addVectors(anchor, this.view.offset), multiplier - 1));
        
        this.view.zoom = newZoom;
        this.view.offset = newOffset;
        this.renderAll();
    },

    zoomIn() { this.zoom(this.view.zoomMultipler, "in"); },
    zoomOut() { this.zoom(this.view.zoomMultipler, "out"); },

    
};


/** RENDERING */
/**
 * @typedef { "weaved-h" | "weaved-v" | "weaved-lh" | "weaved-lv" |
 *      "weaved-gh" | "weaved-gv" | "thread-h" | "thread-v" } BlockSpriteType 
 */

const BlockSprites = {
    "weaved-h": `<svg width="30" height="30" viewBox="5 5 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_15_357)"><path class="wb-base" d="M5 25L5 5H25L25 25H5Z" fill="#922C4A"/><path class="wb-lines-fill" d="M5 25H25V24H5V25Z" fill="#772C42"/><path class="wb-lines-fill" d="M5 19H25V18H5V19Z" fill="#772C42"/><path class="wb-lines-fill" d="M25 12L5 12V11L25 11V12Z" fill="#772C42"/><path class="wb-lines-fill" d="M5 6H25V5H5V6Z" fill="#772C42"/></g><defs><clipPath id="clip0_15_357"><rect width="30" height="30" fill="white"/></clipPath></defs></svg>`,
    "weaved-v": `<svg width="30" height="30" viewBox="5 5 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_14_288)"><path class="wb-base" d="M5 5L25 5V25H5V5Z" fill="#922C4A"/><path class="wb-lines-fill" d="M5 5V25H6V5H5Z" fill="#772C42"/><path class="wb-lines-fill" d="M11 5V25H12V5H11Z" fill="#772C42"/><path class="wb-lines-fill" d="M18 25V5H19V25H18Z" fill="#772C42"/><path class="wb-lines-fill" d="M24 5V25H25V5H24Z" fill="#772C42"/></g><defs><clipPath id="clip0_14_288"><rect width="30" height="30" fill="white"/></clipPath></defs></svg>`,
    "weaved-lh": `<svg width="30" height="30" viewBox="5 5 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_14_310)"><g clip-path="url(#clip1_14_310)"><path d="M5 25L5 5L15 3L25 3L30 7L30 28L7 28L5 25Z" fill="#232323" fill-opacity="0.1"/><path class="wb-base" d="M5 5L8.5 2H28V22H8.5L5 24.7812V5Z" fill="#922C4A"/><path class="wb-lines-stroke" d="M28 2.5H8.5M8.5 2.5V8.5M8.5 2.5L4.5 6M8.5 8.5L4.5 12M8.5 8.5H28M8.5 8.5V15.5M8.5 15.5L4.5 19M8.5 15.5H28M8.5 15.5V21.5M8.5 21.5L4 25M8.5 21.5H28" stroke="#772C42"/><path class="wb-side" d="M28 22H25V25L28 22Z" fill="#772C42"/><path d="M26 22L26 2H28V22H26Z" fill="#232323" fill-opacity="0.1"/><path d="M9 22L9 2H11L11 22H9Z" fill="#9B9B9B" fill-opacity="0.1"/></g></g><defs><clipPath id="clip0_14_310"><rect width="30" height="30" fill="white"/></clipPath><clipPath id="clip1_14_310"><rect width="25" height="26" fill="white" transform="translate(5 2)"/></clipPath></defs></svg>`,
    "weaved-lv": `<svg width="30" height="30" viewBox="5 5 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_14_328)"><path d="M25 5L25 25H5L9 28H30L30 7L25 5Z" fill="#232323" fill-opacity="0.1"/><path class="wb-lines-fill" d="M5 5L8 2V5H5Z" fill="#772C42"/><path class="wb-lines-fill" d="M5 25L8 22H28L24.9375 25H5Z" fill="#772C42"/><path class="wb-base" d="M28 2H8V22H28V2Z" fill="#922C4A"/><path class="wb-lines-stroke" d="M8.5 2V22M14.5 2V22M21.5 2V22M27.5 2V22" stroke="#772C42"/><path d="M8 20H28V22H8V20Z" fill="#232323" fill-opacity="0.1"/><path d="M8 2L28 2V4H8V2Z" fill="#9B9B9B" fill-opacity="0.1"/></g><defs><clipPath id="clip0_14_328"><rect width="30" height="30" fill="white"/></clipPath></defs></svg>`
};


function getBlockSVG({ block, colors, size }) {
    const tempParent = document.createElement("div");
    tempParent.innerHTML = BlockSprites[block];

    /** @type {HTMLOrSVGElement} */
    const svgElement = tempParent.querySelector("svg");

    [...svgElement.querySelectorAll(".wb-base")].forEach(e => e.style.fill = colors.fill);
    [...svgElement.querySelectorAll(".wb-side, .wb-lines-fill")].forEach(e => e.style.fill = colors.stroke);
    [...svgElement.querySelectorAll(".wb-lines-stroke")].forEach(e => e.style.stroke = colors.stroke);

    return svgElement.cloneNode(true);
}


/**
 * 
 * @param {{ id, colors: BlockColors, block: BlockSpriteType, position: number[],
 *      size: number[], parent: HTMLDivElement}} options 
 */
function renderWeavedBlock(options) {
    const { id, colors, orientation, position, size, parent } = options;
    
    const elementId = `rendered-block-${id}`;
    let blockElement = id ? parent.querySelector(`#${elementId}`) : null;
    if(!blockElement) {
        blockElement = createElement("div", {
            id: elementId,
            classList: [ "rendered-block" ],
            children: [ getBlockSVG({ block: `weaved-${orientation}`, colors, size }) ]
        });

        parent.append(blockElement);
    }

    const svgElement = blockElement.querySelector("svg");
    svgElement.setAttribute("width", size[0]);
    svgElement.setAttribute("height", size[1]);

    transformElement(blockElement, position, size);
}

/**
 * 
 * @param {{ id, colors: BlockColors, orientation: BlockOrientation, position: number[],
 *      width: number, length: number, parent: HTMLDivElement}} options 
 */
function renderThread(options) {
    const { id, colors, orientation, position, blockSize, size, parent } = options;
    
    const elementId = `rendered-block-${id}`;
    let blockElement = id ? parent.querySelector(`#${elementId}`) : null;
    if(!blockElement) {
        blockElement = createElement("div", {
            id: elementId,
            classList: [ "rendered-block" ],
            fields: { style: `background-color: red` },
            children: [ 
                // getBlockSVG({ block, colors, size }) 
            ]
        });

        parent.append(blockElement);
    }

    // const svgElement = blockElement.querySelector("svg");
    // svgElement.setAttribute("width", size[0]);
    // svgElement.setAttribute("height", size[1]);

    transformElement(blockElement, position, size);
}

function transformElement(element, position, size) {
    if(size) {
        element.style.width = `${size[0]}px`;
        element.style.height = `${size[1]}px`;
    }

    if(position) {
        element.style.left = `${position[0]}px`;
        element.style.top = `${position[1]}px`;
    }
}


async function test() {
    // await EmbroideryManager.initialize({});
    // const blocksLayer = EmbroideryManager.components.layers.blocks;
    // const blockSize = 100;
    // renderWeavedBlock({
    //     id: "block-1",
    //     colors: {
    //         fill: "#B8A976",
    //         stroke: "#A39567"
    //     },
    //     block: "weaved-h",
    //     position: [ 300, 300 ],
    //     size: [ blockSize, blockSize ],
    //     parent: blocksLayer
    // });

    const embroiderMatrix = EmbroiderMatrix.newBlank();
    await EmbroideryManager.initialize({
        embroiderMatrix
    });
    await EmbroideryManager.renderAll();
    // renderThread({
    //     id: `sample-thread`,
    //     orientation: "h",
    //     position: [ 90, 90 ],
    //     size: [ 30, 100 ],
    //     parent: EmbroideryManager.components.layers.blocks
    // })
}

test();