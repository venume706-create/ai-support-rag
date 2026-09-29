"use client";

import { useActionState } from "react";
import { saveLessonTopic } from "@/app/actions/teacher";
import { SubmitButton, submitWith, useActionFeedback, type FormState } from "@/components/forms/form-kit";
import { ru } from "@/lib/i18n/ru";

export function TopicForm({ lessonId, topic }: { lessonId: string; topic: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveLessonTopic, null);
  useActionFeedback(state);
  return (
    <form onSubmit={submitWith(action)} className="flex flex-col gap-2 sm:flex-row" data-testid="topic-form">
      <input type="hidden" name="lessonId" value={lessonId} />
      <input
        name="topic"
        defaultValue={topic}
        maxLength={200}
        placeholder={ru.teacher.topicPlaceholder}
        aria-label={ru.common.topic}
        className="handwritten min-h-11 min-w-0 flex-1 border-0 border-b-2 border-dotted border-ink-blue/50 bg-transparent px-1 text-2xl text-ink-blue outline-none placeholder:text-ink-blue/40 focus:border-solid"
      />
      <SubmitButton pending={pending} variant="outline">{ru.teacher.saveTopic}</SubmitButton>
    </form>
  );
}
