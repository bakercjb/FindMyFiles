$(document).ready(function() {
    $(".login-form").hide();
    $(".login").css("background", "#414a4c");

    $(".login").click(function(){
        $(".signup-form").hide();
        $(".login-form").show();
        $(".signup").css("background", "#414a4c");
        $(".login").css("background", "#CC0000");
    });

    $(".signup").click(function(){
        $(".signup-form").show();
        $(".login-form").hide();
        $(".login").css("background", "#414a4c");
        $(".signup").css("background", "#CC0000");
    });
});

function comparePassword() {
    var password1 = document.getElementsByName("password")[0].value;
    var password2 = document.getElementsByName("passwordConf")[0].value;
    
    if (password1 !== password2) {
        alert("Passwords do not match.");
        return false;
    }
}