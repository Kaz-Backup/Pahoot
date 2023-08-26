const canvas = document.querySelector("canvas");
const embroiderMatrix = EmbroiderMatrix.load("1693030932107-21707");
const product = Product.Bag({ embroiderScale: 2 });
// product.parts.find(p => p.label === "Front")
//     .layers[0].embroiderMatrix.threads = embroiderMatrix.threads;

renderProduct(canvas, product);