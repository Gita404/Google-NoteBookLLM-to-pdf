document.addEventListener('DOMContentLoaded', () => {
    const downloadButton = document.getElementById('download-button');
    const removeLogo = document.getElementById('remove-logo');
    const landscapeMode = document.getElementById('landscape-mode');
    const addToc = document.getElementById('add-toc');
    const gptOnly = document.getElementById('gpt-only');
    const downloadConversationButton = document.getElementById('download-conversation');
    const downloadNotesButton = document.getElementById('download-notes');
    const downloadSourcesButton = document.getElementById('download-sources');
    
    console.log('Popup initialized'); // Debug log

    // Load saved preferences
    chrome.storage.sync.get({
        removeLogo: false,
        landscapeMode: false,
        addToc: false,
        gptOnly: false
    }, (items) => {
        console.log('Loaded preferences:', items); // Debug log
        removeLogo.checked = items.removeLogo;
        landscapeMode.checked = items.landscapeMode;
        addToc.checked = items.addToc;
        gptOnly.checked = items.gptOnly;
    });

    // Save preferences when changed
    const savePreferences = () => {
        const preferences = {
            removeLogo: removeLogo.checked,
            landscapeMode: landscapeMode.checked,
            addToc: addToc.checked,
            gptOnly: gptOnly.checked
        };
        console.log('Saving preferences:', preferences); // Debug log
        chrome.storage.sync.set(preferences);
    };

    removeLogo.addEventListener('change', savePreferences);
    landscapeMode.addEventListener('change', savePreferences);
    addToc.addEventListener('change', savePreferences);
    gptOnly.addEventListener('change', savePreferences);

    downloadConversationButton.addEventListener('click', () => {
        handleDownload('conversation');
    });

    downloadNotesButton.addEventListener('click', () => {
        handleDownload('notes');
    });

    downloadSourcesButton.addEventListener('click', () => {
        handleDownload('sources');
    });

    async function handleDownload(type) {
        console.log(`Download ${type} button clicked`); // Debug log
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab?.id) {
                console.error('No active tab found');
                return;
            }

            const options = {
                removeLogo: removeLogo.checked,
                landscapeMode: landscapeMode.checked,
                addToc: addToc.checked,
                gptOnly: gptOnly.checked,
                type: type
            };
            console.log('Sending options to content script:', options); // Debug log

            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['contentScript.js']
                });
            } catch (e) {
                console.log('Content script may already be injected:', e);
            }

            chrome.tabs.sendMessage(tab.id, { 
                action: 'downloadPdf',
                options: options
            }, (response) => {
                console.log('Received response from content script:', response); // Debug log
                
                if (chrome.runtime.lastError) {
                    console.error('Runtime error:', chrome.runtime.lastError);
                    return;
                }
                console.log('Received response from content script:', response);
                
                if (response && response.text) {
                    try {
                        const { jsPDF } = window.jspdf;
                        const doc = new jsPDF({
                            orientation: options.landscapeMode ? 'landscape' : 'portrait'
                        });
                        
                        // Set basic properties
                        doc.setFont('helvetica');
                        doc.setFontSize(11);
                        
                        // Calculate margins and width
                        const margin = 20;
                        const pageWidth = doc.internal.pageSize.getWidth();
                        const maxWidth = pageWidth - (2 * margin);
                        
                        let currentY = margin;
                        
                        // Add table of contents if enabled
                        if (options.addToc && response.toc) {
                            doc.setFont('helvetica', 'bold');
                            doc.text('Table of Contents', margin, currentY);
                            currentY += 10;

                            response.toc.forEach(item => {
                                doc.setFont('helvetica', 'normal');
                                const tocEntry = `${item.title}  ${item.page}`;
                                doc.text(tocEntry, margin, currentY);
                                currentY += 7;
                            });

                            doc.addPage();
                            currentY = margin;
                        }
                        
                        const lines = doc.splitTextToSize(response.text, maxWidth);
                        
                        lines.forEach(line => {
                            // Check if we need a new page
                            if (currentY + 7 > doc.internal.pageSize.getHeight() - margin) {
                                doc.addPage();
                                currentY = margin;
                            }
                            
                            doc.text(line, margin, currentY);
                            currentY += 7;
                        });

                        // Save the PDF
                        doc.save('conversation.pdf');

                    } catch (error) {
                        console.error('PDF generation error:', error);
                        alert('Error generating PDF: ' + error.message);
                    }
                } else {
                    console.error('No text received from content script');
                    alert('No conversation text found to convert to PDF');
                }
            });
        } catch (error) {
            console.error('Error:', error);
            alert('Error: ' + error.message);
        }
    }
});