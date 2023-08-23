function getClientCoords(el, e) {
    const rect = el.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    return [ cx, cy ];
}

function distance(p1, p2) {
    return Math.sqrt((p2[1]-p1[1])**2 + (p2[0]-p1[0])**2);
}

class MouseController {

    static CLICK_THRESHOLD = 5;
    
    /**
     * @param {HTMLElement} element
     * @typedef {"span" | "spanRelease" | "click" | "down" | "hover" | "leave"} MCEvent
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
                            position: coords
                        });
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
                            position: coords
                        });
                    }
                } else {
                    this.trigger("hover", {
                        position: coords
                    });
                }
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
 * @typedef {number[][]} EmbroiderFrame 
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

    static parse(obj) {
        return new Thread({
            id: obj.id,
            orientation: obj.orientation,
            direction: obj.direction,
            state: ThreadState.parse(obj.state),
            colors: obj.color,
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


class EmbroiderMatrix {
    /**
     * @param {{ baseSize: number[], size: number[], scale: number,
     *  frame: EmbroiderFrame, threads: Thread[], weaved: Weaved[][] }} options
     */
    constructor(options) {
        this.baseSize = options.baseSize;
        this.size = options.size;
        this.scale = options.scale;
        this.frame = options.frame;
        this.threads = options.threads;
        this.weaved = options.weaved;
    }

    serialize() {
        return {
            baseSize: this.baseSize,
            size: this.size,
            scale: this.scale,
            frame: this.frame,
            threads: this.threads.map(t => t.serialize()),
            weaved: this.weaved.map(r => 
                r.map(w => w.serialize())),
        };
    }

    static parse(obj) {
        return new EmbroiderMatrix({
            baseSize: obj.baseSize,
            size: obj.size,
            scale: obj.scale,
            frame: obj.frame,
            threads: obj.threads.map(t => Thread.parse(t)),
        })
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

    static parse(obj) {
        return new EmbroiderMatrix(obj);
    }
}


class ChangeState {
    /**
     * @param {{ action: ChangeStateAction, type: ChangeStateType,
     *  from: ThreadState | WeavedState,
     *  to: ThreadState | WeavedState }} options 
     */
    constructor(options) {
        this.action = options.action;
        this.type = options.type;
        this.from = options.from;
        this.to = options.to;
    }
}