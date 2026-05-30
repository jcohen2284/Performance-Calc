// Configure PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// App State
let loadedPdf = null;
let currentRenderTask = null; 

/**
 * Updates UI status ribbon
 */
function updateStatus(text, color = "#007aff") {
    const statusBox = document.getElementById('status-message');
    if (statusBox) {
        statusBox.innerText = "Status: " + text;
        statusBox.style.color = color;
    }
}

/**
 * Phase 1: Triggered when clicking "Load PDF Document"
 * Validates selection, parses the file, and unlocks configuration inputs
 */
function initiatePdfLoad() {
    const fileInput = document.getElementById('pdf-file-picker');
    const file = fileInput.files[0];

    if (!file) {
        updateStatus("Please select a file from your device first.", "#ff3b30");
        return;
    }

    updateStatus("Reading file locally...", "#007aff");

    const fileReader = new FileReader();
    fileReader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        
        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
            loadedPdf = pdf;
            updateStatus("PDF Loaded Successfully! Unlocking configurations.", "#34c759");
            
            // Build the optional page manager interface
            setupPageExclusionUI(pdf.numPages);

            // Reveal Phase 2 configuration sections gracefully
            document.getElementById('dynamic-config-area').style.display = 'block';
        }).catch(err => {
            updateStatus("Error parsing PDF: " + err.message, "#ff3b30");
            console.error(err);
        });
    };
    fileReader.readAsArrayBuffer(file);
}

/**
 * Phase 2 Helper: Creates the optional checklist of pages dynamically
 */
function setupPageExclusionUI(totalPages) {
    const container = document.getElementById('exclusion-container');
    container.innerHTML = ""; // Clear out previous generation if any

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
 * Phase 3: Handles rule calculations and jumps over hidden pages
 */
function handleInputSubmit() {
    const weightInput = document.getElementById('weightInput').value;
    const weight = parseFloat(weightInput);
    
    if (!loadedPdf) {
        updateStatus("Please upload a valid PDF file first.", "#ffcc00");
        return;
    }
    if (weightInput === "" || isNaN(weight)) {
        updateStatus("Please enter a numeric weight value.", "#ffcc00");
        return;
    }

    // Determine target page baseline based on weight ranges
    let targetPage = 1; 
    if (weight < 50) {
        targetPage = 2;
    } else if (weight >= 50 && weight < 100) {
        targetPage = 3;
    } else {
        targetPage = 4;
    }

    // Safety fallback: Ensure base calculation doesn't overshoot absolute counts
    if (targetPage > loadedPdf.numPages) {
        targetPage = loadedPdf.numPages;
    }

    // Optional Checklist Check: If calculated page is marked hidden, find closest accessible alternative
    if (isPageHidden(targetPage)) {
        let alternativePage = findValidAlternativePage(targetPage);
        if (alternativePage === null) {
            alert("Error: All pages in this document have been hidden. Please uncheck some options.");
            return;
        }
        targetPage = alternativePage;
    }

    // Transition Screen Visibility
    document.getElementById('config-screen').style.display = 'none';
    document.getElementById('display-screen').style.display = 'flex';
    
    renderSpecificPage(targetPage);
}

/**
 * Checks if a page index has a checked box next to it
 */
function isPageHidden(pageNum) {
    const box = document.getElementById(`hide-page-${pageNum}`);
    return box ? box.checked : false;
}

/**
 * Fallback router: Finds the next closest accessible page if target was hidden
 */
function findValidAlternativePage(failedPage) {
    // Look forward first
    for (let p = failedPage; p <= loadedPdf.numPages; p++) {
        if (!isPageHidden(p)) return p;
    }
    // Loop backward if forward is exhausted
    for (let p = failedPage; p >= 1; p--) {
        if (!isPageHidden(p)) return p;
    }
    return null; // All pages are blocked
}

/**
 * Renders a single page onto the viewing canvas with Retina High-DPI support
 */
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
                console.error("Render error:", err);
            }
        });
    });
}

/**
 * Resets view backward
 */
function backToConfig() {
    if (currentRenderTask) {
        currentRenderTask.cancel();
        currentRenderTask = null;
    }

    document.getElementById('display-screen').style.display = 'none';
    document.getElementById('config-screen').style.display = 'flex';
    updateStatus("Adjust inputs or exclusions and re-submit.", "#34c759");
}
