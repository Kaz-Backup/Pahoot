const xml2js = require("xml2js");
const fs = require("fs/promises");

function parseXML(xml) {
    return new Promise((resolve, reject) => {
        xml2js.parseString(xml, (err, result) => {
            if(err) return reject(err);
            resolve(result);
        });
    });
}
async function execute() {
    const source = await fs.readFile("./colors.svg", "utf-8");
    const { svg: { rect } } = await parseXML(source);
    const boxes = rect.map(r => 
        ({ x: Number(r.$.x) || 0, y: Number(r.$.y) || 0, color: r.$.fill }))
        .sort((a, b) => {
            if(a.y !== b.y) return a.y - b.y;
            return a.x - b.x;
        });
    const colors = boxes.map(b => b.color);
    console.log(colors);
}

execute();
