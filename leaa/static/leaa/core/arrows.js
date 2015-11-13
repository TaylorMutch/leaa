/**
 * Created by Taylor on 10/12/2015.
 */


/**
 * Kick off calls to our GPU to render.
 * @param station - a station object containing all relevant code to be shown.
 */

function drawArrows() {
    clearArrows();
    $.each(manager.ActiveStations, function(id, station) {
        renderArrows(station);
    });
}


function renderArrows(station) {
    // Get the specific arrays we want
    var speedArray = station.speeds[station.index];
    var dirArray = station.directions[station.index];
    var heightArray = station.heights;
    var stationPos = station.pos;

    // Render the arrows in the wind scene
    var arrowSet = makeArrowSet(speedArray, dirArray, heightArray, stationPos);
    $.each(arrowSet, function (handle, arrow) {
        if (arrow !== null) {
            arrow.name = "windvector";
            wind.add(arrow);
        }
    });

}

/**
Generates a moment of arrows for a single station.
 */
function makeArrowSet(spdArray, dirArray, heightArray, stationPos) {
	var arrowSet = [];
	for (var i in spdArray) {
		var arrow = makeArrow(stationPos, spdArray[i], dirArray[i], heightArray[i]);
		arrowSet.push(arrow);
	}
	return arrowSet;
}


/**
Generates a single arrow within an arrowSet.
 */
function makeArrow(stationPos, cSpeed, cDirection, cHeight) {
    var origin = new THREE.Vector3(stationPos.x, stationPos.y, stationPos.z + cHeight*.1*manager.VectorHeight);
    var vectorColor = manager.ArrowColor;
    if (isNaN(cSpeed) || cSpeed == 0) {
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
        result.cone.material.color = new THREE.Color(colorstring);
        return result;
    }
}

/**
Calculates the direction of the wind vector based on polor coordinates (credit from Christoph Thomas)

 '''Function converting wind speeds and wind direction (polar coordinates) into u and v (cartesian coordinates)

 Developed and written by Christoph Thomas,
 Dept. of Forest Science, Oregon State University, 2006
 last update 24-Mar-2009 @ COAS'''
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
Remove all arrows from the scene
 */
function clearArrows() {
    var obj, i;
    for (i = wind.children.length -1; i >= 0; i--) {
        obj = wind.children[i];
        if (obj instanceof THREE.ArrowHelper) {
            wind.remove(obj);
            renderer.dispose(obj);
        }
    }
}
