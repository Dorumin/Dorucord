(() => {
    function getTagsWithPrefix(prefix, check) {
        const globalProps = Object.getOwnPropertyNames(window);
        const tagNames = globalProps
            .filter(prop =>
                prop.slice(0, prefix.length) === prefix &&
                prop.slice(-7) === 'Element'
            )
            .filter(prop => {
                const tagName = prop.slice(prefix.length, -7);
                if (tagName === '') return false;

                return check(tagName);
            })
            .map(prop => prop.slice(prefix.length, -7).toLowerCase());


        return tagNames;
    }

    function getHTMLTags() {
        return getTagsWithPrefix('HTML', tagName => {
            if (document.createElement(tagName) instanceof HTMLUnknownElement) {
                return false;
            } else {
                return true;
            }
        });
    }

    function getSVGTags(){
        return getTagsWithPrefix('HTML', () => true);
    }

    const ui = (obj) => {
        if (!obj) return document.createDocumentFragment();
        if (obj instanceof Node) return obj;
        if (!obj.tag) throw new Error('No tag');
        if (obj.hasOwnProperty('if') && !obj.if) return null;


        let el;

        if (ui.htmlTags.includes(obj.tag) || !ui.svgTags.includes(obj.tag)) {
            el = document.createElement(obj.tag);
        } else {
            el = document.createElementNS(
                'http://www.w3.org/2000/svg',
                obj.tag
            );
        }

        for (let property in obj) {
            const val = obj[property];

            switch (property) {
                case 'html':
                    el.innerHTML = val;
                    break;
                case 'text':
                    el.appendChild(document.createTextNode(val));
                    break;
                case 'child':
                    el.appendChild(ui(val));
                    break;
                case 'children':
                    for (const elem of val) {
                        el.appendChild(ui(elem));
                    }
                    break;
                case 'classes':
                    if (val instanceof Array) {
                        el.setAttribute('class', val.join(' '));
                    } else {
                        for (const key in val) {
                            const v = val[key];

                            if (v) {
                                el.classList.add(key);
                            }
                        }
                    }
                    break;
                case 'events':
                    for (const key in val) {
                        el.addEventListener(key, val[key]);
                    }
                    break;
                case 'style':
                    for (const key in val) {
                        let propName = key.replace(/[A-Z]/gm, (c) => `-${c.toLowerCase()}`);

                        if (propName.slice(0, 3) == 'ms-') {
                            propName = '-' + propName;
                        }
                        const v = val[key];
                        const isImportant = v.trim().slice(-10) == '!important';
                        const value = isImportant
                            ? v.slice(0, -10)
                            : v;

                        el.style.setProperty(propName, value, isImportant ? 'important' : '');
                    }
                    // uwu
                    break;
                case 'props':
                    for (const key in val) {
                        el[key] = val[key];
                    }
                    break;
                case 'if':
                case 'tag':
                    break;

                default:
                    el.setAttribute(property, val);
            }
        }

        return el;
    };

    ui.svgTags = getSVGTags();
    ui.htmlTags = getHTMLTags();
    ui.knownTags = ui.htmlTags.concat(ui.svgTags);

    for (const tag of ui.knownTags) {
        ui[tag] = function(obj) {
            obj = obj || {};
            obj.tag = tag;

            return ui(obj);
        };
    }

    module.exports = ui;
})();