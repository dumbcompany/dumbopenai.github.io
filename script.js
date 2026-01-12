document.addEventListener('DOMContentLoaded', () => {
    const sendButton = document.getElementById('send-button')
    const userInput = document.getElementById('user-input')
    const chatWindow = document.querySelector('.chat-window')
    let chatStarted = false

    // --- Rotating Hints Logic ---
    let hintIndex = 0
    const hints = [
        "Tell DumbOpenAI about your childhood…",
        "Tell DumbOpenAI what makes you happy…",
        "Tell DumbOpenAI your problems…",
        "Tell DumbOpenAI about your family…",
    ]
    let rotateInterval

    const startHintRotation = () => {
        // Only start if chat hasn't started and input is empty and not focused
        if (!chatStarted && userInput.value.trim() === '' && document.activeElement !== userInput) {
            stopHintRotation() // Clear any existing interval
            rotateInterval = setInterval(() => {
                userInput.placeholder = hints[hintIndex]
                hintIndex = (hintIndex + 1) % hints.length
            }, 3000) // Rotate every 3 seconds
        }
    }

    const stopHintRotation = () => {
        clearInterval(rotateInterval)
    }

    // Initial setup for hint rotation
    startHintRotation()

    // Re-add event listeners for placeholder management
    userInput.addEventListener('focus', () => {
        stopHintRotation()
        userInput.placeholder = '' // Clear placeholder on focus
    })

    userInput.addEventListener('blur', () => {
        if (userInput.value.trim() === '' && !chatStarted) {
            startHintRotation()
        } else if (userInput.value.trim() !== '') {
            userInput.placeholder = '' // Keep placeholder clear if text is present
        }
    })


    // ---------- Pronoun reflections ----------
    const REFLECTIONS = {
        "am": "are",
        "are": "am",
        "i": "you",
        "you": "I",
        "me": "you",
        "my": "your",
        "your": "my",
        "mine": "yours",
        "yours": "mine"
    }

    function reflect(text) {
        return text
            .toLowerCase()
            .split(/\b/)
            .map(word => REFLECTIONS[word] || word)
            .join("")
    }

    // ---------- Decomposition rule ----------
    class Decomposition {
        constructor(pattern, responses) {
            this.pattern = pattern
            this.responses = responses
            this.index = 0
        }

        nextResponse() {
            const response = this.responses[this.index]
            this.index = (this.index + 1) % this.responses.length
            return response
        }
    }

    // ---------- Keyword rule ----------
    class Rule {
        constructor(keyword, priority, decompositions) {
            this.keyword = keyword
            this.priority = priority
            this.decompositions = decompositions
        }
    }

    // ---------- Rule set ----------
    const RULES = [
        new Rule("hello", 100, [
            new Decomposition(/^(hello|hi|hey).*$/i, [
                "Hello. What is troubling you?",
                "Hello. How are you feeling today?"
            ])
        ]),

        new Rule("feel", 80, [
            new Decomposition(/i feel (.*)/i, [
                "Do you often feel $1?",
                "Tell me more about these feelings.",
                "What makes you feel $1?"
            ])
        ]),

        new Rule("am", 75, [
            new Decomposition(/i am (.*)/i, [
                "How long have you been $1?",
                "Why do you say you are $1?",
                "How do you feel about being $1?"
            ])
        ]),

        new Rule("family", 70, [
            new Decomposition(/(mother|father|parent|family)/i, [
                "Tell me more about your family.",
                "How do you feel about your $1?"
            ])
        ]),

        new Rule("because", 60, [
            new Decomposition(/because (.*)/i, [
                "Is that the real reason?",
                "What other reasons come to mind?"
            ])
        ]),

        new Rule("you", 50, [
            new Decomposition(/you (.*)/i, [
                "We are discussing you, not me.",
                "Why do you say that about me?"
            ])
        ])
    ]

    // Sort rules by priority (highest first)
    RULES.sort((a, b) => b.priority - a.priority)

    // ---------- Input normalization ----------
    function normalize(input) {
        return input
            .toLowerCase()
            .replace(/[^\w\s]/g, "")
            .trim()
    }

    // ---------- Reassembly ----------
    function assemble(template, match) {
        return template.replace(/\$(\d+)/g, (_, i) =>
            reflect(match[i])
        )
    }

    // ---------- Rule application ----------
    function applyRules(input) {
        for (const rule of RULES) {
            for (const d of rule.decompositions) {
                const match = input.match(d.pattern)
                if (match) {
                    const template = d.nextResponse()
                    return assemble(template, match)
                }
            }
        }
        return null
    }

    // ---------- Fallback responses ----------
    const FALLBACKS = [
        "Please go on.",
        "Tell me more.",
        "Why do you say that?",
        "I see."
    ]
    let fallbackIndex = 0

    function fallback() {
        const response = FALLBACKS[fallbackIndex]
        fallbackIndex = (fallbackIndex + 1) % FALLBACKS.length
        return response
    }

    // ---------- Main doctor function ----------
    function doctor(input) {
        const cleaned = normalize(input)
        const response = applyRules(cleaned)
        return response || fallback()
    }


    // --- Scrolling Logic ---
    // Non-animated scroll to bottom
    const scrollToBottom = () => {
        chatWindow.scrollTop = chatWindow.scrollHeight - chatWindow.clientHeight
    }

    const scrollToBottomAnimated = () => {
        const startScroll = chatWindow.scrollTop
        const endScroll = chatWindow.scrollHeight - chatWindow.clientHeight
        const distance = endScroll - startScroll
        const duration = 300 // milliseconds
        let startTime = null

        const animateScroll = (currentTime) => {
            if (!startTime) startTime = currentTime
            const progress = (currentTime - startTime) / duration

            if (progress < 1) {
                // Ensure Math.easeInOutQuad is defined, or use a linear ease for simplicity
                chatWindow.scrollTop = startScroll + distance * (Math.easeInOutQuad ? Math.easeInOutQuad(progress) : progress)
                requestAnimationFrame(animateScroll)
            } else {
                chatWindow.scrollTop = endScroll
            }
        }

        // Easing function for smooth animation - ensuring it's defined once
        if (typeof Math.easeInOutQuad === 'undefined') {
            Math.easeInOutQuad = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        }
        
        requestAnimationFrame(animateScroll)
    }


    const streamText = (element, text) => {
        let index = 0
        const interval = setInterval(() => {
            if (index < text.length) {
                element.innerHTML += text.charAt(index)
                index++
                scrollToBottom() // Instant scroll during streaming
            } else {
                clearInterval(interval)
                // Call animated scroll after a very short delay to allow DOM to render
                setTimeout(() => scrollToBottomAnimated(), 0)
            }
        }, 50) // Adjust speed of typing here
    }

    const sendMessage = () => {
        const messageText = userInput.value.trim()
        if (messageText === '') {
            return
        }

        // Expand chat window on first message
        if (!chatStarted) {
            chatWindow.classList.remove('chat-window-hidden') // Show chat window
            chatWindow.classList.add('chat-window-expanded') // Expand chat window
            stopHintRotation() // Stop hint rotation
            userInput.placeholder = '' // Clear placeholder permanently
            chatStarted = true

            // Hide the h2 title
            const chatTitle = document.getElementById('chat-title')
            if (chatTitle) {
                chatTitle.classList.add('hidden')
                // Optional: after the transition, set display: none to completely remove it from flow
                chatTitle.addEventListener('transitionend', () => {
                    chatTitle.classList.add('hide-completely')
                }, { once: true })
            }
        }

        // Display user message
        const userMessage = document.createElement('div')
        userMessage.classList.add('chat-message', 'user-message')
        userMessage.innerHTML = `<p>${messageText}</p>`
        chatWindow.appendChild(userMessage)
        scrollToBottomAnimated() // Scroll after user message

        // Clear input
        userInput.value = ''

        // Show typing indicator
        const typingIndicator = document.createElement('div')
        typingIndicator.classList.add('chat-message', 'bot-message', 'typing-indicator')
        typingIndicator.innerHTML = `
            <div class="typing-dots-container">
                <span></span><span></span><span></span>
            </div>`
        chatWindow.appendChild(typingIndicator)
        // No animated scroll here, just instant scroll within streamText

        // Bot reply
        setTimeout(() => {
            // Remove typing indicator
            typingIndicator.remove()

            const botReplyText = doctor(messageText) // Use the new Doctor logic

            const botMessage = document.createElement('div')
            botMessage.classList.add('chat-message', 'bot-message')
            // Create the element for streaming
            const messageContent = document.createElement('p')
            botMessage.appendChild(messageContent)
            chatWindow.appendChild(botMessage)
            // Scroll will be handled by streamText once complete

            // Start streaming the text
            streamText(messageContent, botReplyText)

        }, 1500) // Increased delay to make typing indicator more visible
    }

    sendButton.addEventListener('click', sendMessage)
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage()
        }
    })
})
