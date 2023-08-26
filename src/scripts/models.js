function getClientCoords(el, e) {
    const rect = el.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    return [ cx, cy ];
}

function distance(p1, p2) {
    return Math.sqrt((p2[1]-p1[1])**2 + (p2[0]-p1[0])**2);
}

function scaleVector(vector, multiplier) {
    return [ 
        vector[0]*multiplier,
        vector[1]*multiplier
    ];
}
function addVectors(v1, v2) {
    return [ 
        v1[0] + v2[0],
        v1[1] + v2[1]
    ];
}

function subtractVectors(v1, v2) {
    return [ 
        v1[0] - v2[0],
        v1[1] - v2[1]
    ];
}

function multiplyVectors(v1, v2) {
    return [ 
        v1[0] * v2[0],
        v1[1] * v2[1]
    ];
}

function divideVectors(v1, v2) {
    return [ 
        v1[0] / v2[0],
        v1[1] / v2[1]
    ];
}

class MouseController {

    static CLICK_THRESHOLD = 5;
    
    /**
     * @param {HTMLElement} element
     * @typedef { "span" | "spanRelease" | "click" | "down" | "hover" | "leave" | "scroll" } MCEvent
     * */
    constructor(element) {
        if(element) {
            this.element = element;
            this.listeners = {};
            
            // element.addEventListener("click", 
            //     e => this.trigger("click", { position: getClientCoords(element, e) }));
            
            element.addEventListener("mouseleave", 
                e => this.trigger("leave", { position: getClientCoords(element, e) }));
            

            let isDown = false;
            let downCoords;
            let spanContext = {};

            element.addEventListener("mousedown", e => {
                const coords = getClientCoords(element, e);
                isDown = true;
                downCoords = getClientCoords(element, e);

                this.trigger("down", { position: coords });
            });

            element.addEventListener("mouseup", e => {
                const coords = getClientCoords(element, e);
                
                if(downCoords) {
                    if(distance(coords, downCoords) <= MouseController.CLICK_THRESHOLD) {
                        this.trigger("click", { position: getClientCoords(element, e) });
                    } else {
                        this.trigger("spanRelease", {
                            startPosition: downCoords,
                            position: coords,
                            context: spanContext
                        });
                        spanContext = {};
                    }
                }
                
                isDown = false;
                downCoords = null;
            });

            element.addEventListener("mouseout", e => {
                const coords = getClientCoords(element, e);
                
                if(downCoords) {
                    if(distance(coords, downCoords) > MouseController.CLICK_THRESHOLD) {
                        this.trigger("spanRelease", {
                            startPosition: downCoords,
                            position: coords,
                            context: spanContext
                        });
                        spanContext = {};
                    }
                }
                
                isDown = false;
                downCoords = null;
            });

            element.addEventListener("mousemove", e => {
                const coords = getClientCoords(element, e);

                if(isDown) {
                    if(distance(coords, downCoords) > MouseController.CLICK_THRESHOLD) {
                        this.trigger("span", {
                            startPosition: downCoords,
                            position: coords,
                            context: spanContext
                        });
                    }
                } else {
                    this.trigger("hover", {
                        position: coords
                    });
                }
            });

            element.addEventListener("wheel", e => {
                if(e.deltaY === 0) return;
                const direction = e.deltaY < 0 ? 1 : -1;
                const coords = getClientCoords(element, e);
                this.trigger("scroll", { direction, position: coords });
            });
        }
    }

    /** @param {MCEvent} event */
    trigger(event, args) {
        if(this.listeners[event]) this.listeners[event](args); 
    }

    /** @param {MCEvent} event
     *  @param {(args: { position: number[], startPosition: number[] }) => any} listener
     */
    setListener(event, listener) {
        this.listeners[event] = listener;
        return this;
    }
}

/**
 * @typedef {{ path: string, baseSize: number[] }} EmbroiderFrame 
 * @typedef {"h" | "v"} BlockOrientation
 * @typedef {1 | -1} BlockDirection
 * @typedef {{ fill: string, stroke: string }} BlockColors
 * 
 * @typedef {"span" | "add" | "remove" | "toggleLift"} ChangeStateAction
 * @typedef {"thread" | "weaved"} ChangeStateType
 * 
 */

class ThreadState {
    /**
     * @param {{ span: number[][] }} options 
     */
    constructor(options) {
        this.span = options.span;
    }

    copy() {
        return ThreadState.parse(this.serialize());
    }

    serialize() {
        const obj = {
            span: this.span
        };

        return obj;
    }

    static parse(obj) {
        return new ThreadState(obj);
    }
}

class WeavedState {
    /**
     * @param {{ lifted: boolean }} options 
     */
    constructor(options) {
        this.lifted = options.lifted;
    }

    copy() {
        return WeavedState.parse(this.serialize());
    }

    serialize() {
        const obj = {
            lifted: this.lifted
        };

        return obj;
    }

    static parse(obj) {
        return new WeavedState(obj);
    }
}


class Thread {
    /**
     * 
     * @param {{ id: number, orientation: BlockOrientation,
     *  direction: BlockDirection, state: ThreadState,
     *  colors: BlockColors }} options 
     */
    constructor(options) {
        this.id = options.id;
        this.orientation = options.orientation;
        this.direction = options.direction;
        this.state = options.state;
        this.colors = options.colors;
    }

    serialize() {
        return {
            id: this.id,
            orientation: this.orientation,
            direction: this.direction,
            state: this.state.serialize(),
            colors: this.colors,
        }
    }

    static new({ orientation, direction, colors, span }) {
        return new Thread({
            id: generateId(),
            orientation, direction, colors,
            state: new ThreadState({ span: span || [ [0,0], [0,0] ] })
        });
    }

    static parse(obj) {
        return new Thread({
            id: obj.id,
            orientation: obj.orientation,
            direction: obj.direction,
            state: ThreadState.parse(obj.state),
            colors: obj.colors,
        });
    }
}

class Weaved {
    /**
     * 
     * @param {{ orientation: BlockOrientation, 
     *  colors: BlockColors, state: WeavedState }} options 
     */
    constructor(options) {
        this.orientation = options.orientation;
        this.colors = options.colors;
        this.state = options.state;
    }

    serialize() {
        return {
            orientation: this.orientation,
            colors: this.colors,
            state: this.state.serialize(),
        }
    }

    static parse(obj) {
        return new Weaved({
            orientation: obj.orientation,
            colors: obj.colors,
            state: WeavedState.parse(obj.state)
        });
    }
}

function getBlockOrientation(col, row) {
    const rowInitial = row % 2;
    const orientation = (col + rowInitial) % 2;
    return orientation === 0 ? "h" : "v";
}

class EmbroiderMatrix {
    /**
     * @param {{ id: string, baseSize: number[], size: number[], scale: number,
     *  frame: EmbroiderFrame, threads: Thread[], weavedColors: BlockColors }} options
     */
    constructor(options) {
        this.id = options.id;
        this.baseSize = options.baseSize;
        this.size = options.size;
        this.scale = options.scale;
        this.frame = options.frame;
        this.threads = options.threads;
        this.weavedColors = options.weavedColors;
        // this.weaved = options.weaved;
    }

    serialize() {
        return {
            id: this.id,
            baseSize: this.baseSize,
            size: this.size,
            scale: this.scale,
            frame: this.frame,
            threads: this.threads.map(t => t.serialize()),
            weavedColors: this.weavedColors
            // weaved: this.weaved.map(r => 
            //     r.map(w => w.serialize())),
        };
    }

    get totalSize() {
        return this.size[0] * this.size[1];
    }

    removeThread(thread) {
        this.threads = this.threads.filter(t => t.id !== thread.id);
    }

    addBackThread(thread) {
        this.threads = [ ...this.threads, thread ].sort(
            (a, b) => (a.id <= b.id) ? -1 : 1);
    }

    save() {
        LocalDB.save(`embmatrix-${this.id}`, this.serialize());
    }

    static DEFAULT_SIZE = [ 20, 20 ];

    static load(id) {
        const obj = LocalDB.get(`embmatrix-${id}`);
        if(!obj) return null;
        return EmbroiderMatrix.parse(obj);
    }

    static parse(obj) {
        return new EmbroiderMatrix({
            id: obj.id,
            baseSize: obj.baseSize,
            size: obj.size,
            scale: obj.scale,
            frame: obj.frame,
            threads: obj.threads.map(t => Thread.parse(t)),
            weavedColors: obj.weavedColors
        })
    }

    /**
     * @param {{ baseSize: number[], scale: number, frame: EmbroiderFrame, colors: BlockColors }} options
    */
    static newBlank(options) {
        let { baseSize, scale, frame, colors } = options || {};
        
        if(!baseSize) baseSize = EmbroiderMatrix.DEFAULT_SIZE;
        
        if(!scale) scale = 1;

        if(!frame) frame = "M5 5H95V95H5V5Z";

        if(!colors) colors = {
            fill: "#B8A976",
            stroke: "#A39567"
        };
        
        const size = [ 
            Math.floor(baseSize[0]*scale), 
            Math.floor(baseSize[1]*scale) ];

        const id = generateId();
        return new EmbroiderMatrix({
            id, baseSize, size, scale,
            frame, threads: [], weavedColors: colors
        });
    }
}

class DesignMatrix {
    /**
     * @param {{ pixels: string[][], size: number[], frame: EmbroiderFrame }} options
     */
    constructor(options) {
        this.pixels = options.pixels;
        this.size = options.size;
        this.frame = options.frame;
    }

    serialize() {
        return {
            pixels: this.pixels,
            size: this.size,
            frame: this.frame
        };
    }
    
    static newBlank(options) {
        let { size, frame } = options;
        if(!size) size = EmbroiderMatrix.DEFAULT_SIZE;
        return new DesignMatrix({
            pixels: new Array(size[1]).fill(0).map(
                _ => new Array(size[0]).fill(0).map(__ => "")
            ),
            frame, size
        });
    }

    static parse(obj) {
        return new EmbroiderMatrix(obj);
    }
}


class ChangeState {
    /**
     * @param {{ action: ChangeStateAction, type: ChangeStateType,
     *  subject: Thread | Weaved,
     *  from: ThreadState | WeavedState, 
     *  to: ThreadState | WeavedState }} options 
     */
    constructor(options) {
        this.action = options.action;
        this.subject = options.subject;
        this.type = options.type;
        this.from = options.from;
        this.to = options.to;
    }
}


/**
 * @typedef {"mat" | "bag"} ProductType
 * @typedef {{ type: "fixed", path, color, opacity, z: number }} ProductPartFixedLayer
 * @typedef {{ type: "shape", label, colorIndex, path, opacity, z: number }} ProductPartShapeLayer
 * @typedef {{ type: "embroidery", label, color, 
 *      embroiderMatrix: EmbroiderMatrix, designMatrix: DesignMatrix,
 *      position: number[], size: number[], z: number }} ProductPartEmbroideryLayer
 * @typedef {ProductPartShapeLayer | ProductPartEmbroideryLayer | ProductPartFixedLayer} ProductPartLayer
 * @typedef {{ label, colors: string[], layers: ProductPartLayer[] }} ProductPart
 */
class Product {
    /**
     * 
     * @param {{ id, name, baseSize: number[], type: ProductType, parts: ProductPart[] }} options 
     */
    constructor(options) {
        this.id = options.id;
        this.name = options.name;
        this.baseSize = options.baseSize;
        this.type = options.type;
        this.parts = options.parts;
    }

    static Bag(options) {
        let { designMatrices, embroiderScale } = options || {};
        

        const frame = { baseSize: [ 400, 400 ], path: "M3 92.8311H397.286L350.143 315.688L341.571 324.26H60.0395L50.1484 315.715L3 92.8311Z" };
        const designMatrix = designMatrices?.[0] || DesignMatrix.newBlank({ frame });
        if(!embroiderScale) embroiderScale = 1;
        const embroiderMatrix = EmbroiderMatrix.newBlank({ frame, scale: embroiderScale });
        
        return new Product({
            id: generateId(),
            type: "bag",
            parts: [
                { label: "Bag Handle", colors: [ "#A18738" ], layers: [
                    // Back handle: base
                    { z: 2, type: "shape", colorIndex: 0, path: "M196.623 112.278C186.738 152.014 187.395 199.059 187.395 227H166C166 186.996 166.152 146.141 175.861 107.112C181.171 85.7644 189.377 65.1067 202.402 49.6111C215.752 33.7292 233.304 23 257.287 23C281.16 23 300.138 33.3949 313.534 48.9844C326.601 64.1909 334.824 84.5158 340.143 105.648C350.078 145.122 350 186.529 350 227H330.031C330.031 197.117 329.269 150.105 319.395 110.872C314.462 91.2709 307.307 74.569 297.308 62.9319C287.637 51.678 274.422 44.3986 257.287 44.3986C240.262 44.3986 228.495 51.822 218.779 63.3814C208.737 75.3271 201.565 92.4137 196.623 112.278Z", opacity: 0.8 },

                    // Back handle: shadows
                    { z: 2, type: "fixed", path: "M187.41 226.998C187.41 199.063 186.753 152.03 196.637 112.303C201.578 92.4431 208.75 75.3602 218.79 63.4171C228.506 51.8602 240.272 44.4364 257.295 44.4364C274.429 44.4364 287.643 51.7163 297.312 62.9678C307.311 74.6022 314.465 91.3006 319.398 110.897C321.542 119.415 323.01 128.163 324.328 137.143C322.685 125.232 320.711 113.465 317.806 102.18C312.775 82.6389 308.037 72.2103 297.235 59.9212C286.586 47.8057 271.281 36.3879 252.309 36.3879C233.388 36.3879 220.905 44.6593 210.235 57.0687C199.414 69.654 191.976 87.2635 186.941 107.05C177.019 146.046 176 186.951 176 226.998H187.41Z", color: "#1F1F1F", opacity: 0.14 },
                    { z: 2, type: "fixed", path: "M255.869 23.0427C276.536 23.8857 291.035 34.9669 302.94 48.5111C315.203 62.4632 323.68 79.4128 328.9 99.6912C339.394 140.454 340.73 185.636 340.016 227H350C350 186.905 349.981 144.755 340.144 105.675C334.826 84.5469 326.603 64.2264 313.537 49.0233C299.429 32.6073 277.676 22.2477 255.869 23.0427Z", color: "#1F1F1F", opacity: 0.14 },
                    
                    // Front handle: base
                    { z: 9, type: "shape", colorIndex: 0, path: "M181.79 119.278C171.851 159.014 172.512 206.059 172.512 234H151C151 193.996 151.153 153.141 160.914 114.112C166.254 92.7644 174.504 72.1067 187.6 56.6111C201.023 40.7292 218.669 30 242.783 30C266.785 30 285.867 40.3949 299.336 55.9844C312.474 71.1909 320.742 91.5158 326.09 112.648C336.078 152.122 336 193.529 336 234H315.922C315.922 204.117 315.157 157.105 305.229 117.872C300.269 98.271 293.075 81.569 283.021 69.9319C273.298 58.678 260.011 51.3986 242.783 51.3986C225.666 51.3986 213.835 58.822 204.066 70.3814C193.97 82.3271 186.758 99.4137 181.79 119.278Z" },

                    // Front handle: shadows
                    { z: 9, type: "fixed", path: "M172.475 233.998C172.475 206.063 171.815 159.03 181.755 119.303C186.725 99.4431 193.938 82.3602 204.036 70.4171C213.808 58.8602 225.642 51.4364 242.762 51.4364C259.994 51.4364 273.284 58.7163 283.01 69.9678C293.066 81.6022 300.261 98.3006 305.222 117.897C307.378 126.415 308.855 135.163 310.18 144.143C308.528 132.232 306.542 120.465 303.621 109.18C298.561 89.6389 293.795 79.2103 282.932 66.9212C272.222 54.8057 256.828 43.3879 237.747 43.3879C218.717 43.3879 206.163 51.6593 195.432 64.0687C184.549 76.654 177.068 94.2635 172.004 114.05C162.025 153.046 161 193.951 161 233.998H172.475Z", color: "#1F1F1F", opacity: 0.14 },
                    { z: 9, type: "fixed", path: "M241.328 30.0427C262.114 30.8857 276.696 41.9669 288.67 55.5111C301.003 69.4632 309.529 86.4128 314.779 106.691C325.333 147.454 326.676 192.636 325.959 234H336C336 193.905 335.981 151.755 326.087 112.675C320.739 91.5469 312.469 71.2264 299.328 56.0233C285.138 39.6073 263.26 29.2477 241.328 30.0427Z", color: "#1F1F1F", opacity: 0.14 }
                ]},
                { label: "Edges", colors: [ "#9B8C58", "#898166" ], layers: [
                    // Inner edge
                    { z: 4, label: "Inside", type: "shape", colorIndex: 0, path: "M68.5917 211.043L54.2826 243L50 222.824L66.4465 194H429.699L444 222.824L439.717 243L426.123 211.043H68.5917Z" },
                    
                    // Inner edge shadows / highlight
                    { z: 4, type: "fixed", path: "M70 223L66.4296 194L50 222.497L70 223Z", color: "#282828", opacity: 0.15 },
                    { z: 4, type: "fixed", path: "M424 223L429.714 194L444 223H424Z", color: "#EAEAEA", opacity: 0.3 },
                    { z: 4, type: "fixed", path: "M67.1948 203L50 223H398.195L67.1948 203Z", color: "#282828", opacity: 0.15 },
                
                    // Outer edge
                    { z: 11, label: "Outside", type: "shape", colorIndex: 1, path: "M444 222.5H50L54.2826 243H439.717L444 223Z" },
                ]},
                { label: "Inner", colors: [ "#B8AD8A" ], layers: [
                    // Shadow
                    { z: 1, type: "fixed", path: "M464 413.316L405.451 467H109.848L98.4242 455.667L87 399H454.004L464 413.316Z", color: "#222222", opacity: 0.25 },

                    // Inner
                    { z: 3, type: "shape", colorIndex: 0, path: "M66.422 194L50 223H444L429.725 194.208L66.422 194Z" },
                ]},
                { label: "Front", layers: [
                    // Front embroidered
                    { z: 10, type: "embroidery", embroiderMatrix, designMatrix, position: [ 47, 130 ], size: [ 400, 400 ]  },
                    
                    // Front shadows
                    { z: 12, type: "fixed", path: "M240 453V223.708L444 223L396.21 444.508L388.364 453H240Z", color: "#666666", opacity: 0.1 },
                    { z: 12, type: "fixed", path: "M396.857 445.444L444 223H324V454H388.286L396.857 445.444Z", color: "#282828", opacity: 0.07 },
                    { z: 12, type: "fixed", path: "M97.1429 445.444L50 223H160L159.286 453.287L107.143 454L97.1429 445.444Z", color: "#CCCCCC", opacity: 0.1 },
                    { z: 12, type: "fixed", path: "M424.962 223L389 454L397.462 445.444L444 223H424.962Z", color: "#282828", opacity: 0.1 },
                    { z: 12, type: "fixed", path: "M69.95 223L107 454L97.025 445.444L50 223H69.95Z", color: "#E3E3E3", opacity: 0.1 },
                ]},
                
            ]
        });
    }
}