// Function which allows users to expand screenshot/webcam photos.
$(document).ready(function() {
   // Get the modal
    var modal = document.getElementById('webcamModal');

    // Get the image and insert it inside the modal - use its "alt" text as a caption
    var img = document.getElementById('webcamId');
    var modalImg = document.getElementById("webcamModalImg");
    var captionText = document.getElementById("webcamCaption");
    
    
    if(img.src == 'data:image/jpg;base64,') {
        img.style.visibility = "hidden";    
    }
        
    img.onclick = function(){
        modal.style.display = "block";
        modalImg.src = this.src;
        captionText.innerHTML = this.alt;
    }

    // Get the <span> element that closes the modal
    var span = document.getElementsByClassName("close")[0];

    // When the user clicks on <span> (x), close the modal
    span.onclick = function() { 
        modal.style.display = "none";
    }
    
    var screenShotModal = document.getElementById('screenshotModal');

    // Get the image and insert it inside the modal - use its "alt" text as a caption
    var screenshotImg = document.getElementById('screenshotId');
    var screenshotModalImg = document.getElementById("screenshotModalImg");
    var screenshotCaptionText = document.getElementById("screenshotCaption");
    
    if(screenshotImg.src == 'data:image/jpg;base64,') {
        screenshotImg.style.visibility = "hidden";    
    }
    
    screenshotImg.onclick = function(){
        screenShotModal.style.display = "block";
        screenshotModalImg.src = this.src;
        screenshotCaptionText.innerHTML = this.alt;
    }

    // Get the <span> element that closes the modal
    var screenshotSpan = document.getElementsByClassName("closeScreenshot")[0];

    // When the user clicks on <span> (x), close the modal
    screenshotSpan.onclick = function() { 
        screenShotModal.style.display = "none";
    } 
});

// Delay refresh page when requesting a new webcam/screenshot image
function delay() {
    var timeout = 3000;
    
    setTimeout(function () {
        window.location.href= window.location.href
    }, timeout);
}