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
            case 'pics/paris_buildings_arrond_1.png':
                arrText = "1 Arrondissement de Paris";
                break;
            case 'pics/paris_buildings_arrond_2.png':
                arrText = "2 Arrondissement de Paris";
                break;
            case 'pics/paris_buildings_arrond_3.png':
                arrText = "3 Arrondissement de Paris";
                break;
            case 'pics/paris_buildings_arrond_4.png':
                arrText = "4 Arrondissement de Paris";
                break;
            case 'pics/paris_buildings_arrond_5.png':
                arrText = "5 Arrondissement de Paris";
                break;               
            case 'pics/paris_buildings_arrond_6.png':
                arrText = "6 Arrondissement de Paris";
                break;
            case 'pics/paris_buildings_arrond_7.png':
                arrText = "7 Arrondissement de Paris";
                break;
            case 'pics/paris_buildings_arrond_8.png':
                arrText = "8 Arrondissement de Paris";
                break;
            case 'pics/paris_buildings_arrond_9.png':
                arrText = "9 Arrondissement de Paris";
                break;
            case 'pics/paris_buildings_arrond_10.png':
                arrText = "10 Arrondissement de Paris";
                break;
            case 'pics/paris_buildings_arrond_11.png':
                arrText = "11 Arrondissement de Paris";
                break;                                                                                               
            case 'pics/paris_buildings_arrond_12.png':
                arrText = "12 Arrondissement de Paris";
                break;                                 
            case 'pics/paris_buildings_arrond_13.png':
                arrText = "13 Arrondissement de Paris";
                break;                                 
            case 'pics/paris_buildings_arrond_14.png':
                arrText = "14 Arrondissement de Paris";
                break;                                 
            case 'pics/paris_buildings_arrond_15.png':
                arrText = "15 Arrondissement de Paris";
                break;                                 
            case 'pics/paris_buildings_arrond_16.png':
                arrText = "16 Arrondissement de Paris";
                break;                                 
            case 'pics/paris_buildings_arrond_17.png':
                arrText = "17 Arrondissement de Paris";
                break;                                 
            case 'pics/paris_buildings_arrond_18.png':
                arrText = "18 Arrondissement de Paris";
                break;                                 
            case 'pics/paris_buildings_arrond_19.png':
                arrText = "19 Arrondissement de Paris";
                break;                                 
            case 'pics/paris_buildings_arrond_20.png':
                arrText = "20 Arrondissement de Paris";
                break;                                                                                                                                                                                                                                 
            default:
                arrText = "Paris";
        }
        $('#overlay-text').text(arrText);
    });
});