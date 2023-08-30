const GameManager = {
    components: {
        windows: {
            dashboard: $(".main-window.dashboard"),
            workshop: $(".main-window.workshop"),
            design: $(".main-window.design"),
            embroidery: $(".main-window.embroidery"),
        },
        managers: {
            dashboard: DashboardManager,
            workshop: WorkshopManager,
            design: DesignManager,
            embroidery: EmbroideryManager
        }
    },

    states: {
        window: ""
    },

    async gotoWindow(window, args) {
        const windows = this.components.windows;
        const currentWindow = this.states.window;
        if(currentWindow) windows[currentWindow].classList.remove("active");

        this.states.window = window;
        if(args) await this.components.managers[window].initialize(args);
        windows[window].classList.add("active");
    },

    openDashboard() {
        this.gotoWindow("dashboard", {
            events: {
                onCreate: options => {
                    const product = GameManager.createProduct(options);
                    this.openWorkshop(product);
                },
                onCustomize: product => this.openWorkshop(product)
            }
        });
    },

    openWorkshop(product) {
        this.gotoWindow("workshop", {
            product,
            events: {
                onExit: () => this.openDashboard(),
                onEmbroider: args => this.openEmbroidery(product, args),
                onDesign: args => this.openDesigner(product, args),
            }
        });
    },

    openEmbroidery(product, options) {
        this.gotoWindow("embroidery", {
            ...options,
            events: {
                onExit: () => this.openWorkshop(product)
            }
        });
    },

    openDesigner(product, options) {
        this.gotoWindow("design", {
            ...options,
            events: {
                onExit: () => this.openWorkshop(product)
            }
        });
    },

    async initialize() {
        this.openDashboard();
    },


    createProduct(options) {
        const { type, template, size } = options;
        
        /** @type {Product} */
        const product = type.build({ size });
        const frame = product.getEmbroiderMatrix().frame;
        const designMatrix = template.build({ size, frame });
        product.setDesignMatrix(designMatrix);

        product.save(true);
        addProduct(product);

        return product;
    }
};


GameManager.initialize();