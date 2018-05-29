const WebSocket = require("ws")
const request = require("request")
const Config = require('electron-config')
const fs = require("fs")
const config = new Config()
let wsURL = ''

if (config.has('dev')) {
    if (config.get('dev') === true) {
        wsURL = 'wss://dev.api.fuelrats.com'
    } else {
        wsURL = 'wss://api.fuelrats.com'
    }

} else {
    wsURL = 'wss://api.fuelrats.com'
}

const {LogWatcher} = require("ed-logwatcher")
const DEFAULT_SAVE_DIR = require("path").join(
    require('os').homedir(),
    'Saved Games',
    'Frontier Developments',
    'Elite Dangerous'
)


ws = new WebSocket(wsURL);


const watcher = new LogWatcher(DEFAULT_SAVE_DIR, 6);

let connected = false;



ws.on('open', () => {
    ws.send("{\"action\":[\"rescues\",\"read\"],\"meta\":{\"event\":\"rescueRead\"},\"status\":{\"$not\":\"closed\"}}")
});





function getSysInfo (sys) {
    return new Promise((resolve, reject) => {
        try {
            sys = encodeURI(sys.toUpperCase())
            console.log(sys)
        } catch(err) {
            console.log(err + " catching error at encode url")
            let sysInfo = {

                x: undefined,
                y: undefined,
                z: undefined,
                found: false
            }

            resolve(sysInfo)
        }



            request("https://system.api.fuelrats.com/systems?filter[name:eq]=" + sys + "&include=bodies.stations", {json: true}, (err, res, body) => {
                if (err) {reject(err)}


                if (body.data[0]) {
                     sysInfo = {

                        x: body.data[0].attributes.x,
                        y: body.data[0].attributes.y,
                        z:body.data[0].attributes.z,
                        found: true
                    }
                } else {
                    sysInfo = {

                        x: undefined,
                        y: undefined,
                        z: undefined,
                        found: false
                    }
                }



                resolve(sysInfo)
            })


    })
}



function calculateJumpsAndDistance(currentSys, targetSys, jumpRange) {
    console.log(currentSys)
    console.log(targetSys)
    let deltaX = currentSys.x - targetSys.x
    let deltaY = currentSys.y - targetSys.y
    let deltaZ = currentSys.z - targetSys.z

    let distanceToRescue = Math.round(Math.sqrt(deltaX ** 2 + deltaY ** 2 + deltaZ ** 2))
    let jumpsToRescue = Math.ceil(distanceToRescue/jumpRange)

    return {
        distance: distanceToRescue,
        jumps: jumpsToRescue
    }


}



angular.module('FRJump', [])
    .controller('frjController', ($scope, $timeout) => {
        $scope.cases = []
        $scope.jumpRange = parseFloat(config.get('jumpRange', 20))
        $scope.ratSystem = ""
        let ratSystem = ""
        let ratSysData = {}


        watcher.on('data', obs => {
            console.log("log data recieved")
            obs.forEach((ob) => {
                try {

                console.log(ob)
                if (ob.event === "FSDJump" || ob.event === "Location") {
                    $timeout(() => {
                        $scope.ratSystem = ob.StarSystem
                        ratSystem = ob.StarSystem
                    });

                    getSysInfo(ratSystem).then((response) => {
                        if (response.found){

                            $scope.cases.forEach((caseData) => {
                                    if (caseData.systemDefined){
                                        let jumpsAndDistance = calculateJumpsAndDistance(response, caseData.clientSysData, $scope.jumpRange)


                                        $timeout(() => {
                                            caseData.distance = jumpsAndDistance.distance
                                            caseData.jumps = jumpsAndDistance.jumps
                                        });
                                    }





                            })
                        }

                    }, (error) => {
                        console.error(error)
                    })
                }
            } catch(TypeError) {
                    console.log("not an FSDJump Event")
                }

                })
        })


        $scope.reCalcJumps = () => {
            if ($scope.jumpRange <= 0) {
                $scope.jumpRange = 1
            }

            config.set('jumpRange', $scope.jumpRange)

            $scope.cases.forEach((caseData) => {
                if (caseData.systemDefined){
                    caseData.jumps = Math.ceil(caseData.distance/$scope.jumpRange)
                }


            })
        }





        ws.on('message', (data) => {

            if (connected === false) {
                console.log(data)
                console.log("Connection with websocket server established")
                connected = true
            } else {
                jsonData = JSON.parse(data);
                console.log(jsonData)

                if (jsonData.meta.event === "rescueUpdated" || jsonData.meta.event === "rescueRead" || jsonData.meta.event === "rescueCreated") {

                    if (jsonData.meta.event === "rescueCreated") {
                        let jsonDataStore = jsonData.data
                        jsonData.data = []
                        jsonData.data[0] = jsonDataStore
                    }
                    for (let index = 0; index < jsonData.data.length; index++) {
                        let caseJsonData = jsonData.data[index]
                        // console.log("processing data: " + JSON.stringify(caseJsonData))


                        let caseData = {
                            caseID: caseJsonData.id,
                            clientNick: caseJsonData.attributes.data.IRCNick,
                            codeRed: caseJsonData.attributes.codeRed,
                            boardIndex: caseJsonData.attributes.data.boardIndex,
                            clientSystem: caseJsonData.attributes.system,
                            caseRed: undefined,
                            numJumps: undefined,
                            distance: undefined,
                            systemDefined: undefined,
                            platformUnknown: undefined

                        }

                        if (caseJsonData.attributes.platform !== 'pc' && caseJsonData.attributes.platform !== null) {
                            let caseIndex = $scope.cases.findIndex((obj) => {
                                if (obj.caseID === caseData.caseID) {
                                    return true
                                }
                            })

                            if (caseIndex !== -1) {
                                $timeout(() => {
                                    $scope.cases.splice(caseIndex, 1)
                                });
                            }

                            continue
                        }

                        if (caseJsonData.attributes.platform === null) {
                            caseData.platformUnknown = true
                        }

                        if (caseJsonData.attributes.codeRed) {
                            caseData.caseRed = "Yes"
                        } else {
                            caseData.caseRed = "No"
                        }
                        if (caseJsonData.attributes.status !== "open") {

                            let caseIndex = $scope.cases.findIndex((obj) => {
                                if (obj.caseID === caseData.caseID) {
                                    return true
                                }
                            })



                            if (caseIndex !== -1) {
                                $timeout(() => {
                                    $scope.cases.splice(caseIndex, 1)

                                });
                            }

                        } else {
                            getSysInfo(caseData.clientSystem).then((response) => {
                                if (!response.found) {
                                    console.log("No System found when searching for client system")
                                    caseData.systemDefined = false

                                    let caseIndex = $scope.cases.findIndex((obj) => {
                                        if (obj.caseID === caseData.caseID) {
                                            return true
                                        }
                                    })

                                    if (caseIndex === -1) {
                                        $timeout(() => {
                                            $scope.cases.push(caseData)
                                        });
                                    } else {
                                        $timeout(() => {
                                            $scope.cases[caseIndex] = caseData
                                        });
                                    }


                                } else {
                                    $timeout(() => {
                                        caseData.clientSysData = response
                                    });

                                    getSysInfo(ratSystem).then((response) => {
                                        if (!response.found) {
                                            caseData.systemDefined = false
                                            console.log("Rat System was not found")
                                        } else {
                                            ratSysData = response
                                            let distanceAndJumps = calculateJumpsAndDistance(ratSysData, caseData.clientSysData, $scope.jumpRange)

                                            caseData.distance = distanceAndJumps.distance
                                            caseData.jumps = distanceAndJumps.jumps
                                        }
                                        caseData.systemDefined = true
                                        let caseIndex = $scope.cases.findIndex((obj) => {

                                            if (obj.caseID === caseData.caseID) {
                                                return true
                                            }
                                        })

                                        if (caseIndex === -1) {
                                            $timeout(() => {
                                                $scope.cases.push(caseData)
                                            });
                                        } else {
                                            $timeout(() => {
                                                $scope.cases[caseIndex] = caseData
                                            });
                                        }
                                    })
                                }


                            }, (error) => {

                                console.log("error processing websocket data" + error)

                            })

                        }
                    }


                }
            }
        })
    })

