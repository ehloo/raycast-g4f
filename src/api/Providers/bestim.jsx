import fetch from "node-fetch";
import { format_chat_to_prompt } from "../../classes/message";

const api_url = "https://ai-chats.org/chat/send2/";
const headers = {
  Host: "ai-chats.org",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:129.0) Gecko/20100101 Firefox/129.0",
  Accept: "application/json, text/event-stream",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  Referer: "https://ai-chats.org/chat/",
  "content-type": "application/json",
  Origin: "https://ai-chats.org",
  DNT: "1",
  "Sec-GPC": "1",
  "Alt-Used": "ai-chats.org",
  Connection: "keep-alive",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  Priority: "u=0",
  TE: "trailers",
  Cookie:
    "ai-chat-front=1d38ca3a77c409025efec9639084337b; _csrf-front=b5f45dfb9a135dc88dabae2f8cbdbde90574ed8afa45d2931e6d9968cf3f1f9da%3A2%3A%7Bi%3A0%3Bs%3A11%3A%22_csrf-front%22%3Bi%3A1%3Bs%3A32%3A%224tjSi5lj7FpReYG6U80H9ln9SaQLUawb%22%3B%7D; muVyak=JpuXiFvRbVkfSWPYMETjAmhoKdtNwQ; JpuXiFvRbVkfSWPYMETjAmhoKdtNwQ=a71a1519bf1f0d414ddd73f6239f56ff-1725338172-1725338169; muVyak_hits=8",
};

export const BestIMProvider = {
  name: "BestIM",
  generate: async function* (chat) {
    const payload = {
      type: "chat",
      messagesHistory: [
        {
          content: format_chat_to_prompt(chat),
          from: "you",
        },
      ],
    };
    const response = await fetch(api_url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    const reader = response.body;
    for await (let chunk of reader) {
      const str = chunk.toString();
      let lines = str.split("\n");

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.startsWith("data: ")) {
          let chunk = line.substring(6);
          yield chunk;
        }
      }
    }
  },
};