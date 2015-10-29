/**
 * Created by Taylor on 10/15/2015.
 */


function v_time(timestamp) {
    this.timestamp = String(timestamp);
    this.year = +this.timestamp.substr(0,2);
    this.month = +this.timestamp.substr(2,2);
    this.day = +this.timestamp.substr(4,2);
    this.hour = +this.timestamp.substr(6,2);
    this.minute = +this.timestamp.substr(8,2);
    this.second = +this.timestamp.substr(10,2);
}

