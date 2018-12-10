// Function to handle login/signup form switching
$(document).ready(function() {
    $(".login-form").hide();
    $(".login").css("background", "#414a4c");

    $(".login").click(function(){
        $(".signup-form").hide();
        $(".login-form").show();
        $(".signup").css("background", "#414a4c");
        $(".login").css("background", "#003399");
    });

    $(".signup").click(function(){
        $(".signup-form").show();
        $(".login-form").hide();
        $(".login").css("background", "#414a4c");
        $(".signup").css("background", "#003399");
    });
});

// Function to ensure password fields are identical 
function comparePassword() {
    var password1 = document.getElementsByName("password")[0].value;
    var password2 = document.getElementsByName("passwordConf")[0].value;
    
    if (password1 !== password2) {
        alert("Passwords do not match.");
        return false;
    }
}