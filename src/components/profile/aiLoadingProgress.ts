import { useEffect } from "react";

export const AI_LOADING_MESSAGES = [
  "Scanning website...",
  "Reading page content...",
  "Extracting profile details...",
  "Analyzing with AI...",
  "Polishing your profile...",
  "Almost done...",
];

interface UseAiLoadingProgressOptions {
  isLoadingStep: boolean;
  setLoadingMsg: (message: string) => void;
  setProgress: (update: (prev: number) => number) => void;
}

export const useAiLoadingProgress = ({ isLoadingStep, setLoadingMsg, setProgress }: UseAiLoadingProgressOptions) => {
  useEffect(() => {
    if (!isLoadingStep) return;

    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      msgIndex = Math.min(msgIndex + 1, AI_LOADING_MESSAGES.length - 1);
      setLoadingMsg(AI_LOADING_MESSAGES[msgIndex]);
    }, 3000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 90));
    }, 500);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progressInterval);
    };
  }, [isLoadingStep, setLoadingMsg, setProgress]);
};
