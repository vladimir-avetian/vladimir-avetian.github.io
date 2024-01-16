$(document).ready(function() {
    $('#interactive-image').mousemove(function(event) {
        var rect = this.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        $('#coordinates-display').text('X: ' + x + ', Y: ' + y);
    });

    $('.change-image').click(function() {
        var newImage = $(this).data('image');
        $('#interactive-image').attr('src', newImage);

        var arrText = "";
        switch(newImage) {
            case 'paris_buildings_1e.png':
                arrText = "1e Arrondissement de Paris";
                break;
            case 'paris_buildings_2e.png':
                arrText = "2e Arrondissement de Paris";
                break;
            case 'paris_buildings_3e.png':
                arrText = "3e Arrondissement de Paris";
                break;
            case 'paris_buildings_15e.png':
                arrText = "15e Arrondissement de Paris";
                break;
            default:
                arrText = "Paris";
        }
        $('#overlay-text').text(arrText);
    });
});