const DashboardManager = {
    components: {
        main: $(".main-window.dashboard"),
        gallery: {
            header: $(".main-window.dashboard > .gallery > header"),
            racks: $(".main-window.dashboard > .gallery .racks"),
            buttons: {
                create: $(".main-window.dashboard > .gallery #create-btn"),
                info: $(".main-window.dashboard > .gallery #info-btn"),
                settings: $(".main-window.dashboard > .gallery #settings-btn"),
            },
            templates: {
                rack: $(".main-window.dashboard > .gallery .rack.template"),
                product: $(".main-window.dashboard > .gallery .product.template"),
            }
        },
        showcase: {
            previews: $(".main-window.dashboard > .showcase .previews"),
            name: $(".main-window.dashboard > .showcase .name"),
            templates: {
                preview: $(".main-window.dashboard > .showcase .preview.template")
            },
            buttons: {
                back: $(".main-window.dashboard > .showcase #back-btn"),
                customize: $(".main-window.dashboard > .showcase #customize-btn"),
            }
        }
    },

    /** @type {Product[]} */
    products: [],

    view: {
        previewWidth: 450,
        previewGap: 100
    },

    async initialize() {
        const productsIds = LocalDB.get("products");
        this.products = productsIds.map(pid => Product.load(pid));

        // Temporary
        this.products.forEach(p => p.id = generateId());
        

        await this.initGallery();
        await this.initShowcase();

    },

    async initGallery() {
        const components = this.components.gallery;
        
        /** @type {HTMLDivElement} */
        const racks = components.racks;
    
        // Setup scroll fade
        racks.onscroll = event => {
            const sy = racks.scrollTop;
            const maxScroll = 120;
            const headerOpacity = Math.max(0, maxScroll - sy)/maxScroll;
            components.header.style.opacity = headerOpacity;
        };

        
        // Setup buttons
        components.buttons.info.onclick = () => {
            this.components.main.classList.add("showcasing");
        };

        // Show products
        const products = this.products;
        const maxPPR = 3;
        const maxRacks = Math.ceil(products.length / maxPPR) || 1;
        for(let i = 0; i < maxRacks; i++) {
            const rackElement = components.templates.rack.cloneNode(true);
            rackElement.classList.remove("template");
            for(let ii = 0; ii < maxPPR; ii++) {
                const pi = maxPPR*i + ii;
                if(pi >= products.length) break;

                const product = products[pi];
                const productElement = components.templates.product.cloneNode(true);
                productElement.classList.remove("template");
                productElement.id = `gallery-product-${product.id}`;
                const canvas = productElement.querySelector("canvas");
                renderProduct(canvas, product, { qualityScale: 1 });

                productElement.querySelector(".tag").innerText = product.name;
                rackElement.appendChild(productElement);

                productElement.querySelector(".preview").onclick = () => {
                    this.showcaseProduct(product);
                }
            }

            racks.appendChild(rackElement);
        }
    },

    async initShowcase() {
        const components = this.components.showcase;
        const previewsParent = components.previews;

        // Setup previews
        for(let pi = -1; pi <= this.products.length; pi++) {
            const product = this.products[pi];
            const previewElement = components.templates.preview.cloneNode(true);
            previewElement.classList.remove("template");

            if(product) {
                previewElement.id = `showcase-preview-${product.id}`;
                const canvas = previewElement.querySelector("canvas");
                await renderProduct(canvas, product);
            }

            const x = this.getShowcasePosition(pi);
            previewElement.style.left = x;
            
            previewsParent.appendChild(previewElement);
        }

        // Add padding
    },

    getShowcasePosition(pi) {
        return (this.view.previewWidth + this.view.previewGap)*(pi + 1);
    },

    showcaseProduct(product) {
        const fromCanvas = this.components.gallery.racks.querySelector(`#gallery-product-${product.id} canvas`);
        const fromBounds = fromCanvas.getBoundingClientRect();
        const fx = fromBounds.left;
        const fy = fromBounds.top;
        const fw = fromBounds.width;
        const fh = fromBounds.height;

        const targetPreview = this.components.showcase.previews.querySelector(`#showcase-preview-${product.id}`);

        const previewsParent = this.components.showcase.previews;
        const previewsParentWidth = previewsParent.getBoundingClientRect().width;
        const previewWidth = this.view.previewWidth;
        const activeX = this.getShowcasePosition(this.products.findIndex(p => p.id === product.id));
        const scrollX = activeX + previewWidth/2 - previewsParentWidth/2;
        previewsParent.scrollLeft = scrollX;

        targetPreview.classList.add("active");
        targetPreview.style.left = fx + scrollX;
        targetPreview.style.transition = "none";
        targetPreview.style.top = fy;
        targetPreview.style.width = `${fw}px`;
        targetPreview.style.height = `${fh}px`;
        targetPreview.style.opacity = 1;

        setTimeout(() => { 
            targetPreview.style.transition = "900ms ease";
            this.components.main.classList.add("showcasing");
            const x = this.getShowcasePosition(this.products.findIndex(p => p.id === product.id));
            targetPreview.style.left = x;
            targetPreview.style.top = 120;
            targetPreview.style.width = this.view.previewWidth;
            targetPreview.style.height = this.view.previewWidth;
        }, 0);
        
    }
}

function test() {
    // console.log(LocalDB.getKeys());

    // const product = Product.Bag();
    // product.name = "My Bag";
    // product.save(true);
    // LocalDB.save("products", new Array(10).fill(0).map(c => product.id));

    // LocalDB.save("products", [Product.Bag().id]);
    DashboardManager.initialize();
}

test();