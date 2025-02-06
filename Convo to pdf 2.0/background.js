chrome.runtime.onInstalled.addListener(() => {
    console.log('NotebookLM PDF Exporter installed');
    // Initialize any necessary data or settings here
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url.includes('notebooklm.google.com')) {
        console.log('NotebookLM tab updated');
        // Perform actions when the NotebookLM tab is updated
    }
});

// Example of handling a message from a content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'logMessage') {
        console.log('Message from content script:', request.message);
        sendResponse({ status: 'Message logged' });
    }
});