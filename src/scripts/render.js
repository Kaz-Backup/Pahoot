/**
 * @typedef { "weaved-h" | "weaved-v" | "weaved-lh" | "weaved-lv" |
*      "weaved-gh" | "weaved-gv" | "thread-h" | "thread-v" } BlockSpriteType 
*/

const BlockSprites = {
   "weaved-h": `<svg width="30" height="30" viewBox="5 5 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_15_357)"><path class="wb-base" d="M5 25L5 5H25L25 25H5Z" fill="#922C4A"/><path class="wb-lines-fill" d="M5 25H25V24H5V25Z" fill="#772C42"/><path class="wb-lines-fill" d="M5 19H25V18H5V19Z" fill="#772C42"/><path class="wb-lines-fill" d="M25 12L5 12V11L25 11V12Z" fill="#772C42"/><path class="wb-lines-fill" d="M5 6H25V5H5V6Z" fill="#772C42"/></g><defs><clipPath id="clip0_15_357"><rect width="30" height="30" fill="white"/></clipPath></defs></svg>`,
   "weaved-v": `<svg width="30" height="30" viewBox="5 5 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_14_288)"><path class="wb-base" d="M5 5L25 5V25H5V5Z" fill="#922C4A"/><path class="wb-lines-fill" d="M5 5V25H6V5H5Z" fill="#772C42"/><path class="wb-lines-fill" d="M11 5V25H12V5H11Z" fill="#772C42"/><path class="wb-lines-fill" d="M18 25V5H19V25H18Z" fill="#772C42"/><path class="wb-lines-fill" d="M24 5V25H25V5H24Z" fill="#772C42"/></g><defs><clipPath id="clip0_14_288"><rect width="30" height="30" fill="white"/></clipPath></defs></svg>`,
   "thread-h": `<svg width="30" height="30" viewBox="5 5 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_72_6797)"><path d="M5 25L5 5H25L25 25H5Z" class="wb-base" fill="#922C4A"/><path d="M10.6206 16.1794L11.3898 14.1794L10.4565 13.8204L9.68726 15.8204L10.6206 16.1794Z" class="wb-lines-fill" fill="#772C42"/><path d="M19.6974 16.1794L20.4666 14.1794L19.5333 13.8204L18.764 15.8204L19.6974 16.1794Z" class="wb-lines-fill" fill="#772C42"/><path  d="M5 25H25V24H5V25Z" class="wb-lines-fill" fill="#772C42"/><path d="M5 19H25V18H5V19Z" class="wb-lines-fill" fill="#772C42"/><path d="M25 12L5 12V11L25 11V12Z" class="wb-lines-fill" fill="#772C42"/><path d="M5 6H25V5H5V6Z" class="wb-lines-fill" fill="#772C42"/></g><defs><clipPath id="clip0_72_6797"><rect width="30" height="30" fill="white"/></clipPath></defs></svg>`,
   "thread-v": `<svg width="30" height="30" viewBox="5 5 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_72_6785)"><path d="M5 5L25 5V25H5V5Z" class="wb-base" fill="#922C4A"/><path d="M13.8206 10.6205L15.8206 11.3898L16.1795 10.4564L14.1795 9.68719L13.8206 10.6205Z" class="wb-lines-fill" fill="#772C42"/><path d="M13.8206 19.6974L15.8206 20.4667L16.1795 19.5333L14.1795 18.7641L13.8206 19.6974Z" class="wb-lines-fill" fill="#772C42"/><path d="M5 5V25H6V5H5Z" class="wb-lines-fill" fill="#772C42"/><path d="M11 5V25H12V5H11Z" class="wb-lines-fill" fill="#772C42"/><path d="M18 25V5H19V25H18Z" class="wb-lines-fill" fill="#772C42"/><path d="M24 5V25H25V5H24Z" class="wb-lines-fill" fill="#772C42"/></g><defs><clipPath id="clip0_72_6785"><rect width="30" height="30" fill="white"/></clipPath></defs></svg>`,
   "thread-gv": `<svg width="30" height="30" viewBox="5 5 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_14_300)"><path d="M5 23H25V25H5V23Z" fill="#4D4D4D" fill-opacity="0.03"/><path d="M5 5L25 5V7H5V5Z" fill="#9B9B9B" fill-opacity="0.03"/></g><defs><clipPath id="clip0_14_300"><rect width="30" height="30" fill="white"/></clipPath></defs></svg>`,
   "thread-gh": `<svg width="30" height="30" viewBox="5 5 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_14_308)"><path d="M23 25L23 5H25V25H23Z" fill="#4D4D4D" fill-opacity="0.03"/><path d="M5 25L5 5H7L7 25H5Z" fill="#9B9B9B" fill-opacity="0.03"/></g><defs><clipPath id="clip0_14_308"><rect width="30" height="30" fill="white"/></clipPath></defs></svg>`,
};

const BlockImages = {};
const CachedImages = {};


function getBlockSVG({ block, colors, blockSize }) {
   const tempParent = document.createElement("div");
   tempParent.innerHTML = BlockSprites[block];

   /** @type {HTMLOrSVGElement} */
   const svgElement = tempParent.querySelector("svg");

   [...svgElement.querySelectorAll(".wb-base")].forEach(e => e.style.fill = colors.fill);
   [...svgElement.querySelectorAll(".wb-side, .wb-lines-fill")].forEach(e => e.style.fill = colors.stroke);
   [...svgElement.querySelectorAll(".wb-lines-stroke")].forEach(e => e.style.stroke = colors.stroke);

   if(blockSize) {
       svgElement.setAttribute("height", blockSize);
       svgElement.setAttribute("width", blockSize);
   }

   return svgElement.cloneNode(true);
}

function getImageFromSVG(svgElement) {
    return new Promise((resolve, reject) => {
        const xml = new XMLSerializer().serializeToString(svgElement);
        const image = new Image();
        image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
        image.onload = function() {
            resolve(image);
        };
        image.onerror = function(event) {
            reject("Unable to parse image.");
        }
    });
}

async function getBlockImage({ block, colors }) {
    const key = `${block}--${colors.fill}.${colors.stroke}`;
    if(key in BlockImages) return BlockImages[key];

    // Create SVG DOM
    const svgElement = getBlockSVG({ block, colors });
    const blockImage = await getImageFromSVG(svgElement);
    BlockImages[key] = blockImage;
    return blockImage;
}

async function preloadBlockImages(blocks) {
   for(const { block, colors } of blocks) await getBlockImage({ block, colors });
}

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
           ctx.drawImage(blockImage, x, Math.floor(position[1]), Math.ceil(blockSize+1), Math.ceil(blockSize+1));
       }
   } else {
       const blocksCount = Math.ceil(size[1] / blockSize);
       for(let r = 0; r < blocksCount; r++) {
           const y = Math.floor(position[1] + (r*blockSize));
           ctx.drawImage(blockImage, Math.floor(position[0]), y, Math.ceil(blockSize+1), Math.ceil(blockSize+1));
       }
   }

   ctx.restore();
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

/**
* 
* @param {{ id, block: BlockSpriteType, position: number[],
*      size: number[], parent: HTMLCanvasElement}} options 
*/
async function renderGrooveBlock(options) {
    const { orientation, position, size, parent } = options;

    const ctx = parent.getContext("2d");
    const blockImage = await getBlockImage({ 
        block: `thread-g${orientation}`,
        colors: {}
    });

    ctx.drawImage(blockImage, position[0], position[1], size[0], size[1]);
}


async function getImageFromPath(path, baseSize, style) {
    const { fill, stroke, strokeWidth } = style || {};
    const key = JSON.stringify([ path, fill, stroke, strokeWidth ]);
    if(key in CachedImages) return CachedImages[key];


    const tempParent = document.createElement("div");
    tempParent.innerHTML = `
    <svg width="100" height="100" viewBox="0 0 ${baseSize.join(" ")}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="${path}" fill="${fill || "none"}" stroke-width="${strokeWidth || 1}" stroke="${stroke || "none"}"/>
    </svg>`;

    const svgElement = tempParent.querySelector("svg");
    const image = await getImageFromSVG(svgElement);
    CachedImages[key] = image;
    return image;
}


async function renderEmbroiderMatrix(canvas, embroiderMatrix, viewSettings) {
    const { offset, apparentBlockSize, clipPath, clipOffset } = viewSettings;

    function getApparentPosition(position) {
        return subtractVectors(scaleVector(position, apparentBlockSize), offset);
    }

    function getApparentSize(size) {
        return scaleVector(size, apparentBlockSize);
    }

    const [ cols, rows ] = embroiderMatrix.baseSize;
    const ctx = canvas.getContext("2d");
    const threads = embroiderMatrix.threads;

    function clipFrame() {
        ctx.translate(...clipOffset);
        ctx.clip(clipPath);
    }

    if(clipPath) {
        ctx.save();
        clipFrame();
    }
    
    // Render weaved blocks
    for(let wr = 0; wr < rows; wr++) {
        for(let wc = 0; wc < cols; wc++) {
            const apparentPos = getApparentPosition([wc, wr]);
            await renderWeavedBlock({
                id: `weaved-${wc}-${wr}`,
                colors: embroiderMatrix.weavedColors,
                orientation: getBlockOrientation(wc, wr),
                position: apparentPos,
                size: [ apparentBlockSize, apparentBlockSize ],
                parent: canvas
            });
        }
    }

    if(clipPath) ctx.restore();

    async function renderThreads(orientation) {
        ctx.save();
        ctx.beginPath();
        if(clipPath) clipFrame();
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
            const apparentPos = getApparentPosition(span[0]);
            const apparentSize = getApparentSize(relativeSize);

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
    

    if(clipPath) {
        ctx.save();
        clipFrame();
    }

    // Render grooves
    for(let r = 0; r < rows; r++) {
        for(let c = 0; c < cols; c++) {
            const apparentPos = getApparentPosition([c, r]);

            await renderGrooveBlock({
                orientation: getBlockOrientation(c, r),
                position: apparentPos,
                size: [ apparentBlockSize, apparentBlockSize ],
                parent: canvas
            });
        }
    }

    if(clipPath) ctx.restore();
}

async function renderProduct(canvas, product, options) {
    let { qualityScale } = options || {};

    if(!qualityScale) qualityScale = 3;

    canvas.height *= qualityScale;
    canvas.width *= qualityScale;

    const ctx = canvas.getContext("2d");
    const renderActions = [];

    for(const part of product.parts) {
        const { colors, layers } = part;

        for(const layer of layers) {
            const path = new Path2D(layer.path);
            if(layer.type === "shape") {
                renderActions.push([ layer.z, () => {
                    ctx.save();
                    ctx.scale(qualityScale, qualityScale);
                    ctx.fillStyle = hexToRGBA(colors[layer.colorIndex], layer.opacity || 1);
                    ctx.fill(path);
                    ctx.restore();
                }]);
            } else if(layer.type === "fixed") {
                renderActions.push([ layer.z, () => {
                    ctx.save();
                    ctx.scale(qualityScale, qualityScale);
                    ctx.fillStyle = hexToRGBA(layer.color, layer.opacity || 1);
                    ctx.fill(path);
                    ctx.restore();
                }]);
            } else if(layer.type === "embroidery") {
                renderActions.push([ layer.z, async () => {
                    ctx.save();
                    ctx.scale(qualityScale, qualityScale);
                    await renderEmbroiderMatrix(canvas, layer.embroiderMatrix, {
                        offset: [0,0],
                        clipPath: new Path2D(layer.embroiderMatrix.frame.path),
                        clipOffset: layer.position,
                        apparentBlockSize: layer.size[0] / layer.embroiderMatrix.size[0]
                    });
                    ctx.restore();
                }]);
            }
        }
    }

    // Perform render actions
    renderActions.sort((a, b) => a[0] - b[0]);
    for(const [ z, action ] of renderActions) await action();
}