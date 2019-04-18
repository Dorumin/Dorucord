// Script I only made for Robyn that's too stupid to install BetterDiscord
// She probably won't even be able to make it autorun when her device startups either
const asar = require('asar');
const path = require('path');

// Honestly I'm very doubtful she'll even read this before running it
// Or even install the necessary packages
const getDir = require('./src/discorddir.js');
const readTar = require('./src/readtar.js');
const monkeyPatch = require('./src/monkeypatch.js');

const extractPath = readTar(getDir());

monkeyPatch(getDir(), extractPath);