// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadContent = document.getElementById('uploadContent');
const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const fileName = document.getElementById('fileName');
const removeImage = document.getElementById('removeImage');
const outputFormat = document.getElementById('outputFormat');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const convertBtn = document.getElementById('convertBtn');
const sizeTooltip = document.getElementById('sizeTooltip');
const sizeValue = document.getElementById('sizeValue');

let currentFile = null;
let debounceTimer = null;
let currentImageData = null; // Stores the loaded image for size calculation

// Quality Slider Update with Live Size Preview
qualitySlider.addEventListener('input', (e) => {
    qualityValue.textContent = `${e.target.value}%`;

    // Position and show tooltip
    updateTooltipPosition();
    sizeTooltip.classList.add('visible');

    // Clear previous debounce timer
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    // Show calculating state
    sizeTooltip.classList.add('calculating');
    sizeValue.textContent = 'Calculating';

    // Debounce: Calculate size after 300ms of inactivity
    debounceTimer = setTimeout(() => {
        calculateOutputSize();
    }, 300);
});

// Hide tooltip when slider loses focus or mouse leaves
qualitySlider.addEventListener('mouseleave', () => {
    // Hide tooltip after a short delay to allow for re-interaction
    setTimeout(() => {
        if (!qualitySlider.matches(':active')) {
            sizeTooltip.classList.remove('visible');
        }
    }, 1500);
});

qualitySlider.addEventListener('mouseup', () => {
    // Keep tooltip visible for a bit after release
    setTimeout(() => {
        sizeTooltip.classList.remove('visible');
    }, 2000);
});

// Update tooltip position to follow slider thumb
function updateTooltipPosition() {
    const sliderRect = qualitySlider.getBoundingClientRect();
    const containerRect = qualitySlider.parentElement.getBoundingClientRect();
    const value = qualitySlider.value;
    const min = qualitySlider.min;
    const max = qualitySlider.max;

    // Calculate thumb position (accounting for thumb width)
    const thumbWidth = 20; // Match CSS thumb width
    const trackWidth = sliderRect.width - thumbWidth;
    const percentage = (value - min) / (max - min);
    const thumbPosition = (percentage * trackWidth) + (thumbWidth / 2);

    // Set tooltip position
    sizeTooltip.style.left = `${thumbPosition}px`;
}

// Calculate estimated output file size
async function calculateOutputSize() {
    if (!currentImageData) {
        sizeTooltip.classList.remove('calculating');
        sizeValue.textContent = '--';
        return;
    }

    try {
        const format = outputFormat.value;
        const quality = qualitySlider.value / 100;

        // Create canvas for size simulation
        const canvas = document.createElement('canvas');
        canvas.width = currentImageData.width;
        canvas.height = currentImageData.height;

        const ctx = canvas.getContext('2d');

        // Fill with white background for JPEG (no transparency)
        if (format === 'jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(currentImageData, 0, 0);

        // Get blob to calculate real size
        const mimeType = `image/${format}`;

        canvas.toBlob((blob) => {
            if (blob) {
                const size = blob.size;
                sizeValue.textContent = formatFileSize(size);
            } else {
                sizeValue.textContent = 'Error';
            }
            sizeTooltip.classList.remove('calculating');
        }, mimeType, quality);

    } catch (error) {
        console.error('Size calculation error:', error);
        sizeValue.textContent = 'Error';
        sizeTooltip.classList.remove('calculating');
    }
}

// Format bytes to human-readable size (KB or MB)
function formatFileSize(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
}

// Drag and Drop Events
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        handleFile(files[0]);
    }
});

// Click to Upload
dropZone.addEventListener('click', () => {
    if (!currentFile) {
        fileInput.click();
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// Handle File Selection
function handleFile(file) {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (PNG, JPG, or WEBP)');
        return;
    }

    currentFile = file;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        fileName.textContent = file.name;

        // Toggle visibility
        uploadContent.classList.add('hidden');
        previewContainer.classList.remove('hidden');

        // Enable convert button
        convertBtn.disabled = false;

        // Load image for size calculation
        const img = new Image();
        img.onload = () => {
            currentImageData = img;
            // Calculate initial size
            calculateOutputSize();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Recalculate size when format changes
outputFormat.addEventListener('change', () => {
    if (currentImageData) {
        sizeTooltip.classList.add('visible');
        updateTooltipPosition();
        sizeTooltip.classList.add('calculating');
        sizeValue.textContent = 'Calculating';
        calculateOutputSize();

        // Hide tooltip after showing new size
        setTimeout(() => {
            sizeTooltip.classList.remove('visible');
        }, 2500);
    }
});

// Remove Image
removeImage.addEventListener('click', (e) => {
    e.stopPropagation();
    resetUpload();
});

function resetUpload() {
    currentFile = null;
    currentImageData = null;
    fileInput.value = '';
    imagePreview.src = '';
    fileName.textContent = '';

    uploadContent.classList.remove('hidden');
    previewContainer.classList.add('hidden');

    convertBtn.disabled = true;

    // Reset tooltip
    sizeTooltip.classList.remove('visible');
    sizeValue.textContent = '--';
}

// Convert and Download
convertBtn.addEventListener('click', async () => {
    if (!currentFile) return;

    convertBtn.classList.add('loading');
    convertBtn.textContent = 'Converting...';

    try {
        const format = outputFormat.value;
        const quality = qualitySlider.value / 100;

        // Create canvas for conversion
        const img = new Image();
        img.src = imagePreview.src;

        await new Promise((resolve) => {
            img.onload = resolve;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');

        // Fill with white background for JPEG (no transparency)
        if (format === 'jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);

        // Convert to desired format
        const mimeType = `image/${format}`;
        const dataUrl = canvas.toDataURL(mimeType, quality);

        // Create download link
        const link = document.createElement('a');
        const originalName = currentFile.name.replace(/\.[^/.]+$/, '');
        link.download = `${originalName}_converted.${format === 'jpeg' ? 'jpg' : format}`;
        link.href = dataUrl;
        link.click();

        // Reset button
        convertBtn.classList.remove('loading');
        convertBtn.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            Convert & Download
        `;

    } catch (error) {
        console.error('Conversion error:', error);
        alert('An error occurred during conversion. Please try again.');

        convertBtn.classList.remove('loading');
        convertBtn.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            Convert & Download
        `;
    }
});