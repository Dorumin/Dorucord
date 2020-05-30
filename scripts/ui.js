(function() {
    const knownTags = [
        'div',
        'span',
        'a',
        'img',
        'input',
        'button',
        'textarea',
        'canvas',
        'form',
        'pre',
        'code',
        'style',
        'script',

        'br',
        'hr',

        'b',
        'i',
        's',

        'nav',
        'article',
        'header',
        'footer',

        'svg',
        'path',
        'g',
        'linearGradient',
        'ellipse',
        'stop'
    ];

    const svgTags = [
        'svg',
        'circle',
        'path',
        'use',
        'path',
        'g',
        'linearGradient',
        'stop',
    ];

    function build(attr) {
        if (!attr.tag) throw new Error('No tag found');
        if (attr.hasOwnProperty('if') && !attr.if) return document.createDocumentFragment();

        let el;

        if (svgTags.includes(attr.tag)) {
            el = document.createElementNS(
                'http://www.w3.org/2000/svg',
                attr.tag
            );
        } else {
            el = document.createElement(attr.tag);
        }

        for (let property in attr) {
            const val = attr[property];

            switch (property) {
                case 'html':
                    if (Array.isArray(val)) {
                        throw new Error('Array in html');
                    } else if (val instanceof Node) {
                        throw new Error('Node in html');
                    } else {
                        el.innerHTML = val;
                    }
                    break;
                case 'text':
                    el.appendChild(document.createTextNode(val));
                    break;
                case 'child':
                    if (val) {
                        el.appendChild(val);
                    }
                    break;
                case 'children':
                    const fag = document.createDocumentFragment();
                    for (const elem of val) {
                        fag.appendChild(elem);
                    }

                    el.appendChild(fag);
                    break;
                case 'classes':
                    el.setAttribute('class', val.join(' '));
                    break;
                case 'events':
                    for (const key in val) {
                        el.addEventListener(key, val[key]);
                    }
                    break;
                case 'style':
                    for (const key in val) {
                        el.style[key] = val[key];
                    }
                    break;
                case 'props':
                    for (const key in val) {
                        console.log(el, val);
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
    }

    function boundTag(tag) {
        return function(attr) {
            attr = attr || {};
            attr.tag = tag;

            return build(attr);
        };
    }

    build.text = function(text) {
        return document.createTextNode(text);
    };

    for (const tag of knownTags) {
        build[tag] = boundTag(tag);
    }

    window.build = build;
})();