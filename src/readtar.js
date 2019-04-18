const path = require('path');
const fs = require('fs');
const asar = require('asar');

module.exports = (dir) => {
    const corePath = path.join(dir, 'modules', 'discord_desktop_core');
    const asarPath = path.join(corePath, 'core.asar');
    const extractPath = path.join(corePath, 'extracted');
    asar.extractAll(asarPath, extractPath);
    return extractPath;
};