/**
 * Created by Taylor on 11/4/2015.
 */

/***
 * UI settings handling
 */

/***
 * Settings for terrain and for wind vectors
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


function getSettings(id) {
    $.getJSON('/getSettings/', {'terrainID': id})
        .done(function(response) {
        manager.VectorHeight = response['VectorHeight'];
        manager.VectorLength = response['VectorLength'];
        manager.SceneHeight = response['SceneHeight'];  // TODO: Should scene height be saved?
        manager.LiveUpdate = response['LiveUpdate'];
        manager.ArrowColor = response['ArrowColor'];
        })
        .fail(function (jqxhr, status, error) {
            console.error("Request failed: " + status + ", " + error);
        });
}

dirty_views = false; //TODO: Decide if this is a good thing to have or if we should eliminate it.

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
 *Get terrain views from the server.
 */
function getTerrainViews(id) {
    var viewsFolder = h_gui.__folders.Views;
    var viewsGUI;
    if (viewsFolder.__controllers[1]) {
        viewsGUI = viewsFolder.__controllers[1];
        console.log('it exits!');
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

