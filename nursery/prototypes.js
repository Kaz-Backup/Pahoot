
// const Product = {
//     ...metadata, 
//     embroideryLayers: [
//         { embroiderMatrix, designMatrix }
//     ],
//     colors: [ "", "" ],
//     parts: [
//         { type: "shape", }
//     ]
// };

// Product Colors
//  0: Main
//  1: Edge
//  2: Edge darker
//  



const xml2js = require("xml2js");
const xml2json = require("xml2json");
const fs = require("fs/promises");

async function readFile(path) {
    return await fs.readFile(path, "utf-8");
}


const Parser = new xml2js.Parser({
    attrkey: "attributes",
    childkey: "children",
    explicitChildren: true,
    preserveChildrenOrder: true,
    explicitRoot: true,
    explicitArray: true,
    attrValueProcessors: [ function (value, name) {
        if(!isNaN(Number(value))) return Number(value);
        return value;
    } ]
});


async function parseXML(xml) {
    const preparsed = await Parser.parseStringPromise(xml);

    function cleanObj(obj, parent) {

        let label;
        let type;
        let ref;
        if(obj.attributes && obj.attributes.id) {
            const id = obj.attributes.id.split("_")[0];
            const [ _label, _type ] = id.split("@");
            label = _label ? _label : undefined;

            if(_type) {
                const [ __type, _ref ] = _type.split("#");
                type = __type;
                if(_ref) ref = Number(_ref);
            }
        }

        if(parent && parent.name === "g" && ["color", "fixed"].includes(parent.type) && !type) {
            type = parent.type;
            if(parent.ref) ref = parent.ref;
        }

        const cleaned = {
            name: obj["#name"],
            type, label, 
            ...obj.attributes,
            id: undefined,
        };

        cleaned.children = obj.children ? 
        obj.children.map(c => cleanObj(c, cleaned)) : undefined;

        return cleaned;
    }


    const rootAttributes = preparsed.svg.attributes;
    console.log(preparsed.svg);
    const rootElement = preparsed.svg.attributes.id === "@root" ? preparsed.svg :
        preparsed.svg.children.find(c => c.attributes.id === "@root");
    

    return cleanObj({ ...rootElement, attributes: { type: "root", ...rootAttributes }});
}

function parseXML2(xml) {
    return JSON.parse(xml2json.toJson(xml));
}

async function test() {
    // const json = await parseXML(await readFile("../assets/svgs/Bag.svg"));
    const json = await parseXML(await readFile("../assets/svgs/Bag2.svg"));
    fs.writeFile("./dump/bag-json-3.json", JSON.stringify(json, null, 2));
    console.log(json);
}

test();

