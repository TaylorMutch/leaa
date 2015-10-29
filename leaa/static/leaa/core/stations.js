/**
 * Created by Taylor on 10/11/2015.
 */
/**
 * Container for all things scientific to SODAR stations.
 * @param data - Data from the server
 * TODO: Simplify how this is declared, probably a better way to do it but this works for now
 * @constructor
 */
function Station(data){

    // Data from server
    this.name = data['name'];
    this.dates = data['dates'];
    this.heights = data['heights'];
    this.speeds = data['speeds'];
    this.directions = data['directions'];
    this.demX = data['demX'];
    this.demY = data['demY'];
    this.utmX = data['utmX'];
    this.utmY = data['utmY'];
    this.lat = data['lat'];
    this.long = data['long'];
    this.terrain = data['terrain'];
    this.id = data['id'];

    // Initial values for the visualization
    this.index = 0;
    this.isCurrent = true; // TODO: will this work?
    this.pos = new THREE.Vector3(0,0,0);
}

Station.prototype.Backward = function() {
    this.index = this.index >= 0 ? this.index - 1 : this.index;
};


Station.prototype.CheckBackward = function() {
    if (this.index > 0) {
        return this.index -1;
    }
    return null;
};

Station.prototype.Forward = function() {
    this.index = this.index <= this.dates.length-1 ? this.index + 1 : this.index;
};

Station.prototype.CheckForward = function() {
    if (this.index < this.dates.length-1) {
        return this.index +1;
    }
    return null;
};

Station.prototype.GetCurrentDate = function() {
    return this.dates[this.index];
};

/** This takes dates from the manager.CurrentDate */
Station.prototype.SetCurrentDate = function(_timestamp) {
    //Make this better? Intelligent way to just find the right timestamp?
    var i, j;

    var _index = this.dates.indexOf(_timestamp); // get the index of the timestamp

    if (_index == -1) { // we didn't find one, so go find the biggest one that is smaller than the timestamp.
        var max = 0;
        for (i = 0; i < this.dates.length; i++) {
            if (this.dates[i] > max && this.dates[i] < _timestamp) max = this.dates[i];
        }
        _index = this.dates.indexOf(max);

        if (_index == -1) { // we still didn't find one, so we give up and reset the station. //TODO: Is this sufficient?
            _index = 0;
        }
    }
    this.index = _index;
};

Station.prototype.ResetIndex = function() {
    this.index = 0;
};

Station.prototype.SetIndex = function(_index) {
    if (!(_index < 0) && !(_index >= this.dates.length)) {
        this.index = _index;
    }
};