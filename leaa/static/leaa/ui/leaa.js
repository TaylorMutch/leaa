/**
 * Created by Taylor on 9/8/2015.
 */
/**
    Steal document for LEAA.
    Loads any scripts via jQuery and hands them over to the client, making them available
    right as the DOM finishes loading. This ensures that all assets are loaded before
    the user tries to do anything initially.
 */
var LEAA = { VERSION: '0.1.0'};

/** Our manager that holds everything together **/
manager = new VisManager();

/**
 * Global functions that are pretty harmless overall
 */
function updateSodarLog(string, updateCurrentLabel) {
    $('#sodarLog').append('<li><a> ' + string + '</a></li>');
    if (updateCurrentLabel) {
        $('#current-timestamp-label').html(string);
    }
}

/**
 * Stringify timestamps the way we want them
 * @param date
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
                /*
                if (manager.CurrentTimestamp !== ui.value) {
                    console.log('Scrubber changed, updating values');
                    manager.CurrentTimestamp = ui.value;            // values for the timeline
                    manager.CurrentDate = calcTimestep(ui.value);   // values relevant to our stations
                    clearArrows();
                    for (var i = 0; i < manager.ActiveStations.length; i++) {
                        manager.ActiveStations[i].SetCurrentDate(manager.CurrentDate);
                        if (manager.ActiveStations[i].GetCurrentDate() == manager.CurrentDate) {
                            renderArrows(manager.ActiveStations[i]);
                        }
                    }
                    updateSodarLog('Timestamp: ' + formatTimestamp(manager.CurrentDate), true);
                }
                */
            }
        });
        $( "#amount" ).val( "$" + s.slider("value"));
    });

    terrains = [];
    $.getJSON('/terrains/', function(json) {
        $.each(json, function(id, item) {
            terrains.push(item);
        });
    }).done(function(terrains) {
        $.each(terrains, function (id, terrain) {
            $("#demPicker").append('<li><a href="#" class="dem" value=' + id + '>' + terrain.name + '</a></li>');
        });
    });

    steal("leaa/ui/loadTerrain.js", function() {}); // Load rendering tools
    steal("leaa/ui/loadWind.js", function() {});    // Load data extraction tools
    steal("leaa/ui/animateWind.js", function() {}); // Wind controls
    //steal("leaa/ui/registration.js", function() {}); //TODO: Add registration functionality
    $("#registerBtn").on("click", function (event) {
        /**
         * Handle user clicking register button
         */
        //TODO: Implement
    });
    $("#signInBtn").on("click", function(event) {
        event.preventDefault();
        var loginForm = $("signInForm").serialize();
        console.log(loginForm);
        //TODO: Implement
    });

    // Colorpicker
    var colorpicker = $('#colorSelector');
    colorpicker.ColorPicker({
        color: '#ffff00',
        onShow: function (colpkr) {
            $(colpkr).fadeIn(500);
            return false;
        },
        onHide: function (colpkr) {
            $(colpkr).fadeOut(500);
            return false;
        },
        onChange: function (hsb, hex, rgb) {
            manager.ArrowColor = parseInt(hex, 16);
            clearArrows();
            for (var i = 0; i < manager.ActiveStations.length; i++) {
                renderArrows(manager.ActiveStations[i]);
            }
            $('#colorSelector div').css('backgroundColor', '#' + hex);
        }
    });
    colorpicker.ColorPickerSetColor(manager.ArrowColor.toString(16));

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