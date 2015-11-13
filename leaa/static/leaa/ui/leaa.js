/**
 * Created by Taylor on 9/8/2015.
 */
/**
    Steal document for LEAA.
    Loads any scripts via jQuery and hands them over to the client, making them available
    right as the DOM finishes loading. This ensures that all assets are loaded before
    the user tries to do anything initially.
 */
var VERSION ='1.0.1';

/** Our manager that holds everything together **/
manager = new VisManager();

var terrains = [];
$.getJSON('/terrains/')
    .done(function(json) {
        $.each(json, function(id, item) {
            terrains.push(item);
        });
    }
);
$(document).ready(function() {
    /**
     * Our timeline slider.
     * Initialized to be disabled with dummy values because we don't know what the begin/end values are yet.
     * When enabled, the stop event triggers a render event based on the timestamp that it receives
     */
    $(function() {
        var s = $("#timelineSlider");
        s.slider({
            disabled: true,
            value:0,
            min: 0,
            max: 1,
            step: 1,
            slide: function( event, ui ) {
                $( "#amount" ).val( "$" + ui.value );
                if (manager.LiveUpdate) manager.UpdateTimeline(ui.value);
            },
            // This is triggered when a user picks up and drops the slider.
            stop: function( event, ui ) {
                if (!manager.LiveUpdate) manager.UpdateTimeline(ui.value);
            }
        });
        $( "#amount" ).val( "$" + s.slider("value"));
    });
    steal("leaa/ui/loadTerrain.js", function() {}); // Load rendering tools
    steal("leaa/ui/animateWind.js", function() {}); // Wind controls
    // Tooltips
    $(function() {
        $('[data-toggle="tooltip-std"]').tooltip({placement: 'right', container: 'body'})
    });
    $(function() {
        $('[data-toggle="tooltip"]').tooltip({container: 'body'})
    });
    $(function() {
        $('.dropdown-toggle').dropdown();
    });
    $("#closehowtomodal").click(function() {
        $("#howtovideo")[0].pause();
    })
});