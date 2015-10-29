/**
 * Created by Taylor on 9/2/2015.
 */

/**
 * Get the station objects from server so that we can operate on them.
 */
steal(function () {
    $("ul").on("click", "a.recordDate", function () {
        var recordDate = $(this).html();
        if (recordDate !== manager.RecordDate) {
            clearArrows();
            manager.RecordDate = recordDate;
            $.getJSON('/getStationObjects/', {'stations[]': stationNames, 'recordDate': recordDate}, function (result) {
                rawStationData = result;
            }).done(function () {
                    manager.ActiveStations = [];
                    $.each(rawStationData, function (station, data) {
                        manager.ActiveStations.push(new Station(data));
                    });
                    $.each(manager.ActiveStations, function (id, station) {
                        station.pos = manager.TerrainMap[(station.demY * manager.ActiveDEM.DEMx) + station.demX];
                        renderArrows(station);
                    });

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
                    manager.Timeline.numSteps = (manager.Timeline.endTime.getTime() - manager.Timeline.beginTime.getTime()) /
                        manager.Timeline.timeStep;

                    // Enable the UI timeline, vector and playback controls
                    $('#timelineSlider').slider({
                        disabled: false,
                        value: manager.Timeline.beginTime.getTime(),
                        min: manager.Timeline.beginTime.getTime(),
                        max: manager.Timeline.endTime.getTime(),
                        step: manager.Timeline.timeStep
                    });
                    $('#vectorHeight').slider({disabled: false});
                    $('#vectorLength').slider({disabled: false});
                    $('#begin').removeClass('disabled');
                    $('#forward').removeClass('disabled');
                    $('#back').removeClass('disabled');
                    $('#play').removeClass('disabled');
                    $('#reset').removeClass('disabled');
                    $('#live-update').removeClass('disabled');
                    // Initialize our initial values for this set of data.
                    manager.CurrentTimestamp = manager.Timeline.beginTime.getTime();
                    manager.CurrentDate = calcTimestep(manager.CurrentTimestamp);
                }
            );

        }

        $('#live-update').on('click', function() {
            manager.LiveUpdate = !manager.LiveUpdate;
            //$(this).html(($(this).html().contains('Enable') ? 'Disable Live Update' : 'Enable Live Update'));
        });


        console.log(recordDate);
        $("#current-timestamp-label").html(manager.ActiveDEM.name + ': ' + recordDate);
        updateSodarLog('Loaded records from: ' + recordDate, false);
    });
});