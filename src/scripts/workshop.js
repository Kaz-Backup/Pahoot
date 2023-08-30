const WorkshopManager = {
    components: {
        preview: $(".main-window.workshop .preview canvas"),
        name: $(".main-window.workshop .preview .name"),
        templates: {
            part: $(".main-window.workshop .part.template"),
            layer: $(".main-window.workshop .layer.template"),
        },
        parts: $(".main-window.workshop .parts"),
        layers: $(".main-window.workshop .layers"),
        buttons: {
            rename: $(".main-window.workshop #rename-btn"),
            exit: $(".main-window.workshop #exit-btn")
        },
        modals: {
            colorPicker: createModal("color-picker", $(".main-window.workshop .color-picker-modal")),
            rename: createModal("rename", $(".main-window.workshop .rename-modal")),
        }
    },

    /** @type {Product} */
    product: null,

    events: {},

    /**
     * 
     * @param {{ product: Product }} options 
     */
    async initialize(options) {
        this.events = options.events;
        const { product } = options;

        this.product = product;

        // Setup part controls
        const partsParent = this.components.parts;
        partsParent.innerHTML = "";

        for(const part of product.parts) {
            const partElement = this.components.templates.part.cloneNode(true);
            partElement.classList.remove("template");
            partElement.querySelector(".part-label").innerText = part.label;

            const embroideryLayer = part.layers.find(l => l.type === "embroidery");
            let embroiderMatrix = embroideryLayer ? embroideryLayer.embroiderMatrix : null;
            if(embroideryLayer) {
                partElement.classList.add("embroidery");

                // Setup embroidery and design buttons
                partElement.querySelector(".embroider-btn").onclick = () => 
                    this.events.onEmbroider({
                        embroiderMatrix: embroiderMatrix,
                        designMatrix: embroideryLayer.designMatrix
                    });

                partElement.querySelector(".design-btn").onclick = () => 
                    this.events.onDesign({
                        designMatrix: embroideryLayer.designMatrix
                    });
            }

            const colors = part.colors || [];
            const layers = part.layers;

            const layersParent = partElement.querySelector(".layers");
            for(let i = 0; i < colors.length; i++) {
                const layerElement = this.components.templates.layer.cloneNode(true);
                layerElement.classList.remove("template");
                layerElement.setAttribute("id", `color-${part.id}-${i}`);

                // layerElement.querySelector(".color-bar").style.backgroundColor = colors[i];
                
                const dependentLayers = layers.filter(l => l.type === "shape" && l.colorIndex === i);
                const label = dependentLayers.map(l => l.label).filter(l => l).join(", ");
                layerElement.querySelector(".layer-label").innerText = label;
                if(!label) layerElement.classList.add("no-label");

                // Setup button
                const pickButton = layerElement.querySelector("button");
                pickButton.onclick = async () => {
                    const pickedColor = await this.pickColor(colors[i]);
                    if(pickedColor) {
                        colors[i] = pickedColor;
                        if(embroiderMatrix) embroiderMatrix.weavedColors.fill = pickedColor;
                    }
                    this.refreshStates();
                    this.save();
                };

                layersParent.appendChild(layerElement);
            }

            partsParent.appendChild(partElement);
        }

        // Setup buttons
        const buttons = this.components.buttons;
        buttons.rename.onclick = async () => {
            const name = await this.getName();
            if(name) {
                this.product.name = name;
                this.refreshStates();
                this.save();
            }
        };
        buttons.exit.onclick = () => this.events.onExit();

        this.refreshStates();
    },

    async pickColor(currentColor) {
        return new Promise(resolve => {
            const colorPickerModal = this.components.modals.colorPicker;
            const colorsParent = colorPickerModal.get(".color-selection");
            colorsParent.innerHTML = "";
            for(const color of COLORS) {
                const colorItem = createElement("div", { 
                    classList: [ "color-item", color === currentColor ? "active": "inactive" ],
                    attributes: { style: `background-color: ${color}`},
                    listeners: { click() {
                        resolve(color);
                        colorPickerModal.close();
                    }}
                });

                colorsParent.appendChild(colorItem);
            }
            
            colorPickerModal.onInternalClosed = () => resolve(null);
            colorPickerModal.show();
        });
    },

    async getName() {
        return new Promise(resolve => {
            const renameModal = this.components.modals.rename;
            const saveBtn = renameModal.get(".save-btn");
            const input = renameModal.get("input");
            input.value = this.product.name;
            saveBtn.onclick = () => {
                resolve(input.value);
                renameModal.close();
            };
            
            renameModal.onInternalClosed = () => resolve(null);
            renameModal.show();
            input.focus();
        });
    },

    refreshStates() {
        // Set name
        this.components.name.innerText = this.product.name;

        // Set colors
        const partsParent = this.components.parts;
        for(const part of this.product.parts) {
            const colors = part.colors || [];
            for(let i = 0; i < colors.length; i++) {
                const layerId = `color-${part.id}-${i}`;
                const colorBar = partsParent.querySelector(`#${layerId} .color-bar`);
                if(colorBar) colorBar.style.backgroundColor = colors[i];
            }
        }
        this.renderPreview();
    },

    renderPreview() {
        const canvas = this.components.preview;
        renderProduct(canvas, this.product);
    },

    save() {
        this.product.save();
    }
}

function test() {
    const embroiderMatrix = EmbroiderMatrix.load("1693030932107-21707");
    const product = Product.Bag({ embroiderScale: 2 });
    // const product = Product.load("1693116715901-83384");
    product.name = "My Bag";
    // product.save(true);

    WorkshopManager.initialize({ product });
}

// test();