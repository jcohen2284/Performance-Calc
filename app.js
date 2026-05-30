let pdfjsLib;
try {
    pdfjsLib = window['pdfjs-dist/build/pdf'];
    if (!pdfjsLib) {
        pdfjsLib = window.pdfjsLib;
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
} catch (e) {
    alert("PDF.js global library script initialization failed. Check internet access or CDN link.\nError: " + e.message);
}

// App State
let loadedPdf = null;
let currentRenderTask = null; 
let currentPageNum = 1;

function updateStatus(text, color = "#007aff") {
    const statusBox = document.getElementById('status-message');
    if (statusBox) {
        statusBox.innerText = "Status: " + text;
        statusBox.style.color = color;
    }
}

function initiatePdfLoad() {
    if (!pdfjsLib) {
        alert("Cannot process file: PDF Engine failed to load from script CDN provider.");
        return;
    }

    const fileInput = document.getElementById('pdf-file-picker');
    const file = fileInput ? fileInput.files[0] : null;
    if (!file) {
        updateStatus("No file chosen. Please select a local PDF file first.", "#ff3b30");
        return;
    }

    updateStatus("Reading file locally...", "#007aff");
    const fileReader = new FileReader();
    
    fileReader.onload = function(e) {
        try {
            const typedarray = new Uint8Array(e.target.result);
            const runningLocally = window.location.protocol === 'file:';

            const loadingTask = pdfjsLib.getDocument({
                data: typedarray,
                disableWorker: runningLocally, 
                verbosity: 0
            });

            loadingTask.promise.then(pdf => {
                loadedPdf = pdf;
                updateStatus("PDF Loaded Successfully! Unlocking configurations.", "#34c759");
                
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

    fileReader.readAsArrayBuffer(file);
}

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
 * Phase 3: Display Screen Init Routing Logic
 */
function handleInputSubmit() {
    if (!loadedPdf) {
        updateStatus("Upload document file first.", "#ffcc00");
        return;
    }

    currentPageNum = 1; 

    // Sweep checking from page 1 forward to bypass exclusions initially
    if (isPageHidden(currentPageNum)) {
        let alternativePage = findValidAlternativePage(currentPageNum, 1);
        if (alternativePage === null) {
            alert("Error: All pages are currently marked hidden.");
            return;
        }
        currentPageNum = alternativePage;
    }

    // Toggle viewport screens
    document.getElementById('config-screen').style.display = 'none';
    document.getElementById('display-screen').style.display = 'flex';
    
    // Critical: Let layout calculations stabilize prior to driving canvas contexts
    requestAnimationFrame(() => {
        renderSpecificPage(currentPageNum);
    });
}

function isPageHidden(pageNum) {
    const box = document.getElementById(`hide-page-${pageNum}`);
    return box ? box.checked : false;
}

/**
 * Dynamic pagination scanning adjustments
 */
function changePage(direction) {
    let checkPage = currentPageNum + direction;
    
    // Scan loop to cleanly skip hidden entries down the line
    while (checkPage >= 1 && checkPage <= loadedPdf.numPages) {
        if (!isPageHidden(checkPage)) {
            currentPageNum = checkPage;
            renderSpecificPage(currentPageNum);
            return;
        }
        checkPage += direction;
    }
}

function findValidAlternativePage(failedPage, step = 1) {
    for (let p = failedPage; p <= loadedPdf.numPages; p++) {
        if (!isPageHidden(p)) return p;
    }
    for (let p = failedPage; p >= 1; p--) {
        if (!isPageHidden(p)) return p;
    }
    return null; 
}

/**
 * Phase 4: Active Canvas Frame Processing
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
