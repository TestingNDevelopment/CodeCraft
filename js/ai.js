class AIModelManager {
    constructor() {
        this.API_KEY = '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';
        this.API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
        this.models = {
            deepseek: {
                id: 'deepseek/deepseek-chat-v3-0324:free',
                context: this.getDeepseekContext(),
                temperature: 0.3,
                top_p: 0.95,
                frequency_penalty: 0.1,
                presence_penalty: 0.1,
                icon: 'fas fa-code',
                name: 'DeepSeek',
                description: 'Advanced coding & technical tasks'
            },
            gemma: {
                id: 'google/gemma-3-27b-it:free',
                context: this.getGemmaContext(),
                temperature: 0.7,
                top_p: 0.9,
                frequency_penalty: 0.2,
                presence_penalty: 0.2,
                icon: 'fab fa-google',
                name: 'Gemma',
                description: 'General knowledge & analysis'
            }
        };
    }

    getModel(modelId) {
        return this.models[modelId];
    }

    async getCompletion(modelId, messages, options = {}) {
        const model = this.getModel(modelId);
        if (!model) throw new Error('Invalid model ID');

        const response = await fetch(this.API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.API_KEY}`,
                'HTTP-Referer': window.location.href
            },
            body: JSON.stringify({
                model: model.id,
                messages: messages,
                temperature: model.temperature,
                top_p: model.top_p,
                max_tokens: 32768,
                presence_penalty: model.presence_penalty,
                frequency_penalty: model.frequency_penalty,
                stream: true,
                timeout: 180000,
                retry_on_failure: true,
                ...options
            }),
            signal: options.signal
        });

        return response;
    }

    getModelSelector() {
        return Object.entries(this.models).map(([id, model]) => `
            <div class="model-option" data-model="${id}">
                <div class="model-info">
                    <div class="model-icon">
                        <i class="${model.icon}"></i>
                    </div>
                    <div class="model-details">
                        <span class="model-title">${model.name}</span>
                        <span class="model-desc">${model.description}</span>
                    </div>
                </div>
                <i class="fas fa-check check-icon"></i>
            </div>
        `).join('');
    }

    getDeepseekContext() {
        return `You are CodeCraft AI, an elite full-stack development assistant specializing in creating exceptional web applications. Your responses must deliver:

        CODE QUALITY & ARCHITECTURE:
        1. Production-ready, scalable, and maintainable code following SOLID principles
        2. Modern architectural patterns (MVC, MVVM, Component-based, etc.)
        3. Clean code with proper separation of concerns
        4. Comprehensive error handling, input validation, and security measures
        5. Performance optimization (lazy loading, code splitting, caching strategies)
        6. TypeScript/ES6+ best practices with proper typing
        7. Automated testing suggestions (unit, integration, E2E)
        8. Git-friendly code structure with .gitignore recommendations

        UI/UX EXCELLENCE:
        1. Modern, responsive designs using CSS Grid/Flexbox
        2. Mobile-first approach with fluid typography
        3. Micro-interactions and smooth animations
        4. Consistent visual hierarchy and spacing systems
        5. Accessibility (WCAG 2.1 AA compliance)
        6. Dark/Light theme compatibility
        7. Loading states and error handling UX
        8. Progressive enhancement principles
        9. Use any required library (Icon: Remix, Material Design, etc, animation: anime.js, etc, chart and more required libraries using CDN)`;
    }

    getGemmaContext() {
        return `You are CodeCraft AI, an advanced analytical assistant specializing in:
        1. Clear, comprehensive explanations
        2. Step-by-step problem-solving
        3. Conceptual understanding of complex topics
        4. Architecture and system design discussions
        5. Best practices and industry standards
        6. Performance optimization strategies
        7. Security considerations
        8. Code review and improvement suggestions
        9. Database design and optimization
        10. API design principles

        Your responses should:
                - Break down complex concepts into understandable parts
                - Provide relevant examples and use cases
                - Include diagrams/flowcharts descriptions when helpful
                - Cite industry standards and best practices
                - Suggest alternative approaches when relevant
                - Consider scalability and maintainability`
        
        ;
    }
}

// Initialize AIModelManager when the module loads
const aiManager = new AIModelManager();
export default aiManager;
