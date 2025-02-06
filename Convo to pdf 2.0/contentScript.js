// ContentScript.js

// Function to extract conversation text from the DOM
function extractConversationText(options = {}) {
    console.log('Extracting conversation with options:', options); // Debug log
    const messages = [];
    
    // Get all message cards
    const messageCards = document.querySelectorAll('mat-card');
    console.log('Found message cards:', messageCards.length); // Debug log
    
    messageCards.forEach((card, index) => {
        if (messages.length > 0) {
            messages.push({ text: '\n\n', style: 'spacer' }); // Double newline between messages
        }

        // Check if it's a user message
        if (card.classList.contains('from-user-message-card-content')) {
            const textContent = card.querySelector('.message-text-content')?.textContent?.trim();
            if (textContent) {
                console.log(`Processing user message ${index}:`, options.gptOnly ? 'Skipped (GPT only)' : 'Including'); // Debug log
                if (!options.gptOnly) {
                    messages.push({ text: `User: ${textContent}`, style: 'userMessage' });
                }
            }
        } 
        // Check if it's an AI message
        else if (card.classList.contains('to-user-message-card-content')) {
            console.log(`Processing AI message ${index}`); // Debug log
            let messageText = '';
            
            // Process paragraphs
            const paragraphs = card.querySelectorAll('.paragraph');
            
            paragraphs.forEach((para, pIndex) => {
                const spans = para.querySelectorAll('span:not(.citation-marker)');
                let paraText = '';
                
                spans.forEach(span => {
                    let text = span.textContent.trim();
                    // Remove citation numbers
                    text = text.replace(/\s*\d+\s*$/, '');
                    paraText += text + ' ';
                });

                paraText = paraText.trim();

                // First paragraph handling
                if (pIndex === 0) {
                    messageText = `Assistant: ${paraText}`;
                    return;
                }

                // Handle bullet points and examples
                if (para.classList.contains('bullet') || paraText.startsWith('•') || paraText.startsWith('Example')) {
                    // Remove existing bullet if any
                    paraText = paraText.replace(/^[•]\s*/, '');
                    // Add bullet point with proper spacing
                    messageText += `\n\n• ${paraText}`; // Double newline before bullets
                } else {
                    // Regular paragraph with double newline
                    messageText += `\n\n${paraText}`;
                }
            });

            // Clean up formatting
            messageText = messageText
                .replace(/\s+/g, ' ')         // Replace multiple spaces with single
                .replace(/\n\s+/g, '\n')      // Remove spaces after newlines
                .replace(/\n{3,}/g, '\n\n')   // Keep maximum of double newlines
                .trim();

            if (messageText) {
                messages.push({ text: messageText, style: 'aiMessage' });
            }
        }
    });

    return messages;
}

// Function to generate a table of contents from the extracted text
function generateTableOfContents(messages) {
    console.log('Generating table of contents'); // Debug log
    const toc = [];
    let currentPage = 1;
    let currentPosition = 0;
    const CHARS_PER_PAGE = 3000; // Approximate characters per page

    messages.forEach(message => {
        if (message.text.startsWith('User:')) {
            // Extract the first few words of the user message
            const title = message.text.substring(6).split(' ').slice(0, 5).join(' ') + '...';
            
            // Estimate page number based on character count
            currentPage = Math.ceil(currentPosition / CHARS_PER_PAGE);
            
            toc.push({
                title,
                page: currentPage
            });
        }
        currentPosition += message.text.length + 2; // +2 for newlines
    });

    console.log('Generated TOC:', toc); // Debug log
    return toc;
}

// Function to generate a PDF using pdfmake
function generatePdf(content, toc, options) {
    const docDefinition = {
        content: [
            { text: 'Table of Contents', style: 'header' },
            ...toc.map(entry => ({ text: `${entry.title} ................. ${entry.page}`, style: 'tocEntry' })),
            { text: '\n\n', style: 'spacer' },
            ...content
        ],
        styles: {
            header: {
                fontSize: 18,
                bold: true,
                margin: [0, 0, 0, 10]
            },
            tocEntry: {
                fontSize: 12,
                margin: [0, 5, 0, 5]
            },
            userMessage: {
                fontSize: 12,
                bold: true,
                margin: [0, 5, 0, 5]
            },
            aiMessage: {
                fontSize: 12,
                margin: [0, 5, 0, 5]
            },
            spacer: {
                fontSize: 12,
                margin: [0, 5, 0, 5]
            }
        }
    };

    pdfMake.createPdf(docDefinition).download('conversation.pdf');
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request); // Debug log
    
    if (request.action === 'downloadPdf') {
        try {
            const options = request.options || {};
            console.log('Processing with options:', options); // Debug log
            
            let conversationText;
            switch (options.type) {
                case 'conversation':
                    conversationText = extractConversationText(options);
                    break;
                case 'notes':
                    conversationText = extractNotesText(options); // Implement this function
                    break;
                case 'sources':
                    conversationText = extractSourcesText(options); // Implement this function
                    break;
                default:
                    throw new Error('Unknown download type');
            }

            console.log('Extracted text length:', conversationText.length); // Debug log
            
            let toc = [];
            if (options.addToc) {
                toc = generateTableOfContents(conversationText);
            }

            generatePdf(conversationText, toc, options);

            sendResponse({ 
                success: true
            });
        } catch (error) {
            console.error('Error extracting text:', error);
            sendResponse({ 
                text: "Error: " + error.message,
                success: false
            });
        }
    }
    return true;
});

console.log('NotebookLM Conversation Downloader content script loaded'); // Debug log