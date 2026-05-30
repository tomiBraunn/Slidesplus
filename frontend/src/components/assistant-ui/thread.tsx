import { cn } from "@/lib/utils";
import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useThread,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PaperclipIcon,
  RefreshCwIcon,
  SquareIcon,
} from "lucide-react";
import type { FC } from "react";

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="flex h-full flex-col overflow-hidden bg-transparent"
      style={{ "--thread-max-width": "100%" } as React.CSSProperties}
    >
      <ThreadPrimitive.Viewport className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden scroll-smooth px-4 py-4">
        <div className="mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col gap-6">
          <ThreadPrimitive.Messages>
            {() => <ThreadMessage />}
          </ThreadPrimitive.Messages>

          <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto pt-2">
            <ThreadScrollToBottom />
            <Composer />
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="group w-full animate-[chatFadeIn_0.25s_ease-out_forwards] opacity-0">
      {/* User message — bubble aligned right */}
      <MessagePrimitive.If user>
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-theme-inverted px-4 py-2.5 text-sm leading-relaxed text-theme-inverted">
            <MessagePrimitive.Parts />
          </div>
        </div>
      </MessagePrimitive.If>

      {/* Assistant message — left-aligned, no bubble */}
      <MessagePrimitive.If assistant>
        <div className="flex flex-col gap-1">
          <div className="text-sm leading-relaxed text-theme-primary">
            <MessagePrimitive.Parts components={{ Text: AssistantText }} />
          </div>
          <AssistantActionBar />
        </div>
      </MessagePrimitive.If>
    </MessagePrimitive.Root>
  );
};

const AssistantText: FC<{ text: string }> = ({ text }) => (
  <span className="whitespace-pre-wrap">{text}</span>
);

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="flex items-center gap-1 text-theme-secondary opacity-0 transition-opacity group-hover:opacity-100"
    >
      <ActionBarPrimitive.Copy asChild>
        <button className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-white/5 transition-colors">
          <MessagePrimitive.If copied>
            <CheckIcon className="h-3 w-3" />
          </MessagePrimitive.If>
          <MessagePrimitive.If copied={false}>
            <CopyIcon className="h-3 w-3" />
          </MessagePrimitive.If>
        </button>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <button className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-white/5 transition-colors">
          <RefreshCwIcon className="h-3 w-3" />
        </button>
      </ActionBarPrimitive.Reload>
      <BranchPicker />
    </ActionBarPrimitive.Root>
  );
};

const BranchPicker: FC<{ className?: string }> = ({ className }) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn("inline-flex items-center gap-0.5 text-xs text-theme-secondary", className)}
    >
      <BranchPickerPrimitive.Previous asChild>
        <button className="flex h-5 w-5 items-center justify-center rounded hover:bg-white/5 transition-colors disabled:opacity-30">
          <ChevronLeftIcon className="h-3 w-3" />
        </button>
      </BranchPickerPrimitive.Previous>
      <span className="tabular-nums">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <button className="flex h-5 w-5 items-center justify-center rounded hover:bg-white/5 transition-colors disabled:opacity-30">
          <ChevronRightIcon className="h-3 w-3" />
        </button>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <button className="absolute -top-10 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-theme-tertiary bg-theme-primary text-theme-secondary shadow-md hover:text-theme-primary transition-colors disabled:invisible">
        <ArrowDownIcon className="h-4 w-4" />
      </button>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const Composer: FC = () => {
  const { isRunning } = useThread();
  return (
    <ComposerPrimitive.Root className="relative w-full">
      <div className="flex items-end gap-2 rounded-2xl border border-theme-tertiary bg-theme-secondary/5 px-3 py-2 transition-colors focus-within:border-theme-secondary/40">
        <ComposerPrimitive.AddAttachment asChild>
          <button
            className="shrink-0 pb-0.5 text-theme-secondary hover:text-theme-primary transition-colors disabled:opacity-40"
            title="Attach files"
          >
            <PaperclipIcon className="h-[18px] w-[18px]" />
          </button>
        </ComposerPrimitive.AddAttachment>

        <ComposerPrimitive.Input
          placeholder="Message AI…"
          rows={1}
          className="flex-1 resize-none bg-transparent py-0.5 text-sm text-theme-primary placeholder:text-theme-secondary/50 focus:outline-none max-h-40 min-h-[28px] disabled:opacity-50"
          autoFocus
        />

        {!isRunning ? (
          <ComposerPrimitive.Send asChild>
            <button
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-theme-inverted text-theme-inverted transition-all hover:opacity-85 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Send"
            >
              <ArrowUpIcon className="h-4 w-4" />
            </button>
          </ComposerPrimitive.Send>
        ) : (
          <ComposerPrimitive.Cancel asChild>
            <button
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-theme-inverted text-theme-inverted transition-all hover:opacity-85"
              title="Stop"
            >
              <SquareIcon className="h-3 w-3 fill-current" />
            </button>
          </ComposerPrimitive.Cancel>
        )}
      </div>
    </ComposerPrimitive.Root>
  );
};
