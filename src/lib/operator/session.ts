import Browserbase from "@browserbasehq/sdk";
import { Message } from "ai";

export const BROWSER_WIDTH = 1440;
export const BROWSER_HEIGHT = 900;
export const viewPort = {
  width: BROWSER_WIDTH,
  height: BROWSER_HEIGHT,
};

const MAX_TOKEN_LIMIT = 50000; // Drastically reduced limit
const MAX_MESSAGES = 4; // Keep even fewer messages
const MAX_MESSAGE_LENGTH = 12000; // ~3000 tokens per message max

function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token on average
  return Math.ceil(text.length / 4);
}

export async function createSession() {
  const bb = new Browserbase({
    apiKey: process.env.BROWSERBASE_API_KEY,
  });

  const session = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID || "",
    browserSettings: {
      fingerprint: {
        screen: {
          maxHeight: viewPort.height,
          maxWidth: viewPort.width,
          minHeight: viewPort.height,
          minWidth: viewPort.width,
        },
      },
      viewport: viewPort,
      blockAds: true,
    },
  });
  return session;
}

export async function closeBrowserSession(sessionId: string) {
  const bb = new Browserbase({
    apiKey: process.env.BROWSERBASE_API_KEY,
  });
  await bb.sessions.update(sessionId, {
    projectId: process.env.BROWSERBASE_PROJECT_ID || "",
    status: "REQUEST_RELEASE",
  });
}

export async function getSessionUrl(sessionId: string) {
  const bb = new Browserbase({
    apiKey: process.env.BROWSERBASE_API_KEY,
  });
  const session = await bb.sessions.debug(sessionId);
  return session.debuggerFullscreenUrl;
}

export function getSessionHistory(messages: Message[]): Message[] {
  let totalTokens = 0;
  let truncatedHistory: Message[] = [];
  
  // Start from most recent messages
  const startIndex = Math.max(0, messages.length - MAX_MESSAGES);
  
  for (let i = messages.length - 1; i >= startIndex; i--) {
    const message = messages[i];
    
    // Filter out image data from content
    let content = message.content;
    if (typeof content === 'string') {
      // Remove base64 image data which can be very long
      content = content.replace(/data:image\/[^;]+;base64,[^"]+/g, '[image data]');
      
      // Truncate if still too long
      if (content.length > MAX_MESSAGE_LENGTH) {
        content = content.slice(0, MAX_MESSAGE_LENGTH) + "... [truncated]";
      }
    }
    
    const messageTokens = estimateTokenCount(content);
    
    if (totalTokens + messageTokens > MAX_TOKEN_LIMIT) {
      break;
    }
    
    totalTokens += messageTokens;
    truncatedHistory.unshift({
      ...message,
      content
    });
  }

  return truncatedHistory;
}
