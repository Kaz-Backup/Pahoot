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

function hexToRGBA(hex, opacity) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function generateId() {
    return `${Date.now()}-${Math.floor(Math.random()*89999 + 10000)}`;
}

function createModal(key, element) {
    function closeModal() {
        element.parentElement.classList.remove(key);
    };

    function showModal() {
        element.parentElement.classList.add(key);
    };

    const modal = {
        onInternalClosed: () => {},
        get(selector) { return element.querySelector(selector); },
        close: () => closeModal(),
        show: () => showModal()
    };

    const closeBtn = element.querySelector(".close-btn");
    if(closeBtn) closeBtn.onclick = () => {
        closeModal();
        modal.onInternalClosed();
    }
    
    return modal;
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

const COLORS = [
    "#D9D9D9", "#C7C1B6", "#7E675C",
    "#4E3F39", "#3F3F3F", "#3B3938",
    "#E7B7C5", "#B057A1", "#AD4564",
    "#922C4A", "#712F47", "#6C1C39",
    "#F6C5B6", "#F4BF99", "#FA8C6A",
    "#D8884F", "#AD5E25", "#864E26",
    "#ECDE97", "#DCD87E", "#EACC0A",
    "#EAB90A", "#BC9A42", "#7F7647",
    "#CCDDAF", "#7DC48D", "#4B9B5C",
    "#41703A", "#3C5217", "#1E3E27",
    "#84D5D5", "#4D92C3", "#426D8B",
    "#364198", "#3E4474", "#382364"
];