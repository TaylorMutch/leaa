/**
 * Created by Taylor on 9/8/2015.
 */
steal(function () {


    init();
    render(); // One call to render to prep the workspace.

    /**
     * Retrieves a selected DEM from our list of terrains.
     */
    //$("a.dem").click(function() {
    $("ul").on('click', 'a.dem', function() {
        /** Go get the new terrain or just pass over everything */
        var index = $(this).attr('value');   // index of the terrain we want
        temp_terrain = terrains[index];
        var name = temp_terrain.name;
        if (temp_terrain !== manager.ActiveDEM) {
            $('#timelineSlider').slider('option','disabled',true);
            $('#sceneHeight').slider({disabled: false, value: 1});
            $('#vectorHeight').slider({disabled: true, value: 1});
            $('#vectorLength').slider({disabled: true, value: 1});
            if (manager.ActiveDEM !== undefined) {
                clearArrows();
                cleanup();
            }
            manager.ActiveDEM = temp_terrain;

            // Get initial terrain geo, to be updated with DEM data
            var plane = new THREE.PlaneGeometry(temp_terrain.MAPx, temp_terrain.MAPy, temp_terrain.DEMx-1, temp_terrain.DEMy-1);
            plane.computeFaceNormals();
            plane.computeVertexNormals();

            // Load the terrain and all stations
            manager.TerrainLoader.load('getTerrain?terrainID=' + temp_terrain.id, function(data) {
                manager.rawDEM = data;
                var i;
                for (i = 0, l = plane.vertices.length; i < l; i++ ) {
                    plane.vertices[i].z = data[i]/65535*temp_terrain.maxHeight;
                }
                var max = 0;
                for (i = 0; i < plane.vertices.length; i++) {
                    if (plane.vertices[i].z > max) {
                        max = plane.vertices[i].z;
                    }
                }
                // TODO: Sort out this shader before we use it...
                var shaderMaterial = new THREE.ShaderMaterial({uniforms: {
                    displacement:{type:'f',value: manager.SceneHeight},
                       max_height:{type:'f', value: max }
                    },
                    fragmentShader:
                        ["uniform float max_height;",
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
                    vertexShader:
                        ["uniform float displacement;",
                            "varying float height;",
                            "void main() {",
                            "gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x,position.y,position.z*displacement, 1.0);",
                            "height = position.z;",
                        "}"].join("\n")
                });

                terrainShader = new THREE.Mesh(plane, shaderMaterial);
                scene.add(terrainShader);
                terrainShader.visible = false;
                material = new THREE.MeshPhongMaterial({ map: THREE.ImageUtils.loadTexture('media/'+name+'/'+name+'.png')});
                terrainGeo = new THREE.Mesh(plane, material);
                terrainGeo.name = 'terrain poly';
                manager.TerrainMap = plane.vertices.slice(); //copy the vertices so we have a way to get back to normal
                scene.add(terrainGeo);
                updateSodarLog('Added terrain: ' + temp_terrain.name, false);
                manager.SceneObjects.push(terrainGeo);
                // Get the related recordDates
                $("#dataPicker").empty();
                $.getJSON('/getDates/', {'terrainID': temp_terrain.id}, function(result) {
                    dates = result['dates'];
                    stationNames = result['stationNames'];
                }).done(function() {
                    if (dates.length == 0) {
                        console.log("No data found for this terrain. Pick another terrain for data viewing.");
                        $("#dataPicker").append('<li>No data for this terrain</li>');
                    } else {
                        console.log("Data found, adding to \"Select Data\" dropdown.");
                        $.each(dates, function(id, name) {
                            $("#dataPicker").append('<li><a href="#" class="recordDate">' + name + '</a></li>');
                        });
                    }
                })
            });
            camera.position.set(CAM_START.x, CAM_START.y, CAM_START.z);
            animate();

            // Do any DOM element changes we need to do.
            $("#current-timestamp-label").html(name + "");
            document.getElementById('wireframeToggle').classList.remove('disabled');
        }
    });

    /**
     * Initialize our workspace
     */
    function init() {
        CAM_START = new THREE.Vector3(0,-80,80);
        container = document.getElementById("scene");

        // Setup Camera
        camera = new THREE.CombinedCamera(container.offsetWidth, container.offsetHeight, 60, 0.1, 500, -500, 1000);
        camera.position.set(CAM_START.x, CAM_START.y, CAM_START.z);
        camera.up.set(0,0,1);

        // Setup Scene
        scene = new THREE.Scene();
        ambient = new THREE.AmbientLight(0xffffff);
        scene.add(ambient);

        // Initialze controls
        orbit = new THREE.OrbitControls(camera, container);

        // Declare renderer settings
        renderer = new THREE.WebGLRenderer({preserveDrawingBuffer : true});
        renderer.setSize(container.offsetWidth, container.offsetHeight);
        //renderer.setClearColor(0xfefefe, 1);
        renderer.setClearColor(0x000000, 1);
        renderer.autoClear = true;
        container.appendChild(renderer.domElement);
        window.addEventListener('resize', onWindowResize, false);
        THREEx.Screenshot.bindKey(renderer);
    }
    /** Draws the DEM with new specified values.
     * Redraws the arrows based on new station base postition
     **/
    function redrawDEM() {
        for (var i = 0; i < manager.rawDEM.length; i++) {
            terrainGeo.geometry.vertices[i].z = manager.rawDEM[i]/65535 * manager.ActiveDEM.maxHeight * manager.SceneHeight;
        }
        terrainGeo.geometry.verticesNeedUpdate = true;
        clearArrows();
        $.each(manager.ActiveStations, function(id, station) {
            renderArrows(station);
        })
    }

    /**
     * Our resizeing function TODO: Improve this as some of the page feels glitchy
     */
    function onWindowResize() {
        camera.aspect = container.offsetWidth/container.offsetHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.offsetWidth, container.offsetHeight);
    }

    /**
     * Remove all objects from scene and render once to clear UI.
     */
    function cleanup() {
        $.each(manager.SceneObjects, function(handle, threeObject) {
            scene.remove(threeObject);
            delete manager.SceneObjects.pop();
        });
        console.log("Scene cleared");
        render();
    }

    function animate() {
        requestAnimationFrame(animate);
        render();
    }

    function render() {
        orbit.update();
        renderer.render(scene,camera);
    }

    $("#setOrthographic").click(function () {
        camera.toOrthographic();
    });
    $("#setPerspective").click(function () {
        camera.toPerspective();
    });


    //TODO: See if we need this for adding arbitrary stations
    function calcStationPos(utmX, utmY) {
        var coords = [];
        var x = Math.floor(utmX - MIN_UTMx)/STEP_SIZE;
        coords.push(x);
        var y = Math.floor(MAX_UTMy - utmY)/STEP_SIZE;
        coords.push(y);
        return coords;
    }

    /**
     * Toggle wireframe
     */
    $('#wireframeToggle').on('click', function() {
        terrainGeo.material.wireframe = !terrainGeo.material.wireframe;
    });

    /**
     * Elevation slider
     * Calls WebGL to render the scene with the adjusted DEM
     */
    $(function() {
        var s = $("#sceneHeight");
        s.slider({
            disabled: true,
            value:1,
            min:.1,
            max: 2.0,
            step: .1,
            slide: function(event, ui) {
                $( "#amount").val("$"+ui.value);
            },
            stop: function(event,ui) {
                if (ui.value !== manager.SceneHeight) { //redraw only if the value is changed
                    manager.SceneHeight = ui.value;
                    redrawDEM();
                    //terrainGeo.material.uniforms.displacement.value=ui.value;
                    terrainGeo.geometry.verticesNeedUpdate = true;
                }
            }
        });
        $("#amount").val("$" + s.slider("value"));
    });
});