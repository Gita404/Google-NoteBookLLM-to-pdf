document.addEventListener('DOMContentLoaded', () => {
    const downloadButton = document.getElementById('download-button');
  
    downloadButton.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab?.id) {
                console.error('No active tab found');
                return;
            }

            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['contentScript.js']
                });
            } catch (e) {
                console.log('Content script may already be injected:', e);
            }

            chrome.tabs.sendMessage(tab.id, { action: 'downloadPdf' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Runtime error:', chrome.runtime.lastError);
                    return;
                }

                if (response && response.text) {
                    try {
                        // Create new jsPDF instance using the correct syntax
                        const { jsPDF } = window.jspdf;
                        const doc = new jsPDF();
                        
                        // Set basic properties
                        doc.setFont('helvetica');
                        doc.setFontSize(12);
                        
                        // Calculate margins and width
                        const margin = 15;
                        const pageWidth = doc.internal.pageSize.getWidth();
                        const maxWidth = pageWidth - (2 * margin);
                        
                        let currentY = margin;
                        
                        // Process each line
                        const lines = doc.splitTextToSize(response.text, maxWidth);
                        
                        lines.forEach(line => {
                            // Check if we need a new page
                            if (currentY > doc.internal.pageSize.getHeight() - margin) {
                                doc.addPage();
                                currentY = margin;
                            }
                            
                            // Add the line
                            doc.text(line, margin, currentY);
                            currentY += 7; // Line height
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
    });
});