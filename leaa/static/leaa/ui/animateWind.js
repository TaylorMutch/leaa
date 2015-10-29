/**
 * Created by Taylor on 9/10/2015.
 */
steal(function () {
	$('#forward').on('click', function() {
	    manager.StepForward();
    });
    $('#back').on('click', function() {
        manager.StepBackward();
	});

    $('#begin').on('click', function() {
        manager.ResetStations();
    });

    /**
    Main Animation code
     */
    //animating = false;
    // Enable animation
	$('#play').on('click', function() {
        var glyph = $('#play-glyph');
        if (glyph.hasClass('glyphicon-play')) {
            manager.StepForward();
            manager.Animating = true;
            intervalID = setInterval(animateStepForward, 1000/4);
            glyph.removeClass('glyphicon-play');
            glyph.addClass('glyphicon-pause');
        } else {
            stopAnimation();
            glyph.removeClass('glyphicon-pause');
            glyph.addClass('glyphicon-play');
        }
	});
    // Animation loop
    function animateStepForward() {
        manager.StepForward();
    }
    // Disable animation
    function stopAnimation() {
        manager.Animating = false;
        clearInterval(intervalID);
    }
	// RESET
	$('#reset').on('click', function() {
        if (manager.Animating) {
            stopAnimation();
        }
        manager.ResetStations();
		// Reset toggles
		//showContours = false;

		// Reset camera
		camera.position.set(CAM_START.x, CAM_START.y, CAM_START.z);
		orbit.reset();
		//flycontrols.reset();
		/*
		if (!flyThroughEnabled)
		{
			controls.reset();
			console.log("Orbit Controls Reset");
		}
		*/
		// Reset terrain
		//texture.map = THREE.ImageUtils.loadTexture('resources/reliefHJAndrews.png');
		//terrainGeo.material = texture.map;

	});
    /** Slider functions for manipulating the vectors */
    $(function() {
        var s = $("#vectorLength");
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
                manager.VectorLength = ui.value;
                clearArrows();
                $.each(manager.ActiveStations, function(id, station) {
                    renderArrows(station);
                });
            }
        });
        $("#amount").val("$" + s.slider("value"));
    });
    $(function() {
        var s = $("#vectorHeight");
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
                manager.VectorHeight = ui.value;
                clearArrows();
                $.each(manager.ActiveStations, function(id, station) {
                    renderArrows(station);
                });
            }
        });
        $("#amount").val("$" + s.slider("value"));
    });
});