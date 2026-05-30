// // Point PDF.js to its required worker script
// pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// // We route the Google Drive link through a free proxy to bypass browser blocks
// const pdfUrl = 'https://corsproxy.io/?https://docs.google.com/uc?export=download&id=113qRCXMOqYmL316oGlY1wfCub7jX4-eD';

// let loadedPdf = null;

// // Load the PDF into memory immediately when the page opens
// pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
//     loadedPdf = pdf;
//     console.log("PDF successfully loaded! Total pages:", pdf.numPages);
// }).catch(error => {
//     console.error("Error loading PDF: ", error);
// });

// // 1. Determine which page to show based on inputs
// function handleInputSubmit() {
//     const weight = parseFloat(document.getElementById('weightInput').value);
    
//     let targetPage = 1; // Default fallback page

//     // YOUR LOGIC HERE: Map weights/inputs to specific pages
//     if (weight < 50) {
//         targetPage = 2;
//     } else if (weight >= 50 && weight < 100) {
//         targetPage = 3;
//     } else {
//         targetPage = 4;
//     }

//     // Call the rendering function for that specific page
//     renderSpecificPage(targetPage);
// }

// // 2. Render the specific page onto the HTML canvas
// function renderSpecificPage(pageNumber) {
//     if (!loadedPdf) {
//         alert("PDF is still loading, please wait a moment.");
//         return;
//     }

//     // Fetch the specific page
//     loadedPdf.getPage(pageNumber).then(page => {
//         const canvas = document.getElementById('pdf-canvas');
//         const context = canvas.getContext('2d');

//         // Set the zoom/scale factor (1.5 is usually good for iPad screens)
//         const scale = 1.5;
//         const viewport = page.getViewport({ scale: scale });

//         // Match canvas dimensions to the PDF page size
//         canvas.height = viewport.height;
//         canvas.width = viewport.width;

//         // Render the PDF page into the canvas context
//         const renderContext = {
//             canvasContext: context,
//             viewport: viewport
//         };
        
//         page.render(renderContext);
//     });
// }


pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
let loadedPdf = null;

function updateStatus(text, color = "#007aff") {
    const statusBox = document.getElementById('status-message');
    statusBox.innerText = "System Status: " + text;
    statusBox.style.borderLeftColor = color;
}

// This function fires the moment you pick a file on your iPad
function loadLocalFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    updateStatus("Reading local PDF file from iPad storage...");

    const fileReader = new FileReader();
    
    fileReader.onload = function() {
        // Convert the file into a typed array of bytes
        const typedarray = new Uint8Array(this.result);
        
        // Pass the raw bytes directly to PDF.js
        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
            loadedPdf = pdf;
            updateStatus("Local PDF loaded successfully! Ready for weight input.", "#34c759");
        }).catch(err => {
            updateStatus("PDF.js processing error: " + err.message, "#ff3b30");
        });
    };

    fileReader.readAsArrayBuffer(file);
}

// Keep your exact same handleInputSubmit() and renderSpecificPage() functions from before!
