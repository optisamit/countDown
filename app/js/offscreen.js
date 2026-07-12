"use strict";
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'play') {
        const audio = new Audio(chrome.runtime.getURL(message.sound));
        audio.volume = message.volume;
        audio.play().catch(err => console.error("Error playing audio in offscreen document:", err));
    }
});
