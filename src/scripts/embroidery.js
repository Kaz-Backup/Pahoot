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
        actions: {
            back: $(".main-window.embroidery > .actions #action-back"),
            embroider: $(".main-window.embroidery > .actions #action-embroider"),
            cut: $(".main-window.embroidery > .actions #action-cut"),
            move: $(".main-window.embroidery > .actions #action-move"),
            design: $(".main-window.embroidery > .actions #action-design")
        },
        colorOptions: [ ...document.querySelectorAll(".main-window.embroidery > .actions .color-item") ],
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
        }
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


        // Initialize actions
        const actionBtns = this.components.actions;
        actionBtns.back.onclick = () => this.back();
        actionBtns.embroider.onclick = () => this.setMode("embroider");
        actionBtns.cut.onclick = () => this.setMode("cut");
        actionBtns.move.onclick = () => this.setMode("move");
        actionBtns.design.onclick = () => this.toggleDesignView();

        this.components.colorOptions.forEach((btn, i) => 
            btn.onclick = () => this.setColors(i));


        // Initialize buttons
        const buttons = this.components.buttons;
        buttons.zoomOut.onclick = () => this.zoomOut();
        buttons.zoomIn.onclick = () => this.zoomIn();
        buttons.undo.onclick = () => this.undo();
        buttons.redo.onclick = () => this.redo();

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
        this.mouseCtrl.setListener("hover", ({ position }) => 
            this.log(`(${position.join(",")}) | (${
                this.getRelativePosition(position).map(n => Math.floor(n)).join(",")
            })`));
        
        this.mouseCtrl.setListener("scroll", ({ direction, position }) =>
            this.zoom(1.1, direction === 1 ? "in" : "out", position ));
        
        this.mouseCtrl.setListener("span", event => this.span(event));
        this.mouseCtrl.setListener("spanRelease", () => {
            this.components.layers.mouse.setAttribute("data-orientation", "");
        });


        // Banig at center
        const totalSize = scaleVector(this.matrices.embroider.size, this.view.apparentBlockSize);
        this.view.offset = scaleVector(subtractVectors(
            [this.size.width,this.size.height], totalSize), -1/2).map(d => Math.floor(d));
        this.view.offset[1] -= 20;


        // Preload blocks
        const weavedColors = this.matrices.embroider.weaved[0][0].colors;
        await preloadBlockImages([
            { block: `weaved-h`, colors: weavedColors },
            { block: `weaved-v`, colors: weavedColors },
            { block: `thread-gh`, colors: {} },
            { block: `thread-gv`, colors: {} },
            ...this.palette.map(colors => ({ block: `thread-h`, colors })),
            ...this.palette.map(colors => ({ block: `thread-v`, colors }))
        ]);


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
        [   actionBtns.embroider, actionBtns.cut, actionBtns.move ]
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
        this.refreshStatesView();
    },

    toggleDesignView() {
        this.states.showDesign = !this.states.showDesign;
        this.refreshStatesView();
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
        

        // Render grooves
        for(let r = 0; r < rows; r++) {
            for(let c = 0; c < cols; c++) {
                const weavedCell = weaved[r][c];
                const apparentPos = this.getApparentPosition([c, r]);

                await renderGrooveBlock({
                    orientation: weavedCell.orientation,
                    position: apparentPos,
                    size: [ apparentBlockSize, apparentBlockSize ],
                    parent: canvas
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
        this.refreshStatesView();
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
        this.refreshStatesView();
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
        this.refreshStatesView();
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

    const embroiderMatrix = EmbroiderMatrix.newBlank();
    await EmbroideryManager.initialize({
        embroiderMatrix
    });
    // renderThread({
    //     id: `sample-thread`,
    //     orientation: "h",
    //     position: [ 90, 90 ],
    //     size: [ 30, 100 ],
    //     parent: EmbroideryManager.components.layers.blocks
    // })
}

test();