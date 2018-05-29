const {app, BrowserWindow} = require("electron")
const url = require('url')
const path = require('path')
const Config = require('electron-config')
const config = new Config()
require("electron-debug")({ enabled: true})



function createWindow() {
    win = new BrowserWindow({width:800, height:600})
    win.loadURL(url.format({
        pathname: __dirname + '/build/index.html',
        protocol: 'file:',
        slashes: true
    }))

}


function startApp() {
    createWindow()

}


app.on('ready', startApp)


