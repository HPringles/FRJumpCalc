const {app, BrowserWindow} = require("electron")
const url = require('url')
const path = require('path')
const Config = require('electron-config')
const config = new Config()
const electronOauth2 = require('electron-oauth2');
require("electron-debug")({ enabled: true})


let authConfig = {
    clientId: '588d74ab-0a60-4380-b854-04ec702a4e02',
    clientSecret: "SECRET_HERE",
    authorizationUrl: 'https://dev.fuelrats.com/authorize',
    tokenUrl: 'https://dev.api.fuelrats.com/oauth2/token',
    useBasicAuthorizationHeader: false,
    redirectUri: 'https://localhost'
};

function createWindow() {
    win = new BrowserWindow({width:800, height:600})
    win.loadURL(url.format({
        pathname: __dirname + '/build/index.html',
        protocol: 'file:',
        slashes: true
    }))

}

function getTokenFromAuth(){
    const windowParams = {
        alwaysOnTop: true,
        autoHideMenuBar: false,
        webPreferences: {
            nodeIntegration: false
        }
    }

    const options = {
        scope: 'rescue.read',
        accessType: 'code'
    };

    const myApiOauth = electronOauth2(authConfig, windowParams);

    myApiOauth.getAuthorizationCode(options)
        .then(token => {
            // use your token.access_token
            config.set('token', token.access_token)
            console.log("token created, woo!")
            createWindow()

        });
}

function startApp() {
    if (!config.has('token')){
        getTokenFromAuth()
    } else {
        createWindow()
    }

}


app.on('ready', startApp)


