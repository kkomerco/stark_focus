import React from "react";
import { Check, Film, Image as ImageIcon, ListChecks, Layers, Circle } from "lucide-react";
import { PlannerTask, Post } from "../types";

/**
 * KOLEJKA PO LEWEJ STRONIE ROBOCZEJ POWIERZCHNI.
 *
 * Jedna lista tego, co czeka, i tego, co już wyszło. Kliknięcie wiersza
 * wrzuca treść prosto w kadr po prawej — bez przechodzenia między zakładkami
 * i bez okien, które trzeba zgadywać.
 */

interface QueuePanelProps {
  tasks: PlannerTask[];
  posts: Post[];
  onOpenTask: (task: PlannerTask) => void;
  onCompleteTask: (taskId: string) => void;
  onOpenPost: (post: Post) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

function taskKind(task: PlannerTask) {
  if (task.payload?.reel) return Film;
  if (task.payload?.carousel) return Layers;
  if (task.payload?.post) return ImageIcon;
  return ListChecks;
}

function isOverdue(task: PlannerTask) {
  return !!task.date && task.date < today();
}

export const QueuePanel: React.FC<QueuePanelProps> = ({
  tasks,
  posts,
  onOpenTask,
  onCompleteTask,
  onOpenPost,
}) => {
  const pending = tasks
    .filter((task) => task && !task.completed)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const now = today();
  const nowTasks = pending.filter((task) => !task.date || task.date <= now);
  const laterTasks = pending.filter((task) => task.date && task.date > now);
  const recentPosts = [...posts]
    .sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))
    .slice(0, 6);

  const row =
    "group w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-lg border border-white/5 bg-[#0C0C0C] hover:border-white/25 hover:bg-[#121212] transition-colors cursor-pointer";

  const section = (label: string, count: number) => (
    <div className="flex items-center justify-between pt-1">
      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <span className="text-[10px] font-mono text-neutral-600">{count}</span>
    </div>
  );

  const taskRow = (task: PlannerTask) => {
    const Icon = taskKind(task);
    return (
      <div key={task.id} className="flex items-center gap-1.5">
        <button type="button" className={row} onClick={() => onOpenTask(task)}>
          <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-neutral-400" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-mono text-neutral-200">{task.title}</span>
            <span
              className={`block text-[10px] font-mono ${isOverdue(task) ? "text-[#E11D48]" : "text-neutral-600"}`}
            >
              {task.date || "bez terminu"}
              {task.time ? ` • ${task.time}` : ""}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onCompleteTask(task.id)}
          title="Oznacz jako zrobione"
          className="p-1.5 rounded-lg text-neutral-600 hover:text-white hover:bg-white/10 transition-colors shrink-0"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {pending.length === 0 && (
        <div className="flex items-center gap-2 px-2.5 py-3 rounded-lg border border-dashed border-white/10 text-[11px] font-mono text-neutral-500">
          <Circle className="w-2 h-2 fill-neutral-700 text-neutral-700" />
          Kolejka pusta — wygeneruj paczkę dnia.
        </div>
      )}

      {nowTasks.length > 0 && (
        <div className="space-y-1.5">
          {section("Dziś", nowTasks.length)}
          {nowTasks.map(taskRow)}
        </div>
      )}

      {laterTasks.length > 0 && (
        <div className="space-y-1.5">
          {section("Później", laterTasks.length)}
          {laterTasks.map(taskRow)}
        </div>
      )}

      {recentPosts.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
              Ostatnio w studio
            </span>
          </div>
          {recentPosts.map((post) => (
            <button key={post.id} type="button" className={row} onClick={() => onOpenPost(post)}>
              <ImageIcon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-neutral-500" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-mono text-neutral-300">
                  {post.title}
                </span>
                <span className="block text-[10px] font-mono text-neutral-600">
                  {post.format} • {post.created_date}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
