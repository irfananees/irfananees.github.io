// Constants for Google Drive API
const API_KEY = 'AIzaSyBmf6NwuSCpzaIBRao9P-rs7rXz4ULGG00';
const FOLDER_ID = '1BmgaxZn_IvCjy6ahPR7fLjUs09cxHvlr';
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';

let imageList = []; // To store the list of images for navigation
let currentIndex = 0; // Track the current image index
let isZoomed = false; // Track zoom state
let isDragging = false; // Track dragging state
let startX = 0, startY = 0; // Start positions for dragging
let offsetX = 0, offsetY = 0; // Track drag offsets

// Fetch photos from Google Drive
async function fetchPhotosFromDrive(nextPageToken = null) {
    try {
        const queryParams = new URLSearchParams({
            key: API_KEY,
            q: `'${FOLDER_ID}' in parents and mimeType contains 'image/' and trashed=false`,
            fields: 'nextPageToken, files(id, name, webContentLink, thumbnailLink)',
            pageSize: 100,
        });

        if (nextPageToken) {
            queryParams.append('pageToken', nextPageToken);
        }

        const response = await fetch(`${DRIVE_API_URL}?${queryParams}`);
        if (!response.ok) {
            throw new Error('Failed to fetch files from Google Drive.');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching photos:', error.message);
        return { files: [], nextPageToken: null };
    }
}

// Render photos in a Masonry Grid
async function renderPhotos() {
    const galleryContainer = document.getElementById('gallery');
    const loadingText = document.getElementById('loading');

    let nextPageToken = null;

    do {
        const data = await fetchPhotosFromDrive(nextPageToken);
        nextPageToken = data.nextPageToken;

        // Render each photo as it's loaded
        data.files.forEach((photo, index) => {
            const imgElement = document.createElement('img');

            // Use high-resolution image if available
            if (photo.thumbnailLink) {
                imgElement.src = photo.thumbnailLink.replace('=s220', '=s1024'); // Better resolution
            } else if (photo.webContentLink) {
                imgElement.src = photo.webContentLink;
            } else {
                return; // Skip if no valid image link
            }

            // Add image to the list
            imageList.push({
                src: imgElement.src,
                index,
            });

            // Check if the image is in the viewport
            if (!isInViewport(imgElement)) {
                imgElement.setAttribute('data-aos', 'fade-up');
                imgElement.setAttribute('data-aos-anchor-placement', 'top-center');
            }

            imgElement.alt = 'Image';
            imgElement.classList.add('masonry-item'); // Class for styling
            imgElement.addEventListener('click', () => openModal(index)); // Open modal on click
            galleryContainer.appendChild(imgElement);

            // Trigger fade-in for new images
            observer.observe(imgElement);
        });
    } while (nextPageToken);

    loadingText.style.display = 'none'; // Hide loading text
}

// Helper function to check if an element is in the viewport
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Intersection Observer for fade-in effect
const observer = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                observer.unobserve(entry.target); // Stop observing after fading in
            }
        });
    },
    { threshold: 0.2 } // Trigger when 20% of the image is visible
);

// Open Modal
function openModal(index) {
    currentIndex = index;

    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-image');

    const { src } = imageList[currentIndex];

    modalImg.src = src.replace('=s1024', '=s1920'); // Load highest resolution
    modal.style.display = 'flex';

    // Reset zoom and offsets
    modalImg.style.transform = 'scale(1)';
    modalImg.style.cursor = 'zoom-in';
    offsetX = 0;
    offsetY = 0;
    isZoomed = false;
}

// Close Modal
function closeModal() {
    const modal = document.getElementById('image-modal');
    modal.style.display = 'none';
}

// Navigate to the Next Image
function nextImage() {
    currentIndex = (currentIndex + 1) % imageList.length;
    openModal(currentIndex);
}

// Navigate to the Previous Image
function prevImage() {
    currentIndex = (currentIndex - 1 + imageList.length) % imageList.length;
    openModal(currentIndex);
}

// Enable Zoom and Dragging
function enableZoom(event) {
    const modalImg = event.target;
    isZoomed = !isZoomed;

    if (isZoomed) {
        modalImg.style.transform = 'scale(2)'; // Zoom in
        modalImg.style.cursor = 'grab'; // Hand cursor for drag
    } else {
        modalImg.style.transform = 'scale(1)'; // Zoom out
        modalImg.style.cursor = 'zoom-in';
        offsetX = 0;
        offsetY = 0; // Reset position
    }
}

// Start Dragging
function startDragging(event) {
    if (!isZoomed) return;

    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;

    const modalImg = document.getElementById('modal-image');
    modalImg.style.cursor = 'grabbing'; // Change cursor to grabbing
}

// Handle Dragging
function handleDragging(event) {
    if (!isDragging) return;

    const modalImg = document.getElementById('modal-image');

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    offsetX += deltaX;
    offsetY += deltaY;

    modalImg.style.transform = `scale(2) translate(${offsetX}px, ${offsetY}px)`;

    startX = event.clientX;
    startY = event.clientY;
}

// Stop Dragging
function stopDragging() {
    if (!isDragging) return;

    const modalImg = document.getElementById('modal-image');
    modalImg.style.cursor = 'grab'; // Reset cursor to grab when not dragging
    isDragging = false;
}

// Toggle Dark Mode
function toggleDarkMode() {
    const body = document.body;
    body.classList.toggle('dark');
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.textContent = body.classList.contains('dark') ? '🌙' : '🌞';
}

// Event Listeners
document.getElementById('theme-toggle').addEventListener('click', toggleDarkMode);
document.getElementById('modal-image').addEventListener('click', enableZoom); // Zoom toggle
document.getElementById('modal-image').addEventListener('mousedown', startDragging);
document.addEventListener('mousemove', handleDragging);
document.addEventListener('mouseup', stopDragging);

// Initialize the App
renderPhotos();
