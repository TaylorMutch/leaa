/**
 * Created by Taylor on 10/11/2015.
 */
/**
 * Abstract timeline for moving timeline events forward and back.
 * @constructor
 */
function Timeline() {
    this.beginTime = new Date();
    this.endTime = new Date();
    this.currentTime = new Date();
    this.timeStep = new Date();
    this.numSteps = 0;
}

Timeline.prototype.Forward = function()
{
    if (this.currentTime.getTime() + this.timeStep.getTime() < this.endTime.getTime()) {
        this.currentTime += this.timeStep;
    }
};

Timeline.prototype.Backward = function()
{
    if (this.currentTime - this.timeStep >= this.startTime) {
        this.currentTime -= this.timeStep;
    }
};