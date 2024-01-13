$(document).ready(function() {
    $('#interactive-image').mousemove(function(event) {
        var rect = this.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        $('#coordinates-display').text('X: ' + x + ', Y: ' + y);
    });
});