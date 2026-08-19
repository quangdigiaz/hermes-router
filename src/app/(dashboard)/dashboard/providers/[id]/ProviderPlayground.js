"use client";

import { useState, useRef, useEffect } from "react";
import { Card, Button, Select } from "@/shared/components";

export default function ProviderPlayground({ providerId, providerAlias, models = [] }) {
  const [selectedModel, setSelectedModel] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingReasoning, setStreamingReasoning] = useState("");
  const [apiKey, setApiKey] = useState("");
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Fetch first API key for auth
  useEffect(() => {
    fetch("/api/keys")
      .then((r) => r.json())
      .then((data) => {
        const keys = data?.data?.keys || data?.keys || [];
        if (keys.length > 0) {
          setApiKey(keys[0].key);
        }
      })
      .catch(() => {});
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, streamingReasoning]);

  // Auto-select first model
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].id);
    }
  }, [models, selectedModel]);

  const handleSend = async () => {
    if (!input.trim() || !selectedModel || isLoading) return;

    const userMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");
    setStreamingReasoning("");

    try {
      abortControllerRef.current = new AbortController();

      const res = await fetch("/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: `${providerAlias}/${selectedModel}`,
          messages: newMessages,
          stream: true,
          max_tokens: 16384,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let fullReasoning = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              fullContent += delta.content;
              setStreamingContent(fullContent);
            }
            if (delta?.reasoning_content) {
              fullReasoning += delta.reasoning_content;
              setStreamingReasoning(fullReasoning);
            }
          } catch {}
        }
      }

      // Add assistant message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: fullContent || "(no content)",
          reasoning_content: fullReasoning || undefined,
        },
      ]);
    } catch (err) {
      if (err.name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${err.message}` },
        ]);
      }
    } finally {
      setIsLoading(false);
      setStreamingContent("");
      setStreamingReasoning("");
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  };

  const handleClear = () => {
    setMessages([]);
    setStreamingContent("");
    setStreamingReasoning("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const modelOptions = models.map((m) => ({
    value: m.id,
    label: m.name || m.id,
  }));

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Playground</h2>
        <div className="flex items-center gap-2">
          <div className="w-48">
            <Select
              options={modelOptions}
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              selectClassName="text-xs py-1.5"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto mb-4 p-3 bg-black/5 dark:bg-white/5 rounded-lg">
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-8 text-text-muted text-sm">
            Send a message to start the conversation
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10"
              }`}
            >
              {msg.reasoning_content && (
                <div className="mb-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20 text-xs">
                  <div className="font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                    Thinking
                  </div>
                  <div className="text-text-muted whitespace-pre-wrap">
                    {msg.reasoning_content}
                  </div>
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {/* Streaming */}
        {isLoading && (streamingContent || streamingReasoning) && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10">
              {streamingReasoning && (
                <div className="mb-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20 text-xs">
                  <div className="font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                    Thinking...
                  </div>
                  <div className="text-text-muted whitespace-pre-wrap">
                    {streamingReasoning}
                  </div>
                </div>
              )}
              {streamingContent && (
                <div className="whitespace-pre-wrap">{streamingContent}</div>
              )}
              {!streamingContent && !streamingReasoning && (
                <div className="text-text-muted animate-pulse">Thinking...</div>
              )}
            </div>
          </div>
        )}

        {isLoading && !streamingContent && !streamingReasoning && (
          <div className="flex justify-start">
            <div className="rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2 text-text-muted">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={apiKey ? "Send a message..." : "No API key found. Create one in API Keys page."}
          rows={2}
          className="flex-1 resize-none rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
          disabled={isLoading || !selectedModel || !apiKey}
        />
        {isLoading ? (
          <Button
            variant="ghost"
            onClick={handleStop}
            className="shrink-0 self-end"
          >
            <span className="material-symbols-outlined text-[18px]">stop</span>
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={!input.trim() || !selectedModel}
            className="shrink-0 self-end"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
          </Button>
        )}
      </div>

      <p className="text-[10px] text-text-muted mt-2">
        Shift+Enter for new line · Enter to send
      </p>
    </Card>
  );
}
