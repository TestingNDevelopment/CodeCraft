class PreviewManager {
    constructor() {
        this.presetSizes = {
            mobile: { width: 375, height: 667, icon: 'fa-mobile-screen', label: 'Mobile' },
            tablet: { width: 768, height: 1024, icon: 'fa-tablet', label: 'Tablet' },
            laptop: { width: 1366, height: 768, icon: 'fa-laptop', label: 'Laptop' },
            desktop: { width: 1920, height: 1080, icon: 'fa-desktop', label: 'Desktop' }
        };
        this.currentDevice = 'desktop';
        this.zoomLevel = 1;
    }

    createPreviewModal(code, language) {
        const modal = document.createElement('div');
        modal.className = 'preview-modal';
        modal.innerHTML = `
            <div class="preview-content">
                <div class="preview-header">
                    <div class="preview-controls">
                        <div class="device-selector">
                            ${Object.entries(this.presetSizes).map(([device, config]) => `
                                <button class="device-btn${device === this.currentDevice ? ' active' : ''}" 
                                        data-device="${device}" 
                                        title="${config.label}">
                                    <i class="fas ${config.icon}"></i>
                                </button>
                            `).join('')}
                        </div>
                        <div class="preview-actions">
                            <div class="zoom-controls">
                                <button class="zoom-btn" data-zoom="out" title="Zoom out">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <span class="zoom-level">100%</span>
                                <button class="zoom-btn" data-zoom="in" title="Zoom in">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                            <div class="dimension-display">
                                <span class="width-value">1920</span> × <span class="height-value">1080</span>
                            </div>
                            <button class="open-browser-btn" title="Open in browser">
                                <i class="fas fa-external-link-alt"></i>
                            </button>
                        </div>
                    </div>
                    <button class="close-preview" title="Close preview">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="preview-container">
                    <div class="preview-frame-wrapper">
                        <iframe id="previewFrame"></iframe>
                        <div class="preview-resizers">
                            <div class="resizer top-left"></div>
                            <div class="resizer top-right"></div>
                            <div class="resizer bottom-left"></div>
                            <div class="resizer bottom-right"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.setupPreviewControls(modal, code, language);
        requestAnimationFrame(() => modal.classList.add('active'));
    }

    setupPreviewControls(modal, code, language) {
        const iframe = modal.querySelector('#previewFrame');
        const wrapper = modal.querySelector('.preview-frame-wrapper');
        const deviceBtns = modal.querySelectorAll('.device-btn');
        const zoomBtns = modal.querySelectorAll('.zoom-btn');
        const zoomDisplay = modal.querySelector('.zoom-level');
        const dimensionDisplay = modal.querySelector('.dimension-display');
        const widthDisplay = modal.querySelector('.width-value');
        const heightDisplay = modal.querySelector('.height-value');
        const closeBtn = modal.querySelector('.close-preview');
        const openBrowserBtn = modal.querySelector('.open-browser-btn');

        // Set initial size
        this.setPreviewSize(wrapper, this.presetSizes[this.currentDevice]);
        
        // Device switching
        deviceBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const device = btn.dataset.device;
                deviceBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const size = this.presetSizes[device];
                this.setPreviewSize(wrapper, size);
                this.updateDimensionDisplay(widthDisplay, heightDisplay, size.width, size.height);
                this.currentDevice = device;
            });
        });

        // Zoom controls
        zoomBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const direction = btn.dataset.zoom;
                const currentWidth = parseInt(wrapper.style.width);
                const currentHeight = parseInt(wrapper.style.height);
                
                this.zoomLevel = direction === 'in' ? 
                    Math.min(this.zoomLevel + 0.1, 2) : 
                    Math.max(this.zoomLevel - 0.1, 0.5);
                
                wrapper.style.transform = `scale(${this.zoomLevel})`;
                zoomDisplay.textContent = `${Math.round(this.zoomLevel * 100)}%`;
            });
        });

        // Make preview resizable
        this.setupResizable(wrapper, widthDisplay, heightDisplay);

        // Load content
        this.loadContent(iframe, code, language);

        // Close modal
        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };
        
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Open in browser
        openBrowserBtn.addEventListener('click', () => {
            this.openInBrowser(code, language);
        });
    }

    setPreviewSize(wrapper, size) {
        const container = document.querySelector('.preview-container');
        const containerRect = container.getBoundingClientRect();
        const padding = 40; // Account for container padding
        const maxWidth = containerRect.width - padding;
        const maxHeight = containerRect.height - padding;
        
        // Calculate scale to fit
        const scaleX = maxWidth / size.width;
        const scaleY = maxHeight / size.height;
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up if content is smaller
        
        wrapper.style.width = size.width + 'px';
        wrapper.style.height = size.height + 'px';
        this.zoomLevel = scale;
        wrapper.style.transform = `scale(${scale})`;
    }

    updateDimensionDisplay(widthEl, heightEl, width, height) {
        widthEl.textContent = Math.round(width);
        heightEl.textContent = Math.round(height);
    }

    setupResizable(wrapper, widthDisplay, heightDisplay) {
        const resizers = wrapper.querySelectorAll('.resizer');
        let originalWidth = 0;
        let originalHeight = 0;
        let originalX = 0;
        let originalY = 0;
        let originalMouseX = 0;
        let originalMouseY = 0;

        const startResize = (e) => {
            e.preventDefault();
            originalWidth = parseFloat(wrapper.style.width);
            originalHeight = parseFloat(wrapper.style.height);
            originalX = wrapper.getBoundingClientRect().left;
            originalY = wrapper.getBoundingClientRect().top;
            originalMouseX = e.pageX;
            originalMouseY = e.pageY;
            
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
        };

        const resize = (e) => {
            const width = originalWidth + (e.pageX - originalMouseX);
            const height = originalHeight + (e.pageY - originalMouseY);
            
            if (width > 320 && width < 3840) {
                wrapper.style.width = width + 'px';
                widthDisplay.textContent = Math.round(width);
            }
            
            if (height > 320 && height < 2160) {
                wrapper.style.height = height + 'px';
                heightDisplay.textContent = Math.round(height);
            }
        };

        const stopResize = () => {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
        };

        resizers.forEach(resizer => {
            resizer.addEventListener('mousedown', startResize);
        });
    }

    loadContent(iframe, code, language) {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        
        if (language.toLowerCase() === 'html') {
            doc.open();
            doc.write(code);
            doc.close();
        } else {
            doc.open();
            doc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { 
                            margin: 0;
                            min-height: 100vh;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-family: system-ui, -apple-system, sans-serif;
                        }
                        .preview-placeholder {
                            color: #64748b;
                            text-align: center;
                            padding: 2rem;
                        }
                        ${language.toLowerCase() === 'css' ? code : ''}
                    </style>
                </head>
                <body>
                    ${language.toLowerCase() === 'javascript' ? 
                        `<div id="preview-content"></div><script>${code}<\/script>` : 
                        '<div class="preview-placeholder">Preview content</div>'}
                </body>
                </html>
            `);
            doc.close();
        }
    }

    openInBrowser(code, language) {
        const blob = new Blob([this.generateFullHTML(code, language)], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    generateFullHTML(code, language) {
        if (language.toLowerCase() === 'html') {
            return code;
        }

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Preview</title>
                <style>
                    body { 
                        margin: 0;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-family: system-ui, -apple-system, sans-serif;
                    }
                    ${language.toLowerCase() === 'css' ? code : ''}
                </style>
            </head>
            <body>
                ${language.toLowerCase() === 'javascript' ? 
                    `<div id="preview-content"></div><script>${code}<\/script>` : 
                    '<div class="preview-content">Preview content</div>'}
            </body>
            </html>
        `;
    }
}

// Initialize PreviewManager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.previewManager = new PreviewManager();
});
