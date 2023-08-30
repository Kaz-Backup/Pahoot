const DesignManager = {
    components: {
        layers: {
            pixels: $(".main-window.design > .pixels"),
            canvas: $(".main-window.design > .pixels canvas"),
            mouse: $(".main-window.design > .mouse"),
            actions: $(".main-window.design > .actions"),
        },
        actions: {
            back: $(".main-window.design > .actions #action-back"),
            paint: $(".main-window.design > .actions #action-paint"),
            bucket: $(".main-window.design > .actions #action-bucket"),
            move: $(".main-window.design > .actions #action-move"),
            erase: $(".main-window.design > .actions #action-erase"),
        },
        colorOptions: [ ...document.querySelectorAll(".main-window.design > .actions .color-item") ],
        buttons: {
            zoomOut: $(".main-window.design > .actions #zoomout-btn"),
            zoomIn: $(".main-window.design > .actions #zoomin-btn"),
            undo: $(".main-window.design > .actions #undo-btn"),
            redo: $(".main-window.design > .actions #redo-btn"),
            colors: $(".main-window.design > .actions #colors-btn"),
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
        },
        get matrixTotalApparentSize() {
            return scaleVector(DesignManager.matrices.design.size, 
                DesignManager.view.apparentBlockSize)
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
            return DesignManager.palette[this.activeColorsIndex];
        },
        mode: "paint",
        changeStates: [],
        changeStatePointer: -1,

        get canUndo() {
            return this.changeStatePointer > -1;
        },
        
        get canRedo() {
            return this.changeStatePointer + 1 < this.changeStates.length;
        },

        collector: []
    },

    renderStates: {
        cooldown: false,
        cooldownTime: 20,
        pending: false
    },


    events: {},

    /**
     * @param {{ embroiderMatrix: EmbroiderMatrix, designMatrix: DesignMatrix }} options 
     */
    async initialize(options) {
        this.events = options.events;
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
            mode: "paint",
            changeStates: [],
            changeStatePointer: -1,
            collector: []
        });

        // Setup layers
        const layers = this.components.layers;

        const { clientHeight, clientWidth } = document.body;        
        this.size = { height: clientHeight, width: clientWidth };
        layers.canvas.height = this.size.height;
        layers.canvas.width = this.size.width;
        layers.canvas.style.height = this.size.height;
        layers.canvas.style.width = this.size.width;
        
        this.mouseCtrl = new MouseController(layers.mouse);


        // Initialize actions
        const actionBtns = this.components.actions;
        actionBtns.back.onclick = () => this.events.onExit();
        actionBtns.paint.onclick = () => this.setMode("paint");
        actionBtns.bucket.onclick = () => this.setMode("bucket");
        actionBtns.move.onclick = () => this.setMode("move");
        actionBtns.erase.onclick = () => this.setMode("erase");

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
        this.mouseCtrl.setListener("hover", event => this.hover(event));
        this.mouseCtrl.setListener("down", event => this.touch(event));
        this.mouseCtrl.setListener("scroll", ({ direction, position }) => {
            this.zoom(1.1, direction === 1 ? "in" : "out", position );
            this.hover({ position });
        });
        
        this.mouseCtrl.setListener("span", event => this.span(event));
        // this.mouseCtrl.setListener("spanRelease", () => {
        //     this.save();
        // });

        this.mouseCtrl.setListener("up", event => this.flush(event));


        // Design at center
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
        const { mode } = this.states;
        const actionBtns = this.components.actions;
        const colorBtns = this.components.colorOptions;
        const buttons = this.components.buttons;

        this.components.layers.mouse.setAttribute("data-mode", mode);
        
        // mode buttons
        [   actionBtns.paint, actionBtns.erase, actionBtns.bucket, actionBtns.move ]
            .forEach(b => {
                if(b.id === `action-${mode}`)
                    b.classList.add("active");
                else b.classList.remove("active")
            });
        
        // colors
        colorBtns.forEach((btn, i) => {
            const colors = this.palette[i];
            btn.style.backgroundColor = colors.fill;

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
        if(this.states.mode === "erase") this.setMode("paint");
        this.refreshStatesView();
    },

    touch({ position, context }) {
        const cell = this.getCellAt(position);

        /** TODO: Paint / Erase / Fill */
        const mode = this.states.mode;
        if(mode === "paint" || mode === "erase") {
            this.touchPaintAt({ 
                position: cell, 
                context,
                color: mode === "paint" ? 
                    this.states.activeColors.fill : "" 
            });
        } else if(mode === "bucket") {
            const pixels = this.matrices.design.pixels;
            const visited = [ ...pixels.map(r => r.map(c => false)) ];
            const startColor = pixels[cell[1]][cell[0]];
            const roots = [ cell ];
            const painted = [];
            while(roots.length > 0) {
                const rcell = roots.pop();
                const [ c, r ] = rcell;
                if(c >= 0 && c < pixels[0].length && 
                    r >=0 && r < pixels.length &&
                    !visited[r][c]) {
                    visited[r][c] = true;
                    if(pixels[r][c] === startColor) {
                        painted.push(rcell);

                        // Add neighboring cells
                        roots.push(...[[1,0],[-1,0],[0,1],[0,-1]].map(o => addVectors(rcell, o)));
                    }
                }
            }

            if(painted.length > 0) {
                painted.forEach(cell => {
                    this.states.collector.push([ cell, startColor, this.states.activeColors.fill ]);
                    pixels[cell[1]][cell[0]] = this.states.activeColors.fill;
                });
                this.flush();
                this.renderAll();
            }
        }
    },

    span({ position, startPosition, context }) {
        if(!context.mode) context.mode = this.states.mode;

        const pixels = this.matrices.design.pixels;
        const [ c, r ] = this.getCellAt(position);
        if(context.mode === "move") {
            if(!context.initOffset) context.initOffset = [...this.view.offset];
            const mx = position[0] - startPosition[0];
            const my = position[1] - startPosition[1];
            this.view.offset = [
                context.initOffset[0] - mx,
                context.initOffset[1] - my,
            ];
            this.renderAll();
        } else if(context.mode === "paint") {
            this.touchPaintAt({ position: [c,r], color: this.states.activeColors.fill, context });
        } else if(context.mode === "erase") {
            this.touchPaintAt({ position: [c,r], color: "", context })
        }
    },

    hover({ position }) {
        this.log(`(${position.join(",")}) | (${
            this.getRelativePosition(position).map(n => Math.floor(n)).join(",")
        })`);

        this.log("Hovered at " + Date.now(), 2);
    },

    touchPaintAt({ position, color, context }) {
        const pixels = this.matrices.design.pixels;
        if(!context.visited) context.visited = [ ...pixels.map(r => r.map(c => false)) ];
        
        const [ c, r ] = position;
        
        if(!context.visited[r][c]) {
            context.visited[r][c] = true;

            const pixels = this.matrices.design.pixels;
            const originalColor = pixels[r][c];
            if(originalColor === color) return;

            pixels[r][c] = color;
            this.states.collector.push([ [c,r], originalColor, color ]);

            this.renderAll();
        } 
        
    },

    flush() {
        const collected = this.states.collector;
        if(collected.length === 0) return;
        
        this.states.collector = [];
        this.forward("paint", collected);
    },

    getCellAt(position) {
        return this.getRelativePosition(position).map(p => Math.floor(p));
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

        const canvas = this.components.layers.canvas;

        /** @type {CanvasRenderingContext2D} */
        const ctx = canvas.getContext("2d");
        const apparentBlockSize = this.view.apparentBlockSize;


        ctx.clearRect(0, 0, this.size.width, this.size.height);
        
        const designMatrix = this.matrices.design;
        
        // Render Background
        const totalSize = this.view.matrixTotalApparentSize;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#997460";
        ctx.lineWidth = 15;
        ctx.fillRect(...this.getApparentPosition([0, 0]), ...totalSize);
        ctx.strokeRect(...this.getApparentPosition([0, 0]), ...totalSize);

        // Render Pixels
        await renderDesign(canvas, designMatrix, { grid: true, ...this.view });


        // Render frame
        const frame = designMatrix.frame;
        const frameScale = designMatrix.size[0] * this.view.blockSize / frame.baseSize[0];
        const frameImg = await getImageFromPath(frame.path, frame.baseSize,
            { stroke: "#857A55", strokeWidth: 5 / frameScale });
        const framePos = this.getApparentPosition([0,0]).map(n => Math.floor(n));
        ctx.drawImage(frameImg, ...framePos, ...totalSize);


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
        $(".main-window.design .logs").innerHTML = this.logLines.map(r => r + "").join("<br>");
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
        
        if(action === "paint") {
            changeState = new ChangeState({
                action: "paint",
                type: "design",
                subject: args
            });
        } else if(action === "bucket") {
            // changeState = new ChangeState({
            //     action: "bucket",
            //     type: "design",
            //     subject: args[0],
            //     from: args[1],
            //     to: args[2]
            // });
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

        const pixels = this.matrices.design.pixels;
        if(changeState.action === "paint") {
            for(const [ cell, from, to ] of changeState.subject) {
                pixels[cell[1]][cell[0]] = from;
            }
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

        const pixels = this.matrices.design.pixels;
        if(changeState.action === "paint") {
            for(const [ [ c, r ], from, to ] of changeState.subject) {
                pixels[r][c] = to;
            }
        }

        this.states.changeStatePointer++;

        this.save();
        this.renderAll();
        this.refreshStats();
        this.refreshStatesView();
    },

    save() {
        // this.matrices.embroider.save();
        this.matrices.design.save();
    }
    
};


async function test() {
    // await DesignManager.initialize({});
    // const blocksLayer = DesignManager.components.layers.blocks;
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
    // const embroiderMatrix = EmbroiderMatrix.load("1693030932107-21707");
    // embroiderMatrix.frame = {
    //     baseSize: [ 400, 400 ],
    //     path: "M3 92.8311H397.286L350.143 315.688L341.571 324.26H60.0395L50.1484 315.715L3 92.8311Z"
    // };
    const designMatrix = DesignMatrix.newBlank();
        // DesignManager.log(embroiderMatrix, 2);
    // embroiderMatrix.threads = [];
    // embroiderMatrix.save()
    DesignManager.log(designMatrix.id, 1);
    await DesignManager.initialize({
        designMatrix
    });

    // embroiderMatrix.save()
    // renderThread({
    //     id: `sample-thread`,
    //     orientation: "h",
    //     position: [ 90, 90 ],
    //     size: [ 30, 100 ],
    //     parent: DesignManager.components.layers.blocks
    // })
}

// test();