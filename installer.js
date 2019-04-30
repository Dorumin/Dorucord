// Script I only made for Robyn that's too stupid to install BetterDiscord
const asar = require('asar');
// She probably won't even be able to make it autorun when her device startups either
const path = require('path');
// Honestly I'm very doubtful she'll even read this before running it
const ps = require('ps-node');
// Or even install the necessary packages
const getDir = require('./src/discorddir.js');
// Or it'll probably not even run on macs in the first place
const readTar = require('./src/readtar.js');
// Why do I even bother doing these things for her, tbh
const monkeyPatch = require('./src/monkeypatch.js');
// Or maybe I'm pretending to be nice when I'm just doing this for myself
const killAll = require('./src/killall.js');

// Yeah, I'm too selfish for any of that, fuck being nice
ps.lookup({
    command: '.*app-\\d+.\\d+.\\d+.*discord.*'
}, (_, processes) => {
    killAll(processes).then(() => {
        const extractPath = readTar(getDir());
        
        monkeyPatch(getDir(), extractPath);    
    });
});