import { useState } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

export default function NYC_Chatbot() {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [showPills, setShowPills] = useState(true);

    const AI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;
    const genAI = new GoogleGenerativeAI(AI_API_KEY);
    const dashboardContext = `Welcome to the NYC Data Dashboard! This interactive visualization shows:
    • Crime patterns across boroughs and times
    • Restaurant ratings and cuisine distribution
    • Airbnb listing characteristics
    • Environmental metrics by neighborhood

    Ask me anything about NYC data, neighborhoods, or trends!`;

    const [contextMessage] = useState({ sender: 'ai', text: dashboardContext });

    const sampleQuestions = [
        "What are the safest neighborhoods in Manhattan?",
        "Show me top-rated Italian restaurants in Brooklyn",
        "Compare Airbnb prices in Queens vs Brooklyn"
    ];

    async function handleAIResponse(userMessage) {
        try {
            // Correct way to get the model
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            // Generate content
            const prompt = `You are a witty NYC local giving quick tips. Keep responses under 3 sentences, be funny but helpful, and focus only on what was asked. Add a touch of NYC attitude.Be precise if you need to be.\nUser: ${userMessage}\nAI:`;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return text;
        } catch (error) {
            console.error("Error generating AI response:", error);
            return `Sorry, I couldn't process your request. Error: ${error.message}`;
        }
    }

    const handleSendMessage = async () => {
        if (inputMessage.trim() === '') return;

        // Add user message to chat
        const userMsg = { sender: 'user', text: inputMessage };
        setMessages(prev => [...prev, userMsg]);

        // Hide pills after first message
        if (showPills) setShowPills(false);

        // Clear input field
        setInputMessage('');

        // Get AI response
        const aiResponse = await handleAIResponse(inputMessage);

        // Add AI response to chat
        const aiMsg = { sender: 'ai', text: aiResponse };
        setMessages(prev => [...prev, aiMsg]);
    };

    const handlePillClick = async (question) => {
        setInputMessage(question);
        await handleSendMessage();
    };

    return (
        <div className="bg-[#24283b] rounded-md shadow-lg border border-[#2f334d] p-4 flex flex-col h-full">
            <h3 className="text-lg font-medium text-[#ffffff] mb-3 px-2">Welcome to NYC Explorer!</h3>

            {/* Chat Messages Container */}
            <div className="flex-1 overflow-y-auto mb-4 px-2">
                {messages.map((msg, index) => (
                    <div key={index} className={`mb-3 ${msg.sender === 'user' ? 'text-right' : ''}`}>
                        <div className={`inline-block rounded-lg px-4 py-2 max-w-[85%] ${msg.sender === 'user'
                                ? 'bg-[#7aa2f7] text-white shadow-sm'
                                : 'bg-[#2f334d] text-[#c0c2cc]'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
            </div>

            {/* Sample Questions Pills - Centered vertically when no messages */}
            {showPills && (
                <div> 
                <div className="flex-1 flex flex-col justify-center items-center mb-4 px-2">
                    <div className="w-full flex flex-col gap-3 max-w-[90%]">
                        <div className="text-center mb-4">
                            <p className="text-[#c0c2cc] text-sm">Discover the city that never sleeps. Don't miss these iconic attractions:</p>
                            <ul className="text-[#7aa2f7] text-sm mt-2">
                                <li>• Times Square - The Crossroads of the World</li>
                                <li>• Central Park - Manhattan's Green Oasis</li>
                                <li>• Empire State Building - NYC's Iconic Skyscraper</li>
                            </ul>
                        </div>
                        {sampleQuestions.map((question, index) => (
                            <button
                                key={index}
                                onClick={() => handlePillClick(question)}
                                className="bg-[#2f334d] hover:bg-[#3b3f5c] text-[#c0c2cc] px-5 py-3 rounded-full text-sm font-medium transition-colors duration-200 shadow-md text-left border border-[#3b3f5c] hover:border-[#7aa2f7]"
                            >
                                {question}
                            </button>
                        ))}
                    </div>
                </div>
                </div>
            )}

            {/* Chat Input - Larger Pill Shaped */}
            <div className="flex items-center px-2 mt-2">
                <div className="flex w-full items-center bg-[#2f334d] rounded-full px-5 py-3 focus-within:ring-2 focus-within:ring-[#7aa2f7] border border-[#3b3f5c] shadow-md">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ask about NYC neighborhoods..."
                        className="flex-1 bg-transparent text-[#ffffff] focus:outline-none text-sm"
                    />
                    <button
                        onClick={handleSendMessage}
                        className="ml-3 p-2 rounded-full bg-[#7aa2f7] hover:bg-[#5d89f7] text-white transition-colors duration-200"
                        aria-label="Send message"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-5 w-5"
                        >
                            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}