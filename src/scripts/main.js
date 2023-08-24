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