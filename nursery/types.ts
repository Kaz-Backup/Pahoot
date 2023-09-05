
type Product = {
    type: "handbag",
    id: string,
    name: string,
    custom: {
        colors: { [key: string]: string },
        designMatrices: { [key: string]: Object },
        embroiderMatrices: { [key: string]: Object }
    },
    customParts: {
        label: string,
        layers: {
            label: string,
            type: "color" | "embroidery",
            ref: string
        }[]
    }[]

};