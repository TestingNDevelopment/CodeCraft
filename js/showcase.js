class ModelShowcase {
    constructor() {
        this.modelExamples = {
            deepseek: {
                title: "Create Something Amazing",
                description: "👾",
                modelDescription: "Specialized in creating polished web applications with modern UI/UX, animations, and robust functionality. Choose any from the below and see the preview.",
                examples: [
                    {
                        icon: 'fas fa-globe',
                        title: 'Modern Landing',
                        description: 'Premium SaaS landing page',
                        prompt: `Create a modern SaaS landing page with these features:

Hero Section:
- Animated gradient background with floating elements
- 3D product mockup with hover effects
- Large heading with gradient text and typing animation
- Transparent navbar with blur effect
- CTA button with hover animation
- Mouse trail particle effect

Feature Section:
- 3x3 feature grid with hover cards
- Icon animations on scroll
- Clean typography and spacing
- Smooth reveal animations

Pricing Section:
- 3 pricing tiers with popular tag
- Interactive pricing cards with hover effects
- Feature comparison list
- Animated checkmark icons

Testimonials:
- Customer review slider/carousel
- Profile images with glow effect
- Star rating animations
- Auto-scrolling logos section

Newsletter:
- Floating label inputs
- Success/error animations
- Background pattern animation

Colors & Style:
- Primary: #4F46E5 (indigo)
- Accent: #9333EA (purple)
- Gradients and glass effects
- Modern sans-serif typography
- Responsive on all devices

Focus on smooth animations and premium feel.
Deliver in a single HTML file with internal CSS/JS.
Use only Font Awesome CDN for icons.`
                    },
                    {
                        icon: 'fas fa-wand-magic-sparkles',
                        title: 'Magic Portfolio',
                        description: 'Stunning single-page portfolio',
                        prompt: `Create a stunning single-page portfolio with:

- Hero section with particle text animation
- Floating project cards with 3D hover effect
- Smooth scroll animations
- Skills section with animated progress bars
- Contact form with floating labels
- Beautiful gradient backgrounds
- Modern glassmorphism design
- Responsive layout with clean grid

Style Requirements:
- Use modern CSS (Grid, Flexbox)
- Implement smooth animations
- Include light/dark mode toggle
- Mobile-first approach

Keep everything in a single HTML file using internal CSS/JS.
Focus on visual impact and smooth interactions.
Use minimal external resources (only Font Awesome CDN).`
                    },
                    {
                        icon: 'fas fa-shop',
                        title: 'Modern E-commerce',
                        description: 'Luxury fashion store homepage',
                        prompt: `Create a luxury fashion e-commerce homepage:

1. Navigation Structure:
- Main logo on left
- Category mega menu with smooth dropdown
- Search with auto-suggestions
- User account and cart with item count
- Sticky header on scroll

2. Hero Section:
- Full-width gradient animation background
- Featured product with 3D tilt
- Shop now button with hover effect
- Scroll indicator animation

3. Product Showcase:
- 2x3 grid of trending items
- Quick view overlay on hover
- Price and rating display
- Add to cart animation
- Product cards with subtle hover lift

4. Categories Section:
- 4 main categories with background images
- Overlay text with elegant typography
- Zoom effect on hover
- Category labels with gradient borders

5. Features Bar:
- Free shipping indicator
- Money-back guarantee
- 24/7 support
- Secure checkout badge

6. Newsletter:
- Floating input design
- Subscribe button with gradient
- Success animation
- Privacy policy link

Style Requirements:
- Black and gold luxury theme
- Glass effect cards
- Consistent spacing
- Responsive breakpoints
- Smooth page load animations

Deliver as single HTML file. Focus on premium feel and smooth interactions.`
                    },
                    {
                        icon: 'fas fa-gamepad',
                        title: 'Arcade Game',
                        description: 'Interactive retro-style game',
                        prompt: `Create a modern arcade game with:

Key Features:
- HTML5 Canvas-based retro game
- Player movement & collision system
- Enemy AI with dynamic patterns
- Score & health tracking
- Touch & keyboard controls
- Power-ups & particle effects
- High score system
- Game over & restart flow

Visuals:
- Neon retro pixel art style
- Smooth particle animations
- Parallax background layers
- Modern minimal UI/HUD
- Mobile responsive design

Technical:
- Pure HTML/CSS/JS only
- Optimized game loop
- Local storage for scores
- Touch event handling
- Optimized for performance

Focus on polished gameplay and smooth controls.`
                    }
                ]
            },
            gemma: {
                title: "Personal Growth & Insights",
                description: "Your companion for self-discovery",
                modelDescription: "An empathetic guide for personal development, helping you explore self-awareness, transform limiting beliefs, and discover your authentic path.",
                examples: [
                    {
                        icon: 'fas fa-mask',
                        title: 'Self Discovery Journey',
                        description: 'Uncover your authentic self through guided reflection and deep insights.',
                        prompt: 'I want to uncover the masks and roles I\'m playing, the illusions I\'m believing. Please guide me through the process by asking reflective questions one at a time. After our discussion, analyze my responses and provide actionable steps for authentic growth.'
                    },
                    {
                        icon: 'fas fa-seedling',
                        title: 'Inner Growth Work',
                        description: 'Transform limiting beliefs and develop empowering mindsets.',
                        prompt: 'Help me identify and transform my limiting beliefs. Guide me through a process of understanding where these beliefs come from, how they\'re affecting my life, and what new empowering beliefs I can cultivate.'
                    },
                    {
                        icon: 'fas fa-compass',
                        title: 'Life Purpose Clarity',
                        description: 'Find clarity in your life direction and authentic path.',
                        prompt: 'I feel disconnected from my true purpose. Help me explore my values, passions, and fears through reflective questions. Guide me to understand what truly matters to me and how to align my life with my authentic self.'
                    },
                    {
                        icon: 'fas fa-moon',
                        title: 'Sleep Cycle Reset',
                        description: 'Fix your sleep schedule naturally',
                        prompt: `Create a sleep optimization plan:

1. Sleep Analysis:
- Circadian rhythm overview
- Common disruption factors
- Health impact assessment

2. Reset Strategy:
- Light exposure timing
- Temperature optimization
- Exercise scheduling
- Nutrition guidelines
- Stress management

3. Implementation:
- Daily schedule template
- Environment setup
- Routine building steps
- Progress tracking
- Success metrics

4. Maintenance:
- Long-term habit formation
- Travel adaptation tips
- Social life balance
- Emergency backup plans

Provide actionable, science-based solutions.`
                    }
                ]
            }
        };
    }

    createShowcase(model) {
        const existingShowcase = document.querySelector('.model-showcase');
        if (existingShowcase) {
            existingShowcase.classList.add('exit');
            setTimeout(() => existingShowcase.remove(), 300);
        }

        const modelData = this.modelExamples[model];
        if (!modelData) return;

        const showcase = document.createElement('div');
        showcase.className = 'model-showcase';
        showcase.innerHTML = `
            <div class="model-showcase-header">
                <p class="model-type-description">${this.modelExamples[model].modelDescription}</p>
            </div>
            <div class="model-showcase-grid">
                ${modelData.examples.map(example => `
                    <div class="showcase-card" data-prompt="${example.prompt}">
                        <div class="showcase-icon">
                            <i class="${example.icon}"></i>
                        </div>
                        <div class="showcase-content">
                            <div class="showcase-title">${example.title}</div>
                            <div class="showcase-description">${example.description}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Add click handlers to cards
        showcase.querySelectorAll('.showcase-card').forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.dataset.prompt;
                if (window.chatInterface) {
                    window.chatInterface.handleExampleClick(prompt);
                }
            });
        });

        const chatContainer = document.getElementById('chatContainer');
        chatContainer.appendChild(showcase);
    }
}

// Initialize showcase immediately after page load
window.addEventListener('load', () => {
    if (!window.modelShowcase) {
        window.modelShowcase = new ModelShowcase();
        // Show initial showcase if chat is empty
        if (window.chatInterface?.isChatEmpty()) {
            window.modelShowcase.createShowcase(window.chatInterface.currentModel);
        }
    }
});
