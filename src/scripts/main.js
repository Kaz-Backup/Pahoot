function $(selector) {
    return document.querySelector(selector);
}

function createElement(tagName, { classList, id, listeners, innerHTML, children, attributes, fields } = {}) {
    const element = document.createElement(tagName);
    if(classList) for(const classTag of classList) element.classList.add(classTag);
    if(id) element.setAttribute("id", id);
    if(listeners) {
        for(const event in listeners) {
            element.addEventListener(event, listeners[event]);
        }
    }
    if(innerHTML) element.innerHTML = innerHTML;
    if(children) element.append(...children);
    if(attributes) for(const attrName in attributes) {
        element.setAttribute(attrName, attributes[attrName]);
    }
    if(fields) for(const fieldName in fields) {
        element[fieldName] = fields[fieldName];
    }

    return element;
}

function generateId() {
    return `${Date.now()}-${Math.floor(Math.random()*89999 + 10000)}`;
}

const LocalDB = {
    getSaveKey(key) {
        return `pahoot-values-${key}`;
    },

    save(key, value) {
        const saveKey = this.getSaveKey(key);
        localStorage.setItem(saveKey, JSON.stringify(value));
        this.addToKeys(saveKey);
    },

    get(key) {
        const saveKey = this.getSaveKey(key);
        return JSON.parse(localStorage.getItem(saveKey));
    },

    addToKeys(key) {
        const collectionKey = "___keys";
        let allKeys = this.get(collectionKey);
        if(!allKeys) allKeys = [];

        if(!allKeys.includes(key)) allKeys.push(key);
        localStorage.setItem(this.getSaveKey(collectionKey),
            JSON.stringify(allKeys));
    }
};
