import aiManager from './ai.js';
import firebaseManager from './firebase.js';

class ChatInterface {
    constructor() {
        this.currentModel = 'deepseek';
        this.chats = this.loadChats() || {};
        this.currentChatId = localStorage.getItem('currentChatId');
        this.isProcessing = false;
        this.isGenerating = false;
        this.abortController = null;
        this.settings = this.loadSettings();
        this.initializeElements();
        this.initializeEventListeners();
        
        // Initialize Firebase auth state
        firebaseManager.addAuthStateListener(user => this.handleAuthStateChange(user));
        
        // If no current chat or chat doesn't exist, create new one
        if (!this.currentChatId || !this.chats[this.currentChatId]) {
            this.createNewChat();
        } else {
            this.loadChat(this.currentChatId);
        }

        // Show initial showcase if chat is empty
        if (this.isChatEmpty() && window.modelShowcase) {
            window.modelShowcase.createShowcase(this.currentModel);
        }

        this.applySettings();

        // Initialize profile elements
        this.elements.profileModal = document.getElementById('profileModal');
        this.elements.closeProfileModal = document.getElementById('closeProfileModal');
        this.elements.verifyEmailBtn = document.getElementById('verifyEmailBtn');
        this.elements.logoutBtn = document.getElementById('logoutBtn');
        
        // Verify all required elements exist
        this.verifyElements();
    }

    verifyElements() {
        const requiredElements = {
            profileModal: 'Profile modal',
            closeProfileModal: 'Close profile modal button',
            verifyEmailBtn: 'Verify email button',
            logoutBtn: 'Logout button'
        };

        for (const [key, name] of Object.entries(requiredElements)) {
            if (!this.elements[key]) {
                console.error(`Required element missing: ${name}`);
            }
        }
    }

    initializeElements() {
        // Main elements
        this.elements = {
            overlay: document.getElementById('overlay'),
            sidebar: document.getElementById('sidebar'),
            chatList: document.getElementById('chatList'),
            chatContainer: document.getElementById('chatContainer'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            
            // Model selector
            modelDropdownBtn: document.getElementById('modelDropdownBtn'),
            modelDropdown: document.getElementById('modelDropdown'),
            modelOptions: document.querySelectorAll('.model-option'),
            
            // Buttons
            menuBtn: document.getElementById('menuBtn'),
            closeSidebarBtn: document.getElementById('closeSidebarBtn'),
            newChatBtn: document.getElementById('newChatBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            
            // Settings modal
            settingsModal: document.getElementById('settingsModal'),
            closeModalBtn: document.getElementById('closeModalBtn'),
            clearHistoryBtn: document.getElementById('clearHistoryBtn'),
            
            // Loading spinner
            scrollBottomBtn: document.getElementById('scrollBottomBtn'),
            loadingSpinner: document.querySelector('.loading-spinner')
        };
        
        // Main content wrapper for adjusting when sidebar opens/closes
        this.mainContent = document.querySelector('.main-content');

        // Update model dropdown content
        this.elements.modelDropdown.innerHTML = aiManager.getModelSelector();

        // Update initial model state
        const selectedOption = document.querySelector(`.model-option[data-model="${this.currentModel}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
        }
        
        // Add auth-related elements
        this.elements.profileBtn = document.getElementById('profileBtn');
        this.elements.authModal = document.getElementById('authModal');
        this.elements.authForm = document.getElementById('authForm');
        this.elements.authTitle = document.getElementById('authTitle');
        this.elements.authError = document.getElementById('authError');
        this.elements.closeAuthModal = document.getElementById('closeAuthModal');
        this.elements.toggleAuthMode = document.getElementById('toggleAuthMode');
        this.elements.forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
        
        this.isSignUp = false;
    }

    initializeEventListeners() {
        // Message handling
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {  // Change to Ctrl+Enter for sending
                e.preventDefault();
                this.handleSendMessage();
            }
        });
        this.elements.messageInput.addEventListener('input', (e) => {
            this.autoResizeTextarea();
            
            const showcase = document.querySelector('.model-showcase');
            if (showcase && e.target.value.trim()) {
                showcase.classList.add('exit');
                setTimeout(() => showcase.remove(), 300);
            } else if (!e.target.value.trim() && !showcase && !this.chats[this.currentChatId].messages.length) {
                window.modelShowcase.createShowcase(this.currentModel);
            }
        });
        this.elements.sendBtn.addEventListener('click', () => this.handleSendMessage());

        // Model selection
        this.elements.modelDropdownBtn.addEventListener('click', () => {
            this.elements.modelDropdownBtn.classList.toggle('active');
            this.elements.modelDropdown.classList.toggle('active');
        });

        this.elements.modelDropdown.addEventListener('click', (e) => {
            const option = e.target.closest('.model-option');
            if (option) {
                const model = option.dataset.model;
                // Update chat's model
                if (this.currentChatId) {
                    this.chats[this.currentChatId].model = model;
                    this.saveChats();
                }
                this.switchModel(model);
                this.elements.modelDropdownBtn.classList.remove('active');
                this.elements.modelDropdown.classList.remove('active');
            }
        });

        // Close model dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.model-selector-wrapper')) {
                this.elements.modelDropdownBtn.classList.remove('active');
                this.elements.modelDropdown.classList.remove('active');
            }
        });

        // Sidebar controls
        this.elements.menuBtn.addEventListener('click', () => this.toggleSidebar());
        this.elements.closeSidebarBtn.addEventListener('click', () => this.toggleSidebar());
        this.elements.overlay.addEventListener('click', () => this.toggleSidebar());
        this.elements.newChatBtn.addEventListener('click', () => this.createNewChat());

        // Settings
        this.elements.settingsBtn.addEventListener('click', () => this.toggleSettingsModal());
        this.elements.closeModalBtn.addEventListener('click', () => this.toggleSettingsModal());
        this.elements.clearHistoryBtn.addEventListener('click', () => this.clearAllHistory());
        
        // Theme and font size
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleThemeChange(btn.dataset.theme));
        });
        
        document.querySelectorAll('.font-size-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleFontSizeChange(btn.dataset.size));
        });

        // Scroll to bottom button
        this.elements.scrollBottomBtn.addEventListener('click', () => this.scrollToBottom());
        this.elements.chatContainer.addEventListener('scroll', () => this.handleScroll());
        
        // Auth-related listeners
        this.elements.profileBtn.addEventListener('click', () => this.handleProfileClick());
        this.elements.closeAuthModal.addEventListener('click', () => this.toggleAuthModal(false));
        this.elements.toggleAuthMode.addEventListener('click', () => this.toggleAuthMode());
        this.elements.forgotPasswordBtn.addEventListener('click', () => this.handleForgotPassword());
        
        this.elements.authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAuthSubmit();
        });

        // Profile modal controls
        document.getElementById('closeProfileModal').addEventListener('click', () => this.toggleProfileModal(false));
        document.getElementById('logoutBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to sign out?')) {
                firebaseManager.signOut();
                this.toggleProfileModal(false);
            }
        });
        
        document.getElementById('verifyEmailBtn').addEventListener('click', async () => {
            const result = await firebaseManager.sendVerificationEmail();
            if (result.success) {
                alert('Verification email sent! Please check your inbox.');
            } else {
                alert('Error sending verification email. Please try again.');
            }
        });
        
        // Name editing
        const editNameBtn = document.querySelector('.edit-btn');
        editNameBtn.addEventListener('click', () => {
            const nameSpan = document.getElementById('userName');
            const currentName = nameSpan.textContent;
            const newName = prompt('Enter your name:', currentName);
            
            if (newName && newName.trim() !== currentName) {
                firebaseManager.updateUserProfile(newName.trim()).then(result => {
                    if (result.success) {
                        nameSpan.textContent = newName.trim();
                    }
                });
            }
        });
    }

    handleAuthStateChange(user) {
        const profileBtn = this.elements.profileBtn;
        if (user) {
            profileBtn.classList.add('profile-btn-signed-in');
            profileBtn.title = user.email;
            
            // Load user's chats from Firebase
            this.loadUserChats();
            
            // Update verification badge
            const emailVerified = document.getElementById('emailVerified');
            emailVerified.classList.toggle('unverified', !user.emailVerified);
            emailVerified.innerHTML = user.emailVerified ? 
                '<i class="fas fa-check-circle"></i> Verified' : 
                '<i class="fas fa-exclamation-circle"></i> Unverified';
                
            // Update profile info
            document.getElementById('userEmail').textContent = user.email;
            document.getElementById('userName').textContent = user.displayName || 'Set your name';
            document.getElementById('joinDate').textContent = new Date(user.metadata.creationTime).toLocaleDateString();
            
            // Show/hide verify email button
            const verifyEmailBtn = document.getElementById('verifyEmailBtn');
            verifyEmailBtn.classList.toggle('hidden', user.emailVerified);
        } else {
            profileBtn.classList.remove('profile-btn-signed-in');
            profileBtn.title = 'Sign In';
        }
    }

    async handleAuthSubmit() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = this.elements.authForm.querySelector('button[type="submit"]');
        const spinner = submitBtn.querySelector('.loading-spinner');
        
        try {
            submitBtn.disabled = true;
            spinner.classList.remove('hidden');
            
            const result = this.isSignUp ? 
                await firebaseManager.signUp(email, password) :
                await firebaseManager.signIn(email, password);
                
            if (result.success) {
                this.toggleAuthModal(false);
                this.elements.authForm.reset();
            } else {
                this.showAuthError(result.error);
            }
        } finally {
            submitBtn.disabled = false;
            spinner.classList.add('hidden');
        }
    }

    handleProfileClick() {
        if (firebaseManager.isUserSignedIn()) {
            this.toggleProfileModal(true);
        } else {
            this.toggleAuthModal(true);
        }
    }

    toggleAuthModal(show = true) {
        this.elements.authModal.classList.toggle('active', show);
        if (show) {
            document.getElementById('email').focus();
        }
    }

    toggleAuthMode() {
        this.isSignUp = !this.isSignUp;
        this.elements.authTitle.textContent = this.isSignUp ? 'Create Account' : 'Sign In';
        this.elements.toggleAuthMode.textContent = this.isSignUp ? 'Sign In Instead' : 'Create Account';
        const submitBtn = this.elements.authForm.querySelector('button[type="submit"] span');
        submitBtn.textContent = this.isSignUp ? 'Sign Up' : 'Sign In';
        this.elements.authError.classList.add('hidden');
    }

    async handleForgotPassword() {
        const email = document.getElementById('email').value;
        if (!email) {
            this.showAuthError('Please enter your email address');
            return;
        }
        
        const result = await firebaseManager.resetPassword(email);
        if (result.success) {
            alert('Password reset email sent. Please check your inbox.');
        } else {
            this.showAuthError(result.error);
        }
    }

    showAuthError(message) {
        const errorEl = this.elements.authError;
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }

    autoResizeTextarea() {
        const textarea = this.elements.messageInput;
        textarea.style.height = 'auto';
        
        // Calculate new height with a max limit
        const newHeight = Math.min(textarea.scrollHeight, 200);
        textarea.style.height = `${newHeight}px`;
        
        // Enable smooth scrolling if content exceeds max height
        if (textarea.scrollHeight > 200) {
            textarea.style.overflowY = 'auto';
        } else {
            textarea.style.overflowY = 'hidden';
        }
        
        // Scroll to bottom of textarea when typing
        if (textarea.scrollHeight > textarea.clientHeight) {
            textarea.scrollTop = textarea.scrollHeight;
        }
    }

    async handleSendMessage() {
        const message = this.elements.messageInput.value.trim();
        
        // Remove showcase when starting to type
        const showcase = document.querySelector('.model-showcase');
        if (showcase) {
            showcase.classList.add('exit');
            setTimeout(() => showcase.remove(), 300);
        }
        
        // If currently generating, stop the generation and reset UI
        if (this.isGenerating) {
            this.stopGeneration();
            this.isProcessing = false;
            this.isGenerating = false;
            this.updateSendButtonToStop(false);
            return;
        }
        
        if (!message || this.isProcessing) return;

        this.isProcessing = true;
        this.isGenerating = true;
        this.elements.messageInput.value = '';
        this.autoResizeTextarea();
        
        // Initialize new AbortController
        this.abortController = null;
        
        // Change send button to stop button and show spinner
        this.updateSendButtonToStop(true);
        
        try {
            // Add message to chat history
            const userMessageDiv = this.createMessageElement('user', message);
            this.chats[this.currentChatId].messages.push({
                type: 'user',
                content: message
            });

            // Get AI response
            await this.getAIResponse(message);
            
        } catch (error) {
            console.error('Error:', error);
            if (error.name === 'AbortError') {
                console.log('Generation was cancelled by user');
            } else {
                this.createMessageElement('system', 'Sorry, there was an error. Please try again.');
            }
        } finally {
            this.isProcessing = false;
            this.isGenerating = false;
            this.updateSendButtonToStop(false);
            this.saveChats();
        }
    }
    
    updateSendButtonToStop(isGenerating) {
        const sendBtn = this.elements.sendBtn;
        const loadingSpinner = this.elements.loadingSpinner;
        
        if (isGenerating) {
            sendBtn.innerHTML = '<i class="fas fa-stop"></i>';
            sendBtn.classList.add('stop-generating');
            sendBtn.title = 'Stop generating';
            loadingSpinner.classList.remove('hidden');
        } else {
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            sendBtn.classList.remove('stop-generating');
            sendBtn.title = 'Send message';
            loadingSpinner.classList.add('hidden');
        }
    }
    
    stopGeneration() {
        if (this.abortController) {
            try {
                this.abortController.abort();
            } catch (error) {
                // Ignore any abort errors
            }
            this.abortController = null;
        }
    }

    createMessageElement(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (content) {
            if (type === 'user') {
                messageContent.textContent = content;
            } else {
                messageContent.innerHTML = this.formatText(content);
            }
        }
        
        messageDiv.appendChild(messageContent);
        this.elements.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Add continue button if it's an AI message
        if (type === 'ai') {
            const continueBtn = document.createElement('button');
            continueBtn.className = 'continue-btn hidden';
            continueBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Continue generating';
            messageDiv.appendChild(continueBtn);
            
            continueBtn.addEventListener('click', () => {
                continueBtn.classList.add('hidden');
                this.continueGeneration(messageDiv, this.chats[this.currentChatId].messages);
            });
        }
        
        return messageDiv;
    }

    async continueGeneration(messageDiv, chatHistory) {
        this.isProcessing = true;
        this.isGenerating = true;
        this.updateSendButtonToStop(true);
        
        const messageContent = messageDiv.querySelector('.message-content');
        const continueBtn = messageDiv.querySelector('.continue-btn');
        const lastResponse = messageContent.innerHTML;
        
        try {
            await this.getAIResponse(null, chatHistory, lastResponse, messageDiv);
        } catch (error) {
            console.error('Error:', error);
            if (error.name !== 'AbortError') {
                this.createMessageElement('system', 'Sorry, there was an error. Please try again.');
            }
        } finally {
            this.isProcessing = false;
            this.isGenerating = false;
            this.updateSendButtonToStop(false);
            this.saveChats();
        }
    }

    formatText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
            .replace(/\n/g, '<br>')
            .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    }

    async getAIResponse(userMessage, existingHistory = null, lastResponse = null, existingMessageDiv = null) {
        // Get model from current chat
        const currentModel = this.chats[this.currentChatId].model || this.currentModel;
        const model = aiManager.getModel(currentModel);
        const chatHistory = existingHistory || this.chats[this.currentChatId].messages;
        
        // Create or use existing message element
        const messageDiv = existingMessageDiv || this.createMessageElement('ai', '');
        const messageContent = messageDiv.querySelector('.message-content');
        const continueBtn = messageDiv.querySelector('.continue-btn');
        
        if (!existingMessageDiv) {
            messageContent.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        }
        
        // Enhanced contexts with higher token limits
        const enhancedContext = currentModel === 'deepseek' ? 
            `${model.context}\nPrevious conversation context: ${this.chats[this.currentChatId].title}` :
            `${model.context}\nPrevious conversation summary: ${this.chats[this.currentChatId].title}`;
        
        const messages = [
            { role: 'system', content: enhancedContext },
            ...chatHistory.map(msg => ({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.content
            }))
        ];

        if (lastResponse) {
            messages.push({ role: 'assistant', content: lastResponse });
            messages.push({ role: 'user', content: 'Please continue the previous response.' });
        }

        // Add exponential backoff retry logic
        const maxRetries = 3;
        let retryCount = 0;
        let delay = 1000;

        while (retryCount < maxRetries) {
            try {
                this.abortController = new AbortController();
                
                const response = await aiManager.getCompletion(currentModel, messages, {
                    signal: this.abortController.signal
                });

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let responseText = '';
                let buffer = '';
                let firstChunk = true;

                // Add handler for stream interruption
                let streamInterrupted = false;
                let responseTimeout;

                const handleStreamTimeout = () => {
                    if (!streamInterrupted && continueBtn) {
                        streamInterrupted = true;
                        continueBtn.classList.remove('hidden');
                    }
                };

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        
                        if (done) {
                            clearTimeout(responseTimeout);
                            // Process any remaining buffer content
                            if (buffer) {
                                try {
                                    const data = JSON.parse(buffer.slice(5));
                                    if (data.choices[0].delta?.content) {
                                        responseText += data.choices[0].delta.content;
                                    }
                                } catch (e) {
                                    // Ignore parsing errors for incomplete chunks
                                }
                            }
                            break;
                        }

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;

                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.slice(5));
                                    if (data.choices[0].delta?.content) {
                                        const content = data.choices[0].delta.content;
                                        responseText += content;
                                        
                                        if (firstChunk) {
                                            messageContent.innerHTML = '';
                                            firstChunk = false;
                                        }
                                        
                                        this.updateStreamingMessage(messageDiv, responseText);
                                        
                                        // Only auto-scroll if user was already at bottom
                                        if (this.isAtBottom()) {
                                            this.scrollToBottom();
                                        }
                                    }
                                } catch (e) {
                                    continue;
                                }
                            }
                        }

                        // Reset timeout on each chunk
                        clearTimeout(responseTimeout);
                        responseTimeout = setTimeout(handleStreamTimeout, 5000);
                    }
                } catch (streamError) {
                    if (streamError.name === 'AbortError') {
                        // Clean up the response on abort
                        await reader.cancel();
                        if (!responseText.trim()) {
                            messageDiv.remove();
                        }
                        return;
                    }
                    throw streamError;
                }

                // Save the complete message if not interrupted
                if (!streamInterrupted && responseText) {
                    this.chats[this.currentChatId].messages.push({
                        type: 'ai',
                        content: responseText
                    });

                    // Update chat title if it's the first message
                    if (this.chats[this.currentChatId].messages.length === 2) {
                        this.updateChatTitle(responseText);
                    }
                }

                return;
            } catch (error) {
                if (error.name === 'AbortError') {
                    // Don't retry on manual cancellation
                    return;
                }
                if (retryCount === maxRetries - 1) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
                retryCount++;
            }
        }
    }

    updateStreamingMessage(messageDiv, content) {
        const messageContent = messageDiv.querySelector('.message-content');
        const wasAtBottom = this.isAtBottom();
        
        // Check if content contains code blocks
        if (content.includes('```')) {
            // Split content into text and code blocks
            const parts = content.split(/(```[\s\S]*?(?:```|$))/g);
            messageContent.innerHTML = '';
            
            parts.forEach((part, index) => {
                // Handle complete code blocks
                if (part.startsWith('```') && part.endsWith('```')) {
                    const codeBlock = this.createCodeBlock(part);
                    messageContent.appendChild(codeBlock);
                } 
                // Handle incomplete code blocks (still being streamed)
                else if (part.startsWith('```') && !part.endsWith('```')) {
                    // Create a temporary code block for the incomplete code
                    const tempCodeBlock = this.createIncompleteCodeBlock(part);
                    tempCodeBlock.dataset.partIndex = index; // Store index for future updates
                    messageContent.appendChild(tempCodeBlock);
                } 
                // Handle regular text
                else if (part.trim() !== '') {
                    const textNode = document.createElement('div');
                    textNode.innerHTML = this.formatText(part);
                    messageContent.appendChild(textNode);
                }
            });
        } else {
            messageContent.innerHTML = this.formatText(content);
        }
        
        // Only scroll if user was already at bottom
        if (wasAtBottom) {
            this.scrollToBottom();
        }
    }

    isAtBottom() {
        const container = this.elements.chatContainer;
        const threshold = 100; // pixels from bottom
        return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    }

    scrollToBottom() {
        const container = this.elements.chatContainer;
        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
    }

    // Helper method to create a code block for incomplete code that's still streaming
    createIncompleteCodeBlock(codeContent) {
        // Extract language if specified
        const langMatch = codeContent.match(/```([\w-]*)?\s*\n?/);
        let language = langMatch && langMatch[1] ? langMatch[1].trim() : 'plaintext';
        
        // Handle common language aliases
        if (language === 'js') language = 'javascript';
        if (language === 'py') language = 'python';
        if (language === 'ts') language = 'typescript';
        
        // Extract the code content without the opening ```language
        const codeWithoutOpening = codeContent.replace(/```([\w-]*)?\s*\n?/, '');
        
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block streaming-code';
        
        const header = document.createElement('div');
        header.className = 'code-header';
        header.innerHTML = `
            <span>${language}</span>
            <button class="copy-btn">Copy</button>
        `;
        
        const pre = document.createElement('pre');
        const codeElement = document.createElement('code');
        codeElement.className = `language-${language}`;
        codeElement.textContent = codeWithoutOpening;
        pre.appendChild(codeElement);

        header.querySelector('.copy-btn').onclick = () => this.copyToClipboard(codeWithoutOpening, header.querySelector('.copy-btn'));

        wrapper.appendChild(header);
        wrapper.appendChild(pre);

        return wrapper;
    }

    createCodeBlock(codeContent) {
        const match = codeContent.match(/```([\w-]*)?\s*\n?([\s\S]*?)```/);
        if (!match) return document.createElement('div');

        let language = match[1] ? match[1].trim().toLowerCase() : 'plaintext';
        if (language === 'js') language = 'javascript';
        if (language === 'py') language = 'python';
        if (language === 'ts') language = 'typescript';
        
        const code = match[2].trim();
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block';
        
        const header = document.createElement('div');
        header.className = 'code-header';
        header.innerHTML = `<span>${language}</span>`;
        
        const pre = document.createElement('pre');
        const codeElement = document.createElement('code');
        codeElement.className = `language-${language}`;
        codeElement.textContent = code;
        pre.appendChild(codeElement);
        
        const actions = document.createElement('div');
        actions.className = 'code-actions';
        actions.innerHTML = `
            ${['html', 'javascript', 'css'].includes(language) ? 
                '<button class="preview-code-btn" title="Preview"><i class="fas fa-play"></i> Preview</button>' : ''}
            <button class="copy-btn" title="Copy code"><i class="fas fa-copy"></i> Copy</button>
        `;
        
        const copyBtn = actions.querySelector('.copy-btn');
        copyBtn.onclick = () => this.copyToClipboard(code, copyBtn);
        
        const previewBtn = actions.querySelector('.preview-code-btn');
        if (previewBtn) {
            previewBtn.onclick = () => this.previewCode(code, language);
        }
        
        wrapper.appendChild(header);
        wrapper.appendChild(pre);
        wrapper.appendChild(actions);
        return wrapper;
    }

    previewCode(code, language) {
        if (window.previewManager) {
            window.previewManager.createPreviewModal(code, language);
        }
    }

    async copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            setTimeout(() => button.textContent = originalText, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            button.textContent = 'Failed';
            setTimeout(() => button.textContent = 'Copy', 2000);
        }
    }

    updateChatTitle(response) {
        const maxLength = 30;
        let title = response.split('\n')[0].trim();
        title = title.replace(/[`*_]/g, '').substring(0, maxLength);
        if (title.length === maxLength) title += '...';
        
        this.chats[this.currentChatId].title = title;
        this.updateChatList();
    }

    createNewChat() {
        const chatId = Date.now().toString();
        this.chats[chatId] = {
            id: chatId,
            title: 'New Chat',
            model: this.currentModel,
            messages: []
        };
        
        this.currentChatId = chatId;
        localStorage.setItem('currentChatId', chatId);
        this.elements.chatContainer.innerHTML = '';
        
        // Show model examples for new chat
        if (window.modelShowcase) {
            window.modelShowcase.createShowcase(this.currentModel);
        }
        
        this.updateChatList();
        this.saveChats();
        this.toggleSidebar(false);
    }

    updateChatList() {
        this.elements.chatList.innerHTML = '';
        Object.values(this.chats).reverse().forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            chatItem.innerHTML = `
                <i class="fas fa-message"></i>
                <div class="chat-title" contenteditable="false">${chat.title}</div>
                <span class="chat-date">${this.formatDate(chat.id)}</span>
                <div class="chat-actions">
                    <button class="rename-chat-btn" title="Rename chat">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="delete-chat-btn" title="Delete chat">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;

            const titleElement = chatItem.querySelector('.chat-title');

            // Handle inline editing
            titleElement.addEventListener('blur', () => {
                const newTitle = titleElement.textContent.trim();
                if (newTitle && newTitle !== chat.title) {
                    chat.title = newTitle;
                    this.saveChats();
                }
                titleElement.contentEditable = "false";
                chatItem.classList.remove('editing');
            });

            titleElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    titleElement.blur();
                }
                if (e.key === 'Escape') {
                    titleElement.textContent = chat.title;
                    titleElement.blur();
                }
            });

            // Mobile context menu
            let touchTimeout;
            chatItem.addEventListener('touchstart', () => {
                touchTimeout = setTimeout(() => {
                    this.showContextMenu(chat, chatItem);
                }, 500);
            });

            chatItem.addEventListener('touchend', () => {
                clearTimeout(touchTimeout);
            });

            chatItem.addEventListener('touchmove', () => {
                clearTimeout(touchTimeout);
            });

            // Click handlers
            chatItem.querySelector('.rename-chat-btn').onclick = (e) => {
                e.stopPropagation();
                titleElement.contentEditable = "true";
                titleElement.focus();
                chatItem.classList.add('editing');
                // Select all text
                const range = document.createRange();
                range.selectNodeContents(titleElement);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            };

            chatItem.onclick = (e) => {
                if (!chatItem.classList.contains('editing')) {
                    this.loadChat(chat.id);
                }
            };

            chatItem.querySelector('.delete-chat-btn').onclick = (e) => {
                e.stopPropagation();
                this.deleteChat(chat.id);
            };

            this.elements.chatList.appendChild(chatItem);
        });
    }

    showContextMenu(chat, element) {
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) existingMenu.remove();

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <button class="context-menu-item rename">
                <i class="fas fa-pen"></i> Rename
            </button>
            <button class="context-menu-item delete">
                <i class="fas fa-trash"></i> Delete
            </button>
        `;

        // Position menu relative to chat item
        menu.style.position = 'absolute';
        menu.style.left = '0';
        menu.style.right = '0';

        // Append menu to the chat item itself for proper positioning
        element.appendChild(menu);

        menu.querySelector('.rename').onclick = (e) => {
            e.stopPropagation();
            const titleElement = element.querySelector('.chat-title');
            titleElement.contentEditable = "true";
            titleElement.focus();
            element.classList.add('editing');
            menu.remove();
            
            // Select all text
            const range = document.createRange();
            range.selectNodeContents(titleElement);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        };

        menu.querySelector('.delete').onclick = (e) => {
            e.stopPropagation();
            this.deleteChat(chat.id);
            menu.remove();
        };

        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && !element.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        
        document.addEventListener('click', closeMenu);
    }

    renameChat(chatId) {
        const chat = this.chats[chatId];
        const newTitle = prompt('Enter new chat title:', chat.title);
        if (newTitle && newTitle.trim()) {
            chat.title = newTitle.trim();
            this.saveChats();
            this.updateChatList();
        }
    }

    formatDate(timestamp) {
        const date = new Date(parseInt(timestamp));
        return date.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    loadChat(chatId) {
        this.currentChatId = chatId;
        localStorage.setItem('currentChatId', chatId);
        const chat = this.chats[chatId];
        this.elements.chatContainer.innerHTML = '';
        
        // Always show showcase for empty chats
        if (!chat.messages || chat.messages.length === 0) {
            if (window.modelShowcase) {
                window.modelShowcase.createShowcase(chat.model || this.currentModel);
            }
        } else {
            chat.messages.forEach(msg => {
                const messageDiv = this.createMessageElement(msg.type, '');
                const messageContent = messageDiv.querySelector('.message-content');
                
                if (msg.type === 'ai' && msg.content.includes('```')) {
                    // Split content into text and code blocks
                    const parts = msg.content.split(/(```[\s\S]*?```)/g);
                    messageContent.innerHTML = '';
                    
                    parts.forEach(part => {
                        if (part.startsWith('```') && part.endsWith('```')) {
                            // Handle complete code blocks
                            const match = part.match(/```([\w-]*)?\s*\n?([\s\S]*?)```/);
                            if (match) {
                                const codeBlock = this.createCodeBlock(part);
                                messageContent.appendChild(codeBlock);
                            }
                        } else if (part.trim() !== '') {
                            // Handle regular text
                            const textNode = document.createElement('div');
                            textNode.innerHTML = this.formatText(part);
                            messageContent.appendChild(textNode);
                        }
                    });
                } else {
                    // Handle non-code messages
                    messageContent.innerHTML = msg.type === 'user' ? msg.content : this.formatText(msg.content);
                }
            });
        }
        
        this.updateChatList();
        this.toggleSidebar(false);
    }

    switchModel(model) {
        const previousModel = this.currentModel;
        this.currentModel = model;
        
        // Update model info
        const modelConfig = aiManager.getModel(model);
        const modelName = modelConfig.name;
        const modelType = modelConfig.description;
        
        // Update UI elements
        this.elements.modelDropdownBtn.querySelector('.model-name').textContent = modelName;
        this.elements.modelDropdownBtn.querySelector('.model-type').textContent = modelType;
        this.elements.modelDropdownBtn.querySelector('.model-icon i').className = modelConfig.icon;
        
        // Clear all active states first
        document.querySelectorAll('.model-option').forEach(option => {
            option.classList.remove('active');
            option.querySelector('.check-icon').style.opacity = '0';
        });
        
        // Set active state for selected model
        const selectedOption = document.querySelector(`.model-option[data-model="${model}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
            selectedOption.querySelector('.check-icon').style.opacity = '1';
        }

        // Update showcase if chat is empty
        if (!this.chats[this.currentChatId]?.messages?.length) {
            const existingShowcase = document.querySelector('.model-showcase');
            if (existingShowcase) {
                existingShowcase.classList.add('exit');
                setTimeout(() => {
                    existingShowcase.remove();
                    if (window.modelShowcase) {
                        window.modelShowcase.createShowcase(model);
                    }
                }, 300);
            } else if (window.modelShowcase) {
                window.modelShowcase.createShowcase(model);
            }
        }

        // Save state
        if (previousModel !== model) {
            this.showModelSwitchNotification(modelName);
            localStorage.setItem('currentModel', model);
        }
    }

    showModelSwitchNotification(modelName) {
        const existingNotification = document.querySelector('.model-switch-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'model-switch-notification';
        notification.innerHTML = `
            <i class="fas fa-exchange-alt"></i>
            Switched to ${modelName}
        `;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 3000);
    }

    isChatEmpty() {
        return !this.chats[this.currentChatId]?.messages?.length;
    }

    deleteChat(chatId) {
        if (confirm('Are you sure you want to delete this chat?')) {
            delete this.chats[chatId];
            this.saveChats();
            
            // If we deleted the current chat, create a new one
            if (chatId === this.currentChatId) {
                this.createNewChat();
            } else {
                this.updateChatList();
            }
        }
    }

    clearAllHistory() {
        if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
            this.chats = {};
            localStorage.removeItem('chats');
            localStorage.removeItem('currentChatId');
            this.createNewChat();
            this.toggleSettingsModal();
        }
    }

    toggleSidebar(show = null) {
        const isActive = show ?? !this.elements.sidebar.classList.contains('active');
        this.elements.sidebar.classList.toggle('active', isActive);
        this.elements.overlay.classList.toggle('active', isActive);
        
        // Adjust main content when sidebar is active
        if (isActive) {
            this.mainContent.style.marginLeft = '0';
            this.mainContent.style.width = 'calc(100% - var(--sidebar-width))';
        } else {
            this.mainContent.style.marginLeft = '0';
            this.mainContent.style.width = '100%';
        }
    }

    toggleSettingsModal() {
        this.elements.settingsModal.classList.toggle('active');
    }

    loadChats() {
        try {
            const chats = JSON.parse(localStorage.getItem('chats')) || {};
            Object.values(chats).forEach(chat => {
                if (!chat.model) chat.model = 'deepseek';
            });
            return chats;
        } catch {
            return {};
        }
    }

    async saveChats() {
        localStorage.setItem('chats', JSON.stringify(this.chats));
        
        // If user is logged in, also save to Firebase
        if (firebaseManager.isUserSignedIn()) {
            await firebaseManager.saveUserChats(this.chats);
        }
    }

    async loadUserChats() {
        try {
            const firebaseChats = await firebaseManager.loadUserChats();
            if (firebaseChats) {
                // Merge with local chats if needed
                this.chats = { ...this.chats, ...firebaseChats };
                this.updateChatList();
            }
        } catch (error) {
            console.error('Error loading user chats:', error);
        }
    }

    loadSettings() {
        const defaultSettings = {
            theme: 'light',
            fontSize: 'medium'
        };
        try {
            return JSON.parse(localStorage.getItem('settings')) || defaultSettings;
        } catch {
            return defaultSettings;
        }
    }

    saveSettings() {
        const settings = {
            theme: document.documentElement.getAttribute('data-theme'),
            fontSize: document.documentElement.getAttribute('data-font-size')
        };
        localStorage.setItem('settings', JSON.stringify(settings));
    }

    applySettings() {
        document.documentElement.setAttribute('data-theme', this.settings.theme);
        document.documentElement.setAttribute('data-font-size', this.settings.fontSize);
        
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === this.settings.theme);
        });
        
        document.querySelectorAll('.font-size-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === this.settings.fontSize);
        });
    }

    handleThemeChange(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
        this.settings.theme = theme;
        this.saveSettings();
    }

    handleFontSizeChange(size) {
        document.documentElement.setAttribute('data-font-size', size);
        document.querySelectorAll('.font-size-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === size);
        });
        this.settings.fontSize = size;
        this.saveSettings();
    }

    handleScroll() {
        const container = this.elements.chatContainer;
        const scrollOffset = container.scrollHeight - container.scrollTop - container.clientHeight;
        const showScrollButton = scrollOffset > 100;
        
        this.elements.scrollBottomBtn.classList.toggle('visible', showScrollButton);
    }

    toggleProfileModal(show = true) {
        if (!this.elements.profileModal) {
            console.error('Profile modal element not found');
            return;
        }
        
        this.elements.profileModal.classList.toggle('active', show);
        
        if (show) {
            this.updateProfileStats();
        }
    }

    async updateProfileStats() {
        if (!firebaseManager.isUserSignedIn()) return;

        const totalChats = document.getElementById('totalChats');
        if (totalChats) {
            totalChats.textContent = Object.keys(this.chats).length;
        }
        
        try {
            const userProfile = await firebaseManager.getUserProfile();
            if (userProfile.success) {
                // Update additional stats
            }
        } catch (error) {
            console.error('Error updating profile stats:', error);
        }
    }

    handleExampleClick(prompt) {
        if (!prompt) return;
        
        // Remove existing showcase
        const showcase = document.querySelector('.model-showcase');
        if (showcase) {
            showcase.classList.add('exit');
            setTimeout(() => showcase.remove(), 300);
        }
        
        // Set prompt in input and send
        this.elements.messageInput.value = prompt;
        this.handleSendMessage();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.chatInterface = new ChatInterface();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (window.chatInterface) {
        window.chatInterface.createMessageElement('system', 'An error occurred. Please try again.');
        window.chatInterface.isProcessing = false;
        window.chatInterface.elements.sendBtn.disabled = false;
        window.chatInterface.elements.loadingSpinner.classList.add('hidden');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.chatInterface) {
        window.chatInterface.createMessageElement('system', 'A network error occurred. Please check your connection and try again.');
    }
});