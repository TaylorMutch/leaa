/**
 * Created by Taylor on 9/8/2015.
 *
 *
 * This is where all the action happens
 */
steal(function () {

    init();   // Init the workspace
    //render(); // One call to render to prep the workspace.

    /**
     * Initialize our workspace and graphics variables
     * **NOTE**
     * The global variables here are necessary for all the graphics to be done and can't be encapsulated (yet...)
     * TODO: Encapsulation improvements to be done.
     */
    function init() {

        // <div> element where everything takes place
        var container = document.getElementById("scene");

        // Setup Camera
        //camera = new THREE.CombinedCamera(container.offsetWidth, container.offsetHeight, 40, 0.1, 500, -500, 1000); // TODO: Fix combined camera
        camera = new THREE.PerspectiveCamera(40,container.offsetWidth/container.offsetHeight, 0.1, 1000);
        CAM_START = new THREE.Vector3(0,-165,80);
        camera.position.set(CAM_START.x, CAM_START.y, CAM_START.z);
        camera.up.set(0,0,1);

        // Setup Scenes - each scene acts to serve a different purpose
        scene = new THREE.Scene(); // contains the DEM and lighting. Elements that need to be displayed but not picked go here.
        scene.add(camera);

        // Windrose color scale
        var windrose = new THREE.Sprite(
            new THREE.SpriteMaterial({map: THREE.ImageUtils.loadTexture('/static/leaa/resources/quick_windrose.png')})
        );
        windrose.position.set(12.8,-4,-20);
        windrose.scale.set(.8,5,1);
        windrose.name = 'windrose';
        windrose.visible = false;
        camera.add(windrose);

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

        // Attach WebGL canvas to the DOM
        container.appendChild(renderer.domElement);
        window.addEventListener('resize', onWindowResize, false);

        // Picking tools
        mouse = new THREE.Vector2();
        INTERSECTED = null;
        INTERSECTED_STATIC = null;
        raycaster = new THREE.Raycaster();
        raycaster.linePrecision = 50000;  // precision on detecting lines only, otherwise mesh collision is used

        // Listeners for picking
        document.addEventListener( 'mousedown', onDocumentMouseDown, false);
        document.addEventListener( 'mousemove', onDocumentMouseMove, false);

        // Screenshot capability - binds to 'p' key.
        THREEx.Screenshot.bindKey(renderer);

        // Video capture ability
        //recorder = new CanvasRecorder(renderer.domElement);
        frames = [];

        // Initialze camera controls
        orbit = new THREE.OrbitControls(camera, renderer.domElement);
        orbit.maxPolarAngle = Math.PI * .495; // we only want to view the top half of the terrain

        initGUIS(container);

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
        if (manager.Recording) {
            var timeSprite = makeTextSprite(formatTimestamp(manager.CurrentDate), 0, 16, -50,
                { // parameters
                    fontsize: 18,
                    fontface: "Georgia",
                    borderColor: {r: 0, g: 0, b: 255, a: 1.0},
                    borderThickness: 4,
                    fillColor: {r: 255, g: 255, b: 255, a: 1.0},
                    radius: 0,
                    vAlign: "bottom",
                    hAlign: "center"
                }
            );
            timeSprite.scale.set(16, 8, 1);
            camera.add(timeSprite);
            var labelSprite = makeTextSprite(manager.ActiveDEM.name, -20, 16, -50,
                { // parameters
                    fontsize: 18,
                    fontface: "Georgia",
                    borderColor: {r: 0, g: 0, b: 255, a: 1.0},
                    borderThickness: 4,
                    fillColor: {r: 255, g: 255, b: 255, a: 1.0},
                    radius: 0,
                    vAlign: "bottom",
                    hAlign: "center"
                }
            );
            labelSprite.scale.set(32, 16, 1);
            camera.add(labelSprite);
            //} else {
            renderer.clear();               // Called every time since we set autoClear to false
            renderer.render(scene, camera);  // Render the background scene first
            renderer.clearDepth();          // clearDepth only so we can overlay other objects
            renderer.render(wind, camera);   // Render the arrows on top of the scene
            renderer.render(labels, camera); // Last come the labels so they can be seen from any direction.
            //}
            frames.push(renderer.domElement.toDataURL('image/webp', 1));
            camera.remove(timeSprite);
            camera.remove(labelSprite);
        } else {
            renderer.clear();               // Called every time since we set autoClear to false
            renderer.render(scene, camera);  // Render the background scene first
            renderer.clearDepth();          // clearDepth only so we can overlay other objects
            renderer.render(wind, camera);   // Render the arrows on top of the scene
            renderer.render(labels, camera); // Last come the labels so they can be seen from any direction.
        }
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
            /*'Camera Type': 'camera',*/
            'Toggle Wireframe': function() {
                for (var i = scene.children.length-1; i >= 0 ; i--) {
                    if (scene.children[i].geometry instanceof THREE.PlaneBufferGeometry) {
                        scene.children[i].material.wireframe = !scene.children[i].material.wireframe;
                    }
                    else if (scene.children[i] instanceof THREE.BoundingBoxHelper) {
                        scene.children[i].visible = !scene.children[i].visible;
                    } else {
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
        wvcontrols.add(manager, 'SelectableData').name('Selectable?').listen();
        wvcontrols.open();
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
        /*  // TODO: Fix combined camera
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
        */
        elevcontrols.add(v_params, 'Toggle Wireframe');
        v_gui.domElement.style.position='absolute';
        v_gui.domElement.style.top = '50px';
        v_gui.domElement.style.right = '0%';
        v_gui.domElement.style.textAlign = 'center';
        v_gui.open();
        container.appendChild(v_gui.domElement);

        /** static windrose object, which isn't shown in video recording */
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


        if (window.chrome !== undefined) { // Since recording only works with Chrome...
            var rec_div = document.createElement('DIV');
            rec_div.id = 'rec_div';
            var rec_btn = document.createElement('BUTTON');
            rec_btn.id = 'rec_btn';
            rec_btn.textContent = 'Start/Stop Recording';
            rec_btn.className = 'btn btn-default disabled playback';
            rec_div.appendChild(rec_btn);
            container.insertBefore(rec_div, container.firstChild);
        }
    }

    /** Updates the DEM with new specified values.
     * Redraws the arrows based on new station base positions
     **/
    function redrawDEM() {
        var i;
        for (i = scene.children.length - 1; i >= 0; i--) {
            if (scene.children[i].name = 'terrain poly' && scene.children[i].geometry instanceof THREE.PlaneBufferGeometry) {
                var terrain = scene.children[i];
                break;
            }
        }

        var max = Math.max.apply(null, manager.rawDEM);
        var offset = ((max / 65535) * manager.ActiveDEM.maxHeight) / 2; // amount to translate down so we can look at terrains with arb. height
        // Update the z values in the buffer
        for (i = 0; i < manager.rawDEM.length; i++) {
            terrain.geometry.attributes.position.array[i*3 + 2] = manager.rawDEM[i]/65535 * manager.ActiveDEM.maxHeight * manager.SceneHeight - offset;
        }
        terrain.geometry.attributes.position.needsUpdate = true;  // signal to send new data to GPU
        clearArrows();
        $.each(manager.ActiveStations, function(id, station) {
            updateStationPosition(station);
            station.label.position.set(station.pos.x, station.pos.y, station.pos.z);
        });
        var bbox = scene.children[scene.children.length-1];
        bbox.update();
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
                getSettings(manager.ActiveDEM.id);
                getTerrainViews(manager.ActiveDEM.id);

                // Load the terrain and its stations
                manager.TerrainLoader.load('getTerrain/?terrainID=' + temp_terrain.id, function (data) {
                    manager.rawDEM = new Float32Array(data); // copy the data so we can redraw when we need to

                    var i;
                    //var max = Math.max.apply(null, manager.rawDEM);  // maximum call stack size exceeded ERROR!!! ahjhjh
                    //console.log(max);
                    //var offset = ((max / 65535) * manager.ActiveDEM.maxHeight) / 2; // amount to translate down so we can look at terrains with arb. height
                    var offset = (Math.pow(manager.ActiveDEM.maxHeight,2) / 65535) /2;
                    var bufferPlane = new THREE.PlaneBufferGeometry(temp_terrain.MAPx, temp_terrain.MAPy, temp_terrain.DEMx-1, temp_terrain.DEMy-1);
                    var bufferArray = bufferPlane.attributes.position.array;
                    for (i = 0; i < manager.rawDEM.length; i++) { // Update z coordinate based on DEM values
                        bufferArray[i*3 + 2] = ((manager.rawDEM[i] / 65535 * manager.ActiveDEM.maxHeight) * manager.SceneHeight) - offset;
                    }
                    // Load terrain color
                    var material;
                    var imageloader = new THREE.TextureLoader();
                    imageloader.load('media/' + name + '/' + name + '.png',
                        function (texture) { // OnSuccess
                            texture.minFilter = THREE.LinearFilter;
                            material = new THREE.MeshPhongMaterial({map: texture});
                            addTerrainToScene(bufferPlane, material);
                        },
                        {// OnProgress
                        //TODO: Maybe add a loading bar to the middle of the canvas?
                        },
                        // OnFail
                        function () {
                            console.log('No texture found with the DEM. Using generic texture instead...');
                            var heights = new THREE.BufferAttribute(manager.rawDEM, 1);
                            bufferPlane.addAttribute('height', heights);
                            material = new THREE.ShaderMaterial({
                        uniforms: {
                            displacement: {type: 'f', value: manager.SceneHeight},
                            //maxHeight: {type: 'f', value: max}
                            maxHeight: {type: 'f', value: manager.ActiveDEM.maxHeight}
                        },
                        vertexShader: [
                            'uniform float displacement;',
                            'uniform float maxHeight;',
                            'attribute float height;',
                            'varying float fragHeight;',
                            'void main(){',
                            'gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x,position.y,position.z*displacement,1.0);',
                            'fragHeight = float(height/maxHeight);}'
                        ].join('\n'),
                        fragmentShader: [
                            'varying float fragHeight;',
                            'vec4 colorScale(float yval) {',
                            'float a[7]; a[0] = 0.; a[1] = .1; a[2] = .2; a[3] = .5; a[4] = .75; a[5] = .8; a[6] = 1.;',
                            'vec4 colors[8];colors[0] = vec4(.4,.4,1,1);colors[1] = vec4(.75,.75,.56,1);colors[2] = vec4(.3,.8,.3,1);',
                            'colors[3] = vec4(.2,.6,.2,1);colors[4] = vec4(.4,.38,.0,1);colors[5] = vec4(.8,.8,.8,1);',
                            'colors[6] = vec4(1,1,1,1);colors[7] = vec4(1,1,1,1);',
                            'vec4 myColor;',
                            'if (yval <= a[0]) {myColor = colors[0];}',
                            'else {',
                            'for (int i = 1; i < 7; i++) {',
                            'if (yval < a[i]) {myColor = mix(colors[i], colors[i+1],  smoothstep(a[i-1],a[i],yval)  );',
                            'break;}}}',
                            'return myColor;}',
                            'void main() {',
                            'gl_FragColor = colorScale(fragHeight);}'
                        ].join('\n')
                    });
                            addTerrainToScene(bufferPlane, material);
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
                animate();
                // Do any DOM element changes we need to do.
                $("#current-timestamp-label").html(name + "");
            }
        }
    }

    /**
     * Helper function for adding terrains to the scene
     * @param geometry - planeBufferGeometry that has been modified to suit the DEM for regional area.
     * @param material - MeshPhongMaterial is a texture, ShaderMaterial is no texture found
     */
    function addTerrainToScene(geometry, material) {
        var terrain = new THREE.Mesh(geometry, material);
        terrain.name = 'terrain poly';
        scene.add(terrain);
        var hex = 0xf0f0f0;
        var bbox = new THREE.BoundingBoxHelper(terrain, hex);
        bbox.visible = false;
        bbox.update();
        scene.add(bbox);
        manager.SceneObjects.push(terrain);
        manager.SceneObjects.push(bbox);
    }

    /**
     * Retrieves a selected dataset based on the date chosen
     * @param chosenDate - date that was picked by the user
     */
    function loadDates(chosenDate) {
        var recordDate = chosenDate;
        clearArrows();
        $('#sodarLog').empty();
        // If labels already exist, we just remove them
        if (labels.children.length > 0) {
            for (var i = 0; i < labels.children.length; i++) {
                labels.remove(labels.children[i]);
            }
        }
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
                    manager.CompareDates(true); // First time checking the dates for this station, maintain chronological order
                    var stationLabels = new THREE.Group();
                    $.each(manager.ActiveStations, function (id, station) {
                        updateStationPosition(station);
                        // Add a label in context as a sprite
                        station.label = generateLabel(station);
                        stationLabels.add(station.label);
                    });
                    labels.add(stationLabels);
                    initPlayback();
                }
            );
            $("#current-timestamp-label").html(manager.ActiveDEM.name + ': ' + recordDate);
        }
        console.log(recordDate);

    }

    /**
     * Updates the station position. Called whenever a change is made to the terrain height.
     * @param station - the station to update.
     */
    function updateStationPosition(station) {
        var terrain;
        for (var i = scene.children.length - 1; i >= 0; i--) {
            if (scene.children[i].geometry instanceof THREE.PlaneBufferGeometry) {
                terrain = scene.children[i];
                break;
            }
        }
        var positions = terrain.geometry.attributes.position.array;
        station.pos.x = positions[3*((station.demY * manager.ActiveDEM.DEMx) + station.demX)];
        station.pos.y = positions[3*((station.demY * manager.ActiveDEM.DEMx) + station.demX) + 1];
        station.pos.z = positions[3*((station.demY * manager.ActiveDEM.DEMx) + station.demX) + 2];
        if (station.isCurrent) renderArrows(station);
    }

    /**
     * Places a THREE.Sprite with text showing station name
     * @param station
     * @returns {THREE.Sprite}
     */
    function generateLabel(station) {
        var message = station.name;
        var sprite = makeTextSprite( message, station.pos.x, station.pos.y, station.pos.z,
            { // parameters
                fontsize: 18, fontface: "Georgia", borderColor: {r:0, g:0, b:255, a:1.0},
                borderThickness:4, fillColor: {r:255, g:255, b:255, a:1.0}, radius:0, vAlign:"bottom", hAlign:"center"
            }
        );
        sprite.scale.set(35,17.5,1);
        return sprite;
    }

    /**
     * Initialize our timeline with the desired dates in Date() objects.
     */
    function initPlayback() {
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

        // Set our timeline with the correct dates
        manager.Timeline.beginTime = new Date(+min.substr(0, 4), +min.substr(4, 2) - 1, +min.substr(6, 2),
            +min.substr(8, 2), +min.substr(10, 2), +min.substr(12, 2));
        manager.Timeline.endTime = new Date(+max.substr(0, 4), +max.substr(4, 2) - 1, +max.substr(6, 2),
            +max.substr(8, 2), +max.substr(10, 2), +max.substr(12, 2));
        manager.Timeline.currentTime = manager.Timeline.beginTime;

        //calculate timeStep to move by
        var date1 = new Date(+step1.substr(0, 4), +step1.substr(4, 2) - 1, +step1.substr(6, 2),
            +step1.substr(8, 2), +step1.substr(10, 2), +step1.substr(12, 2));
        var date2 = new Date(+step2.substr(0, 4), +step2.substr(4, 2) - 1, +step2.substr(6, 2),
            +step2.substr(8, 2), +step2.substr(10, 2), +step2.substr(12, 2));
        manager.Timeline.timeStep = date2.getTime() - date1.getTime();
        manager.Timeline.numSteps = (
            manager.Timeline.endTime.getTime()
            - manager.Timeline.beginTime.getTime()) /
            manager.Timeline.timeStep;

        // Enable the timeline and playback GUI elements
        $('#timelineSlider').slider({
            disabled: false,
            value: manager.Timeline.beginTime.getTime(),
            min: manager.Timeline.beginTime.getTime(),
            max: manager.Timeline.endTime.getTime(),
            step: manager.Timeline.timeStep
        });
        $('.playback').removeClass('disabled');

        // Initialize our current values for this set of data.
        manager.CurrentTimestamp = manager.Timeline.beginTime.getTime();
        manager.CurrentDate = calcTimestep(manager.CurrentTimestamp);
    }

    /**
     * Our window resize function, for adjusting the renderer sizes and camera aspects
     */
    function onWindowResize() { // Using CombinedCamera API, which mimics perspectiveCamera API

        var container = document.getElementById('scene');
        //camera.setSize(container.offsetWidth, container.offsetHeight); // TODO: Fix combined camera
        camera.aspect = container.offsetWidth/container.offsetHeight;
        renderer.setSize(container.offsetWidth, container.offsetHeight);
        camera.updateProjectionMatrix();

    }

    /**
     * Calculate position of the mouse. Also highlight arrows when the mouse is close to them.
     */
    function onDocumentMouseMove(event) {
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
                INTERSECTED_STATIC.parent.scale.set(1.1,1.1,1.1);

                if (manager.SelectableData) {
                    // Show the values of the object we just moused over in the current-timestamp-label
                    var data = INTERSECTED_STATIC.parent.userData;
                    var name = INTERSECTED_STATIC.parent.parent.userData.name;
                    var message = 'Station: ' + name + ', Height: ' + data.h + ', Speed: ' + data.spd + 'm/s' + ', Direction: ' + data.dir + '\xB0';
                    $('#current-timestamp-label').html(message);
                }
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
        if (manager.SelectableData) {
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
            if (threeObject instanceof THREE.Mesh) {
                threeObject.geometry.dispose();
                threeObject.material.dispose();
            }
            //delete manager.SceneObjects.pop();
        });
        manager.SceneObjects = [];

        // Remove labels from the scene
        if (labels.children.length > 0)
        {
            for (var i= 0; i < labels.children.length; i++) {
                labels.remove(labels.children[i]);
            }
        }

        console.log("Scene cleared");

        // Clear out variables for receiving new data
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
});