function extractConversationText() {
    const messages = [];
    
    // Get all message cards
    const messageCards = document.querySelectorAll('mat-card');
    
    messageCards.forEach(card => {
        if (messages.length > 0) {
            messages.push('\n\n'); // Double newline between messages
        }

        // Check if it's a user message
        if (card.classList.contains('from-user-message-card-content')) {
            const textContent = card.querySelector('.message-text-content')?.textContent?.trim();
            if (textContent) {
                messages.push(`User: ${textContent}`);
            }
        } 
        // Check if it's an AI message
        else if (card.classList.contains('to-user-message-card-content')) {
            let messageText = '';
            
            // Process paragraphs
            const paragraphs = card.querySelectorAll('.paragraph');
            
            paragraphs.forEach((para, index) => {
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
                if (index === 0) {
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
                messages.push(messageText);
            }
        }
    });

    return messages.join('\n\n'); // Double newline between messages
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === 'downloadPdf') {
        try {
            const conversationText = extractConversationText();
            console.log('Extracted text length:', conversationText.length);
            sendResponse({ 
                text: conversationText,
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

// Log when the content script loads
console.log('NotebookLM Conversation Downloader content script loaded');
  
