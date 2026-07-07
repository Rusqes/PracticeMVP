import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

const mockFetch = vi.fn().mockImplementation(() => Promise.reject(new Error("Mocked fetch for tests")));
global.fetch = mockFetch;
if (typeof window !== "undefined") {
  window.fetch = mockFetch;
}


