"use client";

export default function LoadError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold text-black dark:text-white">Unable to load</h1>
        <p className="mt-3 text-zinc-500 dark:text-zinc-400">Please try again to check your order and menu.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 w-full rounded-xl bg-black px-4 py-3 font-semibold text-white transition hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
