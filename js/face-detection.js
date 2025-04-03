const webcamElement = document.getElementById('webcam');
const webcam = new Webcam(webcamElement, 'user');
const modelPath = 'models';
let currentStream;
let displaySize;
let canvas;
let faceDetection;

$("#webcam-switch").change(function () {
  if(this.checked){
      webcam.start()
          .then(result =>{
             cameraStarted();
             webcamElement.style.transform = "";
             console.log("webcam started");
          })
          .catch(err => {
              displayError();
          });
  }
  else {        
      cameraStopped();
      webcam.stop();
      console.log("webcam stopped");
  }        
});

$('#cameraFlip').click(function() {
    webcam.flip();
    webcam.start()
    .then(result =>{ 
      webcamElement.style.transform = "";
    });
});

$("#webcam").bind("loadedmetadata", function () {
  displaySize = { width:this.scrollWidth, height: this.scrollHeight }
  console.log("this.scrollWidth",this.scrollWidth);
  console.log("this.scrollHeight",this.scrollHeight);
});

$("#detection-switch").change(function () {
  if(this.checked){
    toggleContrl("box-switch", true);
    toggleContrl("landmarks-switch", true);
    toggleContrl("expression-switch", true);
    toggleContrl("age-gender-switch", true);
    $("#box-switch").prop('checked', true);
    $(".loading").removeClass('d-none');
  
   

    loadModels().then(() => {
      setTimeout(() => {
       
        createCanvas();
       
      
        requestAnimationFrame(faceDetection);
      }, 1000); // Start after a delay
   });
  }
  else {
    clearInterval(faceDetection);
    toggleContrl("box-switch", false);
    toggleContrl("landmarks-switch", false);
    toggleContrl("expression-switch", false);
    toggleContrl("age-gender-switch", false);
    if(typeof canvas !== "undefined"){
      setTimeout(function() {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
      }, 1000);
    }
  }        
});

function createCanvas(){
  if( document.getElementsByTagName("canvas").length == 0 )
  {
    canvas = faceapi.createCanvasFromMedia(webcamElement)
    document.getElementById('webcam-container').append(canvas)
    faceapi.matchDimensions(canvas, displaySize)
  }
}

function toggleContrl(id, show){
  if(show){
    $("#"+id).prop('disabled', false);
    $("#"+id).parent().removeClass('disabled');
  }else{
    $("#"+id).prop('checked', false).change();
    $("#"+id).prop('disabled', true);
    $("#"+id).parent().addClass('disabled');
  }
}


async function setupFaceMatcher() {
  const labeledFaceDescriptors = [];

  // Populate labeledFaceDescriptors with known faces
  const labels = ['Carmen_Kwok','Samuel_Hung','Gerard','Ken_Leung']; // Replace with actual labels
  for (const label of labels) {
      const img = await faceapi.fetchImage(`img/${label}.jpg`);
      const descriptors = await faceapi.detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();
      if (descriptors) {
          labeledFaceDescriptors.push(new faceapi.LabeledFaceDescriptors(label, [descriptors.descriptor]));
      }
  }

  const maxDescriptorDistance = 0.8;
  return new faceapi.FaceMatcher(labeledFaceDescriptors, maxDescriptorDistance);
}


const loadModels = async () => {
  await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
      faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelPath),
  ]);
};




let frameCount = 0;
const detectionInterval = 2; // Adjusted for more frequent detection



faceDetection =async () => {
  frameCount++;
  if (frameCount % detectionInterval === 0) {
    const mtcnnOptions = new faceapi.MtcnnOptions({
      minFaceSize: 20,
      scaleFactor: 0.709,
      maxNumScales: 10,
      scoreThresholds: [0.6, 0.7, 0.7]
    });
    const detections = await faceapi.detectAllFaces(webcamElement, new faceapi.TinyFaceDetectorOptions({
      inputSize: 320, // Reduced input size
      scoreThreshold: 0.7 // Score threshold
    }), 
    new faceapi.SsdMobilenetv1Options({ minConfidence: 0.8 }),
    mtcnnOptions).withFaceLandmarks().withFaceDescriptors();

    
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const descriptors = resizedDetections.map(d => d.descriptor);
        
        if (resizedDetections.length > 0 || frameCount % 10 === 0) {
          // Draw only when faces are detected or every 10 frames
     
          const faceMatcher = await setupFaceMatcher(); 
         // const threshold = 0.1; 

       
          const results = descriptors.map(descriptor => faceMatcher.findBestMatch(descriptor));
          canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    
      
          results.forEach((bestMatch, i) => {
            const box = resizedDetections[i].detection.box;
          
            const threshold = 0.38; // Set your confidence threshold
        
            
            //Check the distance and determine the displayed label
            const displayLabel = bestMatch.distance < threshold ? bestMatch.toString() : "Unknown";
            
            const drawBox = new faceapi.draw.DrawBox(box, { label: displayLabel });
            drawBox.draw(canvas);
          });
        } else {

           
          const context = canvas.getContext('2d');
          context.clearRect(0, 0, canvas.width, canvas.height); 
          console.log('No faces detected.');
        }
      }
 
                      
                         
    
      requestAnimationFrame(faceDetection);
    
    
   
    // if($("#box-switch").is(":checked")){
    //   faceapi.draw.drawDetections(canvas, resizedDetections)
    // }
    // if($("#landmarks-switch").is(":checked")){
    //   faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
    // }
    // if($("#expression-switch").is(":checked")){
    //   faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
    // }
    // if($("#age-gender-switch").is(":checked")){
    //   resizedDetections.forEach(result => {
    //     const { age, gender, genderProbability } = result
    //     new faceapi.draw.DrawTextField(
    //       [
    //         `${faceapi.round(age, 0)} years`,
    //         `${gender} (${faceapi.round(genderProbability)})`
    //       ],
    //       result.detection.box.bottomRight
    //     ).draw(canvas)
    //   })
    // }
    
    if(!$(".loading").hasClass('d-none')){
      $(".loading").addClass('d-none')
    }
  };
function cameraStarted(){
  toggleContrl("detection-switch", true);
  $("#errorMsg").addClass("d-none");
  if( webcam.webcamList.length > 1){
    $("#cameraFlip").removeClass('d-none');
  }
}

function cameraStopped(){
  toggleContrl("detection-switch", false);
  $("#errorMsg").addClass("d-none");
  $("#cameraFlip").addClass('d-none');
}

function displayError(err = ''){
  if(err!=''){
      $("#errorMsg").html(err);
  }
  $("#errorMsg").removeClass("d-none");
}