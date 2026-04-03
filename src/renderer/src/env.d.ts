/// <reference types="svelte" />
/// <reference types="vite/client" />

// Test helper type for session isolation tests
interface Window {
  __mockPtyListeners?: Record<string, (data: string) => void>
}
