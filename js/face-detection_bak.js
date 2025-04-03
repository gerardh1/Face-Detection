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
    Promise.all([
      faceapi.nets.ssdMobilenetv1.load(modelPath),
      faceapi.nets.faceLandmark68Net.load(modelPath),
      faceapi.nets.faceRecognitionNet.load(modelPath),
      faceapi.nets.tinyFaceDetector.load(modelPath),
      faceapi.nets.faceLandmark68TinyNet.load(modelPath),
      faceapi.nets.faceExpressionNet.load(modelPath),
      faceapi.nets.ageGenderNet.load(modelPath)
    ]).then(function(){
      createCanvas();
      startDetection();
    })
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
  const labels = ['gerard','ken_leung']; // Replace with actual labels
  for (const label of labels) {
      const img = await faceapi.fetchImage(`img/${label}.jpg`);
      const descriptors = await faceapi.detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();
      if (descriptors) {
          labeledFaceDescriptors.push(new faceapi.LabeledFaceDescriptors(label, [descriptors.descriptor]));
      }
  }

  const maxDescriptorDistance = 0.6;
  return new faceapi.FaceMatcher(labeledFaceDescriptors, maxDescriptorDistance);
}
function startDetection(){
  faceDetection = setInterval(async () => {
    // const detections = await faceapi.detectAllFaces(webcamElement, new faceapi.TinyFaceDetectorOptions())
    // .withFaceLandmarks()
    // .withFaceExpressions()
    // .withFaceDescriptor() // Include this for descriptors
    // .withAgeAndGender();
    const detections = await faceapi.detectAllFaces(webcamElement).withFaceLandmarks().withFaceDescriptors().withFaceExpressions().withAgeAndGender();
   
    const resizedDetections = faceapi.resizeResults(detections, displaySize)
    const descriptors = resizedDetections.map(d => d.descriptor); // Extract descriptors
   // let canvas = $("#canvas").get(0);
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  
    
                            displaySize = { width:540, height:304 }

                           // canvas.width = 540;
                           // canvas.height = 304;
                            //faceapi.matchDimensions(canvas, displaySize)

                            const fullFaceDescription = faceapi.resizeResults(detections, displaySize)
                            // faceapi.draw.drawDetections(canvas, fullFaceDescriptions)

                            // const labels = ["img/gerard"]

                            // const labeledFaceDescriptors = await Promise.all(
                            //     labels.map(async label => {
                            //         // fetch image data from urls and convert blob to HTMLImage element
                            //         const imgUrl = `${label}.jpg`;
                            //         const img = await faceapi.fetchImage(imgUrl)
                                    
                            //         // detect the face with the highest score in the image and compute it's landmarks and face descriptor
                            //         const fullFaceDescription = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
                                    
                            //         if (!fullFaceDescription) {
                            //           console.error(`no faces detected for ${label}`)
                            //         }
                                    
                            //         const faceDescriptors = [fullFaceDescription.descriptor]
                            //         return new faceapi.LabeledFaceDescriptors(label, faceDescriptors)
                            //     })
                            // );

                            const maxDescriptorDistance = 0.6
                            //const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, maxDescriptorDistance)
                            const faceMatcher = await setupFaceMatcher(); // Ensure matcher is set up

                            
                            
                            if (resizedDetections.length > 0) {
                            
                              const results = descriptors.map(descriptor => faceMatcher.findBestMatch(descriptor));
                              console.log('Match Results:', results);
                              if (canvas instanceof HTMLCanvasElement) {
                                faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
                             } else {
                                console.error('Canvas is not a valid HTMLCanvasElement.');
                             }
                             results.forEach((bestMatch, i) => {
                              const box = resizedDetections[i].detection.box
                              const text = bestMatch.toString()
                              const drawBox = new faceapi.draw.DrawBox(box, { label: text })
                              drawBox.draw(canvas)
                          })
                      
                            } else {
                                console.log('No faces detected.');
                            }
                      

                          //  const results = detections.map(fd => faceMatcher.findBestMatch(fd.descriptor))

                         
    
    
    
    
   
    if($("#box-switch").is(":checked")){
      faceapi.draw.drawDetections(canvas, resizedDetections)
    }
    if($("#landmarks-switch").is(":checked")){
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
    }
    if($("#expression-switch").is(":checked")){
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
    }
    if($("#age-gender-switch").is(":checked")){
      resizedDetections.forEach(result => {
        const { age, gender, genderProbability } = result
        new faceapi.draw.DrawTextField(
          [
            `${faceapi.round(age, 0)} years`,
            `${gender} (${faceapi.round(genderProbability)})`
          ],
          result.detection.box.bottomRight
        ).draw(canvas)
      })
    }
    
    if(!$(".loading").hasClass('d-none')){
      $(".loading").addClass('d-none')
    }
  }, 300)
}

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