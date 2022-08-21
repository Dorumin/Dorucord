const createTab = (headerText, contents) => {
    return ui.div({
        class: 'tab',
        children: [
            ui.div({
                class: 'tab-header',
                text: headerText
            }),
            ui.div({
                class: 'tab-contents',
                children: contents ?? []
            })
        ]
    })
}

const wrapper = ui.div({
    class: 'devbyn-wrapper',
    children: [
        ui.div({
            class: 'buttons',
            children: [
                ui.div({
                    class: 'pseudo-selector'
                }),
                ui.div({
                    class: 'minimize'
                }),
                ui.div({
                    class: 'close'
                })
            ]
        }),
        ui.div({
            class: 'tabs',
            children: [
                createTab('Selector'),
                createTab('Stylesheet')
            ]
        })
    ]
});