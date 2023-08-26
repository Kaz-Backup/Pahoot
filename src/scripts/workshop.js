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
        }
    },

    /** @type {Product} */
    product: null,

    /**
     * 
     * @param {{ product: Product }} options 
     */
    async initialize(options) {
        const { product } = options;

        this.product = product;
    
        // Set name
        this.components.name.innerText = product.name;

        // Setup part controls
        const partsParent = this.components.parts;
        for(const part of product.parts) {
            const partElement = this.components.templates.part.cloneNode(true);
            partElement.classList.remove("template");
            partElement.querySelector(".part-label").innerText = part.label;

            const embroideryLayer = part.layers.find(l => l.type === "embroidery");
            if(embroideryLayer) {
                partElement.classList.add("embroidery");
            }

            const colors = part.colors || [];
            const layers = part.layers;
            const layersParent = partElement.querySelector(".layers");
            for(let i = 0; i < colors.length; i++) {
                const layerElement = this.components.templates.layer.cloneNode(true);
                layerElement.classList.remove("template");

                layerElement.querySelector(".color-bar").style.backgroundColor = colors[i];
                
                const dependentLayers = layers.filter(l => l.type === "shape" && l.colorIndex === i);
                const label = dependentLayers.map(l => l.label).filter(l => l).join(", ");
                layerElement.querySelector(".layer-label").innerText = label;
                if(!label) layerElement.classList.add("no-label");
                layersParent.appendChild(layerElement);
            }

            partsParent.appendChild(partElement);
        }


        this.renderPreview();
    },

    renderPreview() {
        const canvas = this.components.preview;
        renderProduct(canvas, this.product);
    }
}

function test() {
    const embroiderMatrix = EmbroiderMatrix.load("1693030932107-21707");
    const product = Product.Bag({ embroiderScale: 2 });
    product.name = "My Bag";

    WorkshopManager.initialize({ product });
}

test();