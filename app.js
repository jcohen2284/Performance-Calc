pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
let loadedPdf = null;

function updateStatus(text, color = "#007aff") {
    const statusBox = document.getElementById('status-message');
    statusBox.innerText = "Status: " + text;
    statusBox.style.color = color;
}

// Handles local file loading via iPad file browser
function loadLocalFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    updateStatus("Processing file locally...", "#007aff");

    const fileReader = new FileReader();
    fileReader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        
        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
            loadedPdf = pdf;
            updateStatus("PDF Loaded Successfully! Ready for inputs.", "#34c759");
        }).catch(err => {
            updateStatus("Error parsing PDF: " + err.message, "#ff3b30");
        });
    };
    fileReader.readAsArrayBuffer(file);
}

// Processes home page configurations and decides page visibility
function handleInputSubmit() {
    const weight = parseFloat(document.getElementById('weightInput').value);
    
    if (!loadedPdf) {
        updateStatus("Please upload a valid PDF file first.", "#ffcc00");
        return;
    }
    if (isNaN(weight)) {
        updateStatus("Please enter a numeric weight value.", "#ffcc00");
        return;
    }

    // Logic mapping ranges to specific target pages
    let targetPage = 1; 
    if (weight < 50) {
        targetPage = 2;
    } else if (weight >= 50 && weight < 100) {
        targetPage = 3;
    } else {
        targetPage = 4;
    }

    // Transition: Hide config page and render screen
    document.getElementById('config-screen').style.display = 'none';
    document.getElementById('display-screen').style.display = 'flex';
    
    renderSpecificPage(targetPage);
}

// Renders the chosen single page inside the viewing screen
function renderSpecificPage(pageNumber) {
    document.getElementById('page-indicator').innerText = "Displaying Page: " + pageNumber;

    loadedPdf.getPage(pageNumber).then(page => {
        const canvas = document.getElementById('pdf-canvas');
        const context = canvas.getContext('2d');
        
        const scale = 1.5; 
        const viewport = page.getViewport({ scale: scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        page.render(renderContext);
    });
}

// Simple function to navigate backward
function backToConfig() {
    document.getElementById('display-screen').style.display = 'none';
    document.getElementById('config-screen').style.display = 'flex';
    updateStatus("PDF still in memory. Adjust inputs and re-submit.", "#34c759");
}
