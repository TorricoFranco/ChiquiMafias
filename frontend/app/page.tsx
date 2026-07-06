// src/app/page.tsx
"use client";

import ListMatchs from "@/components/matchs/ListMatchs";
import ChatPanel from "@/components/chat/ChatPanel";
import VotingSummary from "@/components/votes/VotingSummary";
import { PanelGroup, Panel } from "react-resizable-panels";
import ResizeHandle from "@/components/ui/ResizeHandle";
import { MOCK_CHAT } from "@/lib/mocks";

export default function Page() {
  return (
    <div className="h-[calc(100vh-64px)]">
      <div className="hidden md:block h-full">
        <PanelGroup direction="horizontal" className="h-full">
          <Panel defaultSize={25}><ListMatchs /></Panel>

          <ResizeHandle direction="horizontal" />

          <Panel defaultSize={75}>
            <PanelGroup direction="vertical">
              <Panel defaultSize={60} minSize={40}><ChatPanel title="Chat Global " className="h-full" /></Panel>

              {/* otro handle vertical */}
              <ResizeHandle direction="vertical" />

              <Panel defaultSize={40} minSize={25}><VotingSummary /></Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>

      <div className="md:hidden p-4 space-y-4">
        <ListMatchs />
        <ChatPanel title="Chat Global" className="h-full" />
        <VotingSummary />
      </div>
    </div>
  );
}
