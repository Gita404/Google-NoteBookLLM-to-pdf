document.addEventListener('DOMContentLoaded', () => {
    const downloadButton = document.getElementById('download-button');
    if (!downloadButton) {
        console.error('Download button not found');
        return;
    }

    downloadButton.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab?.id) {
                console.error('No active tab found');
                return;
            }

            // Execute script to get source guide content
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    // Get both the header and content of the source guide
                    const sourceGuideContainer = document.querySelector('.source-guide-container');
                    const sourceGuideContent = document.querySelector('.source-guide-container + div'); // Get the next div after container
                    
                    if (!sourceGuideContainer && !sourceGuideContent) {
                        throw new Error('Source guide not found on page');
                    }

                    // Get all the text content, including nested elements
                    const getAllText = (element) => {
                        if (!element) return '';
                        return Array.from(element.querySelectorAll('*'))
                            .map(el => el.textContent)
                            .join('\n')
                            .replace(/\n{3,}/g, '\n\n'); // Remove excessive newlines
                    };

                    // Combine both parts
                    return {
                        header: sourceGuideContainer ? getAllText(sourceGuideContainer) : '',
                        content: sourceGuideContent ? getAllText(sourceGuideContent) : ''
                    };
                }
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error('Runtime error:', chrome.runtime.lastError);
                    return;
                }

                if (!results || !results[0]?.result) {
                    alert('Could not find source guide content');
                    return;
                }

                const { header, content } = results[0].result;
                
                // Create new jsPDF instance
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();

                // Set basic properties
                doc.setFont('helvetica');
                doc.setFontSize(12);

                // Calculate margins and width
                const margin = 15;
                const pageWidth = doc.internal.pageSize.getWidth();
                const maxWidth = pageWidth - (2 * margin);

                // Combine the content with a separator
                const fullText = `${header}\n\n${content}`;

                // Split text into lines
                const lines = doc.splitTextToSize(fullText, maxWidth);
                
                let currentY = margin;
                lines.forEach(line => {
                    if (currentY > doc.internal.pageSize.getHeight() - margin) {
                        doc.addPage();
                        currentY = margin;
                    }
                    doc.text(line, margin, currentY);
                    currentY += 7;
                });

                // Save the PDF
                doc.save('source_guide.pdf');
            });
        } catch (error) {
            console.error('Error:', error);
            alert('Error: ' + error.message);
        }
    });
});

document.getElementById("exportBtn").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["contentScript.js"]
        });
    });
});

(async () => {
    const sourceGuide = document.querySelector(".source-guide-container");
    if (!sourceGuide) {
        alert("Source Guide not found on this page.");
        return;
    }

    // Extract content as HTML
    const sourceGuideHTML = sourceGuide.outerHTML;

    // Use local jsPDF to generate the PDF
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("jspdf.umd.min.js");
    script.onload = () => {
        const pdfOptions = {
            margin: 1,
            filename: "source_guide.pdf",
            html2canvas: { scale: 2 },
            jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
        };
        html2pdf().from(sourceGuideHTML).set(pdfOptions).save();
    };
    document.body.appendChild(script);
})();