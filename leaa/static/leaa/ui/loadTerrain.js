/**
 * Created by Taylor on 9/8/2015.
 */
steal(function () {

    init();   // Init the workspace
    render(); // One call to render to prep the workspace.

    /**
     * Initialize our workspace and graphics variables
     */
    function init() {
        // Picking tools
        mouse = new THREE.Vector2();
        INTERSECTED = null;
        INTERSECTED_STATIC = null;
        raycaster = new THREE.Raycaster();
        raycaster.linePrecision = 100000;  // precision on detecting lines only, otherwise mesh collision is used
        // <div> element where everything takes place
        var container = document.getElementById("scene");
        // Setup Camera
        //camera = new THREE.CombinedCamera(container.offsetWidth, container.offsetHeight, 40, 0.1, 500, -500, 1000);
        camera = new THREE.PerspectiveCamera(40,container.offsetWidth/container.offsetHeight, 0.1, 1000);
        CAM_START = new THREE.Vector3(0,-165,80);
        camera.position.set(CAM_START.x, CAM_START.y, CAM_START.z);
        camera.up.set(0,0,1);
        // Setup Scenes - each scene acts to serve a different purpose
        scene = new THREE.Scene(); // contains the DEM and lighting. Elements that need to be displayed but not picked go here.
        wind = new THREE.Scene();  // wind vector objects. Picking is done on this scene only.
        labels = new THREE.Scene();// contains 2D canvas elements. Must go on top of DEM but not be pickable.
        // Lighting
        var ambient = new THREE.AmbientLight(0xffffff);
        scene.add(ambient);
        // WebGLRenderer settings
        renderer = new THREE.WebGLRenderer({preserveDrawingBuffer: true}); // preserving is necessary for screenshot
        renderer.setSize(container.offsetWidth, container.offsetHeight);
        renderer.setClearColor(0x000000, 1);
        renderer.domElement.id = 'graphics';
        renderer.autoClear = false;     // Necessary for drawing 'wind' scene on top of terrain
        container.appendChild(renderer.domElement);
        window.addEventListener('resize', onWindowResize, false);
        document.addEventListener( 'mousedown', onDocumentMouseDown, false);
        document.addEventListener( 'mousemove', onDocumentMouseMove, false);
        // Screenshot capability - binds to 'p' key.
        THREEx.Screenshot.bindKey(renderer);

        // Initialze camera controls
        orbit = new THREE.OrbitControls(camera, renderer.domElement);
        orbit.maxPolarAngle = Math.PI * .495; // we only want to view the top half of the terrain
        initGUIS(container);
    }

    /**
     * Initialize our interface
     * @param container - the <div> container where everything will be placed.
     */
    function initGUIS(container){

        // Add performance monitor
        stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '0%';
        stats.domElement.style.bottom = '10px';
        container.appendChild(stats.domElement);
        // GUIs

        var terrainNames = ['No Terrain'];
        $.each(terrains, function(id, handle) {
            terrainNames.push(handle.name);
        });

         // Horizontal GUI, used for setting terrain and views - global options
        h_gui = new dat.GUI({autoPlace: false});
        var h_params = {
            'Select Terrain': 'Null',   // because dat.GUI is kinda broken...
            'Save View': function() {saveView();},
            'Save Settings': function() {saveSettings();}
        };
        var Terrain = h_gui.addFolder('Terrain', "a");
        Terrain.add(h_params, 'Select Terrain', terrainNames)
            .onChange(function(value) {
                loadTerrain(value);
            }
        );
        Terrain.open();
        var Views = h_gui.addFolder('Views', "a");

        Views.add(h_params,'Save View');
        h_gui.add(h_params, 'Save Settings');
        container.appendChild(h_gui.domElement);
        h_gui.domElement.style.position = 'absolute';
        h_gui.domElement.style.top = '50px';
        h_gui.domElement.style.left = '0%';
        h_gui.domElement.style.textAlign = 'center';

        // Vertical GUI, for setting scene options
        var v_gui = new dat.GUI({autoPlace: false});
        var v_params = {
            'Camera Type': 'camera',
            'Toggle Wireframe': function() {
                for (var i = scene.children.length-1; i >= 0 ; i--) {
                    if (scene.children[i] instanceof THREE.Mesh) {
                        scene.children[i].material.wireframe = !scene.children[i].material.wireframe;
                    }
                    else {
                        break;
                    }
                }
            }
        };
        var wvcontrols = v_gui.addFolder('Wind Vector Controls', "a");
        wvcontrols.add(manager, 'VectorHeight',.5, 2).name('Height').listen().onChange(
            function() {
                clearArrows();
                drawArrows();
            }
        );
        wvcontrols.add(manager, 'VectorLength',.5, 2).name('Length').listen().onChange(
            function() {
                clearArrows();
                drawArrows();
            }
        );
        wvcontrols.addColor(manager, 'ArrowColor').name('Color').onChange(
            function(value) {
                manager.ArrowColor = value;
                for (var i = 0; i < wind.children.length; i++) { // For each group of vectors
                    $.each(wind.children[i].children, function (id, vector) {   // For each vector in the group
                        // Sometimes windvectors dont have lines attached (I.e. vectorLength == 0)
                        if (vector.children.length == 2) {
                            vector.line.material.color = new THREE.Color(value);
                        }
                    })
                }
            }
        );
        wvcontrols.add(manager, 'LiveUpdate').name('Live Update?').listen();
        var elevcontrols = v_gui.addFolder('Terrain Controls', "a");
        elevcontrols.add(manager, 'SceneHeight',.5,2).listen().name('Height Scale').onChange(
            function() {
                if (manager.rawDEM != undefined) {
                    clearArrows();
                    redrawDEM();
                    drawArrows();
                }
            }
        );
        elevcontrols.add(v_params, 'Camera Type', ['Perspective', 'Orthographic']).onChange(
            function(value){
                if (value == 'Orthographic') {
                    camera.toOrthographic();
                } else if (value == 'Perspective') {
                    camera.toPerspective();
                } else {
                    alert('Failure');
                }
            }
        );
        elevcontrols.add(v_params, 'Toggle Wireframe');
        v_gui.domElement.style.position='absolute';
        v_gui.domElement.style.top = '50px';
        v_gui.domElement.style.right = '0%';
        v_gui.domElement.style.textAlign = 'center';
        v_gui.open();
        container.appendChild(v_gui.domElement);

        var wr_div = document.createElement('DIV');
        var wr_img = new Image();
        wr_img.onload = function() {
            wr_div.appendChild(wr_img);
        };
        wr_img.src = '/static/leaa/resources/quick_windrose.png';
        wr_div.style.position='absolute';
        wr_div.style.bottom = '15px';
        wr_div.style.right = '0%';
        container.appendChild(wr_div);
    }

    /** Updates the DEM with new specified values.
     * Redraws the arrows based on new station base positions
     **/
    function redrawDEM() {
        for (var i = scene.children.length - 1; i >= 0; i--) {
            if (scene.children[i].name = 'terrain poly') {
                var terrain = scene.children[i];
                break;
            }
        }
        for (var i = 0; i < manager.rawDEM.length; i++) {
            terrain.geometry.vertices[i].z = manager.rawDEM[i]/65535 * manager.ActiveDEM.maxHeight * manager.SceneHeight;
        }
        terrain.geometry.verticesNeedUpdate = true;
        clearArrows();
        $.each(manager.ActiveStations, function(id, station) {
            renderArrows(station);
            station.label.position.set(station.pos.x, station.pos.y, station.pos.z);
        });
    }

    /**
     * Retrieves a selected DEM from our list of terrains.
     * @param terrainName - terrain that was picked by the user
     */
    function loadTerrain(terrainName) {
        if (terrainName == 'No Terrain') { // Either we had no terrain to start with or we need to clear everything from the scene
            clearArrows();
            cleanup();
        } else {
            var temp_terrain;
            for (var i = 0; i < terrains.length; i++) {
                if (terrains[i].name == terrainName) {
                    temp_terrain = terrains[i];
                    break;
                }
            }
            var name = terrainName;
            if (temp_terrain !== manager.ActiveDEM) {   // We have a terrain, so start process
                $('#timelineSlider').slider('option', 'disabled', true);
                if (manager.ActiveDEM !== undefined) {  // If this isn't the first terrain, cleanup.
                    clearArrows();
                    cleanup();
                }

                // prep for new terrain
                manager.ActiveDEM = temp_terrain;
                var plane = new THREE.PlaneGeometry(temp_terrain.MAPx, temp_terrain.MAPy, temp_terrain.DEMx - 1, temp_terrain.DEMy - 1);
                plane.computeFaceNormals();
                plane.computeVertexNormals();

                // Load the terrain and all stations
                manager.TerrainLoader.load('getTerrain/?terrainID=' + temp_terrain.id, function (data) {
                    manager.rawDEM = data;
                    var i;
                    for (i = 0, l = plane.vertices.length; i < l; i++) {
                        plane.vertices[i].z = data[i] / 65535 * temp_terrain.maxHeight * manager.SceneHeight;
                    }
                    var max = 0;
                    for (i = 0; i < plane.vertices.length; i++) {
                        if (plane.vertices[i].z > max) {
                            max = plane.vertices[i].z;
                        }
                    }
                    var material;
                    var imageloader = new THREE.TextureLoader();
                    imageloader.load('media/' + name + '/' + name + '.png',
                        function (texture) { // OnLoad
                            material = new THREE.MeshPhongMaterial({map: texture});
                            addTerrainToScene(plane, material);
                        },
                        {// OnProgress
                        //TODO: Maybe add a loading bar to the middle of the canvas?
                        },
                        // OnFail
                        function () {
                            console.log('An error happened, or there was no image with the DEM. Using basic material instead...');
                            material = new THREE.ShaderMaterial({
                                    uniforms: {
                                        displacement: {type: 'f', value: manager.SceneHeight},
                                        max_height: {type: 'f', value: max}
                                    },
                                    fragmentShader: ["uniform float max_height;",
                                        "varying float height;",
                                        "vec3 color_from_height( const float height ) {",
                                        "vec3 terrain_colours[4];",
                                        "terrain_colours[0] = vec3(0.0,0.0,0.6);",
                                        "terrain_colours[1] = vec3(0.1, 0.3, 0.1);",
                                        "terrain_colours[2] =  vec3(0.4, 0.8, 0.4);",
                                        "terrain_colours[3] = vec3(1.0,1.0,1.0);",
                                        "if (height < 0.0)",
                                        "return terrain_colours[0];",
                                        "else {",
                                        "float hscaled = height*2.0 - 1e-05; // hscaled should range in [0,2)",
                                        "int hi = int(hscaled); // hi should range in [0,1]",
                                        "float hfrac = hscaled-float(hi); // hfrac should range in [0,1]",
                                        "if( hi == 0)",
                                        "return mix( terrain_colours[1],terrain_colours[2],hfrac);",
                                        "else return mix( terrain_colours[2],terrain_colours[3],hfrac);",
                                        "} return vec3(0.0,0.0,0.0); }",
                                        "void main() {",
                                        "float norm_height = height/max_height;",
                                        "vec3 myColor = color_from_height(norm_height);",
                                        "gl_FragColor = vec4(myColor, 1.0);",
                                        "}"].join("\n"),
                                    vertexShader: ["uniform float displacement;",
                                        "varying float height;",
                                        "void main() {",
                                        "gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x,position.y,position.z*displacement, 1.0);",
                                        "height = position.z;",
                                        "}"].join("\n")
                                }
                            );
                            console.log(material.vertexShader);
                            console.log(material.fragmentShader);
                            addTerrainToScene(plane,material);
                        }
                    );
                    // Get the related recordDates
                    var dates;
                    $.getJSON('/getDates/', {'terrainID': manager.ActiveDEM.id}, function (result) {
                        dates = result['dates'];
                        stationNames = result['stationNames'];
                    }).done(function () {
                        if (dates.length != 0) {
                            dates.sort();
                            //console.log("Data found, adding to \"Select Data\" dropdown.");
                            $.each(dates, function (id, name) {
                                manager.Dates.push(name);
                            });
                            if (h_gui.__folders.Terrain.__controllers[1] != undefined) {
                                h_gui.__folders.Terrain.remove(h_gui.__folders.Terrain.__controllers[1]);
                            }
                            h_gui.__folders.Terrain.add(manager, 'Dates', manager.Dates)
                                .onChange(function (value) {
                                    loadDates(value);
                                }
                            )
                        } else {
                            //console.log('No Data Found');
                        }
                    })
                });
                camera.position.set(CAM_START.x, CAM_START.y, CAM_START.z);
                getSettings(manager.ActiveDEM.id);
                getTerrainViews(manager.ActiveDEM.id);
                animate();
                // Do any DOM element changes we need to do.
                $("#current-timestamp-label").html(name + "");
            }
        }
    }

    /**
     * Helper function for adding terrains to the scene
     * @param plane - plane geometry that has been modified to suit the DEM for regional area.
     * @param material - MeshPhongMaterial is a texture, ShaderMaterial is no texture found
     */
    function addTerrainToScene(plane, material) {
        var terrain = new THREE.Mesh(plane, material);
        terrain.name = 'terrain poly';
        manager.TerrainMap = plane.vertices.slice(); //copy the vertices so we have a way to get back to normal
        scene.add(terrain);
        manager.SceneObjects.push(terrain);
    }

    /**
     * Retrieves a selected dataset based on the date chosen
     * @param chosenDate - date that was picked by the user
     */
    function loadDates(chosenDate) {
        var recordDate = chosenDate;
        clearArrows();
        $('#sodarLog').empty();
        if (recordDate !== manager.RecordDate && recordDate !== 'No Date Selected') {
            manager.RecordDate = recordDate;
            $.getJSON('/getStationObjects/', {
                'stations[]': stationNames,
                'recordDate': recordDate
            })
                .done(function (response) {
                    manager.ActiveStations = [];
                    $.each(response, function (station, data) {
                        manager.ActiveStations.push(new Station(data));
                    });
                    var stationLabels = new THREE.Group();
                    $.each(manager.ActiveStations, function (id, station) {
                        station.pos = manager.TerrainMap[(station.demY * manager.ActiveDEM.DEMx) + station.demX];
                        renderArrows(station);
                        // Add a label in context as a sprite
                        var message = station.name;
                        var txSprite = makeTextSprite( message, station.pos.x, station.pos.y, station.pos.z,
                            {
                                fontsize: 18, fontface: "Georgia", borderColor: {r:0, g:0, b:255, a:1.0},
                                borderThickness:4, fillColor: {r:255, g:255, b:255, a:1.0}, radius:0, vAlign:"bottom", hAlign:"center"
                            }
                        );
                        //txSprite.userData = {name: message};
                        station.label = txSprite;
                        stationLabels.add(txSprite);
                    });
                    // If labels already exist, we just remove them
                    if (labels.children.length > 0) {
                        for (var i = 0; i < labels.children.length; i++) {
                            labels.remove(labels.children[i]);
                        }
                    }
                    labels.add(stationLabels);

                    // Get the beginning and ending days from each station, and then set the timeline
                    var minDates = [];
                    var maxDates = [];
                    $.each(manager.ActiveStations, function (id, station) {
                        minDates.push(Math.min.apply(Math, station.dates));
                        maxDates.push(Math.max.apply(Math, station.dates));
                    });
                    var step1 = '20' + manager.ActiveStations[0].dates[0].toString();
                    var step2 = '20' + manager.ActiveStations[0].dates[1].toString();
                    var max = '20' + Math.max.apply(Math, maxDates).toString();
                    var min = '20' + Math.min.apply(Math, minDates).toString();

                    /**
                     * Initialize our timeline with the desired dates in Date() objects.
                     */
                    manager.Timeline.beginTime = new Date(+min.substr(0, 4), +min.substr(4, 2) - 1, +min.substr(6, 2),
                        +min.substr(8, 2), +min.substr(10, 2), +min.substr(12, 2));
                    manager.Timeline.endTime = new Date(+max.substr(0, 4), +max.substr(4, 2) - 1, +max.substr(6, 2),
                        +max.substr(8, 2), +max.substr(10, 2), +max.substr(12, 2));
                    manager.Timeline.currentTime = manager.Timeline.beginTime;

                    //calculate timeStep
                    var date1 = new Date(+step1.substr(0, 4), +step1.substr(4, 2) - 1, +step1.substr(6, 2),
                        +step1.substr(8, 2), +step1.substr(10, 2), +step1.substr(12, 2));
                    var date2 = new Date(+step2.substr(0, 4), +step2.substr(4, 2) - 1, +step2.substr(6, 2),
                        +step2.substr(8, 2), +step2.substr(10, 2), +step2.substr(12, 2));
                    manager.Timeline.timeStep = date2.getTime() - date1.getTime();
                    manager.Timeline.numSteps = (
                        manager.Timeline.endTime.getTime()
                        - manager.Timeline.beginTime.getTime()) /
                        manager.Timeline.timeStep;
                    // Enable the timeline and playback controls
                    $('#timelineSlider').slider({
                        disabled: false,
                        value: manager.Timeline.beginTime.getTime(),
                        min: manager.Timeline.beginTime.getTime(),
                        max: manager.Timeline.endTime.getTime(),
                        step: manager.Timeline.timeStep
                    });
                    $('.playback').removeClass('disabled');
                    // Initialize our initial values for this set of data.
                    manager.CurrentTimestamp = manager.Timeline.beginTime.getTime();
                    manager.CurrentDate = calcTimestep(manager.CurrentTimestamp);
                }
            );
            $("#current-timestamp-label").html(manager.ActiveDEM.name + ': ' + recordDate);
        }
        console.log(recordDate);

    }

    /**
     * Our window resize function, for adjusting the renderer sizes and camera aspects
     */
    function onWindowResize() { // Using CombinedCamera API, which mimics perspectiveCamera API
        var container = document.getElementById('scene');
        //camera.setSize(container.offsetWidth, container.offsetHeight);
        camera.aspect = container.offsetWidth/container.offsetHeight;
        renderer.setSize(container.offsetWidth, container.offsetHeight);
        camera.updateProjectionMatrix();
    }

    /**
     * Calculate position of the mouse. Also highlight arrows when the mouse is close to them.
     */
    function onDocumentMouseMove() {
        mouse.x = (event.clientX / renderer.domElement.width) * 2 - 1;
        mouse.y =  (-(event.clientY - 50) / renderer.domElement.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        var intersects = raycaster.intersectObjects(wind.children, true);
        if (intersects.length > 0) {
            // Pick the closest object
            if (INTERSECTED_STATIC != intersects[0].object) {
                if (INTERSECTED_STATIC) { //If we already have one, reset the previous to its former state
                    INTERSECTED_STATIC.parent.cone.material.emissive.setHex(INTERSECTED_STATIC.currentHex);
                    INTERSECTED_STATIC.parent.scale.set(1,1,1);
                }
                // Get the new object and highlight it
                INTERSECTED_STATIC = intersects[0].object;
                INTERSECTED_STATIC.currentHex = INTERSECTED_STATIC.parent.cone.material.emissive.getHex();
                INTERSECTED_STATIC.parent.cone.material.emissive.setHex(0xffff00);
                INTERSECTED_STATIC.parent.scale.set(2,2,2);
                // Show the values of the object we just moused over in the current-timestamp-label
                var data = INTERSECTED_STATIC.parent.userData;
                var name = INTERSECTED_STATIC.parent.parent.userData.name;
                var message = 'Station: ' + name + ', Height: ' + data.h + ', Speed: ' + data.spd + 'm/s' + ', Direction: ' + data.dir + '\xB0';
                $('#current-timestamp-label').html(message);
            }
        } else {
            if (INTERSECTED_STATIC) { // If we selected an object, we want to restore its state
                INTERSECTED_STATIC.parent.cone.material.emissive.setHex(INTERSECTED_STATIC.currentHex);
                INTERSECTED_STATIC.parent.scale.set(1,1,1);
            }
            // Clear the saved objects and wait for next object
            INTERSECTED_STATIC = null;
            }
    }

    /**
     * Get the position of our mouse for picking stations and update the sodarLog
     */
    function onDocumentMouseDown() {
        //if (camera.inPerspectiveMode) { // TODO: Fix the broken combined camera... again
        //    raycaster.setFromCamera(mouse, camera.cameraP);
        //} else {
        //    raycaster.setFromCamera(mouse, camera.cameraO);
        //}
        raycaster.setFromCamera(mouse, camera);
        var intersects = raycaster.intersectObjects(wind.children, true);
        if (intersects.length > 0) {
            if (INTERSECTED != intersects[0].object) {
                INTERSECTED = intersects[0].object;
                if (INTERSECTED.parent.parent instanceof THREE.Group) {
                    var dataSet = INTERSECTED.parent.parent.children;
                    //if (manager.CurrentStationSelected != INTERSECTED.parent.parent.userData['name']) {
                        //manager.CurrentStationSelected = INTERSECTED.parent.parent.userData['name'];
                    //}
                    if (manager.CurrentStationSelected != INTERSECTED.parent.parent.userData) {
                        manager.CurrentStationSelected = INTERSECTED.parent.parent.userData;
                    }
                    updateSodarLog(dataSet);
                }
            }
        } else {
            INTERSECTED = null;
        }
    }

    /**
     * Remove all objects from scene and render once to clear interface.
     */
    function cleanup() {
        // Get active GUI Elements
        var terrainFolder = h_gui.__folders.Terrain;
        var viewsFolder = h_gui.__folders.Views;
        var datesGUI;
        if (terrainFolder.__controllers[1]) {
            datesGUI = terrainFolder.__controllers[1];
        }
        var viewsGUI;
        if (viewsFolder.__controllers[1]) {
            viewsGUI = viewsFolder.__controllers[1];
        }
        // Remove elements from 3D scene
        $.each(manager.SceneObjects, function(handle, threeObject) {
            scene.remove(threeObject);
            threeObject.geometry.dispose();
            threeObject.material.dispose();
            delete manager.SceneObjects.pop();
        });
        if (labels.children.length > 0)
        {
            for (var i= 0; i < labels.children.length; i++) {
                labels.remove(labels.children[i]);
            }
        }
        console.log("Scene cleared");
        // Clear out variables for receiving new data
        manager.TerrainMap = [];
        manager.CurrentStationSelected = null;
        manager.ActiveDEM = undefined;
        manager.rawDEM = undefined;
        manager.ActiveStations = [];
        manager.Dates = ['No Date Selected'];
        manager.RecordDate = null;
        manager.Animating = false;
        manager.TerrainViews = ['Default'];
        // Reset GUI elements
        $('#timelineSlider').slider('option', 'disabled', true);
        $('.playback').addClass('disabled');
        $('#sodarLog').empty();
        if (datesGUI) {
            terrainFolder.remove(datesGUI);
        }
        if (viewsGUI) {
            viewsFolder.remove(viewsGUI);
        }
        // One call to render to visually clear the scene.
        render();
    }

    // render loop; this determines system fps
    function animate() {
        requestAnimationFrame(animate);
        render();
        stats.update();
    }

    // actions to perform on each render call
    function render() {
        orbit.update();
        renderer.clear();
        renderer.render(scene,camera);
        renderer.clearDepth();
        renderer.render(wind,camera);
        renderer.render(labels,camera);
    }
});