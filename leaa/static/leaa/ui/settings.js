/**
 * Created by Taylor on 11/4/2015.
 */

/***
 * Save GUI/graphical settings for chosen terrain
 */
function saveSettings(){
    if (manager.ActiveDEM != undefined) {
        var save_to_server = confirm('Save current settings to the server?');
        if (save_to_server) {
            var http = new XMLHttpRequest();
            http.open("POST", "/setSettings/", true);
            http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            var liveUpdate = (manager.LiveUpdate == true) ? 1 : 0;
            var params = "live=" + liveUpdate.toString()
                + "&color=" + manager.ArrowColor.toString()
                + "&vheight=" + manager.VectorHeight.toString()
                + "&vlength=" + manager.VectorLength.toString()
                + "&sheight=" + manager.SceneHeight.toString()
                + "&terrainID=" + manager.ActiveDEM.id.toString();
            http.send(params);
        }
    } else {
        alert('Please select a terrain before saving settings.');
    }
}

/**
 * jQuery ajax function for obtaining settings for a specific terrain
 * @param id - terrainID of the user chosen DEM.
 */
function getSettings(id) {
    $.getJSON('/getSettings/', {'terrainID': id})
        .done(function(response) {
        manager.VectorHeight = response['VectorHeight'];
        manager.VectorLength = response['VectorLength'];
        manager.SceneHeight = response['SceneHeight'];
        manager.LiveUpdate = response['LiveUpdate'];
        manager.ArrowColor = response['ArrowColor'];
        })
        .fail(function (jqxhr, status, error) {
            console.error("Request failed: " + status + ", " + error);
        });
}

dirty_views = false; //TODO: Decide if this is a good thing to have or if we should eliminate it.

/**
 * Ajax function for saving views to the server.
 * User can choose to save locally only or save locally and to the server
 * TODO: Should we only allow server saves?
 */
function saveView(){
    if (manager.ActiveDEM != undefined) {
        var name = prompt('Please give this view a name.');
        if (name !== null && name !== "") {
            var view = {
                name: name,
                pos: camera.position
            };
            manager.TerrainViews.push(view);
            var save_to_server = confirm('Would you like to save this to the server?');
            if (save_to_server) {
                var saved_view = JSON.parse(JSON.stringify(view));
                saved_view.terrain = manager.ActiveDEM.id;
                var http = new XMLHttpRequest();
                var params = 'name=' + name
                    + "&x=" + saved_view.pos.x.toString()
                    + "&y=" + saved_view.pos.y.toString()
                    + "&z=" + saved_view.pos.z.toString()
                    + "&terrainID=" + saved_view.terrain.toString();
                http.open("POST", "/saveTerrainView/", true);
                http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                http.send(params);
            }
            else {
                dirty_views = true;
            }
        }
    }
}

/***
 * Get terrain views from the server.
 * @param id - terrainID used to tell the server which terrain views we want.
 */
function getTerrainViews(id) {
    var viewsFolder = h_gui.__folders.Views;
    var viewsGUI;
    if (viewsFolder.__controllers[1]) {
        viewsGUI = viewsFolder.__controllers[1];
    }
    if (dirty_views) {
        dirty_views = confirm('You have created views which are not saved to the server. ' +
            'Would you like to save them now?');
        if (dirty_views) {
            // TODO: Implement way to save views that exist locally but are not added to the server.
            dirty_views = false;
        }
    }
    manager.TerrainViews = [];
    var terrainViewStrings = [];
    $.getJSON('/getTerrainViews/', {'terrainID': id}).done( function (response) {
        if (JSON.stringify(response) !== '{}') {
            //console.log(response);
            $.each(response, function (handle, view) {
                manager.TerrainViews.push(view);
                terrainViewStrings.push(view.name);
            });
            //console.log(terrainViewStrings);
            if (viewsGUI) {
                viewsFolder.remove(viewsGUI);
            }
            var obj = {
                'Terrain Views': 'blah'
            };
            viewsFolder.add(obj, 'Terrain Views', terrainViewStrings)
                .onChange(function (value) {
                    //console.log(value);
                    var name = value;
                    var i;
                    for (i = 0; i < manager.TerrainViews.length; i++) {
                        //console.log(manager.TerrainViews[i]);
                        if (manager.TerrainViews[i].name == name) {
                            break;
                        }
                    }
                    var view = manager.TerrainViews[i];
                    orbit.reset();
                    camera.position.x = view.pos.x;
                    camera.position.y = view.pos.y;
                    camera.position.z = view.pos.z;
                });
            viewsFolder.open();
        }
    });
}
/**
 * List data of chosen station in the sidebar
 * @dataSet - array of THREE.ArrowHelper objects which each container encoded userData
 */
function updateSodarLog(dataSet) {
    var log = $('#sodarLog');
    log.empty();
    for (var i in dataSet) {
        var data = dataSet[i].userData;
        var message = 'Height = ' + data.h + ', Speed = ' + data.spd + 'm/s' + ', Direction = ' + data.dir + '\xB0';
        log.prepend('<li><a> ' + message + '</a></li>');
    }
    log.prepend('<h3 style="text-align:center;"><a> ' + manager.CurrentStationSelected + '</a></h3>');
}

/**
 * Helper function to update the sodarLog
 */
function updateSidebar() {
    if (manager.CurrentStationSelected != null) {
        for (var i in wind.children) {
            if (wind.children[i].userData['name'] == manager.CurrentStationSelected) {
                var dataSet = wind.children[i].children;
                updateSodarLog(dataSet);
                break;
            }
        }
    }
}

/**
 * Stringify timestamps the way we want them
 * @param date - a raw date from station.dates in integer format.
 * @returns {string}
 */
function formatTimestamp(date) {
    var datestring = String(date);
    var year = datestring.substring(0,2);
	var month = datestring.substring(2, 4);
	var day = datestring.substring(4, 6);
	var hour = datestring.substring(6, 8);
	var minute = datestring.substring(8, 10);
    var sec = datestring.substring(10,12);
	return  month + "/" + day + "/" + year + " at " + hour + ":" + minute + ":" + sec;
}

