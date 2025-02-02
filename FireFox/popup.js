document.getElementById('toggleWhiteboard').addEventListener('click', () => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        var tabId = tabs[0].id;
        
        // Send a message to the content script
        browser.tabs.sendMessage(tabId, { action: "startWhiteBoard" }).then((response) => {
            console.log('Whiteboard toggle action initiated');
        }).catch((error) => {
            
            console.log('Error sending message: ', error);
        });
    }).catch((error) => {
        console.log('Error querying tabs: ', error);
    });
});
