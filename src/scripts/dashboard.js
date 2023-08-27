const DashboardManager = {
    components: {
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
        }
    },

    /** @type {Product[]} */
    products: [],

    async initialize() {
        const productsIds = LocalDB.get("products");
        this.products = productsIds.map(pid => Product.load(pid));
        

        await this.initGallery();

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
                const canvas = productElement.querySelector("canvas");
                renderProduct(canvas, product, { qualityScale: 1 });

                productElement.querySelector(".tag").innerText = product.name;
                rackElement.appendChild(productElement);
            }

            racks.appendChild(rackElement);
        }
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