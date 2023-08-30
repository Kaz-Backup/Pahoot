const DashboardManager = {
    components: {
        main: $(".main-window.dashboard"),
        modals: {
            create: {
                _: createModal("create", $(".main-window.dashboard .modals > .create-modal")),
                compTemplates: {
                    type: $(".main-window.dashboard .create-modal > .sections > .types .type-item"),
                    template: $(".main-window.dashboard .create-modal > .sections > .templates .template-item"),
                },
                sections: {
                    types: $(".main-window.dashboard .modals > .create-modal > .sections > .types"),
                    templates: $(".main-window.dashboard .modals > .create-modal > .sections > .templates"),
                },
                parents: {
                    types: $(".main-window.dashboard .modals > .create-modal .types-selection"),
                    templates: $(".main-window.dashboard .modals > .create-modal .templates-selection"),
                },
                buttons: {
                    continue: $(".main-window.dashboard .create-modal #continue-btn"),
                    templatesBack: $(".main-window.dashboard .create-modal > .sections > .templates .create-back-btn"),
                }
            }
        },
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


    PRODUCT_TYPES: [],
    TEMPLATES: [],

    events: {},

    async initialize(options) {
        this.events = options.events;
        
        const productsIds = getAllProducts();
        this.products = productsIds.map(pid => Product.load(pid));


        // Load product types
        this.PRODUCT_TYPES = [
            { name: "Bag", build: args => Product.Bag(args) }
        ];

        // Load templates
        this.TEMPLATES = [
            { name: "Blank", build: args => DesignMatrix.newBlank(args) }  
        ];
        
        // Restore from previous state
        await this.exitShowcase();

        await this.initGallery();
        await this.initShowcase();
    },

    async initGallery() {
        const components = this.components.gallery;
        
        /** @type {HTMLDivElement} */
        const racks = components.racks;
        racks.innerHTML = "";
    
        // Setup scroll fade
        racks.onscroll = event => {
            const sy = racks.scrollTop;
            const maxScroll = 120;
            const headerOpacity = Math.max(0, maxScroll - sy)/maxScroll;
            components.header.style.transition = "none";
            components.header.style.opacity = headerOpacity;
            setTimeout(() => components.header.style.transition = "700ms ease",100);
            
        };

        
        // Setup buttons
        components.buttons.create.onclick = () => this.create();

        // Show products
        const products = this.products;
        const maxPPR = 3;
        const maxRacks = Math.ceil(products.length / maxPPR) || 1;
        const elements = [];
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

                elements.push(productElement);
            }

            racks.appendChild(rackElement);
        }

        elements.forEach((p, pi) => setTimeout(() => p.classList.add("ready"), 300 + pi*150));
    },

    async initShowcase() {
        const components = this.components.showcase;
        const previewsParent = components.previews;

        previewsParent.innerHTML = "";

        // Setup previews
        for(let pi = -1; pi <= this.products.length; pi++) {
            const product = this.products[pi];
            const previewElement = components.templates.preview.cloneNode(true);
            previewElement.classList.remove("template");

            if(product) {
                previewElement.id = `showcase-preview-${product.id}`;
                const canvas = previewElement.querySelector("canvas");
                await renderProduct(canvas, product);

                previewElement.onclick = () => {
                    this.showcaseActivate(product, previewElement);
                }
            } else {
                previewElement.classList.add("empty");
            }

            const x = this.getShowcasePosition(pi);
            previewElement.style.left = x;
            
            previewsParent.appendChild(previewElement);
        }

        // Setup buttons
        components.buttons.back.onclick = () => this.exitShowcase();
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

        
        
        targetPreview.style.left = fx + scrollX;
        targetPreview.style.transition = "none";
        targetPreview.style.top = fy;
        targetPreview.style.width = `${fw}px`;
        targetPreview.style.height = `${fh}px`;
        targetPreview.style.opacity = 1;
        targetPreview.style.transform = "none";

        setTimeout(() => { 
            targetPreview.style.opacity = 1;
            targetPreview.style.transition = "800ms ease";
            this.components.main.classList.add("showcasing");
            targetPreview.classList.add("active");
            const x = this.getShowcasePosition(this.products.findIndex(p => p.id === product.id));
            
            targetPreview.style.left = x;
            targetPreview.style.top = 120;
            targetPreview.style.width = this.view.previewWidth;
            targetPreview.style.height = this.view.previewWidth;
        }, 0);

        this.components.showcase.name.innerText = product.name;
        this.components.showcase.buttons.customize.onclick = () => this.events.onCustomize(product);
    },

    showcaseActivate(product, element) {
        const previewsParent = this.components.showcase.previews;
        const previewsParentWidth = previewsParent.getBoundingClientRect().width;
        const previewWidth = this.view.previewWidth;
        const activeX = this.getShowcasePosition(this.products.findIndex(p => p.id === product.id));
        const scrollX = activeX + previewWidth/2 - previewsParentWidth/2;
        previewsParent.scrollTo({ left: scrollX, behavior: "smooth" });

        [...this.components.showcase.previews.querySelectorAll(".preview")].forEach(p => p.classList.remove("active"));
        element.classList.add("active");
        
        // Set name
        setTimeout(() => this.components.showcase.name.innerText = product.name, 300);
        this.components.showcase.buttons.customize.onclick = () => this.events.onCustomize(product);
    },

    exitShowcase() {
        const activePreview = this.components.showcase.previews.querySelector(".preview.active");
        if(!activePreview) return;
        this.components.main.classList.remove("showcasing");
        activePreview.style.transition = "150ms ease-out";
        activePreview.classList.remove("active"); 
    },


    async create() {
        const modalComponents = this.components.modals.create;
        const modal = modalComponents._;

        const states = {
            section: "types",
            activeTypeIndex: 0,
            activeTemplateIndex: 0
        };

        function showSection(section) {
            states.section = section;
            [ "types", "templates" ].forEach(s =>
                s === section ? modal.classList.add(s) : modal.classList.remove(s));
        }


        // Setup buttons
        modalComponents.buttons.continue.onclick = () => {
            if(states.section === "types") showSection("templates");
            else if(states.section === "templates") this.makeProduct({ 
                type: this.PRODUCT_TYPES[states.activeTypeIndex],
                template: this.TEMPLATES[states.activeTemplateIndex] 
            })
        };

        modalComponents.buttons.templatesBack.onclick = () => {
            if(states.section === "templates") showSection("types");
        };


        // Render types
        const typesParent = modalComponents.parents.types;
        typesParent.innerHTML = "";

        const typeElements = [];
        function setActiveType(index) {
            states.activeTypeIndex = index;
            typeElements.forEach((e, i) => i === index ?
                e.classList.add("active") : e.classList.remove("active"));

            const activeType = DashboardManager.PRODUCT_TYPES[index];
            modalComponents.buttons.templatesBack.querySelector("label").innerText = activeType.name;
            const canvas = modalComponents.buttons.templatesBack.querySelector("canvas");
            renderProduct(canvas, activeType.build(), { qualityScale: 1 });
        }

        for(let i = 0; i < this.PRODUCT_TYPES.length; i++) {
            const typeElement = modalComponents.compTemplates.type.cloneNode(true);
            typeElement.classList.remove("template");

            const typeItem = this.PRODUCT_TYPES[i];
            const sample = typeItem.build();
            const canvas = typeElement.querySelector("canvas");
            await renderProduct(canvas, sample, { qualityScale: 1 });

            typeElement.querySelector(".label").innerText = typeItem.name;
            
            typesParent.appendChild(typeElement);
            typeElements.push(typeElement);

            typeElement.onclick = () => setActiveType(i);
        }

        setActiveType(states.activeTypeIndex);




        // Render design templates
        const templatesParent = modalComponents.parents.templates;
        templatesParent.innerHTML = "";

        function setActiveTemplate(index) {
            states.activeTemplateIndex = index;
            templateElements.forEach((e, i) => i === index ?
                e.classList.add("active") : e.classList.remove("active"));
        }
        
        const templateElements = [];
        for(let i = 0; i < this.TEMPLATES.length; i++) {
            const templateElement = modalComponents.compTemplates.template.cloneNode(true);
            templateElement.classList.remove("template");

            const templateItem = this.TEMPLATES[i];
            const canvas = templateElement.querySelector("canvas");
            await renderDesign(canvas, templateItem.build());

            templateElement.querySelector(".label").innerText = templateItem.name;

            templatesParent.appendChild(templateElement);
            templateElements.push(templateElement);

            templateElement.onclick = () => setActiveTemplate(i);
        }

        setActiveTemplate(states.activeTemplateIndex);


        

        // Show templates
        showSection("types");
        modal.show();
    },

    makeProduct(options) {
        this.events.onCreate(options);
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

// test();