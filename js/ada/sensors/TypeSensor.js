/**
 * TypeSensor - Modular handler for text input detection
 * Handles typing, text selection, and command parsing
 * 
 * IMPORTANT: Text input is ALWAYS enabled - it's the primary, non-intrusive way to interact with Ada.
 * Unlike clicks or voice, text input never interferes with normal browsing and should always be available.
 */

class TypeSensor {
    constructor() {
        this.textInputs = new Set();
        this.onTextCallback = null;
        this.enabled = true; // Always true - text input cannot be disabled
    }

    /**
     * Initialize type sensor
     * NOTE: Text input is ALWAYS enabled - it's the primary, non-intrusive way to interact with Ada
     */
    initialize() {
        // Text input is always enabled - always initialize

        // Set up text input listeners
        this.setupTextInputListeners();
        
        // Set up text selection listener
        this.setupTextSelectionListener();

        console.log('[TypeSensor] ✅ Initialized');
    }

    /**
     * Setup listeners for text inputs
     * CONSOLIDATED: Handles ALL text input including agent chat input
     */
    setupTextInputListeners() {
        // Listen for Enter key in text inputs (including agent chat input)
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                const target = event.target;
                
                // Check if it's a text input (including agentChatInput)
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                    const text = target.value.trim();
                    if (text.length > 0) {
                        // Prevent default to avoid duplicate processing
                        event.preventDefault();
                        event.stopPropagation();
                        
                        // Clear input immediately to prevent duplicate sends
                        target.value = '';
                        
                        this.handleTextInput(text, {
                            source: 'input',
                            element: target,
                            event
                        });
                    }
                }
            }
        });
        
        // Listen for Send button clicks (agentSendBtn)
        document.addEventListener('click', (event) => {
            const target = event.target;
            const sendBtn = target.closest('#agentSendBtn');
            if (sendBtn) {
                const input = document.getElementById('agentChatInput') || document.getElementById('agentInput');
                if (input && input.value.trim()) {
                    const text = input.value.trim();
                    input.value = ''; // Clear input immediately
                    
                    this.handleTextInput(text, {
                        source: 'button',
                        element: input,
                        event
                    });
                }
            }
        }, true); // Use capture phase to catch before other handlers

        // Track text inputs
        const observer = new MutationObserver(() => {
            this.updateTextInputs();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        this.updateTextInputs();
    }

    /**
     * Update tracked text inputs
     */
    updateTextInputs() {
        const inputs = document.querySelectorAll('input[type="text"], textarea, [contenteditable="true"]');
        inputs.forEach(input => {
            if (!this.textInputs.has(input)) {
                this.textInputs.add(input);
            }
        });
    }

    /**
     * Setup text selection listener
     */
    setupTextSelectionListener() {
        document.addEventListener('mouseup', () => {
            setTimeout(() => {
                const selection = window.getSelection();
                const selectedText = selection.toString().trim();
                
                if (selectedText.length > 3) { // Minimum 3 characters
                    this.handleTextSelection(selectedText, {
                        range: selection.rangeCount > 0 ? selection.getRangeAt(0) : null
                    });
                }
            }, 100); // Small delay to ensure selection is complete
        });
    }

    /**
     * Handle text input
     * NOTE: Text input is ALWAYS enabled - it's the primary, non-intrusive way to interact with Ada
     */
    handleTextInput(text, context = {}) {
        // Text input is always enabled - never check this.enabled
        if (!text || text.trim().length === 0) {
            return;
        }

        console.log('[TypeSensor] ⌨️ Text input detected:', {
            text: text.substring(0, 50) + '...',
            length: text.length,
            source: context.source
        });

        // Check if it's a command
        const command = this.parseCommand(text);
        if (command) {
            this.emitTypeEvent({
                type: 'command',
                command: command.name,
                args: command.args,
                originalText: text,
                ...context
            });
        } else {
            this.emitTypeEvent({
                type: 'text',
                text: text,
                ...context
            });
        }
    }

    /**
     * Handle text selection
     * NOTE: Text input is ALWAYS enabled - it's the primary, non-intrusive way to interact with Ada
     */
    handleTextSelection(text, context = {}) {
        // Text input is always enabled - never check this.enabled
        if (!text || text.trim().length === 0) {
            return;
        }

        console.log('[TypeSensor] 📝 Text selection detected:', {
            text: text.substring(0, 50) + '...',
            length: text.length
        });

        this.emitTypeEvent({
            type: 'selection',
            text: text,
            ...context
        });
    }

    /**
     * Parse command from text
     */
    parseCommand(text) {
        const trimmed = text.trim();
        
        // Command patterns
        const patterns = [
            { pattern: /^\/help$/i, name: 'help' },
            { pattern: /^\/clear$/i, name: 'clear' },
            { pattern: /^\/voice\s+(on|off)$/i, name: 'voice', args: ['on', 'off'] },
            { pattern: /^\/model\s+(.+)$/i, name: 'model', args: ['modelName'] },
            { pattern: /^\/search\s+(.+)$/i, name: 'search', args: ['query'] },
        ];

        for (const { pattern, name, args } of patterns) {
            const match = trimmed.match(pattern);
            if (match) {
                return {
                    name,
                    args: match.slice(1).filter(Boolean)
                };
            }
        }

        return null;
    }

    /**
     * Emit type event
     */
    emitTypeEvent(context) {
        // Dispatch custom event
        // IMPORTANT: type: 'type' must come AFTER context spread to ensure it's not overwritten
        // The context may contain type: 'text' or type: 'command', but we need type: 'type' for routing
        const typeEvent = new CustomEvent('ada:type', {
            detail: {
                timestamp: Date.now(),
                ...context,  // Spread context first (may contain type: 'text', 'command', etc.)
                type: 'type' // CRITICAL: Set type to 'type' AFTER spread to ensure correct routing
            },
            bubbles: true
        });
        document.dispatchEvent(typeEvent);
        console.log('[TypeSensor] 📤 Emitted ada:type event:', {
            type: typeEvent.detail.type,
            hasText: !!typeEvent.detail.text,
            textPreview: typeEvent.detail.text?.substring(0, 50)
        });
    }

    /**
     * Set callback for text input
     */
    onText(callback) {
        this.onTextCallback = callback;
    }

    /**
     * Enable/disable type sensor
     * NOTE: Text input is ALWAYS enabled - this method is a no-op
     * Text input is the primary, non-intrusive way to interact with Ada
     * and should never be disabled
     */
    setEnabled(enabled) {
        // Text input is always enabled - ignore attempts to disable
        this.enabled = true; // Always true
        console.log('[TypeSensor] ⚠️ Attempt to disable text input ignored - text input is always enabled');
    }
}

// Export for Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TypeSensor;
} else {
    window.TypeSensor = TypeSensor;
}

