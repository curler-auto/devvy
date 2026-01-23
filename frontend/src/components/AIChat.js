import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Minimize2, Maximize2, Sparkles, Copy, Check, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

/**
 * AI Chat Component - Context-aware AI assistant
 * Integrates with any tool and provides intelligent assistance
 */
function AIChat({ toolContext, isOpen, onClose, onMinimize, isMinimized }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [llmConfig, setLlmConfig] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadLLMConfig();
    if (toolContext) {
      // Add initial context message
      setMessages([{
        role: 'system',
        content: `I'm your AI assistant for ${toolContext.toolName}. I can help you with ${toolContext.description}. How can I assist you?`,
        timestamp: new Date()
      }]);
    }
  }, [toolContext]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadLLMConfig = () => {
    try {
      const stored = localStorage.getItem('llm_config');
      if (stored) {
        setLlmConfig(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load LLM config:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post('/api/ai/chat', {
        messages: [...messages, userMessage],
        toolContext,
        llmConfig
      });

      const aiMessage = {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('AI chat error:', err);
      toast.error('Failed to get AI response');
      
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your LLM configuration in Settings → Environment.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopied(index);
    toast.success('Message copied');
    setTimeout(() => setCopied(null), 2000);
  };

  const clearChat = () => {
    setMessages([{
      role: 'system',
      content: `I'm your AI assistant for ${toolContext.toolName}. How can I assist you?`,
      timestamp: new Date()
    }]);
    toast.success('Chat cleared');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={onMinimize}
          className="rounded-full w-14 h-14 shadow-lg"
          size="lg"
          aria-label="Open AI Assistant"
        >
          <MessageSquare className="w-6 h-6" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed right-4 bottom-4 w-96 h-[600px] bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <div>
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            <p className="text-xs text-[var(--text-secondary)]">{toolContext?.toolName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button onClick={() => setShowSettings(!showSettings)} size="sm" variant="ghost" aria-label="Settings">
            <Settings className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button onClick={clearChat} size="sm" variant="ghost" aria-label="Clear chat">
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button onClick={onMinimize} size="sm" variant="ghost" aria-label="Minimize chat">
            <Minimize2 className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button onClick={onClose} size="sm" variant="ghost" aria-label="Close chat">
            <X className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-3 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
          <p className="text-xs text-[var(--text-secondary)]">
            Configure LLM settings in Settings → Environment
          </p>
          {!llmConfig && (
            <p className="text-xs text-red-500 mt-1">
              ⚠️ No LLM configuration found
            </p>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : msg.role === 'system'
                  ? 'bg-purple-500 text-white'
                  : 'bg-[var(--bg-secondary)] border border-[var(--border-primary)]'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs opacity-70">
                  {msg.timestamp.toLocaleTimeString()}
                </span>
                {msg.role === 'assistant' && (
                  <Button
                    onClick={() => copyMessage(msg.content, index)}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    aria-label="Copy message"
                  >
                    {copied === index ? (
                      <Check className="w-3 h-3" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3 h-3" aria-hidden="true" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            className="flex-1 px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] text-sm resize-none"
            rows={2}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            size="sm"
            className="self-end"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AIChat;
