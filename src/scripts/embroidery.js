const EmbroideryManager = {
    components: {
        layers: {
            blocks: $(".main-window.embroidery > .blocks"),
            canvas: $(".main-window.embroidery > .blocks canvas"),
            lifted: $(".main-window.embroidery > .lifted"),
            design: $(".main-window.embroidery > .design"),
            designCanvas: $(".main-window.embroidery > .design canvas"),
            overlay: $(".main-window.embroidery > .overlay"),
            mouse: $(".main-window.embroidery > .mouse"),
            actions: $(".main-window.embroidery > .actions"),
        },
        actions: {
            back: $(".main-window.embroidery > .actions #action-back"),
            embroider: $(".main-window.embroidery > .actions #action-embroider"),
            cut: $(".main-window.embroidery > .actions #action-cut"),
            move: $(".main-window.embroidery > .actions #action-move"),
            design: $(".main-window.embroidery > .actions #action-design"),
            erase: $(".main-window.embroidery > .actions #action-erase"),
        },
        colorOptions: [ ...document.querySelectorAll(".main-window.embroidery > .actions .color-item") ],
        buttons: {
            zoomOut: $(".main-window.embroidery > .actions #zoomout-btn"),
            zoomIn: $(".main-window.embroidery > .actions #zoomin-btn"),
            undo: $(".main-window.embroidery > .actions #undo-btn"),
            redo: $(".main-window.embroidery > .actions #redo-btn"),
            colors: $(".main-window.embroidery > .actions #colors-btn"),
        },
        threadHover: $(".main-window.embroidery > .mouse .thread-hover")
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
        },
        get matrixTotalApparentSize() {
            return scaleVector(EmbroideryManager.matrices.embroider.size, 
                EmbroideryManager.view.apparentBlockSize)
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
        { label: "white", fill: "#E4E4E5", stroke: "#D3D3D3" },
        { label: "black", fill: "#393939", stroke: "#2E2E2E" },
        { label: "red", fill: "#922C4A", stroke: "#772C42" },
        { label: "yellow", fill: "#DCC740", stroke: "#C2AF36" },
        { label: "green", fill: "#41703A", stroke: "#386232" },
        { label: "blue", fill: "#364198", stroke: "#293484" },
    ],

    states: {
        activeColorsIndex: 1,
        get activeColors() {
            return EmbroideryManager.palette[this.activeColorsIndex];
        },
        mode: "embroider",
        changeStates: [],
        changeStatePointer: -1,
        showDesign: true,

        get canUndo() {
            return this.changeStatePointer > -1;
        },
        
        get canRedo() {
            return this.changeStatePointer + 1 < this.changeStates.length;
        },

        hoveredThread: null
    },

    renderStates: {
        cooldown: false,
        cooldownTime: 20,
        pending: false
    },

    precisions: {
        maxThreadLength: 10,
        spanThreshold: 20
    },
    
    events: {},

    /**
     * @param {{ embroiderMatrix: EmbroiderMatrix, designMatrix: DesignMatrix }} options 
     */
    async initialize(options) {
        this.events = options.events;
        this.matrices.embroider = options.embroiderMatrix;
        this.matrices.design = options.designMatrix;


        // Reset states
        updateObject(this.view, {
            offset: [ 0, 0 ],
            zoom: 1,
            blockSize: 30,
            zoomMultipler: 1.2,
            maxZoom: 3,
            minZoom: 0.5
        });
        
        updateObject(this.states, {
            activeColorsIndex: 1,
            mode: "embroider",
            changeStates: [],
            changeStatePointer: -1,
            showDesign: true,
        
            hoveredThread: null
        });
        
        // Setup layers
        const layers = this.components.layers;

        const { clientHeight, clientWidth } = document.body;        
        this.size = { height: clientHeight, width: clientWidth };
        layers.canvas.height = this.size.height;
        layers.canvas.width = this.size.width;
        layers.canvas.style.height = this.size.height;
        layers.canvas.style.width = this.size.width;
        layers.designCanvas.height = this.size.height;
        layers.designCanvas.width = this.size.width;
        layers.designCanvas.style.height = this.size.height;
        layers.designCanvas.style.width = this.size.width;
        
        this.mouseCtrl = new MouseController(layers.mouse);


        // Initialize actions
        const actionBtns = this.components.actions;
        actionBtns.back.onclick = () => this.events.onExit();
        actionBtns.embroider.onclick = () => this.setMode("embroider");
        actionBtns.cut.onclick = () => this.setMode("cut");
        actionBtns.move.onclick = () => this.setMode("move");
        actionBtns.erase.onclick = () => this.setMode("erase");
        actionBtns.design.onclick = () => this.toggleDesignView();

        this.components.colorOptions.forEach((btn, i) => 
            btn.onclick = () => this.setColors(i));


        // Initialize buttons
        const buttons = this.components.buttons;
        buttons.zoomOut.onclick = () => this.zoomOut();
        buttons.zoomIn.onclick = () => this.zoomIn();
        buttons.undo.onclick = () => this.undo();
        buttons.redo.onclick = () => this.redo();

        this.components.threadHover.onclick = () => {
            const thread = this.states.hoveredThread;
            if(thread) {
                // Remove thread
                this.matrices.embroider.removeThread(thread);
                this.forward("remove", thread);
                this.renderAll();
            }
        };

        this.refreshStatesView();


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
        this.mouseCtrl.setListener("hover", event => this.hover(event));
        
        this.mouseCtrl.setListener("scroll", ({ direction, position }) => {
            this.zoom(1.1, direction === 1 ? "in" : "out", position );
            this.hover({ position });
        });
        
        this.mouseCtrl.setListener("span", event => this.span(event));
        this.mouseCtrl.setListener("spanRelease", () => {
            this.save();
            this.components.layers.mouse.setAttribute("data-orientation", "");
        });


        // Banig at center
        const totalSize = this.view.matrixTotalApparentSize; 
        this.view.offset = scaleVector(subtractVectors(
            [this.size.width,this.size.height], totalSize), -1/2).map(d => Math.floor(d));
        this.view.offset[1] -= 20;
        
        this.renderAll();
    },


    setMode(mode) {
        this.states.mode = mode;
        this.refreshStatesView();
    },

    refreshStatesView() {
        const { mode, showDesign } = this.states;
        const actionBtns = this.components.actions;
        const colorBtns = this.components.colorOptions;
        const buttons = this.components.buttons;

        this.components.layers.mouse.setAttribute("data-mode", mode);
        
        // mode buttons
        [   actionBtns.embroider, actionBtns.cut, actionBtns.move, actionBtns.erase ]
            .forEach(b => {
                if(b.id === `action-${mode}`)
                    b.classList.add("active");
                else b.classList.remove("active")
            });
        

        // Show design?
        if(showDesign) actionBtns.design.classList.remove("off");
        else actionBtns.design.classList.add("off");

        // colors
        colorBtns.forEach((btn, i) => {
            const colors = this.palette[i];
            btn.innerHTML = "";
            btn.appendChild(getBlockSVG({
                block: "thread-h", colors, blockSize: 35
            }));

            if(this.states.activeColorsIndex === i) 
                btn.classList.add("active")
            else btn.classList.remove("active")
        });


        // undo/redo
        if(this.states.canUndo) buttons.undo.classList.remove("disabled");
        else buttons.undo.classList.add("disabled");

        if(this.states.canRedo) buttons.redo.classList.remove("disabled");
        else buttons.redo.classList.add("disabled");
    },

    setColors(index) {
        this.states.activeColorsIndex = index;
        this.setMode("embroider");
        this.refreshStatesView();
    },

    toggleDesignView() {
        this.states.showDesign = !this.states.showDesign;
        this.refreshStatesView();
        this.renderAll();
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
                    this.components.layers.mouse.setAttribute("data-orientation", orientation);
                    this.forward("add", context.thread);
                } else return;
            }

            const thread = context.thread;
            const initCell = context.initCell;
            const curCell = this.getRelativePosition(position);

            let relativeSpan;
            if(thread.direction === 1) {
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
            } else {
                if(thread.orientation === "h") {
                    relativeSpan = [
                        [ curCell[0], Math.floor(initCell[1]) ],
                        [ initCell[0], Math.floor(initCell[1]) + 1 ]
                    ];
                } else {
                    relativeSpan = [
                        [ Math.floor(initCell[0]), curCell[1] ],
                        [ Math.floor(initCell[0]) + 1, initCell[1] ]
                    ];
                }
            }
            

            thread.state.span = relativeSpan;

            this.renderAll();
        }
    },

    findThreadAt(position) {
        const [ x, y ] = position;
        const threads = this.matrices.embroider.threads;
        for(let i = threads.length-1; i >= 0; i--) {
            const thread = threads[i];
            const range = thread.state.span.map(p => this.getApparentPosition(p));
            if(x >= range[0][0] && x <= range[1][0] &&
                y >= range[0][1] && y <= range[1][1]) {
                    return { thread, range };
                }
        }

        return null;
    },

    hover({ position }) {
        this.log(`(${position.join(",")}) | (${
            this.getRelativePosition(position).map(n => Math.floor(n)).join(",")
        })`);

        this.log("Hovered at " + Date.now(), 2);

        this.states.hoveredThread = null;

        if(this.states.mode === "erase") {
            const hoveredThread = this.findThreadAt(position);
            if(hoveredThread) {
                const { thread, range } = hoveredThread;
                const size = subtractVectors(range[1], range[0]);

                this.states.hoveredThread = thread;
                this.components.threadHover.style.left = range[0][0];
                this.components.threadHover.style.top = range[0][1];
                this.components.threadHover.style.width = size[0];
                this.components.threadHover.style.height = size[1];
            }
        }

        // Update thread hover state
        this.components.layers.mouse.classList[this.states.hoveredThread ? "add" : "remove"]("hovering");        
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
        const designMatrix = this.matrices.design;
        
        const canvas = this.components.layers.canvas;
        /** @type {CanvasRenderingContext2D} */
        const ctx = canvas.getContext("2d");

        // Clear canvas
        ctx.clearRect(0, 0, this.size.width, this.size.height);
        
        // Render matrix
        await renderEmbroiderMatrix(canvas, embroiderMatrix, this.view);

        // Render design
        const designCanvas = this.components.layers.designCanvas;
        designCanvas.getContext("2d").clearRect(0, 0, this.size.width, this.size.height);
        if(this.states.showDesign) await renderDesign(designCanvas, designMatrix, this.view)

        // Render frame
        const frame = embroiderMatrix.frame;
        const totalSize = this.view.matrixTotalApparentSize;
        const frameScale = embroiderMatrix.size[0] * this.view.blockSize / frame.baseSize[0];
        const frameImg = await getImageFromPath(frame.path, frame.baseSize,
            { stroke: "#857A55", strokeWidth: 5 / frameScale });
        const framePos = this.getApparentPosition([0,0]).map(n => Math.floor(n));
        ctx.drawImage(frameImg, ...framePos, ...totalSize);

        this.log("DONE RENDERING");

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
        } else if(action === "remove") {
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

        this.save();
        this.refreshStats();
        this.refreshStatesView();
    },

    undo() {
        if(!this.states.canUndo) return;

        /** @type {ChangeState} */
        const changeState = this.states.changeStates[this.states.changeStatePointer];
        if(!changeState) return;

        if(changeState.action === "add" && changeState.type === "thread") {
            // Remove thread
            this.matrices.embroider.removeThread(changeState.subject);
        } else if(changeState.action === "remove" && changeState.type === "thread") {
            // Add thread
            this.matrices.embroider.addBackThread(changeState.subject);
        }

        this.states.changeStatePointer--;

        this.save();
        this.renderAll();
        this.refreshStats();
        this.refreshStatesView();
    },

    redo() {
        if(!this.states.canRedo) return;

        /** @type {ChangeState} */
        const changeState = this.states.changeStates[this.states.changeStatePointer + 1];
        if(!changeState) return;

        if(changeState.action === "add" && changeState.type === "thread") {
            // Add thread
            this.matrices.embroider.addBackThread(changeState.subject);
        } else if(changeState.action === "remove" && changeState.type === "thread") {
            // Remove thread
            this.matrices.embroider.removeThread(changeState.subject);
        }

        this.states.changeStatePointer++;

        this.save();
        this.renderAll();
        this.refreshStats();
        this.refreshStatesView();
    },

    save() {
        this.matrices.embroider.save();
    }
    
};


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

 
    // const embroiderMatrix = EmbroiderMatrix.newBlank({
    //     frame: "M2 25H97L85.5636 78.9323L83.6004 81H15.7432L13.4364 78.9323L2 25Z"
    // });
    // const json = LocalDB.get(`embmatrix-1693030932107-21707`);
    const embroiderMatrix = EmbroiderMatrix.load("1693030932107-21707");
    embroiderMatrix.frame = {
        baseSize: [ 400, 400 ],
        path: "M3 92.8311H397.286L350.143 315.688L341.571 324.26H60.0395L50.1484 315.715L3 92.8311Z"
    };
        // EmbroideryManager.log(embroiderMatrix, 2);
    // embroiderMatrix.threads = [];
    // embroiderMatrix.save()
    EmbroideryManager.log(embroiderMatrix.id, 1);
    await EmbroideryManager.initialize({
        embroiderMatrix
    });

    // embroiderMatrix.save()
    // renderThread({
    //     id: `sample-thread`,
    //     orientation: "h",
    //     position: [ 90, 90 ],
    //     size: [ 30, 100 ],
    //     parent: EmbroideryManager.components.layers.blocks
    // })
}

// test();