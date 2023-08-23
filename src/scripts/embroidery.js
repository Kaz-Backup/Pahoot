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

        },
    },

    view: {
        offset: [ 0, 0 ],
        zoom: 1,
        blockSize: 30
    },

    mouseCtrl: new MouseController(),    

    matrices: {
        embroider: null,
        design: null
    },

    /**
     * @param {{ embroiderMatrix: EmbroiderMatrix, designMatrix: DesignMatrix }} options 
     */
    async initialize(options) {
        this.matrices.embroider = options.embroiderMatrix;
        this.matrices.design = options.designMatrix;

        this.mouseCtrl = new MouseController(this.components.layers.mouse);


    }

    
};


/** RENDERING */
/**
 * @typedef { "weaved-h" | "weaved-v" | "weaved-lh" | "weaved-lv" |
 *      "weaved-gh" | "weaved-gv" | "thread-h" | "thread-v" } BlockSpriteType 
 */

const BlockSprites = {
    "weaved-h": `<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_15_357)"><path class="wb-base" d="M5 25L5 5H25L25 25H5Z" fill="#922C4A"/><path class="wb-lines-fill" d="M5 25H25V24H5V25Z" fill="#772C42"/><path class="wb-lines-fill" d="M5 19H25V18H5V19Z" fill="#772C42"/><path class="wb-lines-fill" d="M25 12L5 12V11L25 11V12Z" fill="#772C42"/><path class="wb-lines-fill" d="M5 6H25V5H5V6Z" fill="#772C42"/></g><defs><clipPath id="clip0_15_357"><rect width="30" height="30" fill="white"/></clipPath></defs></svg>`,
    "weaved-v": `<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_14_288)"><path class="wb-base" d="M5 5L25 5V25H5V5Z" fill="#922C4A"/><path class="wb-lines-fill" d="M5 5V25H6V5H5Z" fill="#772C42"/><path class="wb-lines-fill" d="M11 5V25H12V5H11Z" fill="#772C42"/><path class="wb-lines-fill" d="M18 25V5H19V25H18Z" fill="#772C42"/><path class="wb-lines-fill" d="M24 5V25H25V5H24Z" fill="#772C42"/></g><defs><clipPath id="clip0_14_288"><rect width="30" height="30" fill="white"/></clipPath></defs></svg>`,
    "weaved-lh": `<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_14_310)"><g clip-path="url(#clip1_14_310)"><path d="M5 25L5 5L15 3L25 3L30 7L30 28L7 28L5 25Z" fill="#232323" fill-opacity="0.1"/><path class="wb-base" d="M5 5L8.5 2H28V22H8.5L5 24.7812V5Z" fill="#922C4A"/><path class="wb-lines-stroke" d="M28 2.5H8.5M8.5 2.5V8.5M8.5 2.5L4.5 6M8.5 8.5L4.5 12M8.5 8.5H28M8.5 8.5V15.5M8.5 15.5L4.5 19M8.5 15.5H28M8.5 15.5V21.5M8.5 21.5L4 25M8.5 21.5H28" stroke="#772C42"/><path class="wb-side" d="M28 22H25V25L28 22Z" fill="#772C42"/><path d="M26 22L26 2H28V22H26Z" fill="#232323" fill-opacity="0.1"/><path d="M9 22L9 2H11L11 22H9Z" fill="#9B9B9B" fill-opacity="0.1"/></g></g><defs><clipPath id="clip0_14_310"><rect width="30" height="30" fill="white"/></clipPath><clipPath id="clip1_14_310"><rect width="25" height="26" fill="white" transform="translate(5 2)"/></clipPath></defs></svg>`,
    "weaved-lv": `<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_14_328)"><path d="M25 5L25 25H5L9 28H30L30 7L25 5Z" fill="#232323" fill-opacity="0.1"/><path class="wb-lines-fill" d="M5 5L8 2V5H5Z" fill="#772C42"/><path class="wb-lines-fill" d="M5 25L8 22H28L24.9375 25H5Z" fill="#772C42"/><path class="wb-base" d="M28 2H8V22H28V2Z" fill="#922C4A"/><path class="wb-lines-stroke" d="M8.5 2V22M14.5 2V22M21.5 2V22M27.5 2V22" stroke="#772C42"/><path d="M8 20H28V22H8V20Z" fill="#232323" fill-opacity="0.1"/><path d="M8 2L28 2V4H8V2Z" fill="#9B9B9B" fill-opacity="0.1"/></g><defs><clipPath id="clip0_14_328"><rect width="30" height="30" fill="white"/></clipPath></defs></svg>`
};


function getBlockSVG({ block, colors, size }) {
    const tempParent = document.createElement("div");
    tempParent.innerHTML = BlockSprites[block];

    /** @type {HTMLOrSVGElement} */
    const svgElement = tempParent.querySelector("svg");

    const [ width, height ] = size;
    svgElement.setAttribute("height", height);
    svgElement.setAttribute("width", width);

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
    const { id, colors, block, position, size, parent } = options;
    
    const elementId = `rendered-block-${id}`;
    
    let blockElement = id ? parent.querySelector(`#${elementId}`) : null;
    if(!blockElement) {
        blockElement = document.createElement("div");
        blockElement.id = elementId;
        blockElement.classList.add("rendered-block");
        blockElement.append(getBlockSVG({ block, colors, size }));
        
        parent.append(blockElement);
    }

    const [ width, height ] = size;
    const [ px, py ] = position;
    
    blockElement.style.height = `${height}px`;
    blockElement.style.width = `${width}px`;

    blockElement.style.top = `${px}px`;
    blockElement.style.left = `${py}px`;
}

async function test() {
    await EmbroideryManager.initialize({});
    const blocksLayer = EmbroideryManager.components.layers.blocks;
    const blockSize = 100;
    renderWeavedBlock({
        id: "block-1",
        colors: {
            fill: "#B8A976",
            stroke: "#A39567"
        },
        block: "weaved-h",
        position: [ 300, 300 ],
        size: [ blockSize, blockSize ],
        parent: blocksLayer
    });
}

test();