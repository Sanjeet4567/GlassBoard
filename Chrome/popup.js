document.getElementById('toggleWhiteboard').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        var tabId = tabs[0].id;
        
        // Send a message to the content script
        chrome.tabs.sendMessage(tabId, { action: "startWhiteBoard" }, (response) => {
            if (chrome.runtime.lastError) {
                alert('Refresh the page to start whiteboard or open a valid webpage with url');
                console.log('Error sending message: ', chrome.runtime.lastError);
            } else {
                console.log('Whiteboard toggle action initiated');
            }
        });
    });
});

