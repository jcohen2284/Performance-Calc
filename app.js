// Global catch-all to verify library availability immediately on script execution
let pdfjsLib;
try {
    pdfjsLib = window['pdfjs-dist/build/pdf'];
    if (!pdfjsLib) {
        // Fallback check for alternative versions of the library bundle
        pdfjsLib = window.pdfjsLib;
    }
    // Set up standard worker thread reference
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
} catch (e) {
    alert("PDF.js global library script initialization failed. Check internet access or CDN link.\nError: " + e.message);
}

// App State
let loadedPdf = null;
let currentRenderTask = null; 

function updateStatus(text, color = "#007aff") {
    const statusBox = document.getElementById('status-message');
    if (statusBox) {
        statusBox.innerText = "Status: " + text;
        statusBox.style.color = color;
    }
}

/**
 * Phase 1: Main execution block triggered by HTML input or button click
 */
function initiatePdfLoad() {
    // Basic connectivity alert
    if (!pdfjsLib) {
        alert("Cannot process file: PDF Engine failed to load from script CDN provider.");
        return;
    }

    const fileInput = document.getElementById('pdf-file-picker');
    if (!fileInput) {
        alert("Error: Script could not detect the file picker component in HTML.");
        return;
    }

    const file = fileInput.files[0];
    if (!file) {
        updateStatus("No file chosen. Please tap 'Select PDF File'.", "#ff3b30");
        return;
    }

    updateStatus("Reading file locally...", "#007aff");

    const fileReader = new FileReader();
    
    fileReader.onload = function(e) {
        try {
            const typedarray = new Uint8Array(e.target.result);
            
            // Critical Local Testing Override: Disable worker thread dependencies if running off local file paths 
            const runningLocally = window.location.protocol === 'file:';

            const loadingTask = pdfjsLib.getDocument({
                data: typedarray,
                disableWorker: runningLocally, 
                verbosity: 0
            });

            loadingTask.promise.then(pdf => {
                loadedPdf = pdf;
                updateStatus("PDF Loaded Successfully! Unlocking configurations.", "#34c759");
                
                // Unfold option checks
                setupPageExclusionUI(pdf.numPages);
                document.getElementById('dynamic-config-area').style.display = 'block';
            }).catch(renderError => {
                alert("PDF Parsing Crash: " + renderError.message);
                updateStatus("Failed to read internal structure.", "#ff3b30");
            });

        } catch (innerError) {
            alert("Processing error inside reader: " + innerError.message);
        }
    };

    fileReader.onerror = function() {
        alert("Device file-system blocked access to this document via standard FileReader channels.");
    };

    fileReader.readAsArrayBuffer(file);
}

/**
 * Phase 2 Helper
 */
function setupPageExclusionUI(totalPages) {
    const container = document.getElementById('exclusion-container');
    if (!container) return;
    container.innerHTML = ""; 

    for (let i = 1; i <= totalPages; i++) {
        const row = document.createElement('div');
        row.className = 'checkbox-row';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `hide-page-${i}`;
        checkbox.value = i;

        const label = document.createElement('label');
        label.htmlFor = `hide-page-${i}`;
        label.style.margin = "0";
        label.style.cursor = "pointer";
        label.innerText = `Hide Page ${i}`;

        row.appendChild(checkbox);
        row.appendChild(label);
        container.appendChild(row);
    }
}

/**
 * Phase 3: Routing Logic
 */
function handleInputSubmit() {
    const weightInput = document.getElementById('weightInput').value;
    const weight = parseFloat(weightInput);
    
    if (!loadedPdf) {
        updateStatus("Upload document file first.", "#ffcc00");
        return;
    }
    if (weightInput === "" || isNaN(weight)) {
        updateStatus("Please enter a valid numeric weight configuration.", "#ffcc00");
        return;
    }

    let targetPage = 1; 
    if (weight < 50) {
        targetPage = 2;
    } else if (weight >= 50 && weight < 100) {
        targetPage = 3;
    } else {
        targetPage = 4;
    }

    if (targetPage > loadedPdf.numPages) {
        targetPage = loadedPdf.numPages;
    }

    if (isPageHidden(targetPage)) {
        let alternativePage = findValidAlternativePage(targetPage);
        if (alternativePage === null) {
            alert("Error: All pages are currently marked hidden.");
            return;
        }
        targetPage = alternativePage;
    }

    document.getElementById('config-screen').style.display = 'none';
    document.getElementById('display-screen').style.display = 'flex';
    
    renderSpecificPage(targetPage);
}

function isPageHidden(pageNum) {
    const box = document.getElementById(`hide-page-${pageNum}`);
    return box ? box.checked : false;
}

function findValidAlternativePage(failedPage) {
    for (let p = failedPage; p <= loadedPdf.numPages; p++) {
        if (!isPageHidden(p)) return p;
    }
    for (let p = failedPage; p >= 1; p--) {
        if (!isPageHidden(p)) return p;
    }
    return null; 
}

function renderSpecificPage(pageNumber) {
    document.getElementById('page-indicator').innerText = `Displaying Page: ${pageNumber} / ${loadedPdf.numPages}`;

    if (currentRenderTask) {
        currentRenderTask.cancel();
    }

    loadedPdf.getPage(pageNumber).then(page => {
        const canvas = document.getElementById('pdf-canvas');
        const context = canvas.getContext('2d');
        
        const pixelRatio = window.devicePixelRatio || 1;
        const baseScale = 1.5; 
        const viewport = page.getViewport({ scale: baseScale });

        canvas.height = viewport.height * pixelRatio;
        canvas.width = viewport.width * pixelRatio;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        currentRenderTask = page.render(renderContext);

        currentRenderTask.promise.then(() => {
            currentRenderTask = null; 
        }).catch(err => {
            if (err.name !== 'HeadingToNextPageError' && err.name !== 'RenderingCancelledException') {
                console.error(err);
            }
        });
    });
}

function backToConfig() {
    if (currentRenderTask) {
        currentRenderTask.cancel();
        currentRenderTask = null;
    }
    document.getElementById('display-screen').style.display = 'none';
    document.getElementById('config-screen').style.display = 'flex';
    updateStatus("Adjust inputs or exclusions and re-submit.", "#34c759");
}
