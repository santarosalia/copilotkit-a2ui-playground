import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans_KR } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";
import "@copilotkit/react-core/v2/styles.css";

const sans = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "A2UI 플레이그라운드",
  description:
    "CopilotKit과 LangGraph로 A2UI 1.0 표면을 보내고, agent_to_renderer / renderer_to_agent 메시지를 같이 봅니다.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
