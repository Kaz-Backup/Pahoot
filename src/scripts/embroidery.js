const EmbroideryManager = {
    components: {
        layers: {
            blocks: $(".main-window.embroidery > .blocks"),
            canvas: $(".main-window.embroidery > .blocks canvas"),
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
        activeColorsIndex: 1,
        get activeColors() {
            return EmbroideryManager.palette[this.activeColorsIndex];
        },
        mode: "embroider",
        changeStates: [],
        changeStatePointer: -1,
        
        get canUndo() {
            return this.changeStatePointer > -1;
        },
        
        get canRedo() {
            return this.changeStatePointer -1 < this.changeStates.length;
        }
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


        // Setup layers
        const layers = this.components.layers;

        const { clientHeight, clientWidth } = layers.blocks;        
        this.size = { height: clientHeight, width: clientWidth };
        layers.canvas.height = this.size.height;
        layers.canvas.width = this.size.width;
        layers.canvas.style.height = this.size.height;
        layers.canvas.style.width = this.size.width;
        
        this.mouseCtrl = new MouseController(layers.mouse);


        // Initialize buttons
        const buttons = this.components.buttons;
        buttons.zoomOut.onclick = () => this.zoomOut();
        buttons.zoomIn.onclick = () => this.zoomIn();
        buttons.undo.onclick = () => this.undo();
        buttons.redo.onclick = () => this.redo();


        // Setup undo and redo events
        document.addEventListener("keydown", (event) => {
            if (event.ctrlKey || event.metaKey) {
                if (event.key === "z") {
                    event.preventDefault();
                    this.undo();
                } else if (event.key === "Z" && event.shiftKey) {
                    event.preventDefault();
                    this.redo();
                }
            }
        });



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
        cooldownTime: 5,
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
            if(!context.thread) {
                const spanThreshold = this.precisions.spanThreshold;
                if(distance(position, startPosition) > spanThreshold) {
                    const dx = position[0] - startPosition[0];
                    const dy = position[1] - startPosition[1];
                    let orientation;
                    let direction;
                    if(dx >= spanThreshold || dx <= -spanThreshold) {
                        orientation = "h";
                        direction = Math.sign(dx);
                    } else if(dy >= spanThreshold || dy <= -spanThreshold) {
                        orientation = "v";
                        direction = Math.sign(dy);
                    }

                    context.initCell = this.getRelativePosition(startPosition);
                    context.thread = Thread.new({ orientation, direction, colors: this.states.activeColors });
                    
                    this.matrices.embroider.threads.push(context.thread);
                    this.forward("add", context.thread);
                } else return;
            }

            const thread = context.thread;
            let initCell = context.initCell;
            let curCell = this.getRelativePosition(position);

            if(thread.direction === -1) {
                let tmp = initCell;
                initCell = curCell;
                curCell = tmp;
            }

            let relativeSpan;
            if(thread.orientation === "h") {
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

            thread.state.span = relativeSpan;

            this.renderAll();
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

        const { zoom, blockSize, offset, apparentBlockSize } = this.view;
        const [ cols, rows ] = embroiderMatrix.baseSize;
        
        const canvas = this.components.layers.canvas;
        /** @type {CanvasRenderingContext2D} */
        const ctx = canvas.getContext("2d");

        // Clear canvas
        ctx.clearRect(0, 0, this.size.width, this.size.height);

        // Render weaved blocks
        for(let wr = 0; wr < rows; wr++) {
            for(let wc = 0; wc < cols; wc++) {
                const weavedCell = weaved[wr][wc];
                const apparentPos = this.getApparentPosition([wc, wr]);

                await renderWeavedBlock({
                    id: `weaved-${wc}-${wr}`,
                    colors: weavedCell.colors,
                    orientation: weavedCell.orientation,
                    position: apparentPos,
                    size: [ apparentBlockSize, apparentBlockSize ],
                    parent: canvas
                });
            }
        }

        // Render threads


        // Horizontal threads
        
        
        async function renderThreads(orientation) {
            ctx.save();
            ctx.beginPath();
            ctx.clip(getClipPath({
                orientation,
                size: embroiderMatrix.size,
                blockSize: apparentBlockSize,
                offset
            }));
            for(const thread of threads) {
                if(thread.orientation !== orientation) continue;
    
                const span = thread.state.span;
                const relativeSize = subtractVectors(span[1], span[0]);
                const apparentPos = EmbroideryManager.getApparentPosition(span[0]);
                const apparentSize = EmbroideryManager.getApparentSize(relativeSize);
    
                await renderThread({
                    colors: thread.colors,
                    orientation: thread.orientation,
                    position: apparentPos,
                    size: apparentSize,
                    parent: canvas,
                    blockSize: apparentBlockSize
                });
            }
            ctx.restore();
        }
        
        await renderThreads("h");
        await renderThreads("v");
        
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
        // this.log(this.states.changeStatePointer, 1);
        // this.log(this.states.changeStates, 2);
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


        // Fix precision issues
        multiplier = Math.floor(this.view.zoom * multiplier * this.view.blockSize)
            / (this.view.blockSize * this.view.zoom);

        const newZoom = this.view.zoom * multiplier;
        const newOffset = addVectors(this.view.offset,
            scaleVector(addVectors(anchor, this.view.offset), multiplier - 1));
        
        this.view.zoom = newZoom;
        this.view.offset = [ 
            Math.floor(newOffset[0]), 
            Math.floor(newOffset[1])
        ];
        this.renderAll();
    },

    zoomIn() { this.zoom(this.view.zoomMultipler, "in"); },
    zoomOut() { this.zoom(this.view.zoomMultipler, "out"); },

    forward(action, args) {
        let changeState;
        if(action === "add") {
            changeState = new ChangeState({
                action,
                type: "thread",
                subject: args
            });
        }

        const pointer = ++this.states.changeStatePointer;
        this.states.changeStates[pointer] = changeState;

        // Clear others
        this.states.changeStates = 
            this.states.changeStates.slice(0, pointer+1);

        this.refreshStats();
    },

    undo() {
        if(!this.states.canUndo) return;

        /** @type {ChangeState} */
        const changeState = this.states.changeStates[this.states.changeStatePointer];
        if(!changeState) return;

        if(changeState.action === "add" && changeState.type === "thread") {
            const threads = this.matrices.embroider.threads;
            
            // Remove thread
            this.matrices.embroider.threads = threads.filter(
                t => t.id !== changeState.subject.id);
        }

        this.states.changeStatePointer--;
        this.renderAll();
        this.refreshStats();
    },

    redo() {
        if(!this.states.canRedo) return;

        /** @type {ChangeState} */
        const changeState = this.states.changeStates[this.states.changeStatePointer + 1];
        if(!changeState) return;

        if(changeState.action === "add" && changeState.type === "thread") {
            // Add thread
            this.matrices.embroider.threads.push(changeState.subject);
        }

        this.states.changeStatePointer++;
        this.renderAll();
        this.refreshStats();
    }
    
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
    "weaved-lv": `<svg width="30" height="30" viewBox="5 5 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_14_328)"><path d="M25 5L25 25H5L9 28H30L30 7L25 5Z" fill="#232323" fill-opacity="0.1"/><path class="wb-lines-fill" d="M5 5L8 2V5H5Z" fill="#772C42"/><path class="wb-lines-fill" d="M5 25L8 22H28L24.9375 25H5Z" fill="#772C42"/><path class="wb-base" d="M28 2H8V22H28V2Z" fill="#922C4A"/><path class="wb-lines-stroke" d="M8.5 2V22M14.5 2V22M21.5 2V22M27.5 2V22" stroke="#772C42"/><path d="M8 20H28V22H8V20Z" fill="#232323" fill-opacity="0.1"/><path d="M8 2L28 2V4H8V2Z" fill="#9B9B9B" fill-opacity="0.1"/></g><defs><clipPath id="clip0_14_328"><rect width="30" height="30" fill="white"/></clipPath></defs></svg>`,
    "thread-h": `<svg width="30" height="30" viewBox="5 5 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_72_6797)"><path d="M5 25L5 5H25L25 25H5Z" class="wb-base" fill="#922C4A"/><path d="M10.6206 16.1794L11.3898 14.1794L10.4565 13.8204L9.68726 15.8204L10.6206 16.1794Z" class="wb-lines-fill" fill="#772C42"/><path d="M19.6974 16.1794L20.4666 14.1794L19.5333 13.8204L18.764 15.8204L19.6974 16.1794Z" class="wb-lines-fill" fill="#772C42"/><path  d="M5 25H25V24H5V25Z" class="wb-lines-fill" fill="#772C42"/><path d="M5 19H25V18H5V19Z" class="wb-lines-fill" fill="#772C42"/><path d="M25 12L5 12V11L25 11V12Z" class="wb-lines-fill" fill="#772C42"/><path d="M5 6H25V5H5V6Z" class="wb-lines-fill" fill="#772C42"/></g><defs><clipPath id="clip0_72_6797"><rect width="30" height="30" fill="white"/></clipPath></defs></svg>`,
    "thread-v": `<svg width="30" height="30" viewBox="5 5 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_72_6785)"><path d="M5 5L25 5V25H5V5Z" class="wb-base" fill="#922C4A"/><path d="M13.8206 10.6205L15.8206 11.3898L16.1795 10.4564L14.1795 9.68719L13.8206 10.6205Z" class="wb-lines-fill" fill="#772C42"/><path d="M13.8206 19.6974L15.8206 20.4667L16.1795 19.5333L14.1795 18.7641L13.8206 19.6974Z" class="wb-lines-fill" fill="#772C42"/><path d="M5 5V25H6V5H5Z" class="wb-lines-fill" fill="#772C42"/><path d="M11 5V25H12V5H11Z" class="wb-lines-fill" fill="#772C42"/><path d="M18 25V5H19V25H18Z" class="wb-lines-fill" fill="#772C42"/><path d="M24 5V25H25V5H24Z" class="wb-lines-fill" fill="#772C42"/></g><defs><clipPath id="clip0_72_6785"><rect width="30" height="30" fill="white"/></clipPath></defs></svg>`,
};

const BlockImages = {};


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

function getBlockImage({ block, colors }) {
    return new Promise(resolve => {
        const key = `${block}--${colors.fill}.${colors.stroke}`;
        if(key in BlockImages) return resolve(BlockImages[key]);

        // Create SVG DOM
        const tempParent = document.createElement("div");
        tempParent.innerHTML = BlockSprites[block];

        /** @type {HTMLOrSVGElement} */
        const svgElement = tempParent.querySelector("svg").cloneNode(true);

        [...svgElement.querySelectorAll(".wb-base")].forEach(e => e.style.fill = colors.fill);
        [...svgElement.querySelectorAll(".wb-side, .wb-lines-fill")].forEach(e => e.style.fill = colors.stroke);
        [...svgElement.querySelectorAll(".wb-lines-stroke")].forEach(e => e.style.stroke = colors.stroke);

        const xml = new XMLSerializer().serializeToString(svgElement);
        const blockImage = new Image();
        blockImage.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
        blockImage.onload = function() {
            BlockImages[key] = blockImage;
            resolve(blockImage);
        };
    });
}


// /**
//  * 
//  * @param {{ id, colors: BlockColors, block: BlockSpriteType, position: number[],
//  *      size: number[], parent: HTMLDivElement}} options 
//  */
// function renderWeavedBlock(options) {
//     const { id, colors, orientation, position, size, parent } = options;
    
//     const elementId = `rendered-block-${id}`;
//     let blockElement = id ? parent.querySelector(`#${elementId}`) : null;
//     if(!blockElement) {
//         blockElement = createElement("div", {
//             id: elementId,
//             classList: [ "rendered-block" ],
//             children: [ getBlockSVG({ block: `weaved-${orientation}`, colors, size }) ]
//         });

//         parent.append(blockElement);
//     }

//     const svgElement = blockElement.querySelector("svg");
//     svgElement.setAttribute("width", size[0]);
//     svgElement.setAttribute("height", size[1]);

//     transformElement(blockElement, position, size);
// }

/**
 * 
 * @param {{ id, colors: BlockColors, block: BlockSpriteType, position: number[],
*      size: number[], parent: HTMLCanvasElement}} options 
*/
async function renderWeavedBlock(options) {
    const { colors, orientation, position, size, parent } = options;

    const ctx = parent.getContext("2d");
    const blockImage = await getBlockImage({ 
        block: `weaved-${orientation}`,
        colors
    });

    ctx.drawImage(blockImage, position[0], position[1], size[0], size[1]);
}

/**
 * 
 * @param {{ id, colors: BlockColors, orientation: BlockOrientation, position: number[],
 *      width: number, length: number, parent: HTMLDivElement}} options 
 */
// function renderThread(options) {
//     const { id, colors, orientation, position, blockSize, size, parent } = options;
    
//     const elementId = `rendered-block-${id}`;
//     let blockElement = id ? parent.querySelector(`#${elementId}`) : null;
//     if(!blockElement) {
//         blockElement = createElement("div", {
//             id: elementId,
//             classList: [ "rendered-block" ],
//             fields: { style: `background-color: red` },
//             children: [ 
//                 // getBlockSVG({ block, colors, size }) 
//             ]
//         });

//         parent.append(blockElement);
//     }

//     // const svgElement = blockElement.querySelector("svg");
//     // svgElement.setAttribute("width", size[0]);
//     // svgElement.setAttribute("height", size[1]);

//     transformElement(blockElement, position, size);
// }


/**
 * 
 * @param {{ id, colors: BlockColors, orientation: BlockOrientation, position: number[],
 *      width: number, length: number, parent: HTMLDivElement}} options 
 */
async function renderThread(options) {
    const { id, colors, orientation, position, blockSize, size, parent } = options;

    const ctx = parent.getContext("2d");

    const blockImage = await getBlockImage({ 
        block: `thread-${orientation}`, colors
    });

    ctx.save();
    ctx.beginPath();
    ctx.rect(position[0], position[1], size[0], size[1]);
    ctx.clip();
    
    if(orientation === "h") {
        const blocksCount = Math.ceil(size[0] / blockSize);
        for(let c = 0; c < blocksCount; c++) {
            const x = Math.floor(position[0] + (c*blockSize));
            ctx.drawImage(blockImage, x, position[1], blockSize, blockSize);
        }
    } else {
        const blocksCount = Math.ceil(size[1] / blockSize);
        for(let r = 0; r < blocksCount; r++) {
            const y = Math.floor(position[1] + (r*blockSize));
            ctx.drawImage(blockImage, position[0], y, blockSize, blockSize);
        }
    }

    ctx.restore();

    // ctx.restore();
    // const elementId = `rendered-block-${id}`;
    // let blockElement = id ? parent.querySelector(`#${elementId}`) : null;
    // if(!blockElement) {
    //     blockElement = createElement("div", {
    //         id: elementId,
    //         classList: [ "rendered-block" ],
    //         fields: { style: `background-color: red` },
    //         children: [ 
    //             // getBlockSVG({ block, colors, size }) 
    //         ]
    //     });

    //     parent.append(blockElement);
    // }

    // // const svgElement = blockElement.querySelector("svg");
    // // svgElement.setAttribute("width", size[0]);
    // // svgElement.setAttribute("height", size[1]);

    // transformElement(blockElement, position, size);
}


function getClipPath({ orientation, size, blockSize, offset }) {
    const clipPath = new Path2D();
    for(let r = 0; r < size[1]; r++) {
        for(let c = 0; c < size[0]; c++) {
            if(getBlockOrientation(c, r) !== orientation) continue;
            
            const x = Math.round((c * blockSize) - offset[0]);
            const y = Math.round((r * blockSize) - offset[1]);
            clipPath.rect(x, y, Math.round(blockSize), Math.round(blockSize));
        }
    }

    return clipPath;
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