/**
 * Created by Taylor on 10/12/2015.
 */

/**
 * Entry point function for rendering arrows to the scene based on raw station data.
 * @param station - a Station object which contains all variables necessary to associate vector objects with the station
 */
function renderArrows(station) {
    // Get the specific arrays we want
    var speedArray = station.speeds[station.index];
    var dirArray = station.directions[station.index];
    var heightArray = station.heights;
    var stationPos = station.pos;

    // Render the arrows in the wind scene
    var arrowSet = makeArrowSet(speedArray, dirArray, heightArray, stationPos);
    arrowSet.userData = {name: station.name, id: station.id};
    wind.add(arrowSet);
}

/**
 * Generates a column of arrows for a single station for a single timestamp.
 * @param spdArray - raw speed data
 * @param dirArray - raw polar direction data
 * @param heightArray - raw height data
 * @param stationPos - position of the station in model coordinates
 * @returns {THREE.Group} - a grouping of the arrows into a convenient graphics control group
 */
function makeArrowSet(spdArray, dirArray, heightArray, stationPos) {
    var group = new THREE.Group();
    group.name = 'wind';
	for (var i in spdArray) {
		var arrow = makeArrow(stationPos, spdArray[i], dirArray[i], heightArray[i]);
		arrow.userData = {
            h: heightArray[i],
            spd: spdArray[i],
            dir: dirArray[i]
        };
        group.add(arrow);
	}
    return group;
}

/**
 * Generates a single arrow within an arrowSet.
 * @param stationPos - x,y,z coordinates of station in models coordinates of the DEM
 * @param cSpeed - calculated speed of the wind vector (m/s)
 * @param cDirection - calculated direction of the wind vector (from polar to cartesian)
 * @param cHeight - calculated height of the wind vectro (from meters to model coordinates);
 * @returns {THREE.ArrowHelper} - a wind vector object
 */
function makeArrow(stationPos, cSpeed, cDirection, cHeight) {
    var origin = new THREE.Vector3(stationPos.x, stationPos.y, stationPos.z + cHeight*.1*manager.VectorHeight);
    var vectorColor = manager.ArrowColor;
    if (isNaN(cSpeed)) {
        return null;
    }
    else {
        var dir = calcDirection(cDirection);
        var target = origin.clone().add(dir);
        var qDir = new THREE.Vector3().subVectors(target, origin);
        var result = new THREE.ArrowHelper(qDir.normalize(), origin, cSpeed*manager.VectorLength, vectorColor,.5,.35);
        // Calculate the color of the arrow tip
        var fromDirection = true;  // TODO: Make this a selectable option?
        if (fromDirection) {
            var colorDir = qDir.clone().negate();
        } else {
            colorDir = qDir.clone();
        }
        var r = (colorDir.normalize().x > 0) ? parseInt(colorDir.normalize().x*255) : 0;
        var g = (colorDir.normalize().x < 0) ? parseInt(colorDir.normalize().x*-1*255) : 0;
        var b = (colorDir.normalize().y < 0) ? parseInt(colorDir.normalize().y*-1*255) : 0;
        var colorstring = "rgb(" + r.toString() + ',' + g.toString() + ',' + b.toString() +")";
        var color = new THREE.Color(colorstring);
        result.cone.material = new THREE.MeshLambertMaterial();
        result.cone.material.emissive = color;
        return result;
    }
}
/**
 * Calculates the direction of the wind vector based on polor coordinates (credit from Christoph Thomas)
 * 'Function converting wind speeds and wind direction (polar coordinates) into u and v (cartesian coordinates)'
 * Developed and written by Christoph Thomas,
 * Dept. of Forest Science, Oregon State University, 2006
 * last update 24-Mar-2009 @ COAS'''
 *
 * @param dir - polar direction
 * @returns {THREE.Vector3}, the vector direction in model coordinates.
 */
function calcDirection(dir) {
    var dirRadians = (dir/360.0)*2*Math.PI;
    var u = 0;
    var v = 0;

    if (dirRadians > 0 && dirRadians <= Math.PI * 0.5) {
        u = Math.sin(dirRadians);
        v = -Math.cos(dirRadians);
    }
    else if (dirRadians > Math.PI * 0.5 && dirRadians <= Math.PI) {
        u = -Math.sin(2*Math.PI - dirRadians);
        v = -Math.cos(2*Math.PI - dirRadians);
    }
    else if (dirRadians > Math.PI && dirRadians <= Math.PI * 1.5) {
        u = -Math.sin(dirRadians - Math.PI);
        v = Math.cos(dirRadians - Math.PI);
    }
    else if (dirRadians > Math.PI * 1.5 || dirRadians == 0) {
        u = Math.sin(Math.PI - dirRadians);
        v = Math.cos(Math.PI - dirRadians);
    }
    //console.log("u = " + u + " v = " + v);
    return new THREE.Vector3(u, v, 0);
}

/**
 * Helper function for removing all arrows from the scene
 */
function clearArrows() {
    var obj, i;
    for (i = wind.children.length -1; i >= 0; i--) {
        obj = wind.children[i];
        if (obj.name === 'wind') wind.remove(obj);
    }
}

/**
 * Helper function for drawing our arrows when we adjust variables in the GUI
 */
function drawArrows() {
    clearArrows();
    $.each(manager.ActiveStations, function(id, station) {
        renderArrows(station);
    });
}
