import test from "node:test";
import assert from "node:assert/strict";
import {
  readLocalDraft,
  readLastLocalDraft,
  listLocalDrafts,
  saveLocalDraft,
  DraftConflictError,
  type LocalDraft,
} from "../src/lib/local-drafts";

class StorageFixture {
  values = new Map<string, string>();
  failWrite: string | null = null;
  denied = false;
  get length() {
    if (this.denied) throw new DOMException("Denied", "SecurityError");
    return this.values.size;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  getItem(key: string) {
    if (this.denied) throw new DOMException("Denied", "SecurityError");
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (key === this.failWrite)
      throw new DOMException("Full", "QuotaExceededError");
    this.values.set(key, value);
  }
}
const prefix = "kamitsubaki-novel-local-prototype:v1:";
const draft = (key: string, savedAt: number): LocalDraft => ({
  key,
  path: "",
  title: "恢复检查 · " + key,
  locale: "zh",
  savedAt,
  source:
    "\uFEFF---\r\ntitle: 恢复检查\r\nunknown: 保留\r\n---\r\n\r\n**正文**\r\n",
});
async function withStorage(run: (storage: StorageFixture) => void) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const storage = new StorageFixture();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  try {
    run(storage);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
}
test("draft recovery retains exact Markdown, pending source and unfinished special-content fields", () =>
  withStorage(() => {
    const value = {
      ...draft("one", 1),
      pendingSource: "尚未应用的源码\r\n",
      pendingNode: {
        type: "wikiInline" as const,
        attrs: { kind: "ruby", args: ["花譜", "かふ"] },
        originalAttrs: { kind: "ruby", args: ["花譜", ""] },
        position: 1,
        range: { from: 1, to: 2 },
        signature: "{{ruby::花譜::}}",
      },
    };
    saveLocalDraft(value);
    assert.deepEqual(readLastLocalDraft(), value);
    assert.equal(readLocalDraft("one")?.source, value.source);
  }));
test("quota failure preserves the previous saved document and active selection", () =>
  withStorage((storage) => {
    const value = draft("one", 1);
    saveLocalDraft(value);
    storage.failWrite = prefix + "one";
    assert.throws(
      () => saveLocalDraft({ ...value, source: "new unsaved text" }),
      { name: "QuotaExceededError" },
    );
    assert.deepEqual(readLastLocalDraft(), value);
  }));
test("an active-pointer write failure leaves the new draft available for explicit recovery", () =>
  withStorage((storage) => {
    const first = draft("one", 1),
      second = draft("two", 2);
    saveLocalDraft(first);
    storage.failWrite = prefix + "active-document";
    assert.throws(() => saveLocalDraft(second), { name: "QuotaExceededError" });
    assert.deepEqual(readLastLocalDraft(), first);
    assert.deepEqual(listLocalDrafts(), [second, first]);
  }));
test("corrupt records and other applications do not overwrite recoverable drafts", () =>
  withStorage((storage) => {
    const value = draft("one", 1);
    saveLocalDraft(value);
    storage.values.set(prefix + "corrupt", "{broken");
    storage.values.set("other-editor:data", "keep this data");
    assert.deepEqual(listLocalDrafts(), [value]);
    assert.equal(storage.values.get("other-editor:data"), "keep this data");
    assert.equal(storage.values.get(prefix + "corrupt"), "{broken");
  }));
test("unavailable storage is distinguishable from an empty draft library", () =>
  withStorage((storage) => {
    storage.denied = true;
    assert.equal(readLastLocalDraft(), null);
    assert.throws(() => listLocalDrafts(), { name: "SecurityError" });
  }));

test("a newer write from another tab blocks a silent overwrite of the same draft", () =>
  withStorage((storage) => {
    saveLocalDraft(draft("shared", 1));
    const key = prefix + "shared";
    const other = JSON.parse(storage.values.get(key)!);
    storage.values.set(key, JSON.stringify({ ...other, tabId: "other-tab", savedAt: 5, source: "other tab text" }));
    assert.throws(() => saveLocalDraft(draft("shared", 6)), DraftConflictError);
    assert.equal(readLocalDraft("shared")?.source, "other tab text");
    saveLocalDraft(draft("shared", 7), { force: true });
    assert.equal(readLocalDraft("shared")?.savedAt, 7);
    assert.equal("tabId" in readLocalDraft("shared")!, false);
  }));
