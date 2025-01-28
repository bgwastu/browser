"use client";

import React from "react";
import { useChat } from "ai/react";
import { useInView } from "react-intersection-observer";

import { closeSession, createAndGetSessionUrl } from "@/actions/session";
import { ChatInput } from "@/components/chat-input";
import { ChatMessage } from "@/components/chat-message";
import { Button } from "@/components/ui/button";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

export function Browser() {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const initialInputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const chatInputRef = React.useRef<HTMLTextAreaElement | null>(null);

  const [sessionUrl, setSessionUrl] = React.useState<string | null>(null);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [isInitializing, setIsInitializing] = React.useState(false);
  const [isShowingInit, setIsShowingInit] = React.useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = React.useState(true);
  const [isEnding, setIsEnding] = React.useState(false);

  // Set up useChat with the sessionId in the request body.
  const { messages, input, setInput, handleSubmit, isLoading, data, append } =
    useChat({
      body: { sessionId: sessionId },
      id: sessionId || undefined,
    });

  // Intersection observer to check if we're scrolled to the bottom
  const [inViewRef, inView] = useInView({ threshold: 0 });

  const composedScrollRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      scrollRef.current = node;
      inViewRef(node);
    },
    [inViewRef]
  );

  // Merge `data` into the last assistant message as a status, if any
  const messagesWithStatus = React.useMemo(() => {
    if (!data || !messages) return messages;

    const lastData = data[data.length - 1];
    if (!lastData) return messages;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return messages;

    return messages.map((message, index) => {
      if (index === messages.length - 1 && message.role === "assistant") {
        return { ...message, status: lastData };
      }
      return message;
    });
  }, [messages, data]);

  const initializeSession = async () => {
    if (sessionId || isInitializing) return;
    setIsInitializing(true);
    try {
      const { url, sessionId: id } = await createAndGetSessionUrl();
      setSessionUrl(url);
      setSessionId(id);
    } catch (error) {
      console.error("Failed to initialize session:", error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleInitialSubmit = async (value: string) => {
    setIsShowingInit(true);

    await initializeSession();

    setIsShowingInit(false);

    append({
      content: value,
      role: "user",
    });
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    setIsEnding(true);
    try {
      await closeSession(sessionId);
      setSessionId(null);
      setSessionUrl(null);
      window.location.reload();
    } catch (error) {
      console.error("Failed to end session:", error);
    } finally {
      setIsEnding(false);
    }
  };

  const handleExampleClick = async (prompt: string) => {
    setIsShowingInit(true);

    await initializeSession();

    setIsShowingInit(false);

    append({
      content: prompt,
      role: "user",
    });
  };

  React.useEffect(() => {
    setShouldAutoScroll(inView);
  }, [inView]);

  React.useEffect(() => {
    if (shouldAutoScroll) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldAutoScroll]);

  return (
    <main className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <Button
            variant="ghost"
            className="h-auto p-0 text-lg hover:bg-transparent hover:text-foreground/90"
            onClick={handleEndSession}
          >
            Browser
          </Button>
        </div>
      </header>

      <div className="container h-[calc(100vh-56px)]">
        {messagesWithStatus.length === 0 && !isShowingInit ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 p-4">
            <h1 className="text-3xl font-bold">Ottogrid Browser</h1>
            <div className="w-full max-w-2xl">
              <ChatInput
                ref={initialInputRef}
                placeholder="Type something here..."
                minRows={3}
                className="max-h-[200px] min-h-[100px] text-base"
                value={input}
                onValueChange={setInput}
                onSubmit={handleInitialSubmit}
                disabled={isLoading || isInitializing}
                autoFocus
              />

              <div className="mt-8">
                <p className="mb-4 text-center text-muted-foreground">
                  Or try one of these examples:
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <button
                    onClick={() =>
                      handleExampleClick(
                        "Find me the best-rated Italian restaurants in New York City with outdoor seating"
                      )
                    }
                    className="rounded-lg border bg-muted/50 p-4 text-left text-sm transition-colors hover:bg-muted"
                  >
                    🍝 Find top-rated Italian restaurants in NYC with outdoor
                    seating
                  </button>
                  <button
                    onClick={() =>
                      handleExampleClick(
                        "Research and compare the latest iPhone models and their key features"
                      )
                    }
                    className="rounded-lg border bg-muted/50 p-4 text-left text-sm transition-colors hover:bg-muted"
                  >
                    📱 Compare latest iPhone models and features
                  </button>
                  <button
                    onClick={() =>
                      handleExampleClick(
                        "Find the best deals on round-trip flights from London to Tokyo for next month"
                      )
                    }
                    className="rounded-lg border bg-muted/50 p-4 text-left text-sm transition-colors hover:bg-muted"
                  >
                    ✈️ Search for London to Tokyo flight deals
                  </button>
                  <button
                    onClick={() =>
                      handleExampleClick(
                        "Research and summarize recent breakthroughs in renewable energy technology"
                      )
                    }
                    className="rounded-lg border bg-muted/50 p-4 text-left text-sm transition-colors hover:bg-muted"
                  >
                    🌱 Explore recent renewable energy innovations
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={30} minSize={20}>
              <div className="flex h-full flex-col p-4">
                <h2 className="mb-4 text-xl font-semibold">Chat Feed</h2>
                <div className="flex-1 space-y-4 overflow-auto rounded-lg border bg-muted/50 p-4 text-sm">
                  {isShowingInit && (
                    <div className="rounded-lg border bg-muted px-3 py-2 text-muted-foreground">
                      Initializing...
                    </div>
                  )}

                  {!isShowingInit &&
                    messagesWithStatus.map((message) => (
                      <ChatMessage key={message.id} message={message} />
                    ))}

                  <div ref={composedScrollRef} />
                </div>

                <div className="mt-4">
                  <ChatInput
                    ref={chatInputRef}
                    placeholder="Type something here..."
                    minRows={3}
                    className="max-h-[100px] min-h-[60px] text-base"
                    value={input}
                    onValueChange={setInput}
                    // For subsequent messages, we can just call handleSubmit
                    // from useChat
                    onSubmit={() => handleSubmit(new Event("submit"))}
                    disabled={isLoading || isShowingInit}
                  />
                </div>
              </div>
            </ResizablePanel>

            <ResizablePanel defaultSize={70} minSize={40}>
              <div className="flex h-full flex-col p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Browser Panel</h2>
                  <button
                    onClick={handleEndSession}
                    disabled={isEnding}
                    className="inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isEnding ? "Ending Session..." : "End Session"}
                  </button>
                </div>
                <div className="flex-1 rounded-lg border bg-muted/50 p-4">
                  {sessionUrl ? (
                    <iframe
                      src={sessionUrl}
                      className="h-full w-full"
                      sandbox="allow-same-origin allow-scripts allow-forms"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      title="Browser Session"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-muted-foreground">
                        Loading browser session...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </main>
  );
}
